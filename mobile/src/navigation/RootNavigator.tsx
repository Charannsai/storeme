import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../types';
import AuthScreen from '../screens/AuthScreen';
import ConnectGitHubScreen from '../screens/ConnectGitHubScreen';
import TabNavigator from './TabNavigator';

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
            <View style={{ flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName={initialRoute}
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#0a0a0f' },
                }}
            >
                <Stack.Screen name="Auth" component={AuthScreen} />
                <Stack.Screen name="ConnectGitHub" component={ConnectGitHubScreen} />
                <Stack.Screen name="Dashboard" component={TabNavigator} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
