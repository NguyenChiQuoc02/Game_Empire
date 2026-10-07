import type { Graphics } from 'pixi.js';
import { INK, ball, darker, lighter, mix, outline, poly, rrect, vgrad, vgradA } from './draw';

// Địa danh vẽ bằng code (dùng chung cho chiến trường và bản đồ chiến dịch)

export interface Palette {
  roof: number;
  wall: number;
  pillar: number;
  fog: number;
}

export const PAL_BLUE: Palette = { roof: 0x3e6a86, wall: 0xf1e6cc, pillar: 0xc03a30, fog: 0xdcecff };
export const PAL_WARM: Palette = { roof: 0x8a4a3a, wall: 0xf0dcc0, pillar: 0xb8342a, fog: 0xffe0b8 };
export const PAL_GOLD: Palette = { roof: 0xd9a63a, wall: 0xfff0d0, pillar: 0xc8402a, fog: 0xfff0ff };
export const PAL_DARK: Palette = { roof: 0x3a2a4a, wall: 0x8a7a92, pillar: 0x8a2a3a, fog: 0x8a2c52 };

/** mái chùa cong vút hai đầu */
export function roof(o: Graphics, cx: number, y: number, rw: number, rh: number, col: number) {
  const pts = [
    cx - rw - 9, y - 6, cx - rw + 3, y + 1.5, cx + rw - 3, y + 1.5, cx + rw + 9, y - 6,
    cx + rw * 0.55, y - rh * 0.5, cx + rw * 0.2, y - rh * 0.92, cx, y - rh, cx - rw * 0.2, y - rh * 0.92, cx - rw * 0.55, y - rh * 0.5,
  ];
  poly(o, pts, col, 1.3);
  o.poly([cx - rw * 0.55, y - rh * 0.5, cx, y - rh, cx + rw * 0.1, y - rh * 0.7, cx - rw * 0.3, y - rh * 0.32]).fill({ color: 0xffffff, alpha: 0.14 });
  for (let i = 1; i <= 3; i++) {
    const k = i / 4;
    o.moveTo(cx - rw * (1 - k * 0.4), y - rh * k * 0.62).lineTo(cx + rw * (1 - k * 0.4), y - rh * k * 0.62).stroke({ width: 0.9, color: darker(col, 0.5), alpha: 0.4 });
  }
  o.moveTo(cx - rw * 0.55, y - rh * 0.5).lineTo(cx, y - rh).lineTo(cx + rw * 0.55, y - rh * 0.5).stroke({ width: 1.5, color: lighter(col, 0.5), alpha: 0.85 });
  ball(o, cx, y - rh - 2, 2.2, 0xffd34d);
}

/** một tầng chùa: thân tường + cột đỏ + mái */
export function pagodaHall(o: Graphics, cx: number, baseY: number, w: number, h: number, tiers: number, pal: Palette) {
  const th = h / tiers;
  for (let t = 0; t < tiers; t++) {
    const k = 1 - t * 0.2;
    const ww = w * k;
    const yb = baseY - t * th;
    const wallH = th * 0.5;
    rrect(o, cx - ww / 2, yb - wallH, ww, wallH, 1.5, pal.wall);
    for (const px of [-0.46, -0.16, 0.16, 0.46]) o.rect(cx + ww * px - 1.3, yb - wallH, 2.6, wallH).fill(pal.pillar);
    o.rect(cx - ww * 0.1, yb - wallH * 0.85, ww * 0.2, wallH * 0.7).fill({ color: INK, alpha: 0.45 });
    roof(o, cx, yb - wallH, ww * 0.62, th * 0.62, pal.roof);
  }
}

