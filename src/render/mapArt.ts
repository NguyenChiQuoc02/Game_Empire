import { Container, Rectangle, type Application } from 'pixi.js';
import { INK, ball, darker, g, hgrad, mix, poly, rng, rrect, vgrad, vgradA } from './draw';
import { PAL_BLUE, PAL_DARK, PAL_GOLD, PAL_WARM, cloudBlob, house, karst, pagodaHall, palace, pine, treeBall } from './landmarks';
import type { StationTheme } from '../data/campaign';

export type MapTheme = StationTheme;

export interface MapSpec {
  w: number;
  h: number;
  /** vị trí các trạm (0..1) theo thứ tự đánh */
  stations: [number, number][];
  themes: MapTheme[];
  start: [number, number];
  end: [number, number];
}

const REGION: Record<MapTheme, { ground: number; accent: number }> = {
  plains: { ground: 0x86cc5c, accent: 0xf6c84a },
  bamboo: { ground: 0x4fb27c, accent: 0x7ae0a0 },
  stone: { ground: 0xc2ced6, accent: 0xffffff },
  castle: { ground: 0xd6a35a, accent: 0xf0c47a },
  throne: { ground: 0x6c4c7c, accent: 0xff7a5a },
  sea: { ground: 0xe8d49a, accent: 0x4ad0f0 },
  snow: { ground: 0xe4eef8, accent: 0xffffff },
  desert: { ground: 0xe6c27a, accent: 0xf0c47a },
  heaven: { ground: 0xf0e0fa, accent: 0xffd34d },
  volcano: { ground: 0x5a3a30, accent: 0xff7a2a },
  night: { ground: 0x34505e, accent: 0xff6a4a },
};

const cache = new Map<string, string>();
const keyOf = (spec: MapSpec) => JSON.stringify([Math.round(spec.w), Math.round(spec.h), spec.stations, spec.themes]);

/** lấy tranh đã vẽ (nếu có) để hiển thị ngay không chờ */
export const peekMapArt = (spec: MapSpec): string | undefined => cache.get(keyOf(spec));

