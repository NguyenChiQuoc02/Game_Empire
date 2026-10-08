import { Container, Graphics } from 'pixi.js';
import { INK, ball, darker, dome, g, lighter, limb, lineOf, outline, poly, rrect } from './draw';
import { buildDefenseArt, buildElephant, buildHound } from './extraArt';
import { buildBeast, hasBeastArt } from './beastArt';
import type { UnitDef } from '../data/units';
import type { Side } from '../game/sim';

export const SIDE_COLOR: [number, number] = [0x3d8bff, 0xe24b4b];
const GOLD = 0xffd34d;

// ───────────────────────── kiểu dáng từng đơn vị ─────────────────────────
type Hat =
  | 'kabuto' | 'hood' | 'helm' | 'greathelm' | 'cap' | 'straw' | 'horns' | 'topknot' | 'scholar'
  | 'plumes' | 'bun' | 'turban' | 'tyrant' | 'band' | 'blackhelm' | 'guanyu'
  | 'bald' | 'wukong' | 'erlang' | 'mien' | 'bullhorns';
type Weapon =
  | 'katana' | 'bow' | 'spear' | 'sword' | 'lance' | 'dagger' | 'axe' | 'staff' | 'bomb'
  | 'needle' | 'serpent' | 'glaive' | 'fan' | 'halberd' | 'cleaver'
  | 'pole' | 'talisman' | 'crossbow' | 'vial' | 'ruyi' | 'trident' | 'fist' | 'snakestaff';

interface Style {
  skin: number;
  cloth: number;
  pants: number;
  armor: number;
  hat: Hat;
  hatColor: number;
  weapon: Weapon;
  hair?: number;
  shield?: boolean;
  mount?: { body: number; mane: number };
  beard?: { color: number; len: number };
  cape?: boolean;
  bulk?: number;
  boss?: boolean;
  /** màu riêng cho vũ khí (lưỡi kiếm, quạt, quyền khí...) */
  wc?: number;
}

