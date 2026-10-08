import { h } from './dom';
import { t, unitDesc, unitName } from '../i18n';
import { UNITS } from '../data/units';
import type { Station } from '../data/campaign';
import {
  EVENT_CHANCE, EVENT_TIME, FIRE_ZONE, GIANT_AT_HP, GIANT_AT_TIME, GIANT_MIN_TIME, GLOBAL_STATS, LIGHTNING, RANDOM_EVENTS,
  TERRAINS, WEATHERS, eventParams, type Effect, type RandomEventId,
} from '../data/terrain';
import { portrait } from './common';
import { attachUnitTip } from './tip';

// ───────────── ô địa hình / thời tiết / quái khổng lồ / sự kiện: bấm để xem ảnh hưởng ─────────────

export type EnvKey = 'terrain' | 'weather' | 'bridge' | 'giant' | 'event';

const GIANT_ICON: Record<string, string> = { nguoida: '🗿', cumang: '🐍', culong: '🐲' };

/** "+15%" / "−20%" / "+0.5%" */
const pct = (v: number) => `${v > 0 ? '+' : '−'}${Number((Math.abs(v) * 100).toFixed(1))}%`;

export function describeEffect(e: Effect): string {
  return t(`eff.${e.stat}`, { who: GLOBAL_STATS.includes(e.stat) ? '' : t(`who.${e.who}`), v: pct(e.v) });
}

const effRow = (e: Effect) => h('div', { class: `env-eff ${e.v > 0 ? 'good' : 'bad'}` }, h('i', { text: e.v > 0 ? '▲' : '▼' }), h('span', { text: describeEffect(e) }));

const head = (icon: string, name: string) => h('div', { class: 'env-head' }, h('i', { text: icon }), h('b', { text: name }));

function terrainDetail(st: Station): HTMLElement[] {
  const tr = TERRAINS[st.theme];
  return [
    head(tr.icon, t(`terrain.${st.theme}.name`)),
    h('p', { text: t(`terrain.${st.theme}.desc`) }),
    ...tr.effects.map(effRow),
    h('small', { class: 'env-note', text: t('env.both') }),
  ];
}

function weatherDetail(st: Station): HTMLElement[] {
  const w = WEATHERS[st.weather];
  const ev = w.event;
  const evText = !ev ? null
    : ev.kind === 'lightning'
      ? t('weather.event.lightning', { n: ev.every, warn: LIGHTNING.warn, dmg: LIGHTNING.damage, pct: Math.round(LIGHTNING.hpPct * 100), cap: LIGHTNING.cap, sec: LIGHTNING.stun })
      : t('weather.event.fireZone', { n: ev.every, life: FIRE_ZONE.life, dps: FIRE_ZONE.dps });
  return [
    head(w.icon, t(`weather.${st.weather}.name`)),
    h('p', { text: t(`weather.${st.weather}.desc`) }),
    ...w.effects.map(effRow),
    evText ? h('div', { class: 'env-eff bad' }, h('i', { text: '⚠' }), h('span', { text: evText })) : null,
    !w.effects.length && !ev ? h('div', { class: 'env-eff', text: t('env.noEffect') }) : null,
    h('small', { class: 'env-note', text: t('env.both') }),
  ].filter((x): x is HTMLElement => !!x);
}

function giantDetail(st: Station): HTMLElement[] {
  const d = UNITS[st.giantId!];
  const face = portrait(d.id, 1);
  attachUnitTip(face, d, 1, st.power);
  return [
    h('div', { class: 'env-head' }, face, h('b', { text: unitName(d) })),
    h('p', { text: unitDesc(d) }),
    h('div', { class: 'env-eff bad' }, h('i', { text: '⚠' }), h('span', { text: t('env.giantDesc', { name: unitName(d), hp: Math.round(GIANT_AT_HP * 100), sec: GIANT_AT_TIME, min: GIANT_MIN_TIME }) })),
  ];
}

function bridgeDetail(st: Station): HTMLElement[] {
  return [
    head('🌉', t('env.bridge')),
    ...st.bridges.map((b) => h('div', { class: 'env-eff good' }, h('i', { text: '⇄' }), h('span', { text: t('env.bridgeName', { a: b.a + 1, b: b.b + 1, pos: Math.round(b.x / 10) }) }))),
    h('p', { text: t('env.bridgeDesc') }),
  ];
}

export const eventRow = (id: RandomEventId) => {
  const ev = RANDOM_EVENTS.find((r) => r.id === id)!;
  return h('div', { class: 'env-ev' }, h('i', { text: ev.icon }), h('div', {}, h('b', { text: t(`event.${id}.name`) }), h('p', { text: t(`event.${id}.desc`, eventParams(id)) })));
};

function eventDetail(): HTMLElement[] {
  return [
    h('p', { text: t('env.eventChance', { lo: Math.round(EVENT_CHANCE[0] * 100), hi: Math.round(EVENT_CHANCE[1] * 100), from: EVENT_TIME[0], to: EVENT_TIME[1] }) }),
    ...RANDOM_EVENTS.map((r) => eventRow(r.id)),
  ];
}

function detailFor(st: Station, key: EnvKey): HTMLElement[] {
  return key === 'terrain' ? terrainDetail(st) : key === 'weather' ? weatherDetail(st) : key === 'bridge' ? bridgeDetail(st) : key === 'giant' ? giantDetail(st) : eventDetail();
}

