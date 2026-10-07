import { h } from './dom';
import { t, unitDesc, unitName, unitSkill } from '../i18n';
import { type UnitDef } from '../data/units';

// ───────────────────────── nội dung tooltip (quân trên chiến trường và thẻ bài) ─────────────────────────
export interface TipData {
  def: UnitDef;
  side: 0 | 1;
  hp: number;
  maxHp: number;
  dmg: number;
  armor: number;
  speed: number;
  range: number;
  cd: number;
  pow: number;
  level?: number;
}

export function tipBody(d: TipData): HTMLElement[] {
  const { def } = d;
  const ally = d.side === 0;
  const pct = Math.max(0, Math.min(1, d.hp / d.maxHp));
  const stat = (ico: string, val: string, title: string) => h('span', { class: 'ts', attrs: { title } }, h('i', { text: ico }), val);
  const tags = [t(`kind.${def.kind}`), t(ally ? 'hud.ally' : 'hud.foe'), d.level ? `Lv ${d.level}` : ''].filter(Boolean).join(' · ');
  const stats: HTMLElement[] = [];
  if (def.kind === 'defense') {
    if (def.skill === 'altar') stats.push(stat('✚', String(Math.round(d.dmg)), t('stat.heal')));
    else if (def.dmg > 0) stats.push(stat('⚔', String(Math.round(d.dmg)), t('stat.atk')));
    if (def.dmg > 0 || def.skill === 'altar') stats.push(stat('⏱', `${Number(d.cd.toFixed(2))}s`, t('stat.cd')));
    if (def.range > 0) stats.push(stat('🎯', String(d.range), t('stat.rng')));
    if (d.armor > 0) stats.push(stat('🛡', String(Math.round(d.armor)), t('stat.armor')));
  } else if (def.skill === 'heal') stats.push(stat('✚', String(Math.round(15 * d.pow)), t('stat.heal')));
  else {
    stats.push(stat(def.skill === 'bomb' ? '💥' : '⚔', String(Math.round(d.dmg)), t('stat.atk')));
    if (def.skill !== 'bomb') stats.push(stat('⏱', `${Number(d.cd.toFixed(2))}s`, t('stat.cd')));
  }
  if (def.kind !== 'defense') {
    stats.push(stat('👟', String(Math.round(d.speed)), t('stat.spd')));
    stats.push(stat('🎯', d.range > 70 ? String(d.range) : t('stat.melee'), t('stat.rng')));
    stats.push(stat('🛡', String(Math.round(d.armor)), t('stat.armor')));
  }
  return [
    h('div', { class: 'tip-head' }, h('b', { text: unitName(def) }), h('em', { text: tags })),
    h('div', { class: 'tip-hp' }, h('span', { text: `❤ ${Math.ceil(d.hp)} / ${Math.ceil(d.maxHp)}` }), h('span', { class: 'bar' }, h('i', { attrs: { style: `width:${pct * 100}%` } }))),
    h('div', { class: 'tip-stats' }, ...stats),
    h('div', { class: 'tip-skill' }, h('b', { text: `✦ ${unitSkill(def)}` }), h('p', { text: unitDesc(def) })),
  ];
}


// ───────────────────────── tooltip thông số quân ngoài trận (bản đồ, bảng trạm) ─────────────────────────
let mapTip: HTMLElement | null = null;
let mapTipTimer: ReturnType<typeof setTimeout> | undefined;

export function hideMapTip() {
  clearTimeout(mapTipTimer);
  if (mapTip) mapTip.style.display = 'none';
}

function showMapTip(el: HTMLElement, def: UnitDef, side: 0 | 1, pow: number) {
  if (!mapTip) {
    mapTip = h('div', { class: 'unit-tip map-tip' });
    document.body.append(mapTip);
  }
  const tip = mapTip;
  tip.className = `unit-tip map-tip ${side === 1 ? 'foe' : 'ally'} ${def.kind}`;
  const hp = def.hp * pow;
  tip.replaceChildren(...tipBody({ def, side, hp, maxHp: hp, dmg: def.dmg * pow, armor: def.armor, speed: def.speed, range: def.range, cd: def.cd, pow }));
  tip.style.display = 'block';
  const r = el.getBoundingClientRect();
  const w = tip.offsetWidth;
  const hh = tip.offsetHeight;
  const left = Math.max(6, Math.min(window.innerWidth - w - 6, r.left + r.width / 2 - w / 2));
  let top = r.top - hh - 8;
  if (top < 6) top = Math.min(window.innerHeight - hh - 6, r.bottom + 8);
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

/** Gắn tooltip thông số quân vào phần tử: rê chuột để xem; chạm để xem vài giây trên điện thoại */
export function attachUnitTip(el: HTMLElement, def: UnitDef, side: 0 | 1, pow = 1, withClick = true) {
  el.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && showMapTip(el, def, side, pow));
  el.addEventListener('pointerleave', hideMapTip);
  if (withClick) el.addEventListener('click', (e) => {
    e.stopPropagation();
    showMapTip(el, def, side, pow);
    clearTimeout(mapTipTimer);
    if ((e as PointerEvent).pointerType !== 'mouse') mapTipTimer = setTimeout(hideMapTip, 3200);
  });
  el.addEventListener('focus', () => showMapTip(el, def, side, pow));
  el.addEventListener('blur', hideMapTip);
}
