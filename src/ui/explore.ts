import { h } from './dom';
import { t, unitName } from '../i18n';
import { faceUrl } from '../render/icons';
import { UNITS } from '../data/units';
import {
  EXPLORE_MAPS, attackable, buildGraph, buildNodeStation, edgeOpen, exploreKey, exploreMapDef, mapCompleteBonus, mineIncome, newExploreState, nodeReward, rulesFor, visibleNodes,
  type EGraph, type ENode, type ExploreLaunch, type ExploreMapDef, type ExploreRules, type ExploreState, type NodeType, type SpecialKind,
} from '../data/explore';
import { mutate, state } from '../state';
import { fmt, toast } from './common';
import type { HomeCtx } from './home';

// ───────────── màn Khám phá: danh sách bản đồ → đồ thị trạm của một bản đồ ─────────────

let selMap: number | null = null;
let selNode: number | null = null;
const graphCache = new Map<number, EGraph>();
const graphOf = (m: ExploreMapDef): EGraph => {
  let g = graphCache.get(m.n);
  if (!g) graphCache.set(m.n, (g = buildGraph(m)));
  return g;
};

/** quay lại một bản đồ sau trận */
export function focusExplore(mapN: number | null) {
  selMap = mapN;
  selNode = null;
}

const TYPE_ICON: Record<NodeType, string> = { city: '🏯', fortress: '🏰', mine: '⛏', camp: '⛺', tower: '🗼', special: '✦', boss: '👹' };
const SPECIAL_ICON: Record<SpecialKind, string> = { village: '🏘', bridge: '🌉', warm: '🔥', oasis: '🌴', port: '⚓', core: '☯', mana: '✨', ruin: '🏛', dry: '🪵', portal: '🌀' };
const DIFF_CLS = ['', 'easy', 'mid', 'hard', 'xhard'];

const iconOf = (nd: ENode) => (nd.type === 'special' ? SPECIAL_ICON[nd.special!] : TYPE_ICON[nd.type]);

/** khóa i18n tên loại trạm (pháo đài đổi tên theo bản đồ: cửa ải / thành bỏ hoang) */
function typeKey(map: ExploreMapDef, nd: ENode): string {
  if (nd.type === 'fortress') return map.n === 6 ? 'explore.type.pass' : map.n === 12 ? 'explore.type.ruincity' : 'explore.type.fortress';
  return `explore.type.${nd.type}`;
}
const nodeTitle = (map: ExploreMapDef, nd: ENode) => (nd.type === 'special' ? t(`explore.special.${nd.special}.name`) : t(typeKey(map, nd)));
const nodeName = (map: ExploreMapDef, nd: ENode) => (nd.type === 'city' || nd.type === 'boss' ? nodeTitle(map, nd) : `${nodeTitle(map, nd)} ${nd.i}`);

function stateOf(m: ExploreMapDef): ExploreState {
  const save = state.save!;
  return save.explore?.[exploreKey(m.n)] ?? newExploreState(graphOf(m));
}

