import { Stack } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function AuthLayout() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Stack />;
} 