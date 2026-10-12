import { Container, Graphics } from 'pixi.js';
import { INK, ball, darker, g, lighter, mix, poly, rrect } from './draw';
import type { ExtraArt } from './extraArt';

// Quái thú (địch) và thú cưng (ta): thú bốn chân tham số hóa + chim + rắn + rồng (vẽ bằng code, cel-shading)

const GOLD = 0xffd34d;
const lineSafe = (c: number) => mix(c, INK, 0.74);

/** nét dày có viền (cổ, vòi, sừng, gạc...): path vẽ hai lần, viền đậm rồi màu chính */
const tube = (o: Graphics, path: (o: Graphics) => void, w: number, c: number) => {
  path(o);
  o.stroke({ width: w + 2.2, color: lineSafe(c), cap: 'round', join: 'round' });
  path(o);
  o.stroke({ width: w, color: c, cap: 'round', join: 'round' });
};

interface Quad {
  fur: number;
  belly?: number;
  stripe?: number;
  /** kích thước thân (bán kính) */
  len: number;
  legH: number;
  ear: 'point' | 'round' | 'long' | 'none';
  snout: number;
  headR: number;
  tail: 'long' | 'short' | 'curl';
  eye?: number;
  tusk?: boolean;
  horn?: 'rhino' | 'qilin' | 'dragon' | 'bull';
  /** màu sừng (mặc định ngà) */
  hornC?: number;
  /** bờm sư tử quanh đầu */
  lionMane?: number;
  /** gạc hươu */
  antlers?: number;
  /** đốm trên thân */
  spots?: number;
  /** mai rùa; snakeTail: đuôi là con rắn nhỏ (Huyền Vũ) */
  shell?: number;
  snakeTail?: number;
  /** vòi voi */
  trunk?: boolean;
  mane?: number;
  wings?: number;
  /** số đuôi (hồ ly) */
  tails?: number;
  /** bay: cánh lớn, đập liên tục, chân co lại */
  fly?: boolean;
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
  daitrung: { fur: 0xd88a30, belly: 0xf6e6c8, stripe: 0x2a1a10, len: 27, legH: 14, ear: 'round', snout: 11, headR: 14, tail: 'long', eye: 0xffe066, gait: 8 },
  holy: { fur: 0xf2a050, belly: 0xfff0dc, len: 13, legH: 11, ear: 'point', snout: 9, headR: 8.5, tail: 'long', eye: 0xff6ad0, tails: 3, gait: 15 },
  loithu: { fur: 0x4a5aa8, belly: 0xcfe0ff, stripe: 0xffe45a, len: 17, legH: 12, ear: 'point', snout: 9, headR: 10, tail: 'long', eye: 0xffee66, horn: 'qilin', mane: 0xffe45a, gait: 11 },
  soivuong: { fur: 0x4a4a58, belly: 0x8a8a98, len: 20, legH: 13, ear: 'point', snout: 12, headR: 10.5, tail: 'long', eye: 0xff3a3a, mane: 0xdfe6f2, gait: 12 },
  philong: { fur: 0xb8321e, belly: 0xffc860, len: 17, legH: 8, ear: 'point', snout: 10, headR: 10, tail: 'long', eye: 0xffe066, horn: 'dragon', wings: 0xe85a2a, fly: true, gait: 9 },
  cutuong: { fur: 0xdcdce6, belly: 0xffffff, len: 31, legH: 15, ear: 'round', snout: 8, headR: 14, tail: 'short', tusk: true, trunk: true, eye: 0xff9a3a, gait: 5 },
  cuquy: { fur: 0x3a8a5a, len: 28, legH: 9, ear: 'none', snout: 9, headR: 11, tail: 'short', shell: 0x2a5a3a, eye: 0xffe066, gait: 4 },
  cuhung: { fur: 0x4a3426, belly: 0x6a4e3a, len: 29, legH: 13, ear: 'round', snout: 8, headR: 14, tail: 'short', eye: 0xff5a3a, gait: 7 },
  culong: { fur: 0x5a2a6a, belly: 0xe89a4a, len: 26, legH: 12, ear: 'point', snout: 11, headR: 12, tail: 'long', eye: 0xffe066, horn: 'dragon', wings: 0x8a2a5a, gait: 7 },
  longthan: { fur: 0xe8b830, belly: 0xfff0b0, len: 20, legH: 11, ear: 'point', snout: 10, headR: 11, tail: 'long', eye: 0x58e8ff, horn: 'dragon', wings: 0x3ec6a4, mane: 0xffffff, gait: 9 },
  // ── quái thú đợt mới
  hacphong: { fur: 0x2a2630, belly: 0x4a4250, len: 22, legH: 11, ear: 'round', snout: 7, headR: 12, tail: 'short', eye: 0xff5a3a, gait: 8 },
  hoangphong: { fur: 0xe8c040, belly: 0xfff0b0, len: 14, legH: 10, ear: 'point', snout: 9, headR: 8.5, tail: 'long', eye: 0xff5a3a, mane: 0xffe9a0, gait: 15 },
  tuongtinh: { fur: 0xe8e8ee, belly: 0xffffff, len: 28, legH: 14, ear: 'round', snout: 8, headR: 13, tail: 'short', tusk: true, trunk: true, gait: 6 },
  sudavuong: { fur: 0xc8943a, belly: 0xf0d89a, len: 21, legH: 13, ear: 'round', snout: 8, headR: 11, tail: 'long', eye: 0xff6a2a, lionMane: 0x8a4a1a, gait: 9 },
  thanhnguu: { fur: 0x3a8a8a, belly: 0x7ac0c0, len: 24, legH: 12, ear: 'round', snout: 7, headR: 12, tail: 'short', horn: 'bull', eye: 0xffe066, gait: 7 },
  cuuvi: { fur: 0xfff0e0, belly: 0xffffff, len: 15, legH: 12, ear: 'point', snout: 9, headR: 9, tail: 'long', eye: 0xff6ad0, tails: 9, gait: 14 },
  langyeu: { fur: 0x4a4a62, belly: 0x8a8aa8, len: 17, legH: 13, ear: 'point', snout: 12, headR: 9.5, tail: 'long', eye: 0xc06aff, gait: 13 },
  macau: { fur: 0x1c1a22, belly: 0x3a2a30, stripe: 0xc02a2a, len: 17, legH: 12, ear: 'point', snout: 10, headR: 10, tail: 'long', eye: 0xff7a1a, gait: 15 },
  hotinh: { fur: 0xf0e0c0, belly: 0xffffff, stripe: 0x2a2a30, len: 20, legH: 13, ear: 'round', snout: 8, headR: 10.5, tail: 'long', eye: 0xffe066, gait: 12 },
  // ── thú cưng đợt mới
  bachlongma: { fur: 0xf8f8ff, belly: 0xffffff, len: 19, legH: 17, ear: 'point', snout: 12, headR: 8.5, tail: 'long', eye: 0x58b8ff, horn: 'dragon', mane: 0xbfe8ff, scarf: true, gait: 12 },
  khivang: { fur: 0xe8b030, belly: 0xffe8a0, len: 11, legH: 9, ear: 'round', snout: 6, headR: 8, tail: 'long', eye: 0x2a1a10, scarf: true, gait: 16 },
  tieuho: { fur: 0xfff4ec, belly: 0xffffff, len: 12, legH: 10, ear: 'point', snout: 8, headR: 8.5, tail: 'long', eye: 0xff6ad0, tails: 3, scarf: true, gait: 15 },
  tuyetlinh: { fur: 0xdde8f4, belly: 0xffffff, stripe: 0x4a5a78, len: 15, legH: 11, ear: 'round', snout: 7, headR: 9, tail: 'long', eye: 0x58d8ff, scarf: true, gait: 14 },
  linhquy: { fur: 0x3a9a6a, len: 16, legH: 7, ear: 'none', snout: 7, headR: 7.5, tail: 'short', shell: 0x2a7a52, eye: 0xffe066, scarf: true, gait: 6 },
  trauvang: { fur: 0xe8b83a, belly: 0xf8e0a0, len: 19, legH: 11, ear: 'round', snout: 7, headR: 10, tail: 'short', horn: 'bull', hornC: 0xf8f0d8, scarf: true, gait: 9 },
  bachtho: { fur: 0xffffff, belly: 0xf4f4f8, len: 11, legH: 9, ear: 'long', snout: 6, headR: 8, tail: 'short', eye: 0xff5a7a, scarf: true, gait: 16 },
  thienkhuyen: { fur: 0xf4f4f8, belly: 0xffffff, stripe: 0x6aa8d8, len: 13, legH: 11, ear: 'point', snout: 9, headR: 8.5, tail: 'long', eye: 0xffd34d, scarf: true, gait: 17 },
  langnho: { fur: 0x9ab4d0, belly: 0xe8f0f8, len: 12, legH: 10, ear: 'point', snout: 9, headR: 8, tail: 'long', eye: 0xffe066, scarf: true, gait: 17 },
  gaumat: { fur: 0x8a5a30, belly: 0xc8a070, len: 17, legH: 10, ear: 'round', snout: 6, headR: 10.5, tail: 'short', scarf: true, gait: 9 },
  thanloc: { fur: 0xc8905a, belly: 0xf8e8c8, spots: 0xffffff, len: 15, legH: 16, ear: 'point', snout: 9, headR: 8, tail: 'short', antlers: 0xe8c070, eye: 0x3a2412, scarf: true, gait: 11 },
  kylanlua: { fur: 0xd8402a, belly: 0xffc070, len: 16, legH: 14, ear: 'point', snout: 8, headR: 9, tail: 'long', eye: 0xffe066, horn: 'qilin', mane: GOLD, scarf: true, gait: 12 },
  huyenvu: { fur: 0x2a3a4a, len: 17, legH: 7, ear: 'none', snout: 7, headR: 8, tail: 'short', shell: 0x1c2a3a, snakeTail: 0x4ac8a0, eye: 0xffe066, scarf: true, gait: 6 },
  thanhlongnon: { fur: 0x3a9ae0, belly: 0xc8f0ff, len: 14, legH: 9, ear: 'point', snout: 8, headR: 9.5, tail: 'long', eye: 0xffe066, horn: 'dragon', wings: 0x8ad8ff, scarf: true, gait: 11 },
  // ── thú cưng (ta): dễ thương hơn, có khăn theo màu phe
  silverwolf: { fur: 0xdfe6f2, belly: 0xffffff, len: 13, legH: 11, ear: 'point', snout: 9, headR: 8.5, tail: 'long', eye: 0x58b8ff, scarf: true, gait: 16 },
  panda: { fur: 0xf6f6f4, len: 18, legH: 10, ear: 'round', snout: 6, headR: 11, tail: 'short', panda: true, scarf: true, gait: 8 },
  tigercub: { fur: 0xf2a24a, belly: 0xfff0d0, stripe: 0x3a2412, len: 13, legH: 10, ear: 'round', snout: 7, headR: 9.5, tail: 'long', eye: 0xffe066, scarf: true, gait: 14 },
  babydragon: { fur: 0x3ec6a4, belly: 0xffe8a0, len: 14, legH: 9, ear: 'point', snout: 8, headR: 9.5, tail: 'long', eye: 0xffe066, horn: 'dragon', wings: 0xffd34d, scarf: true, gait: 11 },
  qilin: { fur: 0xc8f0dc, belly: 0xffffff, len: 15, legH: 14, ear: 'point', snout: 8, headR: 8.5, tail: 'long', eye: 0xff9acb, horn: 'qilin', mane: GOLD, scarf: true, gait: 12 },
};

