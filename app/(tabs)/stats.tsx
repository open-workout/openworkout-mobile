import { View, Text, StatusBar } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { C, accent } from '../theme/colors';

export default function StatsScreen() {
  const { t } = useTranslation('navigation');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: C.card }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', letterSpacing: -0.3 }}>{t('stats')}</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.card, borderWidth: 1, borderColor: accent.purple, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="bar-chart-outline" size={24} color={accent.purple} />
        </View>
        <Text style={{ color: C.textDim, fontSize: 16, fontWeight: '500' }}>{t('common:statsComingSoon')}</Text>
      </View>
    </SafeAreaView>
  );
}
