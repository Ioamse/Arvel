import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import WelcomeScreen from '../screens/WelcomeScreen';
import PhoneScreen from '../screens/PhoneScreen';
import VerifyScreen from '../screens/VerifyScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import LegalScreen from '../screens/LegalScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  // pendingUser: код уже подтверждён (токены рабочие), но имя не собрано —
  // например, приложение свернули/закрыли на ProfileSetup. Открываем сразу
  // туда, а не заставляем заново вводить телефон и код.
  const { pendingUser } = useAuth();
  return (
    <Stack.Navigator
      initialRouteName={pendingUser ? 'ProfileSetup' : 'Welcome'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Phone" component={PhoneScreen} />
      <Stack.Screen name="Verify" component={VerifyScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
    </Stack.Navigator>
  );
}
