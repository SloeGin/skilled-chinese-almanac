import type { SkillResolution } from './skills';

const SKILL_PREFIX = 'skill=';

export function encodeSkillResolution(resolution: SkillResolution): string {
  const json = JSON.stringify(resolution);
  return encodeURIComponent(json);
}

export function decodeSkillResolution(value: string): SkillResolution | null {
  try {
    return JSON.parse(decodeURIComponent(value)) as SkillResolution;
  } catch {
    return null;
  }
}

export function extractSkillFromHashParts(parts: string[]): SkillResolution | null {
  for (const part of parts) {
    if (part.startsWith(SKILL_PREFIX)) {
      const encoded = part.slice(SKILL_PREFIX.length);
      return decodeSkillResolution(encoded);
    }
  }
  return null;
}

export function buildHashValue(dateKey: string, resolution: SkillResolution | null) {
  const parts = [dateKey];
  if (resolution) {
    parts.push(`${SKILL_PREFIX}${encodeSkillResolution(resolution)}`);
  }
  return `#${parts.join('|')}`;
}
