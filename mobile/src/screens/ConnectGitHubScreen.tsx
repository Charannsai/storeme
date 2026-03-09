import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
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
                <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.icon}>🔗</Text>
                <Text style={styles.title}>Connect GitHub</Text>
                <Text style={styles.subtitle}>
                    Your files are stored in your own private GitHub repository.
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
        backgroundColor: '#0a0a0f',
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
    icon: {
        fontSize: 64,
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#f0f0f5',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#8b8ba3',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        width: '100%',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    button: {
        backgroundColor: '#8b5cf6',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 32,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    refreshButton: {
        marginTop: 20,
        padding: 12,
    },
    refreshText: {
        color: '#a78bfa',
        fontSize: 14,
        fontWeight: '500',
    },
});
