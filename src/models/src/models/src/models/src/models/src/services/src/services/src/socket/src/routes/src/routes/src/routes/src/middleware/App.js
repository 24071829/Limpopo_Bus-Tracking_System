import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import AlertsScreen from './src/screens/AlertsScreen';

const Stack = createStackNavigator();

export default function App() {
    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <Stack.Navigator initialRouteName="Login">
                    <Stack.Screen 
                        name="Login" 
                        component={LoginScreen} 
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen 
                        name="Home" 
                        component={HomeScreen} 
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen 
                        name="Map" 
                        component={MapScreen} 
                        options={{ title: 'Bus Tracker' }}
                    />
                    <Stack.Screen 
                        name="Alerts" 
                        component={AlertsScreen} 
                        options={{ title: 'Alerts' }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
}