const SWIMMERS = ['cacau', 'camap', 'ruathan', 'ruangoc', 'giaolong', 'caheo'];
/** chim: dựng bằng buildBird (xem BIRDS) */
const isBird = (id: string) => id in BIRDS;
/** quái hoang dã dùng lại hình của quái có sẵn (to / nhỏ theo `scale` của định nghĩa đơn vị) */
const ART_ALIAS: Record<string, string> = {
  nhenme: 'nhendoc', nhencon: 'nhendoc',
  langchua: 'soivuong', soicon: 'soihoang',
  xamau: 'cumang', xacon: 'thanhxa',
  lonme: 'lonrung', loncon: 'lonrung',
  ngocongme: 'ngocong', ngoconcon: 'ngocong',
};
export const artIdOf = (id: string) => ART_ALIAS[id] ?? id;
export const hasBeastArt = (rawId: string) => {
  const id = artIdOf(rawId);
  return id in STYLE || isBird(id) || SWIMMERS.includes(id) || id === 'thanhxa' || id === 'ngocong' || id === 'rongvan' || id === 'mangxa' || id === 'jadesnake' || id === 'cumang' || id === 'diatrung' || id === 'nhendoc';
};

/** thú bốn chân, quay mặt sang phải */
export function buildBeast(rawId: string, accent: number): ExtraArt {
  const id = artIdOf(rawId);
  if (SWIMMERS.includes(id)) return buildSwimmer(id, accent);
  if (id === 'mangxa') return buildSnake(0x4a8a3a, 0xd8e8a0, accent, false);
  if (id === 'cumang') return buildSnake(0x2e5a3c, 0xcfe39a, accent, false);
  if (id === 'diatrung') return buildSnake(0x8a6a4a, 0xe8d8b0, accent, false, true);
  if (id === 'nhendoc') return buildSpider(accent);
  if (isBird(id)) return buildBird(id, accent);
  if (id === 'thanhxa') return buildSnake(0x3ec84a, 0xf4f0a0, accent, false);
  if (id === 'ngocong') return buildSnake(0xb8481e, 0xf0c070, accent, false);
  if (id === 'rongvan') return buildSnake(0x6ac8f0, 0xffffff, accent, true);
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
  if (s.snakeTail) {
    tube(tg, (o) => o.moveTo(0, 0).quadraticCurveTo(-len * 0.7, len * 0.15, -len * 0.55, -len * 0.75), 4, s.snakeTail);
    ball(tg, -len * 0.55, -len * 0.8, 3.4, s.snakeTail, 3);
  } else if (s.tail === 'long' && (s.tails ?? 1) > 1) {
    // hồ ly nhiều đuôi: xòe thành quạt, đầu đuôi trắng
    const n = s.tails!;
    for (let k = 0; k < n; k++) {
      const spread = (k - (n - 1) / 2) * Math.min(0.55, 2.2 / n);
      const ex = -len * (0.75 + 0.15 * Math.cos(spread * 2));
      const ey = -len * (0.95 + spread * 0.55);
      tg.moveTo(0, 0).quadraticCurveTo(-len * 0.8, -len * 0.25 + spread * -len * 0.3, ex, ey).stroke({ width: 6, color: lineSafe(fur), cap: 'round' });
      tg.moveTo(0, 0).quadraticCurveTo(-len * 0.8, -len * 0.25 + spread * -len * 0.3, ex, ey).stroke({ width: 4, color: fur, cap: 'round' });
      tg.circle(ex, ey, 2.6).fill(0xffffff);
    }
  } else if (s.tail === 'long') {
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
  let wingFar: Graphics | null = null;
  if (s.wings) {
    const wl = s.fly ? len * 1.55 : len;
    const shape = (w: Graphics, c: number) => poly(w, [0, 0, -wl * 0.5, -wl * 1.05, wl * 0.1, -wl * 0.7, wl * 0.45, -wl * 1.1, wl * 0.55, -wl * 0.1], c, 1.3);
    if (s.fly) {
      wingFar = g();
      shape(wingFar, darker(s.wings, 0.25));
      wingFar.position.set(-len * 0.3, cy - len * 0.6);
      torso.addChild(wingFar);
    }
    wing = g();
    shape(wing, s.wings);
    wing.position.set(-len * 0.1, cy - len * 0.55);
    torso.addChild(wing);
  }
  ball(torso, 0, cy, len, fur, len * 0.74);
  ball(torso, 0, cy + len * 0.36, len * 0.78, belly, len * 0.3);
  if (s.shell) {
    ball(torso, -len * 0.05, cy - len * 0.2, len * 1.02, s.shell, len * 0.78);
    for (let i = -1; i <= 1; i++) torso.poly([i * len * 0.38 - len * 0.1, cy - len * 0.85, i * len * 0.38 + len * 0.12, cy - len * 0.85, i * len * 0.38 + len * 0.18, cy - len * 0.25, i * len * 0.38 - len * 0.16, cy - len * 0.25], false).stroke({ width: 1.2, color: darker(s.shell, 0.4), alpha: 0.8 });
  }
  if (s.spots) {
    for (const [px, py] of [[-0.5, -0.3], [0, -0.45], [0.45, -0.25], [-0.2, -0.05], [0.3, 0]] as const) torso.circle(len * px, cy + len * py, len * 0.08).fill(s.spots);
  }
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
  if (s.lionMane) {
    ball(hg, -r * 0.2, r * 0.1, r * 1.55, s.lionMane, r * 1.5);
    ball(hg, -r * 0.2, r * 0.1, r * 1.1, lighter(s.lionMane, 0.2), r * 1.05);
  }
  if (s.antlers) {
    for (const sx of [-0.3, 0.25]) {
      tube(hg, (o) => {
        o.moveTo(r * sx, -r * 0.8).lineTo(r * (sx - 0.3), -r * 2.1);
        o.moveTo(r * (sx - 0.15), -r * 1.5).lineTo(r * (sx + 0.35), -r * 1.95);
      }, 2.2, s.antlers!);
    }
  }
  if (s.horn === 'bull') {
    const hc = s.hornC ?? 0xf0e6c8;
    tube(hg, (o) => o.moveTo(-r * 0.1, -r * 0.7).quadraticCurveTo(-r * 1.0, -r * 1.3, -r * 0.5, -r * 2.0), 3.2, hc);
    tube(hg, (o) => o.moveTo(r * 0.3, -r * 0.75).quadraticCurveTo(r * 0.2, -r * 1.5, r * 0.9, -r * 1.9), 3.2, hc);
  }
  if (s.ear === 'long') {
    ball(hg, -r * 0.4, -r * 1.6, r * 0.26, s.fur, r * 0.95);
    ball(hg, r * 0.15, -r * 1.65, r * 0.26, darker(s.fur, 0.08), r * 0.95);
  } else if (s.ear === 'none') {
    // rùa: không tai
  } else if (s.ear === 'point') {
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
  if (s.trunk) tube(hg, (o) => o.moveTo(r * 0.8, r * 0.2).quadraticCurveTo(r * 1.9, r * 0.9, r * 1.4, r * 2.6), r * 0.75, lighter(fur, 0.05));
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
      if (s.fly) legs.forEach((l, i) => (l.rotation = 0.5 + (i % 2) * 0.15));
      else legs.forEach((l, i) => (l.rotation = w * 0.75 * (i % 2 ? 1 : -1)));
      body.y = s.fly ? Math.sin(clock * 9) * 2.2 : moving ? -Math.abs(w) * Math.max(1.2, len * 0.1) : Math.sin(clock * 2.6) * 0.5;
      head.rotation = atk > 0 ? Math.sin(atk * Math.PI) * 0.5 : Math.sin(clock * 2) * 0.05;
      head.x = headX + (atk > 0 ? Math.sin(atk * Math.PI) * 6 : 0);
      tail.rotation = Math.sin(clock * (moving ? 9 : 3)) * 0.3;
      if (s.fly) {
        const f = Math.sin(clock * 9);
        if (wing) wing.rotation = f * 0.55 - 0.1;
        if (wingFar) wingFar.rotation = Math.sin(clock * 9 + 0.7) * 0.55 - 0.1;
      } else if (wing) wing.rotation = Math.sin(clock * (moving ? 7 : 3)) * 0.22 - 0.05;
    },
  };
}

