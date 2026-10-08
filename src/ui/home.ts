import { h } from './dom';
import { chapterName, chapterSub, stationDesc, stationName, stationSub, t, unitDesc, unitName, unitSkill } from '../i18n';
import { faceUrl } from '../render/icons';
import { getApp } from '../render/app';
import { peekMapArt, renderMapArt, type MapSpec } from '../render/mapArt';
import { CHAPTERS, STATIONS, STATIONS_PER_MAP, stationLabel, stationPos } from '../data/campaign';
import {
  DECK_EXTRA_COSTS, DEF_EXTRA_COSTS, GENERAL_EXTRA_COSTS, PET_EXTRA_COSTS, PETS, DEFENSES, FLAG_MAX_LV, MAX_LEVEL, PLAYABLE, UNITS, flagHpMul, flagUpgradeCost, upgradeCost,
  type UnitDef,
} from '../data/units';
import { deckSizeOf, defSizeOf, generalCapOf, petSizeOf } from '../backend/save';
import { PLAYER_FLAG_HP } from '../game/sim';
import { DECK_SIZE, DEFENSE_DECK_SIZE, PET_DECK_SIZE, MAX_GENERALS_IN_DECK, levelMul } from '../data/units';
import { mutate, state } from '../state';
import { fmt, portrait, statLine, toast } from './common';
import { openSettings } from './settings';
import { openInbox } from './inbox';
import { attachInfoTip, attachUnitTip, hideMapTip } from './tip';
import { unread } from '../notices';
import { rewardFor } from '../game/rewards';

