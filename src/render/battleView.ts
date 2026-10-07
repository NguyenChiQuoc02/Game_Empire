import { Container, Graphics, Text, type Application } from 'pixi.js';
import { Battle, LANE_COUNT, LANE_LEN, type Side, type UnitInst } from '../game/sim';
import type { Station } from '../data/campaign';
import { buildUnitArt, SIDE_COLOR, type UnitArt } from './unitArt';
import { buildBattlefield, type Battlefield } from './scenery';
import { roof } from './landmarks';
import { Vfx, textStyle } from './vfx';
import { INK, ball, darker, g, lighter, mix, poly, rrect } from './draw';
import { getLang, t, unitName } from '../i18n';
import { UNITS } from '../data/units';

const easeOutBack = (k: number) => {
  const c1 = 1.70158;
  const x = Math.max(0, Math.min(1, k)) - 1;
  return 1 + (c1 + 1) * x * x * x + c1 * x * x;
};

interface UV {
  art: UnitArt;
  aura: Graphics;
  name?: Text;
  nameLang?: string;
  nameText?: string;
  formId: string | null;
  lastPct: number;
  seed: number;
  born: number;
  prevAtk: number;
  swooshAt: number;
  dustT: number;
  lineT: number;
}

interface TowerView {
  c: Container;
  body: Graphics;
  flagC: Container;
  flagG: Graphics;
  lamps: Graphics[];
  plate: Graphics;
  hpText: Text;
  lastHp: number;
  lastBroken: boolean;
  smokeT: number;
  w: number;
  h: number;
  side: Side;
}

export class BattleView {
  readonly root = new Container();
  private unitsC: Container[] = [];
  private towersLayer = new Container();
  private unitsLayer = new Container();
  private bf: Battlefield | null = null;
  private overlays = new Container();
  readonly vfx: Vfx;
  private hl: Graphics[] = [];
  private views = new Map<number, UV>();
  private towers: TowerView[][] = [];
  private banners: Container[] = [];
  private bannerAge: number[] = [];
  private clock = 0;
  private dragging = false;
  private hoverLane = -1;
  private hoverX = -1;
  private toast: Text | null = null;
  private toastT = 0;
  W = 0;
  H = 0;
  /** chiều cao một làn */
  laneH = 0;
  /** chiều cao phần toàn cảnh phía trên 3 làn */
  panoH = 0;
  padL = 60;
  us = 1;

  constructor(private app: Application, private battle: Battle, private station: Station) {
    this.vfx = new Vfx(this);
    for (let i = 0; i < LANE_COUNT; i++) {
      const u = new Container();
      u.sortableChildren = true;
      this.unitsC.push(u);
      this.unitsLayer.addChild(u);
    }
    this.root.addChild(this.towersLayer, this.unitsLayer, this.overlays, this.vfx.layer);
    app.stage.addChild(this.root);
  }

  destroy() {
    this.app.stage.removeChild(this.root);
    this.root.destroy({ children: true });
  }

  laneTop(lane: number) {
    return this.panoH + lane * this.laneH;
  }
  sx(x: number) {
    return this.padL + (x / LANE_LEN) * (this.W - this.padL * 2);
  }
  gy(lane: number, yOff: number) {
    return this.laneTop(lane) + this.laneH * (0.52 + 0.27 * yOff);
  }
  /** hệ số phối cảnh theo làn (làn gần người xem to hơn) */
  depth(lane: number) {
    return this.battle.lanes.length === 1 ? 1.05 : 0.92 + 0.08 * lane;
  }
  /** lane tại toạ độ dọc của chiến trường; -1 nếu điểm nằm ngoài các làn (bầu trời / phía dưới) */
  laneAt(localY: number) {
    const rel = localY - this.panoH;
    if (rel < 0 || rel >= this.battle.lanes.length * this.laneH) return -1;
    return Math.floor(rel / this.laneH);
  }

  /** đổi toạ độ ngang trên màn hình sang toạ độ lane (0..1000) */
  toLaneX(px: number): number {
    return ((px - this.padL) / (this.W - this.padL * 2)) * LANE_LEN;
  }

