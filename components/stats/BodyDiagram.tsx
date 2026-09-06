import { View, useWindowDimensions } from 'react-native';
import Body, { type ExtendedBodyPart } from 'react-native-body-highlighter';
import { interpolateIntensity } from '../../lib/muscleHeatColor';
import { SIMPLIFIED_TO_SLUGS, SLUG_TO_SIMPLIFIED } from '../../lib/bodyHighlighterMapping';
import { SIMPLIFIED_MUSCLES, type SimplifiedMuscle } from '../../lib/muscleMapping';
import type { MuscleSetCount } from '../../db/muscleStats';
import { C } from '../../theme/colors';

type Props = {
  counts: MuscleSetCount[];
  onMusclePress: (muscle: SimplifiedMuscle) => void;
};

const NEUTRAL_FILL = interpolateIntensity(0);

// react-native-body-highlighter renders each figure at a fixed 200 * scale
// px width — it doesn't shrink to fit its container on its own. GAP and
// SCREEN_PADDING must match BodyStatsTabPage's ScrollView gap/horizontal
// padding so the two figures are sized to actually fit side by side instead
// of overflowing the screen.
const BODY_BASE_WIDTH = 200;
const GAP = 12;
const SCREEN_PADDING = 24 * 2;

export function BodyDiagram({ counts, onMusclePress }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const availablePerFigure = (windowWidth - SCREEN_PADDING - GAP) / 2;
  const scale = Math.min(1, availablePerFigure / BODY_BASE_WIDTH);

  const maxCount = Math.max(1, ...counts.map((c) => c.setCount));
  const countByMuscle = new Map<SimplifiedMuscle, number>(counts.map((c) => [c.muscle, c.setCount]));

  const data: ExtendedBodyPart[] = SIMPLIFIED_MUSCLES.flatMap((muscle) => {
    const count = countByMuscle.get(muscle) ?? 0;
    const color = interpolateIntensity(count / maxCount);
    return SIMPLIFIED_TO_SLUGS[muscle].map((slug) => ({ slug, color }));
  });

  const handlePress = (bodyPart: ExtendedBodyPart) => {
    const muscle = bodyPart.slug ? SLUG_TO_SIMPLIFIED[bodyPart.slug] : undefined;
    if (muscle) onMusclePress(muscle);
  };

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: GAP }}>
      <Body
        data={data}
        side="front"
        scale={scale}
        border={C.border}
        defaultFill={NEUTRAL_FILL}
        onBodyPartPress={handlePress}
      />
      <Body
        data={data}
        side="back"
        scale={scale}
        border={C.border}
        defaultFill={NEUTRAL_FILL}
        onBodyPartPress={handlePress}
      />
    </View>
  );
}
