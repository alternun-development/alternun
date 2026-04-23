import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

interface ReferralNavbarProps {
  user?: { id: string; email?: string } | null;
}

export const ReferralNavbar: React.FC<ReferralNavbarProps> = ({ user }) => {
  const router = useRouter();

  return (
    <View style={styles.navbar}>
      <View style={styles.container}>
        {/* Logo */}
        <Pressable onPress={() => router.push('/')} style={styles.logoContainer}>
          <Text style={styles.logo}>✦ Alternun</Text>
        </Pressable>

        {/* Right actions */}
        <View style={styles.actions}>
          {user ? (
            <Pressable
              onPress={() => router.push('/mi-perfil')}
              style={styles.profileButton}
            >
              <Text style={styles.profileText}>Profile</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => router.push('/auth')}
                style={styles.signInButton}
              >
                <Text style={styles.signInText}>Sign In</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: '/auth', params: { mode: 'signup' } })}
                style={styles.signUpButton}
              >
                <Text style={styles.signUpText}>Sign Up</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(5, 5, 16, 0.8)',
    backdropFilter: 'blur(10px)',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    fontFamily: 'Sculpin-Bold',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(28, 203, 161, 0.1)',
  },
  profileText: {
    color: '#1ccba1',
    fontSize: 14,
    fontWeight: '600',
  },
  signInButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.2)',
  },
  signInText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  signUpButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1ccba1',
  },
  signUpText: {
    color: '#041710',
    fontSize: 14,
    fontWeight: '700',
  },
});
