import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function StartWorkoutCard() {
  return (
    <TouchableOpacity activeOpacity={0.85} className="mx-5 mb-7">
      <LinearGradient
        colors={['#d4d4d8', '#a1a1aa', '#71717a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#a1a1aa' }}
      >
        <LinearGradient
          colors={['#ffffff', '#e4e4e7', '#d4d4d8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: '#d4d4d8' }}
        >
          <Ionicons name="play" size={28} color="#71717a" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text className="text-zinc-700 text-[17px] font-bold mb-0.5">Start Empty Workout</Text>
          <Text className="text-zinc-500 text-[14px]">Track a new session</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#71717a" />
      </LinearGradient>
    </TouchableOpacity>
  );
}