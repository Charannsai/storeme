import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator,
    TouchableOpacity, Dimensions, RefreshControl, Modal, Alert,
    StatusBar, TextInput, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { GalleryItem, Folder } from '../types';
import api, { API_URL } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SPACING = 2;
const ITEM_SIZE = (width - ITEM_SPACING * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

// Memoized item to prevent re-rendering all images when one is selected
const GalleryGridItem = React.memo(({ item, index, isSelected, selectMode, onSelect, onLongPress, onPressItem }: any) => {
    return (
        <TouchableOpacity
            style={styles.itemContainer}
            activeOpacity={0.85}
            onPress={() => {
                if (selectMode) {
                    onSelect(item.id);
                } else {
                    onPressItem(index);
                }
            }}
            onLongPress={() => onLongPress(item.id)}
        >
            <Image
                source={{ uri: item.raw_url }}
                style={[
                    styles.image,
                    isSelected ? styles.imageSelected : null
                ]}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
            />
            {selectMode && (
                <View style={[styles.selectOverlay, isSelected && styles.selectedOverlay]}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Feather name="check" size={14} color="#FFF" />}
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
}, (prev, next) => {
    return prev.isSelected === next.isSelected &&
        prev.selectMode === next.selectMode &&
        prev.item.id === next.item.id;
});

export default function AllPhotosScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const [items, setItems] = useState<GalleryItem[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [menuVisible, setMenuVisible] = useState(false);
    const [createFolderVisible, setCreateFolderVisible] = useState(false);
    const [moveFolderVisible, setMoveFolderVisible] = useState(false);
    const [trashCount, setTrashCount] = useState(0);

    const getMobileUrl = (rawUrl: string) => rawUrl.replace('http://localhost:3000', API_URL);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const [galleryRes, foldersRes, trashRes] = await Promise.all([
                api.get('/api/gallery?limit=100'),
                api.get('/api/folders'),
                api.get('/api/trash')
            ]);

            if (galleryRes.data.success) {
                // Pre-process URLs for expo-image wrapper
                const processedItems = galleryRes.data.data.items.map((i: any) => ({
                    ...i,
                    raw_url: getMobileUrl(i.raw_url)
                }));
                setItems(processedItems);
            }
            if (foldersRes.data.success) setFolders(foldersRes.data.data.folders);
            if (trashRes.data.success) setTrashCount(trashRes.data.data.items.length);

        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => fetchData(true);

    const toggleSelect = useCallback((id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const onLongPress = useCallback((id: string) => {
        if (!selectMode) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSelectMode(true);
            setSelectedIds(new Set([id]));
        }
    }, [selectMode]);

    const onPressItem = useCallback((index: number) => {
        navigation.navigate('ImageViewer', { items, initialIndex: index });
    }, [items, navigation]);

    const exitSelectMode = () => {
        setSelectMode(false);
        setSelectedIds(new Set());
    };

    const handleBulkTrash = () => {
        if (selectedIds.size === 0) return;
        Alert.alert(
            'Move to Trash',
            `Move ${selectedIds.size} file(s) to trash?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Move to Trash',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.post('/api/files/bulk', { action: 'trash', file_ids: Array.from(selectedIds) });
                            exitSelectMode();
                            fetchData();
                        } catch (err: any) {
                            Alert.alert('Error', err.response?.data?.error || 'Failed to trash files');
                        }
                    }
                }
            ]
        );
    };

    const handleBulkMove = async (folderName: string) => {
        try {
            await api.post('/api/files/bulk', { action: 'move', file_ids: Array.from(selectedIds), folder_name: folderName });
            setMoveFolderVisible(false);
            exitSelectMode();
            fetchData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to move files');
        }
    };

    // Empty handleCreateFolder removed over here

    const handleDeleteFolder = (folder: Folder) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('Delete Folder', `Delete "${folder.name}"? Files inside will be moved back to gallery.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await api.request({ method: 'DELETE', url: '/api/folders', data: { name: folder.name } });
                        fetchData();
                    } catch (err: any) {
                        Alert.alert('Error', 'Failed to delete folder');
                    }
                }
            }
        ]);
    };

    const renderHeader = () => <View style={{ height: 16 }} />;

    if (loading && !refreshing && items.length === 0) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                {selectMode ? (
                    <View style={styles.selectHeader}>
                        <TouchableOpacity onPress={exitSelectMode} style={styles.iconBtn}>
                            <Feather name="x" size={22} color="#1E293B" />
                        </TouchableOpacity>
                        <Text style={styles.selectCount}>{selectedIds.size} Selected</Text>
                        <TouchableOpacity onPress={() => setSelectedIds(new Set(items.map(i => i.id)))}>
                            <Text style={styles.selectAllText}>Select All</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.normalHeader}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                            <Feather name="arrow-left" size={24} color="#1E293B" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerSubtitle}>ALBUMS</Text>
                            <Text style={styles.headerTitle} numberOfLines={1}>All Photos</Text>
                        </View>
                        <TouchableOpacity onPress={() => { setMenuVisible(true); }} style={styles.iconBtn}>
                            <Feather name="more-horizontal" size={24} color="#1E293B" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {items.length === 0 && folders.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                        <Feather name="image" size={32} color="#94A3B8" />
                    </View>
                    <Text style={styles.emptyTitle}>Your gallery is empty</Text>
                    <Text style={styles.emptySubtitle}>Upload photos from the '+' tab to get started.</Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => item.id}
                    numColumns={COLUMN_COUNT}
                    ListHeaderComponent={renderHeader}
                    columnWrapperStyle={styles.row}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
                    contentContainerStyle={{ paddingBottom: 120 }} // Space for fab/tab
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === 'android'}
                    getItemLayout={(data, index) => ({ length: ITEM_SIZE, offset: ITEM_SIZE * Math.floor(index / COLUMN_COUNT), index })}
                    renderItem={({ item, index }) => (
                        <GalleryGridItem
                            item={item} index={index}
                            isSelected={selectedIds.has(item.id)}
                            selectMode={selectMode}
                            onSelect={toggleSelect}
                            onLongPress={onLongPress}
                            onPressItem={onPressItem}
                        />
                    )}
                />
            )}

            {selectMode && selectedIds.size > 0 && (
                <BlurView intensity={80} tint="light" style={[styles.actionBar, { paddingBottom: insets.bottom || 16 }]}>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleBulkTrash}>
                        <View style={[styles.actionIconBg, { backgroundColor: '#FEE2E2' }]}>
                            <Feather name="trash-2" size={20} color="#DC2626" />
                        </View>
                        <Text style={[styles.actionText, { color: '#DC2626' }]}>Trash</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setMoveFolderVisible(true)}>
                        <View style={[styles.actionIconBg, { backgroundColor: '#DBEAFE' }]}>
                            <Feather name="folder-plus" size={20} color="#2563EB" />
                        </View>
                        <Text style={[styles.actionText, { color: '#2563EB' }]}>Move</Text>
                    </TouchableOpacity>
                </BlurView>
            )}

            {/* Menu */}
            <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
                    <View style={styles.menuContainer}>
                        <Text style={styles.menuTitle}>Options</Text>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setSelectMode(true); }}>
                            <Feather name="check-circle" size={18} color="#1E293B" />
                            <Text style={styles.menuItemText}>Select Multiple</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Only the Move modal inside AllPhotosScreen */}

            {/* Move Modal */}
            <Modal visible={moveFolderVisible} transparent animationType="fade" onRequestClose={() => setMoveFolderVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Move to...</Text>
                        {folders.length === 0 ? (
                            <Text style={styles.noFolderText}>No folders available.</Text>
                        ) : (
                            <FlatList
                                data={folders}
                                keyExtractor={item => item.id}
                                style={{ maxHeight: 250, marginVertical: 10 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.folderOption} onPress={() => handleBulkMove(item.name)}>
                                        <Feather name="folder" size={20} color="#3B82F6" />
                                        <Text style={styles.folderOptionText}>{item.name}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                        <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setMoveFolderVisible(false)}>
                            <Text style={styles.modalBtnCancelText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    centered: { justifyContent: 'center', alignItems: 'center' },
    row: { paddingHorizontal: ITEM_SPACING / 2 },

    header: {
        paddingHorizontal: 20, paddingBottom: 16,
        backgroundColor: '#FAFAFA',
    },
    normalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitleContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
    headerSubtitle: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, marginBottom: 2 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
    iconBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },

    selectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 40 },
    selectCount: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
    selectAllText: { fontSize: 15, fontWeight: '600', color: '#3B82F6' },

    listHeader: { paddingBottom: 16 },
    foldersSection: { marginBottom: 8 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },

    horizontalListContent: { paddingHorizontal: 16, paddingBottom: 8 },
    folderCard: {
        width: 100, padding: 12, backgroundColor: '#FFFFFF',
        borderRadius: 16, marginRight: 12, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    folderIconWrapper: {
        width: 48, height: 48, borderRadius: 12, backgroundColor: '#EFF6FF',
        justifyContent: 'center', alignItems: 'center', marginBottom: 8
    },
    folderName: { fontSize: 13, fontWeight: '600', color: '#475569', textAlign: 'center' },

    trashBanner: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginHorizontal: 16, padding: 16, backgroundColor: '#FFFFFF',
        borderRadius: 16, marginBottom: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    trashBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    trashIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
    trashBannerText: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
    trashBannerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    trashBannerCount: { fontSize: 15, fontWeight: '700', color: '#94A3B8' },

    itemContainer: { width: ITEM_SIZE, height: ITEM_SIZE, padding: ITEM_SPACING / 2 },
    image: { flex: 1, backgroundColor: '#E2E8F0', borderRadius: 8 },
    imageSelected: { transform: [{ scale: 0.9 }], borderRadius: 12 },

    selectOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-start', alignItems: 'flex-end', padding: 8 },
    selectedOverlay: { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderRadius: 8 },
    checkbox: {
        width: 24, height: 24, borderRadius: 12, borderWidth: 1.5,
        borderColor: '#FFF', backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center', alignItems: 'center'
    },
    checkboxSelected: { backgroundColor: '#3B82F6', borderColor: '#3B82F6', transform: [{ scale: 1.1 }] },

    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
    emptySubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22 },

    actionBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-evenly',
        paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
    },
    actionBtn: { alignItems: 'center', gap: 8 },
    actionIconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    actionText: { fontSize: 13, fontWeight: '600' },

    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    menuContainer: {
        width: 240, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
    },
    menuTitle: { fontSize: 13, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', paddingHorizontal: 16, paddingVertical: 12 },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12 },
    menuItemText: { fontSize: 16, fontWeight: '500', color: '#1E293B' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 40,
        shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.1, shadowRadius: 24, elevation: 16,
    },
    modalTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
    modalDesc: { fontSize: 15, color: '#64748B', marginBottom: 20 },
    modalInput: {
        borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16,
        paddingHorizontal: 16, paddingVertical: 16, fontSize: 16,
        color: '#0F172A', backgroundColor: '#F8FAFC', marginBottom: 24,
    },
    modalButtons: { flexDirection: 'row', gap: 12 },
    modalBtnCancel: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center' },
    modalBtnCancelText: { fontSize: 16, fontWeight: '600', color: '#475569' },
    modalBtnCreate: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#3B82F6', alignItems: 'center' },
    modalBtnCreateText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

    noFolderText: { fontSize: 15, color: '#94A3B8', textAlign: 'center', paddingVertical: 24 },
    folderOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    folderOptionText: { fontSize: 17, fontWeight: '500', color: '#1E293B' },
});
