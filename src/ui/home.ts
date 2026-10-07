import { h } from './dom';
import { stationDesc, stationName, stationSub, t, unitDesc, unitName, unitSkill } from '../i18n';
import { faceUrl } from '../render/icons';
import { getApp } from '../render/app';
import { peekMapArt, renderMapArt, type MapSpec } from '../render/mapArt';
import { MAP_CITIES, STATIONS } from '../data/campaign';
import {
  DECK_SIZE, MAX_GENERALS_IN_DECK, MAX_LEVEL, PLAYABLE, UNITS, upgradeCost, type UnitDef,
} from '../data/units';
import { mutate, state } from '../state';
import { fmt, portrait, statLine, toast } from './common';
import { openSettings } from './settings';
import { FAST_WIN_SEC, rewardFor } from '../game/rewards';

type Tab = 'campaign' | 'army';
let tab: Tab = 'campaign';
let selected = -1;
let armyFilter: 'troop' | 'general' = 'troop';

/** Chọn sẵn một trạm khi quay lại màn chiến dịch */
export function focusStation(i: number) {
  selected = i;
  tab = 'campaign';
}

export interface HomeCtx {
  onPlay(stationIdx: number): void;
  onLogout(): void;
  redraw(): void;
}

export function renderHome(root: HTMLElement, ctx: HomeCtx) {
  const save = state.save!;
  currentCtx = ctx;
  bindResize();
  if (selected < 0 || selected > save.progress) selected = Math.min(save.progress, STATIONS.length - 1);
  const keepScroll = root.querySelector('.content')?.scrollTop ?? 0;
  const mapMode = tab === 'campaign';

  const top = h(
    'header',
    { class: 'topbar' },
    h('div', { class: 'player' }, h('div', { class: 'avatar', text: save.name.slice(0, 1).toUpperCase() }), h('div', { class: 'pname' }, h('b', { text: save.name }), h('small', { text: t('home.record', { w: save.wins, l: save.losses }) }))),
    h('div', { class: 'coins', attrs: { title: t('home.coins') } }, h('i', { text: '🪙' }), h('b', { text: fmt(save.coins) })),
    h('button', { class: 'icon-btn', text: '⚙', attrs: { 'aria-label': t('settings.title'), type: 'button' }, on: { click: () => openSettings({ onLogout: ctx.onLogout }) } }),
  );

  const content = h('main', { class: `content${mapMode ? ' map-content' : ''}` }, mapMode ? campaign(ctx) : army(ctx));

  const navBtn = (id: Tab, ico: string, label: string) =>
    h('button', { class: `nav-btn${tab === id ? ' active' : ''}`, attrs: { type: 'button' }, on: { click: () => { tab = id; ctx.redraw(); } } }, h('i', { text: ico }), h('span', { text: label }));
  const nav = h('nav', { class: 'bottom-nav' }, navBtn('campaign', '🗺', t('home.tabCampaign')), navBtn('army', '⚔', t('home.tabArmy')));

  root.replaceChildren(h('div', { class: `screen home${mapMode ? ' map-mode' : ''}` }, top, content, nav));
  const c = root.querySelector('.content');
  if (c && !mapMode) c.scrollTop = keepScroll;
}

let currentCtx: HomeCtx | null = null;
let resizeBound = false;
function bindResize() {
  if (resizeBound) return;
  resizeBound = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (tab === 'campaign') currentCtx?.redraw();
    }, 250);
  });
}

// ───────────────────────── bản đồ chiến dịch ─────────────────────────
let lastMapSize: [number, number] | null = null;

function mapSpec(w: number, h: number, portrait: boolean): MapSpec {
  const k = portrait ? 'p' : 'l';
  return {
    w, h,
    stations: STATIONS.map((s) => s.map[k]),
    themes: STATIONS.map((s) => s.theme),
    start: MAP_CITIES.start[k],
    end: MAP_CITIES.end[k],
  };
}