/** Vẽ bản đồ thế giới (kiểu tranh minh họa) rồi xuất ra data URL */
export async function renderMapArt(app: Application, spec: MapSpec): Promise<string> {
  const key = keyOf(spec);
  const hit = cache.get(key);
  if (hit) return hit;
  const { w, h } = spec;
  const m = Math.min(w, h);
  const rand = rng(7771);
  const root = new Container();
  const o = g();
  root.addChild(o);
  const P = (p: [number, number]): [number, number] => [p[0] * w, p[1] * h];
  const pts = [spec.start, ...spec.stations, spec.end].map(P);

  // nền
  o.rect(0, 0, w, h).fill(vgrad(0x7cc658, 0x4f9a46));
  for (let i = 0; i < Math.round((w * h) / 9000); i++) {
    const light = rand() < 0.5;
    o.ellipse(rand() * w, rand() * h, 30 + rand() * 90, 10 + rand() * 30).fill({ color: light ? 0xffffff : INK, alpha: light ? 0.05 : 0.06 });
  }

  // vùng đất theo từng trạm (các mảng mềm chồng nhau)
  const regions: { p: [number, number]; theme: MapTheme }[] = spec.stations.map((s, i) => ({ p: P(s), theme: spec.themes[i] }));
  regions.forEach(({ p, theme }) => {
    const col = REGION[theme];
    for (let k = 0; k < 9; k++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * m * 0.18;
      o.ellipse(p[0] + Math.cos(a) * d * 1.3, p[1] + Math.sin(a) * d, m * (0.1 + rand() * 0.13), m * (0.07 + rand() * 0.1)).fill({ color: col.ground, alpha: 0.5 });
    }
  });

  // sông uốn lượn + hồ
  const river = (x0: number, y0: number, x1: number, y1: number, wid: number) => {
    const c1x = x0 + (x1 - x0) * 0.3 + (rand() - 0.5) * m * 0.3;
    const c1y = y0 + (y1 - y0) * 0.1 + (rand() - 0.5) * m * 0.3;
    const c2x = x0 + (x1 - x0) * 0.7 + (rand() - 0.5) * m * 0.3;
    const c2y = y0 + (y1 - y0) * 0.9 + (rand() - 0.5) * m * 0.3;
    for (const [ww, col, a] of [[wid * 1.5, 0x2a6a9a, 0.9], [wid, 0x4ab6e8, 1], [wid * 0.4, 0xa8e4ff, 0.8]] as const) {
      o.moveTo(x0, y0).bezierCurveTo(c1x, c1y, c2x, c2y, x1, y1).stroke({ width: ww, color: col, alpha: a, cap: 'round', join: 'round' });
    }
  };
  river(w * 0.02, h * 0.45, w * 0.6, h * 0.98, m * 0.045);
  river(w * 0.55, h * 0.02, w * 0.42, h * 0.5, m * 0.03);
  const lake = (cx: number, cy: number, rx: number, ry: number) => {
    o.ellipse(cx, cy, rx * 1.12, ry * 1.12).fill(0x2a6a9a);
    o.ellipse(cx, cy, rx, ry).fill(vgrad(0x6ac8f0, 0x2a8ac8));
    for (let k = 0; k < 6; k++) o.moveTo(cx - rx * 0.6 + rand() * rx, cy - ry * 0.4 + rand() * ry * 0.8).lineTo(cx + rand() * rx * 0.4, cy - ry * 0.4 + rand() * ry * 0.8).stroke({ width: 1.4, color: 0xffffff, alpha: 0.4 });
  };
  lake(w * 0.16, h * 0.3, m * 0.12, m * 0.07);

  // đường đi: làm mượt qua các điểm
  const road = () => {
    const tr = (width: number, color: number, alpha = 1) => {
      o.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        const [px, py] = pts[i - 1];
        const [cx, cy] = pts[i];
        const mx = (px + cx) / 2;
        const my = (py + cy) / 2;
        o.quadraticCurveTo(px + (mx - px) * 0.2 + (i % 2 ? 1 : -1) * m * 0.05, py + (my - py) * 1.2, cx, cy);
      }
      o.stroke({ width, color, alpha, cap: 'round', join: 'round' });
    };
    return tr;
  };

  // cầu bắc qua sông (gần các điểm giao ước lượng)
  // trang trí theo vùng
  const nearPath = (x: number, y: number) => pts.some(([px, py]) => Math.hypot(px - x, py - y) < m * 0.09);
  regions.forEach(({ p, theme }) => {
    const col = REGION[theme];
    const n = Math.round((m * m) / 9000);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2;
      const d = (0.08 + rand() * 0.5) * m * 0.34;
      const x = p[0] + Math.cos(a) * d * 1.4;
      const y = p[1] + Math.sin(a) * d * 0.9;
      if (x < 8 || x > w - 8 || y < h * 0.16 || y > h - 8 || nearPath(x, y)) continue;
      const s = m * (0.05 + rand() * 0.05);
      switch (theme) {
        case 'plains':
          if (rand() < 0.3) house(o, x, y, s * 0.7, 0xb8523a);
          else if (rand() < 0.2) treeBall(o, x, y, s, [0xf6a8c8, 0xffc4dc, 0xe888b0]);
          else treeBall(o, x, y, s, [0x4caf50, 0x66c35a, 0x3a9444]);
          break;
        case 'bamboo':
          pine(o, x, y, s, [0x2f9a5a, 0x4ab870, 0x238a4a]);
          if (rand() < 0.2) house(o, x + 6, y + 4, s * 0.55, 0x3e6a56);
          break;
        case 'stone':
          if (rand() < 0.5) pine(o, x, y, s, [0x3f7a62, 0x55967a, 0x2f6a52], true);
          else {
            poly(o, [x - s * 0.4, y, x - s * 0.25, y - s * 0.35, x + s * 0.05, y - s * 0.5, x + s * 0.35, y - s * 0.15, x + s * 0.4, y], 0xaeb6c2, 1.2);
            o.poly([x - s * 0.25, y - s * 0.35, x + s * 0.05, y - s * 0.5, x + s * 0.1, y - s * 0.3]).fill({ color: 0xffffff, alpha: 0.8 });
          }
          break;
        case 'castle':
          if (rand() < 0.4) house(o, x, y, s * 0.75, 0x8a4a3a, 0xf0dcc0);
          else treeBall(o, x, y, s * 0.9, [0x8a9a3c, 0xa4b04a, 0x6e8030]);
          break;
        case 'sea':
          if (rand() < 0.22) o.ellipse(x, y, s * 0.9, s * 0.35).fill({ color: 0x4ad0f0, alpha: 0.7 });
          else if (rand() < 0.3) house(o, x, y, s * 0.6, 0xc89a52, 0xf6e4b0);
          else treeBall(o, x, y, s, [0x3aa860, 0x58c070, 0x2a8850]);
          break;
        case 'snow':
          if (rand() < 0.65) pine(o, x, y, s, [0x3f7a62, 0x55967a, 0x2f6a52], true);
          else poly(o, [x - s * 0.15, y, x - s * 0.05, y - s * 0.5, x + s * 0.05, y, x + s * 0.18, y - s * 0.32, x + s * 0.28, y], 0xbfe4ff, 1.2);
          break;
        case 'desert':
          if (rand() < 0.5) {
            rrectLite(o, x - s * 0.05, y - s * 0.55, s * 0.1, s * 0.55, 0x58a84a);
            rrectLite(o, x - s * 0.2, y - s * 0.38, s * 0.14, s * 0.07, 0x58a84a);
            rrectLite(o, x + s * 0.07, y - s * 0.3, s * 0.14, s * 0.07, 0x58a84a);
          } else house(o, x, y, s * 0.7, 0xb8803a, 0xe6c88a);
          break;
        case 'heaven':
          if (rand() < 0.4) pagodaHall(o, x, y, s * 0.5, s * 0.7, 2, PAL_GOLD);
          else if (rand() < 0.5) cloudBlob(o, x, y - s * 0.2, s * 0.5, 0xffffff, 0.9);
          else treeBall(o, x, y, s, [0xff9ac0, 0xffb8d8, 0xe878a0]);
          break;
        case 'volcano':
          if (rand() < 0.4) o.poly([x - s * 0.3, y, x - s * 0.05, y - s * 0.7, x + s * 0.3, y]).fill(0x3a2420).stroke({ width: 1.2, color: 0x1a0a08 });
          o.moveTo(x, y).lineTo(x + (rand() - 0.5) * s, y - s * 0.3).lineTo(x + (rand() - 0.5) * s * 1.4, y - s * 0.5).stroke({ width: 1.8, color: 0xff6a20, alpha: 0.9 });
          break;
        case 'night':
          treeBall(o, x, y, s, [0xc84a2a, 0xe8702a, 0xa83020]);
          break;
        case 'throne':
          if (rand() < 0.4) {
            o.poly([x - s * 0.1, y, x - s * 0.06, y - s * 0.9, x, y - s * 1.2, x + s * 0.06, y - s * 0.9, x + s * 0.1, y]).fill(0x3a2450).stroke({ width: 1.2, color: 0x1a1022 });
            o.rect(x - 1, y - s * 0.5, 2, 3).fill(0xff9a4a);
          } else {
            o.moveTo(x, y).lineTo(x + (rand() - 0.5) * s, y - s * 0.4).lineTo(x + (rand() - 0.5) * s * 1.4, y - s * 0.7).stroke({ width: 1.6, color: 0xff6a3a, alpha: 0.85 });
          }
          break;
      }
      void col;
    }
  });

  // dãy núi đá viền quanh bản đồ
  const edge = (x: number, y: number, hh: number, i: number) => {
    karst(o, x, y, hh * 0.55, hh, mix(0x7fa89a, 0xdcecff, 0.25), 0xdcecff, rand, { trees: true, waterfall: i % 3 === 0 });
  };
  for (let i = 0; i < Math.round(w / 120); i++) edge(((i + rand() * 0.8) / Math.round(w / 120)) * w, h * (0.12 + rand() * 0.08), m * (0.22 + rand() * 0.18), i);
  for (let i = 0; i < 4; i++) {
    edge(w * (0.02 + rand() * 0.06), h * (0.55 + i * 0.12), m * (0.18 + rand() * 0.12), i + 1);
    edge(w * (0.94 + rand() * 0.05), h * (0.5 + i * 0.12), m * (0.18 + rand() * 0.12), i + 2);
  }

  // thành xuất phát (xanh) & thành địch (đỏ/tím)
  const [sx, sy] = P(spec.start);
  const [ex, ey] = P(spec.end);
  for (let i = 0; i < 3; i++) {
    pagodaHall(o, sx + (i - 1) * m * 0.075, sy + m * 0.03 - (i === 1 ? m * 0.012 : 0), m * 0.08, m * 0.1, i === 1 ? 3 : 2, PAL_BLUE);
  }
  rrect(o, sx - m * 0.13, sy + m * 0.03, m * 0.26, m * 0.03, 2, 0xb8b0a8);
  for (let i = 0; i < 3; i++) {
    const fx = sx + (i - 1) * m * 0.1;
    o.rect(fx - 1, sy - m * 0.12, 2, m * 0.09).fill(0x4a3426);
    poly(o, [fx, sy - m * 0.12, fx + m * 0.04, sy - m * 0.105, fx, sy - m * 0.09], 0x3d8bff, 1);
  }
  const lastTheme = spec.themes[spec.themes.length - 1];
  const endPal = lastTheme === 'heaven' ? PAL_GOLD : lastTheme === 'throne' || lastTheme === 'night' || lastTheme === 'volcano' ? PAL_DARK : PAL_WARM;
  palace(o, ex, ey + m * 0.07, m * 0.3, endPal);

  // đường đi vẽ trên cùng của mặt đất
  const stroke = road();
  stroke(m * 0.026, 0x5a3c1c, 0.9);
  stroke(m * 0.019, 0xf2dfae, 1);
  stroke(m * 0.004, 0xffffff, 0.5);

  // mây sương ở rìa + vignette
  const cl = g();
  for (let i = 0; i < Math.round(w / 160); i++) {
    const x = rand() * w;
    const edgeY = rand() < 0.5 ? h * (0.02 + rand() * 0.1) : h * (0.88 + rand() * 0.1);
    cloudBlob(cl, x, edgeY, m * (0.06 + rand() * 0.05), 0xffffff, 0.85);
  }
  for (let i = 0; i < 6; i++) {
    const leftSide = rand() < 0.5;
    cloudBlob(cl, leftSide ? rand() * w * 0.12 : w * (0.88 + rand() * 0.12), h * (0.2 + rand() * 0.7), m * (0.07 + rand() * 0.06), 0xffffff, 0.8);
  }
  root.addChild(cl);
  const vg = g();
  vg.rect(0, 0, w, h).fill(hgrad({ c: INK, a: 0.35 }, { c: INK, a: 0 }, { c: INK, a: 0 }, { c: INK, a: 0.35 }));
  vg.rect(0, h * 0.85, w, h * 0.15).fill(vgradA({ c: INK, a: 0 }, { c: INK, a: 0.35 }));
  root.addChild(vg);
  void ball;
  void darker;

  const url = await app.renderer.extract.base64({ target: root, frame: new Rectangle(0, 0, w, h), resolution: Math.min(2, window.devicePixelRatio || 1) });
  root.destroy({ children: true });
  cache.set(key, url);
  return url;
}

function rrectLite(o: import('pixi.js').Graphics, x: number, y: number, w: number, h: number, c: number) {
  o.roundRect(x, y, w, h, Math.min(w, h) / 2).fill(c).stroke({ width: 1.2, color: darker(c, 0.6) });
}
