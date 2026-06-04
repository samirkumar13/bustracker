import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { connectSocket } from '../services/socket';
import { showLocalNotification, registerForPushNotifications } from '../services/notifications';
import { colors } from '../theme/theme';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import BusTrackingScreen from '../screens/BusTrackingScreen';
import DriverScreen from '../screens/DriverScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AttendanceScreen from '../screens/AttendanceScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    primary: colors.primary,
    border: colors.hairline,
  },
};

const tabScreenOptions = {
  headerShown: false,
  tabBarShowLabel: true,
  tabBarStyle: {
    paddingTop: 6,
    paddingBottom: 8,
    height: 64,
    backgroundColor: colors.surface,
    borderTopColor: colors.hairline,
  },
  tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: -2 },
  tabBarActiveTintColor: colors.primaryDeep,
  tabBarInactiveTintColor: colors.textFaint,
};

function tabIcon(iconName) {
  return ({ color, focused }) => (
    <Feather name={iconName} size={focused ? 22 : 20} color={color} />
  );
}

function ParentStudentTabs() {
  const { user } = useAuth();

  useEffect(() => {
    registerForPushNotifications();
    let socket;
    (async () => {
      socket = await connectSocket();
      socket.on(`attendance:${user.id}`, (event) => {
        showLocalNotification(
          event.status === 'BOARDED' ? 'Child boarded bus' : 'Child exited bus',
          `${event.studentName} ${event.status === 'BOARDED' ? 'boarded' : 'exited'} the bus`
        );
      });
    })();
    return () => socket?.off(`attendance:${user.id}`);
  }, []);

  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Buses" component={HomeScreen}
        options={{ tabBarIcon: tabIcon('truck') }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen}
        options={{ tabBarIcon: tabIcon('check-circle') }} />
      <Tab.Screen name="Profile" component={ProfileScreen}
        options={{ tabBarIcon: tabIcon('user') }} />
    </Tab.Navigator>
  );
}

function MainStack() {
  const { user } = useAuth();

  if (user?.role === 'DRIVER') {
    return (
      <Tab.Navigator screenOptions={tabScreenOptions}>
        <Tab.Screen name="My Bus" component={DriverScreen}
          options={{ tabBarIcon: tabIcon('truck') }} />
        <Tab.Screen name="Profile" component={ProfileScreen}
          options={{ tabBarIcon: tabIcon('user') }} />
      </Tab.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="Tabs" component={ParentStudentTabs} />
      <Stack.Screen
        name="BusTracking"
        component={BusTrackingScreen}
        options={{
          headerShown: true,
          title: 'Track bus',
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '800' },
        }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user ? (
        <MainStack />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