function stars(n: number, cls = '') {
  return h('span', { class: `stars ${cls}` }, ...[1, 2, 3].map((i) => h('i', { class: i <= n ? 'on' : '', text: '★' })));
}

function campaign(ctx: HomeCtx): HTMLElement {
  const save = state.save!;
  const portraitMode = window.innerWidth < 900;
  const k = portraitMode ? 'p' : 'l';
  const wrap = h('div', { class: 'campaign' });
  const mapWrap = h('div', { class: 'map-wrap' });
  const img = h('img', { class: 'map-bg', attrs: { alt: '', draggable: 'false' } });
  mapWrap.append(img);

  mapWrap.append(h('div', { class: 'chapter-plate' }, h('b', { text: t('map.title') }), h('small', { text: t('map.subtitle') })));
  const allClear = save.cleared.every(Boolean);
  if (allClear) mapWrap.append(h('div', { class: 'map-win', text: `🏆 ${t('home.allClear')}` }));

  const city = (cls: string, label: string, p: [number, number]) =>
    h('div', { class: `city-chip ${cls}`, attrs: { style: `left:${p[0] * 100}%;top:${p[1] * 100}%` } }, h('i', { text: cls === 'start' ? '🏯' : '⚔' }), h('span', { text: label }));
  mapWrap.append(city('start', t('map.start'), MAP_CITIES.start[k]), city('end', t('map.enemy'), MAP_CITIES.end[k]));

  STATIONS.forEach((st, i) => {
    const locked = i > save.progress;
    const cleared = save.cleared[i];
    const sel = selected === i;
    const [x, y] = st.map[k];
    const bossFace = st.boss ? faceUrl('dongtrac', 1) : '';
    const node = h(
      'button',
      {
        class: `map-node ${cleared ? 'cleared' : locked ? 'locked' : 'current'}${st.boss ? ' boss' : ''}${sel ? ' selected' : ''}`,
        attrs: { type: 'button', style: `left:${x * 100}%;top:${y * 100}%`, 'aria-label': stationName(st) },
        on: { click: () => { if (locked) return toast(t('home.locked'), 'info'); selected = i; ctx.redraw(); } },
      },
      st.boss ? h('div', { class: 'boss-medal' }, bossFace ? h('img', { attrs: { src: bossFace, alt: '', draggable: 'false' } }) : null, h('em', { text: t('map.boss') })) : null,
      h('div', { class: 'node-flag' }),
      h('div', { class: 'node-plate' }, h('b', { text: locked ? '🔒' : `1-${i + 1}` }), stars(save.stars[i] ?? 0)),
    );
    mapWrap.append(node);
  });

  mapWrap.append(h('div', { class: 'map-hint' }, h('i', { text: '📜' }), h('span', { text: t('map.hint') })));
  wrap.append(mapWrap, stationPanel(ctx));

  // vẽ tranh nền theo đúng kích thước khung (không bị cắt/lệch với vị trí các trạm)
  const place = async () => {
    const app = getApp();
    const r = mapWrap.getBoundingClientRect();
    if (!app || r.width < 50 || r.height < 50) return;
    const w = Math.round(r.width);
    const hh = Math.round(r.height);
    lastMapSize = [w, hh];
    const url = await renderMapArt(app, mapSpec(w, hh, portraitMode));
    if (mapWrap.isConnected) img.src = url;
  };
  if (lastMapSize) {
    const cached = peekMapArt(mapSpec(lastMapSize[0], lastMapSize[1], portraitMode));
    if (cached) img.src = cached;
  }
  requestAnimationFrame(() => requestAnimationFrame(() => void place()));
  return wrap;
}