const SK = 0xffd2a8;
const STYLES: Record<string, Style> = {
  samurai: { skin: SK, cloth: 0xb83a3a, pants: 0x3a3550, armor: 0x4a4a62, hat: 'kabuto', hatColor: 0x4a4a62, weapon: 'katana' },
  archer: { skin: SK, cloth: 0x3f9a4a, pants: 0x5a4030, armor: 0x8a5a2b, hat: 'cap', hatColor: 0x3f9a4a, weapon: 'bow' },
  spear: { skin: SK, cloth: 0xc9a25a, pants: 0x5a4a30, armor: 0x9a7a3a, hat: 'straw', hatColor: 0xe8c878, weapon: 'spear' },
  shield: { skin: 0xf0c49a, cloth: 0x5a6578, pants: 0x3a4050, armor: 0x8f9bb0, hat: 'helm', hatColor: 0xaab4c6, weapon: 'sword', shield: true, bulk: 1.12 },
  knight: { skin: SK, cloth: 0x8a94a8, pants: 0x4a5062, armor: 0xd2d9e6, hat: 'greathelm', hatColor: 0xd9dfea, weapon: 'lance', mount: { body: 0x9a6238, mane: 0x3a2412 } },
  ninja: { skin: SK, cloth: 0x2a2d3c, pants: 0x1c1e29, armor: 0x3a3e52, hat: 'hood', hatColor: 0x2a2d3c, weapon: 'dagger' },
  berserker: { skin: 0xe0a47c, cloth: 0x8a4a2a, pants: 0x4a3426, armor: 0xa66a3a, hat: 'horns', hatColor: 0xf0e8d0, weapon: 'axe', hair: 0xd0522a, beard: { color: 0xd0522a, len: 10 }, bulk: 1.12 },
  healer: { skin: SK, cloth: 0xf4f8f0, pants: 0xd0d8cc, armor: 0x57c488, hat: 'turban', hatColor: 0xf4f8f0, weapon: 'staff' },
  bomber: { skin: 0xe8b890, cloth: 0x8a5a30, pants: 0x4a3626, armor: 0xb8863a, hat: 'band', hatColor: 0xff7a3d, weapon: 'bomb' },
  duongqua: { skin: SK, cloth: 0x34508a, pants: 0x232a44, armor: 0x5f86c6, hat: 'topknot', hatColor: 0x1d1a2a, weapon: 'sword', cape: true },
  tieulongnu: { skin: 0xffe3cf, cloth: 0xf6f6ff, pants: 0xdfe2f4, armor: 0xb8c4f0, hat: 'bun', hatColor: 0xf8f8ff, weapon: 'needle', cape: true },
  truongphi: { skin: 0xb98058, cloth: 0x3a3a48, pants: 0x26262e, armor: 0x5a5a6c, hat: 'blackhelm', hatColor: 0x2c2c36, weapon: 'serpent', beard: { color: 0x15151a, len: 12 }, cape: true, bulk: 1.25 },
  trieuvan: { skin: SK, cloth: 0xf0f3fa, pants: 0xb8c0d4, armor: 0xcdd6ea, hat: 'helm', hatColor: 0xe6ecf6, weapon: 'spear', mount: { body: 0xf6f6f6, mane: 0xcdd3de }, cape: true },
  quanvu: { skin: 0xd05a3f, cloth: 0x2a8a4e, pants: 0x1f5a36, armor: 0x3fb068, hat: 'guanyu', hatColor: 0x2a8a4e, weapon: 'glaive', beard: { color: 0x1a1a1a, len: 20 }, cape: true, bulk: 1.12 },
  giacatluong: { skin: SK, cloth: 0xeaf0fa, pants: 0xaebbd8, armor: 0x5a86d8, hat: 'scholar', hatColor: 0x34456a, weapon: 'fan', beard: { color: 0x2a2a2a, len: 8 }, cape: true },
  lubo: { skin: SK, cloth: 0xa82a2a, pants: 0x4a1a1a, armor: 0xd9a24a, hat: 'plumes', hatColor: 0xd9a24a, weapon: 'halberd', mount: { body: 0xc2342a, mane: 0x2a0f0c }, cape: true },
  dongtrac: { skin: 0xe0a47c, cloth: 0x5a2a5a, pants: 0x2a1a2a, armor: 0x8a3f8a, hat: 'tyrant', hatColor: GOLD, weapon: 'cleaver', beard: { color: 0x2a1a1a, len: 14 }, cape: true, bulk: 1.45, boss: true },

  monk: { skin: SK, cloth: 0xe08a2a, pants: 0x8a5a2b, armor: 0xf0b050, hat: 'bald', hatColor: SK, weapon: 'pole', bulk: 1.1 },
  taoist: { skin: SK, cloth: 0x4a6aa0, pants: 0x2a3a60, armor: 0x8aa0d0, hat: 'scholar', hatColor: 0x34456a, weapon: 'talisman' },
  crossbow: { skin: SK, cloth: 0x7a6a3a, pants: 0x4a3a28, armor: 0x9a7a3a, hat: 'cap', hatColor: 0x6a5a30, weapon: 'crossbow' },
  poisoner: { skin: 0xd8c8a0, cloth: 0x7a3aa0, pants: 0x3a2050, armor: 0x5aa04a, hat: 'cap', hatColor: 0x5a2a80, weapon: 'vial' },
  khicon: { skin: 0xd9a05a, cloth: 0xd9a63a, pants: 0xb02a22, armor: 0xffd34d, hat: 'wukong', hatColor: 0xffd34d, weapon: 'staff' },
  tonngokhong: { skin: 0xd9a05a, cloth: 0xd9a63a, pants: 0xb02a22, armor: 0xffd34d, hat: 'wukong', hatColor: 0xffd34d, weapon: 'ruyi', cape: true },
  duongtien: { skin: SK, cloth: 0xdfe8f6, pants: 0x3a5a9a, armor: 0xaabee6, hat: 'erlang', hatColor: 0xcfd8ec, weapon: 'trident', cape: true },
  taothao: { skin: SK, cloth: 0x1f2a4a, pants: 0x141a30, armor: 0x3a4a8a, hat: 'mien', hatColor: 0x2a2a3a, weapon: 'sword', beard: { color: 0x1a1a1a, len: 8 }, cape: true, bulk: 1.1 },
  chudu: { skin: SK, cloth: 0x4aa0a0, pants: 0x2a6060, armor: 0x7ad0d0, hat: 'scholar', hatColor: 0x2a5a5a, weapon: 'sword', wc: 0xe8f4ff, cape: true },
  masieu: { skin: SK, cloth: 0xf0f3fa, pants: 0xb0b8cc, armor: 0xd8dfee, hat: 'helm', hatColor: 0xe6ecf6, weapon: 'lance', mount: { body: 0xf6f6f6, mane: 0xcdd3de }, cape: true },
  hoangtrung: { skin: 0xe0b890, cloth: 0xa83a2a, pants: 0x4a2a22, armor: 0xc8602a, hat: 'cap', hatColor: 0xa83a2a, weapon: 'bow', beard: { color: 0xf0f0f0, len: 12 }, cape: true },
  tumayi: { skin: SK, cloth: 0x4a4a5a, pants: 0x2a2a38, armor: 0x7a7a90, hat: 'scholar', hatColor: 0x2a2a38, weapon: 'fan', wc: 0xb8bccb, beard: { color: 0x2a2a2a, len: 8 }, cape: true },
  quachtinh: { skin: 0xe0b890, cloth: 0x6a5a3a, pants: 0x3a2e1e, armor: 0x8a7a4a, hat: 'topknot', hatColor: 0x2a1a12, weapon: 'fist', wc: 0x7ad0ff, bulk: 1.2 },
  kieuphong: { skin: 0xd8a070, cloth: 0x3a6aa8, pants: 0x1f3a6a, armor: 0x5a8ad0, hat: 'band', hatColor: 0xd23a2a, weapon: 'fist', wc: 0xffb23d, beard: { color: 0x1a1a1a, len: 9 }, bulk: 1.3, cape: true },
  lenhhoxung: { skin: SK, cloth: 0xf0f0f4, pants: 0x8a90a0, armor: 0xcdd4e4, hat: 'topknot', hatColor: 0x1d1a2a, weapon: 'sword', wc: 0xdfe8f6, cape: true },
  truongvoky: { skin: SK, cloth: 0xeaf0ff, pants: 0x3a4a8a, armor: 0xf0c85a, hat: 'topknot', hatColor: 0x1d1a2a, weapon: 'sword', wc: 0xffe27a, cape: true },
  auduongphong: { skin: 0xe0c8a0, cloth: 0x5a8a3a, pants: 0x2a4a22, armor: 0xb0c850, hat: 'band', hatColor: 0xe8e8e8, weapon: 'snakestaff', beard: { color: 0xeeeeee, len: 12 }, cape: true },
  dongphuongbatbai: { skin: 0xf6dcc8, cloth: 0xc02a3a, pants: 0x4a1020, armor: 0xe84a5a, hat: 'bun', hatColor: 0x1a1a22, weapon: 'needle', wc: 0xffb0c8, cape: true, boss: true, bulk: 1.1 },
  caocau: { skin: 0xf0c8a0, cloth: 0x2a3a6a, pants: 0x1a2038, armor: 0x4a5a9a, hat: 'plumes', hatColor: GOLD, weapon: 'halberd', beard: { color: 0x2a1a1a, len: 10 }, cape: true, boss: true, bulk: 1.3 },
  diemla: { skin: 0x9a5a5a, cloth: 0x2a1030, pants: 0x140818, armor: 0x6a2a5a, hat: 'mien', hatColor: GOLD, weapon: 'glaive', beard: { color: 0x120a14, len: 12 }, cape: true, boss: true, bulk: 1.5 },
  quysai: { skin: 0x7a5aa0, cloth: 0x3a2a55, pants: 0x241a38, armor: 0x5a4a80, hat: 'horns', hatColor: 0xcfc0ff, weapon: 'cleaver', bulk: 1.65 },
  nguoida: { skin: 0x9aa0a8, cloth: 0x7a808a, pants: 0x5e646e, armor: 0x8a909a, hat: 'bald', hatColor: 0x9aa0a8, weapon: 'fist', wc: 0xc8ccd4, bulk: 1.65 },
  quybinh: { skin: 0xcfd8e8, cloth: 0x3a2a55, pants: 0x241a38, armor: 0x5a4a80, hat: 'horns', hatColor: 0x9a8ac0, weapon: 'cleaver' },
  nguumavuong: { skin: 0x8a5a3a, cloth: 0x7a2018, pants: 0x3a1010, armor: 0xc03a28, hat: 'bullhorns', hatColor: 0xf0e0b8, weapon: 'axe', beard: { color: 0x2a1410, len: 6 }, cape: true, boss: true, bulk: 1.5 },
};

// ───────────────────────── vũ khí ─────────────────────────
// 'swing': vẽ hướng lên (-y), 'thrust': vẽ hướng +x
type Mode = 'swing' | 'thrust' | 'bow' | 'cast' | 'hold';

