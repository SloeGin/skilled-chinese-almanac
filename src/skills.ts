import type { AlmanacEntry } from './data/yiEntries';
import { yiEntries } from './data/yiEntries';
import { jiEntries } from './data/jiEntries';
import type { GuidanceSet, Language } from './types';

export type Skill = {
  id: string;
  badge: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
};

export const SKILLS_TO_DRAW = 3;

export const skillsLibrary: Skill[] = [
  {
    id: 'invert-all',
    badge: '倒',
    name: '倒转天罡',
    nameEn: 'Heavenflip',
    description: '翻转所有的宜和忌。',
    descriptionEn: 'Flip every auspicious and avoid item to the opposite list.',
  },
  {
    id: 'all-to-ji',
    badge: '忌',
    name: '诸事不宜',
    nameEn: 'Avoid Everything',
    description: '把所有的宜统统移到忌里。',
    descriptionEn: 'Push the entire auspicious list into Avoid.',
  },
  {
    id: 'all-to-yi',
    badge: '顺',
    name: '万事顺遂',
    nameEn: 'Everything Flows',
    description: '把所有的忌全部搬去宜。',
    descriptionEn: 'Move every avoid entry onto the Auspicious list.',
  },
  {
    id: 'reroll-one',
    badge: '改',
    name: '逆天改命',
    nameEn: 'Rewrite Fate',
    description: '选一个宜或忌，从三个新词条里挑一个替换。',
    descriptionEn: 'Pick a single entry and replace it with one of three fresh choices.',
  },
  {
    id: 'remove-one',
    badge: '飞',
    name: '飞沙走石',
    nameEn: 'Scattering Gale',
    description: '指定一个宜或忌，将它扔进什刹海。',
    descriptionEn: 'Target any entry and wipe it out.',
  },
  {
    id: 'wipe-all',
    badge: '拔',
    name: '力拔山兮',
    nameEn: 'Mountain Lift',
    description: '清空所有宜与忌，只留下“顺其自然”。',
    descriptionEn: 'Delete every entry, leaving only “Go with the flow.”',
  },
  {
    id: 'swap-side',
    badge: '运',
    name: '运筹帷幄',
    nameEn: 'Grand Strategist',
    description: '自选一个词条，把它挪到对侧阵营。',
    descriptionEn: 'Choose any entry and move it across to the other list.',
  },
  {
    id: 'all-in',
    badge: '孤',
    name: '孤注一掷',
    nameEn: 'All or Nothing',
    description: '只保留一个词条，其余全部舍弃。',
    descriptionEn: 'Keep a single chosen entry and discard the rest.',
  },
  {
    id: 'destroy-four',
    badge: '逸',
    name: '以逸待劳',
    nameEn: 'Patient Gambit',
    description: '随机销毁总计四个词条，无论宜或忌。',
    descriptionEn: 'Randomly destroy four total entries from either side.',
  },
];

export type EntryListType = 'yi' | 'ji';

export interface EntryReference {
  list: EntryListType;
  index: number;
}

export type SkillResolution =
  | { id: 'invert-all' }
  | { id: 'all-to-ji' }
  | { id: 'all-to-yi' }
  | { id: 'reroll-one'; list: EntryListType; targetIndex: number; replacementIndex: number }
  | { id: 'remove-one'; list: EntryListType; targetIndex: number }
  | { id: 'wipe-all' }
  | { id: 'swap-side'; list: EntryListType; targetIndex: number }
  | { id: 'all-in'; list: EntryListType; targetIndex: number }
  | { id: 'destroy-four'; removed: EntryReference[] };

const flowEntry =
  yiEntries.find((entry) => entry.title === '顺其自然') ?? {
    index: 9_999_001,
    title: '顺其自然',
    titleEn: 'Go with the flow',
  };

export function drawRandomSkills(
  pool: Skill[],
  count: number,
  randomizer: () => number = Math.random
) {
  const working = [...pool];
  const selections: Skill[] = [];
  for (let i = 0; i < count && working.length > 0; i += 1) {
    const idx = Math.floor(randomizer() * working.length);
    selections.push(working.splice(idx, 1)[0]);
  }
  return selections;
}

