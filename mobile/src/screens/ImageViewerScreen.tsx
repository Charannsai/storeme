import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, FlatList, Alert, ActivityIndicator, StatusBar,
    Platform, Animated, PanResponder
} from 'react-native';
import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';

import { GalleryItem } from '../types';
import api, { API_URL } from '../services/api';
import { useAlert } from '../components/CustomAlertProvider';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function formatSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export default function ImageViewerScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const insets = useSafeAreaInsets();
    const { items, initialIndex } = route.params as { items: GalleryItem[]; initialIndex: number };
    const { showAlert } = useAlert();

    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isDownloading, setIsDownloading] = useState(false);
    const [uiVisible, setUiVisible] = useState(true);
    const hideTimer = useRef<NodeJS.Timeout | null>(null);

    const fadeAnim = useRef(new Animated.Value(1)).current;

    const resetHideTimer = useCallback(() => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setUiVisible(true);
        hideTimer.current = setTimeout(() => {
            setUiVisible(false);
        }, 3000);
    }, []);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: uiVisible ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [uiVisible, fadeAnim]);

    const pan = useRef(new Animated.ValueXY({ x: 0, y: SCREEN_H / 1.2 })).current;

    useEffect(() => {
        Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            bounciness: 12,
            speed: 28,
        }).start();
    }, []);
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                // Return true if user is swiping vertically
                return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
            },
            onPanResponderGrant: () => {
                if (uiVisible) setUiVisible(false);
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (evt, gestureState) => {
                const throwThreshold = 100;
                if (Math.abs(gestureState.dy) > throwThreshold || Math.abs(gestureState.dx) > throwThreshold) {
                    const toY = gestureState.dy + gestureState.vy * 100;
                    const toX = gestureState.dx + gestureState.vx * 100;
                    
                    Animated.spring(pan, {
                        toValue: { x: toX * 2, y: toY * 2 },
                        useNativeDriver: true,
                        speed: 30,
                        bounciness: 0,
                    }).start(() => navigation.goBack());
                } else {
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: true,
                        bounciness: 14,
                        speed: 24,
                    }).start();
                }
            },
        })
    ).current;

    const scale = pan.y.interpolate({
        inputRange: [-SCREEN_H, 0, SCREEN_H],
        outputRange: [0.2, 1, 0.2],
        extrapolate: 'clamp',
    });

    const rotation = pan.x.interpolate({
        inputRange: [-SCREEN_W, 0, SCREEN_W],
        outputRange: ['-15deg', '0deg', '15deg'],
    });

    const bgOpacity = pan.y.interpolate({
        inputRange: [-SCREEN_H / 2, 0, SCREEN_H / 2],
        outputRange: [0, 1, 0],
        extrapolate: 'clamp',
    });

    useEffect(() => {
        resetHideTimer();
        return () => {
            if (hideTimer.current) clearTimeout(hideTimer.current);
        };
    }, [resetHideTimer]);

    const toggleUI = () => {
        if (uiVisible) {
            setUiVisible(false);
            if (hideTimer.current) clearTimeout(hideTimer.current);
        } else {
            resetHideTimer();
        }
    };

    const getMobileUrl = (rawUrl: string) => rawUrl.replace('http://localhost:3000', API_URL);

    const currentItem = items[currentIndex];

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const handleDownload = async () => {
        if (!currentItem) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsDownloading(true);
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                showAlert('Permission required', 'We need access to your photos to save images.');
                return;
            }

            const mobileUrl = getMobileUrl(currentItem.raw_url);
            // @ts-ignore
            const fileUri = `${FileSystem.documentDirectory}${currentItem.filename}`;
            const downloadRes = await FileSystem.downloadAsync(mobileUrl, fileUri);
            await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showAlert('Downloaded', 'Image saved to your device.');
        } catch (err: any) {
            console.error('Download error:', err);
            showAlert('Download Failed', err.message);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleTrash = () => {
        if (!currentItem) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showAlert(
            'Move to Trash',
            'This photo will be moved to the recycle bin.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Trash',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.request({ method: 'DELETE', url: '/api/file', data: { file_id: currentItem.id } });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            navigation.goBack();
                        } catch (err: any) {
                            showAlert('Error', err.response?.data?.error || err.message);
                        }
                    }
                }
            ]
        );
    };

    const handleEdit = () => {
        if (!currentItem) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const mobileUrl = getMobileUrl(currentItem.raw_url);
        navigation.navigate('ImageEditor', { imageUri: mobileUrl, fileId: currentItem.id });
    };

    const VideoSlide = ({ item, isActive }: { item: GalleryItem, isActive: boolean }) => {
        const player = useVideoPlayer(getMobileUrl(item.raw_url), (player) => {
            player.loop = true;
        });

        const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
        const { status } = useEvent(player, 'statusChange', { status: player.status });
        const [hasStarted, setHasStarted] = useState(false);

        useEffect(() => {
            if (isPlaying && !hasStarted) {
                setHasStarted(true);
            }
        }, [isPlaying, hasStarted]);

        useEffect(() => {
            if (!isActive) {
                if (player.playing) {
                    player.pause();
                }
                setHasStarted(false);
            }
        }, [isActive, player]);

        return (
            <View style={{ width: SCREEN_W, height: SCREEN_H, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                <VideoView
                    player={player}
                    style={{ width: '100%', height: '100%', position: 'absolute' }}
                    contentFit="contain"
                    nativeControls={true}
                    useExoShutter={false}
                />
                
                {(!hasStarted) && (
                    <TouchableOpacity 
                        activeOpacity={1} 
                        style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', zIndex: 10 }]} 
                        onPress={() => {
                            player.play();
                            if (uiVisible) toggleUI();
                        }}
                    >
                        <Image
                            source={{ uri: getMobileUrl(item.raw_url) }}
                            style={{ flex: 1, width: '100%', height: '100%' }}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                        />
                        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }} pointerEvents="none">
                            {status === 'loading' ? (
                                <BlurView intensity={80} tint="dark" style={{ width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                    <ActivityIndicator size="large" color="#FFF" />
                                </BlurView>
                            ) : (
                                <BlurView intensity={80} tint="dark" style={{ width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                    <Feather name="play" size={32} color="#FFF" style={{ marginLeft: 4 }} />
                                </BlurView>
                            )}
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderItem = ({ item, index }: { item: GalleryItem, index: number }) => (
        <View style={styles.slide}>
            {item.file_type === 'video' ? (
                <VideoSlide item={item} isActive={currentIndex === index} />
            ) : (
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={toggleUI}
                    style={{ width: SCREEN_W, height: SCREEN_H }}
                >
                    <Image
                        source={{ uri: getMobileUrl(item.raw_url) }}
                        style={styles.fullImage}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        transition={300}
                    />
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: bgOpacity }]} />
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <Animated.View 
                style={[StyleSheet.absoluteFill, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }, { rotate: rotation }] }]}
                {...panResponder.panHandlers}
            >
                <FlatList
                    ref={flatListRef}
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    initialScrollIndex={initialIndex}
                    getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    windowSize={3}
                    maxToRenderPerBatch={2}
                    removeClippedSubviews={false}
                />
            </Animated.View>

            <Animated.View
                pointerEvents={uiVisible ? 'auto' : 'none'}
                style={[styles.topBar, { paddingTop: insets.top, opacity: fadeAnim }]}
            >
                <BlurView intensity={30} tint="dark" style={styles.topBlur}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                        <Feather name="arrow-left" size={24} color="#FFF" />
                    </TouchableOpacity>

                    <View style={styles.headerInfo}>
                        <Text style={styles.headerFileName} numberOfLines={1}>
                            {currentItem?.filename}
                        </Text>
                    </View>

                    <View style={styles.countBadge}>
                        <Text style={styles.counter}>{currentIndex + 1} / {items.length}</Text>
                    </View>
                </BlurView>
            </Animated.View>

            <Animated.View
                pointerEvents={uiVisible ? 'auto' : 'none'}
                style={[styles.bottomBar, { paddingBottom: insets.bottom, opacity: fadeAnim }]}
            >
                    <BlurView intensity={50} tint="dark" style={styles.bottomBlur}>
                        <View style={styles.bottomActions}>
                            <TouchableOpacity style={styles.bottomBtn} onPress={handleEdit}>
                                <View style={styles.bottomIconBg}>
                                    <Feather name="sliders" size={20} color="#FFF" />
                                </View>
                                <Text style={styles.bottomBtnText}>Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.bottomBtn} onPress={handleDownload} disabled={isDownloading}>
                                <View style={[styles.bottomIconBg, isDownloading && { backgroundColor: 'transparent' }]}>
                                    {isDownloading ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Feather name="download" size={20} color="#FFF" />
                                    )}
                                </View>
                                <Text style={styles.bottomBtnText}>Save</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.bottomBtn} onPress={handleTrash}>
                                <View style={styles.bottomIconBg}>
                                    <Feather name="trash-2" size={20} color="#FCA5A5" />
                                </View>
                                <Text style={[styles.bottomBtnText, { color: '#FCA5A5' }]}>Trash</Text>
                            </TouchableOpacity>
                        </View>

                        {currentItem && (
                            <View style={styles.fileInfo}>
                                <Text style={styles.fileDate}>
                                    {new Date(currentItem.uploaded_at).toLocaleString()} • {formatSize(currentItem.size)}
                                </Text>
                            </View>
                        )}
                    </BlurView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },

    slide: { width: SCREEN_W, height: SCREEN_H, justifyContent: 'center', alignItems: 'center' },
    fullImage: { width: SCREEN_W, height: SCREEN_H, backgroundColor: 'transparent' },

    topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    topBlur: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12
    },
    iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
    headerInfo: { flex: 1, paddingHorizontal: 16, alignItems: 'center' },
    headerFileName: { fontSize: 15, fontWeight: '700', color: '#FFF', textAlign: 'center' },
    countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
    counter: { fontSize: 13, fontWeight: '700', color: '#FFF' },

    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    bottomBlur: { paddingTop: 20, paddingBottom: 16, paddingHorizontal: 20 },

    bottomActions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
    bottomBtn: { alignItems: 'center', gap: 8 },
    bottomIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    bottomBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },

    fileInfo: { alignItems: 'center' },
    fileDate: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
});
