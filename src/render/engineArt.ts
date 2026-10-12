import { Container, Graphics } from 'pixi.js';
import { ball, darker, g, lighter, poly, rrect } from './draw';
import type { ExtraArt } from './extraArt';

// Thiết bị công thành tầm xa: Nỏ Xe Liên Hoàn, Hỏa Pháo, Xe Hỏa Tiễn, Pháo Thạch Cự Hình (vẽ bằng code, quay mặt sang phải)

const WOOD = 0xa0703a;
const WOOD_DK = 0x6a4524;
const IRON = 0x59596a;
const BRONZE = 0xb98a3c;

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));
/** 0 → 1 → 0 trong nửa đầu đòn đánh (giật lùi) */
const kick = (atk: number) => (atk <= 0 ? 0 : atk < 0.25 ? atk / 0.25 : Math.max(0, 1 - (atk - 0.25) / 0.6));

function wheel(x: number, y: number, r: number): Graphics {
  const w = g();
  ball(w, 0, 0, r, WOOD_DK);
  for (let i = 0; i < 4; i++) w.moveTo(0, 0).lineTo(Math.cos(i * 0.785) * (r - 0.6), Math.sin(i * 0.785) * (r - 0.6)).stroke({ width: 1.6, color: 0x2a1c10 });
  w.circle(0, 0, 2).fill(0xc9a070);
  w.position.set(x, y);
  return w;
}

function carriage(body: Container, accent: number, len: number, wheelR: number): Graphics[] {
  const base = g();
  rrect(base, -len / 2, -wheelR - 8, len, 8, 2.5, WOOD);
  rrect(base, -len / 2 + 2, -wheelR - 6, len - 4, 2, 1, lighter(WOOD, 0.2));
  poly(base, [-len / 2 - 2, -wheelR - 8, -len / 2 + 5, -wheelR - 8, -len / 2 + 2, -wheelR - 15], accent, 1.2);
  body.addChild(base);
  const ws = [wheel(-len / 2 + 7, -wheelR, wheelR), wheel(len / 2 - 7, -wheelR, wheelR)];
  body.addChild(...ws);
  return ws;
}

// ───────────────────────── Nỏ Xe Liên Hoàn ─────────────────────────
function boltCart(accent: number): ExtraArt {
  const body = new Container();
  const wheels = carriage(body, accent, 44, 8);
  const gun = new Container();
  const stock = g();
  rrect(stock, -18, -3, 40, 6, 2, WOOD);
  rrect(stock, -18, -2, 40, 1.6, 0.8, lighter(WOOD, 0.25));
  // hai cánh nỏ
  stock.moveTo(14, -3).quadraticCurveTo(21, -17, 12, -24).stroke({ width: 3.2, color: darker(WOOD, 0.1), cap: 'round' });
  stock.moveTo(14, 3).quadraticCurveTo(21, 17, 12, 24).stroke({ width: 3.2, color: darker(WOOD, 0.1), cap: 'round' });
  stock.moveTo(12, -24).lineTo(12, 24).stroke({ width: 1.2, color: 0xe8d8a0 });
  rrect(stock, -4, -7, 16, 3, 1.2, IRON);
  gun.addChild(stock);
  const bolts = g();
  for (let i = -1; i <= 1; i++) {
    bolts.moveTo(-16, i * 2.4).lineTo(28, i * 2.4).stroke({ width: 1.8, color: 0xd9c8a0 });
    poly(bolts, [28, i * 2.4 - 2, 33, i * 2.4, 28, i * 2.4 + 2], 0xc8c8d2, 0.8);
  }
  gun.addChild(bolts);
  gun.position.set(2, -30);
  gun.scale.y = 0.55;
  body.addChild(gun);
  const post = g();
  rrect(post, -3, -29, 6, 14, 2, WOOD_DK);
  body.addChild(post);
  return {
    body,
    height: 46,
    tick(clock, moving, atk) {
      for (const w of wheels) w.rotation = moving ? clock * 3 : 0;
      const k = kick(atk);
      gun.x = 2 - k * 4;
      bolts.alpha = k > 0.1 ? 0.4 : 1;
      body.y = moving ? Math.sin(clock * 6) * 0.5 : 0;
    },
  };
}

