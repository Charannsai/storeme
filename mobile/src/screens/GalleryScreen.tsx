import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, TouchableOpacity, Dimensions, RefreshControl, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { GalleryItem } from '../types';
import api, { API_URL } from '../services/api';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

export default function GalleryScreen() {
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Viewer State
    const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const fetchGallery = useCallback(async () => {
        try {
            const res = await api.get('/api/gallery?limit=100');
            if (res.data.success) {
                setItems(res.data.data.items);
            }
        } catch (err) {
            console.error('Fetch gallery error', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchGallery();
    }, [fetchGallery]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchGallery();
    };

    const getMobileUrl = (rawUrl: string) => rawUrl.replace('http://localhost:3000', API_URL);

    const handleDownload = async () => {
        if (!selectedImage) return;
        try {
            setIsDownloading(true);
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission required', 'We need access to your photos to save images.');
                return;
            }

            const mobileUrl = getMobileUrl(selectedImage.raw_url);
            const fileUri = `${FileSystem.documentDirectory}${selectedImage.filename}`;

            // Download file from proxy endpoint
            const downloadRes = await FileSystem.downloadAsync(mobileUrl, fileUri);

            // Save to native gallery
            await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
            Alert.alert('Downloaded', 'Image successfully saved to your device.');
        } catch (err: any) {
            console.error('Download error:', err);
            Alert.alert('Download Failed', err.message);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDelete = () => {
        if (!selectedImage) return;
        Alert.alert(
            "Delete Photo",
            "Are you sure you want to permanently delete this photo from your cloud storage?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await api.request({
                                method: 'DELETE',
                                url: '/api/file',
                                data: { file_id: selectedImage.id }
                            });
                            if (res.data.success) {
                                setItems(prev => prev.filter(i => i.id !== selectedImage.id));
                                setSelectedImage(null);
                                Alert.alert("Deleted", "Photo removed from your cloud.");
                            }
                        } catch (err: any) {
                            Alert.alert('Delete failed', err.response?.data?.error || err.message);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: GalleryItem }) => (
        <TouchableOpacity
            style={styles.itemContainer}
            activeOpacity={0.8}
            onPress={() => setSelectedImage(item)}
        >
            <Image
                source={{ uri: getMobileUrl(item.raw_url) }}
                style={styles.image}
                resizeMode="cover"
            />
        </TouchableOpacity>
    );

    if (loading && !refreshing && items.length === 0) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#0F172A" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Gallery</Text>
            </View>

            {items.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                        <Feather name="image" size={32} color="#0F172A" />
                    </View>
                    <Text style={styles.emptyTitle}>No Photos Yet</Text>
                    <Text style={styles.emptySubtitle}>Go to the Upload tab to add some or enable Auto Sync.</Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={COLUMN_COUNT}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#0F172A"
                        />
                    }
                />
            )}

            {/* FULL SCREEN VIEWER MODAL */}
            <Modal
                visible={!!selectedImage}
                transparent={false}
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.iconButton}>
                            <Feather name="x" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={handleDownload} style={styles.iconButton} disabled={isDownloading}>
                                {isDownloading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Feather name="download" size={24} color="#FFFFFF" />
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDelete} style={[styles.iconButton, { marginLeft: 16 }]}>
                                <Feather name="trash-2" size={24} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {selectedImage && (
                        <Image
                            source={{ uri: getMobileUrl(selectedImage.raw_url) }}
                            style={styles.fullScreenImage}
                            resizeMode="contain"
                        />
                    )}
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    itemContainer: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        padding: 1,
    },
    image: {
        flex: 1,
        backgroundColor: '#F1F5F9',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#000000',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        zIndex: 10,
    },
    modalActions: {
        flexDirection: 'row',
    },
    iconButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 22,
    },
    fullScreenImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
});
