import { Container, Graphics, type FillGradient } from 'pixi.js';
import { INK, ball, darker, g, hgrad, mix, outline, poly, rng, rrect, vgrad, vgradA } from './draw';
import {
  PAL_BLUE, PAL_DARK, PAL_GOLD, PAL_WARM, cloudBlob, house, karst, palace, pagodaHall, pine, treeBall, type Palette,
} from './landmarks';

import type { StationTheme } from '../data/campaign';
export type ThemeKey = StationTheme;

interface ThemeDef {
  sky: [number, number, number];
  sun: number;
  sunKind: 'sun' | 'moon';
  sunX: number;
  cloud: number;
  karst: [number, number];
  snowPeaks: boolean;
  river: [number, number];
  ground: [number, number];
  blade: number;
  bladeLight: number;
  path: [number, number];
  stone: number;
  fog: number;
  pal: Palette;
  palace: boolean;
  trees: [number, number, number];
  sakura: boolean;
  pines: boolean;
  ambient: 'petal' | 'leaf' | 'dust' | 'firefly' | 'ember' | 'snow';
  /** địa hình xa đặc biệt thay cho núi đá */
  terrain?: 'dunes' | 'cones' | 'clouds';
  /** cây/vật trang trí đặc trưng */
  deco?: 'cactus' | 'palm' | 'dead' | 'maple';
  ambientColor: number;
  rays: boolean;
  stars: boolean;
  flowers: number[];
  fence: number;
}

const THEMES: Record<string, ThemeDef> = {
  plains: {
    sky: [0x3a96e6, 0x8fd0ff, 0xfff0d0], sun: 0xfff3b0, sunKind: 'sun', sunX: 0.3, cloud: 0xffffff,
    karst: [0x8fb4a8, 0x6f9c92], snowPeaks: false, river: [0x4ab6e8, 0x2a86c8], ground: [0x8ed062, 0x4f9c3f],
    blade: 0x3d8a33, bladeLight: 0xbdf08a, path: [0xd9b97a, 0xb08a52], stone: 0x8a6a3f, fog: 0xeaf6ff,
    pal: PAL_BLUE, palace: true, trees: [0x4caf50, 0x66c35a, 0x3a9444], sakura: true, pines: true,
    ambient: 'petal', ambientColor: 0xffc2da, rays: true, stars: false, flowers: [0xff6a8a, 0xffe066, 0xffffff, 0xb48cff], fence: 0x8a5a30,
  },
  bamboo: {
    sky: [0x62c9aa, 0xb4ecc8, 0xf4ffe2], sun: 0xf6ffd8, sunKind: 'sun', sunX: 0.72, cloud: 0xf2fff6,
    karst: [0x84c4aa, 0x5fa088], snowPeaks: false, river: [0x4ac8c0, 0x2a98a0], ground: [0x58b25f, 0x2f7e47],
    blade: 0x2c7a3f, bladeLight: 0xa8f08a, path: [0xcdbb86, 0xa28f60], stone: 0x7a6a44, fog: 0xeaffee,
    pal: PAL_BLUE, palace: false, trees: [0x4fae5a, 0x6cc46a, 0x39924a], sakura: false, pines: false,
    ambient: 'leaf', ambientColor: 0x86d664, rays: true, stars: false, flowers: [0xffffff, 0xffe066], fence: 0x7a6a3a,
  },
  stone: {
    sky: [0x6f8fb8, 0xaec2da, 0xeaeff5], sun: 0xffffff, sunKind: 'sun', sunX: 0.65, cloud: 0xf4f7fb,
    karst: [0xa6b3c8, 0x8391ab], snowPeaks: true, river: [0x7ab8e0, 0x4a88b8], ground: [0x8fa270, 0x5f7650],
    blade: 0x4a6a3c, bladeLight: 0xc4dca0, path: [0xb8b8bc, 0x8a8a94], stone: 0x62626c, fog: 0xeef2f8,
    pal: PAL_BLUE, palace: false, trees: [0x4f8a52, 0x65a066, 0x3c7442], sakura: false, pines: true,
    ambient: 'dust', ambientColor: 0xffffff, rays: false, stars: false, flowers: [0xffffff, 0xd0d8ff], fence: 0x6a5a48,
  },
  castle: {
    sky: [0xc8643e, 0xf0a266, 0xffe2ac], sun: 0xfff0c2, sunKind: 'sun', sunX: 0.2, cloud: 0xffd9b0,
    karst: [0xc0907e, 0x9a6e66], snowPeaks: false, river: [0xe8a070, 0xc87a50], ground: [0x929256, 0x5e6a3c],
    blade: 0x4a5a2c, bladeLight: 0xd6e08a, path: [0xd0b88a, 0xa28a62], stone: 0x7a6a50, fog: 0xffd2a0,
    pal: PAL_WARM, palace: true, trees: [0x6a8a3c, 0x82a24a, 0x56742f], sakura: false, pines: true,
    ambient: 'firefly', ambientColor: 0xffe58a, rays: true, stars: false, flowers: [0xffb26a, 0xffe066], fence: 0x6a4a2a,
  },
  throne: {
    sky: [0x160a2e, 0x64214e, 0xe2614a], sun: 0xff7a5a, sunKind: 'moon', sunX: 0.38, cloud: 0x5a2a4a,
    karst: [0x40285a, 0x2e1c46], snowPeaks: false, river: [0xc84a2a, 0x7a1a2a], ground: [0x4c3c56, 0x2a1e36],
    blade: 0x2a1e36, bladeLight: 0x7a5a8a, path: [0x72607a, 0x4a3c58], stone: 0x2c2036, fog: 0x8a2c52,
    pal: PAL_DARK, palace: true, trees: [0x3a2a4a, 0x4a3a5a, 0x2a1e38], sakura: false, pines: true,
    ambient: 'ember', ambientColor: 0xff9a4a, rays: false, stars: true, flowers: [0xff6a4a, 0xc86aff], fence: 0x2c2036,
  },
};

