import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'ConnectGitHub'>;
};

export default function ConnectGitHubScreen({ navigation }: Props) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        checkStorage();
    }, []);

    const checkStorage = async () => {
        try {
            const res = await api.get('/api/storage');
            if (res.data.success) {
                // Already connected, go to dashboard
                navigation.replace('Dashboard');
            } else {
                setLoading(false);
            }
        } catch (err: any) {
            // 400 likely means "GitHub account not connected"
            setLoading(false);
        }
    };

    const handleConnect = () => {
        // In a real app we would use expo-auth-session to initiate the OAuth flow
        // For this demonstration, we'll suggest the user connects via Web Dashboard
        setError('Please log in to the Web Dashboard at http://localhost:3000 to connect your GitHub account initially, then pull down to refresh.');
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
            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <Feather name="github" size={32} color="#0F172A" />
                </View>
                <Text style={styles.title}>Connect GitHub</Text>
                <Text style={styles.subtitle}>
                    Your files are stored securely in your own private GitHub repository.
                </Text>

                {!!error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <TouchableOpacity style={styles.button} onPress={handleConnect}>
                    <Text style={styles.buttonText}>Connect Account</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={() => {
                        setLoading(true);
                        setError('');
                        checkStorage();
                    }}
                >
                    <Text style={styles.refreshText}>I've connected via Web Dashboard</Text>
                </TouchableOpacity>
            </View>
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
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    errorContainer: {
        backgroundColor: '#FEF2F2',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        width: '100%',
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '500',
    },
    button: {
        backgroundColor: '#0F172A',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 32,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    refreshButton: {
        marginTop: 20,
        padding: 12,
    },
    refreshText: {
        color: '#4B5563',
        fontSize: 14,
        fontWeight: '500',
    },
});
