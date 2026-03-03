import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AuthSignInScreen from '../components/auth/AuthSignInScreen';
import { useAuth } from '../components/auth/AppAuthProvider';

export default function AuthRoute() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#1ccba1" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/" />;
  }

  return (
    <AuthSignInScreen
      presentation="modal"
      onCancel={() => {
        router.replace('/');
      }}
    />
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: 'rgba(5,5,16,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