/** dòng mô tả từng hiệu ứng đang áp vào trận */
function effectLines(r: ExploreRules): string[] {
  const pct = (v: number) => `${v >= 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}%`;
  const out: string[] = [];
  if (r.speedMul && r.speedMul !== 1) out.push(`🐢 ${t('explore.eff.speed', { v: pct(r.speedMul) })}`);
  if (r.allySpeedMul && r.allySpeedMul !== 1) out.push(`👟 ${t('explore.eff.allySpeed', { v: pct(r.allySpeedMul) })}`);
  if (r.costMul && r.costMul !== 1) out.push(`💧 ${t('explore.eff.cost', { v: pct(r.costMul) })}`);
  if (r.startGold) out.push(`💰 ${t('explore.eff.startGold', { n: r.startGold })}`);
  if (r.incomeMul && r.incomeMul !== 1) out.push(`📈 ${t('explore.eff.income', { v: pct(r.incomeMul) })}`);
  if (r.enemyIncomeMul && r.enemyIncomeMul !== 1) out.push(`✂ ${t('explore.eff.enemyIncome', { v: pct(r.enemyIncomeMul) })}`);
  if (r.flagHpMul && r.flagHpMul !== 1) out.push(`🏯 ${t('explore.eff.flagHp', { v: pct(r.flagHpMul) })}`);
  if (r.dmgMul && r.dmgMul !== 1) out.push(`⚔ ${t('explore.eff.dmg', { v: pct(r.dmgMul) })}`);
  if (r.hpMul && r.hpMul !== 1) out.push(`❤ ${t('explore.eff.hp', { v: pct(r.hpMul) })}`);
  if (r.defHpMul && r.defHpMul !== 1) out.push(`🛡 ${t('explore.eff.defHp', { v: pct(r.defHpMul) })}`);
  if (r.flagRegen) out.push(`🔥 ${t('explore.eff.regen', { n: Math.round(r.flagRegen * 6000) / 100 })}`);
  if (r.hazard) out.push(r.hazard.kind === 'fire' ? `🌋 ${t('explore.eff.hazardFire', { s: r.hazard.every })}` : `☠ ${t('explore.eff.hazardPoison', { s: r.hazard.every })}`);
  if (r.ambush) out.push(`🗡 ${t('explore.eff.ambush', { s: r.ambush.at, n: r.ambush.n })}`);
  return out;
}

const namer = (type: NodeType, special: SpecialKind | undefined, index: number, map: ExploreMapDef) => {
  const nd = { type, special, i: index } as ENode;
  return { name: nodeName(map, nd), sub: t(`explore.map.${map.n}.name`), desc: type === 'special' ? t(`explore.special.${special}.desc`) : t(`explore.typeDesc.${type}`) };
};

// ───────────────────────── danh sách bản đồ ─────────────────────────
function mapList(ctx: HomeCtx): HTMLElement {
  const save = state.save!;
  const cards = EXPLORE_MAPS.map((m) => {
    const st = save.explore?.[exploreKey(m.n)];
    const g = graphOf(m);
    const caps = st ? st.cap.length : 0;
    return h('button', {
      class: `xp-map d${m.diff}${st?.done ? ' done' : ''}`, attrs: { type: 'button' },
      on: { click: () => { selMap = m.n; selNode = null; ctx.redraw(); } },
    },
    h('div', { class: 'xp-map-top' },
      h('i', { class: 'xp-map-ico', text: m.icon }),
      h('div', { class: 'xp-map-id' }, h('b', { text: t(`explore.map.${m.n}.name`) }),
        h('div', { class: 'xp-badges' },
          h('span', { class: `xp-diff ${DIFF_CLS[m.diff]}`, text: t(`explore.diff.${m.diff}`) }),
          h('span', { class: 'xp-range', text: t('explore.range', { a: m.range[0], b: m.range[1] }) }),
          st?.done ? h('span', { class: 'xp-done', text: `✔ ${t('explore.done')}` }) : null))),
    h('p', { class: 'xp-map-desc', text: t(`explore.map.${m.n}.desc`) }),
    h('p', { class: 'xp-map-mech', text: `⚙ ${t(`explore.map.${m.n}.mech`)}` }),
    h('div', { class: 'xp-prog' }, h('i', { attrs: { style: `width:${Math.min(100, (caps / g.nodes.length) * 100)}%` } }), h('span', { text: t('explore.progress', { a: caps, b: g.nodes.length }) })));
  });
  return h('div', { class: 'xp-wrap' },
    h('div', { class: 'xp-head' }, h('h2', { text: `🧭 ${t('explore.title')}` }), h('p', { text: t('explore.sub') })),
    h('div', { class: 'xp-maps' }, ...cards));
}

