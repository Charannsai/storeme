import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RootNavigator from './src/navigation/RootNavigator';
import { CustomAlertProvider } from './src/components/CustomAlertProvider';
import { startSyncWorker, stopSyncWorker } from './src/services/syncWorker';


export default function App() {
  useEffect(() => {
    // Start syncing when app loads
    startSyncWorker();

    return () => {
      // Clean up when unmounting
      stopSyncWorker();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <CustomAlertProvider>
          <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
          <RootNavigator />
        </CustomAlertProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