/** quần thể cung điện: nền bậc thang + tường thành + điện chính + hai điện phụ + cờ */
export function palace(o: Graphics, cx: number, baseY: number, s: number, pal: Palette) {
  const stone = mix(0xb8b0a8, pal.fog, 0.2);
  // nền bậc
  for (let i = 0; i < 3; i++) rrect(o, cx - s * (0.62 - i * 0.07), baseY - s * 0.08 * (i + 1), s * (1.24 - i * 0.14), s * 0.08, 1.5, mix(stone, 0xffffff, i * 0.08));
  // tường thành
  const wy = baseY - s * 0.3;
  rrect(o, cx - s * 0.75, wy, s * 1.5, s * 0.22, 2, stone);
  for (let k = 0; k < 14; k++) rrect(o, cx - s * 0.75 + (k * s * 1.5) / 14 + 1, wy - s * 0.045, (s * 1.5) / 14 - 2.5, s * 0.05, 1, stone);
  // điện phụ
  pagodaHall(o, cx - s * 0.46, wy, s * 0.4, s * 0.36, 2, pal);
  pagodaHall(o, cx + s * 0.46, wy, s * 0.4, s * 0.36, 2, pal);
  // điện chính
  pagodaHall(o, cx, baseY - s * 0.2, s * 0.62, s * 0.78, 3, pal);
  // cờ
  for (const dx of [-0.3, 0.3]) {
    o.rect(cx + s * dx - 0.9, baseY - s * 1.12, 1.8, s * 0.22).fill(0x4a3426);
    o.poly([cx + s * dx, baseY - s * 1.12, cx + s * dx + s * 0.12, baseY - s * 1.07, cx + s * dx, baseY - s * 1.02]).fill(0xd23a3a);
  }
}

/** núi đá vôi kiểu Quế Lâm: trụ cao, đỉnh tròn, cây phủ đỉnh, có thể có thác */
export function karst(
  o: Graphics, x: number, baseY: number, w: number, h: number, col: number, fog: number, rand: () => number,
  opt: { trees?: boolean; waterfall?: boolean; snow?: boolean } = {},
) {
  const top = lighter(col, 0.16);
  const bot = mix(col, fog, 0.55);
  o.moveTo(x - w / 2, baseY)
    .bezierCurveTo(x - w * 0.58, baseY - h * 0.5, x - w * 0.36, baseY - h * 0.96, x - w * 0.04, baseY - h)
    .bezierCurveTo(x + w * 0.3, baseY - h * 1.0, x + w * 0.54, baseY - h * 0.56, x + w / 2, baseY)
    .closePath()
    .fill(vgrad(top, bot));
  // mặt tối bên phải + vệt sáng bên trái
  o.moveTo(x + w * 0.08, baseY - h * 0.99)
    .bezierCurveTo(x + w * 0.4, baseY - h * 0.9, x + w * 0.56, baseY - h * 0.5, x + w / 2, baseY)
    .lineTo(x + w * 0.12, baseY)
    .bezierCurveTo(x + w * 0.3, baseY - h * 0.5, x + w * 0.22, baseY - h * 0.85, x + w * 0.08, baseY - h * 0.99)
    .fill({ color: INK, alpha: 0.16 });
  o.moveTo(x - w * 0.3, baseY - h * 0.2).bezierCurveTo(x - w * 0.42, baseY - h * 0.55, x - w * 0.26, baseY - h * 0.88, x - w * 0.12, baseY - h * 0.96).stroke({ width: Math.max(1.2, w * 0.03), color: 0xffffff, alpha: 0.2 });
  // vân đá dọc
  for (let i = 0; i < 4; i++) {
    const sx = x + (rand() - 0.5) * w * 0.7;
    o.moveTo(sx, baseY - h * (0.25 + rand() * 0.2)).lineTo(sx + (rand() - 0.5) * 4, baseY - h * (0.55 + rand() * 0.25)).stroke({ width: 1, color: darker(col, 0.5), alpha: 0.2 });
  }
  if (opt.snow) {
    o.moveTo(x - w * 0.22, baseY - h * 0.78).bezierCurveTo(x - w * 0.12, baseY - h * 0.99, x + w * 0.1, baseY - h * 1.0, x + w * 0.22, baseY - h * 0.78)
      .lineTo(x + w * 0.1, baseY - h * 0.8).lineTo(x, baseY - h * 0.72).lineTo(x - w * 0.1, baseY - h * 0.82).closePath().fill({ color: 0xffffff, alpha: 0.92 });
  }
  if (opt.trees !== false) {
    const n = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const tx = x - w * 0.22 + (i / n) * w * 0.44 + rand() * 4;
      const ty = baseY - h * (0.95 - Math.abs(i - n / 2) * 0.04) + 3;
      const r = Math.max(2.4, w * (0.05 + rand() * 0.03));
      o.circle(tx, ty, r).fill(mix(0x4f9a4a, col, 0.15 + rand() * 0.2));
      o.circle(tx - r * 0.3, ty - r * 0.3, r * 0.5).fill({ color: 0xffffff, alpha: 0.14 });
    }
  }
  if (opt.waterfall) {
    const wx = x + w * 0.1;
    o.rect(wx - 2, baseY - h * 0.55, 4, h * 0.55).fill(vgradA({ c: 0xffffff, a: 0.95 }, { c: 0xdff4ff, a: 0.55 }));
    o.ellipse(wx, baseY, w * 0.18, 4).fill({ color: 0xffffff, alpha: 0.45 });
  }
}

