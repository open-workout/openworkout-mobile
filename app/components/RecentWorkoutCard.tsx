import { View, Text } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function RecentWorkoutCard(props: any) {
  if (props.type === "Heavy Leg Day") {
    return (
      <View className="bg-zinc-900 rounded-2xl p-4 mx-2.5 mb-4 border border-zinc-800 shadow">
        <View className="flex-row items-center mb-0.5">
          <MaterialCommunityIcons name="dumbbell" size={22} color="#A1A1AA" style={{marginRight: 8}} />
          <Text className="text-white text-[16px] font-bold flex-1">{props.type}</Text>
          <View className="bg-zinc-800 rounded px-2 py-0.5 ml-2">
            <Text className="text-white text-xs font-bold">{props.prs} PRs</Text>
          </View>
        </View>
        <Text className="text-zinc-400 text-[13px] mb-2">{props.date}</Text>
        <View className="flex-row justify-between mb-2">
          <View className="items-center flex-1">
            <Text className="text-zinc-400 text-[13px] mb-0.5">Time</Text>
            <Text className="text-white text-[15px] font-bold">{props.time}</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-zinc-400 text-[13px] mb-0.5">Volume</Text>
            <Text className="text-white text-[15px] font-bold">{props.volume}</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-zinc-400 text-[13px] mb-0.5">Sets</Text>
            <Text className="text-white text-[15px] font-bold">{props.sets}</Text>
          </View>
        </View>
        <Text className="text-zinc-400 text-[13px] mt-0.5">{props.exercises}</Text>
      </View>
    );
  }
  // Cardio & Core
  return (
    <View className="bg-zinc-900 rounded-2xl p-4 mx-2.5 mb-4 border border-zinc-800 shadow">
      <View className="flex-row items-center mb-0.5">
        <MaterialCommunityIcons name="run" size={22} color="#A1A1AA" style={{marginRight: 8}} />
        <Text className="text-white text-[16px] font-bold flex-1">{props.type}</Text>
      </View>
      <Text className="text-zinc-400 text-[13px] mb-2">{props.date}</Text>
      <View className="flex-row justify-between mb-2">
        <View className="items-center flex-1">
          <Text className="text-zinc-400 text-[13px] mb-0.5">Time</Text>
          <Text className="text-white text-[15px] font-bold">{props.time}</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-zinc-400 text-[13px] mb-0.5">Distance</Text>
          <Text className="text-white text-[15px] font-bold">{props.distance}</Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-zinc-400 text-[13px] mb-0.5">Avg HR</Text>
          <Text className="text-white text-[15px] font-bold">{props.avgHr}</Text>
        </View>
      </View>
    </View>
  );
}