function drawWeapon(kind: Weapon, accent: number, wc?: number): { g: Graphics; mode: Mode; rest: number } {
  const w = g();
  const metal = 0xe9f0f8;
  switch (kind) {
    case 'katana':
      rrect(w, -1.7, -3, 3.4, 10, 1, 0x3a2a30);
      rrect(w, -5, -5.6, 10, 3, 1.2, GOLD);
      poly(w, [-1.7, -5.6, 1.7, -5.6, 1.3, -31, -0.6, -35, -1.7, -31], metal);
      w.moveTo(0.3, -8).lineTo(0.5, -30).stroke({ width: 0.9, color: 0xffffff, alpha: 0.9 });
      return { g: w, mode: 'swing', rest: 0.35 };
    case 'sword':
      rrect(w, -1.8, -3, 3.6, 10, 1, 0x2a2430);
      rrect(w, -5.5, -5.8, 11, 3.2, 1.2, 0x5a6684);
      poly(w, [-3, -5.8, 3, -5.8, 2.7, -33, 0, -39, -2.7, -33], wc ?? 0xa9bad8);
      w.moveTo(0, -8).lineTo(0, -34).stroke({ width: 1, color: 0xffffff, alpha: 0.75 });
      return { g: w, mode: 'swing', rest: 0.35 };
    case 'dagger':
      rrect(w, -1.5, -1, 3, 7, 1, 0x1a1a22);
      rrect(w, -3.6, -3, 7.2, 2.4, 1, 0x555a70);
      poly(w, [-1.7, -3, 1.7, -3, 1, -17, -0.4, -19, -1.7, -16], metal);
      return { g: w, mode: 'swing', rest: 0.65 };
    case 'axe':
      rrect(w, -1.6, -29, 3.2, 40, 1.2, 0x8a5a2b);
      poly(w, [0.8, -30, 13, -37, 14, -17, 0.8, -22], 0xcfd6e2);
      poly(w, [-0.8, -30, -9, -34, -9, -20, -0.8, -23], 0xa9b2c2);
      return { g: w, mode: 'swing', rest: 0.3 };
    case 'cleaver':
      rrect(w, -1.8, -1, 3.6, 12, 1.2, 0x3a1f3a);
      rrect(w, -6, -3.6, 12, 3.6, 1.2, GOLD);
      poly(w, [-3, -3.6, 5, -3.6, 7, -26, 3.5, -46, -3.5, -42, -3.5, -26], 0xd8dee9);
      w.moveTo(0.6, -8).lineTo(2, -38).stroke({ width: 1.2, color: 0xffffff, alpha: 0.7 });
      return { g: w, mode: 'swing', rest: 0.25 };
    case 'staff':
      rrect(w, -1.6, -31, 3.2, 44, 1.2, 0x9a7440);
      w.circle(0, -35, 9).fill({ color: 0x7dffb0, alpha: 0.28 });
      ball(w, 0, -35, 5.2, 0x7dffb0);
      return { g: w, mode: 'cast', rest: 0.1 };
    case 'fan':
      rrect(w, -1.2, -2, 2.4, 9, 1, 0x9a7440);
      for (let i = -2; i <= 2; i++) {
        const a = i * 0.36;
        w.ellipse(Math.sin(a) * 7, -9 - Math.cos(a) * 7, 2.8, 8.5).fill(wc ?? 0xffffff);
        outline(w, 0x6b84c0, 1.1);
      }
      return { g: w, mode: 'cast', rest: 0.9 };
    case 'bomb':
      ball(w, 0, -7, 7.2, 0x2a2a36);
      rrect(w, -2.5, -15.5, 5, 3, 1, 0x7a5a30);
      w.moveTo(0, -16).quadraticCurveTo(4, -21, 7, -19).stroke({ width: 1.8, color: 0xe8c878, cap: 'round' });
      w.circle(7.4, -19.4, 2.6).fill(0xffb23d);
      w.circle(7.4, -19.4, 4.4).fill({ color: 0xff7a3d, alpha: 0.35 });
      return { g: w, mode: 'hold', rest: 0 };
    case 'bow':
      w.moveTo(2, -19).arc(-5, 0, 19, -1.12, 1.12).stroke({ width: 4.6, color: 0x3a2412, cap: 'round' });
      w.moveTo(2, -19).arc(-5, 0, 19, -1.12, 1.12).stroke({ width: 2.8, color: 0xb87a3c, cap: 'round' });
      w.moveTo(-3.6, -16.8).lineTo(-3.6, 16.8).stroke({ width: 0.9, color: 0xf6f0dc });
      w.moveTo(-3.6, 0).lineTo(17, 0).stroke({ width: 2.2, color: 0x3a2412 });
      w.moveTo(-3.6, 0).lineTo(17, 0).stroke({ width: 1.1, color: 0xe8c890 });
      poly(w, [16, -2.6, 22, 0, 16, 2.6], metal, 1);
      poly(w, [-3.6, -2.6, -0.5, 0, -3.6, 2.6], 0xd34a4a, 1);
      return { g: w, mode: 'bow', rest: 0 };
    case 'spear':
      rrect(w, -9, -1.5, 40, 3, 1.2, 0x9a6a32);
      poly(w, [30, -4.2, 44, 0, 30, 4.2], metal);
      w.circle(29, 0, 3).fill(accent);
      outline(w, accent, 1);
      return { g: w, mode: 'thrust', rest: -0.12 };
    case 'lance':
      rrect(w, -11, -1.7, 54, 3.4, 1.3, 0x9a6a32);
      poly(w, [42, -4.6, 58, 0, 42, 4.6], metal);
      poly(w, [35, -1, 35, -11, 25, -3], accent);
      return { g: w, mode: 'thrust', rest: -0.1 };
    case 'serpent':
      rrect(w, -9, -1.7, 46, 3.4, 1.3, 0x2a2a33);
      poly(w, [36, -2.4, 41, -5, 45, -1.4, 49, -5, 54, 0, 48, 2.6, 44, 0.4, 40, 3.6], 0xe0e6f0);
      w.circle(35, 0, 3).fill(0xd23a3a);
      outline(w, 0xd23a3a, 1);
      return { g: w, mode: 'thrust', rest: -0.12 };
    case 'glaive':
      rrect(w, -9, -1.8, 44, 3.6, 1.3, 0x2f9a58);
      poly(w, [33, -2.4, 34, -17, 51, -15, 58, -4, 49, 5, 34, 2.6], 0xd6ecdc);
      w.moveTo(37, -12).lineTo(52, -9).stroke({ width: 1, color: 0xffffff, alpha: 0.8 });
      w.circle(32, 0, 3).fill(0xd23a3a);
      outline(w, 0xd23a3a, 1);
      return { g: w, mode: 'thrust', rest: -0.15 };
    case 'halberd':
      rrect(w, -9, -1.6, 50, 3.2, 1.3, 0x7a2a2a);
      poly(w, [38, -3.4, 56, 0, 38, 3.4], metal);
      poly(w, [41, -3.4, 45, -16, 52, -12, 48, -3.4], GOLD);
      poly(w, [41, 3.4, 45, 16, 52, 12, 48, 3.4], GOLD);
      return { g: w, mode: 'thrust', rest: -0.12 };
    case 'pole':
      rrect(w, -1.7, -42, 3.4, 56, 1.4, 0x9a6a38);
      for (const y of [-34, -6]) rrect(w, -2.4, y, 4.8, 4, 1, 0x6a4a28);
      return { g: w, mode: 'swing', rest: 0.2 };
    case 'talisman':
      rrect(w, -5.5, -19, 11, 15, 1.2, 0xf8e070);
      w.moveTo(-3, -16).lineTo(3, -16).moveTo(0, -16).lineTo(0, -8).moveTo(-3, -11).lineTo(3, -11).stroke({ width: 1.2, color: 0xc02a2a });
      w.circle(0, -12, 11).fill({ color: 0x9ad0ff, alpha: 0.22 });
      return { g: w, mode: 'cast', rest: 0.1 };
    case 'crossbow':
      rrect(w, -3, -2.4, 24, 4.8, 1.6, 0x7a5028);
      w.moveTo(14, -14).quadraticCurveTo(24, 0, 14, 14).stroke({ width: 4, color: 0x3a2412, cap: 'round' });
      w.moveTo(14, -14).quadraticCurveTo(24, 0, 14, 14).stroke({ width: 2.4, color: 0xb87a3c, cap: 'round' });
      w.moveTo(14, -14).lineTo(2, 0).lineTo(14, 14).stroke({ width: 0.9, color: 0xf0e8d0 });
      poly(w, [18, -2, 28, 0, 18, 2], 0xdfe6f0, 1);
      return { g: w, mode: 'bow', rest: 0 };
    case 'vial':
      ball(w, 0, -7, 6, 0x6ae04a);
      rrect(w, -2, -17, 4, 6, 1, 0xdfe6f0);
      rrect(w, -2.6, -19, 5.2, 3, 1, 0x7a4a28);
      w.circle(0, -7, 11).fill({ color: 0x7aff5a, alpha: 0.22 });
      return { g: w, mode: 'cast', rest: 0.1 };
    case 'ruyi':
      rrect(w, -2.4, -50, 4.8, 66, 2, 0xd9a63a);
      rrect(w, -3.4, -52, 6.8, 10, 2.5, 0xc02a2a);
      rrect(w, -3.4, 8, 6.8, 10, 2.5, 0xc02a2a);
      w.moveTo(-2.4, -30).lineTo(2.4, -30).moveTo(-2.4, -12).lineTo(2.4, -12).stroke({ width: 1, color: 0xfff0b0 });
      return { g: w, mode: 'swing', rest: 0.3 };
    case 'trident':
      rrect(w, -9, -1.7, 46, 3.4, 1.4, 0x8a98b0);
      poly(w, [35, -2.4, 40, -9, 44, -2.4, 48, 0, 44, 2.4, 40, 9, 35, 2.4], 0xe0e8f4, 1.3);
      poly(w, [37, -2, 54, 0, 37, 2], 0xe0e8f4, 1.2);
      w.circle(34, 0, 3).fill(0x3ab0ff);
      return { g: w, mode: 'thrust', rest: -0.12 };
    case 'fist': {
      const c = wc ?? 0x7ad0ff;
      w.circle(2, -2, 12).fill({ color: c, alpha: 0.2 });
      w.circle(2, -2, 7).fill({ color: c, alpha: 0.5 });
      ball(w, 2, -2, 4.4, c);
      return { g: w, mode: 'cast', rest: 0 };
    }
    case 'snakestaff':
      rrect(w, -1.7, -40, 3.4, 56, 1.4, 0x6a4a28);
      w.moveTo(0, -38).bezierCurveTo(10, -34, -10, -26, 8, -20).bezierCurveTo(14, -17, 4, -10, 0, -8).stroke({ width: 4.4, color: 0x1a3a14, cap: 'round' });
      w.moveTo(0, -38).bezierCurveTo(10, -34, -10, -26, 8, -20).bezierCurveTo(14, -17, 4, -10, 0, -8).stroke({ width: 2.6, color: 0x6ae04a, cap: 'round' });
      poly(w, [-4, -44, 4, -44, 6, -38, 0, -34, -6, -38], 0x6ae04a, 1.1);
      w.circle(-1.5, -41, 1).fill(0xff3a3a);
      w.circle(2, -41, 1).fill(0xff3a3a);
      return { g: w, mode: 'swing', rest: 0.3 };
    case 'needle':
      w.moveTo(-2, 0).lineTo(26, 0).stroke({ width: 3.2, color: wc ?? 0x9aa4d0, cap: 'round' });
      w.moveTo(-2, 0).lineTo(26, 0).stroke({ width: 1.6, color: 0xffffff, cap: 'round' });
      w.circle(26, 0, 5).fill({ color: 0xcfe8ff, alpha: 0.4 });
      w.circle(26, 0, 2.2).fill(0xffffff);
      return { g: w, mode: 'thrust', rest: -0.2 };
  }
}

