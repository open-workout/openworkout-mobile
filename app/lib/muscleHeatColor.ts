import { C, accent } from '../theme/colors';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function toHex(n: number): string {
  return Math.round(n).toString(16).padStart(2, '0');
}

const NEUTRAL = hexToRgb(C.border);
const HOT = hexToRgb(accent.purple);
const FLOOR = 0.12; // even a zero-count muscle stays visibly body-shaped, not invisible

// t in [0, 1] -> hex color interpolated from a neutral base to the full
// accent color, with a floor so untrained muscles are still visible.
export function interpolateIntensity(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const eased = FLOOR + clamped * (1 - FLOOR);
  const r = NEUTRAL[0] + (HOT[0] - NEUTRAL[0]) * eased;
  const g = NEUTRAL[1] + (HOT[1] - NEUTRAL[1]) * eased;
  const b = NEUTRAL[2] + (HOT[2] - NEUTRAL[2]) * eased;
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
