import { UNITS } from '../data/units';
import { Battle } from './sim';

/** AI địch: lên kế hoạch (thẻ + lane), chờ đủ vàng rồi triển khai. Tổng số quân bị giới hạn theo trạm. */
export class EnemyAI {
  private think = 4.5;
  private plan: { id: string; lane: number } | null = null;
  private planAge = 0;
  private defenseT = 14;

  constructor(private battle: Battle, private deck: string[]) {}

  update(dt: number) {
    const b = this.battle;
    if (b.over) return;
    this.think -= dt;
    this.planAge += dt;
    this.defenseT -= dt;
    this.maybeBuildDefense();

    // hết ngân sách quân: không triển khai thêm
    if (b.enemyLeft <= 0) {
      this.plan = null;
      return;
    }

    if (this.plan) {
      if (!b.canDeploy(1, this.plan.id, this.plan.lane)) {
        // lane đã đóng / tướng đang ở trên sân thì bỏ kế hoạch; thiếu vàng thì chờ
        const def = UNITS[this.plan.id];
        const laneOpen = b.lanes[this.plan.lane].winner === null;
        const onField = def.kind === 'general' && b.generalOnField(1, this.plan.id);
        if (!laneOpen || onField || this.planAge > 12) this.plan = null;
        return;
      }
      const lane = this.plan.lane;
      b.deploy(1, this.plan.id, lane);
      this.plan = null;
      // trạm "dồn dập": thả thêm một quân rẻ vào cùng lane
      if (b.cfg.station.mod === 'swarm') {
        const cheap = this.deck.filter((id) => UNITS[id].kind === 'troop' && UNITS[id].cost <= 20 && b.canDeploy(1, id, lane));
        if (cheap.length) b.deploy(1, cheap[Math.floor(Math.random() * cheap.length)], lane);
      }
      this.think = 0.7 + Math.random() * 1.4;
      return;
    }
    if (this.think > 0) return;
    this.think = 0.4;
    this.makePlan();
  }

  /** thỉnh thoảng xây công trình phòng thủ ở nửa sân của địch (nếu trạm có) */
  private maybeBuildDefense() {
    const b = this.battle;
    const defs = b.cfg.station.defenses;
    if (!defs?.length || this.defenseT > 0 || b.time < 14) return;
    this.defenseT = 14 + Math.random() * 10;
    const open = b.lanes.filter((l) => l.winner === null);
    if (!open.length) return;
    // ưu tiên lane người chơi đang áp sát
    let lane = open[0];
    let best = -1;
    for (const l of open) {
      let threat = 0;
      for (const u of l.units) if (u.alive && u.side === 0 && u.def.kind !== 'defense') threat += (u.hp + u.dmg * 6) / 300 * (0.3 + u.x / b.len);
      if (threat > best) {
        best = threat;
        lane = l;
      }
    }
    const id = defs[Math.floor(Math.random() * defs.length)];
    // lane có căn cứ phụ do địch giữ: thường dựng công trình che căn cứ, còn lại dựng gần thành
    const post = b.outposts.find((o) => o.lane === lane.index && o.owner === 1);
    const x = post && Math.random() < 0.5 ? post.x + 40 + Math.random() * 90 : b.len - (150 + Math.random() * 170);
    if (b.canDeploy(1, id, lane.index)) b.deploy(1, id, lane.index, x);
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
        if (!u.alive || u.ghost || u.def.kind === 'defense') continue;
        const power = (u.hp + u.dmg * 6) / 300;
        if (u.side === 0) threat += power * (0.3 + u.x / b.len);
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
      return d.id === 'healer' ? 0.6 : d.cost >= 30 ? 0.7 : 1;
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
