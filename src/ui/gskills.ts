import { h } from './dom';
import { t, unitDesc, unitSkill } from '../i18n';
import type { UnitDef } from '../data/units';
import {
  GENERAL_MAX_LEVEL, GENERAL_SKILLS, GSKILLS, SKILL_UNLOCK_LEVELS, SPECIAL_SKILL, extraSkillsAt, extraUnlockLevel, gskillParams, type GSkillId,
} from '../data/gskills';
import { attachInfoTip } from './tip';

// ───────────── hiển thị kỹ năng của tướng (thẻ Binh đoàn, tooltip nâng cấp, tooltip trong trận) ─────────────

export const gskillName = (id: GSkillId) => t(`gskill.${id}.name`);
export const gskillDesc = (id: GSkillId) => t(`gskill.${id}.desc`, gskillParams(id));
const typeLabel = (id: GSkillId) => t(GSKILLS[id].kind === 'active' ? 'gskill.active' : 'gskill.passive');

/** nội dung tooltip của một kỹ năng mở thêm */
export function gskillTip(id: GSkillId, unlockLv?: number): HTMLElement[] {
  return [
    h('div', { class: 'tip-head' }, h('b', { text: `${GSKILLS[id].icon} ${gskillName(id)}` }), h('em', { text: unlockLv ? `${typeLabel(id)} · Lv ${unlockLv}` : typeLabel(id) })),
    h('div', { class: 'tip-skill' }, h('p', { text: gskillDesc(id) })),
  ];
}

/** các ô kỹ năng trên thẻ tướng: 1 kỹ năng gốc + 4 kỹ năng mở theo cấp (+ kỹ năng đặc biệt của Tôn Ngộ Không) */
export function skillPanel(d: UnitDef, lv: number | undefined): HTMLElement | null {
  const ids = GENERAL_SKILLS[d.id];
  if (d.kind !== 'general' || !ids) return null;
  const level = lv ?? 1;
  const chip = (icon: string, name: string, cls: string, tip: () => HTMLElement[], label?: string) =>
    attachInfoTip(h('button', { class: `gs-chip ${cls}`, attrs: { type: 'button', 'aria-label': name } }, h('i', { text: icon }), h('small', { text: label ?? name })), tip);
  const chips: HTMLElement[] = [
    chip('✦', unitSkill(d), 'innate', () => [
      h('div', { class: 'tip-head' }, h('b', { text: `✦ ${unitSkill(d)}` }), h('em', { text: t('army.skillInnate') })),
      h('div', { class: 'tip-skill' }, h('p', { text: unitDesc(d) })),
    ], t('army.skillInnate')),
  ];
  const have = extraSkillsAt(d.id, level);
  ids.forEach((id, i) => {
    const unlock = extraUnlockLevel(i);
    const on = have.includes(id);
    chips.push(chip(on ? GSKILLS[id].icon : '🔒', gskillName(id), on ? 'on' : 'locked', () => gskillTip(id, unlock), on ? gskillName(id) : `Lv ${unlock}`));
  });
  const special = SPECIAL_SKILL[d.id];
  const specialRow = special
    ? chip('🐒', t(`gskill.special.${special}.name`), 'special', () => [
      h('div', { class: 'tip-head' }, h('b', { text: `🐒 ${t(`gskill.special.${special}.name`)}` }), h('em', { text: t('army.skillSpecial') })),
      h('div', { class: 'tip-skill' }, h('p', { text: t(`gskill.special.${special}.desc`) })),
    ], t(`gskill.special.${special}.name`))
    : null;
  return h('div', { class: 'gs-panel' },
    h('div', { class: 'gs-title' }, h('b', { text: t('army.skills', { n: have.length + 1, max: SKILL_UNLOCK_LEVELS.length }) }), h('small', { text: t('army.skillHint', { max: GENERAL_MAX_LEVEL }) })),
    h('div', { class: 'gs-chips' }, ...chips, specialRow));
}

/** dòng "Lv N: mở kỹ năng ..." trong tooltip nâng cấp (khi cấp kế tiếp mở kỹ năng mới) */
export function unlockAtNext(d: UnitDef, lv: number): HTMLElement | null {
  const ids = GENERAL_SKILLS[d.id];
  if (d.kind !== 'general' || !ids) return null;
  const i = ids.findIndex((_, k) => extraUnlockLevel(k) === lv + 1);
  if (i < 0) return null;
  const id = ids[i];
  return h('div', { class: 'up-unlock' }, h('b', { text: `🔓 ${t('up.skillUnlock', { n: lv + 1 })}` }), h('span', { text: `${GSKILLS[id].icon} ${gskillName(id)}` }), h('p', { text: gskillDesc(id) }));
}