// ───── chủ đề mới (chương 2 & 3)
THEMES.sea = {
  sky: [0x38b6f0, 0x9fe4ff, 0xfff4d8], sun: 0xfff6c0, sunKind: 'sun', sunX: 0.7, cloud: 0xffffff,
  karst: [0x6aa8a8, 0x4a8890], snowPeaks: false, river: [0x20c0e0, 0x0a90c0], ground: [0xf0dc9a, 0xd8bc6a],
  blade: 0x6a9a3a, bladeLight: 0xc8e890, path: [0xf6e4b0, 0xd8bc80], stone: 0xa88a50, fog: 0xe8faff,
  pal: PAL_BLUE, palace: false, trees: [0x3aa860, 0x58c070, 0x2a8850], sakura: false, pines: false, deco: 'palm',
  ambient: 'leaf', ambientColor: 0x7ad060, rays: true, stars: false, flowers: [0xff7aa8, 0xffffff], fence: 0xb08a50,
};
THEMES.snow = {
  sky: [0x7faad8, 0xc4dcf0, 0xf4f8ff], sun: 0xffffff, sunKind: 'sun', sunX: 0.3, cloud: 0xf4f8ff,
  karst: [0xb8c8e0, 0x9ab0d0], snowPeaks: true, river: [0x9ad0f0, 0x6aa8d8], ground: [0xeef4fa, 0xc0d0e0],
  blade: 0x8aa0b8, bladeLight: 0xffffff, path: [0xd0dcea, 0xa8b8cc], stone: 0x7a8aa0, fog: 0xf0f6ff,
  pal: PAL_BLUE, palace: false, trees: [0x3f7a62, 0x55967a, 0x2f6a52], sakura: false, pines: true,
  ambient: 'snow', ambientColor: 0xffffff, rays: false, stars: false, flowers: [0xffffff, 0xb0d8ff], fence: 0x7a6a5a,
};
THEMES.desert = {
  sky: [0x3a90d8, 0x9ad0f0, 0xffe8b0], sun: 0xfff0b0, sunKind: 'sun', sunX: 0.75, cloud: 0xfff4dc,
  karst: [0xe0b070, 0xc09050], snowPeaks: false, terrain: 'dunes', river: [0x6ac0d8, 0x3a90b0], ground: [0xe8c880, 0xc09850],
  blade: 0xa08a40, bladeLight: 0xe8d890, path: [0xd8b070, 0xb08848], stone: 0x8a6a30, fog: 0xffecc0,
  pal: PAL_WARM, palace: true, trees: [0x5a9a3a, 0x72b04a, 0x4a822e], sakura: false, pines: false, deco: 'cactus',
  ambient: 'dust', ambientColor: 0xf0d8a0, rays: true, stars: false, flowers: [0xffb26a, 0xffe066], fence: 0x8a6a3a,
};
THEMES.heaven = {
  sky: [0xf8b8d8, 0xffe0f0, 0xfff8e0], sun: 0xfff8d0, sunKind: 'sun', sunX: 0.5, cloud: 0xffffff,
  karst: [0xe8d8f8, 0xc8b0e8], snowPeaks: false, terrain: 'clouds', river: [0xc8a0f0, 0x9a78d8], ground: [0xf8f0ff, 0xd8c8f0],
  blade: 0xb8a0d8, bladeLight: 0xffffff, path: [0xffe8a0, 0xe0b858], stone: 0xa08848, fog: 0xfff0ff,
  pal: PAL_GOLD, palace: true, trees: [0xff9ac0, 0xffb8d8, 0xe878a0], sakura: true, pines: false,
  ambient: 'petal', ambientColor: 0xffd8e8, rays: true, stars: false, flowers: [0xffd34d, 0xffffff], fence: 0xd8b858,
};
THEMES.volcano = {
  sky: [0x2a0a10, 0x8a2a18, 0xff7a30], sun: 0xff9a40, sunKind: 'sun', sunX: 0.5, cloud: 0x6a2a20,
  karst: [0x4a2020, 0x341414], snowPeaks: false, terrain: 'cones', river: [0xff7a20, 0xc83a10], ground: [0x5a4038, 0x2e1c18],
  blade: 0x4a2a20, bladeLight: 0xff8a40, path: [0x7a5a50, 0x4a3430], stone: 0x2a1814, fog: 0xa03a20,
  pal: PAL_DARK, palace: true, trees: [0x3a2018, 0x4a2a20, 0x2a1410], sakura: false, pines: false, deco: 'dead',
  ambient: 'ember', ambientColor: 0xffa040, rays: false, stars: false, flowers: [0xff6a2a, 0xffb040], fence: 0x3a2420,
};
THEMES.night = {
  sky: [0x0a1030, 0x1a2a58, 0x3a4a80], sun: 0xf8f4d0, sunKind: 'moon', sunX: 0.72, cloud: 0x3a4a70,
  karst: [0x2a3a60, 0x1a2848], snowPeaks: false, river: [0x2a5a78, 0x142a48], ground: [0x2e4a48, 0x162a2e],
  blade: 0x1e3a38, bladeLight: 0x6aa898, path: [0x5a6a78, 0x38465a], stone: 0x1a2434, fog: 0x3a5078,
  pal: PAL_DARK, palace: true, trees: [0xc84a2a, 0xe8702a, 0xa83020], sakura: false, pines: false, deco: 'maple',
  ambient: 'firefly', ambientColor: 0xffe58a, rays: false, stars: true, flowers: [0xff6a4a, 0xf8e070], fence: 0x2a2030,
};

