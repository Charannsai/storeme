import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../types';
import AuthScreen from '../screens/AuthScreen';
import ConnectGitHubScreen from '../screens/ConnectGitHubScreen';
import TabNavigator from './TabNavigator';
import ImageViewerScreen from '../screens/ImageViewerScreen';
import ImageEditorScreen from '../screens/ImageEditorScreen';
import FolderViewScreen from '../screens/FolderViewScreen';
import TrashScreen from '../screens/TrashScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Auth');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkToken();
    }, []);

    const checkToken = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            if (token) {
                setInitialRoute('Dashboard'); // For optimistic load
            }
        } catch {
            // Ignore
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0F172A" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName={initialRoute}
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#FFFFFF' },
                }}
            >
                <Stack.Screen name="Auth" component={AuthScreen} />
                <Stack.Screen name="ConnectGitHub" component={ConnectGitHubScreen} />
                <Stack.Screen name="Dashboard" component={TabNavigator} />
                <Stack.Screen
                    name="ImageViewer"
                    component={ImageViewerScreen}
                    options={{
                        animation: 'fade',
                        contentStyle: { backgroundColor: '#000' },
                    }}
                />
                <Stack.Screen
                    name="ImageEditor"
                    component={ImageEditorScreen}
                    options={{
                        animation: 'slide_from_bottom',
                        contentStyle: { backgroundColor: '#0F0F0F' },
                    }}
                />
                <Stack.Screen
                    name="FolderView"
                    component={FolderViewScreen}
                    options={{ animation: 'slide_from_right' }}
                />
                <Stack.Screen
                    name="TrashBin"
                    component={TrashScreen}
                    options={{ animation: 'slide_from_right' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
