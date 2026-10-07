import { Container, Graphics } from 'pixi.js';
import type { UnitDef } from '../data/units';
import type { Side } from '../game/sim';
import { INK, ball, darker, g, lighter, mix, outline, poly, rrect } from './draw';

// Voi chiến, Hao Thiên Khuyển và các công trình phòng thủ (đồ họa vẽ bằng code)

const GOLD = 0xffd34d;
const TEAM: [number, number] = [0x3d8bff, 0xe24b4b];

export interface ExtraArt {
  body: Container;
  height: number;
  tick(clock: number, moving: boolean, atk: number): void;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

// ───────────────────────── Voi chiến ─────────────────────────
export function buildElephant(accent: number): ExtraArt {
  const body = new Container();
  const skin = 0x9aa0ac;
  const legs: Graphics[] = [];
  const mk = (x: number) => {
    const l = g();
    rrect(l, -4.2, 0, 8.4, 17, 3, skin);
    rrect(l, -4.8, 14, 9.6, 5, 2, 0x6a6f7a);
    l.position.set(x, -17);
    legs.push(l);
    return l;
  };
  // chân sau/trước phía xa vẽ trước
  body.addChild(mk(-15), mk(9));
  // thân
  const torso = g();
  ball(torso, 0, -29, 26, skin, 15);
  // tấm thảm yên theo màu phe
  poly(torso, [-14, -42, 14, -42, 17, -28, -17, -28], accent, 1.5);
  rrect(torso, -14, -44, 28, 5, 2, GOLD);
  // đuôi
  torso.moveTo(-24, -32).quadraticCurveTo(-30, -26, -27, -16).stroke({ width: 2.4, color: darker(skin, 0.4), cap: 'round' });
  body.addChild(torso);
  body.addChild(mk(-8), mk(16));
  // đầu + vòi + ngà (xoay khi đánh)
  const head = new Container();
  const hg = g();
  ball(hg, 0, 0, 13, skin, 12);
  ball(hg, -9, -4, 8, darker(skin, 0.15), 10); // tai
  hg.circle(6, -3, 1.8).fill(0x14141a);
  poly(hg, [8, 4, 22, 12, 20, 15, 8, 9], 0xf6f0dc, 1.2); // ngà
  head.addChild(hg);
  const trunk = new Container();
  const tg = g();
  tg.moveTo(8, 0).bezierCurveTo(18, 4, 20, 18, 14, 26).stroke({ width: 9, color: lineSafe(skin), cap: 'round' });
  tg.moveTo(8, 0).bezierCurveTo(18, 4, 20, 18, 14, 26).stroke({ width: 6.4, color: skin, cap: 'round' });
  trunk.addChild(tg);
  head.addChild(trunk);
  head.position.set(23, -34);
  body.addChild(head);
  return {
    body,
    height: 62,
    tick(clock, moving, atk) {
      const w = moving ? Math.sin(clock * 5) : 0;
      legs.forEach((l, i) => (l.rotation = w * 0.45 * (i % 2 ? 1 : -1)));
      body.y = moving ? -Math.abs(w) * 1.4 : Math.sin(clock * 1.6) * 0.4;
      head.rotation = Math.sin(clock * 1.4) * 0.03 + (atk > 0 ? -Math.sin(atk * Math.PI) * 0.35 : 0);
      trunk.rotation = Math.sin(clock * 2.2) * 0.12 + (atk > 0 ? Math.sin(atk * Math.PI) * 0.7 : 0);
    },
  };
}

// ───────────────────────── Hao Thiên Khuyển ─────────────────────────
export function buildHound(accent: number): ExtraArt {
  const body = new Container();
  const fur = 0xf4f0e6;
  const legs: Graphics[] = [];
  const mk = (x: number) => {
    const l = g();
    rrect(l, -2.4, 0, 4.8, 12, 2, fur);
    rrect(l, -2.8, 9, 5.6, 4, 1.5, 0xc9b98a);
    l.position.set(x, -11);
    legs.push(l);
    return l;
  };
  body.addChild(mk(-10), mk(6));
  const torso = g();
  // đuôi cuộn
  torso.moveTo(-15, -17).quadraticCurveTo(-24, -26, -19, -32).stroke({ width: 5, color: lineSafe(fur), cap: 'round' });
  torso.moveTo(-15, -17).quadraticCurveTo(-24, -26, -19, -32).stroke({ width: 3, color: fur, cap: 'round' });
  ball(torso, 0, -17, 17, fur, 9);
  // yên/khăn theo phe + vòng cổ vàng
  poly(torso, [-6, -25, 6, -25, 7, -15, -7, -15], accent, 1.2);
  body.addChild(torso);
  body.addChild(mk(-5), mk(11));
  const head = new Container();
  const hg = g();
  poly(hg, [-6, -3, -10, -13, -3, -8], fur, 1.2); // tai
  ball(hg, 0, 0, 8.5, fur, 7.5);
  poly(hg, [5, -1, 15, 2, 14, 6, 5, 6], 0xf8f4ea, 1.2); // mõm
  ball(hg, 15, 2.5, 1.8, 0x1a1a22);
  hg.circle(3, -2, 1.5).fill(0x14141a);
  // mắt thứ ba của Hao Thiên Khuyển
  hg.ellipse(2.5, -6, 1, 2.2).fill(0xffd34d);
  rrect(hg, -5, 5, 9, 3, 1.4, GOLD);
  head.addChild(hg);
  head.position.set(14, -24);
  body.addChild(head);
  return {
    body,
    height: 36,
    tick(clock, moving, atk) {
      const w = moving ? Math.sin(clock * 14) : 0;
      legs.forEach((l, i) => (l.rotation = w * 0.8 * (i % 2 ? 1 : -1)));
      body.y = moving ? -Math.abs(w) * 1.8 : Math.sin(clock * 3) * 0.4;
      head.rotation = atk > 0 ? Math.sin(atk * Math.PI) * 0.4 : Math.sin(clock * 2) * 0.04;
      head.x = 14 + (atk > 0 ? Math.sin(atk * Math.PI) * 5 : 0);
    },
  };
}

const lineSafe = (c: number) => mix(c, INK, 0.74);

// ───────────────────────── Công trình phòng thủ ─────────────────────────
export interface DefenseArt {
  root: Container;
  art: Container;
  height: number;
  update(clock: number, atk: number): void;
}

export function buildDefenseArt(def: UnitDef, side: Side): DefenseArt {
  const accent = TEAM[side];
  const root = new Container();
  const art = new Container();
  const ghost = !!def.tags?.includes('ghost');
  const sc = def.scale;

  const base = g();
  if (!ghost) base.ellipse(0, 2, 26 * sc, 6.5 * sc).fill({ color: 0x000000, alpha: 0.32 });
  base.ellipse(0, 2, 22 * sc, 5.5 * sc).fill({ color: accent, alpha: ghost ? 0.14 : 0.2 });
  base.ellipse(0, 2, 22 * sc, 5.5 * sc).stroke({ width: 1.8, color: accent, alpha: ghost ? 0.55 : 0.9 });
  root.addChild(base, art);
  art.scale.set(sc);

  let height = 56;
  let tick: (clock: number, atk: number) => void = () => {};
  const stone = 0xa9a29a;
  const wood = 0x9a6a38;

  const pennant = (x: number, y: number, h: number) => {
    const p = g();
    p.moveTo(x, y).lineTo(x, y - h).stroke({ width: 1.8, color: 0x3a2a1c, cap: 'round' });
    poly(p, [x, y - h, x + 12, y - h + 4, x, y - h + 8], accent, 1);
    art.addChild(p);
    return p;
  };

  switch (def.skill) {
    case 'wall': {
      const w = g();
      rrect(w, -24, -34, 48, 34, 3, stone);
      for (let r = 0; r < 4; r++) {
        const y = -34 + r * 8.5;
        w.moveTo(-23, y).lineTo(23, y).stroke({ width: 1, color: darker(stone, 0.5), alpha: 0.4 });
        for (let c = r % 2 ? 0 : 1; c < 4; c++) w.moveTo(-24 + c * 12 + (r % 2 ? 6 : 0), y).lineTo(-24 + c * 12 + (r % 2 ? 6 : 0), y + 8.5).stroke({ width: 1, color: darker(stone, 0.5), alpha: 0.3 });
      }
      for (let k = 0; k < 4; k++) rrect(w, -24 + k * 12.6, -42, 9.6, 9, 1.5, stone);
      w.rect(-24, -12, 48, 3.5).fill(accent);
      art.addChild(w);
      height = 46;
      break;
    }
    case 'thorns': {
      const w = g();
      rrect(w, -22, -26, 44, 26, 2, wood);
      for (let k = 0; k < 7; k++) {
        const x = -20 + k * 6.6;
        poly(w, [x - 2.8, -24, x, -42, x + 2.8, -24], mix(wood, 0xffffff, 0.12), 1.2);
        poly(w, [x + 2.4, -14, x + 12, -18, x + 2.4, -20], 0xc9ced8, 0.9);
      }
      w.rect(-22, -12, 44, 3).fill(accent);
      art.addChild(w);
      height = 48;
      break;
    }
    case 'tower': {
      const w = g();
      // chân tháp gỗ + sàn + mái
      poly(w, [-14, 0, -9, -40, 9, -40, 14, 0], wood, 1.5);
      w.moveTo(-12, -6).lineTo(10, -34).stroke({ width: 2, color: darker(wood, 0.4) });
      w.moveTo(12, -6).lineTo(-10, -34).stroke({ width: 2, color: darker(wood, 0.4) });
      rrect(w, -17, -46, 34, 8, 2, mix(wood, 0xffffff, 0.12));
      for (let k = 0; k < 4; k++) rrect(w, -16 + k * 8.6, -52, 6, 7, 1, mix(wood, 0xffffff, 0.2));
      poly(w, [-20, -58, 0, -74, 20, -58, 15, -55, -15, -55], accent, 1.4);
      art.addChild(w);
      const archer = new Container();
      const ag = g();
      ball(ag, 0, -58, 5, 0xffd2a8);
      rrect(ag, -3.5, -54, 7, 8, 2, accent);
      ag.moveTo(6, -62).arc(2, -54, 9, -1.1, 1.1).stroke({ width: 2, color: 0x6a4020, cap: 'round' });
      archer.addChild(ag);
      art.addChild(archer);
      pennant(0, -74, 16);
      height = 90;
      tick = (clock, atk) => {
        archer.x = atk > 0 ? -Math.sin(atk * Math.PI) * 2.5 : 0;
        archer.y = Math.sin(clock * 2) * 0.4;
      };
      break;
    }
    case 'ballista': {
      const w = g();
      rrect(w, -20, -8, 40, 8, 2, wood);
      poly(w, [-4, -8, 4, -8, 10, -22, -10, -22], darker(wood, 0.1), 1.3);
      art.addChild(w);
      const arm = new Container();
      const ag = g();
      // cung khổng lồ + mũi tên
      ag.moveTo(-2, -22).quadraticCurveTo(-18, -22, -4, -44).stroke({ width: 4.5, color: lineSafe(wood), cap: 'round' });
      ag.moveTo(-2, -22).quadraticCurveTo(-18, -22, -4, -44).stroke({ width: 2.8, color: 0xb87a3c, cap: 'round' });
      ag.moveTo(-2, -22).quadraticCurveTo(-18, -22, -4, 0).stroke({ width: 4.5, color: lineSafe(wood), cap: 'round' });
      ag.moveTo(-2, -22).quadraticCurveTo(-18, -22, -4, 0).stroke({ width: 2.8, color: 0xb87a3c, cap: 'round' });
      ag.moveTo(-4, -44).lineTo(-4, 0).stroke({ width: 1, color: 0xf0e8d0 });
      rrect(ag, -4, -24.5, 34, 5, 2, 0x6a4a28);
      poly(ag, [30, -28, 42, -22, 30, -17], 0xdfe6f0, 1.2);
      poly(ag, [-4, -28, 2, -22, -4, -17], accent, 1);
      arm.addChild(ag);
      arm.position.set(0, 0);
      art.addChild(arm);
      pennant(8, -22, 14);
      height = 50;
      tick = (clock, atk) => {
        arm.x = atk > 0 ? -Math.sin(atk * Math.PI) * 5 : 0;
        arm.rotation = Math.sin(clock * 1.3) * 0.01;
      };
      break;
    }
    case 'catapult': {
      const w = g();
      rrect(w, -22, -9, 44, 9, 2, wood);
      for (const x of [-14, 14]) {
        ball(w, x, -4, 7, 0x5a3a22);
        w.circle(x, -4, 2).fill(0xc9a070);
      }
      poly(w, [-10, -9, -6, -34, 6, -34, 10, -9], darker(wood, 0.1), 1.4);
      art.addChild(w);
      const arm = new Container();
      const ag = g();
      rrect(ag, -2, -34, 4, 52, 1.5, wood);
      rrect(ag, -6, 14, 12, 11, 2, 0x59596a);
      ag.moveTo(0, -34).lineTo(7, -42).stroke({ width: 1.6, color: 0xe8c878 });
      ball(ag, 8, -43, 5, 0x9a9aa6);
      arm.addChild(ag);
      arm.position.set(0, -30);
      art.addChild(arm);
      pennant(-12, -34, 16);
      height = 62;
      tick = (clock, atk) => {
        let rot = -0.75;
        if (atk > 0) {
          if (atk < 0.35) rot = lerp(-0.75, -1.15, atk / 0.35);
          else if (atk < 0.7) rot = lerp(-1.15, 0.95, (atk - 0.35) / 0.35);
          else rot = lerp(0.95, -0.75, (atk - 0.7) / 0.3);
        }
        arm.rotation = rot + Math.sin(clock) * 0.01;
      };
      break;
    }
    case 'trap': {
      const w = g();
      w.ellipse(0, -2, 20, 5).fill(0x555a66).stroke({ width: 1.4, color: 0x1a1a22 });
      for (let k = -2; k <= 2; k++) poly(w, [k * 7 - 2.2, -3, k * 7, -9, k * 7 + 2.2, -3], 0xc9ced8, 0.9);
      art.addChild(w);
      art.alpha = 0.78;
      height = 22;
      tick = (clock) => {
        art.alpha = 0.7 + Math.sin(clock * 3) * 0.08;
      };
      break;
    }
    case 'firepit': {
      const w = g();
      w.ellipse(0, -2, 22, 6).fill(0x2a1a14).stroke({ width: 2, color: 0x6a4a3a });
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ball(w, Math.cos(a) * 19, -2 + Math.sin(a) * 4.4, 3.4, 0x7a7068);
      }
      art.addChild(w);
      const flames: Graphics[] = [];
      for (let k = 0; k < 4; k++) {
        const f = g();
        const fw = 6 + (k % 2) * 3;
        const fh = 22 + (k % 3) * 8;
        f.moveTo(-fw, 0).bezierCurveTo(-fw * 1.1, -fh * 0.4, -fw * 0.3, -fh * 0.55, 0, -fh).bezierCurveTo(fw * 0.3, -fh * 0.5, fw * 1.1, -fh * 0.4, fw, 0).closePath().fill(0xff5a1a);
        f.moveTo(-fw * 0.6, 0).bezierCurveTo(-fw * 0.7, -fh * 0.3, -fw * 0.2, -fh * 0.4, 0, -fh * 0.75).bezierCurveTo(fw * 0.2, -fh * 0.4, fw * 0.7, -fh * 0.3, fw * 0.6, 0).closePath().fill(0xffd34d);
        f.position.set((k - 1.5) * 9, -3);
        art.addChild(f);
        flames.push(f);
      }
      height = 34;
      tick = (clock) => {
        flames.forEach((f, i) => {
          f.scale.set(1 + Math.sin(clock * 11 + i * 1.7) * 0.12, 1 + Math.sin(clock * 15 + i * 2.3) * 0.22);
        });
      };
      break;
    }
    case 'drum': {
      const w = g();
      poly(w, [-14, 0, -8, -20, -4, -20, -8, 0], wood, 1.2);
      poly(w, [14, 0, 8, -20, 4, -20, 8, 0], wood, 1.2);
      art.addChild(w);
      const dr = new Container();
      const dg = g();
      rrect(dg, -17, -42, 34, 24, 8, 0xc03a30);
      dg.ellipse(0, -42, 17, 5).fill(0xe8d8b0).stroke({ width: 1.4, color: 0x5a3a28 });
      for (let k = -2; k <= 2; k++) dg.circle(k * 7, -30, 1.4).fill(GOLD);
      rrect(dg, -17, -33, 34, 3, 1, GOLD);
      dr.addChild(dg);
      art.addChild(dr);
      pennant(0, -42, 16);
      height = 60;
      tick = (clock) => {
        const beat = Math.max(0, Math.sin(clock * 6));
        dr.scale.set(1 + beat * 0.04, 1 - beat * 0.04);
        dr.position.set(0, beat * 1.2);
      };
      break;
    }
    case 'altar': {
      const w = g();
      rrect(w, -20, -10, 40, 10, 2, stone);
      rrect(w, -15, -22, 30, 12, 2, mix(stone, 0xffffff, 0.12));
      rrect(w, -10, -28, 20, 6, 2, mix(stone, 0xffffff, 0.2));
      art.addChild(w);
      const glow = g();
      glow.circle(0, -40, 16).fill({ color: 0x7dffb0, alpha: 0.22 });
      art.addChild(glow);
      const orb = g();
      ball(orb, 0, -40, 6.5, 0x7dffb0);
      art.addChild(orb);
      pennant(14, -22, 18);
      height = 62;
      tick = (clock) => {
        orb.y = Math.sin(clock * 2.4) * 2;
        glow.alpha = 0.7 + Math.sin(clock * 3) * 0.3;
        glow.scale.set(1 + Math.sin(clock * 3) * 0.08);
      };
      break;
    }
    case 'frost': {
      const w = g();
      rrect(w, -14, -8, 28, 8, 2, 0x8fa4c0);
      art.addChild(w);
      const cr = g();
      poly(cr, [-9, -8, -4, -46, 0, -58, 4, -46, 9, -8], 0x9ad8ff, 1.4);
      poly(cr, [-15, -10, -11, -30, -6, -10], 0xbfe8ff, 1);
      poly(cr, [15, -10, 11, -26, 6, -10], 0xbfe8ff, 1);
      cr.poly([-3, -14, 0, -52, 2, -16]).fill({ color: 0xffffff, alpha: 0.45 });
      art.addChild(cr);
      const halo = g();
      halo.circle(0, -30, 20).fill({ color: 0x9ad8ff, alpha: 0.18 });
      art.addChildAt(halo, 1);
      pennant(14, -8, 18);
      height = 66;
      tick = (clock) => {
        halo.alpha = 0.6 + Math.sin(clock * 2.6) * 0.4;
        cr.y = Math.sin(clock * 1.8) * 0.8;
      };
      break;
    }
    default: {
      const w = g();
      rrect(w, -16, -30, 32, 30, 3, stone);
      art.addChild(w);
    }
  }
  void outline;
  void ball;
  void lighter;
  return { root, art, height: height * sc, update: tick };
}