function stationPanel(ctx: HomeCtx): HTMLElement {
  const save = state.save!;
  const i = Math.max(0, Math.min(selected, STATIONS.length - 1));
  const st = STATIONS[i];
  const cleared = save.cleared[i];
  const foes = (st.boss ? [UNITS.dongtrac] : []).concat(st.deck.map((id) => UNITS[id]));
  const lead = st.boss ? UNITS.dongtrac : foes.find((d) => d.kind === 'general') ?? foes[foes.length - 1];
  const face = faceUrl(lead.id, 1);
  const first = !cleared;
  const star = (n: number, text: string) =>
    h('div', { class: `goal${(save.stars[i] ?? 0) >= n ? ' done' : ''}` }, stars(n === 1 ? 1 : n === 2 ? 2 : 3, 'mini'), h('span', { text }));

  return h(
    'aside',
    { class: `station-panel theme-${st.theme}` },
    h('h3', { class: 'sp-title', text: t('map.panelTitle') }),
    h('div', { class: 'sp-preview' },
      face ? h('img', { attrs: { src: face, alt: '', draggable: 'false' } }) : null,
      h('div', { class: 'sp-name' }, h('b', { text: `1-${i + 1} · ${stationName(st)}` }), h('small', { text: stationSub(st) }), st.boss ? h('em', { text: t('map.boss') }) : null)),
    h('p', { class: 'sp-desc sp-detail', text: stationDesc(st) }),
    h('div', { class: 'sp-block' },
      h('div', { class: 'sp-label', text: t('map.rewards') }),
      h('div', { class: 'sp-reward' }, h('span', { class: 'coin' }), h('b', { text: `+${fmt(rewardFor(st, true, first))}` }), first ? null : h('small', { text: `(${t('home.replay')})` })),
      stars(save.stars[i] ?? 0, 'big')),
    h('div', { class: 'sp-block sp-detail' },
      h('div', { class: 'sp-label', text: t('map.cond') }),
      h('div', { class: 'sp-cond' }, h('i', { text: '🚩' }), h('span', { text: t('map.condLanes') })),
      h('div', { class: 'sp-label', text: t('map.stars') }),
      star(1, t('map.star1')), star(2, t('map.star2')), star(3, t('map.star3', { sec: FAST_WIN_SEC }))),
    h('div', { class: 'sp-block sp-detail' },
      h('div', { class: 'sp-label', text: t('map.forces') }),
      h('div', { class: 'foes' }, ...foes.map((d) => h('div', { class: `foe ${d.kind}`, attrs: { title: `${unitName(d)} — ${unitSkill(d)}` } }, portrait(d.id, 1), h('small', { text: unitName(d) }))))),
    h('button', {
      class: 'btn primary big sp-go',
      text: `⚔ ${t(cleared ? 'home.replayBtn' : 'home.fight')}`,
      attrs: { type: 'button' },
      on: { click: () => (save.deck.length ? ctx.onPlay(i) : toast(t('home.emptyDeck'), 'error')) },
    }),
  );
}

// ───────────────────────── binh đoàn ─────────────────────────
function army(ctx: HomeCtx): HTMLElement {
  const save = state.save!;
  const wrap = h('div', { class: 'army' });
  const gens = save.deck.filter((id) => UNITS[id].kind === 'general').length;

  const slots = h('div', { class: 'deck-slots' });
  for (let i = 0; i < DECK_SIZE; i++) {
    const id = save.deck[i];
    if (id) {
      const d = UNITS[id];
      slots.append(
        h('button', { class: `slot filled ${d.kind}`, attrs: { type: 'button', title: t('army.removeFromDeck') }, on: { click: () => toggleDeck(d, ctx) } },
          portrait(id), h('span', { class: 'cost', text: String(d.cost) })),
      );
    } else slots.append(h('div', { class: 'slot empty', text: '+' }));
  }
  wrap.append(
    h('h2', { class: 'section-title', text: t('army.deck') }),
    h('div', { class: 'deck' }, slots, h('div', { class: 'deck-info', text: t('army.deckInfo', { n: save.deck.length, max: DECK_SIZE, g: gens, gmax: MAX_GENERALS_IN_DECK }) })),
  );

  const filt = (k: 'troop' | 'general', label: string) =>
    h('button', { class: `pill${armyFilter === k ? ' active' : ''}`, text: label, attrs: { type: 'button' }, on: { click: () => { armyFilter = k; ctx.redraw(); } } });
  wrap.append(h('div', { class: 'pills' }, filt('troop', t('army.troops')), filt('general', t('army.generals'))));

  const grid = h('div', { class: 'cards' });
  for (const d of PLAYABLE.filter((u) => u.kind === armyFilter)) grid.append(unitCard(d, ctx));
  wrap.append(grid);
  return wrap;
}