/** thú dưới nước: cá sấu, cá mập, cá heo, rùa, giao long — nổi một phần trên mặt sóng */
function buildSwimmer(id: string, accent: number): ExtraArt {
  const body = new Container();
  const wave = g();
  const part = new Container();
  let tailC: Container | null = null;
  let height = 30;
  const ripple = (rx: number) => {
    wave.ellipse(0, 3, rx + 8, 5).fill({ color: 0xdff4ff, alpha: 0.3 }).stroke({ width: 1.2, color: 0xffffff, alpha: 0.5 });
  };
  if (id === 'camap' || id === 'caheo') {
    const dolphin = id === 'caheo';
    const skin = dolphin ? 0x7aa6c8 : 0x6c7a8c;
    const belly = dolphin ? 0xeaf4ff : 0xe6eaf2;
    const b = g();
    // thân + đầu
    b.poly([-20, -9, -6, -17, 10, -15, 24, -9, 22, -5, 10, -2, -10, -2]).fill(skin);
    b.poly([-20, -9, -6, -17, 10, -15, 24, -9, 22, -5, 10, -2, -10, -2]).stroke({ width: 1.5, color: lineSafe(skin), join: 'round' });
    b.poly([-8, -3, 12, -3, 22, -6, 10, -1, -8, -1]).fill(belly);
    // vây lưng
    poly(b, dolphin ? [-2, -16, 4, -26, 8, -15] : [-4, -16, 3, -31, 10, -15], darker(skin, 0.15), 1.2);
    poly(b, [4, -4, -2, 4, 8, -2], darker(skin, 0.1), 1);
    // mắt, miệng
    b.circle(15, -10.5, 1.6).fill(0x14141c);
    if (dolphin) {
      poly(b, [22, -9, 33, -8, 22, -5.5], skin, 1.2);
      b.moveTo(18, -6).lineTo(31, -7.5).stroke({ width: 1, color: lineSafe(skin) });
    } else {
      for (let i = 0; i < 4; i++) poly(b, [17 + i * 2.2, -5.5, 18 + i * 2.2, -2.5, 19 + i * 2.2, -5.5], 0xffffff, 0.6);
      b.moveTo(13, -6).lineTo(24, -5.5).stroke({ width: 1.2, color: 0x2a1a1a });
      poly(b, [-6, -9, -12, -11, -12, -6], 0xbd3a3a, 0.8); // vết máu: cá mập dữ
    }
    part.addChild(b);
    tailC = new Container();
    const tg = g();
    poly(tg, [0, -8, -12, -20, -9, -8, -12, 3], darker(skin, 0.1), 1.3);
    tailC.addChild(tg);
    tailC.position.set(-19, -2);
    part.addChild(tailC);
    ripple(24);
    height = 34;
  } else if (id === 'cacau') {
    const skin = 0x4d6a3a;
    const b = g();
    b.poly([-30, -7, -16, -12, 8, -12, 26, -9, 38, -8, 38, -4, 26, -3, 6, -2, -18, -2]).fill(skin);
    b.poly([-30, -7, -16, -12, 8, -12, 26, -9, 38, -8, 38, -4, 26, -3, 6, -2, -18, -2]).stroke({ width: 1.5, color: lineSafe(skin), join: 'round' });
    for (let i = 0; i < 6; i++) poly(b, [-20 + i * 8, -12, -17 + i * 8, -17, -14 + i * 8, -12], darker(skin, 0.2), 0.8);
    b.poly([22, -3, 38, -4, 38, -1.5, 22, -1.5]).fill(0xe6eed0);
    for (let i = 0; i < 5; i++) poly(b, [24 + i * 3, -4, 25 + i * 3, -1, 26 + i * 3, -4], 0xffffff, 0.5);
    b.circle(19, -13, 3).fill(skin).stroke({ width: 1.2, color: lineSafe(skin) });
    b.circle(19.5, -13.2, 1.3).fill(0xffe066);
    part.addChild(b);
    tailC = new Container();
    const tg = g();
    poly(tg, [0, -6, -14, -5, -26, -2, -12, -8], darker(skin, 0.1), 1.2);
    tailC.addChild(tg);
    tailC.position.set(-28, -4);
    part.addChild(tailC);
    ripple(32);
    height = 32;
  } else if (id === 'ruathan' || id === 'ruangoc') {
    const jade = id === 'ruangoc';
    const shell = jade ? 0x38c4a0 : 0x4a6a4a;
    const b = g();
    b.ellipse(-2, -4, 24, 9).fill(darker(shell, 0.3));
    b.moveTo(-26, -4).arc(-2, -4, 24, Math.PI, 0).closePath().fill(shell).stroke({ width: 1.6, color: lineSafe(shell) });
    for (let i = -2; i <= 2; i++) b.poly([i * 9 - 4, -23, i * 9 + 4, -23, i * 9 + 6, -13, i * 9 - 6, -13]).stroke({ width: 1.1, color: darker(shell, 0.4), alpha: 0.8 });
    b.ellipse(-8, -18, 6, 2.4).fill({ color: 0xffffff, alpha: 0.28 });
    // đầu + chân vịt
    b.ellipse(24, -6, 8, 6).fill(jade ? 0x8ae0c4 : 0x9ab07a).stroke({ width: 1.4, color: lineSafe(shell) });
    b.circle(27, -8, 1.4).fill(0x14141c);
    poly(b, [8, -2, 20, 4, 6, 3], jade ? 0x8ae0c4 : 0x9ab07a, 1);
    if (jade) poly(b, [14, -17, 24, -11, 14, -9], accent, 1);
    part.addChild(b);
    ripple(26);
    height = 34;
  } else {
    // giao long: rồng nước uốn lượn, đầu ngẩng cao
    const skin = 0x2f8fb8;
    const segs: Graphics[] = [];
    for (let i = 7; i >= 0; i--) {
      const sg = g();
      const r = 7 * (0.55 + 0.45 * (1 - i / 8));
      ball(sg, 0, 0, r, i % 2 ? darker(skin, 0.08) : skin, r);
      poly(sg, [-2, -r, 0, -r - 5, 3, -r], 0xcfeeff, 0.7);
      segs.push(sg);
      part.addChild(sg);
    }
    const head = new Container();
    const hg = g();
    ball(hg, 0, 0, 9, skin, 8);
    poly(hg, [5, -2, 17, 1, 5, 6], lighter(skin, 0.15), 1);
    poly(hg, [-4, -6, -10, -17, 0, -8], 0xf6e6c0, 1);
    poly(hg, [1, -7, -2, -18, 6, -8], 0xf6e6c0, 1);
    hg.circle(4, -2, 2).fill(0xffe066);
    hg.circle(4.4, -2, 0.9).fill(0x14141c);
    poly(hg, [-6, 4, -12, 10, -4, 8], accent, 0.8);
    head.addChild(hg);
    part.addChild(head);
    ripple(30);
    height = 44;
    wave.position.y = 0;
    body.addChild(wave, part);
    return {
      body,
      height,
      tick(clock, moving, atk) {
        const raise = atk > 0 ? Math.sin(atk * Math.PI) : 0;
        for (let i = 0; i < 8; i++) {
          const s = segs[7 - i];
          const t = i / 7;
          s.x = -t * 50 + 12;
          const neck = i < 3 ? (3 - i) * 5.2 * (0.8 + raise * 0.5) : 0;
          s.y = -7 + Math.sin(clock * (moving ? 6 : 2.6) + i * 0.9) * (2.4 + t * 3) - neck;
        }
        head.position.set(segs[7].x + 8, segs[7].y - 4 - raise * 4);
        head.rotation = -0.2 - raise * 0.35;
      },
    };
  }
  body.addChild(wave, part);
  return {
    body,
    height,
    tick(clock, moving, atk) {
      const bob = Math.sin(clock * (moving ? 6 : 2.4)) * (moving ? 1.8 : 1);
      part.y = bob;
      part.rotation = Math.sin(clock * 2.1) * 0.02;
      if (tailC) tailC.rotation = Math.sin(clock * (moving ? 9 : 3.5)) * 0.35;
      part.x = atk > 0 ? Math.sin(atk * Math.PI) * 5 : 0;
      wave.scale.x = 1 + Math.sin(clock * 3) * 0.04;
    },
  };
}

