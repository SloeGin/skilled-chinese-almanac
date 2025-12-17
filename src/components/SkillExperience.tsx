import { useState } from 'react';
import type { GuidanceSet, Language } from '../types';
import type { AlmanacEntry } from '../data/yiEntries';
import { yiEntries } from '../data/yiEntries';
import { jiEntries } from '../data/jiEntries';
import {
  SKILLS_TO_DRAW,
  drawRandomSkills,
  getSkillDescription,
  getSkillTitle,
  skillsLibrary,
  type EntryListType,
  type Skill,
  type SkillResolution,
} from '../skills';

interface EntryTarget {
  list: EntryListType;
  entry: AlmanacEntry;
}

type EntryAction = 'remove' | 'move' | 'keepOnly' | 'reroll';

type SkillPhase =
  | { type: 'idle' }
  | { type: 'select-entry'; skillId: string; action: EntryAction }
  | { type: 'choose-replacement'; skillId: string; target: EntryTarget; options: AlmanacEntry[] };

interface SkillExperienceProps {
  language: Language;
  guidance: GuidanceSet;
  onApply: (resolution: SkillResolution) => void;
  isLocked: boolean;
  strings: {
    activateSkill: string;
    skillLockedLabel: string;
    skillOverlayTitle: string;
    skillOverlayClose: string;
    selectionPrompts: Record<EntryAction, string>;
    noEntriesMessage: string;
    noTargetsMessage: string;
    noOptionsMessage: string;
    replacementPrompt: string;
    emptyLabel: string;
    yiLabel: string;
    jiLabel: string;
  };
}

