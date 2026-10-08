import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Side, SimEvent } from '../game/sim';
import { t, unitName } from '../i18n';
import { UNITS } from '../data/units';
import { INK, g, mix, vgradA } from './draw';

import { fxLite } from './fxmode';

export interface VfxHost {
  sx(x: number): number;
  gy(lane: number, yOff: number): number;
  us: number;
  W: number;
  H: number;
  laneH: number;
  padL: number;
  /** độ dài lane (đơn vị sim) */
  laneLen: number;
}

const styleCache = new Map<string, TextStyle>();
export function textStyle(size: number, fill: number, bold = true): TextStyle {
  const k = `${size}|${fill}|${bold}`;
  let s = styleCache.get(k);
  if (!s) {
    s = new TextStyle({
      fontFamily: 'Be Vietnam Pro, Segoe UI, system-ui, sans-serif',
      fontSize: size,
      fontWeight: bold ? '800' : '500',
      fill,
      stroke: { color: 0x10131c, width: Math.max(1.6, size / 6.5), join: 'round' },
      align: 'center',
    });
    styleCache.set(k, s);
  }
  return s;
}

const GOLD = 0xffd34d;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (k: number) => 1 - Math.pow(1 - clamp01(k), 3);
const easeOutBack = (k: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = clamp01(k) - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
};

// ───────────────────────── hình dựng sẵn ─────────────────────────
function flameShape(o: Graphics, w: number, h: number, color: number, alpha = 1) {
  o.moveTo(-w, 0)
    .bezierCurveTo(-w * 1.15, -h * 0.42, -w * 0.3, -h * 0.55, 0, -h)
    .bezierCurveTo(w * 0.3, -h * 0.5, w * 1.15, -h * 0.42, w, 0)
    .quadraticCurveTo(0, h * 0.28, -w, 0)
    .closePath()
    .fill({ color, alpha });
}

function flame(w: number, h: number, c1 = 0xff4a1a, c2 = 0xff9a2a, c3 = 0xffe27a): Graphics {
  const o = g();
  flameShape(o, w, h, c1);
  flameShape(o, w * 0.68, h * 0.74, c2);
  flameShape(o, w * 0.36, h * 0.46, c3);
  return o;
}

/** cột sáng mềm: 3 lớp chồng, hẹp dần, đậm dần */
function pillar(o: Graphics, color: number, w: number, h: number, x = 0, y = 0) {
  [[1, 0.35], [0.62, 0.5], [0.3, 0.75]].forEach(([k, a]) => {
    o.rect(x - (w * k) / 2, y - h, w * k, h).fill(vgradA({ c: color, a: 0 }, { c: color, a: a * 0.9 }));
  });
}

function heart(o: Graphics, s: number, color: number) {
  o.moveTo(0, s * 0.4)
    .bezierCurveTo(-s * 1.3, -s * 0.4, -s * 0.55, -s * 1.15, 0, -s * 0.5)
    .bezierCurveTo(s * 0.55, -s * 1.15, s * 1.3, -s * 0.4, 0, s * 0.4)
    .closePath()
    .fill(color)
    .stroke({ width: 1.4, color: mix(color, INK, 0.55) });
  o.ellipse(-s * 0.4, -s * 0.5, s * 0.2, s * 0.12).fill({ color: 0xffffff, alpha: 0.6 });
}

function star(o: Graphics, cx: number, cy: number, n: number, r1: number, r2: number, color: number, alpha = 1) {
  const pts: number[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? r2 : r1;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  o.poly(pts).fill({ color, alpha });
}

/** vệt cung có độ dày thon dần hai đầu */
function taperArc(o: Graphics, cx: number, cy: number, R: number, a0: number, a1: number, maxTh: number, color: number, alpha: number) {
  const N = 18;
  const outer: number[] = [];
  const inner: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const a = a0 + (a1 - a0) * u;
    const th = maxTh * Math.sin(Math.PI * u);
    outer.push(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.9);
    inner.push([cx + Math.cos(a) * (R - th), cy + Math.sin(a) * (R - th) * 0.9]);
  }
  const pts = [...outer];
  for (let i = inner.length - 1; i >= 0; i--) pts.push(inner[i][0], inner[i][1]);
  o.poly(pts).fill({ color, alpha });
}

interface Part {
  o: Container;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  grow: number;
  spin: number;
  hold: number;
}
interface Anim {
  o: Container;
  t: number;
  dur: number;
  fn: (k: number) => void;
}
interface Proj {
  o: Graphics;
  x0: number;
  x1: number;
  y: number;
  /** độ cao đích (đạn bắn từ trên không xuống) */
  y1: number;
  t: number;
  dur: number;
  arc: number;
  kind: string;
  lx: number;
  ly: number;
  trail: number;
}

export class Vfx {
  readonly layer = new Container();
  shake = 0;
  private parts: Part[] = [];
  private anims: Anim[] = [];
  private projs: Proj[] = [];
  private recentText: number[] = [];

  constructor(private h: VfxHost) {}

  clear() {
    this.layer.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.parts = [];
    this.anims = [];
    this.projs = [];
  }

  get busy() {
    return this.layer.children.length;
  }

  // ───────────────────────── nền tảng ─────────────────────────
  part(o: Container, vx: number, vy: number, life: number, o2: { g?: number; grow?: number; spin?: number; hold?: number } = {}) {
    if (this.parts.length > 280) {
      o.destroy({ children: true });
      return;
    }
    this.layer.addChild(o);
    this.parts.push({ o, vx, vy, g: o2.g ?? 0, life, max: life, grow: o2.grow ?? 0, spin: o2.spin ?? 0, hold: o2.hold ?? 0.45 });
  }

  anim(o: Container, dur: number, fn: (k: number) => void) {
    this.layer.addChild(o);
    this.anims.push({ o, t: 0, dur, fn });
  }

