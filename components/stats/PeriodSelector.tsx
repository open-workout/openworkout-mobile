import { View, Text, TouchableOpacity } from 'react-native';
import { periodsEqual, type StatsPeriod } from '../../lib/statsPeriod';
import { C, accent } from '../../theme/colors';

export type PeriodOption = { label: string; period: StatsPeriod };

type Props = {
  options: PeriodOption[];
  value: StatsPeriod;
  onChange: (period: StatsPeriod) => void;
};

// Data-driven pill row: adding a future "since program start" period is one
// entry in the caller's options array, no change needed here.
export function PeriodSelector({ options, value, onChange }: Props) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {options.map((opt) => {
        const isActive = periodsEqual(opt.period, value);
        return (
          <TouchableOpacity
            key={opt.label}
            onPress={() => onChange(opt.period)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: isActive ? accent.purple : C.card,
              borderWidth: 1,
              borderColor: isActive ? accent.purple : C.border,
            }}
          >
            <Text style={{ color: isActive ? '#fff' : C.textMuted, fontSize: 13, fontWeight: '600' }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