  /** đơn vị (còn sống) nằm dưới điểm (px, py) trong hệ tọa độ của chiến trường */
  unitAt(px: number, py: number): UnitInst | null {
    let best: UnitInst | null = null;
    let bestY = -Infinity;
    for (const lane of this.battle.lanes) {
      for (const u of lane.units) {
        if (!u.alive) continue;
        const v = this.views.get(u.uid);
        if (!v) continue;
        const s = this.us * this.depth(u.lane);
        const x = this.sx(u.x);
        const y = this.gy(u.lane, u.yOff);
        const halfW = 24 * u.def.scale * s;
        const hgt = v.art.height * s;
        if (px >= x - halfW && px <= x + halfW && py >= y - hgt && py <= y + 8 * s && y > bestY) {
          best = u;
          bestY = y;
        }
      }
    }
    return best;
  }

  /** vị trí đầu/chân của đơn vị trên màn hình (để đặt tooltip phía trên đầu) */
  unitBox(u: UnitInst): { x: number; top: number; bottom: number } | null {
    const v = this.views.get(u.uid);
    if (!v) return null;
    const s = this.us * this.depth(u.lane);
    const y = this.gy(u.lane, u.yOff);
    // chừa chỗ cho thanh máu và tên tướng phía trên đầu
    const extra = (u.def.kind === 'troop' ? 16 : 30) * s;
    return { x: this.sx(u.x), top: y - v.art.height * s - extra, bottom: y + 8 * s };
  }

  setDrag(active: boolean, lane: number, laneX = -1) {
    this.dragging = active;
    this.hoverLane = lane;
    this.hoverX = laneX;
  }

  // ───────────────────────── dựng cảnh ─────────────────────────
  layout(W: number, H: number) {
    if (W < 10 || H < 10) return;
    this.W = W;
    this.H = H;
    const n = this.battle.lanes.length;
    if (n === 1) {
      // màn Boss: một lane lớn, phần toàn cảnh phía trên cao hơn
      this.laneH = Math.max(170, Math.min(300, H * 0.46));
      this.panoH = H - this.laneH;
    } else {
      this.panoH = Math.max(86, Math.min(240, H * 0.27));
      this.laneH = (H - this.panoH) / n;
    }
    this.padL = Math.max(54, Math.min(140, W * 0.13));
    this.us = Math.max(0.5, Math.min(1.7, Math.min(this.laneH * 0.52, W * 0.135) / 60));

    this.overlays.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.towersLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.towers = [];
    this.hl = [];
    this.banners = [];
    this.bannerAge = [];
    this.vfx.clear();
    this.toast = null;

    if (this.bf) {
      this.root.removeChild(this.bf.back, this.bf.front);
      this.bf.back.destroy({ children: true });
      this.bf.front.destroy({ children: true });
    }
    this.bf = buildBattlefield(this.station.theme, W, H, this.panoH, this.laneH, 9100 + this.station.id * 13, n);
    this.root.addChildAt(this.bf.back, 0);
    this.root.addChildAt(this.bf.front, this.root.children.indexOf(this.overlays));

    for (let i = 0; i < n; i++) {
      const row: TowerView[] = [];
      for (const side of [0, 1] as const) {
        const tv = this.makeTower(i, side);
        this.towersLayer.addChild(tv.c);
        row.push(tv);
      }
      this.towers.push(row);

      const hl = new Graphics();
      hl.visible = false;
      this.overlays.addChild(hl);
      this.hl.push(hl);
      const bn = new Container();
      bn.visible = false;
      this.overlays.addChild(bn);
      this.banners.push(bn);
      this.bannerAge.push(0);
    }
    for (const lane of this.battle.lanes) if (lane.winner !== null) this.showLaneBanner(lane.index, lane.winner);
    this.root.position.set(0, 0);
  }

  // ───────────────────────── tháp canh kiểu chùa ─────────────────────────
  private makeTower(lane: number, side: Side): TowerView {
    const w = this.padL * 0.68;
    const h = Math.min(this.laneH * 0.92, w * 1.75);
    const c = new Container();
    const baseY = this.gy(lane, 0) + this.laneH * 0.12;
    c.position.set(side === 0 ? this.padL - w - 2 : this.W - this.padL + 2, baseY);
    c.zIndex = baseY;
    const body = new Graphics();
    const flagC = new Container();
    const flagG = new Graphics();
    flagC.addChild(flagG);
    const lamps = [new Graphics(), new Graphics()];
    const plate = new Graphics();
    const hpText = new Text({ text: '', style: textStyle(Math.max(9, 9.5 * Math.min(1.2, this.us)), 0xffffff) });
    hpText.anchor.set(0.5);
    c.addChild(flagC, body, ...lamps, plate, hpText);
    const tv: TowerView = { c, body, flagC, flagG, lamps, plate, hpText, lastHp: -1, lastBroken: false, smokeT: 0, w, h, side };
    this.drawTower(tv, false);
    this.drawFlag(tv, false, false);
    return tv;
  }

