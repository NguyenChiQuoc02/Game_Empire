import { UNITS } from '../data/units';
import { HUNT_FACTIONS, HUNT_UNIT_CAP, type HuntFaction } from '../data/treasure';
import type { Hunt, HStance } from './hunt';

type Persona = 'raider' | 'greedy' | 'turtle';

/** Chỉ huy đội máy: chọn bộ quân theo phe phái, ra quân, và quyết định cả đội giữ thành / tranh kho báu / đánh thành địch. */
export class HuntAI {
  private think = 1.5 + Math.random();
  private cmdT = 0;
  private threatT = 0;
  private lastStance: HStance = 'guard';
  private troops: string[];
  private generals: string[];
  private defenses: string[];
  readonly faction: HuntFaction;
  readonly persona: Persona;

  constructor(private h: Hunt, private team: number, factionIdx: number) {
    this.faction = HUNT_FACTIONS[factionIdx % HUNT_FACTIONS.length];
    this.persona = (['raider', 'greedy', 'turtle'] as Persona[])[Math.floor(h.rand() * 3)];
    const pool = [...this.faction.troops, ...(this.faction.beasts ?? [])].filter((id) => UNITS[id]);
    // 7 loại quân thường, ưu tiên cân bằng giữa cận chiến và tầm xa
    this.troops = shuffle(pool, h).slice(0, 7);
    if (!this.troops.some((id) => UNITS[id].range > 70)) this.troops.push(this.faction.troops.find((id) => UNITS[id]?.range > 70) ?? 'archer');
    this.generals = shuffle(this.faction.generals.filter((id) => UNITS[id]), h).slice(0, 3);
    this.defenses = this.faction.defenses.filter((id) => UNITS[id]);
    h.teams[team].faction = this.faction.id;
    h.teams[team].deck = [...this.troops, ...this.generals, ...this.defenses];
  }

  update(dt: number) {
    const h = this.h;
    const t = h.teams[this.team];
    if (h.over || !t.alive) return;
    this.think -= dt;
    this.cmdT -= dt;
    this.threatT -= dt;
    if (this.think <= 0) {
      this.think = 0.7 + Math.random() * 0.8;
      this.deploy();
    }
    if (this.cmdT <= 0) {
      this.cmdT = 1.2;
      this.command();
    }
  }

  private deploy() {
    const h = this.h;
    const t = h.teams[this.team];
    const army = h.countOf(this.team);
    if (army >= HUNT_UNIT_CAP) return;
    // tướng: ra khi đã có một lực lượng nền
    if (h.time > 22 && army >= 4) {
      const gens = this.generals.filter((id) => !h.generalOnField(this.team, id) && h.canDeploy(this.team, id));
      if (gens.length && Math.random() < 0.55) {
        h.deploy(this.team, gens[Math.floor(Math.random() * gens.length)]);
        return;
      }
      // dành vàng cho tướng đắt khi còn thiếu một chút
      const wantGen = this.generals.some((id) => !h.generalOnField(this.team, id)) && h.generalsOf(this.team) < t.generalCap;
      if (wantGen && t.gold < 55 && Math.random() < 0.4) return;
    }
    // công trình phòng thủ
    const defChance = this.persona === 'turtle' ? 0.3 : 0.1;
    if (h.time > 14 && h.defensesOf(this.team) < (this.persona === 'turtle' ? 4 : 2) && Math.random() < defChance) {
      const ds = this.defenses.filter((id) => h.canDeploy(this.team, id));
      if (ds.length) {
        h.deploy(this.team, ds[Math.floor(Math.random() * ds.length)]);
        return;
      }
    }
    const ok = this.troops.filter((id) => h.canDeploy(this.team, id));
    if (!ok.length) return;
    // thích quân rẻ khi còn ít quân
    const w = ok.map((id) => (army < 6 ? 1 / Math.max(8, UNITS[id].cost) : 1));
    let r = Math.random() * w.reduce((a, c) => a + c, 0);
    let pick = ok[0];
    for (let i = 0; i < ok.length; i++) {
      r -= w[i];
      if (r <= 0) {
        pick = ok[i];
        break;
      }
    }
    h.deploy(this.team, pick);
  }

  private set(stance: HStance, rally?: { x: number; y: number }) {
    if (stance !== this.lastStance || rally) {
      this.lastStance = stance;
      this.h.command(this.team, stance, rally);
    }
  }

  private command() {
    const h = this.h;
    const t = h.teams[this.team];
    const army = h.alive(this.team).filter((u) => u.def.kind !== 'defense');
    const n = army.length;
    const castle = h.get(t.castleUid);
    const diff = h.cfg.setup.difficulty;
    // kẻ địch áp sát thành nhà
    let threat = 0;
    for (const u of h.units) {
      if (u.alive && !u.isStatic && h.hostile(this.team, u.team) && u.team >= 0 && Math.hypot(u.x - t.castle.x, u.y - t.castle.y) < 430) threat++;
    }
    if (castle && castle.hp < castle.maxHp * 0.6 && threat > 0) this.threatT = 14;
    if (threat >= 3 && n < 8) this.threatT = Math.max(this.threatT, 8);
    if (this.threatT > 0) return this.set('guard');

    const opening = 28 + (2 - diff) * 8;
    if (h.time < opening) return this.set('guard');

    const carried = h.treasures.filter((x) => x.state === 'carried');
    if (carried.some((x) => h.teams[x.team].group === t.group)) return this.set('treasure');

    const thresh = (this.persona === 'greedy' ? 5 : this.persona === 'turtle' ? 9 : 7) + (diff === 0 ? 2 : 0);
    // đuổi người khiêng kho báu của địch khi đủ quân
    if (carried.length && n >= thresh - 2) {
      // đội đi cướp ưu tiên người khiêng gần mình nhất
      return this.set('treasure');
    }

    const treasureOpen = h.treasures.some((x) => x.state === 'ground') || (h.guardian && h.guardian.alive && h.treasures.some((x) => x.state === 'locked'));
    const eliminate = h.cfg.setup.win === 'elimination';
    if (!eliminate || this.persona !== 'raider') {
      if (treasureOpen && n >= thresh) return this.set('treasure');
    }
    // đánh thành địch yếu nhất (đội "raider", hoặc chế độ diệt toàn bộ khi đã đủ lâu)
    if ((this.persona === 'raider' && n >= thresh + 3 && h.time > 70) || (eliminate && n >= thresh + 2 && h.time > 120)) {
      let best: { x: number; y: number } | null = null;
      let bs = Infinity;
      for (const o of h.teams) {
        if (!o.alive || !h.hostile(this.team, o.id)) continue;
        const c = h.castleHp(o.id);
        const score = c.hp + Math.hypot(o.castle.x - t.castle.x, o.castle.y - t.castle.y) * 0.8;
        if (score < bs) {
          bs = score;
          best = o.castle;
        }
      }
      if (best) return this.set('rally', { x: best.x, y: best.y });
    }
    if (treasureOpen && n >= thresh + 1) return this.set('treasure');
    return this.set('guard');
  }
}

function shuffle<T>(arr: T[], h: Hunt): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(h.rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
