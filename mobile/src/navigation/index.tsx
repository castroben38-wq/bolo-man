import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import AuthNavigator from './AuthNavigator';
import ClientNavigator from './ClientNavigator';
import ProviderNavigator from './ProviderNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      {user?.role === 'PROVIDER' ? <ProviderNavigator /> : <ClientNavigator />}
    </NavigationContainer>
  );
}