  private drawTower(tv: TowerView, broken: boolean) {
    const { w, h, side } = tv;
    const b = tv.body;
    b.clear();
    const accent = SIDE_COLOR[side];
    const tile = mix(accent, 0x2a3350, side === 0 ? 0.35 : 0.2);
    const stone = 0xb8b0a8;
    const wall = 0xf1e6cc;
    const pillar = 0xc03a30;
    // bệ đá có bậc
    rrect(b, -w * 0.06, -h * 0.07, w * 1.12, h * 0.07, 2, stone);
    rrect(b, w * 0.02, -h * 0.13, w * 0.96, h * 0.07, 2, mix(stone, 0xffffff, 0.12));
    // tầng thấp
    const y1 = -h * 0.13;
    const hh1 = h * 0.26;
    rrect(b, w * 0.1, y1 - hh1, w * 0.8, hh1, 1.5, wall);
    for (const px of [0.1, 0.34, 0.66, 0.9]) b.rect(w * px - 1.6, y1 - hh1, 3.2, hh1).fill(pillar);
    b.roundRect(w * 0.38, y1 - hh1 * 0.82, w * 0.24, hh1 * 0.82, w * 0.12).fill({ color: INK, alpha: 0.75 });
    b.rect(w * 0.1, y1 - hh1, w * 0.8, 3).fill(accent);
    if (broken) {
      // sập mái: đống gạch vụn + vết cháy
      poly(b, [w * 0.04, y1 - hh1, w * 0.3, y1 - hh1 - h * 0.1, w * 0.52, y1 - hh1 - h * 0.03, w * 0.76, y1 - hh1 - h * 0.12, w * 0.98, y1 - hh1], darker(tile, 0.3), 1.4);
      for (let k = 0; k < 5; k++) rrect(b, -4 + k * (w / 4.5), -3 - (k % 2) * 3, 8, 6, 2, darker(stone, 0.2));
      b.rect(w * 0.1, y1 - hh1, w * 0.8, hh1).fill({ color: INK, alpha: 0.3 });
      b.moveTo(w * 0.28, y1 - hh1).lineTo(w * 0.36, y1 - hh1 * 0.4).stroke({ width: 1.6, color: 0x2a2030 });
    } else {
      roof(b, w / 2, y1 - hh1, w * 0.58, h * 0.17, tile);
      // tầng trên
      const y2 = y1 - hh1 - h * 0.1;
      const hh2 = h * 0.2;
      rrect(b, w * 0.24, y2 - hh2, w * 0.52, hh2, 1.5, wall);
      for (const px of [0.24, 0.5, 0.76]) b.rect(w * px - 1.4, y2 - hh2, 2.8, hh2).fill(pillar);
      b.roundRect(w * 0.4, y2 - hh2 * 0.78, w * 0.2, hh2 * 0.6, 3).fill({ color: INK, alpha: 0.7 });
      roof(b, w / 2, y2 - hh2, w * 0.46, h * 0.15, tile);
    }
    // đèn lồng đỏ ở mép mái
    tv.lamps.forEach((lg, i) => {
      lg.clear();
      if (broken) return;
      const lx = i === 0 ? w * 0.02 : w * 0.98;
      const ly = y1 - hh1 + 2;
      lg.position.set(lx, ly);
      lg.circle(0, 5, 7).fill({ color: 0xff7a3d, alpha: 0.22 });
      lg.moveTo(0, 0).lineTo(0, 3).stroke({ width: 1, color: 0x3a2a22 });
      ball(lg, 0, 6, 2.8, 0xd23a2a, 3.6);
    });
  }

