import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, accent } from '../../theme/colors';

type Props = {
  trainedDates: string[]; // 'YYYY-MM-DD'
};

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// Custom month grid with prev/next buttons — deliberately not swipeable,
// since the outer SwipeableTabPager owns horizontal pan gestures on the
// Stats tab (this component is also used from the pushed exercise-stats
// route, outside that pager, but stays button-nav for consistency/simplicity).
export function TrainedDaysCalendar({ trainedDates }: Props) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const trainedSet = useMemo(() => new Set(trainedDates), [trainedDates]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <TouchableOpacity
          onPress={() => setCursor(new Date(year, month - 1, 1))}
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={20} color={C.textMuted} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>
          {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity
          onPress={() => setCursor(new Date(year, month + 1, 1))}
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-forward" size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={i} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingBottom: 6 }}>
            <Text style={{ color: C.textDim, fontSize: 11, fontWeight: '600' }}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((day, i) => {
          if (day === null) {
            return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
          }
          const dateStr = `${year}-${pad2(month + 1)}-${pad2(day)}`;
          const trained = trainedSet.has(dateStr);
          return (
            <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: trained ? accent.purple : 'transparent',
                }}
              >
                <Text style={{ color: trained ? '#fff' : C.textDim, fontSize: 12, fontWeight: trained ? '700' : '400' }}>
                  {day}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
