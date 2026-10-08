import { Container, Graphics } from 'pixi.js';
import { INK, ball, darker, g, lighter, mix, poly, rrect } from './draw';
import type { ExtraArt } from './extraArt';

// Quái thú (địch) và thú cưng (ta): thú bốn chân tham số hóa + rắn + rồng (vẽ bằng code, cel-shading)

const GOLD = 0xffd34d;
const lineSafe = (c: number) => mix(c, INK, 0.74);

interface Quad {
  fur: number;
  belly?: number;
  stripe?: number;
  /** kích thước thân (bán kính) */
  len: number;
  legH: number;
  ear: 'point' | 'round';
  snout: number;
  headR: number;
  tail: 'long' | 'short' | 'curl';
  eye?: number;
  tusk?: boolean;
  horn?: 'rhino' | 'qilin' | 'dragon';
  mane?: number;
  wings?: number;
  panda?: boolean;
  bristles?: number;
  /** khăn / yên theo màu phe */
  scarf?: boolean;
  /** tần số bước chân (to/chậm vs nhỏ/nhanh) */
  gait: number;
}

const STYLE: Record<string, Quad> = {
  // ── quái thú (địch)
  soihoang: { fur: 0x858a96, belly: 0xc9ced6, len: 15, legH: 12, ear: 'point', snout: 11, headR: 8, tail: 'long', eye: 0xffd34d, gait: 15 },
  lonrung: { fur: 0x6a4a35, belly: 0x8a6a50, len: 17, legH: 9, ear: 'round', snout: 8, headR: 9, tail: 'curl', tusk: true, bristles: 0x2e1c12, gait: 11 },
  gauden: { fur: 0x34302f, belly: 0x544c4a, len: 21, legH: 11, ear: 'round', snout: 7, headR: 11.5, tail: 'short', gait: 8 },
  hocnui: { fur: 0xe8923a, belly: 0xf6e6c8, stripe: 0x2a1a10, len: 18, legH: 12, ear: 'round', snout: 8, headR: 10, tail: 'long', eye: 0xffe066, gait: 12 },
  baoden: { fur: 0x2c2c3a, belly: 0x40405a, len: 15, legH: 12, ear: 'point', snout: 8, headR: 8.5, tail: 'long', eye: 0xb6ff5a, gait: 16 },
  tegiac: { fur: 0x8c8c98, belly: 0xa8a8b4, len: 23, legH: 10, ear: 'round', snout: 6, headR: 11, tail: 'short', horn: 'rhino', gait: 7 },
  honglong: { fur: 0xc8402a, belly: 0xf0b45a, len: 17, legH: 10, ear: 'point', snout: 9, headR: 9.5, tail: 'long', eye: 0xffe066, horn: 'dragon', wings: 0x8a2a1a, gait: 9 },
  culong: { fur: 0x5a2a6a, belly: 0xe89a4a, len: 26, legH: 12, ear: 'point', snout: 11, headR: 12, tail: 'long', eye: 0xffe066, horn: 'dragon', wings: 0x8a2a5a, gait: 7 },
  longthan: { fur: 0xe8b830, belly: 0xfff0b0, len: 20, legH: 11, ear: 'point', snout: 10, headR: 11, tail: 'long', eye: 0x58e8ff, horn: 'dragon', wings: 0x3ec6a4, mane: 0xffffff, gait: 9 },
  // ── thú cưng (ta): dễ thương hơn, có khăn theo màu phe
  silverwolf: { fur: 0xdfe6f2, belly: 0xffffff, len: 13, legH: 11, ear: 'point', snout: 9, headR: 8.5, tail: 'long', eye: 0x58b8ff, scarf: true, gait: 16 },
  panda: { fur: 0xf6f6f4, len: 18, legH: 10, ear: 'round', snout: 6, headR: 11, tail: 'short', panda: true, scarf: true, gait: 8 },
  tigercub: { fur: 0xf2a24a, belly: 0xfff0d0, stripe: 0x3a2412, len: 13, legH: 10, ear: 'round', snout: 7, headR: 9.5, tail: 'long', eye: 0xffe066, scarf: true, gait: 14 },
  babydragon: { fur: 0x3ec6a4, belly: 0xffe8a0, len: 14, legH: 9, ear: 'point', snout: 8, headR: 9.5, tail: 'long', eye: 0xffe066, horn: 'dragon', wings: 0xffd34d, scarf: true, gait: 11 },
  qilin: { fur: 0xc8f0dc, belly: 0xffffff, len: 15, legH: 14, ear: 'point', snout: 8, headR: 8.5, tail: 'long', eye: 0xff9acb, horn: 'qilin', mane: GOLD, scarf: true, gait: 12 },
};

