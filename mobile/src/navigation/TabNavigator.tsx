import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
                tabBarStyle: {
                    backgroundColor: '#12121a',
                    borderTopColor: 'rgba(255,255,255,0.08)',
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: '#8b5cf6',
                tabBarInactiveTintColor: '#8b8ba3',
                tabBarIcon: ({ color, size }) => {
                    let icon = '';
                    if (route.name === 'Gallery') icon = '🖼️';
                    else if (route.name === 'Upload') icon = '➕';
                    else if (route.name === 'Settings') icon = '⚙️';

                    return <Text style={{ fontSize: 20 }}>{icon}</Text>;
                },
            })}
        >
            <Tab.Screen name="Gallery" component={GalleryScreen} />
            <Tab.Screen name="Upload" component={UploadScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
}
