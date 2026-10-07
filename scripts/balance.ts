// Chạy: npm run balance  — mô phỏng người chơi "bot" để kiểm tra độ khó các trạm.
import { STATIONS } from '../src/data/campaign';
import { UNITS, STARTERS } from '../src/data/units';
import { Battle } from '../src/game/sim';
import { EnemyAI } from '../src/game/ai';

type Bot = (b: Battle, deck: string[]) => void;

/** Bot "khá": giữ vàng cho thẻ đắt, dồn vào lane đang bị đe dọa nhất */
const smartBot: Bot = (b, deck) => {
  const cc = b.capUpgradeCost();
  if (cc !== null && b.gold[0] >= cc && b.gold[0] >= b.goldCap(0) - 15) b.upgradeCap();
  const open = b.lanes.filter((l) => l.winner === null);
  if (!open.length) return;
  const threat = (l: (typeof open)[number]) =>
    l.units.reduce((a, u) => a + (u.alive && u.side === 1 ? (u.hp + u.dmg * 5) * (0.2 + (1 - u.x / 1000)) : 0), 0) -
    l.units.reduce((a, u) => a + (u.alive && u.side === 0 ? (u.hp + u.dmg * 5) * 0.4 : 0), 0);
  open.sort((a, c) => threat(c) - threat(a));
  const lane = open[0].index;
  const opts = deck.filter((id) => b.canDeploy(0, id, lane));
  if (!opts.length) return;
  const gen = opts.filter((id) => UNITS[id].kind === 'general');
  const pool = gen.length && Math.random() < 0.6 ? gen : opts;
  b.deploy(0, pool[Math.floor(Math.random() * pool.length)], lane);
};

function run(stationIdx: number, deck: string[], levels: Record<string, number>, bot: Bot) {
  const st = STATIONS[stationIdx];
  const b = new Battle({ station: st, levels });
  const ai = new EnemyAI(b, st.deck);
  let botT = 0;
  while (!b.over && b.time < 400) {
    botT -= 1 / 30;
    if (botT <= 0) {
      bot(b, deck);
      botT = 0.6;
    }
    ai.update(1 / 30);
    b.update(1 / 30);
    b.events.length = 0;
  }
  return { win: b.winner === 0, time: b.time, wins: b.wins };
}

const N = 20;
const profiles: { name: string; deck: string[]; lv: number }[] = [
  { name: 'Khởi đầu (lv1)', deck: [...STARTERS], lv: 1 },
  { name: 'Map 1 (lv3)', deck: ['samurai', 'archer', 'shield', 'knight', 'duongqua', 'truongphi'], lv: 3 },
  { name: 'Map 2 (lv4)', deck: ['samurai', 'crossbow', 'monk', 'knight', 'quanvu', 'tieulongnu'], lv: 4 },
  { name: 'Map 3 mạnh (lv5)', deck: ['elephant', 'crossbow', 'monk', 'tonngokhong', 'duongtien', 'quanvu'], lv: 5 },
  { name: 'Map 3 (lv5)', deck: ['samurai', 'knight', 'elephant', 'trebuchet', 'lubo', 'quanvu'], lv: 5 },
];
for (const p of profiles) {
  const levels = Object.fromEntries(p.deck.map((id) => [id, p.lv]));
  console.log(`\n== ${p.name} ==`);
  STATIONS.forEach((st, i) => {
    let w = 0;
    let t = 0;
    for (let k = 0; k < N; k++) {
      const r = run(i, p.deck, levels, smartBot);
      if (r.win) w++;
      t += r.time;
    }
    console.log(`${st.name.padEnd(18)} thắng ${((w / N) * 100).toFixed(0).padStart(3)}%  (~${(t / N).toFixed(0)}s)`);
  });
}
