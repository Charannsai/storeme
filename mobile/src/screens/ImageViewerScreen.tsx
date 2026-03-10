import React, { useState, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Dimensions, FlatList, Alert, ActivityIndicator, StatusBar,
    Platform
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';

import { GalleryItem } from '../types';
import api, { API_URL } from '../services/api';

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
    const { items, initialIndex } = route.params as { items: GalleryItem[]; initialIndex: number };

    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isDownloading, setIsDownloading] = useState(false);

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
                Alert.alert('Permission required', 'We need access to your photos to save images.');
                return;
            }

            const mobileUrl = getMobileUrl(currentItem.raw_url);
            const fileUri = `${FileSystem.documentDirectory}${currentItem.filename}`;
            const downloadRes = await FileSystem.downloadAsync(mobileUrl, fileUri);
            await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Downloaded', 'Image saved to your device.');
        } catch (err: any) {
            console.error('Download error:', err);
            Alert.alert('Download Failed', err.message);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleTrash = () => {
        if (!currentItem) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
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
                            Alert.alert('Error', err.response?.data?.error || err.message);
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

    const renderItem = ({ item, index }: { item: GalleryItem, index: number }) => (
        <View style={styles.slide}>
            {item.file_type === 'video' ? (
                <Video
                    source={{ uri: getMobileUrl(item.raw_url) }}
                    style={styles.fullImage}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                    shouldPlay={currentIndex === index}
                    isLooping
                />
            ) : (
                <Image
                    source={{ uri: getMobileUrl(item.raw_url) }}
                    style={styles.fullImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={300}
                />
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

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
                removeClippedSubviews={Platform.OS === 'android'}
            />

            <SafeAreaView style={styles.topBar} edges={['top']}>
                <BlurView intensity={30} tint="dark" style={styles.topBlur}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                        <Feather name="arrow-left" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.counter}>{currentIndex + 1} of {items.length}</Text>
                    <View style={{ width: 44 }} />
                </BlurView>
            </SafeAreaView>

            <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
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
                            <Text style={styles.fileName} numberOfLines={1}>{currentItem.filename}</Text>
                            <Text style={styles.fileDate}>
                                {new Date(currentItem.uploaded_at).toLocaleString()} • {formatSize(currentItem.size)}
                            </Text>
                        </View>
                    )}
                </BlurView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },

    slide: { width: SCREEN_W, height: SCREEN_H, justifyContent: 'center', alignItems: 'center' },
    fullImage: { width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000' },

    topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    topBlur: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    iconBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
    counter: { fontSize: 16, fontWeight: '700', color: '#FFF', letterSpacing: 1 },

    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    bottomBlur: { paddingTop: 24, paddingBottom: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },

    bottomActions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
    bottomBtn: { alignItems: 'center', gap: 8 },
    bottomIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    bottomBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },

    fileInfo: { alignItems: 'center' },
    fileName: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
    fileDate: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
});
