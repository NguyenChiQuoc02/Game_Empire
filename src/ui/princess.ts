import { h } from './dom';
import { t, unitName } from '../i18n';
import { faceUrl } from '../render/icons';
import { UNITS } from '../data/units';
import {
  ALLOC_POINTS, EVENTS, ROUTE_THEME, PLACE_BOSS, RESCUE_NODE_ICON, ROUTE_ICON, START_MORALE, applyBattle, arrivedHome, buildPrincessGraph, canChoose, eventFor, fateOf, finishEventNode, moveOptions, newRun,
  payStep, princessBattle, princessKnown, resolveEvent, rewardGeneral, summarize, useMedicine, visibleSet,
  hintsOf, type BattleOutcome, type EventChoice, type PGraph, type PNode, type PrincessRun, type PrincessSave, type PType,
} from '../data/princess';
import type { ExploreLaunch } from '../data/explore';
import { getApp } from '../render/app';
import { peekMapArt, renderMapArt, type MapSpec } from '../render/mapArt';
import { mutate, state } from '../state';
import { fmt, openModal, toast } from './common';
import type { HomeCtx } from './home';

// ───────────── màn Giải cứu công chúa ─────────────

let screen: 'home' | 'prepare' = 'home';
let prepGeneral = '';
let prepAlloc: [number, number, number] = [4, 3, 3];
let selNode: number | null = null;
const graphs = new Map<number, PGraph>();
const graphOf = (seed: number) => {
  let g = graphs.get(seed);
  if (!g) graphs.set(seed, (g = buildPrincessGraph(seed)));
  return g;
};

export const PRINCESS_MAP_N = 14;

const save = () => state.save!;
const princessOf = (): PrincessSave => save().princess ?? { plays: 0, clears: 0 };

/** thay đổi lượt chơi hiện tại và lưu */
function mutateRun(fn: (r: PrincessRun, p: PrincessSave) => void, immediate = false) {
  mutate((s) => {
    const p = (s.princess ??= { plays: 0, clears: 0 });
    if (p.run) fn(p.run, p);
  }, immediate);
}

const nodeName = (nd: PNode, run?: PrincessRun): string => {
  const base = t(`princess.node.${nd.type}`);
  if (nd.type === 'camp' || nd.type === 'fort' || nd.type === 'event' || nd.type === 'contested' || nd.type === 'bridge' || nd.type === 'treasure') return `${base} ${nd.i}`;
  if (nd.type === 'escort') return `${base} ${nd.retreat! + 1}.${nd.step + 1}`;
  void run;
  return base;
};
const namer = (type: string, _s: unknown, index: number) => ({ name: nodeName({ type: (type === 'fortress' ? 'fort' : type) as PType, i: index, retreat: 0, step: 0 } as PNode), sub: t('princess.title'), desc: '' });

// ───────────────────────── màn chính ─────────────────────────
export function princessPanel(ctx: HomeCtx): HTMLElement {
  const run = princessOf().run;
  if (run?.over) {
    // lượt chơi đã kết thúc (hết sĩ khí sau trận): chốt kết quả
    setTimeout(() => endRun(ctx, run.over === 'win', false), 0);
    return h('div', { class: 'xp-wrap' });
  }
  if (run) return runView(ctx, run);
  return screen === 'prepare' ? prepareView(ctx) : landing(ctx);
}

function landing(ctx: HomeCtx): HTMLElement {
  const p = princessOf();
  const steps = [1, 2, 3, 4, 5].map((i) => h('li', {}, h('b', { text: t(`princess.step${i}.t`) }), h('span', { text: t(`princess.step${i}.d`) })));
  const nodes = ['lock', 'dungeon', 'bridge', 'secret', 'contested', 'oneway', 'pass'].map((k) => h('li', { text: t(`princess.kind.${k}`) }));
  return h('div', { class: 'xp-wrap pr-wrap' },
    h('div', { class: 'xp-head' }, h('h2', { text: `👸 ${t('princess.title')}` }), h('p', { text: t('princess.sub') })),
    h('div', { class: 'pr-hero' },
      h('i', { text: '👸' }),
      h('div', {}, h('b', { text: t('princess.stats', { plays: p.plays, clears: p.clears }) }), h('small', { text: p.best ? t('princess.best', { rank: p.best.rank, score: p.best.score }) : t('princess.noBest') })),
      h('button', { class: 'btn primary big', text: `⚔ ${t('princess.start')}`, attrs: { type: 'button' }, on: { click: () => { screen = 'prepare'; prepGeneral = ''; ctx.redraw(); } } })),
    h('div', { class: 'pr-cols' },
      h('section', { class: 'pr-card' }, h('h3', { text: t('princess.flow') }), h('ol', { class: 'pr-steps' }, ...steps)),
      h('section', { class: 'pr-card' }, h('h3', { text: t('princess.kinds') }), h('ul', { class: 'pr-kinds' }, ...nodes), h('p', { class: 'xp-note', text: t('princess.fateNote') }))));
}

