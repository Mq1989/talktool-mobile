import React, { useEffect, useRef } from 'react';
import { Tabs, useRouter, Redirect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useVoice } from '../../src/contexts/VoiceContext';
import { setAuthTokenGetter } from '../../src/services/api';
import { LoadingSpinner } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 70;
const FAB_SIZE = 60;

// Brand colors
const brand = {
  blue: {
    primary: '#3B82F6',
    dark: '#1E40AF',
    light: '#DBEAFE',
    lighter: '#EFF6FF',
  },
  indigo: {
    primary: '#4F46E5',
    dark: '#3730A3',
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};

interface TabIconProps {
  focused: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
  iconNameFocused: keyof typeof Ionicons.glyphMap;
  label: string;
}

function TabIcon({ focused, iconName, iconNameFocused, label }: TabIconProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.08 : 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, scaleAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.tabIconContainer,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* Active indicator pill */}
      <Animated.View
        style={[
          styles.activeIndicator,
          { opacity: opacityAnim },
        ]}
      />
      <Ionicons
        name={focused ? iconNameFocused : iconName}
        size={24}
        color={focused ? brand.blue.primary : brand.gray[400]}
      />
      <Text
        style={[
          styles.tabLabel,
          focused && styles.tabLabelFocused,
        ]}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

// Floating Action Button for new call
function FloatingCallButton({ onPress }: { onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [glowAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.4],
  });

  return (
    <View style={styles.fabWrapper}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.fabGlow,
          { opacity: glowOpacity },
        ]}
      />
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View
          style={[
            styles.fab,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Ionicons name="call" size={26} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

// Custom Tab Bar Component
function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const tabConfig = [
    { key: 'index', icon: 'home-outline', iconFocused: 'home', label: 'Home' },
    { key: 'calls', icon: 'language-outline', iconFocused: 'language', label: 'Calls' },
    { key: 'fab', isFab: true },
    { key: 'contacts', icon: 'people-outline', iconFocused: 'people', label: 'Contacts' },
    { key: 'settings', icon: 'settings-outline', iconFocused: 'settings', label: 'Settings' },
  ];

  return (
    <View style={styles.tabBarWrapper}>
      <BlurView intensity={80} tint="light" style={styles.blurContainer}>
        <View style={styles.tabBarContent}>
          {tabConfig.map((tab, index) => {
            if (tab.isFab) {
              return (
                <FloatingCallButton
                  key="fab"
                  onPress={() => router.push('/call/new')}
                />
              );
            }

            const routeIndex = state.routes.findIndex(
              (r: any) => r.name === tab.key
            );
            const isFocused = state.index === routeIndex;
            const route = state.routes[routeIndex];

            if (!route) return null;

            const { options } = descriptors[route.key];

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={tab.key}
                onPress={onPress}
                style={styles.tabButton}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
              >
                <TabIcon
                  focused={isFocused}
                  iconName={tab.icon as keyof typeof Ionicons.glyphMap}
                  iconNameFocused={tab.iconFocused as keyof typeof Ionicons.glyphMap}
                  label={tab.label!}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { incomingCallInvite } = useVoice();

  // Set up auth token getter for API calls
  useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(getToken);
    }
  }, [isSignedIn, getToken]);

  // Handle incoming calls
  useEffect(() => {
    if (incomingCallInvite) {
      router.push('/call/incoming');
    }
  }, [incomingCallInvite, router]);

  // Show loading while checking auth
  if (!isLoaded) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  // Redirect to login if not authenticated
  if (!isSignedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="translate" />
      <Tabs.Screen name="contacts" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Tab Bar Wrapper
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  blurContainer: {
    overflow: 'visible',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: TAB_BAR_HEIGHT,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    overflow: 'visible',
  },

  // Tab Button
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 4,
  },
  activeIndicator: {
    position: 'absolute',
    top: -4,
    width: 32,
    height: 4,
    backgroundColor: brand.blue.primary,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: brand.gray[400],
    marginTop: 4,
  },
  tabLabelFocused: {
    color: brand.blue.primary,
    fontWeight: '600',
  },

  // Floating Action Button
  fabWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: FAB_SIZE + 8,
    marginTop: -20,
  },
  fabGlow: {
    position: 'absolute',
    width: FAB_SIZE + 20,
    height: FAB_SIZE + 20,
    borderRadius: (FAB_SIZE + 20) / 2,
    backgroundColor: brand.blue.primary,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: brand.blue.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: brand.blue.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
