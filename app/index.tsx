/**
 * Gate screen – runs device check and onboarding check, then redirects.
 * Shown briefly at app start; redirects to /incompatible, /onboarding, or /main.
 */

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { deviceCompatibilityGate } from '@/Security/DeviceCompatibilityGate';
import { registry } from '@/Database/Registry';
import { Therapist } from '@/Entity/Therapist';

type GateState = 'loading' | 'incompatible' | 'onboarding' | 'main';

export default function GateScreen(): React.JSX.Element | null {
  const theme = useTheme();
  const router = useRouter();
  const [gateState, setGateState] = useState<GateState>('loading');

  useEffect(() => {
    let cancelled = false;
    const ok = deviceCompatibilityGate.isCompatible();
    if (cancelled) return;
    if (!ok) {
      setGateState('incompatible');
      return;
    }
    const therapists = registry.getRepository(Therapist).findAll();
    const has = therapists.length > 0;
    setGateState(has ? 'main' : 'onboarding');
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (gateState === 'incompatible') {
      router.replace('/incompatible');
      return;
    }
    if (gateState === 'onboarding') {
      router.replace('/onboarding');
      return;
    }
    if (gateState === 'main') {
      router.replace('/main');
    }
  }, [gateState, router]);

  if (gateState !== 'loading') {
    return null;
  }

  return (
    <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