// ───────────────────────── chuẩn bị quân đội ─────────────────────────
function prepareView(ctx: HomeCtx): HTMLElement {
  const s = save();
  const gens = Object.keys(s.unlocked).map((id) => UNITS[id]).filter((u) => u && u.kind === 'general');
  if (!prepGeneral || !gens.some((g) => g.id === prepGeneral)) prepGeneral = gens[0]?.id ?? '';
  const spent = prepAlloc[0] + prepAlloc[1] + prepAlloc[2];
  const rows = [0, 1, 2].map((k) => h('div', { class: 'pr-alloc' },
    h('div', { class: 'pr-alloc-t' }, h('b', { text: `${['⚔', '🍖', '🔭'][k]} ${t(`princess.alloc.${k}`)}` }), h('small', { text: t(`princess.alloc.${k}.d`, { n: prepAlloc[k] }) })),
    h('button', { class: 'btn ghost sm', text: '−', attrs: { type: 'button' }, on: { click: () => { if (prepAlloc[k] > 0) { prepAlloc[k]--; ctx.redraw(); } } } }),
    h('b', { class: 'pr-alloc-n', text: String(prepAlloc[k]) }),
    h('button', { class: `btn ghost sm${spent >= ALLOC_POINTS ? ' disabled' : ''}`, text: '+', attrs: { type: 'button' }, on: { click: () => { if (spent < ALLOC_POINTS) { prepAlloc[k]++; ctx.redraw(); } } } })));
  return h('div', { class: 'xp-wrap pr-wrap' },
    h('div', { class: 'xp-bar' },
      h('button', { class: 'btn ghost sm', text: `‹ ${t('princess.back')}`, attrs: { type: 'button' }, on: { click: () => { screen = 'home'; ctx.redraw(); } } }),
      h('div', { class: 'xp-bar-title' }, h('b', { text: `🏯 ${t('princess.prepare')}` }))),
    h('p', { class: 'xp-note', text: t('princess.prepareNote') }),
    h('section', { class: 'pr-card' }, h('h3', { text: t('princess.pickGeneral') }),
      h('div', { class: 'pr-gens' }, ...gens.map((g) => h('button', {
        class: `pr-gen${prepGeneral === g.id ? ' on' : ''}`, attrs: { type: 'button', title: unitName(g) },
        on: { click: () => { prepGeneral = g.id; ctx.redraw(); } },
      }, h('img', { attrs: { src: faceUrl(g.id, 0), alt: '', draggable: 'false' } }), h('span', { text: unitName(g) }))))),
    h('section', { class: 'pr-card' }, h('h3', { text: `${t('princess.allocate')} (${ALLOC_POINTS - spent}/${ALLOC_POINTS})` }), ...rows),
    h('div', { class: 'pr-note' }, `🎖 ${t('princess.startTroops')}`),
    h('button', {
      class: `btn primary big${prepGeneral ? '' : ' disabled'}`, text: `🚩 ${t('princess.go')}`, attrs: { type: 'button' },
      on: { click: () => { if (!prepGeneral) return; startRun(ctx); } },
    }));
}

function startRun(ctx: HomeCtx) {
  const run = newRun(prepGeneral, [...prepAlloc] as [number, number, number]);
  mutate((s) => { (s.princess ??= { plays: 0, clears: 0 }).run = run; }, true);
  screen = 'home';
  selNode = null;
  ctx.redraw();
}

// ───────────────────────── tranh nền bản đồ (vẽ theo đồ thị của lượt chơi) ─────────────────────────
const artJobs = new Map<string, Promise<string>>();

/** mô tả tranh nền: địa hình theo lộ, đường đi theo đúng các cạnh của đồ thị, trang trí theo hạt giống */
function artSpec(g: PGraph, seed: number, cw: number, ch: number): MapSpec {
  const order = [g.start, ...g.nodes.filter((n) => n.i !== g.start && n.i !== g.boss).map((n) => n.i), g.boss];
  const idx = new Map(order.map((n, i) => [n, i]));
  const themeOf = (n: PNode) => (n.type === 'gate' || n.type === 'hall' || n.type === 'boss' ? 'throne' as const : n.type === 'pass' ? 'stone' as const : n.type === 'escort' || n.type === 'dungeon' || n.type === 'secret' ? 'night' as const : n.route >= 0 ? ROUTE_THEME[n.route] : 'plains' as const);
  const mid = order.slice(1, -1).map((i) => g.nodes[i]);
  return {
    w: cw, h: ch,
    stations: mid.map((n) => [n.x, n.y] as [number, number]),
    themes: mid.map(themeOf),
    start: [g.nodes[g.start].x, g.nodes[g.start].y],
    end: [g.nodes[g.boss].x, g.nodes[g.boss].y],
    edges: g.edges.map((e) => [idx.get(e.a)!, idx.get(e.b)!] as [number, number]),
    seed: seed % 99991,
    res: Math.max(1, Math.min(2.4, 4096 / Math.max(cw, ch))),
  };
}

