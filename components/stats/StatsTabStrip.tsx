import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { C, accent } from '../../theme/colors';

export type StatsSubTab = 'exercise' | 'body';

type Props = {
  active: StatsSubTab;
  onChange: (tab: StatsSubTab) => void;
};

// Tap-only segmented control — deliberately not swipeable, since the outer
// SwipeableTabPager already owns a full-width horizontal pan gesture across
// the whole Stats tab page.
export function StatsTabStrip({ active, onChange }: Props) {
  const { t } = useTranslation('stats');
  const tabs: { key: StatsSubTab; label: string }[] = [
    { key: 'exercise', label: t('exerciseTab') },
    { key: 'body', label: t('bodyTab') },
  ];

  return (
    <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, padding: 4, gap: 4 }}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 9,
              alignItems: 'center',
              backgroundColor: isActive ? accent.purple : 'transparent',
            }}
          >
            <Text style={{ color: isActive ? '#fff' : C.textMuted, fontSize: 14, fontWeight: '700' }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
