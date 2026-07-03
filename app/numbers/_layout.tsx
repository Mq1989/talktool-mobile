import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

export default function NumbersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerShadowVisible: false,
        headerTintColor: colors.primary[600],
        headerTitleStyle: {
          fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold,
          color: colors.gray[900],
        },
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Your Numbers' }} />
      <Stack.Screen name="[id]" options={{ title: 'Incoming Calls' }} />
    </Stack>
  );
}
