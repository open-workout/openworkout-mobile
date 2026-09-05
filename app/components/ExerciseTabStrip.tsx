import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, accent } from '../theme/colors';

type TabCard = { cardId: string; hasSets: boolean; linkedToNext: boolean };

// Horizontal numbered tab strip (1, 2, 3…) for switching between exercises
// during an active workout, with a trailing "+" to add another one. Cards
// linked into a superset are drawn with a connector between them and are
// all highlighted together whenever any one of them is the active group.
export function ExerciseTabStrip({ cards, activeGroupCardIds, onSelect, onAdd }: {
  cards: TabCard[];
  activeGroupCardIds: Set<string>;
  onSelect: (cardId: string) => void;
  onAdd: () => void;
}) {
  return (
    <View style={{ backgroundColor: '#0c0c0e', borderBottomWidth: 1, borderBottomColor: C.border }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' }}
      >
        {cards.map((card, index) => {
          const active = activeGroupCardIds.has(card.cardId);
          return (
            <View key={card.cardId} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => onSelect(card.cardId)}
                activeOpacity={0.8}
                style={{ alignItems: 'center' }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? accent.green : C.card,
                    borderWidth: 1,
                    borderColor: active ? accent.green : C.border,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: active ? '#052e1c' : C.textMuted }}>
                    {index + 1}
                  </Text>
                </View>
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    marginTop: 4,
                    backgroundColor: card.hasSets ? accent.green : 'transparent',
                  }}
                />
              </TouchableOpacity>
              {card.linkedToNext ? (
                <View style={{ width: 14, height: 2, borderRadius: 1, marginHorizontal: 2, backgroundColor: active ? accent.green : C.borderAlt }} />
              ) : (
                <View style={{ width: 10 }} />
              )}
            </View>
          );
        })}

        <TouchableOpacity
          onPress={onAdd}
          activeOpacity={0.8}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: C.borderAlt,
            borderStyle: 'dashed',
          }}
        >
          <Ionicons name="add" size={18} color={C.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
