import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation/RootNavigator';
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
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
