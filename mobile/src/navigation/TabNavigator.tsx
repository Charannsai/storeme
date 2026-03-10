import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';

import { DashboardTabParamList } from '../types';
import GalleryScreen from '../screens/GalleryScreen';
import UploadScreen from '../screens/UploadScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<DashboardTabParamList>();

export default function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    position: 'absolute',
                    borderTopWidth: 0,
                    elevation: 0,
                    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255,255,255,0.9)',
                    height: 80,
                },
                tabBarBackground: () => (
                    Platform.OS === 'ios' ? (
                        <BlurView tint="light" intensity={80} style={StyleSheet.absoluteFill} />
                    ) : null // Android uses fallback background color in tabBarStyle above
                ),
                tabBarActiveTintColor: '#3B82F6',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarIcon: ({ focused, color }) => {
                    let iconName: any = 'square';
                    if (route.name === 'Gallery') iconName = 'image';
                    else if (route.name === 'Upload') iconName = 'plus-circle';
                    else if (route.name === 'Settings') iconName = 'settings';

                    return (
                        <Feather
                            name={iconName}
                            size={focused ? 28 : 24}
                            color={color}
                            style={focused ? styles.iconFocused : undefined}
                        />
                    );
                },
            })}
        >
            <Tab.Screen name="Gallery" component={GalleryScreen} />
            <Tab.Screen name="Upload" component={UploadScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    iconFocused: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    }
});
