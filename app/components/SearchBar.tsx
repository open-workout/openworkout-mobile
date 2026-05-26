import { View, TextInput } from "react-native";
import { Ionicons } from '@expo/vector-icons';

export default function SearchBar() {
  return (
    <View className="flex-row items-center bg-zinc-800 rounded-xl px-3.5 h-11 mx-5 mt-6 mb-4">
      <Ionicons name="search" size={20} color="#A1A1AA" style={{marginRight: 8}} />
      <TextInput
        className="flex-1 text-white text-[16px]"
        placeholder="Search exercises..."
        placeholderTextColor="#A1A1AA"
      />
    </View>
  );
}
