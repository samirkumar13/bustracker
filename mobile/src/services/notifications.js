import { Platform, Alert } from 'react-native';

let Notifications = null;
let Device = null;
let Constants = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants').default;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'BusTracker',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1a73e8',
    });
  }
} catch {
  // expo-notifications not available in Expo Go (SDK 53+) — Alert.alert used as fallback
}

export async function registerForPushNotifications() {
  if (!Notifications || !Device || !Device.isDevice) return null;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const token = (await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )).data;
    return token;
  } catch {
    return null;
  }
}

export function showLocalNotification(title, body) {
  if (!Notifications) {
    // Expo Go fallback — show an in-app alert so parents still see the event
    Alert.alert(title, body);
    return;
  }
  try {
    Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch {
    Alert.alert(title, body);
  }
}