// ───────────────────────── bản đồ một vùng ─────────────────────────
function mapView(ctx: HomeCtx, map: ExploreMapDef): HTMLElement {
  const g = graphOf(map);
  const st = stateOf(map);
  const atk = attackable(g, st);
  const vis = visibleNodes(g, st);
  const has = (i: number) => st.cap.includes(i);
  const hasCore = st.cap.some((i) => g.nodes[i].special === 'core');

  // ── thanh trên: quay lại, tên, tiến độ, mỏ, nhiệt độ
  const mine = mineIncome(map, g, st);
  const bar = h('div', { class: 'xp-bar' },
    h('button', { class: 'btn ghost sm', text: `‹ ${t('explore.back')}`, attrs: { type: 'button' }, on: { click: () => { selMap = null; selNode = null; ctx.redraw(); } } }),
    h('div', { class: 'xp-bar-title' },
      h('b', { text: `${map.icon} ${t(`explore.map.${map.n}.name`)}` }),
      h('span', { class: `xp-diff ${DIFF_CLS[map.diff]}`, text: t(`explore.diff.${map.diff}`) }),
      h('small', { text: t('explore.progress', { a: st.cap.length, b: g.nodes.length }) })));
  if (mine.mines) {
    bar.append(h('button', {
      class: `btn gold sm${mine.pending < 1 ? ' disabled' : ''}`, attrs: { type: 'button', title: t('explore.mineTip', { n: mine.perHour }) },
      text: `⛏ ${t('explore.claim', { n: fmt(mine.pending) })}`,
      on: { click: () => claimMine(map, ctx) },
    }));
  }
  if (map.layout === 'twin') {
    bar.append(h('button', {
      class: `btn ghost sm${hasCore ? '' : ' disabled'}`, attrs: { type: 'button', title: hasCore ? t('explore.tempToggleTip') : t('explore.tempAutoTip') },
      text: `${st.temp === 'fire' ? '🔥' : '❄'} ${t(`explore.temp.${st.temp ?? 'ice'}`)}`,
      on: { click: () => { if (!hasCore) return toast(t('explore.tempAutoTip'), 'info'); mutate((s) => { const x = s.explore![exploreKey(map.n)]; x.temp = x.temp === 'fire' ? 'ice' : 'fire'; }, true); ctx.redraw(); } },
    }));
  }
  if (st.done) {
    bar.append(h('button', {
      class: 'btn ghost sm', text: `↻ ${t('explore.reset')}`, attrs: { type: 'button' },
      on: { click: () => { if (window.confirm(t('explore.resetConfirm'))) resetMap(map, ctx); } },
    }));
  }

  // ── bản đồ
  const sel = selNode !== null && g.nodes[selNode] ? selNode : null;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'xp-lines');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  for (const e of g.edges) {
    const a = g.nodes[e.a];
    const b = g.nodes[e.b];
    const open = edgeOpen(g, e, st);
    const both = has(e.a) && has(e.b);
    const live = open && ((has(e.a) && atk.has(e.b)) || (has(e.b) && atk.has(e.a)));
    const seen = vis.has(e.a) || vis.has(e.b);
    const ln = document.createElementNS(svgNS, 'line');
    ln.setAttribute('x1', String(a.x * 100));
    ln.setAttribute('y1', String(a.y * 100));
    ln.setAttribute('x2', String(b.x * 100));
    ln.setAttribute('y2', String(b.y * 100));
    ln.setAttribute('class', `xe${both ? ' own' : live ? ' live' : ''}${!open ? ' shut' : ''}${e.kind ? ` ${e.kind}` : ''}${seen ? '' : ' dim'}`);
    ln.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(ln);
  }
  const canvas = h('div', { class: `xp-canvas xt-${map.theme} xl-${map.layout}` }, svg);
  for (const nd of g.nodes) {
    const owned = has(nd.i);
    const canHit = atk.has(nd.i);
    const seen = vis.has(nd.i) || owned;
    const face = nd.type === 'boss' && seen && nd.bossId ? faceUrl(nd.bossId, 1) : '';
    const node = h('button', {
      class: `xp-node t-${nd.type}${owned ? ' owned' : canHit ? ' hit' : seen ? ' seen' : ' fog'}${sel === nd.i ? ' sel' : ''}${nd.side ? ` s-${nd.side}` : ''}`,
      attrs: { type: 'button', style: `left:${nd.x * 100}%;top:${nd.y * 100}%`, 'aria-label': seen ? nodeName(map, nd) : '?' },
      on: { click: () => { selNode = nd.i; ctx.redraw(); } },
    }, face ? h('img', { attrs: { src: face, alt: '', draggable: 'false' } }) : h('i', { text: seen ? iconOf(nd) : '?' }));
    if (seen && nd.type !== 'boss') node.append(h('small', { class: 'xp-n', text: String(nd.i) }));
    canvas.append(node);
  }

  return h('div', { class: 'xp-wrap xp-view' }, bar, h('div', { class: 'xp-body' }, canvas, nodePanel(ctx, map, g, st, sel, atk, vis)));
}