/** nhện độc: tám chân, bụng có dấu hình đồng hồ cát */
function buildSpider(accent: number): ExtraArt {
  const body = new Container();
  const legs: Graphics[] = [];
  const angs = [-1.05, -0.4, 0.3, 0.95];
  for (const far of [true, false]) {
    for (let j = 0; j < 4; j++) {
      const l = g();
      const sx = Math.sin(angs[j]);
      l.moveTo(0, 0).lineTo(sx * 14, -13).lineTo(sx * 26, 12).stroke({ width: far ? 2.2 : 2.8, color: far ? 0x3a2a44 : 0x1c1424, cap: 'round', join: 'round' });
      l.position.set(2 + j * 1.5, -17);
      body.addChild(l);
      legs.push(l);
    }
    if (far) {
      // thân vẽ giữa hai hàng chân
      const ab = g();
      ball(ab, -9, -17, 10.5, 0x2a2030, 8);
      poly(ab, [-12, -21, -6, -21, -9, -17], 0xe03a3a, 0.8);
      poly(ab, [-12, -13, -6, -13, -9, -17], 0xe03a3a, 0.8);
      ball(ab, 5.5, -17, 7, 0x3a2c44, 6);
      for (const [ex, ey] of [[8, -20], [10.5, -18.5], [8.5, -16.5], [11, -15.2]] as const) ab.circle(ex, ey, 1.2).fill(0xff5050);
      poly(ab, [10.5, -13, 13, -9, 11.4, -13], 0xe8e0d0, 0.8);
      poly(ab, [8, -12, 8.6, -8, 10, -12.4], 0xe8e0d0, 0.8);
      // khăn màu phe
      poly(ab, [2, -23, 7, -23, 5, -19], accent, 0.8);
      body.addChild(ab);
    }
  }
  return {
    body,
    height: 30,
    tick(clock, moving) {
      legs.forEach((l, i) => (l.rotation = Math.sin(clock * (moving ? 12 : 3) + i * 1.3) * (moving ? 0.28 : 0.05)));
      body.y = moving ? -Math.abs(Math.sin(clock * 12)) * 1.4 : Math.sin(clock * 2.4) * 0.6;
    },
  };
}

