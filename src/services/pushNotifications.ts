import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { API_BASE_URL } from '../utils/constants';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationService {
  registerForPushNotifications: (authToken: string) => Promise<string | null>;
  getExpoPushToken: () => Promise<string | null>;
  addNotificationListener: (handler: (notification: Notifications.Notification) => void) => () => void;
  addNotificationResponseListener: (handler: (response: Notifications.NotificationResponse) => void) => () => void;
}

export const pushNotificationService: PushNotificationService = {
  async registerForPushNotifications(authToken: string): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2196F3',
      });

      // Incoming calls channel
      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Incoming Calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 500, 500],
        lightColor: '#2196F3',
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    try {
      const token = await this.getExpoPushToken();

      if (token && authToken) {
        // Register push token with backend
        await fetch(`${API_BASE_URL}/push/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token,
            platform: Platform.OS,
            deviceId: Device.deviceName || 'unknown',
          }),
        });
      }

      return token;
    } catch (error) {
      console.error('Error registering push notifications:', error);
      return null;
    }
  },

  async getExpoPushToken(): Promise<string | null> {
    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  },

  addNotificationListener(handler: (notification: Notifications.Notification) => void): () => void {
    const subscription = Notifications.addNotificationReceivedListener(handler);
    return () => subscription.remove();
  },

  addNotificationResponseListener(handler: (response: Notifications.NotificationResponse) => void): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(handler);
    return () => subscription.remove();
  },
};

// Hook to use notifications in components
export function useNotificationSetup(authToken: string | null) {
  const registerPush = async () => {
    if (authToken) {
      await pushNotificationService.registerForPushNotifications(authToken);
    }
  };

  return { registerPush };
}
