import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import type { AlmanacEntry } from './data/yiEntries';
import { yiEntries } from './data/yiEntries';
import { jiEntries } from './data/jiEntries';
import { commonEntries } from './data/commonEntries';
import { dayOverrides, type OverrideText } from './data/overrides';
import type { GuidanceSet, Language } from './types';
import { SkillExperience } from './components/SkillExperience';
import { applySkillResolution, type SkillResolution } from './skills';
import { buildHashValue, extractSkillFromHashParts } from './skillHash';

const weekdayLabelsMap: Record<Language, string[]> = {
  zh: ['日', '一', '二', '三', '四', '五', '六'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

const localeMap: Record<Language, string> = {
  zh: 'zh-Hans-CN',
  en: 'en-CA',
};

const copyMap = {
  zh: {
    heroSubtitle: '老黄历 · Old Yellow Calendar',
    heroTitle: '技能老黄历',
    heroIntro: [
      '传统的老黄历，就是给每一天安排宜和忌，好无趣、好无聊。',
      '而技能老黄历就是在传统的老黄历里加入技能，好好玩。',
    ],
    todayLabel: '今天',
    goToday: '回到今天',
    languageToggle: 'EN',
    yiLabel: '宜',
    jiLabel: '忌',
    prevMonth: '上一个月',
    nextMonth: '下一个月',
    calendarMeta: (date: Date) => `${date.getFullYear()} 年 第 ${date.getMonth() + 1} 月`,
    activateSkill: '发动技能',
    skillOverlayTitle: '今日技能',
    skillOverlayClose: '收起',
    skillLockedLabel: '今日技能已发动',
    skillOverrideLockedLabel: '今日天命禁止发动技能',
    skillSelectionPrompts: {
      remove: '请选择一个词条，将它抹去。',
      move: '请选择一个词条，将它移到对面阵营。',
      keepOnly: '请选择唯一要保留的词条，其余都会被舍弃。',
      reroll: '请选择一个词条，为它重写今日命运。',
    },
    skillNoEntries: '当前没有可操作的词条。',
    skillNoTargets: '当前没有词条可被销毁。',
    skillNoOptions: '没有可用的新词条，请尝试选择其他词条。',
    skillReplacementPrompt: '请选择一个新的词条完成替换：',
    skillEmptyLabel: '暂无',
  },
  en: {
    heroSubtitle: 'Chinese Almanac · Skill Edition',
    heroTitle: 'Skilled Chinese Almanac',
    heroIntro: [
      'Traditional almanacs simply assign “Do” and “Avoid” to each day—useful, but kinda dull.',
      'The Skill Almanac drops playful abilities into that ritual so every day becomes an adventure.',
    ],
    todayLabel: 'Today',
    goToday: 'Back to Today',
    languageToggle: '中文',
    yiLabel: 'Auspicious',
    jiLabel: 'Avoid',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    calendarMeta: (date: Date) => `Month ${date.getMonth() + 1}, ${date.getFullYear()}`,
    activateSkill: 'Activate Skills',
    skillOverlayTitle: 'Today’s Skills',
    skillOverlayClose: 'Close',
    skillLockedLabel: 'Skill already used today',
    skillOverrideLockedLabel: 'Skills are sealed for today',
    skillSelectionPrompts: {
      remove: 'Pick an entry to erase.',
      move: 'Pick an entry to move to the opposite list.',
      keepOnly: 'Pick the single entry you want to keep; the rest vanish.',
      reroll: 'Pick an entry to rewrite its fate.',
    },
    skillNoEntries: 'No entries available for this skill.',
    skillNoTargets: 'Nothing to destroy right now.',
    skillNoOptions: 'No replacement entries available—try another one.',
    skillReplacementPrompt: 'Choose a replacement entry:',
    skillEmptyLabel: 'None',
  },
} as const;

const BASE_YI_SPECIFIC = 2;
const BASE_YI_COMMON = 2;
const BASE_JI_SPECIFIC = 2;
const BASE_JI_COMMON = 2;

export default function App() {
  const today = new Date();
  const hashState = getHashState();
  const initialSelectedDate = hashState.date ?? today;
  const [viewDate, setViewDate] = useState(
    new Date(initialSelectedDate.getFullYear(), initialSelectedDate.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [language, setLanguage] = useState<Language>(() => getLanguageFromPath());
  const [skillResolution, setSkillResolution] = useState<SkillResolution | null>(
    hashState.resolution
  );
  const dateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);

  const copy = copyMap[language];
  const locale = localeMap[language];
  const weekdayLabels = weekdayLabelsMap[language];
  const showSkillExperience = true;

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [locale]
  );

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
      }),
    [locale]
  );

  const calendarDays = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const guidance: GuidanceSet = useMemo(() => getDailyGuidance(selectedDate), [selectedDate]);
  const overrideLocked = !!dayOverrides[dateKey]?.locked;
  const effectiveGuidance = useMemo(
    () =>
      skillResolution && !overrideLocked
        ? applySkillResolution(guidance, skillResolution)
        : guidance,
    [guidance, skillResolution, overrideLocked]
  );
  const skillLocked = overrideLocked || skillResolution !== null;
  const skillLockedLabel = overrideLocked
    ? copy.skillOverrideLockedLabel
    : copy.skillLockedLabel;

  const handleSelectDay = (day: Date) => {
    setSkillResolution(null);
    setSelectedDate(day);
    if (day.getMonth() !== viewDate.getMonth() || day.getFullYear() !== viewDate.getFullYear()) {
      setViewDate(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  };

  const goToPrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const freshToday = new Date();
    setSkillResolution(null);
    setSelectedDate(freshToday);
    setViewDate(new Date(freshToday.getFullYear(), freshToday.getMonth(), 1));
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'zh' ? 'en' : 'zh'));
  };

  useEffect(() => {
    const handleHashChange = () => {
      const { date, resolution } = getHashState();
      if (date && !isSameDay(date, selectedDate)) {
        setSelectedDate(date);
        setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
      }
      setSkillResolution(resolution);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [selectedDate]);

  useEffect(() => {
    const todayKey = toDateKey(today);
    const keepHash = skillResolution !== null;
    const targetHash =
      !keepHash && dateKey === todayKey ? '#' : buildHashValue(dateKey, skillResolution);
    if (window.location.hash !== targetHash) {
      try {
        window.history.replaceState(null, '', targetHash);
      } catch {
        window.location.hash = targetHash;
      }
    }
  }, [dateKey, skillResolution, today]);

  useEffect(() => {
    updatePathForLanguage(language);
  }, [language]);

  const prevLanguage = useRef(language);
  useEffect(() => {
    if (prevLanguage.current !== language) {
      prevLanguage.current = language;
      setSkillResolution(null);
    }
  }, [language]);

  useEffect(() => {
    if (overrideLocked && skillResolution) {
      setSkillResolution(null);
    }
  }, [overrideLocked, skillResolution]);

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="hero__subtitle">{copy.heroSubtitle}</p>
          <h1>{copy.heroTitle}</h1>
          {copy.heroIntro?.map((line, index) => (
            <p key={`${line}-${index}`} className="hero__intro">
              {line}
            </p>
          ))}
        </div>
        <div className="hero__today">
          <span>{copy.todayLabel}</span>
          <strong>{dateFormatter.format(today)}</strong>
        </div>
      </header>

      {showSkillExperience && (
        <SkillExperience
          language={language}
          guidance={effectiveGuidance}
          onApply={(resolution) => setSkillResolution(resolution)}
          isLocked={skillLocked}
          strings={{
            activateSkill: copy.activateSkill,
            skillLockedLabel,
            skillOverlayTitle: copy.skillOverlayTitle,
            skillOverlayClose: copy.skillOverlayClose,
            selectionPrompts: copy.skillSelectionPrompts,
            noEntriesMessage: copy.skillNoEntries,
            noTargetsMessage: copy.skillNoTargets,
            noOptionsMessage: copy.skillNoOptions,
            replacementPrompt: copy.skillReplacementPrompt,
            emptyLabel: copy.skillEmptyLabel,
            yiLabel: copy.yiLabel,
            jiLabel: copy.jiLabel,
          }}
        />
      )}

      <main className="calendar-shell">
        <section className="panel calendar">
          <div className="calendar__header">
            <button
              type="button"
              className="calendar__nav-btn"
              onClick={goToPrevMonth}
              aria-label={copy.prevMonth}
            >
              ‹
            </button>
            <div>
              <h2>{monthFormatter.format(viewDate)}</h2>
              <small>{copy.calendarMeta(viewDate)}</small>
            </div>
            <button
              type="button"
              className="calendar__nav-btn"
              onClick={goToNextMonth}
              aria-label={copy.nextMonth}
            >
              ›
            </button>
            <button type="button" className="calendar__today-btn" onClick={goToToday}>
              {copy.goToday}
            </button>
          </div>
          <div className="calendar__weekdays">
            {weekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="calendar__grid">
            {calendarDays.map((day) => {
              const isCurrentMonth = day.getMonth() === viewDate.getMonth();
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);

              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  className={[
                    'calendar__day',
                    isCurrentMonth ? 'calendar__day--current' : 'calendar__day--faded',
                    isSelected && 'calendar__day--selected',
                    isToday && 'calendar__day--today',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => handleSelectDay(day)}
                >
                  <span>{day.getDate()}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel detail">
          <h3 className="detail__date">{dateFormatter.format(selectedDate)}</h3>
          <div className="detail__block">
            <h4>{copy.yiLabel}</h4>
            <ul>
              {effectiveGuidance.yi.map((entry) => (
                <li key={entry.index}>{getEntryTitle(entry, language)}</li>
              ))}
            </ul>
          </div>
          <div className="detail__block">
            <h4>{copy.jiLabel}</h4>
            <ul>
              {effectiveGuidance.ji.map((entry) => (
                <li key={entry.index}>{getEntryTitle(entry, language)}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <button type="button" className="language-toggle" onClick={toggleLanguage}>
          {copy.languageToggle}
        </button>
      </footer>
    </div>
  );
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalendarDays(viewDate: Date) {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startDay = firstOfMonth.getDay();
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(1 - startDay);

  return Array.from({ length: 42 }, (_, index) => {
    const baseDate = new Date(gridStart);
    baseDate.setDate(gridStart.getDate() + index);
    return baseDate;
  });
}

function getDailyGuidance(date: Date) {
  const seedBase = Number(`${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`);
  const random = createSeededRandom(seedBase);
  const dateKey = toDateKey(date);
  const override = dayOverrides[dateKey];
  const overrideYi = resolveOverrideEntries(override?.yi, yiEntries, commonEntries, dateKey, 'yi');
  const overrideJi = resolveOverrideEntries(override?.ji, jiEntries, commonEntries, dateKey, 'ji');

  const yiCounts = adjustCounts(BASE_YI_SPECIFIC, BASE_YI_COMMON, overrideYi.length);
  const yiSpecificExclude = new Set(
    overrideYi.filter((item) => item.source === 'primary').map((item) => item.entry.index)
  );
  const yiSpecific = pickRandomEntries(yiEntries, yiCounts.primary, random, yiSpecificExclude);

  const yiOverrideCommon = overrideYi
    .filter((item) => item.source === 'common')
    .map((item) => item.entry.index);
  const yiCommon = pickRandomEntries(
    commonEntries,
    yiCounts.common,
    random,
    new Set(yiOverrideCommon)
  );

  const usedCommon = new Set<number>([...yiOverrideCommon, ...yiCommon.map((entry) => entry.index)]);

  const jiCounts = adjustCounts(BASE_JI_SPECIFIC, BASE_JI_COMMON, overrideJi.length);
  const jiSpecificExclude = new Set(
    overrideJi.filter((item) => item.source === 'primary').map((item) => item.entry.index)
  );
  const jiSpecific = pickRandomEntries(jiEntries, jiCounts.primary, random, jiSpecificExclude);

  const jiOverrideCommon = overrideJi
    .filter((item) => item.source === 'common')
    .map((item) => item.entry.index);
  jiOverrideCommon.forEach((index) => usedCommon.add(index));

  const jiCommon = pickRandomEntries(
    commonEntries,
    jiCounts.common,
    random,
    usedCommon
  );

  const yi = [...overrideYi.map((item) => item.entry), ...yiSpecific, ...yiCommon];
  const ji = [...overrideJi.map((item) => item.entry), ...jiSpecific, ...jiCommon];

  return { yi, ji };
}

function pickRandomEntries(
  pool: AlmanacEntry[],
  count: number,
  random: () => number,
  exclude?: Set<number>
) {
  const available = pool.filter((item) => !exclude?.has(item.index));
  const selections: AlmanacEntry[] = [];
  const working = [...available];

  for (let i = 0; i < count && working.length > 0; i += 1) {
    const idx = Math.floor(random() * working.length);
    selections.push(working[idx]);
    working.splice(idx, 1);
  }

  return selections;
}

function createSeededRandom(seed: number) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function adjustCounts(basePrimary: number, baseCommon: number, overrideLength: number) {
  const reducePrimary = Math.min(basePrimary, overrideLength);
  const reduceCommon = Math.min(Math.max(overrideLength - reducePrimary, 0), baseCommon);

  return {
    primary: Math.max(basePrimary - reducePrimary, 0),
    common: Math.max(baseCommon - reduceCommon, 0),
  };
}

type OverrideSource = 'primary' | 'common' | 'custom';

interface OverrideItem {
  entry: AlmanacEntry;
  source: OverrideSource;
}

function resolveOverrideEntries(
  overrides: OverrideText[] | undefined,
  primaryPool: AlmanacEntry[],
  commonPool: AlmanacEntry[],
  dateKey: string,
  type: 'yi' | 'ji'
) {
  if (!overrides?.length) {
    return [] as OverrideItem[];
  }

  return overrides.map<OverrideItem>((text, index) => {
    const zhTitle = (text.zh ?? text.en ?? '').trim();
    const enTitle = (text.en ?? text.zh ?? '').trim();

    const matchesEntry = (entry: AlmanacEntry) =>
      [entry.title, entry.titleEn].some(
        (value) => value === zhTitle || value === enTitle
      );

    const primaryMatch = primaryPool.find(matchesEntry);
    if (primaryMatch) {
      return { entry: primaryMatch, source: 'primary' as const };
    }

    const commonMatch = commonPool.find(matchesEntry);
    if (commonMatch) {
      return { entry: commonMatch, source: 'common' as const };
    }

    return {
      entry: createCustomEntry(zhTitle, enTitle, dateKey, type, index),
      source: 'custom' as const,
    };
  });
}

function createCustomEntry(
  zhTitle: string,
  enTitle: string,
  dateKey: string,
  type: 'yi' | 'ji',
  index: number
) {
  const base = type === 'yi' ? 1_000_000 : 2_000_000;
  return {
    index: base + Math.abs(hashString(`${dateKey}-${type}-${zhTitle}-${enTitle}-${index}`)),
    title: zhTitle,
    titleEn: enTitle,
  };
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function toDateKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function getEntryTitle(entry: AlmanacEntry, language: Language) {
  return language === 'zh' ? entry.title : entry.titleEn;
}

function getHashState(): { date: Date | null; resolution: SkillResolution | null } {
  if (typeof window === 'undefined') {
    return { date: null, resolution: null };
  }
  const hashValue = window.location.hash.replace('#', '').trim();
  if (!hashValue) {
    return { date: null, resolution: null };
  }
  const parts = hashValue.split('|');
  const date = parseDateKey(parts[0]);
  const resolution = extractSkillFromHashParts(parts.slice(1));
  return { date, resolution };
}

function parseDateKey(value: string) {
  const parts = value.split('-');
  if (parts.length !== 3) {
    return null;
  }

  const [yearStr, monthStr, dayStr] = parts;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function getLanguageFromPath(): Language {
  if (typeof window === 'undefined') {
    return 'zh';
  }
  const match = window.location.pathname.match(/^\/(en|zh)(?=\/|$)/);
  if (match && (match[1] === 'en' || match[1] === 'zh')) {
    return match[1];
  }
  return 'zh';
}

function updatePathForLanguage(language: Language) {
  if (typeof window === 'undefined') {
    return;
  }
  const { pathname, search, hash } = window.location;
  const suffix = pathname.replace(/^\/(en|zh)(?=\/|$)/, '');
  const normalized = suffix === '' ? '/' : suffix;
  const trimmed = normalized === '/' ? '' : normalized;
  const newPath = `/${language}${trimmed}`;
  const target = `${newPath}${search}${hash}`;
  const current = `${pathname}${search}${hash}`;
  if (target === current) {
    return;
  }
  try {
    window.history.replaceState(null, '', target);
  } catch {
    window.location.replace(target);
  }
}
