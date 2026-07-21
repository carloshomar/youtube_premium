import './global.css';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseProvider } from './src/context/DatabaseContext';
import AppNavigation from './src/navigation/AppNavigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <StatusBar style="light" />
        <AppNavigation />
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
