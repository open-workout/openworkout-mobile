import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';

// This tab has no content of its own — the tab bar intercepts its press
// (see listeners.tabPress in _layout.tsx) and routes straight into the
// start-workout flow without ever navigating here. This screen only exists
// to satisfy the router's file-based route requirement; it should not
// normally be visible.
export default function StartTabScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
      <View>
        <ActivityIndicator color={C.textMuted} />
      </View>
    </SafeAreaView>
  );
}
