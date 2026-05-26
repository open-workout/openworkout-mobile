import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabName = 'home' | 'explore' | 'stats' | 'profile';

interface BottomMenuProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
}

const tabs: { name: TabName; label: string; icon: string; iconFocused: string }[] = [
  { name: 'home', label: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'explore', label: 'Explore', icon: 'search-outline', iconFocused: 'search' },
  { name: 'stats', label: 'Stats', icon: 'bar-chart-outline', iconFocused: 'bar-chart' },
  { name: 'profile', label: 'Profile', icon: 'person-outline', iconFocused: 'person' },
];

export default function BottomMenu({ activeTab, onTabPress }: BottomMenuProps) {
  const insets = useSafeAreaInsets();

  return (
    <View 
      className="flex-row justify-around items-center bg-zinc-950 px-2 py-2 border-t border-zinc-800"
      style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            className="items-center justify-center py-2 px-4"
            onPress={() => onTabPress(tab.name)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.iconFocused as any : tab.icon as any}
              size={24}
              color={isActive ? '#fff' : '#71717a'}
            />
            <Text
              className={`text-xs mt-1 ${isActive ? 'text-white font-medium' : 'text-zinc-500'}`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}