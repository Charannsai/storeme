import React from 'react';
import { StyleSheet, View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { createMaterialTopTabNavigator, MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardTabParamList } from '../types';
import GalleryScreen from '../screens/GalleryScreen';
import AlbumsScreen from '../screens/AlbumsScreen';

const Tab = createMaterialTopTabNavigator<DashboardTabParamList>();
const { width } = Dimensions.get('window');

function CustomTabBar({ state, descriptors, navigation, position }: MaterialTopTabBarProps) {
    const insets = useSafeAreaInsets();
    
    // We want a pill nav menu centered at the bottom
    const TAB_BAR_WIDTH = 220;
    const TAB_WIDTH = TAB_BAR_WIDTH / state.routes.length;

    const translateX = position.interpolate({
        inputRange: state.routes.map((_, i) => i),
        outputRange: state.routes.map((_, i) => i * TAB_WIDTH),
    });

    return (
        <View style={[styles.floatingTabBar, { bottom: insets.bottom + 16, left: (width - TAB_BAR_WIDTH) / 2, width: TAB_BAR_WIDTH }]}>
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFillObject} />
            
            <View style={styles.segmentContainer}>
                <Animated.View style={[
                    styles.activeTabBackground,
                    { width: TAB_WIDTH - 8, transform: [{ translateX }] }
                ]} />

                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label = options.tabBarLabel !== undefined ? options.tabBarLabel : route.name;
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                        if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
                    };

                    const textColor = position.interpolate({
                        inputRange: [index - 1, index, index + 1],
                        outputRange: ['#94A3B8', '#0F172A', '#94A3B8'],
                        extrapolate: 'clamp',
                    });

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            onPress={onPress}
                            style={styles.tabButton}
                        >
                            <Animated.Text style={[styles.tabText, { color: textColor }]}>
                                {label}
                            </Animated.Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

export default function TabNavigator() {
    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <Tab.Navigator
                tabBarPosition="bottom"
                tabBar={(props) => <CustomTabBar {...props} />}
                screenOptions={{ swipeEnabled: true }}
            >
                <Tab.Screen name="Photos" component={GalleryScreen} options={{ tabBarLabel: 'Recents' }} />
                <Tab.Screen name="Albums" component={AlbumsScreen} options={{ tabBarLabel: 'Albums' }} />
            </Tab.Navigator>
        </View>
    );
}

const styles = StyleSheet.create({
    floatingTabBar: {
        position: 'absolute',
        height: 54,
        borderRadius: 27,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    segmentContainer: {
        flex: 1,
        flexDirection: 'row',
        position: 'relative',
    },
    activeTabBackground: {
        position: 'absolute',
        top: 6,
        bottom: 6,
        left: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 21,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        marginLeft: 4
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