function paintArt(canvas: HTMLElement, g: PGraph, seed: number, cw: number, ch: number) {
  const spec = artSpec(g, seed, cw, ch);
  const set = (url: string) => {
    canvas.style.backgroundImage = `url(${url})`;
    canvas.style.backgroundSize = '100% 100%';
  };
  const cached = peekMapArt(spec);
  if (cached) return set(cached);
  const app = getApp();
  if (!app) return;
  const key = `${seed}|${cw}|${ch}`;
  let job = artJobs.get(key);
  if (!job) artJobs.set(key, (job = renderMapArt(app, spec)));
  void job.then(set).catch(() => artJobs.delete(key));
}

// ───────────────────────── bản đồ kéo / phóng to như Google Maps ─────────────────────────
/** trạng thái khung nhìn (giữ qua các lần vẽ lại): kéo để di chuyển, cuộn chuột / chụm hai ngón để phóng to thu nhỏ */
const view = { seed: -1, x: 0, y: 0, k: 1 };
/** đích mà khung nhìn đang lướt tới (cuộn chuột, nút, quán tính khi thả tay đều chỉ đặt đích rồi để vòng lặp làm mượt) */
const goal = { x: 0, y: 0, k: 1 };
/** vừa kéo bản đồ: bỏ qua cú chạm kết thúc kéo để không chọn nhầm trạm */
let viewMoved = false;
const K_MIN = 0.3;
const K_MAX = 1.9;

