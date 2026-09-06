import { PRESET_SPLITS } from '../constants/splits';

type TFn = (key: string, options?: Record<string, unknown>) => string;

export function getPresetName(id: string, t: TFn): string {
  return t(`presetNames.${id}`, { defaultValue: id });
}

export function getPresetDescription(id: string, t: TFn): string {
  return t(`presetDescriptions.${id}`, { defaultValue: '' });
}

export function getDayNameLabel(name: string, t: TFn): string {
  return t(`dayNames.${name}`, { defaultValue: name });
}

export function getSplitDisplayName(name: string, t: TFn): string {
  if (name === 'Custom') return t('custom');
  const preset = PRESET_SPLITS.find((p) => p.name === name);
  if (preset) return getPresetName(preset.id, t);
  return name;
}
