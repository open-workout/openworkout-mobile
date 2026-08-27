import { type ReactNode, useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const SWIPE_DISTANCE_RATIO_THRESHOLD = 0.25;
const SWIPE_VELOCITY_THRESHOLD = 800;
const SNAP_DURATION = 240;
const OVERSCROLL_RESISTANCE = 0.35;

type Props = {
  pages: ReactNode[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
};

// A real interactive pager: dragging moves the whole row of pages with the
// finger (both the current and the adjacent page are visible mid-drag),
// and it settles on whichever page is closest — by distance or by flick
// velocity — when released. `activeIndex` is externally controllable too
// (e.g. a tab bar tap), which animates the same way a completed swipe would.
export function SwipeableTabPager({ pages, activeIndex, onIndexChange }: Props) {
  const pageWidth = Dimensions.get('window').width;
  const translateX = useSharedValue(-activeIndex * pageWidth);
  const settledIndex = useSharedValue(activeIndex);

  useEffect(() => {
    if (activeIndex !== settledIndex.value) {
      settledIndex.value = activeIndex;
      translateX.value = withTiming(-activeIndex * pageWidth, { duration: SNAP_DURATION });
    }
  }, [activeIndex, pageWidth, settledIndex, translateX]);

  const gesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      const base = -settledIndex.value * pageWidth;
      let next = base + e.translationX;
      const min = -(pages.length - 1) * pageWidth;
      const max = 0;
      if (next > max) next = max + (next - max) * OVERSCROLL_RESISTANCE;
      if (next < min) next = min + (next - min) * OVERSCROLL_RESISTANCE;
      translateX.value = next;
    })
    .onEnd((e) => {
      const current = settledIndex.value;
      let target = current;
      const distanceRatio = e.translationX / pageWidth;
      if (
        (distanceRatio < -SWIPE_DISTANCE_RATIO_THRESHOLD || e.velocityX < -SWIPE_VELOCITY_THRESHOLD) &&
        current < pages.length - 1
      ) {
        target = current + 1;
      } else if (
        (distanceRatio > SWIPE_DISTANCE_RATIO_THRESHOLD || e.velocityX > SWIPE_VELOCITY_THRESHOLD) &&
        current > 0
      ) {
        target = current - 1;
      }
      settledIndex.value = target;
      translateX.value = withTiming(-target * pageWidth, { duration: SNAP_DURATION });
      if (target !== current) {
        runOnJS(onIndexChange)(target);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ flexDirection: 'row', flex: 1, width: pageWidth * pages.length }, rowStyle]}>
          {pages.map((page, i) => (
            <View key={i} style={{ width: pageWidth, flex: 1 }}>
              {page}
            </View>
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