type Tab = 'campaign' | 'army';
let tab: Tab = 'campaign';
let selected = -1;
let armyFilter: 'troop' | 'defense' | 'pet' | 'general' = 'troop';

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
  if (selected < 0 || selected >= STATIONS.length) selected = Math.min(save.progress, STATIONS.length - 1);
  const keepScroll = root.querySelector('.content')?.scrollTop ?? 0;
  const mapMode = tab === 'campaign';

  const top = h(
    'header',
    { class: 'topbar' },
    h('div', { class: 'player' }, h('div', { class: 'avatar', text: save.name.slice(0, 1).toUpperCase() }), h('div', { class: 'pname' }, h('b', { text: save.name }), h('small', { text: t('home.record', { w: save.wins, l: save.losses }) }))),
    h('div', { class: 'coins', attrs: { title: t('home.coins') } }, h('i', { text: '🪙' }), h('b', { text: fmt(save.coins) })),
    bell(ctx),
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

function mapSpec(w: number, h: number, portrait: boolean, chIdx: number): MapSpec {
  const k = portrait ? 'p' : 'l';
  const ch = CHAPTERS[chIdx];
  return {
    w, h,
    stations: ch.stations.map((i) => stationPos(i, k)),
    themes: ch.stations.map((i) => STATIONS[i].theme),
    start: ch.start[k],
    end: ch.end[k],
  };
}

function stars(n: number, cls = '') {
  return h('span', { class: `stars ${cls}` }, ...[1, 2, 3].map((i) => h('i', { class: i <= n ? 'on' : '', text: '★' })));
}

/** bản đồ đã mở khi trạm đầu của bản đồ đã mở (cần hoàn thành đủ các trạm của bản đồ trước) */
const chapterOpen = (c: number) => c >= 0 && c < CHAPTERS.length && CHAPTERS[c].stations[0] <= state.save!.progress;

/** chuyển sang xem một bản đồ (được xem cả bản đồ chưa mở, nhưng không chơi được) */
/** nút chuông thông báo kèm số thông báo chưa đọc */
function bell(ctx: HomeCtx): HTMLElement {
  const n = unread().length;
  return h('button', { class: 'icon-btn bell', attrs: { 'aria-label': t('inbox.bell'), type: 'button' }, on: { click: () => openInbox(() => ctx.redraw()) } }, h('span', { text: '🔔' }), n ? h('i', { class: 'badge', text: String(Math.min(n, 9)) }) : null);
}

function gotoChapter(c: number, ctx: HomeCtx) {
  const save = state.save!;
  if (c < 0 || c >= CHAPTERS.length) return;
  const ids = CHAPTERS[c].stations;
  const open = ids.filter((i) => i <= save.progress);
  selected = open.length ? (open.find((i) => !save.cleared[i]) ?? open[open.length - 1]) : ids[0];
  if (!chapterOpen(c)) toast(t('map.chapterLockedView', { n: STATIONS_PER_MAP }), 'info');
  ctx.redraw();
}

/** điện thoại dọc / cửa sổ hẹp: bản đồ dọc + thanh trạm ở dưới (điện thoại nằm ngang dùng bản đồ ngang + bảng bên phải) */
export const isPortraitLayout = () => window.innerWidth < 900 && window.innerHeight > 520;

/** huy hiệu Boss trên bản đồ: rê chuột để xem thông số Boss */
function bossMedal(st: (typeof STATIONS)[number], face: string): HTMLElement {
  const el = h('div', { class: 'boss-medal' }, face ? h('img', { attrs: { src: face, alt: '', draggable: 'false' } }) : null, h('em', { text: t('map.boss') }));
  if (st.bossId) attachUnitTip(el, UNITS[st.bossId], 1, st.power, false);
  return el;
}

function campaign(ctx: HomeCtx): HTMLElement {
  hideMapTip();
  const save = state.save!;
  const portraitMode = isPortraitLayout();
  const k = portraitMode ? 'p' : 'l';
  const chIdx = STATIONS[selected].chapter;
  const ch = CHAPTERS[chIdx];
  const wrap = h('div', { class: 'campaign' });
  const mapWrap = h('div', { class: 'map-wrap' });
  const img = h('img', { class: 'map-bg', attrs: { alt: '', draggable: 'false' } });
  mapWrap.append(img);

  mapWrap.append(h('div', { class: 'chapter-plate' }, h('b', { text: `${t('map.chapter', { n: chIdx + 1 })} · ${chapterName(ch)}` }), h('small', { text: chapterSub(ch) })));
  if (save.cleared.every(Boolean)) mapWrap.append(h('div', { class: 'map-win', text: `🏆 ${t('home.allClear')}` }));

  const city = (cls: string, label: string, p: [number, number]) =>
    h('div', { class: `city-chip ${cls}`, attrs: { style: `left:${p[0] * 100}%;top:${p[1] * 100}%` } }, h('i', { text: cls === 'start' ? '🏯' : '⚔' }), h('span', { text: label }));
  mapWrap.append(city('start', t('map.start'), ch.start[k]), city('end', t('map.enemy'), ch.end[k]));

  ch.stations.forEach((idx) => {
    const st = STATIONS[idx];
    const locked = idx > save.progress;
    const cleared = save.cleared[idx];
    const sel = selected === idx;
    const [x, y] = stationPos(idx, k);
    const bossFace = st.boss ? faceUrl(st.bossId ?? 'dongtrac', 1) : '';
    const node = h(
      'button',
      {
        class: `map-node ${cleared ? 'cleared' : locked ? 'locked' : 'current'}${st.boss ? ' boss' : ''}${sel ? ' selected' : ''}`,
        attrs: { type: 'button', style: `left:${x * 100}%;top:${y * 100}%`, 'aria-label': stationName(st) },
        on: { click: () => { selected = idx; ctx.redraw(); } },
      },
      st.boss ? bossMedal(st, bossFace) : null,
      h('div', { class: 'node-flag' }),
      h('div', { class: 'node-plate' }, h('b', { text: locked ? `🔒 ${stationLabel(idx)}` : stationLabel(idx) }), stars(save.stars[idx] ?? 0)),
    );
    mapWrap.append(node);
  });

  // chuyển chương
  const navBtn = (c: number, ico: string) =>
    h('button', { class: `chapter-btn${c < 0 || c >= CHAPTERS.length ? ' disabled' : ''}`, text: ico, attrs: { type: 'button', 'aria-label': ico }, on: { click: () => gotoChapter(c, ctx) } });
  mapWrap.append(h('div', { class: 'chapter-nav' }, navBtn(chIdx - 1, '◀'), h('span', { class: chapterOpen(chIdx) ? '' : 'locked', text: `${chapterOpen(chIdx) ? '' : '🔒 '}${chIdx + 1}/${CHAPTERS.length}` }), navBtn(chIdx + 1, '▶')));
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
    const url = await renderMapArt(app, mapSpec(w, hh, portraitMode, chIdx));
    if (mapWrap.isConnected) img.src = url;
  };
  if (lastMapSize) {
    const cached = peekMapArt(mapSpec(lastMapSize[0], lastMapSize[1], portraitMode, chIdx));
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
  const locked = i > save.progress;
  const bossDef = st.bossId ? UNITS[st.bossId] : null;
  const foes = (bossDef ? [bossDef] : []).concat(st.deck.map((id) => UNITS[id]));
  const lead = bossDef ?? foes.find((d) => d.kind === 'general') ?? foes[foes.length - 1];
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
      h('div', { class: 'sp-name' }, h('b', { text: `${stationLabel(i)} · ${stationName(st)}` }), h('small', { text: stationSub(st) }), st.boss ? h('em', { text: t('map.boss') }) : null)),
    locked ? h('div', { class: 'sp-locked', text: `🔒 ${t('map.stationLocked')}` }) : null,
    h('p', { class: 'sp-desc sp-detail', text: stationDesc(st) }),
    h('div', { class: 'sp-block' },
      h('div', { class: 'sp-label', text: t('map.rewards') }),
      h('div', { class: 'sp-reward' }, h('span', { class: 'coin' }), h('b', { text: `+${fmt(rewardFor(st, true, first))}` }), first ? null : h('small', { text: `(${t('home.replay')})` })),
      stars(save.stars[i] ?? 0, 'big')),
    h('div', { class: 'sp-block sp-detail' },
      h('div', { class: 'sp-label', text: t('map.cond') }),
      h('div', { class: 'sp-chips' },
        h('span', { class: 'chip', text: `☠ ${t('map.units', { n: st.units })}` }),
        h('span', { class: 'chip', text: `🛤 ${st.boss ? t('map.oneLane') : t('map.threeLane')}` }),
        st.mod ? h('span', { class: 'chip warn', text: `⚠ ${t(`mod.${st.mod}`)}` }) : null),
      h('div', { class: 'sp-cond' }, h('i', { text: '🚩' }), h('span', { text: st.boss ? t('map.condBoss') : t('map.condLanes') })),
      h('div', { class: 'sp-label', text: t('map.stars') }),
      star(1, t('map.star1')), star(2, t('map.star2')), star(3, t('map.star3', { sec: st.fastSec }))),
    h('div', { class: 'sp-block sp-detail' },
      h('div', { class: 'sp-label', text: t('map.forces') }),
      h('div', { class: 'foes' }, ...foes.map((d) => {
        const el = h('div', { class: `foe ${d.kind}` }, portrait(d.id, 1), h('small', { text: unitName(d) }));
        attachUnitTip(el, d, 1, st.power);
        return el;
      })),
      h('small', { class: 'foes-tip', text: t('map.foeTip') })),
    h('button', {
      class: `btn primary big sp-go${locked ? ' disabled' : ''}`,
      text: locked ? t('home.fightLocked') : `⚔ ${t(cleared ? 'home.replayBtn' : 'home.fight')}`,
      attrs: { type: 'button' },
      on: { click: () => (locked ? toast(t('map.stationLocked'), 'info') : save.deck.length ? ctx.onPlay(i) : toast(t('home.emptyDeck'), 'error')) },
    }),
  );
}

