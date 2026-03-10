import React from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardTabParamList } from '../types';
import GalleryScreen from '../screens/GalleryScreen';
import AlbumsScreen from '../screens/AlbumsScreen';

const Tab = createMaterialTopTabNavigator<DashboardTabParamList>();

export default function TabNavigator() {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            tabBarPosition="bottom"
            screenOptions={({ route }) => ({
                swipeEnabled: true,
                tabBarShowLabel: false,
                tabBarIndicatorStyle: { height: 0 },
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    elevation: 0,
                    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255,255,255,0.9)',
                    height: 60 + insets.bottom,
                    borderTopWidth: 0,
                    shadowColor: 'transparent',
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
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <Feather
                                name={iconName}
                                size={focused ? 28 : 26}
                                color={color}
                                style={focused ? styles.iconFocused : undefined}
                            />
                        </View>
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