export function SkillExperience({
  language,
  guidance,
  onApply,
  isLocked,
  strings,
}: SkillExperienceProps) {
  const [activeSkills, setActiveSkills] = useState<Skill[]>([]);
  const [isOverlayOpen, setOverlayOpen] = useState(false);
  const [phase, setPhase] = useState<SkillPhase>({ type: 'idle' });
  const [message, setMessage] = useState<string | null>(null);
  const [focusedSkillId, setFocusedSkillId] = useState<string | null>(null);

  const handleActivateSkills = () => {
    if (isLocked) {
      return;
    }
    setActiveSkills(drawRandomSkills(skillsLibrary, SKILLS_TO_DRAW));
    setOverlayOpen(true);
    setPhase({ type: 'idle' });
    setMessage(null);
    setFocusedSkillId(null);
  };

  const resetAndClose = () => {
    setOverlayOpen(false);
    setPhase({ type: 'idle' });
    setMessage(null);
    setFocusedSkillId(null);
  };

  const applyResolution = (resolution: SkillResolution) => {
    onApply(resolution);
    resetAndClose();
  };

  const handleClose = () => {
    resetAndClose();
  };

  const ensureEntriesExist = (skill: Skill, action: EntryAction) => {
    if (guidance.yi.length === 0 && guidance.ji.length === 0) {
      setMessage(strings.noEntriesMessage);
      setPhase({ type: 'idle' });
      setFocusedSkillId(null);
      return;
    }
    setPhase({ type: 'select-entry', skillId: skill.id, action });
    setFocusedSkillId(skill.id);
  };

  const handleSkillCardClick = (skill: Skill) => {
    if (phase.type !== 'idle') {
      return;
    }
    setMessage(null);
    switch (skill.id) {
      case 'invert-all':
        applyResolution({ id: 'invert-all' });
        break;
      case 'all-to-ji':
        applyResolution({ id: 'all-to-ji' });
        break;
      case 'all-to-yi':
        applyResolution({ id: 'all-to-yi' });
        break;
      case 'reroll-one':
        ensureEntriesExist(skill, 'reroll');
        break;
      case 'remove-one':
        ensureEntriesExist(skill, 'remove');
        break;
      case 'wipe-all':
        applyResolution({ id: 'wipe-all' });
        break;
      case 'swap-side':
        ensureEntriesExist(skill, 'move');
        break;
      case 'all-in':
        ensureEntriesExist(skill, 'keepOnly');
        break;
      case 'destroy-four': {
        const removedTargets = pickRandomTargets(guidance, 4);
        if (removedTargets.length === 0) {
          setMessage(strings.noTargetsMessage);
          break;
        }
        applyResolution({
          id: 'destroy-four',
          removed: removedTargets.map((item) => ({
            list: item.list,
            index: item.entry.index,
          })),
        });
        break;
      }
      default:
        break;
    }
  };

  const handleEntrySelected = (target: EntryTarget) => {
    if (phase.type !== 'select-entry') {
      return;
    }
    switch (phase.action) {
      case 'remove':
        applyResolution({
          id: 'remove-one',
          list: target.list,
          targetIndex: target.entry.index,
        });
        break;
      case 'move':
        applyResolution({
          id: 'swap-side',
          list: target.list,
          targetIndex: target.entry.index,
        });
        break;
      case 'keepOnly':
        applyResolution({
          id: 'all-in',
          list: target.list,
          targetIndex: target.entry.index,
        });
        break;
      case 'reroll': {
        const options = getRerollOptions(target, guidance);
        if (options.length === 0) {
          setMessage(strings.noOptionsMessage);
          return;
        }
        setPhase({ type: 'choose-replacement', skillId: phase.skillId, target, options });
        break;
      }
      default:
        break;
    }
  };

  const handleReplacementSelect = (replacement: AlmanacEntry) => {
    if (phase.type !== 'choose-replacement') {
      return;
    }
    const { target } = phase;
    applyResolution({
      id: 'reroll-one',
      list: target.list,
      targetIndex: target.entry.index,
      replacementIndex: replacement.index,
    });
  };

  return (
    <>
      <div className="skill-trigger">
        <button
          type="button"
          className="skill-button"
          onClick={handleActivateSkills}
          disabled={isLocked}
        >
          {isLocked ? strings.skillLockedLabel : strings.activateSkill}
        </button>
      </div>
      {isOverlayOpen && activeSkills.length > 0 && (
        <div
          className="skill-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={strings.skillOverlayTitle}
          onClick={handleClose}
        >
          <div className="skill-overlay__panel" onClick={(event) => event.stopPropagation()}>
            <div className="skill-overlay__header">
              <h4>{strings.skillOverlayTitle}</h4>
              <button type="button" className="skill-overlay__close" onClick={handleClose}>
                {strings.skillOverlayClose}
              </button>
            </div>
            {message && <p className="skill-feedback">{message}</p>}
            <div
              className={[
                'skill-overlay__cards',
                phase.type === 'select-entry' || phase.type === 'choose-replacement'
                  ? 'skill-overlay__cards--solo'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {activeSkills.map((skill) => {
                const title = getSkillTitle(skill, language);
                const description = getSkillDescription(skill, language);
                const isActive = focusedSkillId === skill.id && phase.type !== 'idle';
                return (
                  <button
                    type="button"
                    key={skill.id}
                    className={['skill-card', isActive ? 'skill-card--active' : '']
                      .filter(Boolean)
                      .join(' ')}
                    data-tooltip={description}
                    aria-label={description}
                    onClick={() => handleSkillCardClick(skill)}
                  >
                    <div className="skill-card__logo">{skill.badge}</div>
                    <div className="skill-card__content">
                      <span className="skill-card__title">{title}</span>
                      <span className="skill-card__description">{description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {phase.type === 'select-entry' && (
              <SkillEntrySelector
                prompt={strings.selectionPrompts[phase.action]}
                guidance={guidance}
                yiLabel={strings.yiLabel}
                jiLabel={strings.jiLabel}
                emptyLabel={strings.emptyLabel}
                language={language}
                onSelect={handleEntrySelected}
              />
            )}
            {phase.type === 'choose-replacement' && (
              <SkillReplacementSelector
                options={phase.options}
                prompt={strings.replacementPrompt}
                emptyLabel={strings.emptyLabel}
                language={language}
                onSelect={handleReplacementSelect}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function getRerollOptions(target: EntryTarget, guidance: GuidanceSet) {
  const pool = target.list === 'yi' ? yiEntries : jiEntries;
  const exclude = new Set<number>([
    ...guidance.yi.map((entry) => entry.index),
    ...guidance.ji.map((entry) => entry.index),
  ]);
  exclude.add(target.entry.index);
  return drawEntriesFromPool(pool, 3, exclude);
}

function drawEntriesFromPool(
  pool: AlmanacEntry[],
  count: number,
  exclude: Set<number>
): AlmanacEntry[] {
  const available = pool.filter((entry) => !exclude.has(entry.index));
  const working = [...available];
  const selections: AlmanacEntry[] = [];
  for (let i = 0; i < count && working.length > 0; i += 1) {
    const idx = Math.floor(Math.random() * working.length);
    selections.push(working.splice(idx, 1)[0]);
  }
  return selections;
}

function pickRandomSubset<T>(items: T[], count: number) {
  const working = [...items];
  const result: T[] = [];
  for (let i = 0; i < count && working.length > 0; i += 1) {
    const idx = Math.floor(Math.random() * working.length);
    result.push(working.splice(idx, 1)[0]);
  }
  return result;
}

function pickRandomTargets(guidance: GuidanceSet, count: number) {
  const combined: EntryTarget[] = [
    ...guidance.yi.map((entry) => ({ list: 'yi' as const, entry })),
    ...guidance.ji.map((entry) => ({ list: 'ji' as const, entry })),
  ];
  const selections = pickRandomSubset(combined, Math.min(count, combined.length));
  return selections;
}

interface SkillEntrySelectorProps {
  prompt: string;
  guidance: GuidanceSet;
  yiLabel: string;
  jiLabel: string;
  emptyLabel: string;
  language: Language;
  onSelect: (target: EntryTarget) => void;
}

function SkillEntrySelector({
  prompt,
  guidance,
  yiLabel,
  jiLabel,
  emptyLabel,
  language,
  onSelect,
}: SkillEntrySelectorProps) {
  const actionClass = [
    'skill-action',
    language === 'en' ? 'skill-action--lang-en' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={actionClass}>
      <p>{prompt}</p>
      <div className="skill-action__lists">
        <div>
          <strong>{yiLabel}</strong>
          <div className="skill-entry-list">
            {guidance.yi.length === 0 && <span className="skill-entry-empty">{emptyLabel}</span>}
            {guidance.yi.map((entry) => (
              <button
                type="button"
                key={`yi-${entry.index}`}
                className="skill-entry-btn"
                onClick={() => onSelect({ list: 'yi', entry })}
              >
                {language === 'zh' ? entry.title : entry.titleEn}
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>{jiLabel}</strong>
          <div className="skill-entry-list">
            {guidance.ji.length === 0 && <span className="skill-entry-empty">{emptyLabel}</span>}
            {guidance.ji.map((entry) => (
              <button
                type="button"
                key={`ji-${entry.index}`}
                className="skill-entry-btn"
                onClick={() => onSelect({ list: 'ji', entry })}
              >
                {language === 'zh' ? entry.title : entry.titleEn}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SkillReplacementSelectorProps {
  options: AlmanacEntry[];
  prompt: string;
  emptyLabel: string;
  language: Language;
  onSelect: (entry: AlmanacEntry) => void;
}

function SkillReplacementSelector({
  options,
  prompt,
  emptyLabel,
  language,
  onSelect,
}: SkillReplacementSelectorProps) {
  const actionClass = [
    'skill-action',
    language === 'en' ? 'skill-action--lang-en' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={actionClass}>
      <p>{prompt}</p>
      <div className="skill-options">
        {options.length === 0 && <span className="skill-entry-empty">{emptyLabel}</span>}
        {options.map((entry) => (
          <button
            type="button"
            key={`opt-${entry.index}`}
            className="skill-option-btn"
            onClick={() => onSelect(entry)}
          >
            {language === 'zh' ? entry.title : entry.titleEn}
          </button>
        ))}
      </div>
    </div>
  );
}
