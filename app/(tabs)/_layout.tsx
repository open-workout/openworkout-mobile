import { Slot } from 'expo-router';

// The "(tabs)" group now backs a single route (home.tsx), which owns the
// whole tab bar + swipeable pager itself — there's no navigator to
// configure here, just pass the route through.
export default function TabsLayout() {
  return <Slot />;
}