export const hasBeastArt = (id: string) => id in STYLE || id === 'mangxa' || id === 'jadesnake' || id === 'cumang';

/** thú bốn chân, quay mặt sang phải */
export function buildBeast(id: string, accent: number): ExtraArt {
  if (id === 'mangxa') return buildSnake(0x4a8a3a, 0xd8e8a0, accent, false);
  if (id === 'cumang') return buildSnake(0x2e5a3c, 0xcfe39a, accent, false);
  if (id === 'jadesnake') return buildSnake(0x38c4a0, 0xf4ffe0, accent, true);
  const s = STYLE[id];
  const body = new Container();
  const { fur, len, legH } = s;
  const legC = s.panda ? 0x2a2a30 : darker(fur, 0.12);
  const belly = s.belly ?? lighter(fur, 0.3);
  const legs: Graphics[] = [];
  const mk = (x: number) => {
    const l = g();
    const w = Math.max(4.2, len * 0.3);
    rrect(l, -w / 2, 0, w, legH + 2, 2, legC);
    rrect(l, -w / 2 - 0.4, legH - 2, w + 0.8, 4.4, 1.6, darker(legC, 0.22));
    l.position.set(x, -legH);
    legs.push(l);
    return l;
  };
  const tx = len * 0.62;
  body.addChild(mk(-tx * 0.9), mk(tx * 0.4));
  const torso = g();
  const cy = -legH - len * 0.62;
  // đuôi
  const tail = new Container();
  const tg = g();
  if (s.tail === 'long') {
    tg.moveTo(0, 0).quadraticCurveTo(-len * 0.7, -len * 0.5, -len * 0.45, -len * 0.95).stroke({ width: 5.2, color: lineSafe(fur), cap: 'round' });
    tg.moveTo(0, 0).quadraticCurveTo(-len * 0.7, -len * 0.5, -len * 0.45, -len * 0.95).stroke({ width: 3.2, color: s.stripe ? fur : darker(fur, 0.05), cap: 'round' });
    if (s.stripe) tg.circle(-len * 0.45, -len * 0.95, 2.3).fill(s.stripe);
    if (s.wings) tg.poly([-len * 0.45, -len * 0.95, -len * 0.7, -len * 1.2, -len * 0.3, -len * 1.2]).fill(GOLD);
  } else if (s.tail === 'curl') {
    tg.moveTo(0, 0).quadraticCurveTo(-8, -4, -5, -10).stroke({ width: 3, color: fur, cap: 'round' });
  } else {
    ball(tg, -2, -2, 4.2, fur, 3.8);
  }
  tail.addChild(tg);
  tail.position.set(-len * 0.92, cy - len * 0.1);
  torso.addChild(tail);
  // cánh (rồng)
  let wing: Graphics | null = null;
  if (s.wings) {
    wing = g();
    poly(wing, [0, 0, -len * 0.5, -len * 1.05, len * 0.1, -len * 0.7, len * 0.45, -len * 1.1, len * 0.55, -len * 0.1], s.wings, 1.3);
    wing.position.set(-len * 0.1, cy - len * 0.55);
    torso.addChild(wing);
  }
  ball(torso, 0, cy, len, fur, len * 0.74);
  ball(torso, 0, cy + len * 0.36, len * 0.78, belly, len * 0.3);
  if (s.stripe) {
    for (let i = -2; i <= 2; i++) {
      torso.poly([i * len * 0.3 - 1.6, cy - len * 0.7, i * len * 0.3 + 1.6, cy - len * 0.7, i * len * 0.3 + 0.6, cy - len * 0.1, i * len * 0.3 - 0.8, cy - len * 0.1]).fill(s.stripe);
    }
  }
  if (s.panda) {
    ball(torso, len * 0.55, cy, len * 0.3, 0x2a2a30, len * 0.62); // dải vai đen
  }
  if (s.bristles) {
    for (let i = 0; i < 6; i++) torso.poly([-len * 0.7 + i * len * 0.27, cy - len * 0.72, -len * 0.6 + i * len * 0.27, cy - len * 1.05, -len * 0.5 + i * len * 0.27, cy - len * 0.72]).fill(s.bristles);
  }
  if (s.mane) {
    for (let i = 0; i < 5; i++) torso.poly([len * 0.1 + i * 3, cy - len * 0.7, len * 0.3 + i * 3, cy - len * 1.15, len * 0.45 + i * 3, cy - len * 0.65]).fill(s.mane);
  }
  if (s.scarf) poly(torso, [len * 0.35, cy - len * 0.7, len * 0.7, cy - len * 0.55, len * 0.65, cy - len * 0.2, len * 0.3, cy - len * 0.35], accent, 1.2);
  body.addChild(torso);
  body.addChild(mk(-tx * 0.4), mk(tx * 0.95));

  // đầu
  const head = new Container();
  const hg = g();
  const r = s.headR;
  if (s.ear === 'point') {
    poly(hg, [-r * 0.7, -r * 0.4, -r * 0.9, -r * 1.7, -r * 0.1, -r * 0.95], fur, 1.2);
    poly(hg, [r * 0.1, -r * 0.8, r * 0.1, -r * 1.7, r * 0.7, -r * 0.7], fur, 1.2);
  } else {
    ball(hg, -r * 0.5, -r * 0.8, r * 0.38, s.panda ? 0x2a2a30 : darker(fur, 0.1), r * 0.38);
    ball(hg, r * 0.5, -r * 0.8, r * 0.38, s.panda ? 0x2a2a30 : darker(fur, 0.1), r * 0.38);
  }
  if (s.horn === 'rhino') poly(hg, [r * 0.7 + s.snout * 0.55, -r * 0.1, r * 0.7 + s.snout * 0.95, -r * 1.5, r * 0.7 + s.snout * 0.95 + 3, -r * 0.05], 0xece6d2, 1.2);
  if (s.horn === 'qilin') poly(hg, [-r * 0.1, -r * 0.8, r * 0.1, -r * 2.2, r * 0.45, -r * 0.8], GOLD, 1.2);
  if (s.horn === 'dragon') {
    poly(hg, [-r * 0.7, -r * 0.6, -r * 1.3, -r * 1.7, -r * 0.2, -r * 0.9], 0xf6e6c0, 1.2);
    poly(hg, [-r * 0.1, -r * 0.8, -r * 0.4, -r * 1.9, r * 0.4, -r * 0.8], 0xf6e6c0, 1.2);
  }
  ball(hg, 0, 0, r, fur, r * 0.92);
  // mõm
  ball(hg, r * 0.7 + s.snout * 0.35, r * 0.28, s.snout * 0.62, s.panda ? 0xf6f6f4 : lighter(fur, 0.16), r * 0.5);
  ball(hg, r * 0.7 + s.snout * 0.82, r * 0.12, 1.9, 0x1a1a22);
  if (s.tusk) {
    poly(hg, [r * 0.7 + s.snout * 0.4, r * 0.5, r * 0.7 + s.snout * 0.7, r * 1.3, r * 0.7 + s.snout * 0.8, r * 0.5], 0xf6f0dc, 1);
  }
  if (s.panda) {
    ball(hg, r * 0.25, -r * 0.1, r * 0.34, 0x2a2a30, r * 0.46);
  }
  hg.circle(r * 0.32, -r * 0.18, Math.max(1.5, r * 0.18)).fill(s.eye ?? 0x14141a);
  if (s.eye) hg.circle(r * 0.32, -r * 0.18, Math.max(0.8, r * 0.09)).fill(0x14141a);
  hg.circle(r * 0.36, -r * 0.24, 0.7).fill(0xffffff);
  head.addChild(hg);
  head.position.set(len * 0.9, cy - len * 0.34);
  body.addChild(head);

  const headX = head.x;
  return {
    body,
    height: legH + len * 1.7 + r * 0.8,
    tick(clock, moving, atk) {
      const w = moving ? Math.sin(clock * s.gait) : 0;
      legs.forEach((l, i) => (l.rotation = w * 0.75 * (i % 2 ? 1 : -1)));
      body.y = moving ? -Math.abs(w) * Math.max(1.2, len * 0.1) : Math.sin(clock * 2.6) * 0.5;
      head.rotation = atk > 0 ? Math.sin(atk * Math.PI) * 0.5 : Math.sin(clock * 2) * 0.05;
      head.x = headX + (atk > 0 ? Math.sin(atk * Math.PI) * 6 : 0);
      tail.rotation = Math.sin(clock * (moving ? 9 : 3)) * 0.3;
      if (wing) wing.rotation = Math.sin(clock * (moving ? 7 : 3)) * 0.22 - 0.05;
    },
  };
}