function makeViewport(canvas: HTMLElement, cw: number, ch: number, seed: number, here: PNode): HTMLElement {
  const vp = h('div', { class: 'pr-viewport' }, canvas);
  let raf = 0;
  const clampGoal = () => {
    const w = vp.clientWidth;
    const hh = vp.clientHeight;
    const m = 120; // luôn chừa lại một phần bản đồ trong khung
    goal.k = Math.min(K_MAX, Math.max(K_MIN, goal.k));
    goal.x = Math.min(m, Math.max(w - cw * goal.k - m, goal.x));
    goal.y = Math.min(m, Math.max(hh - ch * goal.k - m, goal.y));
  };
  const paint = () => {
    canvas.style.transform = `translate3d(${view.x.toFixed(2)}px, ${view.y.toFixed(2)}px, 0) scale(${view.k.toFixed(4)})`;
  };
  /** vòng lặp làm mượt: tiến dần về đích; xong thì bỏ will-change để chữ và biểu tượng vẽ lại sắc nét */
  const loop = () => {
    raf = 0;
    const f = 0.22;
    view.x += (goal.x - view.x) * f;
    view.y += (goal.y - view.y) * f;
    view.k += (goal.k - view.k) * f;
    const done = Math.abs(goal.x - view.x) < 0.15 && Math.abs(goal.y - view.y) < 0.15 && Math.abs(goal.k - view.k) < 0.0008;
    if (done) {
      view.x = goal.x;
      view.y = goal.y;
      view.k = goal.k;
      canvas.classList.remove('moving');
    }
    paint();
    if (!done) raf = requestAnimationFrame(loop);
  };
  const go = () => {
    clampGoal();
    canvas.classList.add('moving');
    if (!raf) raf = requestAnimationFrame(loop);
  };
  /** đặt ngay (không lướt): khi đang kéo tay để bản đồ bám sát ngón tay */
  const snap = () => {
    clampGoal();
    view.x = goal.x;
    view.y = goal.y;
    view.k = goal.k;
    canvas.classList.add('moving');
    paint();
  };
  const settle = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };
  const zoomAt = (px: number, py: number, nk: number) => {
    const k = Math.min(K_MAX, Math.max(K_MIN, nk));
    goal.x = px - ((px - goal.x) / goal.k) * k;
    goal.y = py - ((py - goal.y) / goal.k) * k;
    goal.k = k;
    go();
  };
  const focus = (n: PNode, k: number, instant = false) => {
    goal.k = k;
    goal.x = vp.clientWidth / 2 - n.x * cw * k;
    goal.y = vp.clientHeight / 2 - n.y * ch * k;
    if (instant) { snap(); settle(); } else go();
  };
  const fit = () => {
    const k = Math.min(1, Math.min(vp.clientWidth / cw, vp.clientHeight / ch));
    goal.k = k;
    goal.x = (vp.clientWidth - cw * k) / 2;
    goal.y = (vp.clientHeight - ch * k) / 2;
    go();
  };
  // khởi tạo: lượt mới thì phủ kín khung và căn giữa vị trí của bạn; lượt đang chơi thì giữ nguyên chỗ đã kéo
  requestAnimationFrame(() => {
    if (!vp.isConnected) return;
    if (view.seed !== seed) {
      view.seed = seed;
      focus(here, Math.max(0.7, Math.min(1, Math.max(vp.clientWidth / cw, vp.clientHeight / ch))), true);
    } else {
      goal.x = view.x; goal.y = view.y; goal.k = view.k;
      snap();
      settle();
    }
  });

  const pts = new Map<number, { x: number; y: number }>();
  let down: { x: number; y: number; gx: number; gy: number } | null = null;
  let pinch = 0;
  // lấy mẫu vận tốc để thả tay có quán tính
  const samples: { t: number; x: number; y: number }[] = [];
  const local = (e: PointerEvent) => {
    const r = vp.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  vp.addEventListener('pointerdown', (e) => {
    pts.set(e.pointerId, local(e));
    if (pts.size === 1) {
      down = { ...local(e), gx: goal.x, gy: goal.y };
      samples.length = 0;
      goal.x = view.x; goal.y = view.y; goal.k = view.k; // chạm vào để dừng ngay đà trôi
    }
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
    viewMoved = false;
  });
  vp.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const p = local(e);
    pts.set(e.pointerId, p);
    if (pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) {
        const k = Math.min(K_MAX, Math.max(K_MIN, view.k * (d / pinch)));
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        goal.x = cx - ((cx - view.x) / view.k) * k;
        goal.y = cy - ((cy - view.y) / view.k) * k;
        goal.k = k;
        snap();
      }
      pinch = d;
      viewMoved = true;
      return;
    }
    if (!down) return;
    const dx = p.x - down.x;
    const dy = p.y - down.y;
    if (!viewMoved && Math.hypot(dx, dy) < 6) return;
    if (!viewMoved) {
      viewMoved = true;
      try { vp.setPointerCapture(e.pointerId); } catch { /* bỏ qua */ }
      vp.classList.add('drag');
    }
    goal.x = down.gx + dx;
    goal.y = down.gy + dy;
    snap();
    const now = performance.now();
    samples.push({ t: now, x: p.x, y: p.y });
    while (samples.length > 2 && now - samples[0].t > 90) samples.shift();
  });
  const end = (e: PointerEvent) => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = 0;
    if (pts.size === 0) {
      // quán tính: lướt thêm một đoạn theo vận tốc lúc thả tay
      if (viewMoved && samples.length >= 2) {
        const a = samples[0];
        const b = samples[samples.length - 1];
        const dt = Math.max(16, b.t - a.t);
        if (performance.now() - b.t < 80) {
          goal.x = view.x + ((b.x - a.x) / dt) * 260;
          goal.y = view.y + ((b.y - a.y) / dt) * 260;
          go();
        }
      } else settle();
      down = null;
      vp.classList.remove('drag');
      setTimeout(() => { viewMoved = false; }, 0); // cho cú click ngay sau khi kéo trôi qua rồi mới cho chọn trạm lại
    } else if (pts.size === 1) {
      const [only] = [...pts.values()];
      down = { ...only, gx: view.x, gy: view.y };
    }
  };
  vp.addEventListener('pointerup', end);
  vp.addEventListener('pointercancel', end);
  vp.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = vp.getBoundingClientRect();
    // chuột và bàn di có đơn vị cuộn khác nhau: chuẩn hóa rồi giới hạn mỗi nấc để không nhảy
    const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
    zoomAt(e.clientX - r.left, e.clientY - r.top, goal.k * Math.exp(-Math.max(-240, Math.min(240, dy)) * 0.0016));
  }, { passive: false });
  vp.addEventListener('dblclick', (e) => {
    const r = vp.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, goal.k * 1.6);
  });
  const btn = (txt: string, tip: string, fn: () => void) => h('button', { class: 'pr-zoom-btn', text: txt, attrs: { type: 'button', title: tip, 'aria-label': tip }, on: { click: (e) => { e.stopPropagation(); fn(); } } });
  const stop = (e: Event) => e.stopPropagation();
  const ctl = h('div', { class: 'pr-zoom' },
    btn('+', t('princess.zoomIn'), () => zoomAt(vp.clientWidth / 2, vp.clientHeight / 2, goal.k * 1.35)),
    btn('−', t('princess.zoomOut'), () => zoomAt(vp.clientWidth / 2, vp.clientHeight / 2, goal.k / 1.35)),
    btn('◎', t('princess.zoomHere'), () => focus(here, 0.95)),
    btn('⤢', t('princess.zoomFit'), fit));
  ctl.addEventListener('pointerdown', stop);
  vp.append(ctl, h('div', { class: 'pr-viewport-hint', text: t('princess.mapHint') }));
  return vp;
}