// ───────────────────────── đầu: tóc/mũ ─────────────────────────
const R = 11.5;
type HatFn = (h: Graphics, st: Style, accent: number) => void;

const HATS: Record<Hat, { back?: HatFn; front: HatFn }> = {
  kabuto: {
    back: (h, st) => { poly(h, [-R + 1, -2, -R - 7, 9, -R + 3, 8, 0, 6], 0x7a2a2a); void st; },
    front: (h, st) => {
      dome(h, 0, -2, R + 2, st.hatColor);
      rrect(h, -R - 3, -3.5, 2 * R + 6, 4, 1.8, darker(st.hatColor, 0.3));
      poly(h, [-1.8, -12, -10, -25, -4.5, -18, 0, -23, 4.5, -18, 10, -25, 1.8, -12], GOLD);
    },
  },
  hood: {
    back: (h, _st, a) => {
      poly(h, [-R + 2, -3, -R - 17, 2, -R - 13, -4, -R - 20, -5, -R - 7, 6, -R + 2, 4], a);
    },
    front: (h, st, a) => {
      ball(h, 0, -0.5, R + 1.4, st.hatColor);
      rrect(h, 0.5, -5.5, 12, 7, 3.2, st.skin);
      h.ellipse(4.5, -2.6, 2.4, 1.8).fill(0xffffff);
      h.ellipse(9.2, -2.6, 2.4, 1.8).fill(0xffffff);
      h.circle(5.3, -2.6, 1.2).fill(0x14141c);
      h.circle(10, -2.6, 1.2).fill(0x14141c);
      h.moveTo(2, -6.2).lineTo(7, -4.6).stroke({ width: 1.4, color: 0x14141c });
      h.moveTo(7.6, -4.6).lineTo(12, -6.4).stroke({ width: 1.4, color: 0x14141c });
      rrect(h, -R - 1, 3, 2 * R + 2, 3.2, 1.2, a);
    },
  },
  helm: {
    front: (h, st, a) => {
      dome(h, 0, 0, R + 1.5, st.hatColor);
      rrect(h, 4, -3, 7.5, 13, 2.5, st.hatColor);
      rrect(h, -1.6, -R - 1, 3.2, R + 1, 1, darker(st.hatColor, 0.25));
      poly(h, [-1, -R - 1, -4, -R - 9, -13, -R - 7, -8, -R + 1], a);
    },
  },
  greathelm: {
    front: (h, st, a) => {
      rrect(h, -R - 1.5, -R - 1, 2 * R + 3, R + 9, 5, st.hatColor);
      h.rect(0.5, -1, 12.5, 3).fill(0x1a1420);
      for (let i = 0; i < 3; i++) h.circle(4 + i * 3.2, 5.5, 0.8).fill(0x1a1420);
      poly(h, [-2, -R - 1, -4, -R - 11, -16, -R - 9, -12, -R + 1], a);
      poly(h, [-2, -R - 1, -6, -R - 5, -17, -R - 4, -12, -R + 1], lighter(a, 0.25));
    },
  },
  blackhelm: {
    front: (h, st) => {
      dome(h, 0, 0, R + 2, st.hatColor);
      rrect(h, 5, -3, 7, 12, 2.5, st.hatColor);
      poly(h, [-2, -R - 1, -3, -R - 10, 2, -R - 14, 3, -R - 4], 0xd23a3a);
      ball(h, 0, -R - 14, 3, 0xd23a3a);
      h.moveTo(-4, -1).lineTo(8, -3.5).stroke({ width: 2, color: 0x111118 });
    },
  },
  cap: {
    back: (h, st) => poly(h, [-R + 3, -6, -R - 9, 4, -R - 1, 8, -2, 2], darker(st.hatColor, 0.12)),
    front: (h, st) => {
      dome(h, 0, 0.5, R + 1.2, st.hatColor);
      rrect(h, -R - 1, -2.5, 2 * R + 2, 3.5, 1.5, darker(st.hatColor, 0.3));
      poly(h, [2, -R, 4, -R - 8, 8, -R - 2], 0xfff4e0);
      h.moveTo(3, -R).lineTo(6, -R - 7).stroke({ width: 1, color: 0xd34a4a });
    },
  },
  straw: {
    front: (h, st) => {
      poly(h, [-19, 0, 0, -21, 19, 0, 12, 3, -12, 3], st.hatColor);
      h.moveTo(-14, -1.5).lineTo(-2, -16).stroke({ width: 1, color: darker(st.hatColor, 0.3) });
      h.moveTo(-6, -0.5).lineTo(1, -13).stroke({ width: 1, color: darker(st.hatColor, 0.3) });
      h.moveTo(5, -0.5).lineTo(3, -14).stroke({ width: 1, color: darker(st.hatColor, 0.3) });
      h.moveTo(11, -1).lineTo(6, -11).stroke({ width: 1, color: darker(st.hatColor, 0.3) });
      h.rect(-8, 2.5, 18, 2).fill({ color: 0xd34a4a, alpha: 0.9 });
    },
  },
  horns: {
    back: (h, st) => poly(h, [-R + 1, -3, -R - 9, 6, -R - 4, 14, -R + 3, 8], st.hair ?? 0xd0522a),
    front: (h, st) => {
      dome(h, 0, 0, R + 1.5, 0x7a4a2a);
      poly(h, [-8, -7, -17, -9, -20, -24, -13, -14], st.hatColor);
      poly(h, [8, -7, 17, -9, 20, -24, 13, -14], st.hatColor);
      rrect(h, -R - 1, -3.5, 2 * R + 2, 3.5, 1.4, 0xd23a3a);
      poly(h, [-6, -R, -3, -R - 6, 0, -R, 3, -R - 7, 6, -R], st.hair ?? 0xd0522a);
    },
  },
  topknot: {
    back: (h, st) => {
      poly(h, [-R + 1, -4, -R - 8, 6, -R - 18, 18, -R - 6, 14, -R + 2, 6], st.hatColor);
    },
    front: (h, st, a) => {
      dome(h, 0, 0, R + 1, st.hatColor);
      poly(h, [-R, -2, -R + 2, 8, -R + 5, 2], st.hatColor);
      ball(h, -2, -R - 3.5, 4.4, st.hatColor);
      rrect(h, -R - 0.5, -4.2, 2 * R + 1, 3.6, 1.4, a);
      poly(h, [-R, -3, -R - 8, -2, -R - 5, 2], a, 1.2);
    },
  },
  scholar: {
    back: (h, st) => {
      poly(h, [-R + 2, -3, -R - 10, 10, -R - 5, 15, -R + 4, 7], st.hatColor);
    },
    front: (h, st) => {
      dome(h, 0, 0, R, 0x2d2f3e);
      rrect(h, -9, -R - 9, 18, 11, 2.5, st.hatColor);
      h.rect(-9, -R - 2.5, 18, 2.6).fill(GOLD);
      poly(h, [-9, -R - 9, -13, -R - 12, -7, -R - 5], st.hatColor);
    },
  },
  plumes: {
    front: (h, st) => {
      dome(h, 0, 0, R + 2, st.hatColor);
      rrect(h, 5, -3, 7, 12, 2.5, st.hatColor);
      rrect(h, -R - 2, -4, 2 * R + 4, 3.8, 1.5, 0xa82a2a);
      for (const [dx, k] of [[-3, 1], [2, 1.25]] as const) {
        h.moveTo(dx, -R).quadraticCurveTo(dx - 6 * k, -R - 24 * k, dx - 24 * k, -R - 22 * k).stroke({ width: 5, color: lineOf(0x3a2a30), cap: 'round' });
        h.moveTo(dx, -R).quadraticCurveTo(dx - 6 * k, -R - 24 * k, dx - 24 * k, -R - 22 * k).stroke({ width: 3, color: 0x6a5a62, cap: 'round' });
        h.moveTo(dx, -R).quadraticCurveTo(dx - 6 * k, -R - 24 * k, dx - 24 * k, -R - 22 * k).stroke({ width: 0.9, color: 0xffd34d, cap: 'round' });
      }
    },
  },
  bun: {
    back: (h, st) => {
      poly(h, [-R + 1, -5, -R - 8, 8, -R - 11, 26, -R - 1, 20, -R + 3, 9], st.hatColor);
    },
    front: (h, st) => {
      dome(h, 0, 1, R + 1, st.hatColor);
      poly(h, [-R, 0, -R + 1, 9, -R + 5, 2], st.hatColor);
      ball(h, -6, -R - 2, 5, st.hatColor);
      ball(h, 5, -R - 2.5, 5, st.hatColor);
      ball(h, -6, -R - 2, 1.9, 0xff9ecb);
      h.moveTo(-R, -3).lineTo(R, -3.2).stroke({ width: 1.2, color: 0xaab4e6 });
    },
  },
  turban: {
    front: (h, st) => {
      dome(h, 0, 0.5, R + 1.8, st.hatColor);
      rrect(h, -R - 2, -5, 2 * R + 4, 4, 1.8, 0x57c488);
      h.rect(-1.4, -R - 1, 2.8, 8).fill(0x57c488);
      h.rect(-3.6, -R + 1.5, 7.2, 2.8).fill(0x57c488);
      ball(h, 6, -4, 2.2, GOLD);
    },
  },
  band: {
    back: (h, st) => poly(h, [-R + 1, -3, -R - 10, 1, -R - 7, -5, -R - 14, -3, -R - 6, 6, -R, 3], st.hatColor),
    front: (h, st) => {
      dome(h, 0, -1, R + 0.5, 0x3a2a1a);
      rrect(h, -R - 0.5, -5.2, 2 * R + 1, 4.4, 1.6, st.hatColor);
      h.circle(8, 5, 1.2).fill({ color: INK, alpha: 0.35 });
      h.circle(2, 7, 1).fill({ color: INK, alpha: 0.3 });
    },
  },
  tyrant: {
    back: (h) => poly(h, [-R + 1, -4, -R - 7, 8, -R + 2, 12], 0x2a1a2a),
    front: (h, st) => {
      dome(h, 0, 0, R + 1, 0x2a1a2a);
      poly(h, [-12, -4, -12, -19, -6, -11, 0, -23, 6, -11, 12, -19, 12, -4], st.hatColor);
      ball(h, 0, -9, 2.2, 0xff3d3d);
      ball(h, -7.5, -8, 1.5, 0x57c4ff);
      ball(h, 7.5, -8, 1.5, 0x57ffb0);
    },
  },
  bald: {
    front: (h, st) => {
      for (const [x, y] of [[-3.5, -R + 2.6], [0.5, -R + 0.8], [4, -R + 2.6]] as const) h.circle(x, y, 1.3).fill(darker(st.skin, 0.35));
      h.moveTo(-8, -1).quadraticCurveTo(0, -R - 1, 8, -1).stroke({ width: 1, color: 0xffffff, alpha: 0.3 });
    },
  },
  wukong: {
    back: (h) => {
      poly(h, [-R + 1, -2, -R - 8, 4, -R - 5, 11, -R + 2, 6], 0xb87a30);
    },
    front: (h, st) => {
      // lông mày/tóc lông quanh mặt + vòng vàng + hai lông phượng
      poly(h, [-R, -6, -R + 4, -R + 2, 2, -R, 6, -R + 4, R - 1, -5, 4, -4, -4, -4], 0xb87a30);
      rrect(h, -R - 1, -6.5, 2 * R + 2, 3.4, 1.4, GOLD);
      for (const [dx, k] of [[-2, 1], [3, 1.2]] as const) {
        h.moveTo(dx, -R + 1).quadraticCurveTo(dx - 6 * k, -R - 22 * k, dx - 22 * k, -R - 20 * k).stroke({ width: 5, color: lineOf(0xd23a2a), cap: 'round' });
        h.moveTo(dx, -R + 1).quadraticCurveTo(dx - 6 * k, -R - 22 * k, dx - 22 * k, -R - 20 * k).stroke({ width: 3, color: 0xd23a2a, cap: 'round' });
        h.moveTo(dx, -R + 1).quadraticCurveTo(dx - 6 * k, -R - 22 * k, dx - 22 * k, -R - 20 * k).stroke({ width: 0.9, color: GOLD, cap: 'round' });
      }
      ball(h, 0, -R - 1, 3, 0xff5a3a);
      void st;
    },
  },
  erlang: {
    front: (h, st) => {
      dome(h, 0, 0, R + 1.5, st.hatColor);
      rrect(h, -R - 2, -4, 2 * R + 4, 3.6, 1.5, 0x3ab0ff);
      // cánh hai bên mũ + mào vàng
      poly(h, [-R - 1, -3, -R - 13, -12, -R - 7, -2], 0xe8f0ff);
      poly(h, [-R - 1, -7, -R - 12, -19, -R - 5, -8], 0xcfe0ff);
      poly(h, [-2, -R - 1, 0, -R - 9, 3, -R - 1], GOLD);
      // mắt thứ ba dọc giữa trán
      h.ellipse(5.5, -2.5, 1.5, 3.6).fill(0xff2a2a).stroke({ width: 1, color: 0xffd34d });
    },
  },
  mien: {
    front: (h, st) => {
      dome(h, 0, 0, R, st.hatColor);
      poly(h, [-R - 5, -R - 2, R + 6, -R - 4, R + 6, -R + 1, -R - 5, -R + 3], 0x23232e, 1.4);
      rrect(h, -R, -R + 2, 2 * R, 3, 1, GOLD);
      for (let i = -3; i <= 3; i++) {
        const bx = i * 3.4 + 1;
        h.moveTo(bx, -R - 0.5).lineTo(bx, -R + 6).stroke({ width: 0.9, color: 0xf0e8c0 });
        ball(h, bx, -R + 6.5, 1.2, 0xf0e8c0);
      }
    },
  },
  bullhorns: {
    back: (h) => {
      poly(h, [-R + 1, -3, -R - 7, 4, -R + 1, 12], 0x3a1a10);
    },
    front: (h, st) => {
      dome(h, 0, 0, R + 1.5, 0x4a2a18);
      // cặp sừng trâu khổng lồ cong lên
      for (const sgn of [-1, 1]) {
        h.moveTo(sgn * 7, -5).bezierCurveTo(sgn * 18, -6, sgn * 24, -16, sgn * 15, -28).bezierCurveTo(sgn * 18, -17, sgn * 12, -11, sgn * 3, -10).closePath().fill(st.hatColor);
        outline(h, st.hatColor);
      }
      // khuyên mũi vàng
      h.circle(R - 1, 7, 2.6).stroke({ width: 1.6, color: GOLD });
    },
  },
  guanyu: {
    back: (h, st) => poly(h, [-R + 3, -6, -R - 10, 5, -R, 9, -2, 2], darker(st.hatColor, 0.12)),
    front: (h, st) => {
      dome(h, 0, 0, R + 1.2, st.hatColor);
      rrect(h, -R - 1, -3, 2 * R + 2, 3.5, 1.4, darker(st.hatColor, 0.3));
      ball(h, 0, -R - 1, 2.4, GOLD);
    },
  },
};

