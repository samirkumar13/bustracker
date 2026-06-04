import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://10.0.2.2:3000';

let socket = null;

export async function connectSocket() {
  const token = await AsyncStorage.getItem('token');
  socket = io(SOCKET_URL, { auth: { token } });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
