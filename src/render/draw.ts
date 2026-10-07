import { FillGradient, Graphics } from 'pixi.js';

// Bộ hàm vẽ phong cách "cel-shading" dùng chung cho nhân vật và bối cảnh:
// viền đậm theo màu gốc, dải bóng cứng + vệt sáng, điểm sáng nhỏ.

export const INK = 0x120a1c;
export const LW = 1.5;

export const mix = (a: number, b: number, t: number) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};
export const lineOf = (c: number) => mix(c, INK, 0.74);
export const darker = (c: number, t = 0.3) => mix(c, INK, t);
export const lighter = (c: number, t = 0.3) => mix(c, 0xffffff, t);

export const g = () => new Graphics();
export const outline = (o: Graphics, c: number, w = LW) => o.stroke({ width: w, color: lineOf(c), join: 'round', cap: 'round' });

/** đa giác có viền */
export function poly(o: Graphics, pts: number[], c: number, w = LW) {
  o.poly(pts).fill(c);
  outline(o, c, w);
  return o;
}

/** hình chữ nhật bo góc: viền + dải bóng dưới + vệt sáng bên trái */
export function rrect(o: Graphics, x: number, y: number, w: number, h: number, r: number, c: number) {
  o.roundRect(x, y, w, h, r).fill(c);
  outline(o, c);
  if (h > 5 && w > 4) {
    o.roundRect(x + 0.8, y + h * 0.6, w - 1.6, h * 0.4 - 0.8, Math.min(r, 3)).fill({ color: INK, alpha: 0.22 });
    o.roundRect(x + 1.5, y + 1.5, Math.max(1.2, w * 0.18), h * 0.46, 1).fill({ color: 0xffffff, alpha: 0.3 });
  }
  return o;
}

/** quả cầu/elip tô bóng kiểu trăng khuyết + điểm sáng */
export function ball(o: Graphics, cx: number, cy: number, rx: number, c: number, ry = rx) {
  o.ellipse(cx, cy, rx, ry).fill(darker(c, 0.3));
  outline(o, c);
  o.ellipse(cx - rx * 0.1, cy - ry * 0.12, rx * 0.88, ry * 0.88).fill(c);
  o.ellipse(cx - rx * 0.38, cy - ry * 0.44, rx * 0.22, ry * 0.14).fill({ color: 0xffffff, alpha: 0.5 });
  return o;
}

/** nửa vòm (mũ/mũ trùm) */
export function dome(o: Graphics, cx: number, cy: number, r: number, c: number) {
  o.moveTo(cx - r, cy).arc(cx, cy, r, Math.PI, 0).closePath().fill(c);
  outline(o, c);
  o.rect(cx - r + 1, cy - 3, 2 * r - 2, 3).fill({ color: INK, alpha: 0.2 });
  o.moveTo(cx - r * 0.78, cy - r * 0.35).arc(cx, cy, r * 0.82, Math.PI * 1.12, Math.PI * 1.5).stroke({ width: 1.8, color: 0xffffff, alpha: 0.4, cap: 'round' });
  return o;
}

/** chi (cánh tay/chân) dạng viên thuốc có viền */
export function limb(o: Graphics, x1: number, y1: number, x2: number, y2: number, w: number, c: number) {
  o.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: w + LW * 1.7, color: lineOf(c), cap: 'round' });
  o.moveTo(x1, y1).lineTo(x2, y2).stroke({ width: w, color: c, cap: 'round' });
  o.moveTo(x1 - 0.8, y1 - 0.3).lineTo(x2 - 0.8, y2 - 0.3).stroke({ width: w * 0.28, color: 0xffffff, alpha: 0.22, cap: 'round' });
  return o;
}

const css = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

/** gradient dọc (theo hệ tọa độ cục bộ của hình) */
export function vgrad(...stops: number[]): FillGradient {
  return new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: stops.map((c, i) => ({ offset: stops.length === 1 ? 0 : i / (stops.length - 1), color: css(c) })),
    textureSpace: 'local',
  });
}

/** gradient ngang */
export function hgrad(...stops: { c: number; a: number }[]): FillGradient {
  const rgba = (c: number, a: number) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
  return new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
    colorStops: stops.map((s, i) => ({ offset: i / (stops.length - 1), color: rgba(s.c, s.a) })),
    textureSpace: 'local',
  });
}

/** bộ sinh số ngẫu nhiên có seed (để cảnh giống nhau mỗi lần dựng) */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t0 = a;
    t0 = Math.imul(t0 ^ (t0 >>> 15), t0 | 1);
    t0 ^= t0 + Math.imul(t0 ^ (t0 >>> 7), t0 | 61);
    return ((t0 ^ (t0 >>> 14)) >>> 0) / 4294967296;
  };
}

const rgbaCss = (c: number, a: number) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

/** gradient dọc có alpha từng điểm dừng */
export function vgradA(...stops: { c: number; a: number }[]): FillGradient {
  return new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: stops.map((s, i) => ({ offset: stops.length === 1 ? 0 : i / (stops.length - 1), color: rgbaCss(s.c, s.a) })),
    textureSpace: 'local',
  });
}
