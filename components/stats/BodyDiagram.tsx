import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FRONT_PATHS } from './bodyPaths/front';
import { BACK_PATHS } from './bodyPaths/back';
import { BODY_OUTLINE_PATHS, BODY_VIEWBOX } from './bodyPaths/outline';
import { interpolateIntensity } from '../../lib/muscleHeatColor';
import type { SimplifiedMuscle } from '../../lib/muscleMapping';
import type { MuscleSetCount } from '../../db/muscleStats';
import { C } from '../../theme/colors';

type Props = {
  view: 'front' | 'back';
  counts: MuscleSetCount[];
  onMusclePress: (muscle: SimplifiedMuscle) => void;
};

// Stylized, hand-authored SVG silhouette — no source asset exists for this.
// Front and back share the same non-interactive outline (bodyPaths/outline.ts)
// with a different set of tappable muscle regions layered on top per view
// (bodyPaths/front.ts / back.ts). Shoulders/forearms/calves/neck appear on
// both views as separate path shapes but the same muscle key, so tapping
// either updates the same underlying data.
export function BodyDiagram({ view, counts, onMusclePress }: Props) {
  const paths = view === 'front' ? FRONT_PATHS : BACK_PATHS;
  const maxCount = Math.max(1, ...counts.map((c) => c.setCount));
  const countByMuscle = new Map<SimplifiedMuscle, number>(counts.map((c) => [c.muscle, c.setCount]));

  const colorFor = (muscle: SimplifiedMuscle) => {
    const count = countByMuscle.get(muscle) ?? 0;
    return interpolateIntensity(count / maxCount);
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg viewBox={BODY_VIEWBOX} width="72%" height={360} preserveAspectRatio="xMidYMid meet">
        {BODY_OUTLINE_PATHS.map((d, i) => (
          <Path key={`outline-${i}`} d={d} fill={C.card} stroke={C.border} strokeWidth={2} />
        ))}
        {paths.map(({ muscle, d }, i) => (
          <Path
            key={`${muscle}-${i}`}
            d={d}
            fill={colorFor(muscle)}
            stroke={C.bg}
            strokeWidth={1.5}
            onPress={() => onMusclePress(muscle)}
          />
        ))}
      </Svg>
    </View>
  );
}