// ───────────────────────── binh đoàn ─────────────────────────
function army(ctx: HomeCtx): HTMLElement {
  const save = state.save!;
  const wrap = h('div', { class: 'army' });
  const gens = save.deck.filter((id) => UNITS[id].kind === 'general').length;

  const slots = h('div', { class: 'deck-slots' });
  const deckN = deckSizeOf(save);
  const defN = defSizeOf(save);
  for (let i = 0; i < deckN; i++) {
    const id = save.deck[i];
    if (id) {
      const d = UNITS[id];
      slots.append(
        h('button', { class: `slot filled ${d.kind}`, attrs: { type: 'button', title: t('army.removeFromDeck') }, on: { click: () => toggleDeck(d, ctx) } },
          portrait(id), h('span', { class: 'cost', text: String(d.cost) })),
      );
    } else slots.append(h('div', { class: 'slot empty', text: '+' }));
  }
  const extraDeck = save.deckSlots ?? 0;
  if (extraDeck < DECK_EXTRA_COSTS.length) slots.append(slotBuy('deckSlots', DECK_EXTRA_COSTS[extraDeck], ctx));
  slots.style.setProperty('--cols', String(slotCols(deckN + (extraDeck < DECK_EXTRA_COSTS.length ? 1 : 0))));
  const defSlots = h('div', { class: 'deck-slots def' });
  for (let i = 0; i < defN; i++) {
    const id = save.defDeck[i];
    if (id) {
      const d = UNITS[id];
      defSlots.append(
        h('button', { class: 'slot filled defense', attrs: { type: 'button', title: t('army.removeFromDeck') }, on: { click: () => toggleDeck(d, ctx) } },
          portrait(id), h('span', { class: 'cost', text: String(d.cost) })),
      );
    } else defSlots.append(h('div', { class: 'slot empty', text: '+' }));
  }
  const extraDef = save.defSlots ?? 0;
  if (extraDef < DEF_EXTRA_COSTS.length) defSlots.append(slotBuy('defSlots', DEF_EXTRA_COSTS[extraDef], ctx));
  defSlots.style.setProperty('--cols', String(Math.min(defN + (extraDef < DEF_EXTRA_COSTS.length ? 1 : 0), 6)));
  wrap.append(
    castlePanel(ctx),
    generalCapPanel(ctx),
    h('h2', { class: 'section-title', text: t('army.deck') }),
    h('div', { class: 'deck' }, slots, h('div', { class: 'deck-info', text: t('army.deckInfo', { n: save.deck.length, max: deckN, g: gens, gmax: generalCapOf(save) }) })),
    h('h2', { class: 'section-title', text: t('army.defDeck') }),
    h('div', { class: 'deck' }, defSlots, h('div', { class: 'deck-info', text: t('army.defDeckInfo', { n: save.defDeck.length, max: defN }) })),
  );

  const filt = (k: 'troop' | 'defense' | 'pet' | 'general', label: string) =>
    h('button', { class: `pill${armyFilter === k ? ' active' : ''}`, text: label, attrs: { type: 'button' }, on: { click: () => { armyFilter = k; ctx.redraw(); } } });
  wrap.append(h('div', { class: 'pills' }, filt('troop', t('army.troops')), filt('defense', t('army.defenses')), filt('pet', t('army.pets')), filt('general', t('army.generals'))));
  if (armyFilter === 'pet') wrap.append(petPanel(ctx));

  const grid = h('div', { class: 'cards' });
  const list = armyFilter === 'defense' ? DEFENSES : armyFilter === 'pet' ? PETS : PLAYABLE.filter((u) => u.kind === armyFilter);
  for (const d of list) grid.append(unitCard(d, ctx));
  wrap.append(grid);
  return wrap;
}

