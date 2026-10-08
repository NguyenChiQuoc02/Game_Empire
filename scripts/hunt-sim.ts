// Chạy thử chế độ Truy Tìm Kho Báu không giao diện: mọi đội (kể cả đội 0) do máy điều khiển.
// Dùng: npx tsx scripts/hunt-sim.ts [mapId|all] [teams=4] [alliance=ffa] [win=treasure] [difficulty=1]
import { Hunt } from '../src/game/hunt';
import { HuntAI } from '../src/game/huntAI';
import { HUNT_MAPS, type HuntAlliance, type HuntMapId, type HuntWin } from '../src/data/treasure';
import { STARTERS } from '../src/data/units';

const arg = process.argv.slice(2);
const mapArg = arg[0] ?? 'all';
const teams = (Number(arg[1]) === 3 ? 3 : 4) as 3 | 4;
const alliance = (arg[2] ?? 'ffa') as HuntAlliance;
const win = (arg[3] ?? 'treasure') as HuntWin;
const difficulty = (Number(arg[4] ?? 1) as 0 | 1 | 2);

for (const m of HUNT_MAPS) {
  if (mapArg !== 'all' && m.id !== mapArg) continue;
  const h = new Hunt({ setup: { teams, alliance, win, map: m.id as HuntMapId, difficulty }, levels: {}, deck: [...STARTERS], generalCap: 2, seed: 12345 });
  const ais = h.teams.map((_, i) => new HuntAI(h, i, i + 1));
  const log: string[] = [];
  const t0 = Date.now();
  let maxUnits = 0;
  while (!h.over && h.time < 1500) {
    for (const a of ais) a.update(1 / 15);
    h.update(1 / 15);
    maxUnits = Math.max(maxUnits, h.units.length);
    for (const e of h.events) {
      if (e.t === 'treasure' || e.t === 'guardianDown' || e.t === 'castleDown' || e.t === 'unlock' || e.t === 'bridgeDown' || e.t === 'zone' || e.t === 'point')
        if (log.length < 400) log.push(`${Math.round(h.time)}s ${e.t}${'kind' in e ? ':' + e.kind : ''}${'team' in e ? ' team' + e.team : ''}${'i' in e ? ' #' + e.i : ''}`);
    }
    h.events.length = 0;
  }
  const alive = h.teams.map((t) => `${t.name}${t.alive ? '' : '✗'}(${h.countOf(t.id)}u,${Math.round(h.castleHp(t.id).hp)}hp,k${t.kills})`).join(' ');
  console.log(`\n== ${m.no}. ${m.name} | ${teams} đội ${alliance} ${win} d${difficulty}`);
  console.log(`   kết thúc: ${h.over ? 'nhóm ' + h.winnerGroup : 'CHƯA XONG'} ở ${Math.round(h.time)}s | ${alive} | max units ${maxUnits} | cpu ${Date.now() - t0}ms`);
  console.log(`   sự kiện: ${log.slice(0, 14).join(' · ')}${log.length > 14 ? ` … (+${log.length - 14})` : ''}`);
}
