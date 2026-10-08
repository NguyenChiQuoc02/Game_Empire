import { h } from './dom';
import { t, unitDesc, unitName, unitSkill } from '../i18n';
import { type UnitDef } from '../data/units';
import { GSKILLS, type GSkillId } from '../data/gskills';

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
  /** kỹ năng mở thêm của tướng */
  gs?: GSkillId[];
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
    d.gs?.length ? h('div', { class: 'tip-gs' }, ...d.gs.map((id) => h('span', { class: 'tg', text: `${GSKILLS[id].icon} ${t(`gskill.${id}.name`)}` }))) : null,
  ].filter((x): x is HTMLDivElement => !!x);
}


// ───────────────────────── tooltip thông số quân ngoài trận (bản đồ, bảng trạm) ─────────────────────────

/** đặt tooltip phía trên phần tử; không đủ chỗ thì sang phải/trái (không bao giờ đặt xuống dưới) */
function placeTip(tip: HTMLElement, r: DOMRect) {
  const w = tip.offsetWidth;
  const hh = tip.offsetHeight;
  let left = Math.max(6, Math.min(window.innerWidth - w - 6, r.left + r.width / 2 - w / 2));
  let top = r.top - hh - 8;
  if (top < 6) {
    left = r.right + 8 + w + 6 <= window.innerWidth ? r.right + 8 : Math.max(6, r.left - 8 - w);
    top = Math.max(6, Math.min(window.innerHeight - hh - 6, (r.top + r.bottom) / 2 - hh / 2));
  }
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

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
  placeTip(tip, el.getBoundingClientRect());
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

/** Tooltip nội dung tuỳ ý (ô nâng cấp...): rê chuột để xem; trên điện thoại chạm giữ/nhấn cũng hiện vài giây */
export function attachInfoTip<T extends HTMLElement>(el: T, build: () => HTMLElement[]): T {
  const show = () => {
    if (!mapTip) {
      mapTip = h('div', { class: 'unit-tip map-tip' });
      document.body.append(mapTip);
    }
    const tipEl = mapTip;
    tipEl.className = 'unit-tip map-tip info-tip ally';
    tipEl.replaceChildren(...build());
    tipEl.style.display = 'block';
    placeTip(tipEl, el.getBoundingClientRect());
  };
  el.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && show());
  el.addEventListener('pointerleave', hideMapTip);
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    show();
    clearTimeout(mapTipTimer);
    mapTipTimer = setTimeout(hideMapTip, 3200);
  });
  el.addEventListener('focus', show);
  el.addEventListener('blur', hideMapTip);
  return el;
}