function claimMine(map: ExploreMapDef, ctx: HomeCtx) {
  const g = graphOf(map);
  const st = stateOf(map);
  const m = mineIncome(map, g, st);
  if (m.pending < 1) return void toast(t('explore.nothingToClaim'), 'info');
  mutate((s) => {
    const x = (s.explore ??= {})[exploreKey(map.n)] ?? newExploreState(g);
    s.explore[exploreKey(map.n)] = x;
    s.coins += m.pending;
    x.claim = Date.now();
  }, true);
  toast(t('explore.claimed', { n: fmt(m.pending) }), 'good');
  ctx.redraw();
}

function resetMap(map: ExploreMapDef, ctx: HomeCtx) {
  const g = graphOf(map);
  mutate((s) => {
    const old = s.explore?.[exploreKey(map.n)];
    (s.explore ??= {})[exploreKey(map.n)] = { ...newExploreState(g), done: true, run: (old?.run ?? 0) + 1 };
  }, true);
  selNode = null;
  ctx.redraw();
}

// ───────────────────────── bảng thông tin trạm ─────────────────────────
function nodePanel(ctx: HomeCtx, map: ExploreMapDef, g: EGraph, st: ExploreState, sel: number | null, atk: Set<number>, vis: Set<number>): HTMLElement {
  const panel = h('aside', { class: 'xp-side' });
  const legend = h('div', { class: 'xp-legend' },
    ...(['city', 'fortress', 'mine', 'camp', 'tower'] as NodeType[]).map((k) => h('div', { class: 'xp-leg' }, h('i', { text: TYPE_ICON[k] }), h('b', { text: t(`explore.type.${k}`) }), h('small', { text: t(`explore.use.${k}`) }))));
  if (sel === null) {
    panel.append(h('div', { class: 'xp-hint', text: t('explore.pick') }), h('div', { class: 'xp-mech' }, h('b', { text: `⚙ ${t('explore.mechanic')}` }), h('p', { text: t(`explore.map.${map.n}.mech`) })), legend);
    const eff = effectLines(rulesFor(map, g, st));
    if (eff.length) panel.append(h('div', { class: 'xp-eff' }, h('b', { text: t('explore.effectsNow') }), ...eff.map((l) => h('div', { text: l }))));
    return panel;
  }
  const nd = g.nodes[sel];
  const owned = st.cap.includes(sel);
  const seen = vis.has(sel) || owned;
  const head = h('div', { class: 'xp-n-head' },
    h('i', { text: seen ? iconOf(nd) : '?' }),
    h('div', {}, h('b', { text: seen ? nodeName(map, nd) : t('explore.unknown') }), h('small', { text: seen ? (nd.type === 'special' ? t(`explore.special.${nd.special}.name`) : t(`explore.type.${nd.type === 'fortress' ? 'fortress' : nd.type}`)) : '' })));
  panel.append(head);
  if (!seen) {
    panel.append(h('p', { class: 'xp-note', text: t('explore.fogNote') }));
    return panel;
  }
  panel.append(h('p', { class: 'xp-note', text: nd.type === 'special' ? t(`explore.special.${nd.special}.desc`) : t(`explore.typeDesc.${nd.type}`) }));
  if (owned) {
    panel.append(h('div', { class: 'xp-owned', text: `✔ ${t('explore.captured')}` }), h('p', { class: 'xp-gain', text: `🎁 ${gainText(map, nd)}` }));
    return panel;
  }
  // thông tin trận
  const { station, rules } = buildNodeStation(map, g, st, sel, namer);
  const gens = station.deck.filter((id) => UNITS[id]?.kind === 'general').slice(0, 4);
  const lead = station.boss && station.bossId ? [station.bossId] : gens;
  panel.append(
    h('div', { class: 'xp-info' },
      h('span', { class: 'chip', text: `⚔ ${t('explore.enemyPow', { n: Math.round(station.power * 100) })}` }),
      h('span', { class: 'chip', text: `☠ ${t('map.units', { n: station.units })}` }),
      station.castle ? h('span', { class: 'chip warn', text: `🏯 ${t('env.castle.short')}` }) : null,
      station.mod ? h('span', { class: 'chip warn', text: `⚠ ${t(`mod.${station.mod}`)}` }) : null,
      station.river !== undefined ? h('span', { class: 'chip', text: `🌊 ${t('env.river')}` }) : null),
    ...(lead.length ? [h('div', { class: 'xp-foes' }, ...lead.map((id) => h('span', { class: 'xp-foe', attrs: { title: unitName(UNITS[id]) } }, h('img', { attrs: { src: faceUrl(id, 1), alt: '', draggable: 'false' } }))))] : []),
    h('div', { class: 'xp-reward', text: `🪙 +${fmt(nodeReward(map, nd, !!st.done))}${nd.type === 'boss' && !st.done ? ` · 🎉 +${fmt(mapCompleteBonus(map, false))}` : ''}` }),
    h('p', { class: 'xp-gain', text: `🎁 ${gainText(map, nd)}` }));
  const eff = effectLines(rules);
  if (eff.length) panel.append(h('div', { class: 'xp-eff' }, h('b', { text: t('explore.effectsNow') }), ...eff.map((l) => h('div', { text: l }))));
  const can = atk.has(sel);
  if (can) {
    panel.append(h('button', {
      class: 'btn primary big', text: `⚔ ${t('explore.attack')}`, attrs: { type: 'button' },
      on: { click: () => { const launch: ExploreLaunch = { map: map.n, node: sel, station, rules, label: `${t(`explore.map.${map.n}.name`)} · ${nodeName(map, nd)}` }; ctx.onExplore(launch); } },
    }));
  } else {
    // vì sao chưa đánh được
    const gated = g.edges.find((e) => (e.a === sel || e.b === sel) && !edgeOpen(g, e, st) && (st.cap.includes(e.a) || st.cap.includes(e.b)));
    let why = t('explore.notAdj');
    if (gated?.gate) why = 'node' in gated.gate ? t('explore.gateNode', { name: nodeName(map, g.nodes[gated.gate.node]) }) : t('explore.gateTemp', { t: t(`explore.temp.${gated.gate.temp}`) });
    panel.append(h('p', { class: 'xp-why', text: `🔒 ${why}` }));
  }
  return panel;
}

/** phần thưởng/ưu đãi khi chiếm trạm */
function gainText(map: ExploreMapDef, nd: ENode): string {
  switch (nd.type) {
    case 'city': return t('explore.gain.city');
    case 'fortress': return t('explore.gain.fortress');
    case 'mine': return map.mineWeapon ? t('explore.gain.mineWeapon') : t('explore.gain.mine', { n: [0, 40, 60, 85, 120][map.diff] });
    case 'camp': return t('explore.gain.camp');
    case 'tower': return t('explore.gain.tower');
    case 'boss': return t('explore.gain.boss');
    default: return t(`explore.gain.${nd.special}`);
  }
}

export function explorePanel(ctx: HomeCtx): HTMLElement {
  if (selMap !== null) return mapView(ctx, exploreMapDef(selMap));
  return mapList(ctx);
}
