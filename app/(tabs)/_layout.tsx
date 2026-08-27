import { Tabs, useRouter, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { TouchableOpacity, GestureResponderEvent } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { C, accent } from '../theme/colors';
import { getAllWorkouts } from '../db/workouts';

const TAB_BAR_CONTENT_HEIGHT = 56;
const START_BUTTON_SIZE = 58;

function StartTabButton(props: { onPress?: (e: GestureResponderEvent) => void; accessibilityState?: { selected?: boolean }; hasActiveWorkout: boolean }) {
  return (
    <TouchableOpacity
      onPress={props.onPress}
      activeOpacity={0.85}
      style={{
        top: -18,
        alignSelf: 'center',
        width: START_BUTTON_SIZE,
        height: START_BUTTON_SIZE,
        borderRadius: START_BUTTON_SIZE / 2,
        backgroundColor: accent.green,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: accent.green,
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
        borderWidth: 4,
        borderColor: C.bg,
      }}
    >
      {props.hasActiveWorkout
        ? <Ionicons name="refresh" size={26} color="#052e1c" />
        : <MaterialCommunityIcons name="dumbbell" size={26} color="#052e1c" />}
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);
  const { t } = useTranslation('navigation');
  const router = useRouter();
  const navigation = useNavigation();
  const [hasActiveWorkout, setHasActiveWorkout] = useState(false);

  const refreshActiveWorkout = useCallback(() => {
    getAllWorkouts().then((workouts) => {
      setHasActiveWorkout(workouts.some((w) => !w.finished_at));
    });
  }, []);

  // Keep the Start button's icon in sync with whether a workout is in
  // progress. `navigation` here is the root Stack's navigation object (this
  // layout is that stack's "(tabs)" screen), so its 'state' event fires
  // whenever pick-day/generated-workout are pushed or popped — exactly the
  // moments an in-progress workout can appear or disappear.
  useEffect(() => {
    refreshActiveWorkout();
    return navigation.addListener('state', refreshActiveWorkout);
  }, [navigation, refreshActiveWorkout]);

  // The Start tab has no screen of its own to navigate to — tapping it
  // immediately routes into the start-workout flow (resume, or pick-day).
  // This is handled as a tabPress interception rather than a redirect on
  // the "start" screen's focus effect, because a focus-effect redirect
  // would immediately re-fire and re-push pick-day the moment the user hit
  // back from it, making back navigation look broken.
  const handleStartPress = async () => {
    const workouts = await getAllWorkouts();
    const active = workouts.find((w) => !w.finished_at);
    if (active) {
      router.push(`/generated-workout?workoutId=${active.id}`);
    } else {
      router.push('/pick-day');
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: bottomInset,
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
        },
        tabBarActiveTintColor: C.text,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('home'),
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: t('plan'),
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="start"
        options={{
          title: '',
          tabBarLabelStyle: { height: 0 },
          tabBarIcon: () => null,
          tabBarButton: (props) => <StartTabButton {...props} hasActiveWorkout={hasActiveWorkout} />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handleStartPress();
          },
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('stats'),
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: t('exercises'),
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Ionicons name={focused ? 'list' : 'list-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