/** số cột lưới ô bộ bài: tối đa 5 cột khi có nhiều hơn 6 ô */
const slotCols = (n: number) => (n <= 8 ? n : Math.ceil(n / 2));

/** ô "mở thêm" trong bộ bài / bộ đồ phòng thủ: trả xu để thêm một ô */
/** bộ thú cưng: chọn thú mang vào trận (xuất trận như lính) */
function petPanel(ctx: HomeCtx): HTMLElement {
  const save = state.save!;
  const petN = petSizeOf(save);
  const slots = h('div', { class: 'deck-slots pets' });
  const pd = save.petDeck ?? [];
  for (let i = 0; i < petN; i++) {
    const id = pd[i];
    if (id) {
      const d = UNITS[id];
      slots.append(h('button', { class: 'slot filled pet', attrs: { type: 'button', title: t('army.removeFromDeck') }, on: { click: () => toggleDeck(d, ctx) } }, portrait(id), h('span', { class: 'cost', text: String(d.cost) })));
    } else slots.append(h('div', { class: 'slot empty', text: '+' }));
  }
  const extra = save.petSlots ?? 0;
  if (extra < PET_EXTRA_COSTS.length) slots.append(slotBuy('petSlots', PET_EXTRA_COSTS[extra], ctx));
  slots.style.setProperty('--cols', String(Math.min(petN + (extra < PET_EXTRA_COSTS.length ? 1 : 0), 6)));
  return h('div', { class: 'deck pet-deck' }, h('h2', { class: 'section-title', text: t('army.petDeck') }), slots, h('div', { class: 'deck-info', text: t('army.petDeckInfo', { n: pd.length, max: petN }) }));
}

