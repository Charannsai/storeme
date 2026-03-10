import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity,
    Dimensions, Alert, ActivityIndicator, ScrollView, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { useAlert } from '../components/CustomAlertProvider';

const { width: SCREEN_W } = Dimensions.get('window');

type FilterType = 'none' | 'grayscale' | 'sepia' | 'warm' | 'cool' | 'vintage';

export default function ImageEditorScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { imageUri, fileId } = route.params as { imageUri: string; fileId: string };
    const { showAlert } = useAlert();

    const [currentUri, setCurrentUri] = useState(imageUri);
    const [originalUri] = useState(imageUri);
    const [saving, setSaving] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterType>('none');
    const [rotation, setRotation] = useState(0);
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);
    const [activeTab, setActiveTab] = useState<'adjust' | 'filters'>('adjust');

    const applyManipulations = async (
        extraActions: ImageManipulator.Action[] = [],
        filterName?: FilterType
    ) => {
        try {
            const actions: ImageManipulator.Action[] = [...extraActions];

            const result = await ImageManipulator.manipulateAsync(
                originalUri,
                actions,
                { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
            );
            setCurrentUri(result.uri);
            if (filterName) setActiveFilter(filterName);
        } catch (err: any) {
            console.error('Manipulation error:', err);
            showAlert('Error', 'Failed to apply effect');
        }
    };

    const handleRotate = async () => {
        const newRotation = (rotation + 90) % 360;
        setRotation(newRotation);
        await applyManipulations([{ rotate: newRotation }]);
    };

    const handleFlipH = async () => {
        const newFlip = !flipH;
        setFlipH(newFlip);
        const actions: ImageManipulator.Action[] = [];
        if (newFlip) actions.push({ flip: ImageManipulator.FlipType.Horizontal });
        if (rotation) actions.push({ rotate: rotation });
        await applyManipulations(actions);
    };

    const handleFlipV = async () => {
        const newFlip = !flipV;
        setFlipV(newFlip);
        const actions: ImageManipulator.Action[] = [];
        if (newFlip) actions.push({ flip: ImageManipulator.FlipType.Vertical });
        if (rotation) actions.push({ rotate: rotation });
        await applyManipulations(actions);
    };

    const handleCrop = async () => {
        // Simple center crop to square
        try {
            const result = await ImageManipulator.manipulateAsync(
                currentUri,
                [{ crop: { originX: 0, originY: 0, width: SCREEN_W, height: SCREEN_W } }],
                { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
            );
            setCurrentUri(result.uri);
        } catch (err) {
            showAlert('Error', 'Failed to crop image');
        }
    };

    const handleResize = async (scale: number) => {
        try {
            const result = await ImageManipulator.manipulateAsync(
                currentUri,
                [{ resize: { width: Math.round(SCREEN_W * scale) } }],
                { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
            );
            setCurrentUri(result.uri);
        } catch (err) {
            showAlert('Error', 'Failed to resize image');
        }
    };

    const handleReset = () => {
        setCurrentUri(originalUri);
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        setActiveFilter('none');
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                showAlert('Permission required', 'We need photo library access to save.');
                return;
            }

            // If the URI is a remote URL, download it first
            let localUri = currentUri;
            if (currentUri.startsWith('http')) {
                const downloadResult = await FileSystem.downloadAsync(
                    currentUri,
                    `${FileSystem.documentDirectory}edited_${Date.now()}.jpg`
                );
                localUri = downloadResult.uri;
            }

            await MediaLibrary.saveToLibraryAsync(localUri);
            showAlert('Saved!', 'Edited image saved to your device.');
            navigation.goBack();
        } catch (err: any) {
            console.error('Save error:', err);
            showAlert('Error', 'Failed to save image');
        } finally {
            setSaving(false);
        }
    };

    const filters: { name: FilterType; label: string; icon: string }[] = [
        { name: 'none', label: 'Original', icon: 'circle' },
        { name: 'grayscale', label: 'B&W', icon: 'moon' },
        { name: 'warm', label: 'Warm', icon: 'sun' },
        { name: 'cool', label: 'Cool', icon: 'cloud' },
        { name: 'vintage', label: 'Vintage', icon: 'camera' },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Top Bar */}
            <SafeAreaView style={styles.topBar} edges={['top']}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <Feather name="x" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Edit Photo</Text>
                <TouchableOpacity onPress={handleReset} style={styles.iconBtn}>
                    <Feather name="refresh-ccw" size={20} color="#FFF" />
                </TouchableOpacity>
            </SafeAreaView>

            {/* Image Preview */}
            <View style={styles.previewContainer}>
                <Image
                    source={{ uri: currentUri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                />
            </View>

            {/* Bottom Controls */}
            <SafeAreaView style={styles.bottomPanel} edges={['bottom']}>
                {/* Tab Selector */}
                <View style={styles.tabRow}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'adjust' && styles.activeTab]}
                        onPress={() => setActiveTab('adjust')}
                    >
                        <Text style={[styles.tabText, activeTab === 'adjust' && styles.activeTabText]}>Adjust</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'filters' && styles.activeTab]}
                        onPress={() => setActiveTab('filters')}
                    >
                        <Text style={[styles.tabText, activeTab === 'filters' && styles.activeTabText]}>Filters</Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'adjust' ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolRow}>
                        <TouchableOpacity style={styles.toolBtn} onPress={handleRotate}>
                            <View style={styles.toolIconCircle}>
                                <Feather name="rotate-cw" size={22} color="#FFF" />
                            </View>
                            <Text style={styles.toolLabel}>Rotate</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.toolBtn} onPress={handleFlipH}>
                            <View style={[styles.toolIconCircle, flipH && styles.activeToolCircle]}>
                                <Feather name="maximize-2" size={22} color="#FFF" />
                            </View>
                            <Text style={styles.toolLabel}>Flip H</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.toolBtn} onPress={handleFlipV}>
                            <View style={[styles.toolIconCircle, flipV && styles.activeToolCircle]}>
                                <Feather name="minimize-2" size={22} color="#FFF" />
                            </View>
                            <Text style={styles.toolLabel}>Flip V</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.toolBtn} onPress={handleCrop}>
                            <View style={styles.toolIconCircle}>
                                <Feather name="crop" size={22} color="#FFF" />
                            </View>
                            <Text style={styles.toolLabel}>Crop</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.toolBtn} onPress={() => handleResize(0.5)}>
                            <View style={styles.toolIconCircle}>
                                <Feather name="minimize" size={22} color="#FFF" />
                            </View>
                            <Text style={styles.toolLabel}>50%</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.toolBtn} onPress={() => handleResize(0.75)}>
                            <View style={styles.toolIconCircle}>
                                <Feather name="square" size={22} color="#FFF" />
                            </View>
                            <Text style={styles.toolLabel}>75%</Text>
                        </TouchableOpacity>
                    </ScrollView>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolRow}>
                        {filters.map(f => (
                            <TouchableOpacity
                                key={f.name}
                                style={styles.toolBtn}
                                onPress={() => {
                                    if (f.name === 'none') {
                                        handleReset();
                                    } else {
                                        // Basic manipulations as pseudo-filters
                                        const actions: ImageManipulator.Action[] = [];
                                        if (rotation) actions.push({ rotate: rotation });
                                        applyManipulations(actions, f.name);
                                    }
                                }}
                            >
                                <View style={[
                                    styles.toolIconCircle,
                                    activeFilter === f.name && styles.activeToolCircle,
                                ]}>
                                    <Feather name={f.icon as any} size={22} color="#FFF" />
                                </View>
                                <Text style={styles.toolLabel}>{f.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Save Button */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                    {saving ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save to Device</Text>
                    )}
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F0F0F' },

    topBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingBottom: 8, paddingTop: 8,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    iconBtn: {
        width: 44, height: 44, borderRadius: 22,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    title: { fontSize: 18, fontWeight: '700', color: '#FFF' },

    previewContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    previewImage: { width: SCREEN_W, height: SCREEN_W },

    bottomPanel: {
        backgroundColor: 'rgba(0,0,0,0.85)',
        paddingHorizontal: 16, paddingTop: 16,
    },

    tabRow: {
        flexDirection: 'row', marginBottom: 16, gap: 8,
    },
    tab: {
        flex: 1, paddingVertical: 10, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center',
    },
    activeTab: { backgroundColor: 'rgba(255,255,255,0.2)' },
    tabText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
    activeTabText: { color: '#FFF' },

    toolRow: { paddingBottom: 20, gap: 16 },
    toolBtn: { alignItems: 'center', gap: 6 },
    toolIconCircle: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },
    activeToolCircle: { backgroundColor: '#1A1A1A' },
    toolLabel: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },

    saveBtn: {
        backgroundColor: '#1A1A1A', borderRadius: 14,
        paddingVertical: 16, alignItems: 'center', marginBottom: 8,
    },
    saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
