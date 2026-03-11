import React, { useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';

import { GalleryItem } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_LEVELS = [10, 8, 6, 4, 3, 2, 1];
const DEFAULT_LEVEL_INDEX = 3; // Index 3 = 4 columns
const ITEM_SPACING = 2;

// ─── Grid Item ───────────────────────────────────────────────
// Static size, no animated dimensions. Only re-renders on column/selection change.
const GalleryGridItem = React.memo(({ item, index, isSelected, selectMode, onSelect, onLongPress, onPressItem, columns, isTrash, itemSize }: any) => {
    return (
        <TouchableOpacity
            style={{ width: itemSize, height: itemSize, padding: ITEM_SPACING / 2 }}
            activeOpacity={0.9}
            onPress={() => selectMode ? onSelect(item.id) : onPressItem(index)}
            onLongPress={() => onLongPress(item.id)}
        >
            <Image
                source={{ uri: item.raw_url }}
                style={[
                    styles.image,
                    isSelected ? styles.imageSelected : null
                ]}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={item.id}
            />
            {item.file_type === 'video' && (
                <View style={styles.videoOverlay}>
                    <Feather name="play-circle" size={columns > 3 ? 16 : 24} color="rgba(255,255,255,0.9)" />
                </View>
            )}
            {isTrash && <View style={styles.trashOverlay} />}
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
           prev.columns === next.columns &&
           prev.itemSize === next.itemSize &&
           prev.item.id === next.item.id;
});

// ─── Props ───────────────────────────────────────────────────
interface PinchableGalleryListProps {
    items: GalleryItem[];
    selectMode: boolean;
    selectedIds: Set<string>;
    toggleSelect: (id: string) => void;
    onLongPress: (id: string) => void;
    onPressItem: (index: number) => void;
    refreshing?: boolean;
    onRefresh?: () => void;
    contentContainerStyle?: any;
    ListEmptyComponent?: React.ReactElement;
    isTrash?: boolean;
}

// ─── Main Component ──────────────────────────────────────────
export default function PinchableGalleryList({
    items, selectMode, selectedIds, toggleSelect, onLongPress, onPressItem,
    refreshing, onRefresh, contentContainerStyle, ListEmptyComponent, isTrash
}: PinchableGalleryListProps) {

    const listRef = useRef<FlashList<any>>(null);
    const scrollY = useRef(0);

    // ── Zoom / Column State ──
    const [levelIndex, setLevelIndex] = useState(DEFAULT_LEVEL_INDEX);
    const columns = GRID_LEVELS[levelIndex];
    const itemSize = SCREEN_WIDTH / columns;

    // ── Gesture shared values ──
    const scale = useSharedValue(1);
    const focalX = useSharedValue(0);
    const focalY = useSharedValue(0);

    // ── Scroll‑anchor column change ──
    const applyZoom = useCallback((delta: number, gestFocalY: number) => {
        setLevelIndex(prev => {
            const next = prev + delta;
            if (next < 0 || next >= GRID_LEVELS.length) return prev;

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            const oldCols = GRID_LEVELS[prev];
            const newCols = GRID_LEVELS[next];
            const oldItemH = SCREEN_WIDTH / oldCols;
            const newItemH = SCREEN_WIDTH / newCols;

            // Which photo row was under the focal point?
            const absoluteY = scrollY.current + gestFocalY;
            const approxRowIndex = absoluteY / oldItemH;
            const approxItemIndex = approxRowIndex * oldCols;

            // Where will that item land in the new grid?
            const newRowIndex = approxItemIndex / newCols;
            const newAbsoluteY = newRowIndex * newItemH;
            const targetScroll = Math.max(0, newAbsoluteY - gestFocalY);

            // Defer one frame so FlashList has finished re‑layout
            requestAnimationFrame(() => {
                listRef.current?.scrollToOffset({ offset: targetScroll, animated: false });
            });

            return next;
        });
    }, []);

    // ── Pinch Gesture ──
    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            // Rubber‑band at limits
            let s = e.scale;
            if (levelIndex === 0 && s < 1) s = 1 - (1 - s) * 0.25;
            if (levelIndex === GRID_LEVELS.length - 1 && s > 1) s = 1 + (s - 1) * 0.25;
            scale.value = s;
            focalX.value = e.focalX;
            focalY.value = e.focalY;
        })
        .onEnd((e) => {
            if (scale.value > 1.15 && levelIndex < GRID_LEVELS.length - 1) {
                runOnJS(applyZoom)(1, e.focalY);   // zoom in  → fewer columns
            } else if (scale.value < 0.85 && levelIndex > 0) {
                runOnJS(applyZoom)(-1, e.focalY);   // zoom out → more columns
            }
            scale.value = withSpring(1, { damping: 22, stiffness: 220 });
        });

    // ── Animated wrapper: scale + focal‑point correction ──
    const wrapperStyle = useAnimatedStyle(() => {
        if (scale.value === 1) return {};
        // Keep focal point visually anchored while the container scales
        const dx = focalX.value * (1 - scale.value);
        const dy = focalY.value * (1 - scale.value);
        return {
            transform: [
                { translateX: dx },
                { translateY: dy },
                { scale: scale.value },
            ],
        };
    });

    // ── Grouped rows ──
    const groupedData = useMemo(() => {
        const rows: any[] = [];
        let currentGroup = '';
        let chunk: GalleryItem[] = [];

        const flush = () => {
            if (chunk.length > 0) {
                rows.push({ type: 'row', items: [...chunk], id: chunk[0].id + '_r' + columns });
                chunk = [];
            }
        };

        items.forEach(item => {
            const d = new Date(item.uploaded_at);
            let group: string;
            if (columns <= 3) {
                group = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
            } else if (columns <= 6) {
                group = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            } else {
                group = d.getFullYear().toString();
            }

            if (group !== currentGroup) {
                flush();
                rows.push({ type: 'header', title: group, id: 'h_' + group });
                currentGroup = group;
            }
            chunk.push(item);
            if (chunk.length === columns) flush();
        });
        flush();
        return rows;
    }, [items, columns]);

    // ── Row renderer ──
    const renderRow = useCallback(({ item: row }: { item: any }) => {
        if (row.type === 'header') {
            return <Text style={styles.dateHeader}>{row.title}</Text>;
        }
        return (
            <View style={styles.gridRow}>
                {row.items.map((gi: GalleryItem) => {
                    const idx = items.indexOf(gi);
                    return (
                        <GalleryGridItem
                            key={gi.id}
                            item={gi}
                            index={idx === -1 ? 0 : idx}
                            isSelected={selectedIds.has(gi.id)}
                            selectMode={selectMode}
                            onSelect={toggleSelect}
                            onLongPress={onLongPress}
                            onPressItem={onPressItem}
                            columns={columns}
                            itemSize={itemSize}
                            isTrash={isTrash}
                        />
                    );
                })}
            </View>
        );
    }, [items, columns, itemSize, selectedIds, selectMode, toggleSelect, onLongPress, onPressItem, isTrash]);

    // ── Empty state ──
    if (items.length === 0 && ListEmptyComponent) {
        return <>{ListEmptyComponent}</>;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <GestureDetector gesture={pinchGesture}>
                <Animated.View style={[{ flex: 1 }, wrapperStyle]}>
                    <FlashList
                        ref={listRef}
                        data={groupedData}
                        keyExtractor={r => r.id}
                        estimatedItemSize={itemSize + 10}
                        renderItem={renderRow}
                        showsVerticalScrollIndicator={false}
                        onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; }}
                        scrollEventThrottle={16}
                        refreshControl={
                            onRefresh
                                ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#1A1A1A" />
                                : undefined
                        }
                        contentContainerStyle={contentContainerStyle}
                    />
                </Animated.View>
            </GestureDetector>
        </GestureHandlerRootView>
    );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
    gridRow: { flexDirection: 'row' },
    dateHeader: {
        fontSize: 18, fontWeight: '700', color: '#0F172A',
        paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12,
    },
    image: { flex: 1, backgroundColor: '#E2E8F0' },
    imageSelected: { transform: [{ scale: 0.85 }], borderRadius: 12 },
    trashOverlay: {
        ...StyleSheet.absoluteFillObject,
        margin: ITEM_SPACING / 2, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 8,
    },
    videoOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    selectOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-start', alignItems: 'flex-end', padding: 8 },
    selectedOverlay: { backgroundColor: 'rgba(26, 26, 26, 0.15)' },
    checkbox: {
        width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
        borderColor: '#FFF', backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    checkboxSelected: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A', transform: [{ scale: 1.1 }] },
});