// ───── vật trang trí / địa hình mới
function cactusDeco(o: Graphics, x: number, y: number, s: number) {
  const col = 0x58a84a;
  o.ellipse(x, y + 1, s * 0.22, s * 0.05).fill({ color: INK, alpha: 0.2 });
  rrect(o, x - s * 0.07, y - s * 0.62, s * 0.14, s * 0.62, s * 0.07, col);
  rrect(o, x - s * 0.25, y - s * 0.34, s * 0.16, s * 0.07, s * 0.035, col);
  rrect(o, x - s * 0.25, y - s * 0.5, s * 0.07, s * 0.2, s * 0.035, col);
  rrect(o, x + s * 0.09, y - s * 0.42, s * 0.16, s * 0.07, s * 0.035, col);
  rrect(o, x + s * 0.18, y - s * 0.56, s * 0.07, s * 0.19, s * 0.035, col);
  o.circle(x, y - s * 0.64, s * 0.04).fill(0xff8aa8);
}

function palmDeco(o: Graphics, x: number, y: number, s: number) {
  o.ellipse(x, y + 1, s * 0.25, s * 0.05).fill({ color: INK, alpha: 0.2 });
  poly(o, [x - s * 0.04, y, x + s * 0.02, y - s * 0.72, x + s * 0.1, y - s * 0.72, x + s * 0.06, y], 0x9a6a3a, 1.2);
  const tx = x + s * 0.06;
  const ty = y - s * 0.72;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI + (i / 5) * Math.PI;
    const lx = tx + Math.cos(a) * s * 0.42;
    const ly = ty + Math.sin(a) * s * 0.18 + s * 0.12;
    poly(o, [tx, ty, (tx + lx) / 2, (ty + ly) / 2 - s * 0.14, lx, ly, (tx + lx) / 2, (ty + ly) / 2 - s * 0.04], i % 2 ? 0x3aa860 : 0x2a8850, 1.1);
  }
  ball(o, tx - 2, ty + 3, s * 0.05, 0x6a4a2a);
  ball(o, tx + 3, ty + 4, s * 0.05, 0x6a4a2a);
}

function deadTree(o: Graphics, x: number, y: number, s: number) {
  o.ellipse(x, y + 1, s * 0.2, s * 0.05).fill({ color: INK, alpha: 0.25 });
  const b = 0x3a2a24;
  o.moveTo(x, y).lineTo(x, y - s * 0.5).stroke({ width: s * 0.09, color: b, cap: 'round' });
  o.moveTo(x, y - s * 0.3).lineTo(x - s * 0.22, y - s * 0.55).stroke({ width: s * 0.05, color: b, cap: 'round' });
  o.moveTo(x, y - s * 0.4).lineTo(x + s * 0.2, y - s * 0.66).stroke({ width: s * 0.05, color: b, cap: 'round' });
  o.moveTo(x, y - s * 0.5).lineTo(x - s * 0.08, y - s * 0.78).stroke({ width: s * 0.04, color: b, cap: 'round' });
}

function dunes(o: Graphics, W: number, baseY: number, P: number, rand: () => number, th: ThemeDef) {
  softRidge(o, W, baseY, P * 0.42, Math.max(140, W / 4), rand, vgrad(mix(th.ground[0], th.fog, 0.5), mix(th.ground[0], th.fog, 0.2)));
  softRidge(o, W, baseY + P * 0.03, P * 0.3, Math.max(110, W / 5), rand, vgrad(mix(th.ground[0], 0xffffff, 0.2), th.ground[1]));
  for (let i = 0; i < Math.round(W / 40); i++) {
    const x = rand() * W;
    const y = baseY - rand() * P * 0.26;
    o.moveTo(x, y).quadraticCurveTo(x + 18, y - 4, x + 36, y).stroke({ width: 1, color: 0xffffff, alpha: 0.28 });
  }
}

function volcanoCones(o: Graphics, W: number, baseY: number, P: number, rand: () => number, th: ThemeDef) {
  const n = Math.max(3, Math.round(W / 320));
  for (let i = 0; i < n; i++) {
    const cx = ((i + 0.3 + rand() * 0.4) / n) * W;
    const h = P * (0.55 + rand() * 0.35);
    const w = h * (1.5 + rand() * 0.6);
    const top = baseY - h;
    o.poly([cx - w / 2, baseY + 4, cx - w * 0.1, top, cx + w * 0.1, top, cx + w / 2, baseY + 4]).fill(vgrad(mix(th.karst[0], th.fog, 0.2), th.karst[1]));
    o.poly([cx + w * 0.1, top, cx + w / 2, baseY + 4, cx + w * 0.12, baseY + 4]).fill({ color: INK, alpha: 0.2 });
    o.ellipse(cx, top, w * 0.1, h * 0.035).fill(0xff7a2a);
    o.ellipse(cx, top - 2, w * 0.18, h * 0.12).fill({ color: 0xff7a2a, alpha: 0.2 });
    for (let k = 0; k < 3; k++) {
      const dx = (k - 1) * w * 0.06;
      o.moveTo(cx + dx, top + 2).lineTo(cx + dx * 2.4 + (rand() - 0.5) * 8, top + h * (0.35 + rand() * 0.3)).stroke({ width: 2.4, color: 0xff6a20, alpha: 0.85, cap: 'round' });
    }
  }
}