export function getSkillTitle(skill: Skill, language: Language) {
  return language === 'zh' ? skill.name : skill.nameEn;
}

export function getSkillDescription(skill: Skill, language: Language) {
  return language === 'zh' ? skill.description : skill.descriptionEn;
}

export function applySkillResolution(base: GuidanceSet, resolution: SkillResolution): GuidanceSet {
  switch (resolution.id) {
    case 'invert-all':
      return { yi: [...base.ji], ji: [...base.yi] };
    case 'all-to-ji':
      return { yi: [], ji: [...base.ji, ...base.yi] };
    case 'all-to-yi':
      return { yi: [...base.yi, ...base.ji], ji: [] };
    case 'remove-one':
      return removeByIndex(base, resolution.list, resolution.targetIndex);
    case 'swap-side':
      return moveAcross(base, resolution.list, resolution.targetIndex);
    case 'all-in':
      return keepOnly(base, resolution.list, resolution.targetIndex);
    case 'reroll-one':
      return rerollEntry(base, resolution.list, resolution.targetIndex, resolution.replacementIndex);
    case 'destroy-four':
      return removeReferences(base, resolution.removed);
    case 'wipe-all':
      return { yi: [flowEntry], ji: [] };
    default:
      return base;
  }
}

function removeByIndex(base: GuidanceSet, list: EntryListType, targetIndex: number): GuidanceSet {
  if (list === 'yi') {
    return {
      yi: base.yi.filter((entry) => entry.index !== targetIndex),
      ji: [...base.ji],
    };
  }
  return {
    yi: [...base.yi],
    ji: base.ji.filter((entry) => entry.index !== targetIndex),
  };
}

function moveAcross(base: GuidanceSet, list: EntryListType, targetIndex: number): GuidanceSet {
  if (list === 'yi') {
    const entry = base.yi.find((item) => item.index === targetIndex);
    if (!entry) return base;
    return {
      yi: base.yi.filter((item) => item.index !== targetIndex),
      ji: [...base.ji, entry],
    };
  }
  const entry = base.ji.find((item) => item.index === targetIndex);
  if (!entry) return base;
  return {
    yi: [...base.yi, entry],
    ji: base.ji.filter((item) => item.index !== targetIndex),
  };
}

function keepOnly(base: GuidanceSet, list: EntryListType, targetIndex: number): GuidanceSet {
  if (list === 'yi') {
    const entry = base.yi.find((item) => item.index === targetIndex);
    if (!entry) return base;
    return {
      yi: [entry],
      ji: [],
    };
  }
  const entry = base.ji.find((item) => item.index === targetIndex);
  if (!entry) return base;
  return {
    yi: [],
    ji: [entry],
  };
}

function rerollEntry(
  base: GuidanceSet,
  list: EntryListType,
  targetIndex: number,
  replacementIndex: number
): GuidanceSet {
  const pool = list === 'yi' ? yiEntries : jiEntries;
  const replacement = pool.find((entry) => entry.index === replacementIndex);
  if (!replacement) {
    return base;
  }
  if (list === 'yi') {
    return {
      yi: base.yi.map((entry) => (entry.index === targetIndex ? replacement : entry)),
      ji: [...base.ji],
    };
  }
  return {
    yi: [...base.yi],
    ji: base.ji.map((entry) => (entry.index === targetIndex ? replacement : entry)),
  };
}

function removeReferences(base: GuidanceSet, refs: EntryReference[]): GuidanceSet {
  const yiDelete = new Set(
    refs.filter((item) => item.list === 'yi').map((item) => item.index)
  );
  const jiDelete = new Set(
    refs.filter((item) => item.list === 'ji').map((item) => item.index)
  );
  return {
    yi: base.yi.filter((entry) => !yiDelete.has(entry.index)),
    ji: base.ji.filter((entry) => !jiDelete.has(entry.index)),
  };
}
