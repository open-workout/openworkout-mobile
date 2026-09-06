import { View, Text, ScrollView } from "react-native";
import RecentWorkoutCard from "./RecentWorkoutCard";

const recentWorkouts = [
  {
    type: "Heavy Leg Day",
    date: "Yesterday, 5:30 PM",
    prs: 3,
    time: "1h 12m",
    volume: "8,450 kg",
    sets: 24,
    exercises: "Squat, Leg Press, RDLs + 3 more...",
  },
  {
    type: "Cardio & Core",
    date: "Mon, Oct 12",
    time: "45m",
    distance: "5.2 km",
    avgHr: "142 bpm",
  },
];

export default function RecentActivity() {
  return (
    <View className="mt-2 flex-1 mx-2.5">
      <View className="flex-row justify-between items-center mx-2.5 mb-2.5">
        <Text className="text-white text-[18px] font-bold">Recent Activity</Text>
        <Text className="text-zinc-400 text-[15px] font-medium">View History</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {recentWorkouts.map((workout, idx) => (
          <RecentWorkoutCard key={idx} {...workout} />
        ))}
      </ScrollView>
    </View>
  );
}
