import { View, Text, Image } from "react-native";

export default function DashboardHeader() {
  return (
    <View className="pt-8 px-5 bg-zinc-950">
      <View className="flex-row justify-between items-center">
        <View>
          <Text className="text-zinc-400 text-[15px] mb-0.5">Thursday, Oct 15</Text>
          <Text className="text-white text-[22px] font-bold">Ready to lift, Marcus?</Text>
        </View>
        <View className="relative">
          <Image
            source={{ uri: "https://i.pravatar.cc/100" }}
            className="w-11 h-11 rounded-full border-2 border-zinc-800"
          />
          <View className="absolute right-0.5 bottom-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-zinc-950" />
        </View>
      </View>
    </View>
  );
}