function drawHead(parent: Container, st: Style, accent: number, boss: boolean) {
  const hat = HATS[st.hat];
  const back = g();
  hat.back?.(back, st, accent);
  parent.addChild(back);

  const face = g();
  // tai
  ball(face, -R + 1, 1, 3, st.skin);
  // đầu
  ball(face, 0, 0, R, st.skin);
  if (st.beard) {
    const L = st.beard.len;
    poly(face, [-4, 5, 10, 5, 8, 5 + L * 0.7, 3, 6 + L, -2, 5 + L * 0.7], st.beard.color);
  }
  parent.addChild(face);

  const f = g();
  if (st.hat !== 'hood') {
    // mắt to kiểu chibi
    for (const ex of [3.6, 8.8]) {
      f.ellipse(ex, 3, 2.3, 3.1).fill(0x1a1420);
      f.circle(ex + 0.7, 1.8, 0.95).fill(0xffffff);
    }
    // má hồng
    f.ellipse(5.2, 8, 2.4, 1.5).fill({ color: 0xff7a8a, alpha: 0.45 });
    // miệng
    if (boss || st.hat === 'horns') f.moveTo(4.8, 9.6).quadraticCurveTo(7.4, 12.2, 10, 9.4).stroke({ width: 1.3, color: 0x3a0a0a, cap: 'round' });
    else f.moveTo(5.6, 10.2).quadraticCurveTo(7.4, 11.4, 9.2, 10.2).stroke({ width: 1.1, color: 0x6a2a2a, cap: 'round' });
    // lông mày
    const angry = boss || st.hat === 'horns' || st.hat === 'blackhelm' || st.hat === 'guanyu';
    f.moveTo(2, angry ? -0.2 : -0.8).lineTo(5.6, angry ? 0.8 : -1).stroke({ width: 1.2, color: 0x2a1a1a, cap: 'round' });
    f.moveTo(7.4, angry ? 0.8 : -1).lineTo(11, angry ? -0.8 : -0.8).stroke({ width: 1.2, color: 0x2a1a1a, cap: 'round' });
  }
  parent.addChild(f);

  const front = g();
  hat.front(front, st, accent);
  parent.addChild(front);
}

