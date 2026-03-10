import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator,
    TouchableOpacity, Dimensions, RefreshControl, Alert, StatusBar, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { GalleryItem } from '../types';
import api, { API_URL } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '../components/CustomAlertProvider';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SPACING = 2;
const ITEM_SIZE = (width - ITEM_SPACING * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

const TrashGridItem = React.memo(({ item, index, isSelected, selectMode, onSelect, onLongPress }: any) => {
    return (
        <TouchableOpacity
            style={styles.itemContainer}
            activeOpacity={0.85}
            onPress={() => {
                if (selectMode) {
                    onSelect(item.id);
                } else {
                    onLongPress(item.id); // Tap acts as select in trash usually to avoid opening
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
            <View style={styles.trashOverlay} />
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


export default function TrashScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();

    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const getMobileUrl = (rawUrl: string) => rawUrl.replace('http://localhost:3000', API_URL);

    const fetchTrash = useCallback(async () => {
        try {
            const res = await api.get('/api/trash');
            if (res.data.success) {
                const processedItems = res.data.data.items.map((i: any) => ({
                    ...i,
                    raw_url: getMobileUrl(i.raw_url)
                }));
                setItems(processedItems);
            }
        } catch (err) {
            console.error('Fetch trash error', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchTrash(); }, [fetchTrash]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchTrash();
    };

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

    const exitSelectMode = () => {
        setSelectMode(false);
        setSelectedIds(new Set());
    };

    const handleRestore = () => {
        const ids = selectedIds.size > 0 ? Array.from(selectedIds) : items.map(i => i.id);
        const count = ids.length;
        showAlert(
            'Restore Files',
            `Restore ${count} file(s) back to gallery?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restore', style: 'default',
                    onPress: async () => {
                        try {
                            await api.post('/api/trash', { file_ids: ids });
                            exitSelectMode();
                            fetchTrash();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            showAlert('Done', `${count} file(s) restored`);
                        } catch (err: any) {
                            showAlert('Error', 'Failed to restore files');
                        }
                    }
                }
            ]
        );
    };

    const handlePermanentDelete = () => {
        const ids = selectedIds.size > 0 ? Array.from(selectedIds) : [];
        const isAll = ids.length === 0;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showAlert(
            'Permanently Delete',
            isAll
                ? 'This will permanently delete ALL files in trash. This cannot be undone!'
                : `Permanently delete ${ids.length} file(s)? This cannot be undone!`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Forever', style: 'destructive',
                    onPress: async () => {
                        try {
                            const body = isAll ? { empty_all: true } : { file_ids: ids };
                            await api.request({ method: 'DELETE', url: '/api/trash', data: body });
                            exitSelectMode();
                            fetchTrash();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            showAlert('Done', 'Files permanently deleted');
                        } catch (err: any) {
                            showAlert('Error', 'Failed to delete');
                        }
                    }
                }
            ]
        );
    };

    const renderHeader = () => {
        if (items.length === 0 || selectMode) return null;
        return (
            <View style={styles.infoBanner}>
                <Feather name="info" size={16} color="#6366F1" />
                <Text style={styles.infoText}>
                    Select files to restore or permanently delete them.
                </Text>
            </View>
        );
    };

    if (loading && !refreshing && items.length === 0) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#EF4444" />
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
                            <Feather name="x" size={24} color="#1E293B" />
                        </TouchableOpacity>
                        <Text style={styles.selectCount}>{selectedIds.size} Selected</Text>
                        <TouchableOpacity onPress={() => setSelectedIds(new Set(items.map(i => i.id)))}>
                            <Text style={styles.selectAllText}>All</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.normalHeader}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                            <Feather name="arrow-left" size={24} color="#1E293B" />
                        </TouchableOpacity>
                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>Recycle Bin</Text>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>
                )}
            </View>

            {items.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                        <Feather name="trash" size={32} color="#94A3B8" />
                    </View>
                    <Text style={styles.emptyTitle}>Trash is empty</Text>
                    <Text style={styles.emptySubtitle}>Deleted photos will appear here.</Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => item.id}
                    numColumns={COLUMN_COUNT}
                    ListHeaderComponent={renderHeader}
                    columnWrapperStyle={styles.row}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EF4444" />}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === 'android'}
                    getItemLayout={(data, index) => ({ length: ITEM_SIZE, offset: ITEM_SIZE * Math.floor(index / COLUMN_COUNT), index })}
                    renderItem={({ item, index }) => (
                        <TrashGridItem
                            item={item} index={index}
                            isSelected={selectedIds.has(item.id)}
                            selectMode={selectMode}
                            onSelect={toggleSelect}
                            onLongPress={onLongPress}
                        />
                    )}
                />
            )}

            {items.length > 0 && (
                <BlurView intensity={80} tint="light" style={[styles.actionBar, { paddingBottom: insets.bottom || 16 }]}>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleRestore}>
                        <View style={[styles.actionIconBg, { backgroundColor: '#EEF2FF' }]}>
                            <Feather name="corner-up-left" size={20} color="#4F46E5" />
                        </View>
                        <Text style={[styles.actionText, { color: '#4F46E5' }]}>
                            {selectedIds.size > 0 ? `Restore (${selectedIds.size})` : 'Restore All'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={handlePermanentDelete}>
                        <View style={[styles.actionIconBg, { backgroundColor: '#FEF2F2' }]}>
                            <Feather name="x-circle" size={20} color="#DC2626" />
                        </View>
                        <Text style={[styles.actionText, { color: '#DC2626' }]}>
                            {selectedIds.size > 0 ? `Delete (${selectedIds.size})` : 'Empty Trash'}
                        </Text>
                    </TouchableOpacity>
                </BlurView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    centered: { justifyContent: 'center', alignItems: 'center' },
    row: { paddingHorizontal: ITEM_SPACING / 2 },

    header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#FAFAFA' },
    normalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitleContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A', textAlign: 'center', letterSpacing: -0.5 },

    iconBtn: { width: 40, height: 40, backgroundColor: '#F1F5F9', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    selectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 40 },
    selectCount: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
    selectAllText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },

    infoBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        marginHorizontal: ITEM_SPACING / 2, marginBottom: ITEM_SPACING, paddingVertical: 14, paddingHorizontal: 16,
        backgroundColor: '#EEF2FF', borderRadius: 12, borderWidth: 1, borderColor: '#C7D2FE',
    },
    infoText: { flex: 1, fontSize: 13, fontWeight: '500', color: '#4338CA' },

    itemContainer: { width: ITEM_SIZE, height: ITEM_SIZE, padding: ITEM_SPACING / 2 },
    image: { flex: 1, backgroundColor: '#E2E8F0', borderRadius: 8 },
    imageSelected: { transform: [{ scale: 0.9 }], borderRadius: 12 },
    trashOverlay: { ...StyleSheet.absoluteFillObject, margin: ITEM_SPACING / 2, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 8 },

    selectOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-start', alignItems: 'flex-end', padding: 8 },
    selectedOverlay: { backgroundColor: 'rgba(26, 26, 26, 0.15)', borderRadius: 8 },
    checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#FFF', backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
    checkboxSelected: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A', transform: [{ scale: 1.1 }] },

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
    actionIconBg: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    actionText: { fontSize: 14, fontWeight: '600' },
});
