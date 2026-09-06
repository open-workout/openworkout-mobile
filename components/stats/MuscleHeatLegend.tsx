import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { interpolateIntensity } from '../../lib/muscleHeatColor';
import { C } from '../../theme/colors';

const STEPS = 5;

export function MuscleHeatLegend() {
  const { t } = useTranslation('stats');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
      <Text style={{ color: C.textDim, fontSize: 12 }}>{t('legendLess')}</Text>
      <View style={{ flexDirection: 'row', borderRadius: 4, overflow: 'hidden' }}>
        {Array.from({ length: STEPS }).map((_, i) => (
          <View
            key={i}
            style={{ width: 18, height: 10, backgroundColor: interpolateIntensity(i / (STEPS - 1)) }}
          />
        ))}
      </View>
      <Text style={{ color: C.textDim, fontSize: 12 }}>{t('legendMore')}</Text>
    </View>
  );
}