function unitCard(d: UnitDef, ctx: HomeCtx): HTMLElement {
  const save = state.save!;
  const lv = save.unlocked[d.id];
  const owned = lv !== undefined;
  const inDeck = save.deck.includes(d.id);
  const actions = h('div', { class: 'card-actions' });

  if (!owned) {
    const can = save.coins >= d.unlockCost;
    actions.append(
      h('button', {
        class: `btn gold${can ? '' : ' disabled'}`,
        text: `🔓 ${t('army.unlock')} · 🪙 ${fmt(d.unlockCost)}`,
        attrs: { type: 'button' },
        on: {
          click: () => {
            if (!can) return toast(t('army.needCoins'), 'error');
            mutate((s) => { s.coins -= d.unlockCost; s.unlocked[d.id] = 1; }, true);
            toast(t('army.unlocked', { name: unitName(d) }), 'good');
            ctx.redraw();
          },
        },
      }),
    );
  } else {
    const maxed = lv >= MAX_LEVEL;
    const cost = upgradeCost(d, lv);
    actions.append(
      h('button', { class: `btn ${inDeck ? 'ghost' : 'primary'}`, text: inDeck ? t('army.remove') : t('army.add'), attrs: { type: 'button' }, on: { click: () => toggleDeck(d, ctx) } }),
      h('button', {
        class: `btn gold${maxed || save.coins < cost ? ' disabled' : ''}`,
        text: maxed ? t('army.maxLevel') : `⬆ ${t('army.upgrade')} · 🪙 ${fmt(cost)}`,
        attrs: { type: 'button' },
        on: {
          click: () => {
            if (maxed) return;
            if (save.coins < cost) return toast(t('army.needCoins'), 'error');
            mutate((s) => { s.coins -= cost; s.unlocked[d.id] = lv + 1; }, true);
            ctx.redraw();
          },
        },
      }),
    );
  }

  return h(
    'article',
    { class: `ucard ${d.kind}${owned ? '' : ' locked'}${inDeck ? ' in-deck' : ''}` },
    h('div', { class: 'u-top' },
      portrait(d.id, 0, 'big'),
      h('div', { class: 'u-id' },
        h('b', { text: unitName(d) }),
        h('div', { class: 'u-badges' },
          h('span', { class: 'badge cost', text: `💰 ${d.cost}` }),
          owned ? h('span', { class: 'badge lv', text: `Lv ${lv}` }) : h('span', { class: 'badge', text: `🔒` }),
          inDeck ? h('span', { class: 'badge deck', text: t('army.inDeck') }) : null))),
    statLine(d, lv ?? 1),
    h('div', { class: 'u-skill' }, h('b', { text: unitSkill(d) }), h('span', { text: unitDesc(d) })),
    actions,
  );
}

function toggleDeck(d: UnitDef, ctx: HomeCtx) {
  const save = state.save!;
  const inDeck = save.deck.includes(d.id);
  if (inDeck) {
    if (save.deck.length <= 1) return toast(t('army.needOne'), 'error');
    mutate((s) => { s.deck = s.deck.filter((x) => x !== d.id); });
  } else {
    if (save.deck.length >= DECK_SIZE) return toast(t('army.deckFull'), 'error');
    if (d.kind === 'general' && save.deck.filter((x) => UNITS[x].kind === 'general').length >= MAX_GENERALS_IN_DECK) {
      return toast(t('army.generalsFull'), 'error');
    }
    mutate((s) => { s.deck.push(d.id); });
  }
  ctx.redraw();
}
