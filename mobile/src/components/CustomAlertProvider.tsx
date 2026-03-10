import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

type AlertButton = {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
};

interface AlertContextType {
    showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) throw new Error('useAlert must be used within CustomAlertProvider');
    return context;
};

export const CustomAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [visible, setVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState<string | undefined>();
    const [buttons, setButtons] = useState<AlertButton[]>([]);

    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const showAlert = (newTitle: string, newMessage?: string, newButtons?: AlertButton[]) => {
        setTitle(newTitle);
        setMessage(newMessage);
        setButtons(newButtons || [{ text: 'OK', style: 'default' }]);
        setVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Animated.parallel([
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 200,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 65,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const hideAlert = (onHidden?: () => void) => {
        Animated.parallel([
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 150,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 150,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start(() => {
            setVisible(false);
            if (onHidden) onHidden();
        });
    };

    const handleButtonPress = (btn: AlertButton) => {
        hideAlert(() => {
            if (btn.onPress) {
                // adding a tiny delay so modal closure feels more stable before potentially freezing UI with heavy deletes
                setTimeout(() => btn.onPress!(), 50);
            }
        });
    };

    // Determine icon and color based on title (heuristics)
    let iconName = "info";
    let iconColor = "#3B82F6"; // blue
    let iconBg = "#EFF6FF";

    if (title.toLowerCase().includes('delete') || title.toLowerCase().includes('trash') || title.toLowerCase().includes('remove')) {
        iconName = "alert-circle";
        iconColor = "#EF4444"; // red
        iconBg = "#FEF2F2";
    } else if (title.toLowerCase().includes('error') || title.toLowerCase().includes('failed')) {
        iconName = "x-circle";
        iconColor = "#EF4444";
        iconBg = "#FEF2F2";
    } else if (title.toLowerCase().includes('success') || title.toLowerCase().includes('done')) {
        iconName = "check-circle";
        iconColor = "#10B981"; // green
        iconBg = "#ECFDF5";
    }

    return (
        <AlertContext.Provider value={{ showAlert }}>
            {children}
            {visible && (
                <Modal visible={visible} transparent animationType="none" onRequestClose={() => hideAlert()}>
                    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
                        {Platform.OS === 'ios' ? (
                            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
                        ) : (
                            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                        )}
                        
                        <Animated.View style={[styles.alertBox, { transform: [{ scale: scaleAnim }] }]}>
                            <View style={styles.headerArea}>
                                <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                                    <Feather name={iconName as any} size={28} color={iconColor} />
                                </View>
                            </View>

                            <Text style={styles.titleText}>{title}</Text>
                            {message ? <Text style={styles.messageText}>{message}</Text> : null}

                            <View style={styles.buttonContainer}>
                                {buttons.map((btn, idx) => {
                                    const isDestructive = btn.style === 'destructive';
                                    const isCancel = btn.style === 'cancel';

                                    let btnStyle = styles.defaultBtn;
                                    let textStyle = styles.defaultBtnText;

                                    if (isDestructive) {
                                        btnStyle = styles.destructiveBtn;
                                        textStyle = styles.destructiveBtnText;
                                    } else if (isCancel) {
                                        btnStyle = styles.cancelBtn;
                                        textStyle = styles.cancelBtnText;
                                    }

                                    return (
                                        <TouchableOpacity
                                            key={idx}
                                            style={[styles.button, btnStyle, buttons.length === 2 && { flex: 1, marginHorizontal: 6 }]}
                                            activeOpacity={0.7}
                                            onPress={() => handleButtonPress(btn)}
                                        >
                                            <Text style={textStyle}>{btn.text}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </Animated.View>
                    </Animated.View>
                </Modal>
            )}
        </AlertContext.Provider>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    alertBox: {
        width: width * 0.85,
        maxWidth: 340,
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        paddingTop: 32,
        paddingBottom: 24,
        paddingHorizontal: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.15,
        shadowRadius: 32,
        elevation: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    headerArea: {
        marginBottom: 20,
        alignItems: 'center',
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    messageText: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        paddingHorizontal: 8,
    },
    buttonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%',
        gap: 12,
    },
    button: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    defaultBtn: {
        backgroundColor: '#0F172A',
        borderColor: '#0F172A',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    defaultBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    destructiveBtn: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
    },
    destructiveBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#DC2626',
    },
    cancelBtn: {
        backgroundColor: '#F8FAFC',
        borderColor: '#E2E8F0',
    },
    cancelBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#475569',
    },
});
