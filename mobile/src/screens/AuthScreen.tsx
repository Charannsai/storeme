import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Auth'>;
};

export default function AuthScreen({ navigation }: Props) {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isLogin, setIsLogin] = React.useState(true);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const handleAuth = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
            const res = await api.post(endpoint, { email, password });

            if (res.data.success) {
                await AsyncStorage.setItem('access_token', res.data.data.session.access_token);
                await AsyncStorage.setItem('refresh_token', res.data.data.session.refresh_token);
                await AsyncStorage.setItem('user', JSON.stringify(res.data.data.user));

                // Check if user has GitHub mapped
                // We'll optimistically route to Check screen or dashboard
                navigation.replace('ConnectGitHub');
            } else {
                setError(res.data.error || 'Authentication failed');
            }
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoIcon}>📦</Text>
                        <Text style={styles.logoText}>StoreMe</Text>
                    </View>

                    <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Vault'}</Text>
                    <Text style={styles.subtitle}>
                        {isLogin ? 'Sign in to access your gallery' : 'Start storing your media privately'}
                    </Text>

                    {!!error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#8b8ba3"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#8b8ba3"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleAuth}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>
                                {isLogin ? 'Sign In' : 'Create Account'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => setIsLogin(!isLogin)}
                    >
                        <Text style={styles.toggleText}>
                            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0f',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    content: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    logoText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#f0f0f5',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#f0f0f5',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#8b8ba3',
        marginBottom: 32,
        textAlign: 'center',
    },
    errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#1a1a2e',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 16,
        color: '#f0f0f5',
        fontSize: 16,
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#8b5cf6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    toggleButton: {
        marginTop: 24,
        alignItems: 'center',
    },
    toggleText: {
        color: '#a78bfa',
        fontSize: 14,
        fontWeight: '500',
    },
});