// ───────────────────────── Hỏa Pháo ─────────────────────────
function cannon(accent: number): ExtraArt {
  const body = new Container();
  const wheels = carriage(body, accent, 40, 9);
  const barrel = new Container();
  const b = g();
  poly(b, [-18, -7, 14, -5, 14, 5, -18, 8], BRONZE, 1.6);
  rrect(b, 12, -7, 7, 14, 2, darker(BRONZE, 0.15));
  rrect(b, -6, -8, 3, 16, 1, lighter(BRONZE, 0.25));
  ball(b, -19, 0, 4.5, darker(BRONZE, 0.2));
  b.circle(19, 0, 2.6).fill(0x1a1410);
  barrel.addChild(b);
  const flash = g();
  poly(flash, [20, 0, 32, -6, 27, 0, 32, 6], 0xffd34d, 0.8);
  poly(flash, [20, 0, 27, -3, 24, 0, 27, 3], 0xffffff, 0);
  flash.visible = false;
  barrel.addChild(flash);
  barrel.position.set(0, -26);
  barrel.rotation = -0.2;
  body.addChild(barrel);
  const mount = g();
  poly(mount, [-9, -17, 9, -17, 12, -10, -12, -10], WOOD_DK, 1.4);
  body.addChild(mount);
  return {
    body,
    height: 40,
    tick(clock, moving, atk) {
      for (const w of wheels) w.rotation = moving ? clock * 3 : 0;
      const k = kick(atk);
      barrel.x = -k * 7;
      barrel.rotation = -0.2 - k * 0.06;
      flash.visible = atk > 0 && atk < 0.22;
      body.y = moving ? Math.sin(clock * 6) * 0.5 : 0;
    },
  };
}

// ───────────────────────── Xe Hỏa Tiễn ─────────────────────────
function rocketCart(accent: number): ExtraArt {
  const body = new Container();
  const wheels = carriage(body, accent, 42, 8);
  const rack = new Container();
  const frame = g();
  poly(frame, [-16, 8, 22, -14, 24, -8, -14, 14], WOOD, 1.6);
  rack.addChild(frame);
  const tubes: Graphics[] = [];
  for (let i = 0; i < 3; i++) {
    const t = g();
    rrect(t, -14, -3.6 + i * 0, 36, 4.4, 2, 0x8a3a2a);
    poly(t, [22, -3.6, 28, -1.4, 22, 0.8], 0xffd34d, 0.8);
    t.position.set(0, -6 + i * 5.2);
    rack.addChild(t);
    tubes.push(t);
  }
  rack.position.set(0, -30);
  rack.rotation = -0.28;
  body.addChild(rack);
  const post = g();
  rrect(post, -4, -27, 8, 12, 2, WOOD_DK);
  body.addChild(post);
  return {
    body,
    height: 44,
    tick(clock, moving, atk) {
      for (const w of wheels) w.rotation = moving ? clock * 3 : 0;
      tubes.forEach((t, i) => {
        // ba tiễn phóng lần lượt
        const k = atk > 0 ? kick(Math.max(0, atk - i * 0.08)) : 0;
        t.x = -k * 5;
        t.alpha = k > 0.1 ? 0.5 : 1;
      });
      body.y = moving ? Math.sin(clock * 6) * 0.5 : 0;
    },
  };
}

// ───────────────────────── Pháo Thạch Cự Hình ─────────────────────────
function mangonel(accent: number): ExtraArt {
  const body = new Container();
  const wheels = carriage(body, accent, 50, 10);
  const towers = g();
  poly(towers, [-18, -20, -8, -20, -4, -44, -14, -44], WOOD_DK, 1.6);
  poly(towers, [8, -20, 18, -20, 14, -44, 4, -44], WOOD_DK, 1.6);
  rrect(towers, -16, -46, 32, 5, 2, WOOD);
  body.addChild(towers);
  const arm = new Container();
  const a = g();
  rrect(a, -28, -2.6, 50, 5.2, 2, WOOD);
  poly(a, [18, -3, 34, -10, 36, 2, 20, 4], IRON, 1.4);
  ball(a, 29, -7, 6, 0x9a9aa6);
  rrect(a, -34, -8, 10, 16, 2.5, 0x4a4a5a);
  poly(a, [-30, -8, -22, -8, -26, -17], accent, 1);
  arm.addChild(a);
  arm.position.set(0, -44);
  arm.rotation = -0.5;
  body.addChild(arm);
  return {
    body,
    height: 56,
    tick(clock, moving, atk) {
      for (const w of wheels) w.rotation = moving ? clock * 2.4 : 0;
      let rot = -0.5;
      if (atk > 0) {
        if (atk < 0.35) rot = lerp(-0.5, -0.9, atk / 0.35);
        else if (atk < 0.7) rot = lerp(-0.9, 0.8, (atk - 0.35) / 0.35);
        else rot = lerp(0.8, -0.5, (atk - 0.7) / 0.3);
      }
      arm.rotation = rot;
      body.y = moving ? Math.sin(clock * 5) * 0.6 : 0;
    },
  };
}

export const ENGINE_ART: Record<string, (accent: number) => ExtraArt> = { noxe: boltCart, hoapao: cannon, xetenlua: rocketCart, phaothach: mangonel };
export const hasEngineArt = (id: string) => id in ENGINE_ART;
export const buildEngine = (id: string, accent: number): ExtraArt => ENGINE_ART[id](accent);
