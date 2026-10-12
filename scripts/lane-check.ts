// Chạy: npx tsx scripts/lane-check.ts [chỉ số trạm|all] [số trận]
// Kiểm tra nhanh cơ chế lane: nhiều căn cứ phụ + đồn trú, lane thứ 4 của địch, hầm, ổ quái hoang dã; in thống kê mỗi trạm.
import { STATIONS, stationLabel } from '../src/data/campaign';
import { UNITS, STARTERS } from '../src/data/units';
import { Battle } from '../src/game/sim';
import { EnemyAI } from '../src/game/ai';

const arg = process.argv[2] ?? 'all';
const N = Number(process.argv[3]) || 6;
const deck = ['samurai', 'archer', 'shield', 'knight', 'duongqua', 'truongphi'].filter((id) => UNITS[id]);
const levels = Object.fromEntries([...deck, ...STARTERS].map((id) => [id, 4]));

let pushLane = -1;
/** bot "dồn quân": phòng thủ lane đang bị ép, còn lại gom vàng rồi dồn một đợt lớn vào một lane để đẩy */
function bot(b: Battle) {
  const cc = b.capUpgradeCost();
  if (cc !== null && b.gold[0] >= cc && b.gold[0] >= b.goldCap(0) - 15) b.upgradeCap();
  const open = b.lanes.filter((l) => l.winner === null && !l.extra);
  if (!open.length) return;
  const pressure = (l: (typeof open)[number]) =>
    l.units.reduce((a, u) => a + (u.alive && u.side === 1 && !u.guard && u.x < b.len * 0.5 ? u.hp + u.dmg * 5 : 0), 0);
  const worst = [...open].sort((a, c) => pressure(c) - pressure(a))[0];
  let lane = -1;
  if (pressure(worst) > 300) lane = worst.index;
  else if (b.gold[0] >= b.goldCap(0) * 0.7) {
    if (pushLane < 0 || b.lanes[pushLane].winner !== null) pushLane = open.sort((a, c) => a.flags[1].hp / a.flags[1].maxHp - c.flags[1].hp / c.flags[1].maxHp)[0].index;
    lane = pushLane;
  }
  if (lane < 0) return;
  const opts = deck.filter((id) => b.canDeploy(0, id, lane));
  if (opts.length) b.deploy(0, opts[Math.floor(Math.random() * opts.length)], lane);
}

// FEAT=none (hoặc extra,tunnel,lair,posts cách nhau dấu phẩy): tắt tính năng tương ứng để so sánh độ khó
function run(idx: number) {
  pushLane = -1;
  const base = STATIONS[idx];
  const off = (process.env.FEAT ?? '').split(',');
  const st = {
    ...base,
    ...(off.includes('none') || off.includes('extra') ? { extraLane: undefined } : {}),
    ...(off.includes('none') || off.includes('tunnel') ? { tunnels: [] } : {}),
    ...(off.includes('none') || off.includes('lair') ? { lairs: [] } : {}),
    ...(off.includes('none') || off.includes('posts') ? { outposts: [], posts: 0 } : {}),
  };
  const b = new Battle({ station: st, levels, event: null });
  const ai = new EnemyAI(b, st.deck);
  let t = 0;
  let tunnels = 0;
  let merged = 0;
  let broods = 0;
  let lairDown = 0;
  let guardsKilled = 0;
  let outpostsTaken = 0;
  while (!b.over && b.time < 420) {
    t -= 1 / 30;
    if (t <= 0) {
      bot(b);
      t = 0.35;
    }
    ai.update(1 / 30);
    b.update(1 / 30);
    for (const e of b.events) {
      if (e.t === 'tunnel') tunnels++;
      else if (e.t === 'brood') broods++;
      else if (e.t === 'text' && e.key === 'fx.lairDown') lairDown++;
      else if (e.t === 'outpost' && e.owner === 0) outpostsTaken++;
      else if (e.t === 'cross' && e.from === b.extraLane) merged++;
      else if (e.t === 'death') guardsKilled += 0;
    }
    b.events.length = 0;
    for (const l of b.lanes) for (const u of l.units) if (!Number.isFinite(u.x) || !Number.isFinite(u.hp)) throw new Error(`NaN unit ${u.def.id} lane ${l.index}`);
  }
  return { win: b.winner === 0, time: b.time, tunnels, merged, broods, lairDown, outpostsTaken, guardsKilled, over: b.over };
}

const list = arg === 'all' ? STATIONS.map((_, i) => i) : [Number(arg)];
for (const i of list) {
  const st = STATIONS[i];
  const feat = [
    st.posts ? `posts${st.posts}` : '',
    st.extraLane ? `4lane(host${st.extraLane.host},merge${st.extraLane.mergeX})` : '',
    st.tunnels.length ? `tunnel${st.tunnels.map((t) => `${t.a + 1}>${t.b + 1}`).join(',')}` : '',
    st.bridges.length ? `bridge${st.bridges.length}` : '',
    st.lairs.length ? `lair:${st.lairs.map((l) => `${l.kind}@L${l.lane + 1}`).join(',')}` : '',
    st.river !== undefined ? `river${st.river + 1}` : '',
  ].filter(Boolean).join(' ');
  let w = 0;
  let tt = 0;
  const sum = { tunnels: 0, merged: 0, broods: 0, lairDown: 0, outpostsTaken: 0, stuck: 0 };
  for (let k = 0; k < N; k++) {
    const r = run(i);
    if (r.win) w++;
    tt += r.time;
    sum.tunnels += r.tunnels;
    sum.merged += r.merged;
    sum.broods += r.broods;
    sum.lairDown += r.lairDown;
    sum.outpostsTaken += r.outpostsTaken;
    if (!r.over) sum.stuck++;
  }
  console.log(`${stationLabel(i).padEnd(4)}${st.name.padEnd(20)} thắng ${String(Math.round((w / N) * 100)).padStart(3)}% ~${String(Math.round(tt / N)).padStart(3)}s  hầm${sum.tunnels} nhập${sum.merged} đàn${sum.broods} hạ-ổ${sum.lairDown} chiếm${sum.outpostsTaken}${sum.stuck ? ` KẸT${sum.stuck}` : ''}  ${feat}`);
}
