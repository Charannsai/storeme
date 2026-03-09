import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const axios = require('axios').default || require('axios');

// Safe fallback for process.env in React Native/Expo environments
const getApiUrl = () => {
    try {
        if (process && process.env && process.env.EXPO_PUBLIC_API_URL) {
            return process.env.EXPO_PUBLIC_API_URL;
        }
    } catch {
        // Ignore
    }
    return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://127.0.0.1:3000';
};

export const API_URL = getApiUrl();

export const api = axios.create({
    baseURL: API_URL,
});

// Automatically attach the access token to requests
api.interceptors.request.use(async (config: any) => {
    try {
        const token = await AsyncStorage.getItem('access_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch {
        // ignore
    }
    return config;
});

export default api;