// ───────────────────────── bản đồ của lượt chơi ─────────────────────────
function runView(ctx: HomeCtx, run: PrincessRun): HTMLElement {
  const g = graphOf(run.seed);
  const vis = visibleSet(g, run);
  const opts = moveOptions(g, run);
  const optMap = new Map(opts.map((o) => [o.node, o]));
  const known = princessKnown(run);
  const fate = fateOf(run.seed);

  const bar = h('div', { class: 'pr-hud' },
    h('div', { class: 'pr-res' },
      h('div', { class: 'pr-morale', attrs: { title: t('princess.morale') } }, h('i', { attrs: { style: `width:${Math.max(0, (run.morale / START_MORALE) * 100)}%` } }), h('span', { text: `🛡 ${run.morale}` })),
      h('span', { class: `pr-chip${run.food <= 2 ? ' low' : ''}`, text: `🍖 ${run.food}`, attrs: { title: t('princess.food') } }),
      h('span', { class: 'pr-chip', text: `💰 ${run.gold}`, attrs: { title: t('princess.gold') } }),
      h('span', { class: 'pr-chip', text: `🔍 ${run.clues}`, attrs: { title: t('princess.clues') } }),
      h('span', { class: 'pr-chip', text: `⏱ ${run.turns}`, attrs: { title: t('princess.turns') } }),
      ...run.items.filter((x) => x !== 'medicine').map((x) => h('span', { class: 'pr-chip item', text: x === 'map' ? '🗺' : '🗝', attrs: { title: t(`princess.item.${x}`) } })),
      run.items.includes('medicine') ? h('button', { class: 'btn gold sm', text: `💊 ${t('princess.useMedicine')} ×${run.items.filter((x) => x === 'medicine').length}`, attrs: { type: 'button' }, on: { click: () => { mutateRun((r) => { useMedicine(r); r.rev++; }, true); ctx.redraw(); } } }) : null),
    h('button', { class: 'btn ghost sm', text: t('princess.abandon'), attrs: { type: 'button' }, on: { click: () => { if (window.confirm(t('princess.abandonConfirm'))) endRun(ctx, false, true); } } }));

  // thông điệp định mệnh / vị trí công chúa
  const fateLine = known
    ? h('div', { class: 'pr-fate known' }, `👸 ${t('princess.known', { place: t(`princess.place.${fate.place}`) })}`)
    : h('div', { class: 'pr-fate' }, `👸 ${t('princess.unknown')} · ${t('princess.fate.hint', { n: Math.max(0, fate.revealAt - Math.floor(run.alloc[2] / 2) - (run.visited.length - 1)) })}`);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'xp-lines');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  const defs = document.createElementNS(svgNS, 'defs');
  defs.innerHTML = '<marker id="pr-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#ffb04d"/></marker>';
  svg.append(defs);
  for (const e of g.edges) {
    const a = g.nodes[e.a];
    const b = g.nodes[e.b];
    const show = (vis.has(e.a) || vis.has(e.b)) && !(e.gate === 'rescued' && !run.rescued && !vis.has(e.b));
    if (!show || (e.oneway && !run.rescued)) continue;
    const ln = document.createElementNS(svgNS, 'line');
    ln.setAttribute('x1', String(a.x * 100));
    ln.setAttribute('y1', String(a.y * 100));
    ln.setAttribute('x2', String(b.x * 100));
    ln.setAttribute('y2', String(b.y * 100));
    const here = e.a === run.at || e.b === run.at;
    const open = opts.find((o) => (o.node === e.a || o.node === e.b) && (e.a === run.at || e.b === run.at))?.open;
    ln.setAttribute('class', `xe${here && open ? ' live' : ''}${e.gate && !open ? ' shut' : ''}${e.kind === 'secret' ? ' hang' : e.kind === 'bridge' ? ' sea' : ''}${e.oneway ? ' oneway' : ''}`);
    if (e.oneway) ln.setAttribute('marker-end', 'url(#pr-arr)');
    ln.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.append(ln);
  }
  const maxLen = Math.max(...g.lens);
  const cw = 150 * maxLen + 560;
  const ch = 120 * g.routes + 200;
  const canvas = h('div', { class: 'xp-canvas xt-plains pr-canvas', attrs: { style: `width:${cw}px;height:${ch}px` } }, svg);
  for (const nd of g.nodes) {
    const seen = vis.has(nd.i);
    const visited = run.visited.includes(nd.i);
    const opt = optMap.get(nd.i);
    const castleHidden = (nd.type === 'gate' || nd.type === 'hall' || nd.type === 'boss') && !known;
    const lockedNode = run.locked.includes(nd.i);
    const face = nd.type === 'boss' && seen && known ? faceUrl(PLACE_BOSS[fate.place], 1) : '';
    const node = h('button', {
      class: `xp-node t-${nd.type === 'boss' ? 'boss' : nd.type === 'city' ? 'city' : nd.type === 'fort' || nd.type === 'pass' || nd.type === 'gate' || nd.type === 'hall' ? 'fortress' : 'camp'}${nd.i === run.at ? ' here' : lockedNode ? ' locked' : visited ? ' owned' : opt?.open ? ' hit' : seen ? ' seen' : ' fog'}${selNode === nd.i ? ' sel' : ''}`,
      attrs: { type: 'button', style: `left:${nd.x * 100}%;top:${nd.y * 100}%`, 'aria-label': seen ? nodeName(nd) : '?' },
      on: { click: () => { if (viewMoved) return; selNode = nd.i; ctx.redraw(); } },
    }, face ? h('img', { attrs: { src: face, alt: '', draggable: 'false' } }) : h('i', { text: !seen ? '?' : lockedNode ? '🔒' : castleHidden ? '❔' : nd.i === run.at ? '📍' : RESCUE_NODE_ICON[nd.type] }));
    canvas.append(node);
    if (nd.route >= 0 && nd.step === 0) canvas.append(h('span', { class: 'pr-route', attrs: { style: `left:${nd.x * 100}%;top:${(nd.y - 0.075) * 100}%` }, text: `${ROUTE_ICON[nd.route]} ${t(`princess.route.${nd.route}`)}` }));
  }
  const hints = hintsOf(g, run);
  const hintBox = h('div', { class: 'pr-hints' }, h('b', { text: `🔍 ${t('princess.hints')}` }),
    ...(hints.length ? hints.map((x) => h('div', { text: t(x.key, x.p ? { route: t(`princess.route.${x.p.route}`) } : undefined) })) : [h('small', { text: t('princess.hint.none') })]));
  paintArt(canvas, g, run.seed, cw, ch);
  const viewport = makeViewport(canvas, cw, ch, run.seed, g.nodes[run.at]);
  return h('div', { class: 'xp-wrap xp-view pr-wrap' }, bar, fateLine, hintBox, h('div', { class: 'xp-body' }, viewport, sidePanel(ctx, run, g, vis, optMap, known)));
}

