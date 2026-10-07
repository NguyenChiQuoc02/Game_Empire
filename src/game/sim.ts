import { UNITS, levelMul, type UnitDef } from '../data/units';
import type { Station } from '../data/campaign';

export const LANE_LEN = 1000;
export const LANE_COUNT = 3;
export type Side = 0 | 1;
export const SPAWN_X: [number, number] = [45, LANE_LEN - 45];
export const FLAG_X: [number, number] = [0, LANE_LEN];
export const GOLD_CAP = 100;
export const PLAYER_START_GOLD = 30;
export const PLAYER_FLAG_HP = 520;
export const PLAYER_INCOME = 2.6;
export const OVERTIME_AT = 150;
/** địch vào trận chậm hơn một chút: vàng khởi điểm thấp + thu nhập tăng dần trong giây đầu */
export const ENEMY_START_GOLD = 10;
export const ENEMY_RAMP_SEC = 25;
export const ENEMY_RAMP_FROM = 0.6;

export interface Flag {
  hp: number;
  maxHp: number;
  flash: number;
}

export interface UnitInst {
  uid: number;
  def: UnitDef;
  side: Side;
  lane: number;
  x: number;
  hp: number;
  maxHp: number;
  dmg: number;
  armor: number;
  speed: number;
  range: number;
  cd: number;
  /** nhân theo cấp/độ khó, áp cho cả kỹ năng */
  pow: number;
  atkTimer: number;
  travelled: number;
  firstHit: boolean;
  alive: boolean;
  /** đếm ngược trước khi xóa khỏi lane */
  deadTimer: number;
  vanish: boolean;
  moving: boolean;
  attackAnim: number;
  hitFlash: number;
  invuln: number;
  revived: boolean;
  enraged: boolean;
  attacks: number;
  /** cho animation: lệch dọc */
  yOff: number;
  timers: Record<string, number>;
}

export interface Lane {
  index: number;
  flags: [Flag, Flag];
  units: UnitInst[];
  winner: Side | null;
}

export type FxKind =
  | 'palm' | 'sweep' | 'splash' | 'rockhit' | 'boom' | 'fire' | 'charge' | 'summon'
  | 'enrage' | 'revive' | 'pair' | 'healwave' | 'armor';

export type SimEvent =
  | { t: 'hit'; lane: number; x: number; amount: number; victimSide: Side; big: boolean }
  | { t: 'flagHit'; lane: number; side: Side; amount: number }
  | { t: 'proj'; lane: number; from: number; to: number; kind: 'arrow' | 'rock' | 'needle' | 'magic'; y: number }
  | { t: 'aoe'; lane: number; x: number; r: number; color: number }
  | { t: 'heal'; lane: number; x: number; amount: number }
  | { t: 'text'; lane: number; x: number; key: string; p?: Record<string, string | number>; color: number; big?: boolean }
  | { t: 'laneEnd'; lane: number; winner: Side }
  | { t: 'spawn'; lane: number; x: number }
  | { t: 'death'; lane: number; x: number; big: boolean }
  | { t: 'shake'; power: number }
  | { t: 'fx'; kind: FxKind; lane: number; x: number; dir: 1 | -1; r?: number; x2?: number }
  | { t: 'overtime' }
  | { t: 'end'; winner: Side };

export interface BattleConfig {
  station: Station;
  /** cấp độ thẻ của người chơi */
  levels: Record<string, number>;
}

export class Battle {
  lanes: Lane[] = [];
  gold: [number, number] = [PLAYER_START_GOLD, ENEMY_START_GOLD];
  income: [number, number];
  time = 0;
  over = false;
  winner: Side | null = null;
  wins: [number, number] = [0, 0];
  events: SimEvent[] = [];
  kills: [number, number] = [0, 0];
  private nextUid = 1;
  private overtimeAnnounced = false;

  constructor(public cfg: BattleConfig) {
    const st = cfg.station;
    this.income = [PLAYER_INCOME, st.income];
    for (let i = 0; i < LANE_COUNT; i++) {
      this.lanes.push({
        index: i,
        flags: [
          { hp: PLAYER_FLAG_HP, maxHp: PLAYER_FLAG_HP, flash: 0 },
          { hp: st.flagHp, maxHp: st.flagHp, flash: 0 },
        ],
        units: [],
        winner: null,
      });
    }
    if (st.boss) {
      const lane = Math.floor(Math.random() * LANE_COUNT);
      this.spawn(UNITS.dongtrac, 1, lane, SPAWN_X[1] - 30);
    }
  }

