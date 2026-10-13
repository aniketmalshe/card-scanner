import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#f0f4f8' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Card Scanner' }} />
        <Stack.Screen name="scan" options={{ title: 'Scan Card', headerShown: false }} />
        <Stack.Screen name="review" options={{ title: 'Review & Save' }} />
      </Stack>
    </>
  );
}
