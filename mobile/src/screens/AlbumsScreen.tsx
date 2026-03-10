import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, TextInput, Modal, StatusBar, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import { Folder } from '../types';

const { width } = Dimensions.get('window');

export default function AlbumsScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const [folders, setFolders] = useState<Folder[]>([]);
    const [loading, setLoading] = useState(true);
    const [createFolderVisible, setCreateFolderVisible] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const fetchFolders = useCallback(async () => {
        try {
            const res = await api.get('/api/folders');
            if (res.data.success) {
                setFolders(res.data.data.folders);
            }
        } catch (err) {
            console.error('Fetch folders error', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchFolders();
        });
        fetchFolders();
        return unsubscribe;
    }, [navigation, fetchFolders]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            await api.post('/api/folders', { name: newFolderName.trim() });
            setCreateFolderVisible(false);
            setNewFolderName('');
            fetchFolders();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to create folder');
        }
    };

    const handleDeleteFolder = (folder: Folder) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('Delete Folder', `Delete "${folder.name}"? Files inside will be moved back to All Photos.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await api.request({ method: 'DELETE', url: '/api/folders', data: { name: folder.name } });
                        fetchFolders();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (err: any) {
                        Alert.alert('Error', 'Failed to delete folder');
                    }
                }
            }
        ]);
    };

    const renderHeader = () => (
        <View style={styles.headerSection}>
            <View style={styles.utilitiesCard}>
                <TouchableOpacity style={styles.utilityRow} onPress={() => navigation.navigate('AllPhotos')}>
                    <View style={styles.utilityIconBg}>
                        <Feather name="image" size={20} color="#1A1A1A" />
                    </View>
                    <Text style={styles.utilityRowTitle}>All Photos</Text>
                    <Feather name="chevron-right" size={20} color="#94A3B8" />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.utilityRow} onPress={() => navigation.navigate('TrashBin')}>
                    <View style={styles.utilityIconBg}>
                        <Feather name="trash-2" size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.utilityRowTitle}>Recently Deleted</Text>
                    <Feather name="chevron-right" size={20} color="#94A3B8" />
                </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>My Folders</Text>
                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCreateFolderVisible(true); }} style={styles.addBtn}>
                    <Feather name="plus" size={20} color="#1A1A1A" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <Text style={styles.headerTitle}>Albums</Text>
            </View>

            {loading ? (
                <View style={styles.centered}><ActivityIndicator size="large" color="#1A1A1A" /></View>
            ) : (
                <FlatList
                    data={folders}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    numColumns={2}
                    columnWrapperStyle={styles.gridRow}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <Feather name="folder-plus" size={32} color="#94A3B8" />
                            </View>
                            <Text style={styles.emptyTitle}>No Folders</Text>
                            <Text style={styles.emptySubtitle}>Tap the + icon to organize your photos</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.folderCard}
                            activeOpacity={0.7}
                            onPress={() => navigation.navigate('FolderView', { folder: item })}
                            onLongPress={() => handleDeleteFolder(item)}
                        >
                            <View style={[styles.folderCardInner, { backgroundColor: '#F8FAFC' }]}>
                                <Feather name="folder" size={28} color="#1A1A1A" />
                            </View>
                            <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                />
            )}

            <Modal visible={createFolderVisible} transparent animationType="fade" onRequestClose={() => setCreateFolderVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Folder</Text>
                        <Text style={styles.modalDesc}>Give this folder a unique name.</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. Vacation 2026"
                            placeholderTextColor="#94A3B8"
                            value={newFolderName}
                            onChangeText={setNewFolderName}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => { setCreateFolderVisible(false); setNewFolderName(''); }}>
                                <Text style={styles.modalBtnCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtnCreate, !newFolderName.trim() && { opacity: 0.5 }]} onPress={handleCreateFolder} disabled={!newFolderName.trim()}>
                                <Text style={styles.modalBtnCreateText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#FAFAFA' },
    headerTitle: { fontSize: 34, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },

    headerSection: { paddingHorizontal: 20, paddingTop: 8 },

    utilitiesCard: {
        backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    utilityRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    utilityIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16, backgroundColor: '#F8FAFC' },
    utilityRowTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1E293B' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 72 }, // Aligned with text

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A', letterSpacing: -0.5 },
    addBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },

    gridRow: { paddingHorizontal: 16, justifyContent: 'space-between' },
    folderCard: {
        width: (width - 48) / 2, marginBottom: 20, alignItems: 'center',
    },
    folderCardInner: {
        width: '100%', aspectRatio: 1, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 1,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    folderName: { fontSize: 15, fontWeight: '600', color: '#1E293B', textAlign: 'center' },

    emptyContainer: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 40 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
    emptySubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: {
        width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 16,
    },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
    modalDesc: { fontSize: 15, color: '#64748B', marginBottom: 24 },
    modalInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: '#0F172A', backgroundColor: '#F8FAFC', marginBottom: 24 },
    modalButtons: { flexDirection: 'row', gap: 12 },
    modalBtnCancel: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center' },
    modalBtnCancelText: { fontSize: 16, fontWeight: '600', color: '#475569' },
    modalBtnCreate: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#1A1A1A', alignItems: 'center' },
    modalBtnCreateText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
