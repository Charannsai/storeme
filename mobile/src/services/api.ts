const axios = require('axios').default || require('axios');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use your computer's local IP address when running on a real device
// Or 10.0.2.2 for Android Emulator, and localhost for iOS Simulator
export const API_URL =
    process.env.EXPO_PUBLIC_API_URL ||
    (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://127.0.0.1:3000');

export const api = axios.create({
    baseURL: API_URL,
});

// Automatically attach the access token to requests
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