function sidePanel(ctx: HomeCtx, run: PrincessRun, g: PGraph, vis: Set<number>, optMap: Map<number, { node: number; open: boolean; why?: string }>, known: boolean): HTMLElement {
  const panel = h('aside', { class: 'xp-side' });
  if (selNode === null) {
    panel.append(h('div', { class: 'xp-hint', text: t('princess.pick') }), h('div', { class: 'xp-mech' }, h('b', { text: `⚙ ${t('princess.route.title')}` }), h('p', { text: t('princess.route.desc') })));
    return panel;
  }
  const nd = g.nodes[selNode];
  const seen = vis.has(nd.i);
  const here = nd.i === run.at;
  const visited = run.visited.includes(nd.i);
  const castleHidden = (nd.type === 'gate' || nd.type === 'hall' || nd.type === 'boss') && !known;
  panel.append(h('div', { class: 'xp-n-head' }, h('i', { text: seen && !castleHidden ? RESCUE_NODE_ICON[nd.type] : '?' }), h('div', {}, h('b', { text: seen && !castleHidden ? nodeName(nd) : t('explore.unknown') }), h('small', { text: nd.route >= 0 ? `${ROUTE_ICON[nd.route]} ${t(`princess.route.${nd.route}`)}` : '' }))));
  if (!seen || castleHidden) {
    panel.append(h('p', { class: 'xp-note', text: t('princess.fogNote') }));
    return panel;
  }
  panel.append(h('p', { class: 'xp-note', text: t(`princess.nodeDesc.${nd.type}`) }));
  if (here) return panel.appendChild(h('div', { class: 'xp-owned', text: `📍 ${t('princess.here')}` })), panel;
  const opt = optMap.get(nd.i);
  if (visited) panel.append(h('div', { class: 'xp-owned', text: `✔ ${t('princess.cleared')}` }));
  if (run.locked.includes(nd.i)) return panel.appendChild(h('p', { class: 'xp-why', text: `🔒 ${t('princess.lockedNode')}` })), panel;
  const failN = run.fails[nd.i] ?? 0;
  if (failN > 0) panel.append(h('p', { class: 'xp-why', text: `⚠ ${t('princess.failsOf', { n: failN })}` }));
  const isBattle = !['event', 'secret', 'city', 'treasure'].includes(nd.type);
  if (!visited && isBattle) {
    const b = princessBattle(g, run, nd.i, namer as never);
    panel.append(h('div', { class: 'xp-info' },
      h('span', { class: 'chip', text: `⚔ ${t('explore.enemyPow', { n: Math.round(b.station.power * 100) })}` }),
      h('span', { class: 'chip', text: `☠ ${t('map.units', { n: b.station.units })}` }),
      b.station.castle ? h('span', { class: 'chip warn', text: `🏯 ${t('env.castle.short')}` }) : null,
      b.station.river !== undefined ? h('span', { class: 'chip', text: `🌊 ${t('env.river')}` }) : null,
      b.station.mod ? h('span', { class: 'chip warn', text: `⚠ ${t(`mod.${b.station.mod}`)}` }) : null));
    if (nd.type === 'boss' && run.clues >= 4) panel.append(h('p', { class: 'xp-gain', text: `💡 ${t('princess.weakness')}` }));
  }
  if (nd.type === 'escort') panel.append(h('p', { class: 'xp-why', text: `🛡 ${t('princess.escortNote')}` }));
  if (opt?.open) {
    panel.append(h('div', { class: 'pr-cost', text: `🍖 −1 · ⏱ +1` }), h('button', {
      class: 'btn primary big', text: visited ? `▶ ${t('princess.move')}` : isBattle ? `⚔ ${t('princess.attack')}` : `📜 ${t('princess.explore')}`, attrs: { type: 'button' },
      on: { click: () => moveTo(ctx, run, g, nd) },
    }));
  } else if (opt && !opt.open) {
    panel.append(h('p', { class: 'xp-why', text: `🔒 ${t(`princess.locked.${opt.why ?? 'none'}`)}` }));
  } else {
    panel.append(h('p', { class: 'xp-why', text: `🔒 ${t('explore.notAdj')}` }));
  }
  return panel;
}

