import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { C, accent } from '../theme/colors';

// Tall enough to comfortably fit a label under the Start button's raised,
// floating circle (which pokes -18px above the bar) without relying on
// content overflowing its box — the circle's own bottom edge sits at
// (START_BUTTON_SIZE - 18) from the bar's content top, and the label needs
// real room below that.
const TAB_BAR_CONTENT_HEIGHT = 70;
const START_BUTTON_SIZE = 58;

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const LEFT_ITEMS: { key: string; icon: IoniconName; iconOutline: IoniconName; index: number }[] = [
  { key: 'home', icon: 'home', iconOutline: 'home-outline', index: 0 },
  { key: 'plan', icon: 'calendar', iconOutline: 'calendar-outline', index: 1 },
];

const RIGHT_ITEMS: { key: string; icon: IoniconName; iconOutline: IoniconName; index: number }[] = [
  { key: 'stats', icon: 'bar-chart', iconOutline: 'bar-chart-outline', index: 2 },
  { key: 'exercises', icon: 'list', iconOutline: 'list-outline', index: 3 },
];

type Props = {
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  hasActiveWorkout: boolean;
  onStartPress: () => void;
};

export function TabBar({ activeIndex, onSelectIndex, hasActiveWorkout, onStartPress }: Props) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);
  const { t } = useTranslation('navigation');

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: C.bg,
        borderTopColor: C.border,
        borderTopWidth: 1,
        paddingTop: 8,
        paddingBottom: bottomInset,
        height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
      }}
    >
      {LEFT_ITEMS.map((item) => (
        <TabBarButton
          key={item.key}
          label={t(item.key)}
          icon={activeIndex === item.index ? item.icon : item.iconOutline}
          active={activeIndex === item.index}
          onPress={() => onSelectIndex(item.index)}
        />
      ))}

      <View style={{ flex: 1, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={onStartPress}
          activeOpacity={0.85}
          style={{
            position: 'absolute',
            top: -18,
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
          {hasActiveWorkout
            ? <Ionicons name="refresh" size={26} color="#052e1c" />
            : <MaterialCommunityIcons name="dumbbell" size={26} color="#052e1c" />}
        </TouchableOpacity>
        <Text style={{ marginTop: START_BUTTON_SIZE - 18 + 4, fontSize: 10, fontWeight: '600', letterSpacing: 0.3, color: C.textMuted }}>
          {hasActiveWorkout ? t('resume') : t('start')}
        </Text>
      </View>

      {RIGHT_ITEMS.map((item) => (
        <TabBarButton
          key={item.key}
          label={t(item.key)}
          icon={activeIndex === item.index ? item.icon : item.iconOutline}
          active={activeIndex === item.index}
          onPress={() => onSelectIndex(item.index)}
        />
      ))}
    </View>
  );
}

function TabBarButton({ label, icon, active, onPress }: { label: string; icon: IoniconName; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <Ionicons name={icon} size={24} color={active ? C.text : C.textMuted} />
      <Text style={{ fontSize: 10, fontWeight: '600', letterSpacing: 0.3, color: active ? C.text : C.textMuted }}>{label}</Text>
    </TouchableOpacity>
  );
}
