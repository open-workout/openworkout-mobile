import { View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EXERCISE_THUMBNAILS } from '../constants/exerciseMedia.generated';

type Props = {
  csvId: string | null;
  size?: number;
  onPress?: () => void;
};

// Exercise thumbnail with a dumbbell-icon fallback for custom exercises or
// any csvId missing from the (gitignored, locally-supplied) media set.
export function ExerciseThumbnail({ csvId, size = 64, onPress }: Props) {
  const source = csvId ? EXERCISE_THUMBNAILS[csvId] : undefined;

  const content = source ? (
    <Image
      source={source}
      style={{ width: size, height: size, borderRadius: 12, backgroundColor: '#27272a' }}
      contentFit="cover"
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        backgroundColor: '#27272a',
        borderWidth: 1,
        borderColor: '#3f3f46',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name="dumbbell" size={size * 0.375} color="#a1a1aa" />
    </View>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      {content}
    </TouchableOpacity>
  );
}