  private emit(e: SimEvent) {
    this.events.push(e);
  }

  private mulFor(side: Side, id: string): number {
    return side === 0 ? levelMul(this.cfg.levels[id] ?? 1) : this.cfg.station.power;
  }

  /** tướng chỉ xuất hiện ở MỘT lane: đang sống trên chiến trường thì không thả thêm */
  generalOnField(side: Side, id: string): boolean {
    for (const l of this.lanes) for (const u of l.units) if (u.alive && u.side === side && u.def.id === id) return true;
    return false;
  }

  canDeploy(side: Side, id: string, lane: number): boolean {
    const def = UNITS[id];
    if (!def || this.over) return false;
    const l = this.lanes[lane];
    if (!l || l.winner !== null) return false;
    if (this.gold[side] < def.cost) return false;
    if (def.kind === 'general' && this.generalOnField(side, id)) return false;
    return true;
  }

  deploy(side: Side, id: string, lane: number): UnitInst | null {
    if (!this.canDeploy(side, id, lane)) return null;
    const def = UNITS[id];
    this.gold[side] -= def.cost;
    return this.spawn(def, side, lane, SPAWN_X[side] + (Math.random() - 0.5) * 14);
  }

  spawn(def: UnitDef, side: Side, laneIdx: number, x: number): UnitInst {
    const pow = this.mulFor(side, def.id);
    const u: UnitInst = {
      uid: this.nextUid++,
      def, side, lane: laneIdx, x,
      hp: def.hp * pow, maxHp: def.hp * pow,
      dmg: def.dmg * pow, armor: def.armor, speed: def.speed, range: def.range, cd: def.cd,
      pow,
      atkTimer: 0.3, travelled: 0, firstHit: true,
      alive: true, deadTimer: 0, vanish: false, moving: false,
      attackAnim: 0, hitFlash: 0, invuln: 0, revived: false, enraged: false, attacks: 0,
      yOff: Math.random() * 2 - 1,
      timers: {},
    };
    switch (def.skill) {
      case 'palm': u.timers.palm = 10; break;
      case 'pairHeal': u.timers.pair = 0; break;
      case 'heal': u.timers.heal = 0; break;
      case 'fireAttack': u.timers.fire = 8; break;
      case 'tyrant': u.timers.summon = 6; break;
    }
    this.lanes[laneIdx].units.push(u);
    this.emit({ t: 'spawn', lane: laneIdx, x });
    return u;
  }

  update(dt: number) {
    if (this.over) return;
    // chia nhỏ bước để mô phỏng ổn định khi tăng tốc
    const STEP = 1 / 30;
    while (dt > 0 && !this.over) {
      const h = Math.min(dt, STEP);
      this.step(h);
      dt -= h;
    }
  }

  private step(dt: number) {
    this.time += dt;
    for (const s of [0, 1] as const) {
      const ramp = s === 1 ? Math.min(1, ENEMY_RAMP_FROM + (1 - ENEMY_RAMP_FROM) * (this.time / ENEMY_RAMP_SEC)) : 1;
      this.gold[s] = Math.min(GOLD_CAP, this.gold[s] + this.income[s] * ramp * dt);
    }
    for (const lane of this.lanes) {
      for (const f of lane.flags) f.flash = Math.max(0, f.flash - dt);
      if (lane.winner === null) {
        for (const u of lane.units.slice()) if (u.alive) this.stepUnit(lane, u, dt);
      }
      for (const u of lane.units) {
        if (!u.alive) u.deadTimer -= dt;
      }
      lane.units = lane.units.filter((u) => u.alive || u.deadTimer > 0);
    }
    if (this.time > OVERTIME_AT && !this.over) this.overtime(dt);
  }

  private overtime(dt: number) {
    if (!this.overtimeAnnounced) {
      this.overtimeAnnounced = true;
      this.emit({ t: 'overtime' });
    }
    const k = 0.012 * (1 + (this.time - OVERTIME_AT) / 40) * dt;
    for (const lane of this.lanes) {
      if (lane.winner !== null) continue;
      const [pf, ef] = lane.flags;
      pf.hp -= pf.maxHp * k;
      ef.hp -= ef.maxHp * k;
      const pr = pf.hp / pf.maxHp;
      const er = ef.hp / ef.maxHp;
      if (pf.hp <= 0 || ef.hp <= 0) {
        // bên nào còn nhiều máu hơn (theo %) thắng lane
        this.laneWon(lane, pr >= er ? 0 : 1);
        if (this.over) return;
      }
    }
  }