/** rắn: thân uốn lượn nhiều đốt, ngóc đầu lên khi tấn công */
function buildSnake(skin: number, belly: number, accent: number, pet: boolean): ExtraArt {
  const body = new Container();
  const N = 9;
  const segs: Graphics[] = [];
  const baseR = pet ? 6.6 : 7.6;
  for (let i = N - 1; i >= 0; i--) {
    const sg = g();
    const r = baseR * (0.55 + 0.45 * (1 - i / N));
    ball(sg, 0, 0, r, i % 2 ? darker(skin, 0.08) : skin, r);
    ball(sg, 0, r * 0.35, r * 0.7, belly, r * 0.35);
    if (i % 2 === 0) sg.circle(0, -r * 0.25, 1.2).fill(darker(skin, 0.35));
    segs.push(sg);
    body.addChild(sg);
  }
  const head = new Container();
  const hg = g();
  ball(hg, 0, 0, baseR * 1.15, skin, baseR * 0.95);
  poly(hg, [baseR * 0.6, -baseR * 0.2, baseR * 1.8, baseR * 0.1, baseR * 0.6, baseR * 0.55], lighter(skin, 0.12), 1.1);
  hg.circle(baseR * 0.45, -baseR * 0.35, 1.7).fill(pet ? 0xffd34d : 0xffe066);
  hg.circle(baseR * 0.5, -baseR * 0.35, 0.8).fill(0x14141a);
  // lưỡi
  hg.moveTo(baseR * 1.7, baseR * 0.15).lineTo(baseR * 2.5, baseR * 0.15).stroke({ width: 1, color: 0xe03a4a });
  if (pet) poly(hg, [-baseR * 0.2, baseR * 0.55, baseR * 0.4, baseR * 0.55, baseR * 0.2, baseR * 1.2], accent, 1); // khăn
  head.addChild(hg);
  body.addChild(head);
  const placeAll = (clock: number, moving: boolean, atk: number) => {
    const amp = moving ? 4.2 : 2;
    const raise = atk > 0 ? Math.sin(atk * Math.PI) : 0;
    for (let i = 0; i < N; i++) {
      const s = segs[N - 1 - i];
      const t = i / (N - 1);
      s.x = -t * 46 + 8;
      const neck = i < 4 ? (4 - i) * 4.6 * (0.7 + raise * 0.6) : 0;
      s.y = -baseR - 1 + Math.sin(clock * (moving ? 7 : 3) + i * 0.9) * amp * (0.4 + t) - neck;
    }
    head.position.set(segs[N - 1].x + 7, segs[N - 1].y - 3 - raise * 4);
    head.rotation = -0.18 - raise * 0.4;
  };
  placeAll(0, false, 0);
  return { body, height: 44, tick: placeAll };
}