export function house(o: Graphics, x: number, y: number, s: number, roofCol: number, wall = 0xf2e4c8) {
  o.ellipse(x, y + 1, s * 0.62, s * 0.12).fill({ color: INK, alpha: 0.2 });
  rrect(o, x - s * 0.4, y - s * 0.36, s * 0.8, s * 0.36, 1.5, wall);
  o.rect(x - s * 0.08, y - s * 0.24, s * 0.16, s * 0.24).fill({ color: INK, alpha: 0.5 });
  poly(o, [x - s * 0.55, y - s * 0.34, x - s * 0.34, y - s * 0.7, x + s * 0.34, y - s * 0.7, x + s * 0.55, y - s * 0.34], roofCol, 1.2);
}

export function treeBall(o: Graphics, x: number, y: number, s: number, cols: [number, number, number], trunk = 0x80553a) {
  o.ellipse(x, y + 1, s * 0.3, s * 0.07).fill({ color: INK, alpha: 0.18 });
  rrect(o, x - s * 0.055, y - s * 0.34, s * 0.11, s * 0.34, 1.2, trunk);
  ball(o, x + s * 0.14, y - s * 0.52, s * 0.2, cols[2]);
  ball(o, x - s * 0.15, y - s * 0.5, s * 0.21, cols[1]);
  ball(o, x, y - s * 0.66, s * 0.27, cols[0]);
}

export function pine(o: Graphics, x: number, y: number, s: number, cols: [number, number, number], snow = false) {
  o.ellipse(x, y + 1, s * 0.26, s * 0.06).fill({ color: INK, alpha: 0.18 });
  rrect(o, x - s * 0.04, y - s * 0.2, s * 0.08, s * 0.2, 1, 0x6a4a30);
  for (let i = 0; i < 3; i++) {
    const w = s * (0.34 - i * 0.07);
    const yy = y - s * (0.16 + i * 0.22);
    poly(o, [x - w, yy, x, yy - s * 0.34, x + w, yy], i % 2 ? cols[1] : cols[0], 1.2);
    o.poly([x - w * 0.9, yy - 1, x, yy - s * 0.32, x - w * 0.25, yy - 1]).fill({ color: 0xffffff, alpha: snow ? 0.55 : 0.14 });
  }
}

export function cloudBlob(o: Graphics, cx: number, cy: number, s: number, color = 0xffffff, alpha = 0.92) {
  for (const [dx, dy, k] of [[-1.5, 0.2, 0.8], [-0.5, -0.35, 1.05], [0.7, -0.2, 0.95], [1.7, 0.2, 0.75], [0.1, 0.3, 1.2]] as const) {
    o.ellipse(cx + dx * s, cy + dy * s, s * k, s * k * 0.62).fill({ color, alpha });
  }
  o.ellipse(cx, cy + s * 0.5, s * 2.5, s * 0.34).fill({ color: mix(color, 0x9ab8e0, 0.4), alpha: alpha * 0.7 });
}

export function lantern(o: Graphics, x: number, y: number, s: number) {
  o.moveTo(x, y - s).lineTo(x, y).stroke({ width: 1, color: 0x3a2a22 });
  o.ellipse(x, y + s * 0.7, s * 0.55, s * 0.7).fill({ color: 0xff7a3d, alpha: 0.25 });
  ball(o, x, y + s * 0.6, s * 0.42, 0xd23a2a, s * 0.55);
  outline(o, 0xd23a2a);
}