  // ───────────────────────── hành vi đơn vị ─────────────────────────

  /** địch gần nhất phía TRƯỚC mặt (behind=false) hoặc phía SAU lưng (behind=true) */
  private nearestEnemy(lane: Lane, u: UnitInst, behind = false): { e: UnitInst; d: number } | null {
    const dir = u.side === 0 ? 1 : -1;
    let best: UnitInst | null = null;
    let bd = Infinity;
    for (const e of lane.units) {
      if (!e.alive || e.side === u.side) continue;
      const rel = (e.x - u.x) * dir;
      if (behind ? rel >= -12 : rel < -12) continue;
      const d = Math.abs(rel);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best ? { e: best, d: bd } : null;
  }

  private stepUnit(lane: Lane, u: UnitInst, dt: number) {
    const d = u.def;
    u.atkTimer -= dt;
    u.attackAnim = Math.max(0, u.attackAnim - dt);
    u.hitFlash = Math.max(0, u.hitFlash - dt);
    u.invuln = Math.max(0, u.invuln - dt);
    u.moving = false;

    this.tickSkills(lane, u, dt);
    if (!u.alive) return;

    const dir = u.side === 0 ? 1 : -1;

    if (d.skill === 'heal') {
      this.moveSupport(lane, u, dt, dir);
      return;
    }

    const near = this.nearestEnemy(lane, u);
    if (near && near.d <= u.range) {
      if (u.atkTimer <= 0) this.attackUnit(lane, u, near.e);
      return;
    }
    // quân đã sát cờ địch thì vẫn ưu tiên đánh cờ (không quay lại đánh quân mới thả phía sau lưng)
    const fx = FLAG_X[u.side === 0 ? 1 : 0];
    if (Math.abs(fx - u.x) <= Math.max(u.range, 26)) {
      if (u.atkTimer <= 0) this.attackFlag(lane, u);
      return;
    }
    // địch đang phá thành nằm phía sau (quân mới thả ra sinh ở phía trước chúng): quay lại đánh, không bỏ qua
    const back = this.nearestEnemy(lane, u, true);
    if (back && back.d <= u.range) {
      if (u.atkTimer <= 0) this.attackUnit(lane, u, back.e);
      return;
    }
    u.x += dir * u.speed * dt;
    u.travelled += u.speed * dt;
    u.moving = true;
  }

  private moveSupport(lane: Lane, u: UnitInst, dt: number, dir: number) {
    let front = -Infinity;
    for (const a of lane.units) {
      if (!a.alive || a.side !== u.side || a === u || a.def.skill === 'heal') continue;
      front = Math.max(front, u.side === 0 ? a.x : LANE_LEN - a.x);
    }
    const progress = u.side === 0 ? u.x : LANE_LEN - u.x;
    if (front > -Infinity && progress < front - 55) {
      u.x += dir * u.speed * dt;
      u.moving = true;
    }
  }

  private attackUnit(lane: Lane, u: UnitInst, t: UnitInst) {
    const d = u.def;
    u.atkTimer = u.cd;
    u.attackAnim = 0.3;
    u.attacks++;
    if (d.skill === 'bomb') return this.explode(lane, u);

    let dmg = u.dmg;
    const ranged = u.range > 70;
    let big = false;

    switch (d.skill) {
      case 'berserk':
        dmg *= 1 + (1 - u.hp / u.maxHp) * 1.2;
        break;
      case 'charge':
        if (u.firstHit) {
          const m = Math.min(1 + u.travelled / 120, 5);
          dmg *= m;
          big = m > 2;
          if (m > 1.5) {
            this.emit({ t: 'text', lane: lane.index, x: u.x, key: 'fx.charge', p: { m: m.toFixed(1) }, color: 0xffd34d, big: true });
            this.emit({ t: 'shake', power: 2 + m });
            this.emit({ t: 'fx', kind: 'charge', lane: lane.index, x: t.x, dir: u.side === 0 ? 1 : -1, r: m });
          }
        }
        break;
      case 'antiCav':
        if (t.def.tags?.includes('cav')) dmg *= 2.2;
        break;
      case 'sweep':
        if (u.attacks % 3 === 0) {
          this.emit({ t: 'text', lane: lane.index, x: u.x, key: 'fx.sweep', color: 0x7dffb0, big: true });
          this.emit({ t: 'fx', kind: 'sweep', lane: lane.index, x: u.x, dir: u.side === 0 ? 1 : -1 });
          this.aoe(lane, u.x + (u.side === 0 ? 55 : -55), 95, dmg * 1.8, u, { ranged: false, color: 0x7dffb0, quiet: true });
          u.firstHit = false;
          return;
        }
        break;
      case 'splash':
        this.emit({ t: 'fx', kind: 'splash', lane: lane.index, x: t.x, dir: u.side === 0 ? 1 : -1, r: 60 });
        this.aoe(lane, t.x, 60, dmg * 0.6, u, { ranged: false, color: 0xffb36b, skip: t, noFlag: true, quiet: true });
        break;
      case 'siege':
        this.emit({ t: 'proj', lane: lane.index, from: u.x, to: t.x, kind: 'rock', y: u.yOff });
        this.emit({ t: 'fx', kind: 'rockhit', lane: lane.index, x: t.x, dir: u.side === 0 ? 1 : -1, r: 55 });
        this.aoe(lane, t.x, 55, dmg, u, { ranged: true, color: 0xc9a070, quiet: true });
        u.firstHit = false;
        return;
    }
    u.firstHit = false;

    if (ranged) {
      const kind = d.id === 'tieulongnu' ? 'needle' : d.id === 'giacatluong' ? 'magic' : 'arrow';
      this.emit({ t: 'proj', lane: lane.index, from: u.x, to: t.x, kind, y: u.yOff });
    }
    this.damage(t, dmg, u, { ranged, big });
  }

  private attackFlag(lane: Lane, u: UnitInst) {
    const d = u.def;
    u.atkTimer = u.cd;
    u.attackAnim = 0.3;
    u.attacks++;
    if (d.skill === 'bomb') return this.explode(lane, u);
    let dmg = u.dmg;
    if (d.skill === 'ninja') dmg *= 2;
    if (d.skill === 'siege') dmg *= 2.5;
    if (d.skill === 'berserk') dmg *= 1 + (1 - u.hp / u.maxHp) * 1.2;
    if (d.skill === 'charge' && u.firstHit) dmg *= Math.min(1 + u.travelled / 120, 5);
    u.firstHit = false;
    if (u.range > 70) {
      const kind = d.skill === 'siege' ? 'rock' : d.id === 'giacatluong' ? 'magic' : d.id === 'tieulongnu' ? 'needle' : 'arrow';
      this.emit({ t: 'proj', lane: lane.index, from: u.x, to: FLAG_X[u.side === 0 ? 1 : 0], kind, y: u.yOff });
    }
    this.damageFlag(lane, u.side === 0 ? 1 : 0, dmg, u.side);
  }

  private explode(lane: Lane, u: UnitInst) {
    this.emit({ t: 'text', lane: lane.index, x: u.x, key: 'fx.boom', color: 0xff7a3d, big: true });
    this.emit({ t: 'shake', power: 4 });
    this.emit({ t: 'fx', kind: 'boom', lane: lane.index, x: u.x + (u.side === 0 ? 18 : -18), dir: u.side === 0 ? 1 : -1, r: 62 });
    this.aoe(lane, u.x + (u.side === 0 ? 18 : -18), 62, u.dmg, u, { ranged: false, color: 0xff7a3d, flagMul: 3, quiet: true });
    u.alive = false;
    u.deadTimer = 0.05;
    u.hp = 0;
    this.emit({ t: 'death', lane: lane.index, x: u.x, big: false });
  }

  private aoe(
    lane: Lane, x: number, r: number, dmg: number, attacker: UnitInst,
    o: { ranged: boolean; color: number; flagMul?: number; skip?: UnitInst; noFlag?: boolean; pierce?: number; quiet?: boolean },
  ) {
    if (!o.quiet) this.emit({ t: 'aoe', lane: lane.index, x, r, color: o.color });
    for (const e of lane.units.slice()) {
      if (!e.alive || e.side === attacker.side || e === o.skip) continue;
      if (Math.abs(e.x - x) <= r) this.damage(e, dmg, attacker, { ranged: o.ranged, aoe: true, pierce: o.pierce });
    }
    if (!o.noFlag) {
      const fs: Side = attacker.side === 0 ? 1 : 0;
      if (Math.abs(FLAG_X[fs] - x) <= r) this.damageFlag(lane, fs, dmg * (o.flagMul ?? 1), attacker.side);
    }
  }

  /** gây sát thương lên đơn vị; trả về lượng sát thương thực */
  private damage(
    v: UnitInst, raw: number, attacker: UnitInst | null,
    o: { ranged?: boolean; aoe?: boolean; big?: boolean; pierce?: number } = {},
  ): number {
    if (!v.alive || v.invuln > 0) return 0;
    if (v.def.skill === 'ninja' && !o.aoe && Math.random() < 0.3) {
      this.emit({ t: 'text', lane: v.lane, x: v.x, key: 'fx.dodge', color: 0xbfe9ff });
      return 0;
    }
    let dmg = raw;
    if (v.def.skill === 'shield' && o.ranged) dmg *= 0.5;
    const armor = v.armor * (1 - (o.pierce ?? 0));
    dmg = Math.max(1, (dmg * 100) / (100 + armor));
    v.hp -= dmg;
    v.hitFlash = 0.12;
    this.emit({ t: 'hit', lane: v.lane, x: v.x, amount: dmg, victimSide: v.side, big: !!o.big });
    if (v.hp <= 0) this.kill(v, attacker);
    return dmg;
  }

  private kill(v: UnitInst, attacker: UnitInst | null) {
    if (v.def.skill === 'revive' && !v.revived) {
      v.revived = true;
      v.hp = v.maxHp * 0.5;
      v.invuln = 1.5;
      this.emit({ t: 'text', lane: v.lane, x: v.x, key: 'fx.revive', color: 0xffe066, big: true });
      this.emit({ t: 'fx', kind: 'revive', lane: v.lane, x: v.x, dir: v.side === 0 ? 1 : -1 });
      return;
    }
    v.alive = false;
    v.deadTimer = 0.7;
    v.moving = false;
    this.emit({ t: 'death', lane: v.lane, x: v.x, big: v.def.kind !== 'troop' });
    if (attacker) this.kills[attacker.side]++;
    if (attacker?.alive) this.onKill(attacker, v);
    if (v.def.kind === 'boss' && !this.over) {
      this.emit({ t: 'shake', power: 10 });
      this.finish(v.side === 1 ? 0 : 1);
    }
  }

  private onKill(a: UnitInst, v: UnitInst) {
    if (a.def.skill === 'ironWill') {
      const g = v.def.kind === 'troop' ? 2 : 5;
      a.armor += g;
      this.emit({ t: 'text', lane: a.lane, x: a.x, key: 'fx.armor', p: { n: g }, color: 0x9ad0ff });
      this.emit({ t: 'fx', kind: 'armor', lane: a.lane, x: a.x, dir: a.side === 0 ? 1 : -1 });
    } else if (a.def.skill === 'revive') {
      this.healUnit(a, a.maxHp * 0.12);
    }
  }

  private healUnit(u: UnitInst, amount: number) {
    if (!u.alive || u.hp >= u.maxHp) return;
    const real = Math.min(amount, u.maxHp - u.hp);
    u.hp += real;
    this.emit({ t: 'heal', lane: u.lane, x: u.x, amount: real });
  }

  private damageFlag(lane: Lane, flagSide: Side, dmg: number, attackerSide: Side) {
    if (lane.winner !== null) return;
    const f = lane.flags[flagSide];
    f.hp -= dmg;
    f.flash = 0.15;
    this.emit({ t: 'flagHit', lane: lane.index, side: flagSide, amount: dmg });
    if (f.hp <= 0) {
      f.hp = 0;
      this.laneWon(lane, attackerSide);
    }
  }

  private laneWon(lane: Lane, winner: Side) {
    if (lane.winner !== null) return;
    lane.winner = winner;
    this.wins[winner]++;
    for (const u of lane.units) {
      if (u.alive) {
        u.alive = false;
        u.vanish = true;
        u.deadTimer = 0.9;
      }
    }
    this.emit({ t: 'laneEnd', lane: lane.index, winner });
    this.emit({ t: 'shake', power: 8 });
    if (this.wins[winner] >= 2) this.finish(winner);
  }

  private finish(winner: Side) {
    if (this.over) return;
    this.over = true;
    this.winner = winner;
    this.emit({ t: 'end', winner });
  }

  // ───────────────────────── kỹ năng chủ động ─────────────────────────

  private tickSkills(lane: Lane, u: UnitInst, dt: number) {
    const dir = u.side === 0 ? 1 : -1;
    const T = u.timers;
    switch (u.def.skill) {
      case 'palm': {
        T.palm -= dt;
        if (T.palm > 0) break;
        const reach = 170;
        const hasEnemy = lane.units.some(
          (e) => e.alive && e.side !== u.side && (e.x - u.x) * dir >= -10 && (e.x - u.x) * dir <= reach,
        );
        const flagNear = Math.abs(FLAG_X[u.side === 0 ? 1 : 0] - u.x) <= reach;
        if (!hasEnemy && !flagNear) break;
        T.palm = 10;
        u.attackAnim = 0.45;
        this.emit({ t: 'text', lane: lane.index, x: u.x, key: 'fx.palm', color: 0xffa94d, big: true });
        this.emit({ t: 'shake', power: 5 });
        this.emit({ t: 'fx', kind: 'palm', lane: lane.index, x: u.x, dir: dir as 1 | -1, r: 190 });
        this.aoe(lane, u.x + dir * 95, 95, 170 * u.pow, u, { ranged: false, color: 0xffa94d, quiet: true });
        break;
      }
      case 'pairHeal': {
        T.pair -= dt;
        if (T.pair > 0) break;
        const mate = lane.units.find(
          (a) => a.alive && a.side === u.side && a.def.id === 'duongqua' && Math.abs(a.x - u.x) <= 170,
        );
        if (!mate) {
          T.pair = 0;
          break;
        }
        T.pair = 5;
        this.healUnit(u, 50 * u.pow);
        this.healUnit(mate, 50 * u.pow);
        this.emit({ t: 'text', lane: lane.index, x: u.x, key: 'fx.pair', color: 0xff9ecb });
        this.emit({ t: 'fx', kind: 'pair', lane: lane.index, x: u.x, x2: mate.x, dir: dir as 1 | -1 });
        break;
      }
      case 'heal': {
        T.heal -= dt;
        if (T.heal > 0) break;
        const hurt = lane.units.filter(
          (a) => a.alive && a.side === u.side && Math.abs(a.x - u.x) <= 120 && a.hp < a.maxHp,
        );
        if (!hurt.length) {
          T.heal = 0;
          break;
        }
        T.heal = 2;
        u.attackAnim = 0.3;
        for (const a of hurt) this.healUnit(a, 15 * u.pow);
        this.emit({ t: 'fx', kind: 'healwave', lane: lane.index, x: u.x, dir: dir as 1 | -1, r: 120 });
        break;
      }
      case 'fireAttack': {
        T.fire -= dt;
        if (T.fire > 0) break;
        const foes = lane.units.filter((e) => e.alive && e.side !== u.side);
        if (!foes.length) {
          T.fire = 0;
          break;
        }
        let best = foes[0];
        let bn = -1;
        for (const e of foes) {
          const n = foes.filter((o) => Math.abs(o.x - e.x) <= 90).length;
          if (n > bn) {
            bn = n;
            best = e;
          }
        }
        T.fire = 8;
        u.attackAnim = 0.4;
        this.emit({ t: 'text', lane: lane.index, x: best.x, key: 'fx.fire', color: 0xff6a3d, big: true });
        this.emit({ t: 'shake', power: 4 });
        this.emit({ t: 'fx', kind: 'fire', lane: lane.index, x: best.x, dir: dir as 1 | -1, r: 90 });
        this.aoe(lane, best.x, 90, 130 * u.pow, u, { ranged: true, color: 0xff6a3d, pierce: 1, noFlag: true, quiet: true });
        break;
      }
      case 'tyrant': {
        if (!u.enraged && u.hp < u.maxHp * 0.5) {
          u.enraged = true;
          u.dmg *= 1.4;
          u.speed *= 1.4;
          this.emit({ t: 'text', lane: lane.index, x: u.x, key: 'fx.enrage', color: 0xff4d4d, big: true });
          this.emit({ t: 'fx', kind: 'enrage', lane: lane.index, x: u.x, dir: dir as 1 | -1 });
          this.emit({ t: 'shake', power: 9 });
        }
        T.summon -= dt;
        if (T.summon > 0) break;
        T.summon = 9;
        u.attackAnim = 0.4;
        this.emit({ t: 'text', lane: lane.index, x: u.x, key: 'fx.summon', color: 0xd070ff, big: true });
        this.emit({ t: 'fx', kind: 'summon', lane: lane.index, x: u.x - dir * 30, dir: dir as 1 | -1 });
        for (let i = 0; i < 2; i++) this.spawn(UNITS.samurai, u.side, lane.index, u.x - dir * (20 + i * 22));
        break;
      }
    }
  }
}