  private drawFlag(tv: TowerView, broken: boolean, victory: boolean) {
    const { w, h, side } = tv;
    const fg = tv.flagG;
    fg.clear();
    const col = SIDE_COLOR[side];
    const px = side === 0 ? -w * 0.1 : w * 1.1;
    tv.flagC.position.set(px, 0);
    const dir = side === 0 ? -1 : 1;
    if (broken) {
      fg.moveTo(0, 0).lineTo(0, -h * 0.4).stroke({ width: 3, color: 0x3a2a22, cap: 'round' });
      fg.poly([0, -h * 0.4, dir * 16, -h * 0.34, dir * 14, -h * 0.2, 0, -h * 0.26]).fill({ color: darker(col, 0.3), alpha: 0.9 });
      return;
    }
    const ph = h * 0.98;
    rrect(fg, -2, -ph, 4, ph, 1.5, 0x4a3426);
    // xà ngang + cờ dài rủ xuống
    rrect(fg, -w * 0.2, -ph + 2, w * 0.4, 4, 1.5, 0x4a3426);
    const bw = w * 0.26;
    const bl = h * 0.5;
    poly(fg, [-bw, -ph + 6, bw, -ph + 6, bw, -ph + 6 + bl, 0, -ph + 6 + bl - bw * 0.7, -bw, -ph + 6 + bl], col, 1.6);
    fg.poly([-bw + 2, -ph + 8, -bw * 0.2, -ph + 8, -bw * 0.2, -ph + 6 + bl - bw * 0.5, -bw + 2, -ph + 4 + bl]).fill({ color: 0xffffff, alpha: 0.2 });
    fg.rect(-bw, -ph + 6, bw * 2, 3).fill(0xffd34d);
    ball(fg, 0, -ph + 6 + bl * 0.38, bw * 0.46, 0xffd34d);
    fg.circle(0, -ph + 6 + bl * 0.38, bw * 0.2).fill({ color: darker(col, 0.5), alpha: 0.9 });
    ball(fg, 0, -ph - 2, 3.4, 0xffd34d);
    if (victory) fg.circle(0, -ph - 2, 11).fill({ color: 0xffd34d, alpha: 0.28 });
  }

  private showLaneBanner(lane: number, winner: Side) {
    const bn = this.banners[lane];
    if (!bn) return;
    bn.removeChildren().forEach((c) => c.destroy({ children: true }));
    const win = winner === 0;
    const y0 = this.laneTop(lane);
    const tint = new Graphics();
    tint.rect(0, y0, this.W, this.laneH).fill({ color: win ? 0x2d7bff : 0x6a1a1a, alpha: win ? 0.14 : 0.3 });
    const plate = new Container();
    const bw = Math.min(this.W * 0.72, 380);
    const bh = Math.min(this.laneH * 0.42, 66);
    const pg = new Graphics();
    pg.roundRect(-bw / 2, -bh / 2, bw, bh, 16).fill({ color: 0x0b0e18, alpha: 0.8 }).stroke({ width: 3, color: win ? 0xffd34d : 0xff7a7a });
    pg.roundRect(-bw / 2 + 5, -bh / 2 + 5, bw - 10, bh - 10, 12).stroke({ width: 1.2, color: win ? 0x6cc2ff : 0x8a3a3a, alpha: 0.8 });
    const tx = new Text({ text: win ? t('lane.win') : t('lane.lose'), style: textStyle(Math.max(16, bh * 0.46), win ? 0xffe27a : 0xff9a9a) });
    tx.anchor.set(0.5);
    plate.addChild(pg, tx);
    plate.position.set(this.W / 2, y0 + this.laneH / 2);
    bn.addChild(tint, plate);
    bn.visible = true;
    bn.alpha = 0;
    this.bannerAge[lane] = 0;
  }