// ───────────────────────── di chuyển và gặp trạm ─────────────────────────
function launchBattle(ctx: HomeCtx, run: PrincessRun, g: PGraph, nd: PNode, ambush = false) {
  const b = princessBattle(g, run, nd.i, namer as never);
  b.station.name = nodeName(nd);
  if (ambush) b.rules.ambush = { at: 6, n: 3 };
  const launch: ExploreLaunch = {
    map: PRINCESS_MAP_N, node: nd.i, station: b.station, rules: b.rules, general: run.general,
    label: `${t('princess.title')} · ${nodeName(nd)}`, princess: { ambush },
  };
  ctx.onExplore(launch);
}

function moveTo(ctx: HomeCtx, run: PrincessRun, g: PGraph, nd: PNode) {
  const visited = run.visited.includes(nd.i);
  mutateRun((r) => { payStep(r); r.rev++; if (r.morale <= 0) r.over = 'fail'; }, true);
  const r2 = princessOf().run!;
  if (r2.over === 'fail') return endRun(ctx, false, false);
  if (visited) {
    mutateRun((r) => { r.at = nd.i; r.rev++; }, true);
    return afterArrive(ctx);
  }
  if (nd.type === 'event' || nd.type === 'secret' || nd.type === 'treasure') return openEventModal(ctx, nd);
  launchBattle(ctx, r2, g, nd);
}

function afterArrive(ctx: HomeCtx) {
  const run = princessOf().run!;
  const g = graphOf(run.seed);
  if (arrivedHome(g, run)) return endRun(ctx, true, false);
  ctx.redraw();
}

// ───────────────────────── sự kiện ─────────────────────────
function openEventModal(ctx: HomeCtx, nd: PNode) {
  const run0 = princessOf().run!;
  const g = graphOf(run0.seed);
  const evId = nd.type === 'secret' ? 'shortcut' : eventFor(run0.seed, nd.i, nd.type);
  const ev = EVENTS[evId];
  const choiceLabel = (c: EventChoice) => `${t(`princess.ev.${ev.id}.${c.id}`)}${c.gold ? ` (💰${c.gold})` : ''}${c.food ? ` (🍖${c.food})` : ''}`;
  openModal((close) => {
    const body = h('div', { class: 'pr-event' });
    const draw = () => {
      const run = princessOf().run!;
      body.replaceChildren(
        h('div', { class: 'res-ico', text: nd.type === 'secret' ? '🕳' : '📜' }),
        h('h2', { text: t(`princess.ev.${ev.id}.title`) }),
        h('p', { class: 'res-sub', text: t(`princess.ev.${ev.id}.desc`) }),
        h('div', { class: 'pr-chips-line' }, h('span', { class: 'pr-chip', text: `💰 ${run.gold}` }), h('span', { class: 'pr-chip', text: `🍖 ${run.food}` }), h('span', { class: 'pr-chip', text: `🛡 ${run.morale}` })),
        h('div', { class: 'modal-actions col' }, ...ev.choices.map((c) => h('button', {
          class: `btn ${c.id === 'leave' || c.id === 'ignore' || c.id === 'move' ? 'ghost' : 'primary'}${canChoose(run, c) ? '' : ' disabled'}`, text: choiceLabel(c), attrs: { type: 'button' },
          on: { click: () => choose(c) },
        }))));
    };
    const choose = (c: EventChoice) => {
      const run = princessOf().run!;
      if (!canChoose(run, c)) return void toast(t('princess.cantAfford'), 'error');
      let out = { msg: '', p: undefined as Record<string, string | number> | undefined, ambush: false };
      mutateRun((r) => { const o = resolveEvent(r, g, nd.i, c.id); out = { msg: o.msg, p: o.p, ambush: !!o.ambush }; r.rev++; if (r.morale <= 0) r.over = 'fail'; if (!out.ambush) finishEventNode(r, nd.i); }, true);
      const after = princessOf().run!;
      body.replaceChildren(
        h('div', { class: 'res-ico', text: out.ambush ? '🗡' : '✔' }),
        h('p', { class: 'res-sub', text: t(out.msg, out.p) }),
        h('div', { class: 'modal-actions col' }, h('button', {
          class: 'btn primary big', text: out.ambush ? `⚔ ${t('princess.fight')}` : t('princess.continue'), attrs: { type: 'button' },
          on: { click: () => { close(); if (after.over === 'fail') return endRun(ctx, false, false); if (out.ambush) return launchBattle(ctx, after, g, nd, true); afterArrive(ctx); } },
        })));
    };
    draw();
    return body;
  }, { dismissible: false });
}

