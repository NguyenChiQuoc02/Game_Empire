import { UNITS } from '../data/units';
import { Battle, LANE_LEN } from './sim';

/** AI địch: lên kế hoạch (thẻ + lane), chờ đủ vàng rồi triển khai */
export class EnemyAI {
  private think = 4.5;
  private plan: { id: string; lane: number } | null = null;
  private planAge = 0;

  constructor(private battle: Battle, private deck: string[]) {}

  update(dt: number) {
    const b = this.battle;
    if (b.over) return;
    this.think -= dt;
    this.planAge += dt;

    if (this.plan) {
      if (!b.canDeploy(1, this.plan.id, this.plan.lane)) {
        // lane đã đóng / tướng đã dùng thì bỏ kế hoạch; thiếu vàng thì chờ
        const def = UNITS[this.plan.id];
        const laneOpen = b.lanes[this.plan.lane].winner === null;
        const onField = def.kind === 'general' && b.generalOnField(1, this.plan.id);
        if (!laneOpen || onField || this.planAge > 12) this.plan = null;
        return;
      }
      b.deploy(1, this.plan.id, this.plan.lane);
      this.plan = null;
      this.think = 0.5 + Math.random() * 1.1;
      return;
    }
    if (this.think > 0) return;
    this.think = 0.4;
    this.makePlan();
  }

  private makePlan() {
    const b = this.battle;
    const open = b.lanes.filter((l) => l.winner === null);
    if (!open.length) return;

    // chấm điểm lane: ưu tiên chỗ người chơi đang áp sát cờ ta, và chỗ ta đang thắng thế
    const weights = open.map((l) => {
      let threat = 0;
      let mine = 0;
      for (const u of l.units) {
        if (!u.alive) continue;
        const power = (u.hp + u.dmg * 6) / 300;
        if (u.side === 0) threat += power * (0.3 + u.x / LANE_LEN);
        else mine += power * 0.3;
      }
      const ownFlag = l.flags[1].hp / l.flags[1].maxHp;
      const enemyFlag = l.flags[0].hp / l.flags[0].maxHp;
      return 0.6 + threat * 1.6 + mine * 0.5 + (1 - ownFlag) + (1 - enemyFlag) * 0.4;
    });
    const total = weights.reduce((a, c) => a + c, 0);
    let r = Math.random() * total;
    let lane = open[0].index;
    for (let i = 0; i < open.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        lane = open[i].index;
        break;
      }
    }

    const choices = this.deck.filter((id) => {
      const d = UNITS[id];
      return !(d.kind === 'general' && b.generalOnField(1, id));
    });
    if (!choices.length) return;
    // tướng ít được chọn hơn lúc đầu trận, nhiều hơn khi có vàng dư
    const w = choices.map((id) => {
      const d = UNITS[id];
      if (d.kind === 'general') return b.time > 25 ? 1.1 : 0.2;
      return d.id === 'healer' ? 0.6 : 1;
    });
    const sum = w.reduce((a, c) => a + c, 0);
    let rr = Math.random() * sum;
    let pick = choices[0];
    for (let i = 0; i < choices.length; i++) {
      rr -= w[i];
      if (rr <= 0) {
        pick = choices[i];
        break;
      }
    }
    this.plan = { id: pick, lane };
    this.planAge = 0;
  }
}


