import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator,
    TouchableOpacity, Dimensions, RefreshControl, Alert, StatusBar, Platform
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { GalleryItem, Folder } from '../types';
import api, { API_URL } from '../services/api';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SPACING = 2;
const ITEM_SIZE = (width - ITEM_SPACING * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

// Memoized item
const FolderGridItem = React.memo(({ item, index, isSelected, selectMode, onSelect, onLongPress, onPressItem }: any) => {
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
            {item.file_type === 'video' && (
                <View style={styles.videoOverlay}>
                    <Feather name="play-circle" size={24} color="rgba(255,255,255,0.9)" />
                </View>
            )}
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

export default function FolderViewScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { folder } = route.params as { folder: Folder };
    const insets = useSafeAreaInsets();

    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const getMobileUrl = (rawUrl: string) => rawUrl.replace('http://localhost:3000', API_URL);

    const fetchFolderItems = useCallback(async () => {
        try {
            const res = await api.get(`/api/gallery?limit=100&folder_name=${encodeURIComponent(folder.name)}`);
            if (res.data.success) {
                const processedItems = res.data.data.items.map((i: any) => ({
                    ...i,
                    raw_url: getMobileUrl(i.raw_url)
                }));
                setItems(processedItems);
            }
        } catch (err) {
            console.error('Fetch folder items error', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [folder.name]);

    useEffect(() => {
        fetchFolderItems();
    }, [fetchFolderItems]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchFolderItems();
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

    const onPressItem = useCallback((index: number) => {
        navigation.navigate('ImageViewer', { items, initialIndex: index });
    }, [items, navigation]);

    const exitSelectMode = () => {
        setSelectMode(false);
        setSelectedIds(new Set());
    };

    const handleRemoveFromFolder = async () => {
        if (selectedIds.size === 0) return;
        try {
            await api.post('/api/files/bulk', { action: 'move', file_ids: Array.from(selectedIds), folder_name: null });
            exitSelectMode();
            fetchFolderItems();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Done', 'Files moved back to gallery');
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || 'Failed');
        }
    };

    const handleBulkTrash = () => {
        if (selectedIds.size === 0) return;
        Alert.alert(
            'Move to Trash', `Move ${selectedIds.size} file(s) to trash?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Trash', style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.post('/api/files/bulk', { action: 'trash', file_ids: Array.from(selectedIds) });
                            exitSelectMode();
                            fetchFolderItems();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (err: any) {
                            Alert.alert('Error', 'Failed to trash files');
                        }
                    }
                }
            ]
        );
    };

    if (loading && !refreshing && items.length === 0) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#1A1A1A" />
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
                            <Text style={styles.headerSubtitle}>FOLDER • {items.length} ITEMS</Text>
                            <Text style={styles.headerTitle} numberOfLines={1}>{folder.name}</Text>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>
                )}
            </View>

            {items.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                        <Feather name="folder-minus" size={32} color="#94A3B8" />
                    </View>
                    <Text style={styles.emptyTitle}>Folder is Empty</Text>
                    <Text style={styles.emptySubtitle}>Select photos from the gallery and move them here.</Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => item.id}
                    numColumns={COLUMN_COUNT}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A1A1A" />}
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === 'android'}
                    getItemLayout={(data, index) => ({ length: ITEM_SIZE, offset: ITEM_SIZE * Math.floor(index / COLUMN_COUNT), index })}
                    renderItem={({ item, index }) => (
                        <FolderGridItem
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

            {/* Floating Action Bar */}
            {selectMode && selectedIds.size > 0 && (
                <BlurView intensity={80} tint="light" style={[styles.actionBar, { paddingBottom: insets.bottom || 16 }]}>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleRemoveFromFolder}>
                        <View style={[styles.actionIconBg, { backgroundColor: '#F1F5F9' }]}>
                            <Feather name="corner-up-left" size={20} color="#334155" />
                        </View>
                        <Text style={[styles.actionText, { color: '#334155' }]}>Remove</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleBulkTrash}>
                        <View style={[styles.actionIconBg, { backgroundColor: '#FEE2E2' }]}>
                            <Feather name="trash-2" size={20} color="#DC2626" />
                        </View>
                        <Text style={[styles.actionText, { color: '#DC2626' }]}>Trash</Text>
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
    headerSubtitle: { fontSize: 11, fontWeight: '700', color: '#94A3B8', letterSpacing: 1, marginBottom: 2 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center' },

    iconBtn: { width: 40, height: 40, backgroundColor: '#F1F5F9', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    selectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 40 },
    selectCount: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
    selectAllText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },

    itemContainer: { width: ITEM_SIZE, height: ITEM_SIZE, padding: ITEM_SPACING / 2 },
    image: { flex: 1, backgroundColor: '#E2E8F0', borderRadius: 8 },
    imageSelected: { transform: [{ scale: 0.9 }], borderRadius: 12 },

    videoOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
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
