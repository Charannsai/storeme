import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardTabParamList } from '../types';
import { Feather } from '@expo/vector-icons';

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
                    backgroundColor: '#FFFFFF',
                    borderTopColor: '#E5E7EB',
                    height: 60,
                    paddingTop: 8,
                    paddingBottom: 8,
                },
                tabBarActiveTintColor: '#0F172A',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarIcon: ({ color, size }) => {
                    let iconName: any = 'square';
                    if (route.name === 'Gallery') iconName = 'image';
                    else if (route.name === 'Upload') iconName = 'upload-cloud';
                    else if (route.name === 'Settings') iconName = 'settings';

                    return <Feather name={iconName} size={24} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Gallery" component={GalleryScreen} />
            <Tab.Screen name="Upload" component={UploadScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
}