  spark(x: number, y: number, color: number, n: number, speed = 90) {
    for (let i = 0; i < n; i++) {
      const s = g().circle(0, 0, 1.3 + Math.random() * 1.8).fill(color);
      s.position.set(x, y);
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random());
      this.part(s, Math.cos(a) * sp, Math.sin(a) * sp - 30, 0.3 + Math.random() * 0.25, { g: 260 });
    }
  }

  dust(x: number, y: number, n = 5, size = 1, color = 0xe8dcc0) {
    for (let i = 0; i < n; i++) {
      const s = g().circle(0, 0, (3 + Math.random() * 4) * this.h.us * size).fill({ color, alpha: 0.55 });
      s.position.set(x + (Math.random() - 0.5) * 16 * size, y - 2);
      this.part(s, (Math.random() - 0.5) * 50, -20 - Math.random() * 25, 0.5, { grow: 0.6 });
    }
  }

  smoke(x: number, y: number, size = 1) {
    const s = g().circle(0, 0, 6 * size * this.h.us).fill({ color: 0x2a2630, alpha: 0.5 });
    s.position.set(x + (Math.random() - 0.5) * 8, y);
    this.part(s, (Math.random() - 0.5) * 12, -26 - Math.random() * 14, 1.1, { grow: 0.7, hold: 0.2 });
  }

  healCross(x: number, y: number, color = 0x7dffb0) {
    const s = g().rect(-1.5, -5, 3, 10).rect(-5, -1.5, 10, 3).fill(color);
    s.position.set(x + (Math.random() - 0.5) * 22, y + (Math.random() - 0.3) * 8);
    s.scale.set(this.h.us * 0.9);
    this.part(s, 0, -34, 0.85);
  }

  floatText(text: string, x: number, y: number, color: number, size: number, life = 0.8) {
    if (this.layer.children.length > 200 && size < 15) return;
    const tx = new Text({ text, style: textStyle(Math.round(size * Math.min(1.25, Math.max(0.85, this.h.us))), color) });
    tx.anchor.set(0.5);
    tx.position.set(x, y);
    tx.scale.set(0.6);
    // bật nảy rồi bay lên
    const o = new Container();
    o.addChild(tx);
    this.anim(o, life, (k) => {
      tx.scale.set(0.6 + 0.5 * easeOutBack(k * 4));
      tx.y = y - 34 * easeOut(k) ;
      tx.alpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    });
  }

  ring(x: number, y: number, rx: number, color: number, dur = 0.45, width = 3) {
    const o = g();
    o.ellipse(0, 0, rx, rx * 0.32).fill({ color, alpha: 0.22 }).stroke({ width, color, alpha: 0.95 });
    o.position.set(x, y);
    o.scale.set(0.25);
    this.anim(o, dur, (k) => {
      o.scale.set(0.25 + 0.75 * easeOut(k));
      o.alpha = 1 - k * k;
    });
  }

  /** vệt chém quanh thân khi vung vũ khí */
  swoosh(x: number, y: number, dir: number, kind: 'swing' | 'thrust', size: number, color = 0xffffff) {
    const o = g();
    if (kind === 'swing') {
      const R = 24 * size;
      const [s0, s1] = dir > 0 ? [-1.9, 1.1] : [Math.PI - 1.1, Math.PI + 1.9];
      taperArc(o, 0, 0, R, s0, s1, 7 * size, color, 0.85);
    } else {
      for (let i = 0; i < 3; i++) {
        o.moveTo(dir * 6, (i - 1) * 4 * size).lineTo(dir * (34 + i * 6) * size, (i - 1) * 4 * size).stroke({ width: 2.2 * size, color, alpha: 0.8 - i * 0.2, cap: 'round' });
      }
    }
    o.position.set(x + dir * 10 * size, y);
    this.anim(o, 0.2, (k) => {
      o.alpha = 1 - k;
      o.scale.set(1 + k * 0.25);
    });
  }

  speedLines(x: number, y: number, dir: number) {
    const o = g();
    for (let i = 0; i < 3; i++) {
      const yy = (Math.random() - 0.5) * 34 * this.h.us;
      o.moveTo(0, yy).lineTo(-dir * (20 + Math.random() * 26) * this.h.us, yy).stroke({ width: 1.6, color: 0xffffff, alpha: 0.65, cap: 'round' });
    }
    o.position.set(x, y);
    this.part(o, -dir * 40, 0, 0.22);
  }

  // ───────────────────────── sự kiện từ sim ─────────────────────────
  handle(e: SimEvent) {
    const h = this.h;
    const us = h.us;
    switch (e.t) {
      case 'hit': {
        const x = h.sx(e.x);
        const y = h.gy(e.lane, 0) - 28 * us;
        const lite = fxLite();
        this.spark(x, y, e.victimSide === 0 ? 0xff8a8a : 0xfff0a0, e.big ? (lite ? 4 : 8) : lite ? 1 : 3);
        // chế độ gọn: chỉ hiện số cho đòn mạnh hoặc quân mình bị đánh đau, để màn hình không đầy chữ
        if (!lite || e.big || e.amount >= 22 || (e.victimSide === 0 && e.amount >= 10)) {
          this.floatText(String(Math.max(1, Math.round(e.amount))), x + (Math.random() - 0.5) * 16, y - 12, e.victimSide === 0 ? 0xff9a9a : e.big ? 0xffd34d : 0xffffff, e.big ? (lite ? 15 : 18) : (lite ? 9 : 10) + Math.min(lite ? 4 : 7, e.amount / 18), lite ? 0.55 : 0.7);
        }
        break;
      }
      case 'flagHit': {
        const x = e.side === 0 ? h.sx(0) - 6 : h.sx(h.laneLen) + 6;
        const y = h.gy(e.lane, 0) - 14 * us;
        this.spark(x, y, 0xffd9a0, 5);
        this.dust(x, y + 14 * us, 2, 0.8);
        this.floatText(String(Math.max(1, Math.round(e.amount))), x, y - 26 * us, 0xffe08a, 13);
        break;
      }
      case 'proj':
        this.addProj(e);
        break;
      case 'aoe':
        this.ring(h.sx(e.x), h.gy(e.lane, 0), (e.r / h.laneLen) * (h.W - h.padL * 2), e.color);
        break;
      case 'heal': {
        const x = h.sx(e.x);
        const y = h.gy(e.lane, 0) - 30 * us;
        this.healCross(x, y);
        if (e.amount >= 3) this.floatText(`+${Math.round(e.amount)}`, x + (Math.random() - 0.5) * 12, y - 14, 0x7dffb0, 11, 0.7);
        break;
      }
      case 'text': {
        const p = e.p ? { ...e.p } : undefined;
        if (p && typeof p.id === 'string' && UNITS[p.id]) p.name = unitName(UNITS[p.id]);
        const lite = fxLite();
        const now = performance.now();
        this.recentText = this.recentText.filter((x) => now - x < 900);
        // chế độ gọn: các tên chiêu dồn dập xếp lệch lên trên (không chồng chữ) và bỏ bớt chữ phụ
        if (lite && this.recentText.length >= 4 && !e.big) break;
        const slot = lite ? this.recentText.length % 4 : 0;
        this.recentText.push(now);
        this.floatText(t(e.key, p), h.sx(e.x), h.gy(e.lane, 0) - 62 * us - slot * 15 * us, e.color, e.big ? (lite ? 14 : 17) : lite ? 11 : 13, e.big ? (lite ? 1.1 : 1.3) : 0.9);
        break;
      }
      case 'absorb':
        this.floatText(`-${Math.round(e.amount)}`, h.sx(e.x) + (Math.random() - 0.5) * 14, h.gy(e.lane, 0) - 40 * us, 0x9ad0ff, 11, 0.6);
        break;
      case 'bounty':
        if (e.side === 0) this.floatText(`+${e.amount}`, h.sx(e.x), h.gy(e.lane, 0) - 14 * us, 0xffd34d, 13, 0.9);
        break;
      case 'boss':
        this.shake = Math.max(this.shake, 12);
        this.ring(h.sx(940), h.gy(e.lane, 0), 90 * us, 0xff4d4d, 0.9, 4);
        this.spark(h.sx(940), h.gy(e.lane, 0) - 40 * us, 0xff7a5a, 20, 200);
        break;
      case 'spawn':
        this.dust(h.sx(e.x), h.gy(e.lane, 0), 4, 0.9);
        break;
      case 'death':
        this.dust(h.sx(e.x), h.gy(e.lane, 0), e.big ? 9 : 5);
        if (e.big) this.spark(h.sx(e.x), h.gy(e.lane, 0) - 26 * us, 0xffd34d, 10, 130);
        break;
      case 'shake':
        this.shake = Math.min(14, Math.max(this.shake, fxLite() ? e.power * 0.5 : e.power));
        break;
      case 'laneEnd':
        this.confetti(e.lane, e.winner);
        break;
      case 'end':
        if (e.winner === 0) for (let i = 0; i < 3; i++) this.confetti(i, 0, 0.6);
        break;
      case 'fx':
        this.skill(e);
        break;
    }
  }

  confetti(lane: number, winner: Side, density = 1) {
    const h = this.h;
    const cols = winner === 0 ? [0x3d8bff, 0xffd34d, 0xffffff, 0x7dffb0] : [0x7a7a8a, 0x4a4a58, 0xa06a5a];
    const n = Math.round(46 * density * (fxLite() ? 0.4 : 1));
    for (let i = 0; i < n; i++) {
      const c = g().rect(-2.5, -1.5, 5, 3).fill(cols[i % cols.length]);
      c.position.set(Math.random() * h.W, lane * h.laneH + h.laneH * 0.1 + Math.random() * 10);
      c.rotation = Math.random() * 6;
      this.part(c, (Math.random() - 0.5) * 70, 20 + Math.random() * 40, 1.6 + Math.random(), { g: 55, spin: (Math.random() - 0.5) * 12, hold: 0.7 });
    }
  }

  // ───────────────────────── hiệu ứng kỹ năng ─────────────────────────
  private skill(e: Extract<SimEvent, { t: 'fx' }>) {
    const h = this.h;
    const us = h.us;
    const x = h.sx(e.x);
    const gyy = h.gy(e.lane, 0);
    const dir = e.dir;
    const px = (r: number) => (r / h.laneLen) * (h.W - h.padL * 2);
    switch (e.kind) {
      case 'palm': return this.fxPalm(x, gyy, dir, px(e.r ?? 190));
      case 'sweep': return this.fxSweep(x, gyy, dir);
      case 'splash': return this.fxSplash(x, gyy, px(e.r ?? 60));
      case 'rockhit': return this.fxRock(x, gyy, px(e.r ?? 55));
      case 'boom': return this.fxBoom(x, gyy, px(e.r ?? 62));
      case 'fire': return this.fxFire(x, gyy, px(e.r ?? 90));
      case 'charge': return this.fxCharge(x, gyy, dir, e.r ?? 2);
      case 'summon': return this.fxSummon(x, gyy);
      case 'enrage': return this.fxEnrage(x, gyy);
      case 'revive': return this.fxRevive(x, gyy);
      case 'pair': return this.fxPair(x, h.sx(e.x2 ?? e.x), gyy);
      case 'healwave': return this.fxHealWave(x, gyy, px(e.r ?? 120));
      case 'armor': return this.fxArmor(x, gyy);
      case 'transform': return this.fxTransform(x, gyy);
      case 'hound': return this.fxHound(x, gyy);
      case 'warcry': return this.fxWarcry(x, gyy, dir);
      case 'melody': return this.fxMelody(x, gyy, px(e.r ?? 140));
      case 'dash': return this.fxDash(x, h.sx(e.x2 ?? e.x), gyy);
      case 'snipe': return this.fxSnipe(x, gyy);
      case 'stun': return this.fxStun(x, gyy);
      case 'shield': return this.fxShield(x, gyy);
      case 'dragon': return this.fxDragon(x, gyy, dir, px(e.r ?? 200));
      case 'poisoncloud': return this.fxPoisonCloud(x, gyy, px(e.r ?? 100));
      case 'inferno': return this.fxInferno(x, gyy, dir, px(e.r ?? 260));
      case 'bolt': return this.fxBolt(x, gyy);
      case 'thorns': return this.fxThorns(x, gyy, px(e.r ?? 70));
      case 'frost': return this.fxFrost(x, gyy, px(e.r ?? 150));
      case 'blink': return this.fxBlink(x, gyy);
      case 'burrow': return this.fxBurrow(x, gyy, px(e.r ?? 60));
      case 'tide': return this.fxTide(x, gyy, dir, px(e.r ?? 380));
    }
    void us;
  }

  /** Hãn Thiên Chưởng: sóng chưởng vàng + bàn tay khổng lồ */
  private fxPalm(x: number, gy: number, dir: number, dist: number) {
    const us = this.h.us;
    const y = gy - 28 * us;
    const wave = new Container();
    const wg = g();
    wave.addChild(wg);
    this.anim(wave, 0.6, (k) => {
      wg.clear();
      for (let i = 0; i < 3; i++) {
        const kk = clamp01(k * 1.35 - i * 0.12);
        if (kk <= 0) continue;
        const cx = x + dir * (dist * 0.12 + dist * 0.88 * easeOut(kk));
        const R = (22 + i * 8) * us;
        const a = (1 - kk) * (1 - i * 0.22);
        const c0 = dir > 0 ? -0.95 : Math.PI - 0.95;
        const c1 = dir > 0 ? 0.95 : Math.PI + 0.95;
        taperArc(wg, cx - dir * R * 0.2, y, R, c0, c1, 9 * us, 0xffb43d, a);
        taperArc(wg, cx - dir * R * 0.2, y, R * 0.94, c0 + 0.12, c1 - 0.12, 4 * us, 0xfff2b0, a);
      }
      if (Math.random() < 0.7) this.spark(x + dir * dist * easeOut(k), y + (Math.random() - 0.5) * 30 * us, 0xffd34d, 1, 60);
    });
    // bàn tay
    const hand = new Container();
    const hg = g();
    const col = 0xffd34d;
    hg.ellipse(0, 6, 17, 19).fill(col).stroke({ width: 2.4, color: 0xa86a10 });
    const fingers: [number, number, number, number][] = [[-17, -4, -0.55, 11], [-9, -17, -0.2, 13], [1, -20, 0, 14], [11, -17, 0.2, 13], [19, -4, 0.7, 10]];
    for (const [fx, fy, rot, len] of fingers) {
      const f = g();
      f.ellipse(0, 0, 4.8, len).fill(col).stroke({ width: 2, color: 0xa86a10 });
      f.rotation = rot;
      f.position.set(fx * 0.8, fy);
      hand.addChild(f);
    }
    hand.addChild(hg);
    hg.ellipse(-4, 2, 7, 9).fill({ color: 0xffffff, alpha: 0.35 });
    hand.position.set(x + dir * dist * 0.62, gy - 30 * us);
    const glow = g().circle(0, 0, 38).fill({ color: 0xffd34d, alpha: 0.25 });
    hand.addChildAt(glow, 0);
    hand.scale.set(0.2);
    this.anim(hand, 0.8, (k) => {
      const s = (0.5 + 0.9 * easeOutBack(k * 2.2)) * us * 1.2;
      hand.scale.set(s * (k > 0.55 ? 1 + (k - 0.55) * 0.5 : 1));
      hand.alpha = k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5;
      hand.rotation = dir * 0.1 * (1 - k);
    });
    // nứt đất + bụi ở điểm chạm
    const cr = g();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.random();
      cr.moveTo(0, 0).lineTo(Math.cos(a) * 18 * us, Math.sin(a) * 6 * us).lineTo(Math.cos(a + 0.2) * 34 * us, Math.sin(a + 0.2) * 11 * us).stroke({ width: 2, color: 0x3a2a1a, alpha: 0.8 });
    }
    cr.position.set(x + dir * dist * 0.62, gy + 2);
    this.anim(cr, 0.9, (k) => (cr.alpha = 1 - k));
    this.dust(x + dir * dist * 0.62, gy, 6, 1.3);
    this.ring(x + dir * dist * 0.62, gy, 60 * us, 0xffb43d, 0.5, 3.5);
  }

  /** Thanh Long Trảm: vệt trăng khuyết xanh ngọc */
  private fxSweep(x: number, gy: number, dir: number) {
    const us = this.h.us;
    const o = g();
    const cx = x + dir * 14 * us;
    const cy = gy - 26 * us;
    const R = 62 * us;
    this.anim(o, 0.38, (k) => {
      o.clear();
      const head = -1.9 + 3.6 * easeOut(k * 1.15);
      const tail = Math.max(-1.9, head - 2.2);
      const m = (a: number) => (dir > 0 ? a : Math.PI - a);
      const a0 = m(tail);
      const a1 = m(head);
      const lo = Math.min(a0, a1);
      const hi = Math.max(a0, a1);
      taperArc(o, cx, cy, R, lo, hi, 20 * us, 0x2fd68a, 0.85 * (1 - k * 0.6));
      taperArc(o, cx, cy, R * 0.96, lo + 0.05, hi - 0.05, 8 * us, 0xeafff2, 0.9 * (1 - k * 0.6));
      if (Math.random() < 0.8) {
        const a = m(head);
        this.spark(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.9, 0x9dffc8, 1, 80);
      }
    });
    this.dust(x + dir * 40 * us, gy, 3, 0.9);
  }

  private fxSplash(x: number, gy: number, r: number) {
    const us = this.h.us;
    this.ring(x, gy, r * 1.15, 0xff9a4a, 0.4, 3.5);
    this.ring(x, gy, r * 0.7, 0xffe27a, 0.3, 2.5);
    const o = g();
    o.position.set(x, gy - 24 * us);
    for (const a of [0.7, -0.7]) {
      o.moveTo(Math.cos(a) * -22 * us, Math.sin(a) * -22 * us).lineTo(Math.cos(a) * 22 * us, Math.sin(a) * 22 * us).stroke({ width: 3 * us, color: 0xfff0c0, cap: 'round' });
    }
    this.anim(o, 0.25, (k) => {
      o.alpha = 1 - k;
      o.scale.set(0.8 + k * 0.6);
    });
    this.spark(x, gy - 20 * us, 0xffb36b, 8, 130);
  }

  private fxRock(x: number, gy: number, r: number) {
    const us = this.h.us;
    this.ring(x, gy, r * 1.1, 0xc9a070, 0.45, 3);
    this.dust(x, gy, 8, 1.5, 0xcdb48a);
    for (let i = 0; i < 7; i++) {
      const d = g();
      d.poly([-3, 2, -1, -3, 3, -1, 2, 3]).fill(0x8a8a92).stroke({ width: 1, color: 0x3a3a44 });
      d.position.set(x, gy - 6 * us);
      d.scale.set(us * (0.8 + Math.random() * 0.8));
      this.part(d, (Math.random() - 0.5) * 150, -110 - Math.random() * 90, 0.7, { g: 480, spin: (Math.random() - 0.5) * 14 });
    }
  }

  private fxBoom(x: number, gy: number, r: number) {
    const us = this.h.us;
    const y = gy - 16 * us;
    const o = new Container();
    const layers: [number, number][] = [[0xff3a1a, 1], [0xff8a2a, 0.78], [0xffd34d, 0.55], [0xffffff, 0.3]];
    const gs = layers.map(([c, k]) => {
      const gg = g().circle(0, 0, r * k).fill(c);
      o.addChild(gg);
      return gg;
    });
    o.position.set(x, y);
    this.anim(o, 0.42, (k) => {
      gs.forEach((gg, i) => {
        const kk = clamp01(k * 1.2 - i * 0.04);
        gg.scale.set(0.3 + 1.0 * easeOut(kk));
        gg.alpha = 1 - kk * kk;
      });
    });
    this.ring(x, gy, r * 1.5, 0xffb23d, 0.4, 4);
    this.spark(x, y, 0xffa23d, 14, 190);
    for (let i = 0; i < 5; i++) this.smoke(x, y - i * 2, 1.4);
    this.dust(x, gy, 4, 1.2, 0x6a5a50);
  }

  /** Hỏa Thiêu: mưa tên lửa rồi cột lửa bùng lên */
  private fxFire(x: number, gy: number, r: number) {
    const us = this.h.us;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const fx = x + (i / (n - 1) - 0.5) * r * 1.6 + (Math.random() - 0.5) * 8;
      const delay = i * 0.05;
      const o = new Container();
      o.position.set(fx, gy + 2);
      const fl = flame(11 * us, 56 * us * (0.8 + Math.random() * 0.5));
      o.addChild(fl);
      const streak = g().moveTo(0, 0).lineTo(-4, -90).stroke({ width: 3, color: 0xffd34d, alpha: 0.9, cap: 'round' });
      o.addChild(streak);
      fl.visible = false;
      this.anim(o, 1.0 + delay, (k0) => {
        const t0 = k0 * (1 + delay) - delay;
        if (t0 < 0) {
          o.alpha = 0;
          return;
        }
        o.alpha = 1;
        const k = t0 / 1.0;
        if (k < 0.18) {
          streak.visible = true;
          streak.y = -150 * (1 - k / 0.18) * us;
          streak.alpha = 1;
          fl.visible = false;
        } else {
          streak.visible = false;
          fl.visible = true;
          const kk = (k - 0.18) / 0.82;
          const grow = kk < 0.25 ? easeOutBack(kk / 0.25) : 1 - (kk - 0.25) / 0.75 * 0.7;
          fl.scale.set((0.9 + Math.sin(k * 40 + i) * 0.08) * grow, grow * (1 + Math.sin(k * 33 + i * 2) * 0.1));
          fl.alpha = kk > 0.7 ? 1 - (kk - 0.7) / 0.3 : 1;
          if (Math.random() < 0.3) this.spark(fx, gy - 30 * us, 0xff9a2a, 1, 40);
        }
      });
    }
    this.ring(x, gy, r * 1.1, 0xff6a3d, 0.5, 3.5);
    this.dust(x, gy, 3, 1.2, 0x4a3a30);
  }

  private fxCharge(x: number, gy: number, dir: number, m: number) {
    const us = this.h.us;
    const y = gy - 26 * us;
    const o = g();
    star(o, 0, 0, 8, 30 * us, 12 * us, 0xffd34d, 0.95);
    star(o, 0, 0, 8, 18 * us, 8 * us, 0xffffff, 0.95);
    o.position.set(x, y);
    this.anim(o, 0.32, (k) => {
      o.scale.set((0.5 + 0.9 * easeOut(k)) * Math.min(1.5, 0.8 + m * 0.15));
      o.alpha = 1 - k * k;
      o.rotation = k * 0.8;
    });
    for (let i = 0; i < 6; i++) {
      const l = g();
      const yy = (i - 2.5) * 6 * us;
      l.moveTo(0, yy).lineTo(-dir * (50 + Math.random() * 60) * us, yy).stroke({ width: 2.4, color: 0xfff0b0, alpha: 0.8, cap: 'round' });
      l.position.set(x, y);
      this.part(l, -dir * 30, 0, 0.3);
    }
    this.ring(x, gy, 46 * us, 0xffd34d, 0.4, 3);
    this.dust(x - dir * 20 * us, gy, 5, 1.2);
  }

  /** Triệu hồi: ma trận tím + hai cột sáng */
  private fxSummon(x: number, gy: number) {
    const us = this.h.us;
    const o = new Container();
    const inner = new Container();
    const R = 46 * us;
    const ig = g();
    ig.circle(0, 0, R).stroke({ width: 3, color: 0xd070ff, alpha: 0.95 });
    ig.circle(0, 0, R * 0.72).stroke({ width: 2, color: 0xe8a8ff, alpha: 0.85 });
    star(ig, 0, 0, 5, R * 0.7, R * 0.28, 0xb050ff, 0.35);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ig.circle(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86, 2.4).fill(0xf0c8ff);
    }
    ig.circle(0, 0, R).fill({ color: 0x6a2aa0, alpha: 0.25 });
    inner.addChild(ig);
    o.addChild(inner);
    o.scale.set(1, 0.32);
    o.position.set(x, gy);
    const pil = g();
    pillar(pil, 0xd070ff, 34 * us, 130 * us);
    pil.position.set(x, gy);
    this.anim(pil, 0.9, (k) => {
      pil.alpha = k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7;
      pil.scale.x = 1 + 0.4 * Math.sin(k * 20);
    });
    this.anim(o, 1.0, (k) => {
      inner.rotation = k * 4;
      o.scale.set(Math.min(1, k * 5) , 0.32 * Math.min(1, k * 5));
      o.alpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    });
    for (let i = 0; i < 10; i++) {
      const s = g().circle(0, 0, 2).fill(0xe0a0ff);
      s.position.set(x + (Math.random() - 0.5) * R * 1.4, gy - Math.random() * 6);
      this.part(s, 0, -50 - Math.random() * 40, 0.9);
    }
  }

  private fxEnrage(x: number, gy: number) {
    const us = this.h.us;
    this.ring(x, gy, 60 * us, 0xff3a3a, 0.7, 4);
    this.ring(x, gy, 90 * us, 0xff7a3a, 0.9, 3);
    for (let i = 0; i < 8; i++) {
      const f = flame(7 * us, (26 + Math.random() * 22) * us, 0xd01818, 0xff4a2a, 0xffb23d);
      const ang = (i / 8) * Math.PI * 2;
      f.position.set(x + Math.cos(ang) * 30 * us, gy - 6 * us + Math.sin(ang) * 8 * us);
      this.part(f, 0, -32, 0.9);
    }
    this.spark(x, gy - 40 * us, 0xff5a3a, 12, 150);
  }

  /** Bất Tử Chi Thân: cột sáng vàng + đôi cánh */
  private fxRevive(x: number, gy: number) {
    const us = this.h.us;
    const o = new Container();
    o.position.set(x, gy);
    const pil = g();
    pillar(pil, 0xffe066, 56 * us, 180 * us);
    o.addChild(pil);
    const wings: Container[] = [];
    for (const side of [-1, 1]) {
      const w = new Container();
      for (let i = 0; i < 6; i++) {
        const f = g();
        const len = (30 - i * 3) * us;
        f.ellipse(len / 2, 0, len / 2, 5 * us).fill(i % 2 ? 0xfff6c8 : 0xffffff).stroke({ width: 1.4, color: 0xd9a63a });
        f.rotation = -0.9 + i * 0.28;
        w.addChild(f);
      }
      w.position.set(side * 6 * us, -34 * us);
      w.scale.x = side;
      o.addChild(w);
      wings.push(w);
    }
    this.anim(o, 1.3, (k) => {
      const open = easeOutBack(clamp01(k * 2.2));
      wings.forEach((w, i) => {
        w.scale.set((i === 0 ? -1 : 1) * open, open);
        w.rotation = (i === 0 ? 1 : -1) * Math.sin(k * 14) * 0.08;
      });
      pil.alpha = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75;
      o.alpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
    });
    for (let i = 0; i < 14; i++) {
      const s = g();
      star(s, 0, 0, 4, 4, 1.6, 0xfff2a0);
      s.position.set(x + (Math.random() - 0.5) * 50 * us, gy - Math.random() * 20);
      this.part(s, (Math.random() - 0.5) * 20, -70 - Math.random() * 70, 1.1);
    }
    this.ring(x, gy, 70 * us, 0xffe066, 0.8, 4);
  }

  /** Ngọc Nữ Tâm Kinh: tim hồng + cánh hoa bay quanh hai người */
  private fxPair(x: number, x2: number, gy: number) {
    const us = this.h.us;
    for (const cx of [x, x2]) {
      this.ring(cx, gy, 36 * us, 0xff9ecb, 0.7, 3);
      for (let i = 0; i < 3; i++) {
        const hh = g();
        heart(hh, (4 + Math.random() * 3) * us, i % 2 ? 0xff7aa8 : 0xff9ecb);
        hh.position.set(cx + (Math.random() - 0.5) * 24 * us, gy - 30 * us - Math.random() * 14);
        const ph = Math.random() * 6;
        const o = new Container();
        o.addChild(hh);
        const bx = hh.x;
        const by = hh.y;
        hh.position.set(0, 0);
        o.position.set(bx, by);
        this.anim(o, 1.2, (k) => {
          o.y = by - 46 * us * easeOut(k);
          o.x = bx + Math.sin(k * 8 + ph) * 6 * us;
          o.alpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
          o.scale.set(0.6 + 0.5 * easeOutBack(k * 3));
        });
      }
      for (let i = 0; i < 8; i++) {
        const p = g().ellipse(0, 0, 3.4, 1.8).fill(i % 2 ? 0xffffff : 0xffc6dc);
        p.position.set(cx, gy - 26 * us);
        const a = (i / 8) * Math.PI * 2;
        this.part(p, Math.cos(a) * 55, Math.sin(a) * 28 - 24, 0.9, { spin: 4 });
      }
    }
    // dải ruy băng nối hai người
    const lnk = g();
    const mid = (x + x2) / 2;
    this.anim(lnk, 0.9, (k) => {
      lnk.clear();
      lnk.moveTo(x, gy - 36 * us).quadraticCurveTo(mid, gy - 68 * us - Math.sin(k * 6) * 4, x2, gy - 36 * us).stroke({ width: 2.4, color: 0xff9ecb, alpha: (1 - k) * 0.9, cap: 'round' });
    });
  }

  private fxHealWave(x: number, gy: number, r: number) {
    const us = this.h.us;
    this.ring(x, gy, r, 0x7dffb0, 0.55, 3);
    this.ring(x, gy, r * 0.6, 0xc8ffe0, 0.45, 2);
    for (let i = 0; i < 5; i++) {
      const s = g();
      star(s, 0, 0, 4, 3.6, 1.4, 0xc8ffe0);
      s.position.set(x + (Math.random() - 0.5) * r * 1.4, gy - 6 * us);
      this.part(s, 0, -40 - Math.random() * 30, 0.8);
    }
  }

  private fxArmor(x: number, gy: number) {
    const us = this.h.us;
    this.ring(x, gy, 32 * us, 0x9ad0ff, 0.5, 3);
    for (let i = 0; i < 4; i++) {
      const s = g();
      star(s, 0, 0, 4, 5, 1.8, 0xe6f4ff);
      const a = (i / 4) * Math.PI * 2;
      s.position.set(x + Math.cos(a) * 14 * us, gy - 26 * us + Math.sin(a) * 18 * us);
      this.part(s, Math.cos(a) * 30, Math.sin(a) * 30 - 10, 0.5);
    }
  }

  /** Biến hóa: mây khói + sao vàng */
  private fxTransform(x: number, gy: number) {
    const us = this.h.us;
    const y = gy - 28 * us;
    for (let i = 0; i < 9; i++) {
      const p = g().circle(0, 0, (7 + Math.random() * 6) * us).fill({ color: i % 3 ? 0xffffff : 0xfff0b0, alpha: 0.85 });
      p.position.set(x, y);
      const a = (i / 9) * Math.PI * 2;
      this.part(p, Math.cos(a) * 70, Math.sin(a) * 40 - 10, 0.7, { grow: 0.9, hold: 0.2 });
    }
    this.spark(x, y, 0xffd34d, 14, 160);
    for (let i = 0; i < 6; i++) {
      const sp = g();
      star(sp, 0, 0, 4, 5, 1.8, 0xffe27a);
      sp.position.set(x + (Math.random() - 0.5) * 30 * us, y);
      this.part(sp, (Math.random() - 0.5) * 50, -60 - Math.random() * 50, 0.9, { spin: 5 });
    }
    this.ring(x, gy, 46 * us, 0xffd34d, 0.5, 3);
  }

  /** Hao Thiên Khuyển xuất hiện: cột sáng xanh */
  private fxHound(x: number, gy: number) {
    const us = this.h.us;
    const o = new Container();
    o.position.set(x, gy);
    const pil = g();
    pillar(pil, 0x7ad0ff, 40 * us, 150 * us);
    o.addChild(pil);
    this.anim(o, 0.9, (k) => {
      o.alpha = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75;
    });
    this.ring(x, gy, 54 * us, 0x7ad0ff, 0.7, 3.5);
    this.ring(x, gy, 34 * us, 0xffffff, 0.5, 2);
    this.spark(x, gy - 30 * us, 0x9ad8ff, 12, 150);
  }

  /** Lệnh kỳ: cờ chiến và mũi tên vàng bay lên khắp lane */
  private fxWarcry(x: number, gy: number, dir: number) {
    const us = this.h.us;
    const kx = (this.h.W - this.h.padL * 2) / this.h.laneLen;
    const flag = new Container();
    const fg = g();
    fg.moveTo(0, 0).lineTo(0, -38 * us).stroke({ width: 2.6, color: 0x3a2a1c, cap: 'round' });
    fg.poly([0, -38 * us, 24 * us, -32 * us, 0, -24 * us]).fill(0xd23a2a).stroke({ width: 1.4, color: GOLD });
    flag.addChild(fg);
    flag.position.set(x, gy);
    this.anim(flag, 1.0, (k) => {
      flag.y = gy - 22 * us * easeOut(k);
      flag.alpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      flag.scale.set(0.6 + 0.5 * easeOutBack(k * 2.5));
    });
    for (let i = 0; i < 11; i++) {
      const c = g();
      c.poly([-5, 3, 0, -3, 5, 3, 5, 6, 0, 0, -5, 6]).fill(GOLD).stroke({ width: 1, color: 0x9a6a10 });
      c.scale.set(us);
      c.position.set(x + dir * (-40 + Math.random() * 300) * kx, gy - (10 + Math.random() * 30) * us);
      this.part(c, 0, -55, 0.9, { hold: 0.3 });
    }
    this.ring(x, gy, 70 * us, GOLD, 0.7, 3);
  }

  /** Khúc nhạc dẫn hồn: nốt nhạc tím và vòng sóng */
  private fxMelody(x: number, gy: number, r: number) {
    const us = this.h.us;
    this.ring(x, gy, r, 0xb8a0ff, 0.8, 3);
    this.ring(x, gy, r * 0.55, 0xe0d4ff, 0.6, 2);
    for (let i = 0; i < 8; i++) {
      const tx = new Text({ text: i % 2 ? '♪' : '♫', style: textStyle(Math.round(16 * Math.max(0.9, us)), i % 3 ? 0xc8b0ff : 0xffffff) });
      tx.anchor.set(0.5);
      tx.position.set(x + (Math.random() - 0.5) * r * 1.5, gy - (10 + Math.random() * 24) * us);
      this.part(tx, (Math.random() - 0.5) * 30, -50 - Math.random() * 30, 1.0, { hold: 0.3, spin: (Math.random() - 0.5) * 1.2 });
    }
  }

  /** Lướt xuyên đội hình: vệt sáng dọc đường đi */
  private fxDash(x0: number, x1: number, gy: number) {
    const us = this.h.us;
    const y = gy - 26 * us;
    const o = g();
    this.anim(o, 0.4, (k) => {
      o.clear();
      const end = x0 + (x1 - x0) * Math.min(1, k * 3);
      for (let i = 0; i < 3; i++) {
        const yy = y + (i - 1) * 9 * us;
        o.moveTo(x0, yy).lineTo(end, yy).stroke({ width: 5 * us * (1 - k * 0.5), color: 0xfff0b0, alpha: (1 - k) * (0.95 - i * 0.22), cap: 'round' });
      }
    });
    const n = Math.max(2, Math.round(Math.abs(x1 - x0) / (50 * us)));
    for (let i = 0; i <= n; i++) this.dust(x0 + ((x1 - x0) * i) / n, gy, 1, 0.9);
    this.spark(x1, y, 0xffd34d, 10, 150);
    this.ring(x1, gy, 40 * us, 0xfff0b0, 0.4, 2.5);
  }

  /** Bách bộ xuyên dương: tâm ngắm */
  private fxSnipe(x: number, gy: number) {
    const us = this.h.us;
    const o = g();
    o.circle(0, 0, 16 * us).stroke({ width: 2.4, color: 0xff3a3a });
    o.circle(0, 0, 8 * us).stroke({ width: 1.6, color: 0xffd34d });
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) o.moveTo(dx * 10 * us, dy * 10 * us).lineTo(dx * 24 * us, dy * 24 * us).stroke({ width: 2, color: 0xff3a3a });
    o.position.set(x, gy - 28 * us);
    this.anim(o, 0.4, (k) => {
      o.scale.set(1.8 - 0.8 * easeOut(k * 1.5));
      o.alpha = 1 - k * k;
    });
    this.spark(x, gy - 28 * us, 0xffffff, 8, 130);
  }

  /** Choáng: sao xoay quanh đầu */
  private fxStun(x: number, gy: number) {
    const us = this.h.us;
    const o = new Container();
    const stars: Graphics[] = [];
    for (let i = 0; i < 3; i++) {
      const st = g();
      star(st, 0, 0, 5, 5, 2, 0xffe27a);
      o.addChild(st);
      stars.push(st);
    }
    o.position.set(x, gy - 60 * us);
    this.anim(o, 2.0, (k) => {
      stars.forEach((st, i) => {
        const a = k * 14 + (i / 3) * Math.PI * 2;
        st.position.set(Math.cos(a) * 14 * us, Math.sin(a) * 4 * us);
        st.rotation = a;
      });
      o.alpha = k > 0.85 ? (1 - k) / 0.15 : 1;
    });
    this.spark(x, gy - 40 * us, 0xe8e0ff, 4, 60);
  }

  /** Khiên khí quanh đồng đội */
  private fxShield(x: number, gy: number) {
    const us = this.h.us;
    const o = g();
    o.ellipse(0, 0, 19 * us, 32 * us).fill({ color: 0x9ad0ff, alpha: 0.16 }).stroke({ width: 2, color: 0xcfe8ff, alpha: 0.9 });
    o.position.set(x, gy - 26 * us);
    this.anim(o, 0.9, (k) => {
      o.scale.set(0.5 + 0.5 * easeOutBack(k * 2));
      o.alpha = k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5;
    });
  }

  /** Hàng Long Thập Bát Chưởng: rồng khí xanh lao tới */
  private fxDragon(x: number, gy: number, dir: number, dist: number) {
    const us = this.h.us;
    const y = gy - 28 * us;
    const o = g();
    this.anim(o, 0.7, (k) => {
      o.clear();
      const hx = x + dir * dist * easeOut(Math.min(1, k * 1.15));
      const N = 14;
      for (let i = N; i >= 0; i--) {
        const tt = i / N;
        const px = hx - dir * tt * 80 * us;
        const py = y + Math.sin(k * 11 + tt * 6) * 9 * us;
        const r = (11 - tt * 7) * us;
        o.circle(px, py, r).fill({ color: i % 2 ? 0x4ab0ff : 0x7ad0ff, alpha: (1 - k * k) * 0.95 }).stroke({ width: 1.4 * us, color: GOLD, alpha: 1 - k });
      }
      // đầu rồng: sừng + mắt
      const a = 1 - k * k;
      o.poly([hx, y - 12 * us, hx + dir * 8 * us, y - 22 * us, hx + dir * 2 * us, y - 9 * us]).fill({ color: GOLD, alpha: a });
      o.circle(hx + dir * 5 * us, y - 3 * us, 2 * us).fill({ color: 0xffffff, alpha: a });
    });
    this.ring(x + dir * dist, gy, 70 * us, 0x4ab0ff, 0.6, 3.5);
    this.dust(x + dir * dist * 0.8, gy, 6, 1.2);
    this.spark(x + dir * dist, y, 0x9ad8ff, 12, 160);
  }

  /** Hà Mô Công: đám mây độc xanh lục */
  private fxPoisonCloud(x: number, gy: number, r: number) {
    const us = this.h.us;
    this.ring(x, gy, r, 0x7aff5a, 0.7, 3);
    for (let i = 0; i < 8; i++) {
      const p = g().circle(0, 0, (10 + Math.random() * 10) * us).fill({ color: i % 2 ? 0x6ae04a : 0x3a9a30, alpha: 0.45 });
      p.position.set(x + (Math.random() - 0.5) * r * 1.4, gy - (6 + Math.random() * 22) * us);
      this.part(p, (Math.random() - 0.5) * 14, -10 - Math.random() * 14, 1.5, { grow: 0.5, hold: 0.5 });
    }
    for (let i = 0; i < 8; i++) {
      const b = g().circle(0, 0, 2.2 * us).fill({ color: 0xb8ff9a, alpha: 0.9 });
      b.position.set(x + (Math.random() - 0.5) * r * 1.2, gy - 4 * us);
      this.part(b, 0, -36 - Math.random() * 30, 1.0);
    }
  }

  /** Hỏa Diệm Vương: sóng lửa lan về phía trước */
  private fxInferno(x: number, gy: number, dir: number, dist: number) {
    const us = this.h.us;
    const n = 8;
    for (let i = 0; i < n; i++) {
      const fx = x + dir * (i / (n - 1)) * dist;
      const delay = i * 0.05;
      const o = new Container();
      o.position.set(fx, gy + 2);
      const fl = flame(11 * us, 54 * us * (0.8 + Math.random() * 0.5));
      o.addChild(fl);
      this.anim(o, 0.9 + delay, (k0) => {
        const t0 = k0 * (0.9 + delay) - delay;
        if (t0 < 0) {
          o.alpha = 0;
          return;
        }
        o.alpha = 1;
        const k = t0 / 0.9;
        const grow = k < 0.25 ? easeOutBack(k / 0.25) : 1 - ((k - 0.25) / 0.75) * 0.7;
        fl.scale.set((0.9 + Math.sin(k * 40 + i) * 0.08) * grow, grow * (1 + Math.sin(k * 33 + i * 2) * 0.1));
        fl.alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      });
    }
    this.ring(x + dir * dist * 0.5, gy, dist * 0.6, 0xff6a3d, 0.6, 4);
    this.dust(x, gy, 4, 1.3, 0x4a3a30);
  }

  /** Dịch chuyển: cột sáng tím + tinh thể bay tán loạn */
  private fxBlink(x: number, gy: number) {
    const us = this.h.us;
    const o = g();
    this.anim(o, 0.45, (k) => {
      o.clear();
      const w = 22 * us * (1 - k);
      o.rect(x - w / 2, gy - 90 * us, w, 92 * us).fill({ color: 0xd8a0ff, alpha: (1 - k) * 0.55 });
      o.rect(x - w / 5, gy - 90 * us, w / 2.5, 92 * us).fill({ color: 0xffffff, alpha: 1 - k });
    });
    this.ring(x, gy, 38 * us, 0xe0b0ff, 0.45, 3);
    this.spark(x, gy - 30 * us, 0xe8c8ff, 12, 130);
  }

  /** Sóng thần: bức tường nước cuộn quét về phía trước, để lại bọt trắng */
  private fxTide(x: number, gy: number, dir: number, dist: number) {
    const us = this.h.us;
    const o = g();
    this.anim(o, 0.75, (k) => {
      o.clear();
      const run = Math.min(1, k * 1.5);
      const head = x + dir * dist * (1 - Math.pow(1 - run, 2));
      const fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      for (let i = 0; i < 4; i++) {
        const hx = head - dir * i * 30 * us;
        const hh = (50 - i * 9) * us * Math.min(1, run * 3);
        o.poly([hx - dir * 30 * us, gy + 6 * us, hx - dir * 10 * us, gy - hh * 0.55, hx, gy - hh, hx + dir * 9 * us, gy - hh * 0.35, hx + dir * 14 * us, gy + 6 * us]).fill({ color: i === 0 ? 0x7ad0ff : 0x4aa0e0, alpha: (0.7 - i * 0.14) * fade }).stroke({ width: 2, color: 0xffffff, alpha: (0.85 - i * 0.2) * fade });
      }
    });
    for (let i = 0; i < 6; i++) this.dust(x + dir * dist * (i / 6) * 0.9, gy, 1, 1.2, 0xdff4ff);
    this.ring(x, gy, 46 * us, 0x7ad0ff, 0.5, 3);
  }

  /** Độn thổ: đất đá văng lên, vòng bụi nâu */
  private fxBurrow(x: number, gy: number, r: number) {
    const us = this.h.us;
    this.ring(x, gy, Math.max(30 * us, r), 0x9a6a3a, 0.5, 3.5);
    this.dust(x, gy, 10, 1.5, 0x7a5a38);
    for (let i = 0; i < 9; i++) {
      const c = g().poly([-3, 2, -2, -3, 3, -3, 4, 2]).fill(i % 2 ? 0x6a4a2e : 0x8a6a42);
      c.position.set(x + (Math.random() - 0.5) * 24 * us, gy - 4);
      this.part(c, (Math.random() - 0.5) * 120, -90 - Math.random() * 60, 0.7, { g: 340, spin: (Math.random() - 0.5) * 14 });
    }
  }

  /** Lôi phù: tia sét từ trời */
  private fxBolt(x: number, gy: number) {
    const us = this.h.us;
    const pts: [number, number][] = [];
    const top = gy - 210 * us;
    const bot = gy - 18 * us;
    for (let i = 0; i <= 8; i++) pts.push([x + (i === 0 || i === 8 ? 0 : (Math.random() - 0.5) * 26 * us), top + ((bot - top) * i) / 8]);
    const o = g();
    this.anim(o, 0.28, (k) => {
      o.clear();
      o.poly(pts.flatMap((p) => p), false).stroke({ width: 6 * us, color: 0x7ad0ff, alpha: (1 - k) * 0.7, join: 'round' });
      o.poly(pts.flatMap((p) => p), false).stroke({ width: 2.2 * us, color: 0xffffff, alpha: 1 - k, join: 'round' });
    });
    this.ring(x, gy, 40 * us, 0x9ad8ff, 0.35, 2.5);
    this.spark(x, gy - 20 * us, 0xcfe8ff, 8, 140);
  }

  /** Gai nhọn trồi lên từ mặt đất */
  private fxThorns(x: number, gy: number, r: number) {
    const us = this.h.us;
    const o = g();
    o.position.set(x, gy + 2);
    const n = Math.max(3, Math.round((r * 2) / (14 * us)));
    this.anim(o, 0.4, (k) => {
      o.clear();
      const hgt = 30 * us * Math.sin(Math.PI * Math.min(1, k * 1.1));
      for (let i = 0; i < n; i++) {
        const px = -r + ((i + 0.5) / n) * r * 2;
        o.poly([px - 4 * us, 0, px, -hgt * (0.7 + 0.3 * ((i * 7) % 3) / 2), px + 4 * us, 0]).fill(0xc9ced8).stroke({ width: 1.2, color: 0x3a3a44 });
      }
    });
    this.dust(x, gy, 3, 0.9);
  }

  /** Hàn băng: sóng lạnh và tinh thể băng */
  private fxFrost(x: number, gy: number, r: number) {
    const us = this.h.us;
    this.ring(x, gy, r, 0x9ad8ff, 0.7, 3);
    this.ring(x, gy, r * 0.5, 0xffffff, 0.5, 2);
    for (let i = 0; i < 6; i++) {
      const c = g();
      c.poly([-4, 0, 0, -16, 4, 0]).fill(0xbfe8ff).stroke({ width: 1.2, color: 0x3a7aaa });
      c.scale.set(us * (0.8 + Math.random() * 0.6));
      c.position.set(x + (Math.random() - 0.5) * r * 1.6, gy);
      this.part(c, 0, -8, 0.7, { hold: 0.4 });
    }
    for (let i = 0; i < 10; i++) {
      const f = g().circle(0, 0, 1.8).fill(0xffffff);
      f.position.set(x + (Math.random() - 0.5) * r * 1.6, gy - (20 + Math.random() * 30) * us);
      this.part(f, (Math.random() - 0.5) * 14, 24, 0.9);
    }
  }

  // ───────────────────────── đạn ─────────────────────────
  private addProj(e: Extract<SimEvent, { t: 'proj' }>) {
    const h = this.h;
    const o = g();
    switch (e.kind) {
      case 'arrow':
        o.moveTo(-10, 0).lineTo(5, 0).stroke({ width: 2.2, color: 0x6a4a2a, cap: 'round' });
        o.moveTo(-10, 0).lineTo(5, 0).stroke({ width: 1.1, color: 0xf0dcb0 });
        o.poly([5, -2.6, 11, 0, 5, 2.6]).fill(0xe6eef7).stroke({ width: 1, color: 0x3a3a44 });
        o.poly([-10, 0, -13, -3, -8, 0, -13, 3]).fill(0xd34a4a);
        break;
      case 'needle':
        o.moveTo(-9, 0).lineTo(9, 0).stroke({ width: 2.6, color: 0xaab4e6, alpha: 0.7 });
        o.moveTo(-9, 0).lineTo(9, 0).stroke({ width: 1.2, color: 0xffffff });
        o.circle(9, 0, 2.6).fill({ color: 0xcfe8ff, alpha: 0.9 });
        break;
      case 'rock':
        o.poly([-6, 2, -4, -5, 3, -6, 7, -1, 4, 5]).fill(0x8a8a92).stroke({ width: 1.6, color: 0x2e2e38 });
        o.poly([-4, -5, 3, -6, 0, -1]).fill({ color: 0xffffff, alpha: 0.3 });
        break;
      case 'fire':
        o.circle(0, 0, 11).fill({ color: 0xff5a1a, alpha: 0.3 });
        o.circle(0, 0, 6.5).fill(0xff8a2a).stroke({ width: 1.4, color: 0xb02a0a });
        o.circle(-0.8, -0.8, 3.2).fill(0xffe066);
        break;
      case 'magic':
        o.circle(0, 0, 10).fill({ color: 0x6aa8ff, alpha: 0.3 });
        o.circle(0, 0, 5.5).fill(0x9ad0ff).stroke({ width: 1.4, color: 0x2a4a9a });
        o.circle(-1.5, -1.5, 2).fill({ color: 0xffffff, alpha: 0.8 });
        break;
    }
    o.scale.set(Math.max(0.8, h.us));
    this.layer.addChild(o);
    const x0 = h.sx(e.from);
    const x1 = h.sx(e.to);
    const y1 = h.gy(e.lane2 ?? e.lane, e.y) - 30 * h.us;
    const y = h.gy(e.lane, e.y) - 30 * h.us - (e.h ?? 0) * h.us;
    this.projs.push({
      o, x0, x1, y, y1, t: 0,
      dur: Math.max(0.12, Math.min(0.55, Math.abs(x1 - x0) / 900 + (e.kind === 'rock' ? 0.25 : 0))),
      arc: e.kind === 'rock' ? h.laneH * 0.5 : e.kind === 'arrow' ? 18 : 0,
      kind: e.kind, lx: x0, ly: y, trail: 0,
    });
  }

  // ───────────────────────── cập nhật ─────────────────────────
  update(dt: number) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.o.destroy({ children: true });
        this.parts.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      p.o.x += p.vx * dt;
      p.o.y += p.vy * dt;
      const k = 1 - p.life / p.max;
      p.o.alpha = k < p.hold ? 1 : 1 - (k - p.hold) / (1 - p.hold);
      if (p.grow) p.o.scale.set(p.o.scale.x + p.grow * dt);
      if (p.spin) p.o.rotation += p.spin * dt;
    }
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i];
      a.t += dt;
      const k = clamp01(a.t / a.dur);
      a.fn(k);
      if (a.t >= a.dur) {
        a.o.destroy({ children: true });
        this.anims.splice(i, 1);
      }
    }
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.t += dt;
      const k = Math.min(1, p.t / p.dur);
      const x = p.x0 + (p.x1 - p.x0) * k;
      const y = p.y + (p.y1 - p.y) * k - Math.sin(k * Math.PI) * p.arc;
      if ((p.kind === 'arrow' || p.kind === 'needle') && (x !== p.lx || y !== p.ly)) p.o.rotation = Math.atan2(y - p.ly, x - p.lx);
      p.lx = x;
      p.ly = y;
      p.o.position.set(x, y);
      p.trail -= dt;
      if (p.trail <= 0) {
        p.trail = p.kind === 'rock' ? 0.04 : 0.025;
        this.trail(p, x, y);
      }
      if (k >= 1) {
        p.o.destroy();
        this.projs.splice(i, 1);
      }
    }
    if (this.shake > 0.1) this.shake *= Math.exp(-7 * dt);
    else this.shake = 0;
  }

  private trail(p: Proj, x: number, y: number) {
    const us = this.h.us;
    const d = g();
    switch (p.kind) {
      case 'rock':
        d.circle(0, 0, (3 + Math.random() * 2) * us).fill({ color: 0xcdb48a, alpha: 0.5 });
        break;
      case 'magic':
        d.circle(0, 0, 3.2 * us).fill({ color: 0x9ad0ff, alpha: 0.7 });
        break;
      case 'fire':
        d.circle(0, 0, (3 + Math.random() * 2.5) * us).fill({ color: Math.random() < 0.5 ? 0xff7a2a : 0xffc04d, alpha: 0.65 });
        break;
      case 'needle':
        star(d, 0, 0, 4, 3, 1.1, 0xffffff, 0.9);
        break;
      default:
        d.circle(0, 0, 1.6 * us).fill({ color: 0xffffff, alpha: 0.45 });
    }
    d.position.set(x, y);
    this.part(d, 0, 0, 0.22, { hold: 0 });
  }
}
