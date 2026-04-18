const PRESET_USAGE_STORAGE_KEY = 'grain:preset-usage-v1';

export type PresetUsageMap = Record<string, number>;

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function sanitizeUsage(input: unknown): PresetUsageMap {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const map: PresetUsageMap = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof key !== 'string') {
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      continue;
    }
    map[key] = Math.floor(value);
  }
  return map;
}

export function getPresetUsageSnapshot(): PresetUsageMap {
  if (!isClient()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(PRESET_USAGE_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return sanitizeUsage(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function trackPresetUsage(presetId: string): void {
  if (!isClient() || !presetId) {
    return;
  }

  try {
    const current = getPresetUsageSnapshot();
    current[presetId] = (current[presetId] ?? 0) + 1;
    window.localStorage.setItem(PRESET_USAGE_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage failures.
  }
}
