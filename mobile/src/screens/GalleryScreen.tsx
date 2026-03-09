import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GalleryItem } from '../types';
import api, { API_URL } from '../services/api';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

export default function GalleryScreen() {
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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

    const renderItem = ({ item }: { item: GalleryItem }) => {
        // Fix localhost routing on actual mobile devices
        const mobileFriendlyUrl = item.raw_url.replace('http://localhost:3000', API_URL);

        return (
            <TouchableOpacity style={styles.itemContainer} activeOpacity={0.8}>
                <Image
                    source={{ uri: mobileFriendlyUrl }}
                    style={styles.image}
                    resizeMode="cover"
                />
            </TouchableOpacity>
        );
    };

    if (loading) {
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
});
