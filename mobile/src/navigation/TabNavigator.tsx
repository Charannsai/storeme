import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';

import { DashboardTabParamList } from '../types';
import GalleryScreen from '../screens/GalleryScreen';
import AlbumsScreen from '../screens/AlbumsScreen';

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
                    ) : null
                ),
                tabBarActiveTintColor: '#1A1A1A',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarIcon: ({ focused, color }) => {
                    let iconName: any = 'square';
                    if (route.name === 'Photos') iconName = 'image';
                    else if (route.name === 'Albums') iconName = 'grid';

                    return (
                        <Feather
                            name={iconName}
                            size={focused ? 28 : 26}
                            color={color}
                            style={focused ? styles.iconFocused : undefined}
                        />
                    );
                },
            })}
        >
            <Tab.Screen name="Photos" component={GalleryScreen} />
            <Tab.Screen name="Albums" component={AlbumsScreen} />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    iconFocused: {
        shadowColor: '#1A1A1A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    }
});