/** rắn: thân uốn lượn nhiều đốt, ngóc đầu lên khi tấn công */
export function buildSnake(skin: number, belly: number, accent: number, pet: boolean, fat = false): ExtraArt {
  const body = new Container();
  const N = 9;
  const segs: Graphics[] = [];
  const baseR = pet ? 6.6 : fat ? 10 : 7.6;
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
  // lưỡi (sâu đất: miệng đầy răng)
  if (fat) for (let i = 0; i < 4; i++) poly(hg, [baseR * (0.7 + i * 0.28), baseR * 0.1, baseR * (0.82 + i * 0.28), baseR * 0.9, baseR * (0.94 + i * 0.28), baseR * 0.1], 0xf6f0dc, 0.8);
  else hg.moveTo(baseR * 1.7, baseR * 0.15).lineTo(baseR * 2.5, baseR * 0.15).stroke({ width: 1, color: 0xe03a4a });
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

// ───────────────────────── chim ─────────────────────────
export interface Bird {
  body: number;
  wing: number;
  belly?: number;
  tail: 'short' | 'long' | 'fan';
  tailC?: number;
  beak: number;
  crest?: number;
  /** chân dài (cò, hạc); 0 = chim bay */
  legs: number;
  size: number;
  neck?: number;
  fly?: boolean;
  eye?: number;
  glow?: number;
  scarf?: boolean;
  legs3?: boolean;
}

const BIRDS: Record<string, Bird> = {
  phiung: { body: 0x7a5a3a, wing: 0x5a4128, belly: 0xe8d8b0, tail: 'short', beak: 0xffc93a, legs: 4, size: 13, fly: true, eye: 0xffe066 },
  bangphuong: { body: 0xe6f4ff, wing: 0x9ad8ff, tail: 'long', tailC: 0xbfe8ff, beak: 0xffd34d, crest: 0x7ad0ff, legs: 3, size: 13, fly: true, glow: 0x9ad8ff },
  hoaphuong: { body: 0xe8442a, wing: 0xffb02a, belly: 0xffd34d, tail: 'long', tailC: 0xff7a1a, beak: 0xffd34d, crest: 0xffd34d, legs: 3, size: 13, fly: true, glow: 0xff7a2a },
  khongtuoc: { body: 0x2f9a8a, wing: 0x2f6aa8, belly: 0x7ad8c0, tail: 'fan', tailC: 0x2f9a6a, beak: 0xe8c860, crest: 0x2f6aa8, legs: 4, size: 12, fly: true },
  bachhac: { body: 0xffffff, wing: 0xe8ecf4, tail: 'short', tailC: 0x2a2a30, beak: 0xe8a040, crest: 0xd23a3a, legs: 14, size: 9, neck: 14, scarf: true },
  thandieu: { body: 0x6a5a48, wing: 0x4a3e30, belly: 0xb8a888, tail: 'short', beak: 0xe8b030, legs: 6, size: 14, eye: 0xffe066, scarf: true },
  phuonghoangnon: { body: 0xff7a3a, wing: 0xffc040, tail: 'long', tailC: 0xff5a2a, beak: 0xffd34d, crest: 0xffd34d, legs: 5, size: 10, scarf: true },
  linhdieu: { body: 0x3ec6a4, wing: 0xffd34d, belly: 0xff7a8a, tail: 'long', tailC: 0x2f8fd8, beak: 0xff5a4a, legs: 4, size: 8, scarf: true },
  kimo: { body: 0xffd34d, wing: 0xffb02a, tail: 'short', tailC: 0xff9a2a, beak: 0xff9a2a, legs: 5, size: 10, glow: 0xffe066, legs3: true, scarf: true },
};

/** chim quay mặt sang phải; `fly` thì đập cánh liên tục, còn lại bước đi */
export function buildBird(spec: string | Bird, accent: number): ExtraArt {
  const b = typeof spec === 'string' ? BIRDS[spec] : spec;
  const S = b.size;
  const body = new Container();
  const hipY = -b.legs;
  const cy = hipY - S * 0.7;
  const belly = b.belly ?? lighter(b.body, 0.25);
  if (b.glow) body.addChild(g().circle(0, cy, S * 1.9).fill({ color: b.glow, alpha: 0.2 }));
  const legs: Graphics[] = [];
  if (b.legs > 0) {
    const n = b.legs3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const l = g();
      l.moveTo(0, 0).lineTo(0, b.legs).stroke({ width: 2, color: 0xc8902a, cap: 'round' });
      l.moveTo(0, b.legs).lineTo(4, b.legs).stroke({ width: 2, color: 0xc8902a, cap: 'round' });
      l.position.set(-S * 0.25 + i * S * 0.3, hipY);
      legs.push(l);
      body.addChild(l);
    }
  }
  // đuôi
  const tail = new Container();
  const tg = g();
  const tc = b.tailC ?? darker(b.wing, 0.1);
  if (b.tail === 'fan') {
    for (let i = 0; i < 7; i++) {
      const f = g();
      f.ellipse(0, -S * 1.5, S * 0.34, S * 1.5).fill(tc).stroke({ width: 1, color: lineSafe(tc) });
      f.circle(0, -S * 2.4, S * 0.2).fill(i % 2 ? 0x3ab0ff : 0xffd34d);
      f.rotation = -0.9 + i * 0.3 - Math.PI / 2 + 0.5;
      tg.addChild(f);
    }
  } else if (b.tail === 'long') {
    for (let i = -1; i <= 1; i++) tube(tg, (o) => o.moveTo(0, 0).quadraticCurveTo(-S * 1.2, S * 0.2 * i - S * 0.1, -S * 2.3, S * 0.9 * i + S * 0.4), 2.6, i ? tc : lighter(tc, 0.2));
  } else {
    poly(tg, [0, -S * 0.3, -S * 1.0, 0, 0, S * 0.3], tc, 1.2);
  }
  tail.addChild(tg);
  tail.position.set(-S * 0.85, cy);
  body.addChild(tail);
  // cánh xa (tối hơn), thân, cánh gần
  const wingShape = (w: Graphics, c: number) => poly(w, [0, 0, -S * 0.3, -S * 1.5, S * 0.2, -S * 1.2, S * 0.7, -S * 0.2], c, 1.3);
  const wingFar = g();
  wingShape(wingFar, darker(b.wing, 0.25));
  wingFar.position.set(-S * 0.25, cy - S * 0.3);
  body.addChild(wingFar);
  const torso = g();
  ball(torso, 0, cy, S, b.body, S * 0.7);
  ball(torso, S * 0.15, cy + S * 0.3, S * 0.8, belly, S * 0.35);
  body.addChild(torso);
  // cổ + đầu
  const neckLen = b.neck ?? S * 0.5;
  const hx = S * 0.8;
  const hy = cy - S * 0.15 - neckLen - S * 0.3;
  const neckG = g();
  tube(neckG, (o) => o.moveTo(S * 0.45, cy - S * 0.2).quadraticCurveTo(S * 0.7, cy - neckLen * 0.6, hx, hy), S * 0.55, b.body);
  if (b.scarf) poly(neckG, [S * 0.4, cy - S * 0.35, S * 0.85, cy - S * 0.2, S * 0.55, cy - S * 0.05], accent, 1.2);
  body.addChild(neckG);
  const head = new Container();
  const hg = g();
  const hr = S * 0.42;
  if (b.crest) for (let i = 0; i < 3; i++) poly(hg, [-hr * 0.3 + i * hr * 0.3, -hr * 0.8, -hr * 0.9 + i * hr * 0.35, -hr * 2.0, hr * 0.1 + i * hr * 0.3, -hr * 0.8], b.crest, 1);
  ball(hg, 0, 0, hr, b.body, hr);
  poly(hg, [hr * 0.7, -hr * 0.4, hr * 2.0, hr * 0.2, hr * 0.7, hr * 0.5], b.beak, 1.2);
  hg.circle(hr * 0.25, -hr * 0.2, Math.max(1.3, hr * 0.22)).fill(b.eye ?? 0x14141a);
  hg.circle(hr * 0.3, -hr * 0.26, 0.6).fill(0xffffff);
  head.addChild(hg);
  head.position.set(hx, hy);
  body.addChild(head);
  const wing = g();
  wingShape(wing, b.wing);
  wing.position.set(-S * 0.1, cy - S * 0.2);
  body.addChild(wing);

  return {
    body,
    height: b.legs + S * 2 + neckLen * 1.1,
    tick(clock, moving, atk) {
      const w = moving ? Math.sin(clock * 12) : 0;
      if (b.fly) {
        body.y = Math.sin(clock * 8) * 2.2;
        wing.rotation = Math.sin(clock * 9) * 0.6 - 0.1;
        wingFar.rotation = Math.sin(clock * 9 + 0.7) * 0.6 - 0.1;
      } else {
        legs.forEach((l, i) => (l.rotation = w * 0.7 * (i % 2 ? 1 : -1)));
        body.y = moving ? -Math.abs(w) * 1.5 : Math.sin(clock * 2.4) * 0.5;
        wing.rotation = moving ? Math.sin(clock * 10) * 0.15 : 0;
        wingFar.rotation = wing.rotation;
      }
      head.rotation = atk > 0 ? Math.sin(atk * Math.PI) * 0.5 : Math.sin(clock * 2) * 0.05;
      head.x = hx + (atk > 0 ? Math.sin(atk * Math.PI) * 6 : 0);
      tail.rotation = Math.sin(clock * (moving ? 8 : 3)) * 0.15;
    },
  };
}