function slotBuy(key: 'deckSlots' | 'defSlots' | 'petSlots', cost: number, ctx: HomeCtx): HTMLElement {
  const save = state.save!;
  const can = save.coins >= cost;
  const now = key === 'deckSlots' ? deckSizeOf(save) : key === 'defSlots' ? defSizeOf(save) : petSizeOf(save);
  const max = key === 'deckSlots' ? DECK_SIZE + DECK_EXTRA_COSTS.length : key === 'defSlots' ? DEFENSE_DECK_SIZE + DEF_EXTRA_COSTS.length : PET_DECK_SIZE + PET_EXTRA_COSTS.length;
  const label = key === 'deckSlots' ? t('up.slotDeck') : key === 'defSlots' ? t('up.slotDef') : t('up.slotPet');
  return attachInfoTip(h('button', {
    class: `slot buy${can ? '' : ' poor'}`,
    attrs: { type: 'button', title: t('army.slotBuyTip', { cost: fmt(cost) }), 'aria-label': t('army.slotBuyTip', { cost: fmt(cost) }) },
    on: {
      click: () => {
        if (state.save!.coins < cost) return toast(t('army.needCoins'), 'error');
        mutate((s) => { s.coins -= cost; s[key] = (s[key] ?? 0) + 1; }, true);
        toast(t('army.slotBought'), 'good');
        ctx.redraw();
      },
    },
  }, h('b', { text: '+' }), h('small', { text: `🪙 ${fmt(cost)}` })), () => [
    h('div', { class: 'tip-head' }, h('b', { text: `＋ ${label}` }), h('em', { text: `${now} → ${now + 1}` })),
    h('div', { class: 'up-body' }, upRow(label, `${now} → ${now + 1} (${t('up.max', { n: max })})`, 'up'), costRow(cost)),
    h('p', { class: 'cap-note', text: t('up.slotNote') }),
  ]);
}

/** nâng cấp số tướng tối đa (mang vào trận và cùng lúc trên chiến trường) bằng xu */
function generalCapPanel(ctx: HomeCtx): HTMLElement {
  const save = state.save!;
  const extra = save.genSlots ?? 0;
  const maxed = extra >= GENERAL_EXTRA_COSTS.length;
  const cap = generalCapOf(save);
  const cost = GENERAL_EXTRA_COSTS[extra] ?? 0;
  const can = save.coins >= cost;
  return h('section', { class: 'castle gen-cap' },
    h('div', { class: 'castle-ico', text: '👑' }),
    h('div', { class: 'castle-info' },
      h('b', { text: t('army.genCap') }),
      h('div', { class: 'castle-hp gen' }, h('span', { text: t('army.genCapNow', { n: cap }) }), maxed ? h('em', { text: t('army.castleMax') }) : h('em', { text: `→ ${cap + 1}` })),
      h('div', { class: 'castle-bar' }, h('i', { attrs: { style: `width:${(extra / GENERAL_EXTRA_COSTS.length) * 100}%` } })),
      h('small', { text: t('army.genCapNote') })),
    attachInfoTip(h('button', {
      class: `btn gold${maxed || !can ? ' disabled' : ''}`,
      text: maxed ? t('army.maxLevel') : `⬆ ${t('army.upgrade')} · 🪙 ${fmt(cost)}`,
      attrs: { type: 'button' },
      on: {
        click: () => {
          if (maxed) return;
          if (state.save!.coins < cost) return toast(t('army.needCoins'), 'error');
          mutate((s) => { s.coins -= cost; s.genSlots = (s.genSlots ?? 0) + 1; }, true);
          toast(t('army.genCapUp', { n: cap + 1 }), 'good');
          ctx.redraw();
        },
      },
    }), () => [
      h('div', { class: 'tip-head' }, h('b', { text: `👑 ${t('army.genCap')}` }), h('em', { text: t('up.level', { a: extra + 1, b: GENERAL_EXTRA_COSTS.length + 1 }) })),
      maxed
        ? h('div', { class: 'cap-max', text: t('up.maxedVal', { v: cap }) })
        : h('div', { class: 'up-body' }, upRow(t('up.genOnField'), `${cap} → ${cap + 1} (+1)`, 'up'), upRow(t('up.genInDeck'), `${MAX_GENERALS_IN_DECK + extra} → ${MAX_GENERALS_IN_DECK + extra + 1} (+1)`, 'up'), costRow(cost)),
      h('p', { class: 'cap-note', text: t('army.genCapNote') }),
    ]),
  );
}