// ───────────────────────── ngựa ─────────────────────────
function drawHorse(body: number, mane: number, accent: number, legs: Graphics[]): Graphics {
  const h = g();
  poly(h, [-18, -25, -33, -19, -30, -6, -20, -14], mane);
  // chân sau/trước phía xa vẽ sau (legs xử lý ngoài)
  ball(h, 0, -19, 22, body, 9.5);
  poly(h, [11, -24, 20, -40, 30, -34, 23, -17], body);
  ball(h, 29, -31, 8, body, 5.6);
  h.ellipse(34, -29, 2.6, 2).fill(darker(body, 0.25));
  h.circle(29.5, -33.5, 1.5).fill(0x14141a);
  h.circle(30, -34, 0.5).fill(0xffffff);
  poly(h, [21, -39, 23, -47, 26.5, -39], body, 1.2);
  poly(h, [12, -26, 17, -42, 22, -40, 15, -23], mane);
  // yên ngựa theo màu phe
  poly(h, [-8, -27, 8, -27, 10, -13, -10, -13], accent);
  rrect(h, -7, -29, 14, 4, 2, darker(accent, 0.2));
  for (const [x, ph] of [[-14, 0], [-9, 1], [9, 1], [14, 0]] as const) {
    const l = g();
    rrect(l, -2.4, 0, 4.8, 15, 2, body);
    rrect(l, -2.8, 12, 5.6, 4, 1.5, 0x2a1f28);
    l.position.set(x, -13);
    l.label = String(ph);
    legs.push(l);
  }
  return h;
}

