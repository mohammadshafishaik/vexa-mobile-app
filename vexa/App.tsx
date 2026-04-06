/**
 * VEXA - Real-time Service Marketplace
 * Root application component
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import NotificationToast from './src/components/ui/NotificationToast';
import { useNotificationStore } from './src/store/useNotificationStore';
import './global.css';

function App(): React.JSX.Element {
  // Global notification toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastData, setToastData] = useState({
    title: '',
    body: '',
    type: 'SYSTEM',
  });

  // Listen for new notifications from the store
  useEffect(() => {
    const unsubscribe = useNotificationStore.subscribe((state, prevState) => {
      if (state.notifications.length > prevState.notifications.length) {
        const newest = state.notifications[0];
        if (newest && !newest.isRead) {
          setToastData({
            title: newest.title,
            body: newest.body,
            type: newest.type,
          });
          setToastVisible(true);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaProvider>
        <RootNavigator />
        <NotificationToast
          visible={toastVisible}
          title={toastData.title}
          body={toastData.body}
          type={toastData.type}
          onDismiss={() => setToastVisible(false)}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

export default App;