interface Tile {
  key: EnvKey;
  icon: string;
  label: string;
  name: string;
}

function tilesOf(st: Station): Tile[] {
  const tiles: Tile[] = [
    { key: 'terrain', icon: TERRAINS[st.theme].icon, label: t('env.terrain'), name: t(`terrain.${st.theme}.name`) },
    { key: 'weather', icon: WEATHERS[st.weather].icon, label: t('env.weather'), name: t(`weather.${st.weather}.name`) },
  ];
  if (st.bridges.length) tiles.push({ key: 'bridge', icon: '🌉', label: t('env.bridge'), name: st.bridges.map((b) => `${b.a + 1}↔${b.b + 1}`).join(', ') });
  if (st.giantId) tiles.push({ key: 'giant', icon: GIANT_ICON[st.giantId] ?? '👹', label: t('env.giant'), name: unitName(UNITS[st.giantId]) });
  tiles.push({ key: 'event', icon: '🎲', label: t('env.event'), name: `${Math.round(EVENT_CHANCE[0] * 100)}–${Math.round(EVENT_CHANCE[1] * 100)}%` });
  return tiles;
}

let selected: EnvKey = 'terrain';

/** khối "Địa hình & ảnh hưởng" trong bảng trạm: các ô bấm được, chi tiết hiện ngay bên dưới */
export function envPanel(st: Station): HTMLElement {
  const tiles = tilesOf(st);
  if (!tiles.some((x) => x.key === selected)) selected = 'terrain';
  const detail = h('div', { class: 'env-detail' });
  const buttons: [EnvKey, HTMLElement][] = [];
  const show = () => {
    for (const [k, b] of buttons) b.classList.toggle('on', k === selected);
    detail.replaceChildren(...detailFor(st, selected));
  };
  const row = h('div', { class: 'env-tiles' });
  for (const tl of tiles) {
    const b = h('button', {
      class: 'env-tile', attrs: { type: 'button', 'aria-label': `${tl.label}: ${tl.name}` },
      on: { click: () => { selected = tl.key; show(); } },
    }, h('i', { text: tl.icon }), h('small', { text: tl.label }), h('b', { text: tl.name }));
    buttons.push([tl.key, b]);
    row.append(b);
  }
  show();
  return h('div', { class: 'sp-env' }, h('div', { class: 'sp-label', text: t('env.title') }), row, detail, h('small', { class: 'foes-tip', text: t('env.tip') }));
}

/** nhãn ngắn của ô trong trận */
const badgeLabel = (tl: Tile) => (tl.key === 'event' ? tl.label : tl.name);

/**
 * Hàng nút thông tin trong trận (địa hình, thời tiết, đường nối, quái khổng lồ, sự kiện): bấm để mở khung chi tiết ghim lại,
 * bấm lại hoặc bấm ra ngoài để đóng. `addEvent` thêm nút của sự kiện ngẫu nhiên khi nó xảy ra.
 */
export function envBadges(st: Station, withGenerals = false): { el: HTMLElement; addEvent: (id: RandomEventId) => void; setGenerals: (n: number, max: number) => void } {
  const row = h('div', { class: 'env-badge-row' });
  const pop = h('div', { class: 'env-pop env-detail' });
  pop.style.display = 'none';
  const el = h('div', { class: 'env-badges' }, row, pop);
  let openKey: string | null = null;
  const btns = new Map<string, HTMLElement>();
  const close = () => {
    openKey = null;
    pop.style.display = 'none';
    for (const b of btns.values()) b.classList.remove('on');
  };
  const badge = (key: string, icon: string, label: string, build: () => HTMLElement[], cls = '') => {
    const b = h('button', { class: `env-badge ${cls}`, attrs: { type: 'button', 'aria-label': label } }, h('i', { text: icon }), h('small', { text: label }));
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (openKey === key) return close();
      close();
      openKey = key;
      b.classList.add('on');
      pop.replaceChildren(...build());
      pop.style.display = 'flex';
    });
    btns.set(key, b);
    row.append(b);
  };
  // bấm ra ngoài thì đóng (tự gỡ khi màn hình trận bị huỷ)
  const outside = (e: Event) => {
    if (!el.isConnected) return document.removeEventListener('pointerdown', outside, true);
    if (!el.contains(e.target as Node)) close();
  };
  document.addEventListener('pointerdown', outside, true);
  for (const tl of tilesOf(st)) badge(tl.key, tl.icon, badgeLabel(tl), () => detailFor(st, tl.key));
  // nút "Tướng n/max": số tướng đang ra trên sân / số tướng tối đa cùng lúc
  let gens: HTMLElement | null = null;
  let lastGens = '';
  if (withGenerals) {
    badge('gens', '👑', '', () => [head('👑', t('hud.generalsTitle')), h('p', { text: t('hud.generalCapDesc') })], 'gens');
    gens = btns.get('gens')!.querySelector('small');
  }
  return {
    el,
    setGenerals: (n, max) => {
      const txt = t('hud.generalsLabel', { n, max });
      if (gens && txt !== lastGens) {
        lastGens = txt;
        gens.textContent = txt;
      }
    },
    addEvent: (id) => {
      const ev = RANDOM_EVENTS.find((r) => r.id === id)!;
      badge(`ev-${id}`, ev.icon, t(`event.${id}.name`), () => [head(ev.icon, t(`event.${id}.name`)), h('p', { text: t(`event.${id}.desc`, eventParams(id)) })], 'fresh');
    },
  };
}