  // ───────────────────────── mỗi khung hình ─────────────────────────
  update(dt: number) {
    this.clock += dt;
    this.consume();
    this.bf?.update(dt);
    this.syncUnits(dt);
    this.syncTowers(dt);
    this.updateOverlays(dt);
    this.vfx.update(dt);
    const sh = this.vfx.shake;
    if (sh > 0.1) this.root.position.set((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    else this.root.position.set(0, 0);
  }

  private consume() {
    const evs = this.battle.events;
    for (const e of evs) {
      if (e.t === 'boss') {
        this.showToast(t('hud.bossAppear', { name: unitName(UNITS[e.id]) }));
        this.vfx.handle(e);
      } else {
        if (e.t === 'laneEnd') this.showLaneBanner(e.lane, e.winner);
        this.vfx.handle(e);
      }
    }
    evs.length = 0;
  }

  private syncUnits(dt: number) {
    const seen = new Set<number>();
    for (const lane of this.battle.lanes) {
      for (const u of lane.units) {
        seen.add(u.uid);
        let v = this.views.get(u.uid);
        if (!v) {
          v = this.makeUnitView(u);
          this.views.set(u.uid, v);
          this.unitsC[lane.index].addChild(v.art.root);
        }
        this.updateUnitView(v, u, dt);
      }
    }
    for (const [uid, v] of this.views) {
      if (!seen.has(uid)) {
        v.art.root.destroy({ children: true });
        this.views.delete(uid);
      }
    }
  }

  private nameFor(u: UnitInst): string {
    return u.form ? `${unitName(u.def)} · ${unitName(UNITS[u.form])}` : unitName(u.def);
  }

  /** gắn hào quang + tên (tướng/boss) vào art hiện tại của đơn vị */
  private attachExtras(v: UV, u: UnitInst) {
    const aura = g();
    v.art.root.addChildAt(aura, 1);
    v.aura = aura;
    v.name = undefined;
    v.lastPct = -1;
    if (u.def.kind === 'general' || u.def.kind === 'boss') {
      const text = this.nameFor(u);
      const tx = new Text({ text, style: textStyle(11, u.def.kind === 'boss' ? 0xff9a9a : 0xffe08a) });
      tx.anchor.set(0.5, 1);
      tx.position.set(0, -v.art.height - 12);
      v.art.root.addChild(tx);
      v.name = tx;
      v.nameText = text;
      v.nameLang = getLang();
    }
  }

  /** Tôn Ngộ Không hóa thân: đổi hình theo tướng được mượn */
  private swapForm(v: UV, u: UnitInst, formId: string | null) {
    const old = v.art.root;
    const parent = old.parent;
    const art = buildUnitArt(formId ? UNITS[formId] : u.def, u.side);
    parent?.addChild(art.root);
    old.destroy({ children: true });
    v.art = art;
    v.formId = formId;
    this.attachExtras(v, u);
  }

  private makeUnitView(u: UnitInst): UV {
    const art = buildUnitArt(u.def, u.side);
    const v: UV = { art, aura: g(), formId: null, lastPct: -1, seed: u.uid * 0.77, born: this.clock, prevAtk: 0, swooshAt: 0, dustT: Math.random() * 0.2, lineT: 0 };
    this.attachExtras(v, u);
    this.vfx.ring(this.sx(u.x), this.gy(u.lane, u.yOff), 24 * this.us * u.def.scale, SIDE_COLOR[u.side], 0.45, 2.5);
    v.art.root.scale.set(0.01);
    return v;
  }

  private updateUnitView(v: UV, u: UnitInst, dt: number) {
    const formId = u.form ?? null;
    if (formId !== v.formId) this.swapForm(v, u, formId);
    const a = v.art;
    const us = this.us * this.depth(u.lane);
    const dir = u.side === 0 ? 1 : -1;
    const sxp = this.sx(u.x);
    const y = this.gy(u.lane, u.yOff);
    a.root.position.set(sxp, y);
    a.root.zIndex = y;
    if (v.name) {
      const text = this.nameFor(u);
      if (v.nameLang !== getLang() || v.nameText !== text) {
        v.name.text = text;
        v.nameText = text;
        v.nameLang = getLang();
      }
    }

    const age = this.clock - v.born;
    const pop = age < 0.4 ? easeOutBack(age / 0.4) : 1;
    a.root.scale.set(Math.max(0.01, us * pop));

    const atk = u.attackAnim > 0 ? Math.max(0.001, Math.min(1, 1 - u.attackAnim / 0.3)) : 0;
    a.update(this.clock + v.seed, u.moving, atk);

    if (u.alive && u.attackAnim > v.prevAtk + 0.05 && (a.mode === 'swing' || a.mode === 'thrust')) {
      v.swooshAt = this.clock + (a.mode === 'swing' ? 0.09 : 0.05);
    }
    v.prevAtk = u.attackAnim;
    if (v.swooshAt > 0 && this.clock >= v.swooshAt) {
      v.swooshAt = 0;
      const col = u.def.kind === 'general' || u.def.kind === 'boss' ? (u.def.id === 'quanvu' ? 0x9dffc8 : 0xfff0b0) : 0xffffff;
      this.vfx.swoosh(sxp, y - 28 * us * u.def.scale, dir, a.mode === 'swing' ? 'swing' : 'thrust', us * Math.min(1.5, u.def.scale), col);
    }

    if (!u.alive) {
      a.hpBar.visible = false;
      a.art.x = 0;
      v.aura.clear();
      if (v.name) v.name.visible = false;
      if (u.vanish) {
        a.root.alpha = Math.max(0, u.deadTimer / 0.9);
        a.art.rotation = 0;
      } else if (u.def.kind === 'defense') {
        const p = 1 - Math.max(0, u.deadTimer) / 0.7;
        a.art.y = p * 10;
        a.art.rotation = 0;
        a.root.alpha = Math.max(0, 1 - p * p);
      } else {
        const p = 1 - Math.max(0, u.deadTimer) / 0.7;
        a.art.rotation = (u.side === 0 ? -1 : 1) * Math.min(1.5, p * 2.2);
        a.art.y = p * 6;
        a.root.alpha = Math.max(0, 1 - p * p);
      }
      return;
    }

    a.root.alpha = Math.min(1, age * 5);
    a.art.y = 0;
    a.art.rotation = 0;
    const hk = Math.max(0, u.hitFlash / 0.12);
    a.art.x = -dir * 3 * hk;
    const base = a.baseScale;
    a.art.scale.set(dir * base * (1 + hk * 0.06), base * (1 - hk * 0.08));
    a.art.tint = u.hitFlash > 0 ? 0xff8f8f : u.invuln > 0 ? 0xfff2a0 : u.poison ? 0xc4ffa8 : u.stunT > 0 ? 0xd0d8ff : 0xffffff;
    a.hpBar.visible = !u.ghost;

    if (u.moving) {
      v.dustT -= dt;
      if (v.dustT <= 0) {
        v.dustT = u.speed >= 70 ? 0.12 : 0.3;
        this.vfx.dust(sxp - dir * 8 * us, y, 1, u.speed >= 70 ? 0.9 : 0.6);
      }
      if (u.def.skill === 'charge' && u.firstHit) {
        v.lineT -= dt;
        if (v.lineT <= 0) {
          v.lineT = 0.07;
          this.vfx.speedLines(sxp - dir * 14 * us, y - 26 * us, dir);
        }
      }
    }

    this.drawAura(v, u);

    const pct = Math.max(0, u.hp / u.maxHp);
    if (Math.abs(pct - v.lastPct) > 0.004) {
      v.lastPct = pct;
      const w = a.barW;
      const col = u.side === 0 ? (pct > 0.5 ? 0x4fe08a : pct > 0.25 ? 0xffd34d : 0xff6a4d) : 0xff5252;
      a.hpBar.clear()
        .roundRect(-w / 2 - 1, -1, w + 2, 7, 3.5).fill({ color: 0x0a0c14, alpha: 0.85 })
        .roundRect(-w / 2 + 0.5, 0.5, (w - 1) * pct, 4, 2).fill(col)
        .roundRect(-w / 2 + 0.5, 0.5, (w - 1) * pct, 1.6, 1).fill({ color: 0xffffff, alpha: 0.35 });
      a.hpBar.position.y = -a.height - 8;
    }
  }

  private drawAura(v: UV, u: UnitInst) {
    const o = v.aura;
    o.clear();
    const s = u.def.scale;
    const pulse = 0.5 + 0.5 * Math.sin(this.clock * 5 + v.seed);
    if (u.enraged) {
      o.ellipse(0, -20 * s, 24 * s, 34 * s).fill({ color: 0xff2a2a, alpha: 0.1 + pulse * 0.1 });
      o.ellipse(0, 1.5, 28 * s, 8 * s).stroke({ width: 3, color: 0xff3a3a, alpha: 0.6 + pulse * 0.3 });
    }
    if (u.def.skill === 'ironWill' && u.armor > u.def.armor) {
      const k = Math.min(1, (u.armor - u.def.armor) / 30);
      o.ellipse(0, -22 * s, 20 * s, 32 * s).fill({ color: 0x9ad0ff, alpha: 0.05 + k * 0.14 });
      o.ellipse(0, 1.5, 22 * s, 6.4 * s).stroke({ width: 1.5 + k * 2.5, color: 0xcfe8ff, alpha: 0.4 + k * 0.5 });
    }
    if (u.invuln > 0) o.ellipse(0, -22 * s, 24 * s, 36 * s).fill({ color: 0xffe066, alpha: 0.18 + pulse * 0.12 });
    if (u.def.skill === 'palm' && (u.timers.palm ?? 1) <= 0) {
      o.ellipse(0, 1.5, 26 * s, 7.6 * s).stroke({ width: 2, color: 0xffd34d, alpha: 0.5 + pulse * 0.4 });
    }
    if (u.def.skill === 'heal') {
      const rx = (120 / LANE_LEN) * (this.W - this.padL * 2) / this.us;
      o.ellipse(0, 1.5, rx, rx * 0.3).stroke({ width: 1.2, color: 0x7dffb0, alpha: 0.12 + pulse * 0.1 });
    }
    if (u.shield > 0) o.ellipse(0, -22 * s, 22 * s, 34 * s).fill({ color: 0x9ad0ff, alpha: 0.1 }).stroke({ width: 1.6, color: 0xcfe8ff, alpha: 0.7 });
    if (u.buffs.length) {
      if (u.buffs.some((b) => b.mul > 1)) o.ellipse(0, 1.5, 24 * s, 7 * s).stroke({ width: 2, color: 0xffd34d, alpha: 0.55 + pulse * 0.35 });
      if (u.buffs.some((b) => b.mul < 1)) o.ellipse(0, 1.5, 24 * s, 7 * s).stroke({ width: 2, color: 0x7ad0ff, alpha: 0.55 + pulse * 0.35 });
    }
    // công trình có vùng tác dụng: vẽ vòng mờ
    if (u.def.kind === 'defense' && ['thorns', 'drum', 'altar', 'frost', 'firepit'].includes(u.def.skill)) {
      const rx = (u.def.range / LANE_LEN) * (this.W - this.padL * 2) / (this.us * this.depth(u.lane) * u.def.scale);
      const col = u.def.skill === 'frost' ? 0x9ad8ff : u.def.skill === 'altar' ? 0x7dffb0 : u.def.skill === 'firepit' ? 0xff7a2a : 0xffd34d;
      o.ellipse(0, 1.5, rx, rx * 0.28).fill({ color: col, alpha: u.def.skill === 'firepit' ? 0.16 : 0.05 }).stroke({ width: 1.2, color: col, alpha: 0.18 + pulse * 0.12 });
    }
  }

  private syncTowers(dt: number) {
    for (const lane of this.battle.lanes) {
      for (const side of [0, 1] as const) {
        const tv = this.towers[lane.index]?.[side];
        if (!tv) continue;
        const f = lane.flags[side];
        const broken = f.hp <= 0;
        if (broken !== tv.lastBroken) {
          tv.lastBroken = broken;
          this.drawTower(tv, broken);
          this.drawFlag(tv, broken, false);
          if (broken) this.vfx.dust(tv.c.x + tv.w / 2, tv.c.y, 10, 2);
        }
        const victory = lane.winner === side;
        if (victory || tv.lastHp < 0) this.drawFlag(tv, broken, victory);
        if (!broken) tv.flagC.rotation = Math.sin(this.clock * 2.2 + lane.index + side) * 0.05;
        tv.lamps.forEach((lg, i) => {
          lg.visible = !broken;
          lg.rotation = Math.sin(this.clock * 2.4 + i * 1.7 + lane.index) * 0.18;
        });
        if (broken) {
          tv.smokeT -= dt;
          if (tv.smokeT <= 0) {
            tv.smokeT = 0.3;
            this.vfx.smoke(tv.c.x + tv.w / 2, tv.c.y - tv.h * 0.35, 1);
            if (Math.random() < 0.5) this.vfx.spark(tv.c.x + tv.w / 2 + (Math.random() - 0.5) * tv.w * 0.5, tv.c.y - tv.h * 0.3, 0xff9a3a, 1, 40);
          }
        }
        tv.body.tint = f.flash > 0 ? 0xffb0b0 : 0xffffff;
        const hp = Math.ceil(f.hp);
        if (hp !== tv.lastHp) {
          tv.lastHp = hp;
          this.drawPlate(tv, f.hp, f.maxHp, broken, side);
        }
      }
    }
  }

  /** bảng máu cờ kiểu "850/1000" phía trên tháp */
  private drawPlate(tv: TowerView, hp: number, max: number, broken: boolean, side: Side) {
    const pw = Math.max(52, tv.w * 1.2);
    const ph = 15;
    const px = tv.w / 2 - pw / 2;
    const py = 6;
    const col = SIDE_COLOR[side];
    const pct = Math.max(0, hp / max);
    tv.plate.clear()
      .roundRect(px, py, pw, ph, 5).fill({ color: 0x0a0c14, alpha: 0.88 }).stroke({ width: 1.4, color: lighter(col, 0.25) })
      .roundRect(px + 1.5, py + 1.5, (pw - 3) * pct, ph - 3, 3.5).fill(col)
      .roundRect(px + 1.5, py + 1.5, (pw - 3) * pct, (ph - 3) * 0.4, 2).fill({ color: 0xffffff, alpha: 0.3 });
    tv.hpText.text = `${Math.ceil(hp)}/${Math.round(max)}`;
    tv.hpText.position.set(tv.w / 2, py + ph / 2 + 0.5);
    tv.plate.visible = !broken;
    tv.hpText.visible = !broken;
  }

  private updateOverlays(dt: number) {
    for (let i = 0; i < this.battle.lanes.length; i++) {
      const lane = this.battle.lanes[i];
      const hl = this.hl[i];
      const y0 = this.laneTop(i);
      if (this.dragging && lane.winner === null) {
        const hot = this.hoverLane === i;
        hl.visible = true;
        const pulse = 0.5 + 0.5 * Math.sin(this.clock * 6);
        hl.clear()
          .rect(0, y0, this.W, this.laneH)
          .fill({ color: 0xffd34d, alpha: hot ? 0.16 + pulse * 0.08 : 0.04 })
          .rect(2, y0 + 2, this.W - 4, this.laneH - 4)
          .stroke({ width: hot ? 3 : 1.5, color: 0xffd34d, alpha: hot ? 0.95 : 0.35 });
        if (hot) {
          if (this.hoverX >= 0) {
            // vị trí đặt công trình phòng thủ
            const mx = this.sx(this.hoverX);
            hl.roundRect(mx - 20 * this.us, y0 + this.laneH * 0.18, 40 * this.us, this.laneH * 0.66, 8).fill({ color: 0x3d8bff, alpha: 0.22 }).stroke({ width: 2, color: 0xffd34d, alpha: 0.95 });
            hl.moveTo(mx, y0 + this.laneH * 0.1).lineTo(mx, y0 + this.laneH * 0.9).stroke({ width: 1.5, color: 0xffd34d, alpha: 0.7 });
          } else {
            const zone = this.sx(180) - this.padL + 10;
            hl.rect(0, y0, this.padL + zone, this.laneH).fill({ color: 0x3d8bff, alpha: 0.14 });
          }
          for (let k = 0; k < (this.hoverX >= 0 ? 0 : 3); k++) {
            const ax = this.padL + 20 + k * 22 + ((this.clock * 40) % 22);
            const ay = y0 + this.laneH * 0.55;
            hl.poly([ax, ay - 8, ax + 10, ay, ax, ay + 8]).fill({ color: 0xffd34d, alpha: 0.5 - k * 0.12 });
          }
        }
      } else hl.visible = false;
      const bn = this.banners[i];
      if (bn.visible) {
        this.bannerAge[i] += dt;
        const k = Math.min(1, this.bannerAge[i] / 0.35);
        bn.alpha = Math.min(1, k * 1.6);
        const plate = bn.children[1];
        if (plate) plate.scale.set(0.6 + 0.4 * easeOutBack(k));
      }
    }
    if (this.toast) {
      this.toastT -= dt;
      this.toast.alpha = Math.min(1, this.toastT * 1.5);
      this.toast.scale.set(1 + Math.sin(this.clock * 6) * 0.03);
      if (this.toastT <= 0) {
        this.toast.destroy();
        this.toast = null;
      }
    }
  }

  private showToast(text: string) {
    this.toast?.destroy();
    const tx = new Text({ text, style: textStyle(Math.max(18, 22 * Math.min(this.us, 1.3)), 0xffd34d) });
    tx.anchor.set(0.5);
    tx.position.set(this.W / 2, this.H / 2);
    this.overlays.addChild(tx);
    this.toast = tx;
    this.toastT = 3;
  }
}
