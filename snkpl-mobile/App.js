import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LandingScreen from './src/screens/LandingScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import LiveAuctionScreen from './src/screens/LiveAuctionScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
        <Stack.Screen name="LiveAuction" component={LiveAuctionScreen} options={{ title: 'Live Auction' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