// ───────────────────────── kết thúc lượt chơi ─────────────────────────
export function endRun(ctx: HomeCtx, won: boolean, abandoned: boolean) {
  const run = princessOf().run;
  if (!run) return;
  const sum = abandoned ? { score: 0, rank: 'D' as const, parts: { speed: 0, survivors: 0, treasure: 0, mission: 0 }, coins: 0 } : summarize(run, won);
  const reward = won && (sum.rank === 'S' || sum.rank === 'A') ? rewardGeneral(save().unlocked, run.seed) : null;
  mutate((s) => {
    const p = (s.princess ??= { plays: 0, clears: 0 });
    p.plays++;
    if (won) p.clears++;
    if (won && (!p.best || sum.score > p.best.score)) p.best = { score: sum.score, rank: sum.rank };
    p.ended = [...(p.ended ?? []), run.seed].slice(-6);
    delete p.run;
    s.coins += sum.coins;
    if (reward) s.unlocked[reward] = 1;
  }, true);
  selNode = null;
  if (abandoned) return ctx.redraw();
  openModal((close) => h('div', { class: `result ${won ? 'win' : 'lose'}` },
    h('div', { class: 'res-ico', text: won ? '👸' : '💀' }),
    h('h2', { text: won ? t('princess.sumWin') : t('princess.sumLose') }),
    won ? h('div', { class: `pr-rank r${sum.rank}`, text: sum.rank }) : null,
    h('p', { class: 'res-sub', text: won ? t('princess.sumWinSub') : t('princess.sumLoseSub') }),
    won ? h('div', { class: 'res-stats' },
      h('div', {}, h('small', { text: t('princess.sum.speed') }), h('b', { text: `${sum.parts.speed}/30` })),
      h('div', {}, h('small', { text: t('princess.sum.survivors') }), h('b', { text: `${sum.parts.survivors}/25` })),
      h('div', {}, h('small', { text: t('princess.sum.treasure') }), h('b', { text: `${sum.parts.treasure}/20` })),
      h('div', {}, h('small', { text: t('princess.sum.mission') }), h('b', { text: `${sum.parts.mission}/25` }))) : null,
    h('div', { class: 'res-reward', text: `🪙 +${fmt(sum.coins)}` }),
    reward ? h('div', { class: 'banner-win', text: `🎉 ${t('princess.unlockGeneral', { name: unitName(UNITS[reward]) })}` }) : null,
    h('div', { class: 'modal-actions col' }, h('button', { class: 'btn primary big', text: t('princess.continue'), attrs: { type: 'button' }, on: { click: () => { close(); ctx.redraw(); } } }))),
  { dismissible: false });
}

/** ghi kết quả một trận của lượt chơi (gọi từ màn trận): trả về mô tả để hiển thị */
export function recordPrincessBattle(nodeIdx: number, win: boolean, ambush: boolean): BattleOutcome {
  let out: BattleOutcome = { clue: false, gold: 0, rescued: false, failed: false, locked: false, fails: 0, blocked: false };
  mutate((s) => {
    const run = s.princess?.run;
    if (!run) return;
    const g = graphOf(run.seed);
    if (ambush) {
      if (win) finishEventNode(run, nodeIdx);
      else { run.morale = Math.max(0, run.morale - 15); if (run.morale <= 0) { run.over = 'fail'; out.failed = true; } run.rev++; }
      return;
    }
    out = applyBattle(run, g, nodeIdx, win);
    if (win) s.wins++; else s.losses++;
  }, true);
  return out;
}
