import { Modal, TouchableOpacity, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { EXERCISE_ANIMATIONS } from '../constants/exerciseMedia.generated';

export function hasExerciseAnimation(csvId: string | null): boolean {
  return !!csvId && !!EXERCISE_ANIMATIONS[csvId];
}

type Props = {
  csvId: string | null;
  onClose: () => void;
};

// Full-screen exercise animation viewer, opened by tapping a thumbnail.
export function ExerciseAnimationModal({ csvId, onClose }: Props) {
  const source = csvId ? EXERCISE_ANIMATIONS[csvId] : undefined;

  return (
    <Modal visible={!!source} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }}
      >
        {source && (
          <Image
            source={source}
            style={{ width: '90%', aspectRatio: 1 }}
            contentFit="contain"
          />
        )}
        <TouchableOpacity
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 56,
            right: 24,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