// ───────────────────────── máy ném đá ─────────────────────────
function buildTrebuchet(accent: number): { body: Container; arm: Container; wheels: Graphics[] } {
  const body = new Container();
  const wood = 0xa0703a;
  const frame = g();
  poly(frame, [-24, -9, 24, -9, 9, -37, -9, -37], 0x7a4f2a, 2);
  rrect(frame, -27, -14, 54, 6, 2, wood);
  rrect(frame, -3, -38, 6, 10, 2, 0x5a3a1e);
  poly(frame, [-22, -9, -9, -34, -9, -28, -17, -9], lighter(0x7a4f2a, 0.15), 1);
  body.addChild(frame);
  const wheels: Graphics[] = [];
  for (const x of [-17, 17]) {
    const w = g();
    ball(w, 0, 0, 9, 0x5a3a22);
    for (let i = 0; i < 4; i++) w.moveTo(0, 0).lineTo(Math.cos(i * 0.785) * 8.4, Math.sin(i * 0.785) * 8.4).stroke({ width: 1.8, color: 0x2a1c10 });
    w.circle(0, 0, 2).fill(0xc9a070);
    w.position.set(x, -9);
    body.addChild(w);
    wheels.push(w);
  }
  const arm = new Container();
  const a = g();
  rrect(a, -2.6, -40, 5.2, 60, 2, wood);
  rrect(a, -8, 13, 16, 13, 2.5, 0x59596a);
  w_flag(a, accent);
  a.moveTo(0, -40).lineTo(8, -49).stroke({ width: 1.8, color: 0xe8c878 });
  ball(a, 9, -50, 5.6, 0x9a9aa6);
  arm.addChild(a);
  arm.position.set(0, -32);
  body.addChild(arm);
  return { body, arm, wheels };
}
function w_flag(o: Graphics, accent: number) {
  poly(o, [2, -24, 14, -21, 2, -16], accent, 1.2);
}

// ───────────────────────── tổng hợp ─────────────────────────
export interface UnitArt {
  root: Container;
  art: Container;
  hpBar: Graphics;
  /** chiều cao (đã nhân scale) để đặt thanh máu/tên */
  height: number;
  barW: number;
  /** kiểu vung vũ khí (để vẽ vệt chém) */
  mode: Mode | 'siege';
  /** scale gốc (có dấu theo hướng nhìn) */
  baseScale: number;
  /** tâm khuôn mặt (đã nhân scale) để cắt chân dung */
  face: { x: number; y: number };
  update(clock: number, moving: boolean, atkPhase: number): void;
}

/** Dựng một người lính (hoặc tướng) vào `into`; trả về hàm animate */
function buildHumanoid(def: UnitDef, side: Side, accent: number, into: Container) {
  let extra = 0;
  const st = STYLES[def.id];
  const bulk = st.bulk ?? 1;
  const mounted = !!st.mount;
  const horseLegs: Graphics[] = [];
  const rider = new Container();
  const hipY = mounted ? -13 : 0;
  if (mounted) {
    const horse = new Container();
    horse.scale.set(1.14);
    horse.addChild(drawHorse(st.mount!.body, st.mount!.mane, accent, horseLegs));
    for (const l of horseLegs) horse.addChild(l);
    into.addChild(horse);
    extra += 12;
  }
  if (st.hat === 'plumes' || st.hat === 'scholar') extra += 8;
  into.addChild(rider);
  rider.y = hipY;
  if (mounted) rider.x = -4;

  // chân
  const legL = g();
  const legR = g();
  for (const [l, x] of [[legL, -4.2], [legR, 3.4]] as const) {
    if (!mounted) {
      rrect(l, -2.9, 0, 5.8, 15, 2.4, st.pants);
      rrect(l, -3.5, 10.5, 7, 5, 2, darker(st.pants, 0.35));
      l.position.set(x, -15);
    } else {
      rrect(l, -2.9, 0, 5.8, 13, 2.4, st.pants);
      rrect(l, -3.5, 9, 7, 4.5, 2, darker(st.pants, 0.35));
      l.rotation = 1.15;
      l.position.set(x * 1.2, -12);
    }
    rider.addChild(l);
  }

  const bodyC = new Container();
  rider.addChild(bodyC);

  // tay sau
  const backArm = g();
  limb(backArm, -7 * bulk, -29, -10 * bulk, -22, 5, st.cloth);
  ball(backArm, -10.4 * bulk, -20.4, 2.9, st.skin);
  bodyC.addChild(backArm);

  if (st.cape) {
    const cape = g();
    cape.label = 'cape';
    const cc = side === 0 ? 0x2e63c9 : 0xb23030;
    poly(cape, [-7, -33, -10 * bulk, -33, -21, -8, -9, -11], cc);
    poly(cape, [-8, -30, -17, -9, -9, -11], darker(cc, 0.25), 0.8);
    bodyC.addChild(cape);
  }

  // thân
  const torso = g();
  const tw = 18 * bulk;
  rrect(torso, -tw / 2, -34, tw, 21, 7, st.cloth);
  rrect(torso, -tw / 2, -34, tw, 11, 6, st.armor);
  rrect(torso, -tw / 2 - 0.5, -21.5, tw + 1, 3.6, 1.4, accent);
  ball(torso, 0, -19.7, 1.9, GOLD);
  ball(torso, -tw / 2 + 1.5, -31, 4.2, st.armor);
  if (def.skill === 'heal') {
    torso.rect(-1.5, -31, 3, 9).fill(0x57c488);
    torso.rect(-4.5, -28, 9, 3).fill(0x57c488);
  }
  if (st.boss) {
    ball(torso, 0, -27, 5, 0xe0a47c, 4);
    torso.moveTo(-tw / 2, -25).lineTo(tw / 2, -25).stroke({ width: 1.6, color: GOLD });
  }
  bodyC.addChild(torso);
  // khăn cổ
  const scarf = g();
  rrect(scarf, -6.5, -37, 13, 4.2, 1.8, accent);
  bodyC.addChild(scarf);

  // đầu
  const head = new Container();
  head.position.set(1, -45);
  drawHead(head, st, accent, !!st.boss);
  bodyC.addChild(head);

  // tay trước + vũ khí (xoay quanh vai)
  const armC = new Container();
  const shoulderX = 6 * bulk;
  armC.position.set(shoulderX, -29);
  const wd = drawWeapon(st.weapon, accent, st.wc);
  const hand = { x: 7, y: 5 };
  const armG = g();
  limb(armG, 0, 0, hand.x, hand.y, 5.4, st.cloth);
  armC.addChild(armG);
  const weapon = new Container();
  weapon.position.set(hand.x, hand.y);
  weapon.addChild(wd.g);
  weapon.rotation = wd.rest;
  armC.addChild(weapon);
  const handG = g();
  ball(handG, hand.x, hand.y, 3.1, st.skin);
  armC.addChild(handG);
  bodyC.addChild(armC);
  if (wd.mode === 'hold') armC.rotation = -1.15;

  // khiên
  if (st.shield) {
    const sh = g();
    rrect(sh, -6, -15, 12, 31, 5, 0x7c889e);
    rrect(sh, -2.2, -11, 4.4, 23, 2, accent);
    ball(sh, 0, 1, 3.4, GOLD);
    sh.position.set(shoulderX + 5, -21);
    bodyC.addChild(sh);
  }

  const cape = bodyC.children.find((c) => c.label === 'cape');
  const baseX = shoulderX;
  const tick = (clock: number, moving: boolean, atk: number) => {
    const w = moving ? Math.sin(clock * (mounted ? 11 : 9 + def.speed / 14)) : 0;
    if (mounted) {
      horseLegs.forEach((l, i) => (l.rotation = moving ? w * 0.7 * (i % 2 ? 1 : -1) : 0));
      rider.y = hipY + (moving ? -Math.abs(w) * 1.8 : 0);
    } else {
      legL.rotation = w * 0.75;
      legR.rotation = -w * 0.75;
      rider.y = moving ? -Math.abs(w) * 1.8 : Math.sin(clock * 2) * 0.35;
    }
    head.y = -45 + (moving ? Math.abs(w) * 0.8 : Math.sin(clock * 2 + 1) * 0.4);
    bodyC.scale.y = 1 + (moving ? 0 : Math.sin(clock * 2.2) * 0.014);
    bodyC.rotation = moving ? 0.06 + Math.abs(w) * 0.02 : 0;
    if (cape) cape.rotation = moving ? 0.12 + Math.abs(w) * 0.14 : Math.sin(clock * 2) * 0.03;

    let armRot = wd.mode === 'hold' ? -1.15 : 0;
    let armDx = 0;
    if (atk > 0) {
      if (wd.mode === 'swing') {
        armRot = atk < 0.3 ? lerp(0, -1.2, atk / 0.3) : atk < 0.6 ? lerp(-1.2, 1.5, (atk - 0.3) / 0.3) : lerp(1.5, 0, (atk - 0.6) / 0.4);
      } else if (wd.mode === 'thrust') {
        armDx = atk < 0.4 ? -3 * (atk / 0.4) : -3 + 16 * Math.sin(((atk - 0.4) / 0.6) * Math.PI);
      } else if (wd.mode === 'cast') {
        armRot = -Math.sin(atk * Math.PI) * 1.1;
      } else if (wd.mode === 'bow') {
        armDx = -Math.sin(atk * Math.PI) * 3;
      }
      bodyC.x = Math.sin(atk * Math.PI) * 3;
    } else {
      bodyC.x = 0;
      if (wd.mode === 'cast') armRot = -0.2 + Math.sin(clock * 2) * 0.06;
      if (moving && wd.mode !== 'hold') armRot += w * 0.14;
    }
    armC.rotation = armRot;
    armC.x = baseX + armDx;
  };
  return { tick, mode: wd.mode, extra };
}

