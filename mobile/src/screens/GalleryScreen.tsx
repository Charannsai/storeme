import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { GalleryItem } from '../types';
import api from '../services/api';

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

    const renderItem = ({ item }: { item: GalleryItem }) => (
        <TouchableOpacity style={styles.itemContainer} activeOpacity={0.8}>
            <Image
                source={{ uri: item.raw_url }}
                style={styles.image}
                resizeMode="cover"
            />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#8b5cf6" />
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
                    <Text style={styles.emptyIcon}>📷</Text>
                    <Text style={styles.emptyTitle}>No Photos Yet</Text>
                    <Text style={styles.emptySubtitle}>Go to the Upload tab to add some.</Text>
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
                            tintColor="#8b5cf6"
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
        backgroundColor: '#0a0a0f',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#12121a',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#f0f0f5',
    },
    itemContainer: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        padding: 1,
    },
    image: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#f0f0f5',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#8b8ba3',
        textAlign: 'center',
    },
});