/** nâng cấp máu thành trì (cờ nhà) bằng xu */
function castlePanel(ctx: HomeCtx): HTMLElement {
  const save = state.save!;
  const lv = save.flagLv ?? 0;
  const maxed = lv >= FLAG_MAX_LV;
  const cost = flagUpgradeCost(lv);
  const hp = (l: number) => Math.round(PLAYER_FLAG_HP * flagHpMul(l));
  const can = save.coins >= cost;
  return h('section', { class: 'castle' },
    h('div', { class: 'castle-ico', text: '🏯' }),
    h('div', { class: 'castle-info' },
      h('b', { text: t('army.castle') }),
      h('div', { class: 'castle-hp' }, h('span', { text: `❤ ${hp(lv)}` }), maxed ? h('em', { text: t('army.castleMax') }) : h('em', { text: `→ ${hp(lv + 1)} (+${hp(lv + 1) - hp(lv)})` })),
      h('div', { class: 'castle-bar' }, h('i', { attrs: { style: `width:${(lv / FLAG_MAX_LV) * 100}%` } })),
      h('small', { text: t('army.castleLv', { lv, max: FLAG_MAX_LV }) + ' · ' + t('army.castleNote') })),
    attachInfoTip(h('button', {
      class: `btn gold${maxed || !can ? ' disabled' : ''}`,
      text: maxed ? t('army.maxLevel') : `⬆ ${t('army.upgrade')} · 🪙 ${fmt(cost)}`,
      attrs: { type: 'button' },
      on: {
        click: () => {
          if (maxed) return;
          if (state.save!.coins < cost) return toast(t('army.needCoins'), 'error');
          mutate((s) => { s.coins -= cost; s.flagLv = (s.flagLv ?? 0) + 1; }, true);
          toast(t('army.castleUp', { hp: hp(lv + 1) }), 'good');
          ctx.redraw();
        },
      },
    }), () => [
      h('div', { class: 'tip-head' }, h('b', { text: `🏯 ${t('army.castle')}` }), h('em', { text: t('up.level', { a: lv, b: lv + 1 }) })),
      maxed
        ? h('div', { class: 'cap-max', text: t('up.maxedVal', { v: hp(lv) }) })
        : h('div', { class: 'up-body' }, upRow(`❤ ${t('up.hp')}`, `${hp(lv)} → ${hp(lv + 1)} (+${hp(lv + 1) - hp(lv)})`, 'up'), upRow(t('up.bossHp'), `${Math.round(hp(lv) * 1.8)} → ${Math.round(hp(lv + 1) * 1.8)}`, 'up'), costRow(cost)),
      h('p', { class: 'cap-note', text: t('army.castleNote') }),
    ]),
  );
}

// ───────────────────────── tooltip ô nâng cấp ─────────────────────────
const upRow = (label: string, val: string, cls = '') => h('div', { class: `up-row ${cls}` }, h('span', { text: label }), h('b', { text: val }));
const costRow = (cost: number) => upRow(t('up.cost'), `🪙 ${fmt(cost)}`, state.save!.coins >= cost ? 'ok' : 'poor');

/** các chỉ số tăng theo cấp: máu, sát thương (hoặc hồi máu / sức nổ) */
function scaledStats(d: UnitDef, mul: number): { key: string; icon: string; label: string; val: number }[] {
  const out: { key: string; icon: string; label: string; val: number }[] = [];
  if (d.hp > 1) out.push({ key: 'hp', icon: '❤', label: t('up.hp'), val: d.hp * mul });
  if (d.skill === 'heal' && d.kind !== 'defense') out.push({ key: 'heal', icon: '✚', label: t('up.heal'), val: 15 * mul });
  else if (d.kind === 'defense' && d.skill === 'altar') out.push({ key: 'heal', icon: '✚', label: t('up.heal'), val: d.dmg * mul });
  else if (d.dmg > 0) out.push({ key: 'atk', icon: d.skill === 'bomb' ? '💥' : '⚔', label: d.skill === 'bomb' ? t('up.blast') : t('up.atk'), val: d.dmg * mul });
  return out;
}