export function buildUnitArt(def: UnitDef, side: Side, withSquad = false): UnitArt {
  const accent = SIDE_COLOR[side];
  if (def.kind === 'defense') {
    const d = buildDefenseArt(def, side);
    const bar = g();
    bar.position.set(0, -d.height - 8);
    d.root.addChild(bar);
    return {
      root: d.root, art: d.art, hpBar: bar, height: d.height, barW: 38, mode: 'hold', baseScale: def.scale,
      face: { x: 0, y: -d.height * 0.6 }, update: (clock, _moving, atk) => d.update(clock, atk),
    };
  }
  const sc = def.scale;
  const root = new Container();
  const art = new Container();
  const giant = !!def.tags?.includes('giant');
  const elite = def.kind === 'general' || def.kind === 'boss' || giant;

  const base = g();
  base.ellipse(0, 1.5, 21 * sc, 6 * sc).fill({ color: 0x000000, alpha: 0.34 });
  // vòng màu phe dưới chân: nhận ra ta/địch từ xa
  base.ellipse(0, 1.5, 17 * sc, 4.8 * sc).fill({ color: accent, alpha: 0.2 });
  base.ellipse(0, 1.5, 17 * sc, 4.8 * sc).stroke({ width: 2, color: accent, alpha: 0.9 });
  if (elite) {
    const c = def.kind === 'boss' || giant ? 0xff4d4d : GOLD;
    base.ellipse(0, 1.5, 25 * sc, 7.4 * sc).stroke({ width: 2.2, color: c, alpha: 0.95 });
    base.ellipse(0, 1.5, 25 * sc, 7.4 * sc).fill({ color: c, alpha: 0.12 });
  }
  root.addChild(base, art);
  art.scale.set(side === 0 ? sc : -sc, sc);

  let height = 70 * sc;
  let mode: Mode | 'siege' = 'siege';
  let tick: (clock: number, moving: boolean, atk: number) => void;

  if (def.id === 'trebuchet') {
    const { body, arm, wheels } = buildTrebuchet(accent);
    art.addChild(body);
    height = 58 * sc;
    tick = (clock, moving, atk) => {
      for (const w of wheels) w.rotation = moving ? clock * 3 : 0;
      let rot = -0.75;
      if (atk > 0) {
        if (atk < 0.35) rot = lerp(-0.75, -1.15, atk / 0.35);
        else if (atk < 0.7) rot = lerp(-1.15, 0.95, (atk - 0.35) / 0.35);
        else rot = lerp(0.95, -0.75, (atk - 0.7) / 0.3);
      }
      arm.rotation = rot;
      body.y = moving ? Math.sin(clock * 6) * 0.6 : 0;
    };
  } else if (def.id === 'elephant' || def.id === 'haothienkhuyen' || hasBeastArt(def.id)) {
    const b = def.id === 'elephant' ? buildElephant(accent) : def.id === 'haothienkhuyen' ? buildHound(accent) : buildBeast(def.id, accent);
    art.addChild(b.body);
    height = b.height * sc;
    tick = b.tick;
  } else {
    const squad = withSquad && def.kind === 'troop' && !STYLES[def.id].mount ? (def.id === 'bomber' || def.id === 'healer' ? 1 : 2) : 0;
    const spots: [number, number, number][] = [[-22, -8, 0.94], [-14, 9, 0.97]];
    const followers: { c: Container; tick: (clock: number, moving: boolean, atk: number) => void; ph: number }[] = [];
    for (let i = 0; i < squad; i++) {
      const c = new Container();
      c.position.set(spots[i][0], spots[i][1]);
      c.scale.set(spots[i][2]);
      const f = buildHumanoid(def, side, accent, c);
      followers.push({ c, tick: f.tick, ph: 0.9 + i * 1.3 });
    }
    const mainC = new Container();
    const m = buildHumanoid(def, side, accent, mainC);
    mode = m.mode;
    height += m.extra * sc;
    // vẽ theo chiều sâu: người phía sau (y nhỏ) trước, người phía trước sau
    for (const f of followers) if (f.c.y < 0) art.addChild(f.c);
    art.addChild(mainC);
    for (const f of followers) if (f.c.y >= 0) art.addChild(f.c);
    tick = (clock, moving, atk) => {
      m.tick(clock, moving, atk);
      for (const f of followers) f.tick(clock + f.ph, moving, atk > 0 ? Math.max(0.001, atk - 0.06 * f.ph) : 0);
    };
  }

  const barW = 32;
  const hpBar = g();
  hpBar.position.set(0, -height - 8);
  root.addChild(hpBar);

  const mounted = def.id !== 'trebuchet' && !!STYLES[def.id]?.mount;
  const face = def.id === 'trebuchet' ? { x: 0, y: -30 * sc } : { x: (mounted ? -3 : 1) * sc, y: (mounted ? -58 : -45) * sc };
  return { root, art, hpBar, height, barW, mode, baseScale: sc, face, update: tick };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}
