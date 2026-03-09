import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
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
                        <View style={styles.iconCircle}>
                            <Feather name="cloud" size={32} color="#0F172A" />
                        </View>
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
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#9CA3AF"
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
                            <ActivityIndicator color="#FFFFFF" />
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
        backgroundColor: '#FFFFFF',
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
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
        marginBottom: 32,
        textAlign: 'center',
    },
    errorContainer: {
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        color: '#111827',
        fontSize: 16,
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    toggleButton: {
        marginTop: 24,
        alignItems: 'center',
    },
    toggleText: {
        color: '#4B5563',
        fontSize: 14,
        fontWeight: '500',
    },
});