function cloudSea(o: Graphics, W: number, horizon: number, P: number, rand: () => number, th: ThemeDef) {
  // đảo mây nổi với cung điện vàng
  const n = Math.max(2, Math.round(W / 420));
  for (let i = 0; i < n; i++) {
    const x = ((i + 0.3 + rand() * 0.4) / n) * W * 0.6 + W * 0.05;
    const y = horizon - P * (0.1 + rand() * 0.18);
    cloudBlob(o, x, y + P * 0.1, P * 0.17, 0xffffff, 0.95);
    pagodaHall(o, x, y + P * 0.04, P * 0.22, P * (0.24 + rand() * 0.1), 3, PAL_GOLD);
  }
  for (let i = 0; i < Math.round(W / 130); i++) cloudBlob(o, rand() * W, horizon - P * rand() * 0.12, P * (0.09 + rand() * 0.08), mix(0xffffff, th.sky[2], 0.3), 0.85);
}

export interface Battlefield {
  back: Container;
  front: Container;
  update(dt: number): void;
}

const RES = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

function cache(c: Container) {
  try {
    c.cacheAsTexture({ resolution: RES, antialias: true });
  } catch {
    /* không hỗ trợ: vẽ trực tiếp */
  }
}

function softRidge(o: Graphics, W: number, baseY: number, amp: number, step: number, rand: () => number, fill: number | FillGradient) {
  const pts: [number, number][] = [];
  for (let x = -step; x <= W + step * 1.6; x += step) pts.push([x + (rand() - 0.5) * step * 0.4, baseY - amp * (0.3 + 0.7 * rand())]);
  o.moveTo(pts[0][0], baseY + 4).lineTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1][0] + pts[i][0]) / 2;
    const my = (pts[i - 1][1] + pts[i][1]) / 2;
    o.quadraticCurveTo(pts[i - 1][0], pts[i - 1][1], mx, my);
  }
  const last = pts[pts.length - 1];
  o.lineTo(last[0], last[1]).lineTo(last[0], baseY + 4).closePath().fill(fill);
}

function snowPeaks(o: Graphics, W: number, baseY: number, amp: number, step: number, rand: () => number, color: number, fog: number) {
  const pts: [number, number][] = [];
  for (let x = -step; x < W + step; x += step) pts.push([x + step * 0.5, baseY - amp * (0.55 + 0.45 * rand())]);
  const poly2: number[] = [-step, baseY + 4];
  for (const [px, py] of pts) poly2.push(px - step * 0.5, baseY - amp * 0.1 * rand(), px, py);
  poly2.push(W + step * 2, baseY + 4);
  o.poly(poly2).fill(vgrad(mix(color, 0xffffff, 0.15), mix(color, fog, 0.65)));
  for (const [px, py] of pts) {
    const half = step * 0.5;
    o.poly([px, py, px + half * 1.05, baseY, px + half * 0.2, baseY]).fill({ color: INK, alpha: 0.13 });
    o.poly([px, py, px - half * 0.2, baseY, px - half * 0.9, baseY]).fill({ color: 0xffffff, alpha: 0.1 });
    const s = half * 0.34;
    o.poly([px - s * 1.1, py + s * 1.05, px - s * 0.4, py + s * 0.8, px, py + s * 1.2, px + s * 0.5, py + s * 0.85, px + s * 1.1, py + s * 1.05, px, py]).fill({ color: 0xffffff, alpha: 0.92 });
  }
}