function unitUpgradeTip(d: UnitDef, lv: number): HTMLElement[] {
  const head = h('div', { class: 'tip-head' }, h('b', { text: `⬆ ${unitName(d)}` }), h('em', { text: lv >= MAX_LEVEL ? `Lv${lv} MAX` : `Lv${lv} → Lv${lv + 1}` }));
  if (lv >= MAX_LEVEL) return [head, h('div', { class: 'cap-max', text: t('up.maxed', { n: lv }) })];
  const a = scaledStats(d, levelMul(lv));
  const b = scaledStats(d, levelMul(lv + 1));
  const rows = b.map((s, i) => upRow(`${s.icon} ${s.label}`, `${Math.round(a[i].val)} → ${Math.round(s.val)} (+${Math.round(s.val - a[i].val)})`, 'up'));
  return [
    head,
    h('div', { class: 'up-body' }, ...rows, upRow(t('up.pct'), `+${Math.round((levelMul(lv + 1) / levelMul(lv) - 1) * 100)}%`, 'up'), costRow(upgradeCost(d, lv))),
    h('p', { class: 'cap-note', text: t('up.skillNote') }),
  ];
}

function unitUnlockTip(d: UnitDef): HTMLElement[] {
  const rows = scaledStats(d, 1).map((s) => upRow(`${s.icon} ${s.label}`, String(Math.round(s.val))));
  if (d.kind !== 'defense') rows.push(upRow(`👟 ${t('stat.spd')}`, String(d.speed)), upRow(`🎯 ${t('stat.rng')}`, d.range > 70 ? String(d.range) : t('stat.melee')));
  rows.push(upRow(`🛡 ${t('stat.armor')}`, String(d.armor)), upRow(t('up.cost'), `🪙 ${fmt(d.unlockCost)}`, state.save!.coins >= d.unlockCost ? 'ok' : 'poor'));
  return [
    h('div', { class: 'tip-head' }, h('b', { text: `🔓 ${unitName(d)}` }), h('em', { text: t('up.lv1') })),
    h('div', { class: 'up-body' }, ...rows),
    h('div', { class: 'tip-skill' }, h('b', { text: `✦ ${unitSkill(d)}` }), h('p', { text: unitDesc(d) })),
  ];
}

function unitCard(d: UnitDef, ctx: HomeCtx): HTMLElement {
  const save = state.save!;
  const lv = save.unlocked[d.id];
  const owned = lv !== undefined;
  const inDeck = save.deck.includes(d.id) || save.defDeck.includes(d.id) || (save.petDeck ?? []).includes(d.id);
  const actions = h('div', { class: 'card-actions' });

  if (!owned) {
    const can = save.coins >= d.unlockCost;
    actions.append(
      attachInfoTip(h('button', {
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
      }), () => unitUnlockTip(d)),
    );
  } else {
    const maxed = lv >= MAX_LEVEL;
    const cost = upgradeCost(d, lv);
    actions.append(
      h('button', { class: `btn ${inDeck ? 'ghost' : 'primary'}`, text: inDeck ? t('army.remove') : t('army.add'), attrs: { type: 'button' }, on: { click: () => toggleDeck(d, ctx) } }),
      attachInfoTip(h('button', {
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
      }), () => unitUpgradeTip(d, lv)),
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
  if (d.kind === 'pet') {
    const pd = save.petDeck ?? [];
    if (pd.includes(d.id)) mutate((s) => { s.petDeck = (s.petDeck ?? []).filter((x) => x !== d.id); });
    else {
      if (pd.length >= petSizeOf(save)) return toast(t('army.petDeckFull', { n: petSizeOf(save) }), 'error');
      mutate((s) => { (s.petDeck ??= []).push(d.id); });
    }
    return ctx.redraw();
  }
  if (d.kind === 'defense') {
    if (save.defDeck.includes(d.id)) mutate((s) => { s.defDeck = s.defDeck.filter((x) => x !== d.id); });
    else {
      if (save.defDeck.length >= defSizeOf(save)) return toast(t('army.defDeckFull', { n: defSizeOf(save) }), 'error');
      mutate((s) => { s.defDeck.push(d.id); });
    }
    return ctx.redraw();
  }
  const inDeck = save.deck.includes(d.id);
  if (inDeck) {
    if (save.deck.length <= 1) return toast(t('army.needOne'), 'error');
    mutate((s) => { s.deck = s.deck.filter((x) => x !== d.id); });
  } else {
    if (save.deck.length >= deckSizeOf(save)) return toast(t('army.deckFull'), 'error');
    if (d.kind === 'general' && save.deck.filter((x) => UNITS[x].kind === 'general').length >= generalCapOf(save)) {
      return toast(t('army.generalsFull'), 'error');
    }
    mutate((s) => { s.deck.push(d.id); });
  }
  ctx.redraw();
}
