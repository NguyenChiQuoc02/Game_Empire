import { Container, Graphics, Text, type Application } from 'pixi.js';
import { buildUnitArt, FLY_LIFT, type UnitArt } from './unitArt';
import { INK, darker, g, lighter, mix, poly, rrect } from './draw';
import { Vfx, textStyle } from './vfx';
import { getLang, t, unitName } from '../i18n';
import { HUNT_CELL, HUNT_CENTER, HUNT_N, HUNT_POINT_R, HUNT_SIZE, HUNT_TEAM_STYLE, TERRAIN, TR, type HuntMapId } from '../data/treasure';
import type { Hunt, HEvent, HUnit } from '../game/hunt';

const NEUTRAL = 0xc8b89a;
const hash2 = (a: number, b: number) => {
  let x = (a * 374761393 + b * 668265263) >>> 0;
  x = (x ^ (x >>> 13)) * 1274126177;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

interface UV {
  art: UnitArt;
  seed: number;
  born: number;
  lastPct: number;
  name?: Text;
  gem?: Graphics;
  prevAtk: number;
  dustT: number;
  swooshAt: number;
}

interface StructView {
  c: Container;
  bar: Graphics;
  lastPct: number;
  body?: Graphics;
}

interface Proj {
  o: Graphics;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  kind: string;
}

interface MeteorFx {
  x: number;
  y: number;
  r: number;
  t: number;
  warn: number;
}

/** Hiển thị chế độ Truy Tìm Kho Báu: bản đồ 2D nhìn từ trên xuống, camera kéo/thu phóng, quân vẽ bằng buildUnitArt. */
export class HuntView {
  readonly root = new Container();
  private world = new Container();
  private terrainG = new Container();
  private lavaG = g();
  private overlay = g();
  private structs = new Container();
  private unitsLayer = new Container();
  private screenFx = new Container();
  private vfx: Vfx;
  private views = new Map<number, UV>();
  private sViews = new Map<number, StructView>();
  private treasureViews: Container[] = [];
  private pointViews: { c: Container; ring: Graphics; flag: Graphics; last: string }[] = [];
  private projs: Proj[] = [];
  private meteors: MeteorFx[] = [];
  private zoneG = g();
  private toast: Text | null = null;
  private toastT = 0;
  private clock = 0;
  private shake = 0;
  W = 0;
  H = 0;
  cx = HUNT_CENTER;
  cy = HUNT_CENTER;
  zoom = 1;
  private hostRef = { us: 1, W: 0, H: 0, laneH: 0, padL: 0, laneLen: 1, sx: (x: number) => x, gy: () => 0 };
  /** đội mà người chơi nhìn từ góc độ của họ (để làm mờ quân ẩn trong rừng) */
  readonly viewTeam = 0;

  constructor(private app: Application, private hunt: Hunt) {
    this.vfx = new Vfx(this.hostRef);
    this.world.addChild(this.terrainG, this.lavaG, this.structs, this.overlay, this.zoneG);
    this.unitsLayer.sortableChildren = true;
    this.root.addChild(this.world, this.unitsLayer, this.vfx.layer, this.screenFx);
    app.stage.addChild(this.root);
    // nền ngoài bản đồ cùng tông với địa hình để màn rộng không bị viền đen
    app.renderer.background.color = mix(hunt.map.def.sky, 0x000000, 0.35);
    this.drawTerrain();
    this.buildStructures();
    this.cx = hunt.teams[0].castle.x * 0.45 + HUNT_CENTER * 0.55;
    this.cy = hunt.teams[0].castle.y * 0.45 + HUNT_CENTER * 0.55;
  }

  destroy() {
    this.app.renderer.background.color = 0x07090f;
    this.app.stage.removeChild(this.root);
    this.root.destroy({ children: true });
  }

  // ───────────────────────── camera ─────────────────────────
  get fitScale() {
    return Math.min(this.W / HUNT_SIZE, this.H / HUNT_SIZE);
  }
  get scale() {
    return this.fitScale * this.zoom;
  }
  /** nhân kích thước quân theo độ phóng */
  get us() {
    return Math.max(0.5, Math.min(1.5, this.scale * 1.3));
  }

  layout(W: number, H: number) {
    this.W = W;
    this.H = H;
    this.hostRef.W = W;
    this.hostRef.H = H;
    this.clampCam();
  }

  private clampCam() {
    const hw = this.W / (2 * this.scale);
    const hh = this.H / (2 * this.scale);
    this.cx = hw * 2 >= HUNT_SIZE ? HUNT_CENTER : Math.max(hw, Math.min(HUNT_SIZE - hw, this.cx));
    this.cy = hh * 2 >= HUNT_SIZE ? HUNT_CENTER : Math.max(hh, Math.min(HUNT_SIZE - hh, this.cy));
  }

  pan(dxPx: number, dyPx: number) {
    this.cx -= dxPx / this.scale;
    this.cy -= dyPx / this.scale;
    this.clampCam();
  }

  zoomAt(factor: number, sx: number, sy: number) {
    const before = this.screenToWorld(sx, sy);
    this.zoom = Math.max(1, Math.min(4.5, this.zoom * factor));
    const after = this.screenToWorld(sx, sy);
    this.cx += before.x - after.x;
    this.cy += before.y - after.y;
    this.clampCam();
  }

  focus(x: number, y: number, zoom?: number) {
    if (zoom) this.zoom = zoom;
    this.cx = x;
    this.cy = y;
    this.clampCam();
  }

  w2s(x: number, y: number) {
    return { x: (x - this.cx) * this.scale + this.W / 2, y: (y - this.cy) * this.scale + this.H / 2 };
  }
  screenToWorld(sx: number, sy: number) {
    return { x: (sx - this.W / 2) / this.scale + this.cx, y: (sy - this.H / 2) / this.scale + this.cy };
  }

  /** quân gần điểm chạm nhất (toạ độ màn hình) */
  unitAt(sx: number, sy: number): HUnit | null {
    let best: HUnit | null = null;
    let bd = Infinity;
    for (const u of this.hunt.units) {
      if (!u.alive || u.ghost || u.bridge >= 0) continue;
      const p = this.w2s(u.x, u.y);
      const r = Math.max(14, (u.isCastle ? 56 : 18 * u.def.scale) * (u.isCastle ? this.scale : this.us));
      const cyOff = u.isCastle ? 0 : -22 * this.us * u.def.scale;
      const d = Math.hypot(p.x - sx, p.y + cyOff - sy);
      if (d < r && d < bd) {
        bd = d;
        best = u;
      }
    }
    return best;
  }

  // ───────────────────────── địa hình ─────────────────────────
  private palette(id: HuntMapId) {
    const dark = id === 'm7' || id === 'm8' || id === 'm10';
    return {
      [TR.GRASS]: id === 'm5' ? 0x6f8a4a : 0x58904a,
      [TR.ROAD]: id === 'm9' ? 0x7c7c86 : id === 'm6' ? 0x9a8a6a : 0xb9a06e,
      [TR.FOREST]: id === 'm3' ? 0x1f5a2c : 0x2e6a3a,
      [TR.SWAMP]: 0x4a5e3e,
      [TR.HILL]: dark ? 0x6a5a48 : id === 'm2' ? 0xc4a45e : 0x86a257,
      [TR.SAND]: 0xdcc383,
      [TR.WATER]: 0x2f70b8,
      [TR.ROCK]: id === 'm9' ? 0x8a5a48 : id === 'm5' ? 0x6a6660 : 0x6c6c76,
      [TR.LAVA]: 0xe2561e,
      [TR.BRIDGE]: 0x9a7240,
      [TR.PLAZA]: id === 'm6' ? 0xb7ad9a : 0xc8bea6,
      [TR.ASH]: id === 'm10' ? 0x4a3a40 : 0x544850,
      [TR.SPRING]: 0x46d0c4,
    } as Record<number, number>;
  }

  drawTerrain() {
    const id = this.hunt.cfg.setup.map;
    const pal = this.palette(id);
    const grid = this.hunt.grid;
    this.terrainG.removeChildren().forEach((c) => c.destroy({ children: true }));
    const tiles = g();
    const decor = g();
    this.lavaG.clear();
    const C = HUNT_CELL;
    for (let cy = 0; cy < HUNT_N; cy++) {
      for (let cx = 0; cx < HUNT_N; cx++) {
        const t = grid[cy * HUNT_N + cx];
        const base = pal[t] ?? 0x58904a;
        const n = hash2(cx, cy);
        const soft = t === TR.ASH || t === TR.ROAD || t === TR.PLAZA ? 0.4 : 1;
        const col = mix(base, n < 0.5 ? 0x000000 : 0xffffff, (0.03 + n * 0.04) * soft);
        tiles.rect(cx * C, cy * C, C + 0.6, C + 0.6).fill(col);
      }
    }
    for (let cy = 0; cy < HUNT_N; cy++) {
      for (let cx = 0; cx < HUNT_N; cx++) {
        const t = grid[cy * HUNT_N + cx];
        const x = cx * C;
        const y = cy * C;
        const n = hash2(cx + 17, cy + 31);
        const m = hash2(cx + 3, cy + 91);
        switch (t) {
          case TR.FOREST: {
            const trunk = darker(0x6a4a2a, 0.2);
            for (let k = 0; k < 2; k++) {
              const tx = x + 6 + hash2(cx, cy + k * 7) * 18;
              const ty = y + 10 + hash2(cx + k * 5, cy) * 16;
              decor.ellipse(tx, ty + 7, 7, 2.6).fill({ color: 0x000000, alpha: 0.2 });
              decor.rect(tx - 1.4, ty, 2.8, 7).fill(trunk);
              const lc = mix(0x2f8a3c, 0x153a1e, hash2(cx + k, cy));
              decor.circle(tx, ty - 3, 8.5).fill(darker(lc, 0.25));
              decor.circle(tx - 1.5, ty - 5, 7).fill(lc);
              decor.circle(tx - 3, ty - 7.5, 2.4).fill({ color: 0xffffff, alpha: 0.12 });
            }
            break;
          }
          case TR.ROCK: {
            if (id === 'm9') {
              // nhà: mái ngói
              decor.rect(x + 1, y + 6, C - 2, C - 6).fill(0xb89a74);
              poly(decor, [x - 1, y + 9, x + C / 2, y - 3, x + C + 1, y + 9], mix(0xb04a3a, 0x5a2a22, n * 0.5), 1.1);
              decor.rect(x + 8 + n * 6, y + 14, 5, 7).fill(0x4a3a30);
            } else if (id === 'm6') {
              decor.rect(x, y + 4, C, C - 4).fill(0x8a8a96);
              for (let k = 0; k < 3; k++) decor.rect(x + 1 + k * 10, y, 7, 6).fill(0x9a9aa6);
              decor.rect(x, y + 20, C, 1.4).fill({ color: 0x000000, alpha: 0.25 });
            } else {
              const peak = id === 'm5' || id === 'm8';
              const c0 = mix(0x7a7a84, 0x4a4a54, n * 0.6);
              poly(decor, peak ? [x + 2, y + 28, x + 15, y + 2 + n * 6, x + 28, y + 28] : [x + 3, y + 24, x + 6, y + 8, x + 18, y + 4, x + 27, y + 14, x + 26, y + 26], c0, 1.2);
              decor.poly(peak ? [x + 15, y + 2 + n * 6, x + 22, y + 15, x + 15, y + 12] : [x + 6, y + 8, x + 18, y + 4, x + 14, y + 12]).fill({ color: 0xffffff, alpha: 0.18 });
            }
            break;
          }
          case TR.WATER: {
            if (n < 0.34) decor.moveTo(x + 4, y + 10 + m * 10).quadraticCurveTo(x + 11, y + 6 + m * 10, x + 18, y + 10 + m * 10).stroke({ width: 1.2, color: 0xbfe3ff, alpha: 0.45 });
            break;
          }
          case TR.LAVA: {
            this.lavaG.circle(x + 6 + n * 18, y + 6 + m * 18, 3 + n * 3).fill({ color: 0xffd34d, alpha: 0.55 });
            break;
          }
          case TR.BRIDGE: {
            for (let k = 0; k < 4; k++) decor.rect(x, y + 3 + k * 7, C, 1.6).fill({ color: 0x3a2412, alpha: 0.4 });
            break;
          }
          case TR.ROAD: {
            if (n < 0.25) decor.circle(x + 5 + m * 20, y + 6 + n * 60, 1.8).fill({ color: 0x000000, alpha: 0.12 });
            break;
          }
          case TR.PLAZA: {
            decor.rect(x + 0.5, y + 0.5, C - 1, C - 1).stroke({ width: 1, color: 0x000000, alpha: 0.12 });
            break;
          }
          case TR.HILL: {
            decor.ellipse(x + 15, y + 17, 12, 7).fill({ color: 0xffffff, alpha: 0.1 });
            decor.ellipse(x + 15, y + 20, 12, 5).fill({ color: 0x000000, alpha: 0.08 });
            break;
          }
          case TR.SWAMP: {
            if (n < 0.5) decor.circle(x + 8 + m * 14, y + 8 + n * 30, 3).stroke({ width: 1, color: 0x9ad07a, alpha: 0.5 });
            break;
          }
          case TR.SAND: {
            if (n < 0.3) decor.moveTo(x + 3, y + 12 + m * 8).quadraticCurveTo(x + 14, y + 8 + m * 8, x + 26, y + 12 + m * 8).stroke({ width: 1, color: 0xb89a54, alpha: 0.5 });
            break;
          }
          case TR.SPRING: {
            decor.circle(x + 15, y + 15, 9).fill({ color: 0x9af6ee, alpha: 0.55 });
            decor.circle(x + 15, y + 15, 4).fill({ color: 0xffffff, alpha: 0.5 });
            break;
          }
          case TR.GRASS: {
            if (n < 0.1) decor.moveTo(x + 8, y + 22).lineTo(x + 6, y + 15).moveTo(x + 8, y + 22).lineTo(x + 11, y + 15).stroke({ width: 1, color: 0x2e6a2a, alpha: 0.7 });
            break;
          }
          default:
            break;
        }
      }
    }
    // vùng rừng: bóng đổ nhẹ để dễ nhìn
    this.terrainG.addChild(tiles, decor);
    this.lavaG.alpha = 0.8;
  }

  // ───────────────────────── công trình ─────────────────────────
  private buildStructures() {
    const h = this.hunt;
    // kho báu
    h.treasures.forEach((tr) => {
      const c = new Container();
      c.addChild(this.makeChest());
      const beam = g();
      beam.rect(-5, -150, 10, 150).fill({ color: 0xffe9a0, alpha: 0.22 });
      beam.rect(-2, -150, 4, 150).fill({ color: 0xffffff, alpha: 0.35 });
      c.addChildAt(beam, 0);
      c.position.set(tr.spotX, tr.spotY);
      this.structs.addChild(c);
      this.treasureViews.push(c);
    });
    // điểm kiểm soát
    for (const p of h.points) {
      const c = new Container();
      const ring = g();
      const flag = g();
      c.addChild(ring, flag);
      c.position.set(p.x, p.y);
      this.structs.addChild(c);
      this.pointViews.push({ c, ring, flag, last: '' });
    }
    this.overlay.alpha = 1;
  }

  private makeChest(): Container {
    const c = new Container();
    const sh = g();
    sh.ellipse(0, 4, 20, 6).fill({ color: 0x000000, alpha: 0.35 });
    const b = g();
    rrect(b, -15, -12, 30, 16, 3, 0x8a5a2a);
    poly(b, [-15, -12, -13, -22, 13, -22, 15, -12], 0xa8702e, 1.2);
    b.rect(-15, -9, 30, 2.4).fill(0xffd34d);
    b.rect(-2.4, -14, 4.8, 8).fill(0xffd34d);
    // viên ngọc trên nắp
    poly(b, [0, -36, 7, -28, 0, -20, -7, -28], 0x58e8ff, 1.2);
    b.poly([0, -36, 3.5, -30, 0, -28, -3, -30]).fill({ color: 0xffffff, alpha: 0.7 });
    c.addChild(sh, b);
    return c;
  }

  private makeCastle(color: number): Container {
    const c = new Container();
    const sh = g();
    sh.ellipse(0, 6, 78, 24).fill({ color: 0x000000, alpha: 0.32 });
    const b = g();
    // tường + tháp
    rrect(b, -56, -46, 112, 50, 4, 0x9a9aa6);
    for (let i = -52; i < 50; i += 16) b.rect(i, -54, 9, 9).fill(0xa8a8b4).stroke({ width: 1, color: lighter(INK, 0.1) });
    for (const sx of [-62, 62]) {
      rrect(b, sx - 15, -88, 30, 94, 4, 0xaaaab8);
      poly(b, [sx - 20, -88, sx, -112, sx + 20, -88], color, 1.4);
      b.rect(sx - 3, -66, 6, 12).fill(0x2a2a36);
    }
    // cổng + tháp chính
    rrect(b, -30, -86, 60, 90, 4, 0xb4b4c2);
    poly(b, [-36, -86, 0, -122, 36, -86], color, 1.6);
    b.poly([-36, -86, 0, -122, 0, -104, -22, -86]).fill({ color: 0xffffff, alpha: 0.18 });
    b.roundRect(-11, -30, 22, 34, 11).fill(0x3a2a22);
    b.rect(-3, -70, 6, 12).fill(0x2a2a36);
    // cờ
    b.rect(-1, -150, 2.4, 34).fill(0x3a2a22);
    poly(b, [1, -150, 26, -142, 1, -133], color, 1.2);
    c.addChild(sh, b);
    return c;
  }

  private buildStructViews() {
    for (const u of this.hunt.units) {
      if (this.sViews.has(u.uid)) continue;
      if (u.isCastle) {
        const color = HUNT_TEAM_STYLE[u.team].color;
        const body = this.makeCastle(color);
        const bar = g();
        bar.position.set(0, -170);
        const c = new Container();
        c.addChild(body, bar);
        c.position.set(u.x, u.y);
        this.structs.addChild(c);
        this.sViews.set(u.uid, { c, bar, lastPct: -1, body: body as unknown as Graphics });
      } else if (u.bridge >= 0) {
        const bar = g();
        const c = new Container();
        c.addChild(bar);
        c.position.set(u.x, u.y - 8);
        this.structs.addChild(c);
        this.sViews.set(u.uid, { c, bar, lastPct: -1 });
      }
    }
  }

  // ───────────────────────── quân ─────────────────────────
  private teamColor(u: HUnit) {
    return u.team >= 0 ? HUNT_TEAM_STYLE[u.team].color : NEUTRAL;
  }

  private makeUnitView(u: HUnit): UV {
    const art = buildUnitArt(u.def, 0, false, this.teamColor(u));
    const v: UV = { art, seed: u.uid * 0.77, born: this.clock, lastPct: -1, prevAtk: 0, dustT: Math.random() * 0.2, swooshAt: 0 };
    if (u.def.kind === 'general' || u.guardian) {
      const text = u.guardian ? t('hunt.guardian', { name: unitName(u.def) }) : unitName(u.def);
      const tx = new Text({ text, style: textStyle(u.guardian ? 13 : 11, u.guardian ? 0xff8a7a : 0xffe08a) });
      tx.anchor.set(0.5, 1);
      tx.position.set(0, -art.height - 12);
      art.root.addChild(tx);
      v.name = tx;
    }
    art.root.scale.set(0.01);
    this.unitsLayer.addChild(art.root);
    return v;
  }

  private updateUnit(v: UV, u: HUnit, dt: number) {
    const a = v.art;
    const p = this.w2s(u.x, u.y);
    const us = this.us * (u.guardian ? 1.05 : 1);
    a.root.position.set(p.x + this.shakeX, p.y + this.shakeY);
    a.root.zIndex = p.y;
    const age = this.clock - v.born;
    const pop = age < 0.4 ? 1 - Math.pow(1 - age / 0.4, 3) * 0.9 : 1;
    a.root.scale.set(Math.max(0.01, us * pop));
    const atk = u.attackAnim > 0 ? Math.max(0.001, Math.min(1, 1 - u.attackAnim / 0.3)) : 0;
    a.update(this.clock + v.seed, u.moving || u.burrowT > 0, atk);
    if (u.alive && u.attackAnim > v.prevAtk + 0.05 && (a.mode === 'swing' || a.mode === 'thrust')) v.swooshAt = this.clock + (a.mode === 'swing' ? 0.09 : 0.05);
    v.prevAtk = u.attackAnim;
    if (v.swooshAt > 0 && this.clock >= v.swooshAt) {
      v.swooshAt = 0;
      this.vfx.swoosh(p.x, p.y - 28 * us * u.def.scale, u.face, a.mode === 'swing' ? 'swing' : 'thrust', us * Math.min(1.5, u.def.scale), u.def.kind === 'general' ? 0xfff0b0 : 0xffffff);
    }
    const fly = !!u.def.tags?.includes('fly');
    if (!u.alive) {
      a.hpBar.visible = false;
      if (v.name) v.name.visible = false;
      if (v.gem) v.gem.visible = false;
      const pr = 1 - Math.max(0, u.deadT) / 0.7;
      if (u.vanish) a.root.alpha = Math.max(0, u.deadT / 0.9);
      else {
        a.art.rotation = (u.face > 0 ? -1 : 1) * Math.min(1.5, pr * 2.2);
        a.art.y = pr * 6 - (fly ? FLY_LIFT * (1 - pr) : 0);
        a.root.alpha = Math.max(0, 1 - pr * pr);
      }
      return;
    }
    const hidden = u.burrowT > 0 ? 1 : 0;
    const dim = !hidden && this.hunt.hiddenFrom(this.viewTeam, u);
    a.root.alpha = hidden ? 0 : dim ? 0.3 : Math.min(1, age * 5);
    if (v.name) v.name.visible = !hidden && !dim;
    a.art.rotation = 0;
    a.art.y = fly ? -FLY_LIFT + Math.sin((this.clock + v.seed) * 2.4) * 3 : 0;
    const hk = Math.max(0, u.hitFlash / 0.12);
    const dir = u.face;
    a.art.x = -dir * 3 * hk;
    a.art.scale.set(dir * a.baseScale * (1 + hk * 0.06), a.baseScale * (1 - hk * 0.08));
    a.art.tint = u.hitFlash > 0 ? 0xff8f8f : u.invuln > 0 ? 0xfff2a0 : u.poison ? 0xc4ffa8 : u.stunT > 0 ? 0xd0d8ff : 0xffffff;
    a.hpBar.visible = !u.ghost;
    // kho báu trên đầu người khiêng
    if (u.carrying) {
      if (!v.gem) {
        const gem = g();
        poly(gem, [0, -10, 7, -3, 0, 5, -7, -3], 0x58e8ff, 1.2);
        gem.position.set(0, -a.height - 24);
        a.root.addChild(gem);
        v.gem = gem;
      }
      v.gem.visible = true;
      v.gem.y = -a.height - 24 + Math.sin(this.clock * 4) * 2;
    } else if (v.gem) v.gem.visible = false;
    // bụi khi chạy
    if (u.moving && !fly && u.burrowT <= 0) {
      v.dustT -= dt;
      if (v.dustT <= 0) {
        v.dustT = u.speed >= 70 ? 0.16 : 0.34;
        this.vfx.dust(p.x - dir * 6 * us, p.y, 1, 0.5, 0xd8cdb0);
      }
    } else if (u.burrowT > 0) {
      v.dustT -= dt;
      if (v.dustT <= 0) {
        v.dustT = 0.06;
        this.vfx.dust(p.x, p.y, 2, 1, 0x7a5a38);
      }
    }
    const pct = Math.max(0, u.hp / u.maxHp);
    if (Math.abs(pct - v.lastPct) > 0.004) {
      v.lastPct = pct;
      const w = a.barW;
      const col = u.team < 0 ? 0xffa14d : HUNT_TEAM_STYLE[u.team].color;
      a.hpBar.clear()
        .roundRect(-w / 2 - 1, -1, w + 2, 7, 3.5).fill({ color: 0x0a0c14, alpha: 0.85 })
        .roundRect(-w / 2 + 0.5, 0.5, (w - 1) * pct, 4, 2).fill(col)
        .roundRect(-w / 2 + 0.5, 0.5, (w - 1) * pct, 1.6, 1).fill({ color: 0xffffff, alpha: 0.35 });
      a.hpBar.position.y = -a.height - 8;
    }
  }

  private updateStruct(sv: StructView, u: HUnit) {
    const p = this.w2s(u.x, u.y);
    sv.c.alpha = u.alive ? 1 : Math.max(0, u.deadT / 0.7);
    void p;
    sv.c.position.set(u.x, u.isCastle ? u.y : u.y - 8);
    const pct = Math.max(0, u.hp / u.maxHp);
    if (Math.abs(pct - sv.lastPct) > 0.004) {
      sv.lastPct = pct;
      const col = u.isCastle ? HUNT_TEAM_STYLE[u.team].color : 0xffc04d;
      const w = u.isCastle ? 110 : 44;
      sv.bar.clear();
      if (u.isCastle || pct < 0.999) {
        sv.bar.roundRect(-w / 2 - 2, -2, w + 4, 11, 5).fill({ color: 0x0a0c14, alpha: 0.88 })
          .roundRect(-w / 2, 0, w * pct, 7, 3.5).fill(col)
          .roundRect(-w / 2, 0, w * pct, 2.6, 1.3).fill({ color: 0xffffff, alpha: 0.3 });
      }
    }
    if (sv.body) sv.body.tint = u.hitFlash > 0 ? 0xffb0b0 : 0xffffff;
  }

  // ───────────────────────── vòng cập nhật ─────────────────────────
  private shakeX = 0;
  private shakeY = 0;

  update(dt: number) {
    this.clock += dt;
    this.hostRef.us = this.us;
    // rung màn hình
    this.shake = this.shake > 0.1 ? this.shake * Math.exp(-7 * dt) : 0;
    this.shakeX = (Math.random() - 0.5) * this.shake;
    this.shakeY = (Math.random() - 0.5) * this.shake;
    this.world.scale.set(this.scale);
    this.world.position.set(this.W / 2 - this.cx * this.scale + this.shakeX, this.H / 2 - this.cy * this.scale + this.shakeY);
    this.lavaG.alpha = 0.55 + 0.25 * Math.sin(this.clock * 2.2);

    this.buildStructViews();
    const seen = new Set<number>();
    for (const u of this.hunt.units) {
      if (u.isCastle || u.bridge >= 0) {
        const sv = this.sViews.get(u.uid);
        if (sv) this.updateStruct(sv, u);
        seen.add(u.uid);
        continue;
      }
      seen.add(u.uid);
      let v = this.views.get(u.uid);
      if (!v) {
        v = this.makeUnitView(u);
        this.views.set(u.uid, v);
        const p = this.w2s(u.x, u.y);
        this.vfx.ring(p.x, p.y, 24 * this.us * u.def.scale, this.teamColor(u), 0.45, 2.5);
      }
      this.updateUnit(v, u, dt);
    }
    for (const [uid, v] of this.views) {
      if (!seen.has(uid)) {
        v.art.root.destroy({ children: true });
        this.views.delete(uid);
      }
    }
    for (const [uid, sv] of this.sViews) {
      if (!seen.has(uid)) {
        sv.c.destroy({ children: true });
        this.sViews.delete(uid);
      }
    }
    this.tickMeteors(dt);
    this.updateTreasures();
    this.updatePoints();
    this.updateOverlay();
    this.updateProjs(dt);
    this.vfx.update(dt);
    if (this.toast) {
      this.toastT -= dt;
      this.toast.alpha = Math.min(1, this.toastT * 2);
      if (this.toastT <= 0) {
        this.toast.destroy();
        this.toast = null;
      }
    }
  }

  private updateTreasures() {
    this.hunt.treasures.forEach((tr, i) => {
      const c = this.treasureViews[i];
      if (!c) return;
      const bob = Math.sin(this.clock * 3 + i) * 3;
      c.visible = tr.state !== 'delivered';
      c.position.set(tr.state === 'locked' ? tr.spotX : tr.x, (tr.state === 'locked' ? tr.spotY : tr.y) + (tr.state === 'carried' ? -4 : 0));
      const chest = c.children[1] as Container;
      chest.y = tr.state === 'carried' ? -50 + bob : bob;
      c.alpha = tr.state === 'locked' ? 0.45 : 1;
      const beam = c.children[0] as Graphics;
      beam.alpha = tr.state === 'locked' ? 0.3 : 0.7 + 0.3 * Math.sin(this.clock * 4);
    });
  }

  private updatePoints() {
    const h = this.hunt;
    h.points.forEach((p, i) => {
      const pv = this.pointViews[i];
      if (!pv) return;
      const owner = p.owner;
      const team = owner >= 0 ? h.teams.find((t) => t.group === owner) : undefined;
      // chủ điểm hiển thị bằng màu của đội trong nhóm (ưu tiên người chơi)
      const mine = owner >= 0 && h.teams[0].group === owner ? h.teams[0] : team;
      const color = mine ? HUNT_TEAM_STYLE[mine.id].color : 0xdddddd;
      const key = `${owner}|${Math.round(p.prog * 20)}`;
      if (key === pv.last) return;
      pv.last = key;
      pv.ring.clear();
      pv.ring.circle(0, 0, HUNT_POINT_R).fill({ color, alpha: owner >= 0 ? 0.12 : 0.06 }).stroke({ width: 2.4, color, alpha: 0.65 });
      pv.ring.arc(0, 0, HUNT_POINT_R - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, p.prog)).stroke({ width: 4, color: 0xffffff, alpha: owner >= 0 ? 0.7 : 0.25 });
      pv.flag.clear();
      pv.flag.rect(-1.2, -44, 2.4, 44).fill(0x3a2a22);
      poly(pv.flag, [1, -44, 24, -38, 1, -30], color, 1.2);
    });
  }

  private updateOverlay() {
    const h = this.hunt;
    const o = this.overlay;
    o.clear();
    // vùng an toàn thu hẹp
    this.zoneG.clear();
    if (h.zoneR < 2000) {
      const R = 4000;
      this.zoneG.rect(-R, -R, R * 2 + HUNT_SIZE, R * 2 + HUNT_SIZE).fill({ color: 0xff2a1a, alpha: 0.18 });
      this.zoneG.circle(HUNT_CENTER, HUNT_CENTER, h.zoneR).cut();
      this.zoneG.circle(HUNT_CENTER, HUNT_CENTER, h.zoneR).stroke({ width: 8, color: 0xff5a3a, alpha: 0.75 });
    }
    // thiên thạch: vòng báo trước + quả cầu lửa rơi
    for (const m of this.meteors) {
      const k = Math.max(0, Math.min(1, 1 - m.t / m.warn));
      o.circle(m.x, m.y, m.r).fill({ color: 0xff3a1a, alpha: 0.1 + 0.2 * k }).stroke({ width: 3, color: 0xff7a3a, alpha: 0.5 + 0.4 * k });
      o.circle(m.x, m.y, m.r * k).stroke({ width: 2, color: 0xffd34d, alpha: 0.8 });
      if (m.t < 0.45) {
        const f = m.t / 0.45;
        o.circle(m.x + f * 80, m.y - f * 340, 16).fill(0xffa24a).stroke({ width: 3, color: 0xff3a1a });
        o.circle(m.x + f * 80, m.y - f * 340, 8).fill(0xfff0a0);
      }
    }
    // người chơi: vòng chọn thành nhà + điểm tập kết
    const me = h.teams[0];
    if (me.stance === 'rally') {
      const pulse = 0.5 + 0.5 * Math.sin(this.clock * 5);
      o.circle(me.rally.x, me.rally.y, 36 + pulse * 6).stroke({ width: 3, color: 0xffd34d, alpha: 0.8 });
      o.moveTo(me.rally.x, me.rally.y).lineTo(me.rally.x, me.rally.y - 46).stroke({ width: 2.5, color: 0xffd34d });
      poly(o, [me.rally.x, me.rally.y - 46, me.rally.x + 22, me.rally.y - 39, me.rally.x, me.rally.y - 32], 0xffd34d, 1);
    }
    o.circle(me.castle.x, me.castle.y, 74).stroke({ width: 2, color: HUNT_TEAM_STYLE[0].color, alpha: 0.5 });
  }

  private updateProjs(dt: number) {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.t += dt;
      const k = Math.min(1, p.t / p.dur);
      const a = this.w2s(p.x0, p.y0);
      const b = this.w2s(p.x1, p.y1);
      const arc = p.kind === 'rock' ? 40 * this.scale * 2 : p.kind === 'arrow' ? 8 : 0;
      const x = a.x + (b.x - a.x) * k;
      const y = a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * arc - 26 * this.us;
      p.o.position.set(x, y);
      if (p.kind === 'arrow' || p.kind === 'needle') p.o.rotation = Math.atan2(b.y - a.y, b.x - a.x);
      if (Math.random() < 0.5) this.vfx.spark(x, y, p.kind === 'fire' ? 0xff9a3a : p.kind === 'magic' ? 0x9ad0ff : 0xffffff, 1, 20);
      if (k >= 1) {
        p.o.destroy();
        this.projs.splice(i, 1);
      }
    }
  }

  // ───────────────────────── sự kiện ─────────────────────────
  showToast(text: string) {
    this.toast?.destroy();
    const tx = new Text({ text, style: textStyle(18, 0xffe9a0) });
    tx.anchor.set(0.5);
    tx.position.set(this.W / 2, Math.min(150, this.H * 0.22));
    this.screenFx.addChild(tx);
    this.toast = tx;
    this.toastT = 2.4;
  }

  /** nhận và hiển thị các sự kiện của sim (giao diện xử lý riêng các thông báo HUD) */
  handle(events: HEvent[]) {
    const us = this.us;
    for (const e of events) {
      switch (e.t) {
        case 'hit': {
          const p = this.w2s(e.x, e.y);
          const mine = e.team === 0 || (e.team > 0 && this.hunt.teams[e.team].group === this.hunt.teams[0].group);
          this.vfx.spark(p.x, p.y - 20 * us, mine ? 0xff8a8a : 0xfff0a0, e.big ? 6 : 2);
          if (e.big || e.amount >= 12) this.vfx.floatText(String(Math.max(1, Math.round(e.amount))), p.x + (Math.random() - 0.5) * 14, p.y - 28 * us, mine ? 0xff7a7a : e.big ? 0xffd34d : 0xffffff, e.big ? 16 : 10 + Math.min(5, e.amount / 30), 0.65);
          break;
        }
        case 'proj': {
          const o = g();
          if (e.kind === 'arrow') {
            o.moveTo(-9, 0).lineTo(5, 0).stroke({ width: 2, color: 0xf0dcb0 });
            o.poly([5, -2.4, 10, 0, 5, 2.4]).fill(0xe6eef7);
          } else if (e.kind === 'needle') {
            o.moveTo(-8, 0).lineTo(8, 0).stroke({ width: 1.6, color: 0xffffff });
          } else if (e.kind === 'rock') {
            o.poly([-6, 2, -4, -5, 3, -6, 7, -1, 4, 5]).fill(0x8a8a92).stroke({ width: 1.4, color: 0x2e2e38 });
          } else if (e.kind === 'fire') {
            o.circle(0, 0, 10).fill({ color: 0xff5a1a, alpha: 0.3 });
            o.circle(0, 0, 5.5).fill(0xff8a2a).stroke({ width: 1.2, color: 0xb02a0a });
          } else {
            o.circle(0, 0, 9).fill({ color: 0x6aa8ff, alpha: 0.3 });
            o.circle(0, 0, 4.6).fill(0x9ad0ff).stroke({ width: 1.2, color: 0x2a4a9a });
          }
          o.scale.set(Math.max(0.8, us));
          this.screenFx.addChild(o);
          const d = Math.hypot(e.x1 - e.x0, e.y1 - e.y0);
          this.projs.push({ o, x0: e.x0, y0: e.y0, x1: e.x1, y1: e.y1, t: 0, dur: Math.max(0.14, Math.min(0.6, d / 900 + (e.kind === 'rock' ? 0.25 : 0))), kind: e.kind });
          break;
        }
        case 'aoe': {
          const p = this.w2s(e.x, e.y);
          this.vfx.ring(p.x, p.y, e.r * this.scale, e.color, 0.4, 2.5);
          break;
        }
        case 'fx':
          this.fx(e);
          break;
        case 'text': {
          const p = this.w2s(e.x, e.y);
          this.vfx.floatText(t(e.key, e.p), p.x, p.y - 44 * us, e.color, e.big ? 13 : 10, e.big ? 1 : 0.8);
          break;
        }
        case 'death': {
          const p = this.w2s(e.x, e.y);
          this.vfx.dust(p.x, p.y, e.big ? 8 : 3, e.big ? 1.6 : 0.8);
          if (e.big) this.vfx.ring(p.x, p.y, 50 * us, 0xffffff, 0.5, 3);
          break;
        }
        case 'bounty': {
          if (e.team !== 0) break;
          const p = this.w2s(e.x, e.y);
          this.vfx.floatText(`+${e.amount}`, p.x, p.y - 36 * us, 0xffe066, 11, 0.9);
          break;
        }
        case 'shake':
          this.shake = Math.max(this.shake, e.power * 1.2);
          break;
        case 'terrain':
          this.drawTerrain();
          break;
        case 'meteor':
          this.meteors.push({ x: e.x, y: e.y, r: e.r, t: e.warn, warn: e.warn });
          break;
        case 'castleDown': {
          const c = this.hunt.teams[e.team].castle;
          const p = this.w2s(c.x, c.y);
          this.vfx.dust(p.x, p.y, 14, 2.4);
          this.vfx.ring(p.x, p.y, 120 * this.scale, 0xff8a4d, 0.7, 4);
          break;
        }
        default:
          break;
      }
    }
  }

  /** đếm ngược các vòng cảnh báo thiên thạch (gọi mỗi khung) */
  tickMeteors(dt: number) {
    for (const m of this.meteors) m.t -= dt;
    this.meteors = this.meteors.filter((m) => m.t > -0.1);
  }

  private fx(e: Extract<HEvent, { t: 'fx' }>) {
    const p = this.w2s(e.x, e.y);
    const us = this.us;
    const R = (e.r ?? 60) * this.scale;
    switch (e.kind) {
      case 'fire':
      case 'boom':
        this.vfx.ring(p.x, p.y, R, 0xff6a3d, 0.5, 3.5);
        this.vfx.spark(p.x, p.y - 10, 0xffb04d, 12, 150);
        this.vfx.smoke(p.x, p.y - 8, us);
        break;
      case 'heal':
        this.vfx.ring(p.x, p.y, R, 0x7dffb0, 0.6, 2.5);
        for (let i = 0; i < 5; i++) this.vfx.healCross(p.x + (Math.random() - 0.5) * R, p.y - Math.random() * 20);
        break;
      case 'bolt': {
        const o = g();
        const pts: number[] = [];
        const top = p.y - 220 * us;
        for (let i = 0; i <= 7; i++) pts.push(p.x + (i === 0 || i === 7 ? 0 : (Math.random() - 0.5) * 24), top + ((p.y - 18 - top) * i) / 7);
        this.vfx.anim(o, 0.26, (k) => {
          o.clear();
          o.poly(pts, false).stroke({ width: 5, color: 0x7ad0ff, alpha: (1 - k) * 0.7, join: 'round' });
          o.poly(pts, false).stroke({ width: 2, color: 0xffffff, alpha: 1 - k, join: 'round' });
        });
        this.vfx.ring(p.x, p.y, 34 * us, 0x9ad8ff, 0.3, 2.5);
        this.vfx.spark(p.x, p.y - 14, 0xcfe8ff, 6, 120);
        break;
      }
      case 'poison':
        this.vfx.ring(p.x, p.y, R, 0x9aff6a, 0.7, 3);
        this.vfx.dust(p.x, p.y, 6, 1.4, 0x7acf5a);
        break;
      case 'stun':
        this.vfx.spark(p.x, p.y - 36 * us, 0xffe066, 8, 90);
        break;
      case 'blink':
        this.vfx.ring(p.x, p.y, 38 * us, 0xe0b0ff, 0.45, 3);
        this.vfx.spark(p.x, p.y - 28 * us, 0xe8c8ff, 14, 130);
        break;
      case 'burrow':
        this.vfx.ring(p.x, p.y, Math.max(26 * us, R), 0x9a6a3a, 0.5, 3.5);
        this.vfx.dust(p.x, p.y, 9, 1.4, 0x7a5a38);
        break;
      case 'dash': {
        const q = this.w2s(e.x2 ?? e.x, e.y2 ?? e.y);
        const o = g();
        this.vfx.anim(o, 0.4, (k) => {
          o.clear();
          o.moveTo(p.x, p.y - 24 * us).lineTo(p.x + (q.x - p.x) * Math.min(1, k * 3), p.y + (q.y - p.y) * Math.min(1, k * 3) - 24 * us).stroke({ width: 5 * us * (1 - k * 0.5), color: 0xfff0b0, alpha: 1 - k, cap: 'round' });
        });
        this.vfx.spark(q.x, q.y - 24 * us, 0xffd34d, 8, 120);
        break;
      }
      case 'shield':
        this.vfx.ring(p.x, p.y, 28 * us, 0x9ad0ff, 0.5, 2.5);
        break;
      case 'warcry':
        this.vfx.ring(p.x, p.y, R, 0xffd34d, 0.6, 3);
        this.vfx.spark(p.x, p.y - 24 * us, 0xffe9a0, 8, 100);
        break;
      case 'palm': {
        const q = this.w2s(e.x2 ?? e.x, e.y2 ?? e.y);
        this.vfx.ring(q.x, q.y, R, 0xffa94d, 0.5, 3.5);
        this.vfx.spark(q.x, q.y - 12, 0xffd34d, 10, 130);
        break;
      }
      case 'sweep':
      case 'rock':
        this.vfx.ring(p.x, p.y, R, e.kind === 'sweep' ? 0x7dffb0 : 0xc9a070, 0.4, 3);
        this.vfx.dust(p.x, p.y, 4, 1.1);
        break;
      case 'melody':
        this.vfx.ring(p.x, p.y, R, 0xb8a0ff, 0.7, 3);
        break;
      case 'summon':
        this.vfx.ring(p.x, p.y, 36 * us, 0xd070ff, 0.5, 3);
        break;
      case 'thorns':
        this.vfx.ring(p.x, p.y, R, 0xc9ced8, 0.4, 2.5);
        break;
      case 'frost':
        this.vfx.ring(p.x, p.y, R, 0x9ad8ff, 0.6, 3);
        this.vfx.spark(p.x, p.y - 10, 0xe8f8ff, 8, 90);
        break;
    }
  }

  language() {
    return getLang();
  }

  /** màu hiển thị của một đội */
  teamCss(i: number) {
    return HUNT_TEAM_STYLE[i].css;
  }

  groundKey(u: HUnit) {
    return TERRAIN[this.hunt.grid[Math.floor(u.y / HUNT_CELL) * HUNT_N + Math.floor(u.x / HUNT_CELL)]].name;
  }
}