/** Chiến trường liền mạch: toàn cảnh phía trên + 3 làn đường đất ngăn bằng hàng rào */
export function buildBattlefield(themeKey: ThemeKey, W: number, H: number, panoH: number, laneH: number, seed: number, laneCount = 3): Battlefield {
  const th = THEMES[themeKey];
  const rand = rng(seed);
  const P = panoH;
  const horizon = P * 0.78;
  const laneTop = (i: number) => P + i * laneH;

  // ───────── bầu trời (cache) ─────────
  const sky = new Container();
  {
    const o = g();
    o.rect(0, 0, W, horizon + 4).fill(vgrad(th.sky[0], th.sky[1], th.sky[2]));
    if (th.stars) for (let i = 0; i < 60; i++) o.circle(rand() * W, rand() * horizon * 0.7, 0.5 + rand() * 1.2).fill({ color: 0xffffff, alpha: 0.4 + rand() * 0.5 });
    const sx = W * th.sunX;
    const sy = horizon * 0.34;
    const r = P * (th.sunKind === 'moon' ? 0.13 : 0.1);
    for (let i = 6; i >= 1; i--) o.circle(sx, sy, r * (1 + i * 0.6)).fill({ color: th.sun, alpha: 0.06 });
    o.circle(sx, sy, r).fill(th.sun);
    o.circle(sx, sy, r * 0.82).fill({ color: 0xffffff, alpha: 0.5 });
    if (th.sunKind === 'moon') {
      o.circle(sx - r * 0.3, sy - r * 0.2, r * 0.18).fill({ color: INK, alpha: 0.12 });
      o.circle(sx + r * 0.35, sy + r * 0.25, r * 0.12).fill({ color: INK, alpha: 0.12 });
    }
    sky.addChild(o);
  }
  cache(sky);

  // ───────── mây trôi + quầng sáng + chim ─────────
  const clouds = new Container();
  const halo = g();
  halo.circle(0, 0, P * 0.28).fill({ color: th.sun, alpha: 0.14 });
  halo.position.set(W * th.sunX, horizon * 0.34);
  clouds.addChild(halo);
  const cloudList: { c: Container; v: number; w: number }[] = [];
  const nCloud = Math.max(4, Math.round(W / 260));
  for (let i = 0; i < nCloud; i++) {
    const c = new Container();
    const s = P * (0.07 + rand() * 0.06);
    const o = g();
    cloudBlob(o, 0, 0, s, th.cloud, themeKey === 'throne' ? 0.5 : 0.92);
    c.addChild(o);
    c.position.set(rand() * W, P * (0.06 + rand() * 0.42));
    clouds.addChild(c);
    cloudList.push({ c, v: 3 + rand() * 7, w: s * 4 });
  }
  const birds: { c: Container; wl: Graphics; wr: Graphics; v: number; y0: number; ph: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const c = new Container();
    const wl = g();
    const wr = g();
    const col = themeKey === 'throne' ? 0x1a1022 : 0x2a3350;
    wl.moveTo(0, 0).quadraticCurveTo(-5, -6, -12, -2).stroke({ width: 2, color: col, cap: 'round' });
    wr.moveTo(0, 0).quadraticCurveTo(5, -6, 12, -2).stroke({ width: 2, color: col, cap: 'round' });
    c.addChild(wl, wr, g().ellipse(0, 0.5, 2.4, 1.6).fill(col));
    c.scale.set(Math.max(0.7, P / 190) * (0.8 + rand() * 0.5));
    const v = (rand() < 0.5 ? 1 : -1) * (16 + rand() * 16);
    c.position.set(rand() * W, P * (0.12 + rand() * 0.4));
    clouds.addChild(c);
    birds.push({ c, wl, wr, v, y0: c.y, ph: rand() * 6 });
  }

  // ───────── toàn cảnh + địa hình (cache) ─────────
  const scene = new Container();
  const o = g();
  scene.addChild(o);

  if (th.terrain === 'dunes') dunes(o, W, horizon + 6, P, rand, th);
  else if (th.terrain === 'cones') volcanoCones(o, W, horizon + 6, P, rand, th);
  else if (th.terrain === 'clouds') cloudSea(o, W, horizon + 4, P, rand, th);
  else if (th.snowPeaks) {
    snowPeaks(o, W, horizon + 4, P * 0.62, Math.max(90, W / 6), rand, th.karst[0], th.fog);
    snowPeaks(o, W, horizon + 6, P * 0.4, Math.max(64, W / 9), rand, th.karst[1], th.fog);
  } else {
    // dãy núi đá xa (nhạt) rồi gần hơn (đậm)
    const nFar = Math.max(5, Math.round(W / 140));
    for (let i = 0; i < nFar; i++) {
      const w = P * (0.3 + rand() * 0.22);
      karst(o, ((i + 0.3 + rand() * 0.5) / nFar) * W, horizon, w, P * (0.42 + rand() * 0.34), mix(th.karst[0], th.fog, 0.35), th.fog, rand, { trees: true });
    }
  }
  // sương mù tầng xa
  o.rect(0, horizon - P * 0.16, W, P * 0.26).fill(vgradA({ c: th.fog, a: 0 }, { c: th.fog, a: 0.6 }, { c: th.fog, a: 0 }));

  // cung điện lớn bên phải + chùa nhỏ bên trái trên đảo
  if (th.palace) {
    palace(o, W * 0.8, horizon + P * 0.06, P * 0.78, th.pal);
    if (themeKey === 'plains') pagodaHall(o, W * 0.17, horizon + P * 0.05, P * 0.2, P * 0.3, 3, th.pal);
    o.rect(0, horizon - P * 0.05, W, P * 0.16).fill(vgradA({ c: th.fog, a: 0 }, { c: th.fog, a: 0.4 }, { c: th.fog, a: 0 }));
  }
  if (!th.snowPeaks && !th.terrain) {
    // núi gần (có thác ở bên trái)
    const nNear = Math.max(3, Math.round(W / 300));
    for (let i = 0; i < nNear; i++) {
      const w = P * (0.42 + rand() * 0.3);
      const x = ((i + 0.25 + rand() * 0.4) / nNear) * W * 0.62 + W * 0.02;
      karst(o, x, horizon + P * 0.07, w, P * (0.55 + rand() * 0.3), th.karst[1], th.fog, rand, { trees: true, waterfall: i === 0 });
    }
  }

  // đồi + cây + nhà dọc bờ sông
  softRidge(o, W, horizon + P * 0.1, P * 0.1, Math.max(90, W / 6), rand, vgrad(mix(th.ground[0], th.fog, 0.2), th.ground[1]));
  const nTree = Math.max(8, Math.round(W / 55));
  for (let k = 0; k < nTree; k++) {
    const x = ((k + 0.1 + rand() * 0.8) / nTree) * W;
    const s = P * (0.18 + rand() * 0.16);
    const y = horizon + P * (0.1 + rand() * 0.05);
    const r = rand();
    if (th.deco === 'cactus' && r < 0.7) cactusDeco(o, x, y, s);
    else if (th.deco === 'palm' && r < 0.75) palmDeco(o, x, y, s);
    else if (th.deco === 'dead' && r < 0.8) deadTree(o, x, y, s);
    else if (th.sakura && r < 0.28) treeBall(o, x, y, s, [0xf6a8c8, 0xffc4dc, 0xe888b0]);
    else if (th.pines && r < 0.55) pine(o, x, y, s, [th.trees[0], th.trees[1], th.trees[2]], themeKey === 'stone');
    else if (r < 0.62 && themeKey !== 'throne' && themeKey !== 'volcano' && themeKey !== 'night') house(o, x, y, s * 0.6, th.pal.roof);
    else treeBall(o, x, y, s, th.trees);
  }

  // sông/hồ phía sau làn đầu tiên
  const ry = P * 0.9;
  o.rect(0, ry, W, P * 0.12).fill(vgrad(th.river[0], th.river[1]));
  for (let i = 0; i < Math.round(W / 36); i++) {
    const x = rand() * W;
    o.moveTo(x, ry + 3 + rand() * P * 0.08).lineTo(x + 8 + rand() * 18, ry + 3 + rand() * P * 0.08).stroke({ width: 1.2, color: 0xffffff, alpha: 0.35, cap: 'round' });
  }

  // mặt đất toàn chiến trường
  const gTop = P * 0.98;
  o.rect(0, gTop, W, H - gTop + 1).fill(vgrad(th.ground[0], th.ground[1]));
  o.rect(0, gTop - 2, W, 4).fill({ color: darker(th.river[1], 0.3), alpha: 0.5 });
  for (let i = 0; i < Math.round(W / 30); i++) {
    const x = rand() * W;
    const y = gTop + 8 + rand() * (H - gTop - 10);
    const light = rand() < 0.5;
    o.ellipse(x, y, 18 + rand() * 50, 4 + rand() * 9).fill({ color: light ? 0xffffff : INK, alpha: light ? 0.06 : 0.07 });
  }

  // 3 làn đường đất lượn sóng
  const tuft = (x: number, y: number, hgt: number) => {
    const col = rand() < 0.5 ? th.blade : mix(th.blade, th.bladeLight, 0.4);
    o.poly([x - 2.4, y, x - 1.2, y - hgt * 0.8, x - 0.2, y]).fill({ color: col, alpha: 0.9 });
    o.poly([x - 0.8, y, x + 0.4, y - hgt, x + 1.6, y]).fill({ color: mix(col, th.bladeLight, 0.35), alpha: 0.95 });
    o.poly([x + 0.8, y, x + 2.2, y - hgt * 0.7, x + 3, y]).fill({ color: col, alpha: 0.9 });
  };
  const pathBand: { top: number; bot: number }[] = [];
  for (let i = 0; i < laneCount; i++) {
    const top = laneTop(i) + laneH * 0.2;
    const bot = laneTop(i) + laneH * 0.84;
    pathBand.push({ top, bot });
    const step = 36;
    const topPts: number[] = [];
    const botPts: number[] = [];
    for (let x = -step; x <= W + step; x += step) {
      topPts.push(x, top + (rand() - 0.5) * laneH * 0.05);
      botPts.push(x, bot + (rand() - 0.5) * laneH * 0.05);
    }
    const rev: number[] = [];
    for (let k = botPts.length - 2; k >= 0; k -= 2) rev.push(botPts[k], botPts[k + 1]);
    const shape = [...topPts, ...rev];
    o.poly(shape.map((v, idx) => (idx % 2 ? v + 3 : v))).fill({ color: darker(th.path[1], 0.5), alpha: 0.45 });
    o.poly(shape).fill(vgrad(th.path[0], th.path[1]));
    o.poly(shape).stroke({ width: 2, color: darker(th.path[1], 0.55), alpha: 0.5, join: 'round' });
    // vệt bánh xe, sỏi, đốm đất
    for (const k of [0.38, 0.66]) o.moveTo(0, top + (bot - top) * k).lineTo(W, top + (bot - top) * k).stroke({ width: 1.2, color: darker(th.path[1], 0.5), alpha: 0.12 });
    for (let k = 0; k < Math.round(W / 12); k++) {
      const x = rand() * W;
      const y = top + 5 + rand() * (bot - top - 10);
      o.ellipse(x, y, 1.5 + rand() * 4, 0.8 + rand() * 1.6).fill({ color: rand() < 0.5 ? darker(th.path[1], 0.35) : mix(th.path[0], 0xffffff, 0.3), alpha: 0.35 });
    }
    // cỏ lấn ra mép đường
    for (let k = 0; k < Math.round(W / 20); k++) {
      const x = rand() * W;
      tuft(x, top + 1, 3 + rand() * 4);
      tuft(x + 7, bot + 3, 3 + rand() * 4);
    }
  }

  // hàng rào gỗ + bụi cây giữa các làn và dưới cùng
  const fence = (y: number, wide: boolean) => {
    const col = th.fence;
    o.moveTo(0, y - 9).lineTo(W, y - 9).stroke({ width: 4.5, color: lineOfSafe(col), cap: 'round' });
    o.moveTo(0, y - 9).lineTo(W, y - 9).stroke({ width: 2.6, color: lighterSafe(col), cap: 'round' });
    o.moveTo(0, y - 3).lineTo(W, y - 3).stroke({ width: 4.5, color: lineOfSafe(col), cap: 'round' });
    o.moveTo(0, y - 3).lineTo(W, y - 3).stroke({ width: 2.6, color: col, cap: 'round' });
    for (let x = 14; x < W; x += wide ? 46 : 38) rrect(o, x - 2.6, y - 14, 5.2, 18, 1.4, col);
  };
  for (let i = 1; i < laneCount; i++) {
    const y = laneTop(i) + laneH * 0.07;
    fence(y, i === 1);
    for (let k = 0; k < Math.round(W / 90); k++) {
      const x = rand() * W;
      const r = laneH * (0.035 + rand() * 0.03);
      ball(o, x, y - 6, r * 1.4, mix(th.trees[2], th.blade, 0.3), r);
      if (rand() < 0.4) o.circle(x + r * 0.4, y - 8, 1.8).fill(th.flowers[Math.floor(rand() * th.flowers.length)]);
    }
  }
  // cây to/bụi hoa rải ở dải cỏ giữa các làn
  for (let i = 0; i < laneCount; i++) {
    const zones: [number, number][] = [[laneTop(i) + laneH * 0.07, pathBand[i].top - 2], [pathBand[i].bot + 4, laneTop(i) + laneH - 2]];
    zones.forEach(([y0, y1], zi) => {
      if (y1 - y0 < 6) return;
      const n = Math.round(W / 11);
      for (let k = 0; k < n; k++) {
        const x = rand() * W;
        const y = y0 + rand() * (y1 - y0);
        if (zi === 1 && i === 2 && y > H - 26) continue;
        tuft(x, y, 4 + rand() * 6);
        if (rand() < 0.2) {
          const c = th.flowers[Math.floor(rand() * th.flowers.length)];
          o.circle(x + 4, y - 1, 1.9).fill(c);
          o.circle(x + 4, y - 1, 0.8).fill(0xfff2a0);
        }
      }
      if (rand() < 0.9) {
        const x = (0.12 + rand() * 0.76) * W;
        const r = rand();
        const y = y1 - 3;
        const s = laneH * 0.34;
        if (r < 0.4 && th.sakura) treeBall(o, x, y, s, [0xf6a8c8, 0xffc4dc, 0xe888b0]);
        else if (r < 0.7) treeBall(o, x, y, s, th.trees);
        else ball(o, x, y - 5, laneH * 0.08, mix(th.trees[1], th.blade, 0.3), laneH * 0.06);
      }
    });
  }
  // đá rải rác
  for (let k = 0; k < Math.round(W / 140); k++) {
    const x = rand() * W;
    const y = laneTop(Math.floor(rand() * laneCount)) + laneH * (0.9 + rand() * 0.07);
    const s = laneH * (0.06 + rand() * 0.05);
    poly(o, [x - s, y, x - s * 0.7, y - s * 0.7, x + s * 0.2, y - s, x + s, y - s * 0.3, x + s * 1.1, y], mix(0x8c919c, 0x6e7380, rand()), 1.2);
  }

  // dải nước cuối chiến trường
  const waterH = Math.min(22, laneH * 0.16);
  const wy = H - waterH;
  o.rect(0, wy, W, waterH + 1).fill(vgrad(th.river[0], th.river[1]));
  o.rect(0, wy, W, 3).fill({ color: darker(th.ground[1], 0.3), alpha: 0.6 });
  cache(scene);

  // sparkle mặt nước (animate)
  const sparks: { g: Graphics; x: number; v: number; ph: number }[] = [];
  const sparkLayer = new Container();
  for (let i = 0; i < Math.max(8, Math.round(W / 70)); i++) {
    const s = g().moveTo(0, 0).lineTo(5 + rand() * 7, 0).stroke({ width: 1.3, color: 0xffffff, alpha: 0.7, cap: 'round' });
    const x = rand() * W;
    s.position.set(x, wy + 4 + rand() * (waterH - 8));
    sparkLayer.addChild(s);
    sparks.push({ g: s, x, v: 6 + rand() * 12, ph: rand() * 6 });
  }

  // cỏ/hoa đung đưa theo gió
  const sway: { c: Container; ph: number }[] = [];
  const swayLayer = new Container();
  const nSway = Math.max(10, Math.round(W / 55));
  for (let i = 0; i < nSway; i++) {
    const c = new Container();
    const o2 = g();
    const lane = Math.floor(rand() * laneCount);
    const above = rand() < 0.5;
    const y0 = above ? laneTop(lane) + laneH * 0.1 : pathBand[lane].bot + 6;
    const y1 = above ? pathBand[lane].top - 4 : laneTop(lane) + laneH - 6;
    const y = y0 + rand() * Math.max(2, y1 - y0);
    const n3 = 3 + Math.floor(rand() * 3);
    for (let k = 0; k < n3; k++) {
      const hgt = 7 + rand() * 8;
      const bx = (k - n3 / 2) * 2.4;
      const col = mix(th.blade, th.bladeLight, rand() * 0.6);
      o2.poly([bx - 1.4, 0, bx + (rand() - 0.5) * 3, -hgt, bx + 1.4, 0]).fill(col);
      outline(o2, col, 0.8);
    }
    if (rand() < 0.5) {
      const fc = th.flowers[Math.floor(rand() * th.flowers.length)];
      o2.moveTo(0, 0).lineTo(1, -13).stroke({ width: 1.2, color: th.blade });
      o2.circle(1, -14, 2.6).fill(fc).stroke({ width: 0.8, color: darker(fc, 0.5) });
      o2.circle(1, -14, 1).fill(0xfff2a0);
    }
    c.addChild(o2);
    c.position.set(rand() * W, y);
    swayLayer.addChild(c);
    sway.push({ c, ph: rand() * 6.28 });
  }

  // ───────── lớp trước: tia nắng, bụi cây, vignette ─────────
  const front = new Container();
  const fgStatic = new Container();
  {
    const f = g();
    if (th.rays) {
      const sx = W * th.sunX;
      for (let i = 0; i < 5; i++) {
        const spread = (i - 2) * P * 1.1 + rand() * 30;
        const wd = 20 + rand() * 40;
        f.poly([sx - 8, -4, sx + 8, -4, sx + spread + wd, H, sx + spread - wd, H]).fill({ color: th.sun, alpha: 0.045 });
      }
    }
    const col = mix(th.trees[2], th.blade, 0.3);
    for (let x = -10; x < W + 20; x += 20 + rand() * 22) {
      const r = laneH * (0.03 + rand() * 0.04);
      ball(f, x, H + r * 0.35, r * 1.4, mix(col, th.trees[0], rand() * 0.5), r);
    }
    f.rect(0, 0, W, H).fill(hgrad({ c: INK, a: 0.4 }, { c: INK, a: 0 }, { c: INK, a: 0 }, { c: INK, a: 0.4 }));
    f.rect(0, 0, W, P * 0.2).fill(vgradA({ c: INK, a: 0.3 }, { c: INK, a: 0 }));
    f.rect(0, H * 0.9, W, H * 0.1).fill(vgradA({ c: INK, a: 0 }, { c: INK, a: 0.35 }));
    fgStatic.addChild(f);
  }
  cache(fgStatic);
  front.addChild(fgStatic);

  // hạt bay
  type PT = { g: Graphics; x: number; y: number; vx: number; vy: number; ph: number };
  const parts: PT[] = [];
  const amb = new Container();
  const nAmb = Math.max(14, Math.round(W / 70));
  for (let i = 0; i < nAmb; i++) {
    const p = g();
    const kind = th.ambient;
    if (kind === 'petal' || kind === 'leaf') p.ellipse(0, 0, 3.4, 1.7).fill(i % 5 === 0 && kind === 'petal' ? 0xffffff : th.ambientColor);
    else if (kind === 'dust') p.circle(0, 0, 1.4).fill({ color: th.ambientColor, alpha: 0.6 });
    else if (kind === 'snow') p.circle(0, 0, 1.6 + (i % 3) * 0.7).fill({ color: 0xffffff, alpha: 0.9 });
    else {
      p.circle(0, 0, 4.5).fill({ color: th.ambientColor, alpha: 0.18 });
      p.circle(0, 0, 1.6).fill(th.ambientColor);
    }
    const vy = kind === 'ember' ? -(10 + rand() * 16) : kind === 'dust' ? -(2 + rand() * 4) : kind === 'firefly' ? 0 : kind === 'snow' ? 14 + rand() * 14 : 6 + rand() * 8;
    const vx = kind === 'petal' || kind === 'leaf' ? 10 + rand() * 14 : (rand() - 0.5) * 6;
    amb.addChild(p);
    parts.push({ g: p, x: rand() * W, y: rand() * H, vx, vy, ph: rand() * 6.28 });
  }
  front.addChild(amb);

  const back = new Container();
  back.addChild(sky, clouds, scene, sparkLayer, swayLayer);

  let t = 0;
  return {
    back,
    front,
    update(dt: number) {
      t += dt;
      halo.alpha = 0.75 + Math.sin(t * 0.9) * 0.25;
      for (const b of birds) {
        b.c.x += b.v * dt;
        b.c.y = b.y0 + Math.sin(t * 1.6 + b.ph) * 5;
        b.c.scale.x = Math.abs(b.c.scale.x) * (b.v < 0 ? -1 : 1);
        const flap = Math.sin(t * 9 + b.ph);
        b.wl.rotation = flap * 0.5;
        b.wr.rotation = -flap * 0.5;
        if (b.c.x > W + 30) b.c.x = -30;
        if (b.c.x < -30) b.c.x = W + 30;
      }
      for (const c of cloudList) {
        c.c.x += c.v * dt;
        if (c.c.x > W + c.w) c.c.x = -c.w;
      }
      for (const s of sparks) {
        s.g.alpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.7 + s.ph));
        s.g.x = ((s.x + t * s.v) % (W + 20)) - 10;
      }
      for (const sw of sway) sw.c.rotation = Math.sin(t * 2.1 + sw.ph) * 0.13;
      for (const p of parts) {
        p.x += p.vx * dt + Math.sin(t * 1.4 + p.ph) * 0.25;
        p.y += p.vy * dt;
        if (p.x > W + 10) p.x = -10;
        if (p.x < -10) p.x = W + 10;
        if (p.y > H + 6) p.y = -6;
        if (p.y < -6) p.y = H + 6;
        p.g.position.set(p.x, p.y);
        if (th.ambient === 'firefly') p.g.alpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.8 + p.ph));
        else if (th.ambient === 'petal' || th.ambient === 'leaf') p.g.rotation = Math.sin(t * 2 + p.ph) * 1.2;
      }
    },
  };
}

const lineOfSafe = (c: number) => darker(c, 0.6);
const lighterSafe = (c: number) => mix(c, 0xffffff, 0.3);
