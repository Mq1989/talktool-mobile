import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LoadingSpinner } from '../../src/components/ui';
import { CallCard } from '../../src/components/call/CallCard';
import { useCalls } from '../../src/hooks/useCalls';
import type { CallHistoryItem } from '../../src/types/call.types';

// TalkTool premium palette - editorial aesthetic
const palette = {
  // Core blues with depth
  azure: {
    50: '#EEF4FF',
    100: '#E0EAFF',
    200: '#C7D7FE',
    300: '#A4BCFD',
    400: '#8098F9',
    500: '#6172F3',
    600: '#444CE7',
    700: '#3538CD',
    800: '#2D31A6',
    900: '#1F235B',
  },
  // Warm neutrals for sophistication
  ink: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    150: '#EBEBED',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
    950: '#0D0D0F',
  },
  // Success spectrum
  jade: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
  },
  // Warning spectrum
  honey: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },
  // Accent violet
  iris: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
  },
  white: '#FFFFFF',
};

type FilterType = 'all' | 'completed' | 'missed';

// Animated filter chip with press feedback
function FilterChip({
  label,
  count,
  isActive,
  onPress,
  icon,
  activeGradient,
}: {
  label: string;
  count?: number;
  isActive: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  activeGradient: readonly [string, string];
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {isActive ? (
          <LinearGradient
            colors={activeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.filterChipActive}
          >
            <Ionicons name={icon} size={14} color={palette.white} />
            <Text style={styles.filterChipTextActive}>{label}</Text>
            {count !== undefined && (
              <View style={styles.filterCountActive}>
                <Text style={styles.filterCountTextActive}>{count}</Text>
              </View>
            )}
          </LinearGradient>
        ) : (
          <View style={styles.filterChip}>
            <Ionicons name={icon} size={14} color={palette.ink[400]} />
            <Text style={styles.filterChipText}>{label}</Text>
            {count !== undefined && (
              <View style={styles.filterCount}>
                <Text style={styles.filterCountText}>{count}</Text>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// Premium empty state with illustration
function EmptyState({ filter }: { filter: FilterType }) {
  const router = useRouter();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const messages = {
    all: {
      title: 'No calls yet',
      subtitle: 'Your call history will appear here after\nyour first translated call.',
      showAction: true,
      icon: 'language-outline' as const,
    },
    completed: {
      title: 'No completed calls',
      subtitle: 'Completed calls will be shown here.',
      showAction: false,
      icon: 'checkmark-circle-outline' as const,
    },
    missed: {
      title: 'No missed calls',
      subtitle: "You haven't missed any calls.",
      showAction: false,
      icon: 'call-outline' as const,
    },
  };

  const { title, subtitle, showAction, icon } = messages[filter];

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyCard}>
        {/* Decorative circles */}
        <View style={styles.emptyDecor1} />
        <View style={styles.emptyDecor2} />

        <Animated.View
          style={[styles.emptyIconWrapper, { transform: [{ scale: pulseAnim }] }]}
        >
          <LinearGradient
            colors={[palette.azure[50], palette.azure[100]]}
            style={styles.emptyIconBg}
          >
            <View style={styles.emptyIconInner}>
              <Ionicons name={icon} size={32} color={palette.azure[500]} />
            </View>
          </LinearGradient>
        </Animated.View>

        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptySubtitle}>{subtitle}</Text>

        {showAction && (
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/call/new')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[palette.azure[500], palette.azure[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyButtonGradient}
            >
              <Ionicons name="add" size={18} color={palette.white} />
              <Text style={styles.emptyButtonText}>Start a Call</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function CallsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');

  const {
    calls,
    isLoadingCalls,
    isFetchingMore,
    hasMoreCalls,
    fetchMoreCalls,
    refetchCalls,
  } = useCalls();

  const filteredCalls = calls.filter((call) => {
    if (filter === 'all') return true;
    return call.status === filter;
  });

  // Count calls by status
  const completedCount = calls.filter((c) => c.status === 'completed').length;
  const missedCount = calls.filter((c) => c.status === 'missed').length;

  const filterConfig = [
    {
      key: 'all' as FilterType,
      label: 'All',
      icon: 'list' as const,
      count: calls.length,
      gradient: [palette.azure[500], palette.iris[500]] as const,
    },
    {
      key: 'completed' as FilterType,
      label: 'Completed',
      icon: 'checkmark-circle' as const,
      count: completedCount,
      gradient: [palette.jade[500], palette.jade[600]] as const,
    },
    {
      key: 'missed' as FilterType,
      label: 'Missed',
      icon: 'call' as const,
      count: missedCount,
      gradient: [palette.honey[500], palette.honey[600]] as const,
    },
  ];

  if (isLoadingCalls && calls.length === 0) {
    return <LoadingSpinner fullScreen message="Loading call history..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Call History</Text>
              <View style={styles.titleBadge}>
                <Text style={styles.titleBadgeText}>{calls.length}</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>All your translated conversations</Text>
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={() => {}}>
            <Ionicons name="search" size={20} color={palette.ink[600]} />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          {filterConfig.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              count={f.count}
              icon={f.icon}
              isActive={filter === f.key}
              onPress={() => setFilter(f.key)}
              activeGradient={f.gradient}
            />
          ))}
        </View>
      </View>

      {/* Call List */}
      <FlatList
        data={filteredCalls}
        keyExtractor={(item) => item.id ?? item._id}
        renderItem={({ item }) => (
          <CallCard
            call={item}
            variant="full"
            showActions
            onPress={() => router.push(`/call/history/${item.id ?? item._id}`)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState filter={filter} />}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingCalls}
            onRefresh={refetchCalls}
            tintColor={palette.azure[500]}
          />
        }
        onEndReached={() => {
          if (hasMoreCalls && !isFetchingMore) {
            fetchMoreCalls();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingMore ? (
            <View style={styles.loadingMore}>
              <LoadingSpinner size="small" />
            </View>
          ) : (
            <View style={{ height: 120 }} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.ink[50],
  },

  // Header
  header: {
    backgroundColor: palette.white,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.ink[100],
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.ink[900],
    letterSpacing: -0.8,
  },
  titleBadge: {
    backgroundColor: palette.azure[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  titleBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.azure[600],
  },
  subtitle: {
    fontSize: 14,
    color: palette.ink[400],
    fontWeight: '500',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: palette.ink[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  // Filters
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: palette.ink[100],
    gap: 6,
  },
  filterChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    gap: 6,
    shadowColor: palette.azure[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.ink[500],
  },
  filterChipTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.white,
  },
  filterCount: {
    backgroundColor: palette.ink[200],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 22,
    alignItems: 'center',
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 22,
    alignItems: 'center',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.ink[500],
  },
  filterCountTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.white,
  },

  // List
  listContent: {
    padding: 20,
  },

  // Empty State
  emptyContainer: {
    paddingTop: 20,
  },
  emptyCard: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: 48,
    alignItems: 'center',
    shadowColor: palette.ink[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  emptyDecor1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: palette.azure[50],
  },
  emptyDecor2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.iris[50],
  },
  emptyIconWrapper: {
    marginBottom: 24,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconInner: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.azure[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.ink[900],
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    color: palette.ink[400],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: palette.azure[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.white,
  },

  // Loading
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
