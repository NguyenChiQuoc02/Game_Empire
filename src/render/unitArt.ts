import { Container, Graphics, Text } from 'pixi.js';
import { textStyle } from './vfx';
import { levelOfPow } from '../data/units';
import { INK, ball, darker, dome, g, lighter, limb, lineOf, outline, poly, rrect } from './draw';
import { buildDefenseArt, buildElephant, buildHound } from './extraArt';
import { buildBeast, hasBeastArt } from './beastArt';
import { buildEngine, hasEngineArt } from './engineArt';
import type { UnitDef } from '../data/units';
import type { UnitSide } from '../game/sim';

/** màu phe: ta (xanh), địch (đỏ), quái hoang dã (tím) */
export const SIDE_COLOR: [number, number, number] = [0x3d8bff, 0xe24b4b, 0xb06adf];
const GOLD = 0xffd34d;

// ───────────────────────── kiểu dáng từng đơn vị ─────────────────────────
type Hat =
  | 'kabuto' | 'hood' | 'helm' | 'greathelm' | 'cap' | 'straw' | 'horns' | 'topknot' | 'scholar'
  | 'plumes' | 'bun' | 'turban' | 'tyrant' | 'band' | 'blackhelm' | 'guanyu'
  | 'bald' | 'wukong' | 'erlang' | 'mien' | 'bullhorns' | 'lionhelm' | 'lotus'
  | 'hancap' | 'wildhair' | 'ponytail' | 'phoenixcap' | 'fengguan' | 'guan' | 'wushamao' | 'pig' | 'pilu' | 'eagle'
  | 'dizang' | 'taoistcrown' | 'wrap' | 'warcap' | 'flame' | 'longhair';
type Weapon =
  | 'katana' | 'bow' | 'spear' | 'sword' | 'lance' | 'dagger' | 'axe' | 'staff' | 'bomb'
  | 'needle' | 'serpent' | 'glaive' | 'fan' | 'halberd' | 'cleaver'
  | 'pole' | 'talisman' | 'crossbow' | 'vial' | 'ruyi' | 'trident' | 'fist' | 'snakestaff'
  | 'twinblade' | 'dualaxe' | 'hammer' | 'whip' | 'crescent' | 'brush' | 'ribbon' | 'jadestaff' | 'qi' | 'guqin'
  | 'flute' | 'rake' | 'khakkhara' | 'bananafan' | 'pearl' | 'whisk';

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
  /** thủy quân: đứng trên thuyền (xem buildBoat) */
  boat?: 'skiff' | 'junk' | 'cannon';
  beard?: { color: number; len: number };
  cape?: boolean;
  bulk?: number;
  boss?: boolean;
  /** màu riêng cho vũ khí (lưỡi kiếm, quạt, quyền khí...) */
  wc?: number;
  /** áo dài che chân (nho sĩ, đạo sĩ, nữ tướng, nhà sư) */
  robe?: number;
  /** giáp vai lớn: tấm giáp, gai nhọn, hoặc lông thú */
  shoulders?: 'pads' | 'spikes' | 'fur';
  /** bịt mắt (Hạ Hầu Đôn) */
  patch?: boolean;
  /** vằn hổ trên áo */
  stripes?: number;
  /** cánh sau lưng */
  wings?: number;
  /** vòng hào quang sau đầu */
  halo?: number;
  /** bầu rượu bên hông */
  gourd?: boolean;
  /** dải đai chéo ngực */
  sash?: number;
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
  masieu: { skin: SK, cloth: 0x1f6f78, pants: 0x12383f, armor: 0xe2b24a, hat: 'lionhelm', hatColor: 0xe6b84a, weapon: 'lance', hair: 0x1c1620, mount: { body: 0x7a4426, mane: 0x1a0f0a }, cape: true },
  natra: { skin: 0xffe0c0, cloth: 0xd23a2a, pants: 0xf0d8a0, armor: 0xf0b040, hat: 'bun', hatColor: 0x14141c, weapon: 'spear', wc: 0xff7a2a, cape: true },
  vitieubao: { skin: 0xf0c49a, cloth: 0xc9a24a, pants: 0x4a3a28, armor: 0x7a2a2a, hat: 'cap', hatColor: 0x2a4a8a, weapon: 'dagger' },
  loicong: { skin: 0x9ab4ff, cloth: 0x4a3a9a, pants: 0x2a2060, armor: 0x7a6ae0, hat: 'tyrant', hatColor: 0xffe066, weapon: 'fist', wc: 0xffe066, cape: true, bulk: 1.15 },
  quanam: { skin: 0xffe3cf, cloth: 0xfff6e0, pants: 0xe8d0f0, armor: 0x57c488, hat: 'lotus', hatColor: 0xf8f8ff, weapon: 'staff', wc: 0x7ae0b0, cape: true },
  thaisutu: { skin: SK, cloth: 0x2a6f7a, pants: 0x1a3f4a, armor: 0x9aa7b8, hat: 'band', hatColor: 0xff8a2a, weapon: 'bow', cape: true },
  tatu: { skin: 0xe0c8a0, cloth: 0x7a5a2e, pants: 0x4a3418, armor: 0xc9a24a, hat: 'topknot', hatColor: 0xf0f0f0, weapon: 'staff', beard: { color: 0xf4f4f4, len: 16 }, cape: true },
  thuybinh: { skin: SK, cloth: 0x2f6f9a, pants: 0x1f3a5a, armor: 0x6a8fb0, hat: 'band', hatColor: 0xeaf4ff, weapon: 'sword', boat: 'skiff' },
  cungthuyen: { skin: SK, cloth: 0x3a7a6a, pants: 0x23483e, armor: 0x7a9a6a, hat: 'cap', hatColor: 0x2f6f5a, weapon: 'bow', boat: 'skiff' },
  chienthuyen: { skin: SK, cloth: 0x5a4a3a, pants: 0x3a2e24, armor: 0x8a6a4a, hat: 'helm', hatColor: 0xaab4c6, weapon: 'spear', shield: true, boat: 'junk', bulk: 1.1 },
  phaothuyen: { skin: SK, cloth: 0x4a3a30, pants: 0x2a2018, armor: 0x6a5a4a, hat: 'band', hatColor: 0xd23a2a, weapon: 'crossbow', boat: 'cannon' },
  camninh: { skin: 0xe0b890, cloth: 0x1f6aa0, pants: 0x14304a, armor: 0x3fa0d0, hat: 'band', hatColor: 0xff6a3a, weapon: 'cleaver', cape: true, boat: 'junk', bulk: 1.1 },
  satang: { skin: 0x7aa0c8, cloth: 0x3a5a7a, pants: 0x20304a, armor: 0x5a7a9a, hat: 'bald', hatColor: 0x7aa0c8, weapon: 'pole', boat: 'junk', bulk: 1.3, beard: { color: 0x2a3a4a, len: 8 } },
  longvuong: { skin: 0xe8d0b0, cloth: 0x1f7a8a, pants: 0x145a6a, armor: 0x3ac0c0, hat: 'mien', hatColor: 0x2a4a5a, weapon: 'trident', beard: { color: 0xcfe8f0, len: 16 }, cape: true, boat: 'junk', bulk: 1.2 },
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
  cuumatri: { skin: 0xe0b890, cloth: 0xa8341a, pants: 0x4a1a10, armor: 0xe89a2a, hat: 'bald', hatColor: 0xe0b890, weapon: 'khakkhara', wc: 0xff8a3a, robe: 0xa8341a, cape: true, boss: true, bulk: 1.3 },
  hoangmi: { skin: 0xe8c8a0, cloth: 0xe8b830, pants: 0x6a4a10, armor: 0xffd34d, hat: 'wrap', hatColor: 0xe8b830, weapon: 'hammer', wc: 0xffe27a, beard: { color: 0x2a1a10, len: 12 }, cape: true, boss: true, bulk: 1.45 },
  thanhcat: { skin: 0xd9a070, cloth: 0x8a2a1a, pants: 0x3a2010, armor: 0xc9a040, hat: 'warcap', hatColor: 0x6a3a1a, weapon: 'crescent', beard: { color: 0x2a1a10, len: 11 }, shoulders: 'fur', cape: true, boss: true, bulk: 1.4 },
  chunghoi: { skin: 0xf0c8a0, cloth: 0x3a4a8a, pants: 0x1a2038, armor: 0x7a8ac0, hat: 'blackhelm', hatColor: 0x2a3050, weapon: 'sword', wc: 0xbfe0ff, beard: { color: 0x2a1a1a, len: 7 }, cape: true, boss: true, bulk: 1.3 },
  ngochoang: { skin: 0xf0d0a8, cloth: 0xe8b830, pants: 0x8a5a10, armor: 0xffe27a, hat: 'mien', hatColor: 0xffd34d, weapon: 'jadestaff', wc: 0xb6ffe0, beard: { color: 0xffffff, len: 12 }, cape: true, boss: true, bulk: 1.4, halo: 0xffe27a },
  tonquyen: { skin: 0xf0c8a0, cloth: 0x1f6aa0, pants: 0x14304a, armor: 0x3fa0d0, hat: 'guan', hatColor: 0x1f3a5a, weapon: 'sword', wc: 0x9ae0ff, beard: { color: 0x6a2a6a, len: 9 }, cape: true, boss: true, bulk: 1.25 },
  quysai: { skin: 0x7a5aa0, cloth: 0x3a2a55, pants: 0x241a38, armor: 0x5a4a80, hat: 'horns', hatColor: 0xcfc0ff, weapon: 'cleaver', bulk: 1.65 },
  nguoida: { skin: 0x9aa0a8, cloth: 0x7a808a, pants: 0x5e646e, armor: 0x8a909a, hat: 'bald', hatColor: 0x9aa0a8, weapon: 'fist', wc: 0xc8ccd4, bulk: 1.65 },
  quybinh: { skin: 0xcfd8e8, cloth: 0x3a2a55, pants: 0x241a38, armor: 0x5a4a80, hat: 'horns', hatColor: 0x9a8ac0, weapon: 'cleaver' },
  nguumavuong: { skin: 0x8a5a3a, cloth: 0x7a2018, pants: 0x3a1010, armor: 0xc03a28, hat: 'bullhorns', hatColor: 0xf0e0b8, weapon: 'axe', beard: { color: 0x2a1410, len: 6 }, cape: true, boss: true, bulk: 1.5 },

  // lính đợt mới
  daodaobinh: { skin: SK, cloth: 0x5a6a7a, pants: 0x2a3340, armor: 0x9aa7b8, hat: 'warcap', hatColor: 0x7a8696, weapon: 'cleaver', shoulders: 'pads', bulk: 1.12 },
  toanphong: { skin: SK, cloth: 0x2aa8a0, pants: 0x14504e, armor: 0xe8f4f0, hat: 'ponytail', hatColor: 0x1a1a22, weapon: 'twinblade' },
  hoathuong: { skin: SK, cloth: 0xb04a2a, pants: 0x4a2a1a, armor: 0xd8702a, hat: 'warcap', hatColor: 0x8a2a1a, weapon: 'crossbow', sash: 0xffd34d },
  liethoa: { skin: SK, cloth: 0xd84a1a, pants: 0x4a1a0a, armor: 0x3a2a2a, hat: 'flame', hatColor: 0x6a2a1a, weapon: 'bow' },
  phikiem: { skin: SK, cloth: 0x4a7a4a, pants: 0x1f3a28, armor: 0xe8f0e0, hat: 'wrap', hatColor: 0x2f7a4a, weapon: 'sword', wc: 0xe8fff0, robe: 0x4a7a4a },
  phiky: { skin: SK, cloth: 0x4a5a8a, pants: 0x2a3250, armor: 0xb8c0d4, hat: 'helm', hatColor: 0x8a96aa, weapon: 'lance', mount: { body: 0x3a3a46, mane: 0xe8e8f0 } },
  kimcang: { skin: 0xe8c860, cloth: 0xe0b020, pants: 0x8a5a10, armor: 0xffd34d, hat: 'bald', hatColor: 0xe8c860, weapon: 'fist', wc: 0xffe066, halo: 0xffd34d, shoulders: 'pads', bulk: 1.3 },
  anhsat: { skin: SK, cloth: 0x2a1a22, pants: 0x1a1018, armor: 0x5a1a2a, hat: 'wrap', hatColor: 0x1a1a22, weapon: 'dagger', sash: 0xc02a3a },
  mehon: { skin: 0xffe3cf, cloth: 0xc05aa0, pants: 0x5a2a6a, armor: 0x8a4ab0, hat: 'scholar', hatColor: 0x6a2a7a, weapon: 'fan', wc: 0xffb0e0 },
  hanbang: { skin: 0xe8f4ff, cloth: 0xcfe8ff, pants: 0x4a7aa8, armor: 0x7ad0f0, hat: 'topknot', hatColor: 0xdff4ff, weapon: 'talisman', wc: 0x7ad0ff },
  thanluc: { skin: 0xd89060, cloth: 0xa86a3a, pants: 0x4a3a2a, armor: 0x8a5a2a, hat: 'wildhair', hatColor: 0x2a1a10, weapon: 'fist', wc: 0xffb23d, shoulders: 'fur', bulk: 1.5 },
  phuonghoangtu: { skin: SK, cloth: 0xe84a2a, pants: 0x6a1a10, armor: 0xffb02a, hat: 'flame', hatColor: 0xc8381a, weapon: 'sword', wc: 0xffa040, wings: 0xff8a2a },
  chieuhon: { skin: 0xd8d8e8, cloth: 0x5a3a8a, pants: 0x2a1a4a, armor: 0x7a6ad0, hat: 'mien', hatColor: 0x1a1a24, weapon: 'staff', robe: 0x5a3a8a },
  langy: { skin: SK, cloth: 0xf0f8f0, pants: 0xc8d8c8, armor: 0x57c488, hat: 'hancap', hatColor: 0x3a8a5a, weapon: 'needle', robe: 0xf0f8f0 },
  duocdong: { skin: SK, cloth: 0xc8a050, pants: 0x6a5a2a, armor: 0x9ac05a, hat: 'wrap', hatColor: 0xe8d8a0, weapon: 'jadestaff', gourd: true },
  thanhac: { skin: SK, cloth: 0xdfe8ff, pants: 0x9aaad0, armor: 0x6a8ad8, hat: 'phoenixcap', hatColor: 0xf4f8ff, weapon: 'sword', wc: 0xe8f4ff, robe: 0xdfe8ff },
  hogia: { skin: SK, cloth: 0x5a2a2a, pants: 0x2a1414, armor: 0xb0b8c8, hat: 'greathelm', hatColor: 0xc8d0dc, weapon: 'sword', shield: true, shoulders: 'spikes', bulk: 1.2 },
  lahan: { skin: 0xe0b890, cloth: 0xd06a2a, pants: 0x8a4a1a, armor: 0xf0a040, hat: 'bald', hatColor: 0xe0b890, weapon: 'fist', wc: 0xffb23d, robe: 0xd06a2a, bulk: 1.1 },
  lienchau: { skin: SK, cloth: 0x3a5a3a, pants: 0x22331f, armor: 0x8a9a5a, hat: 'hancap', hatColor: 0x2a4a2a, weapon: 'crossbow', shoulders: 'pads' },
  daodong: { skin: SK, cloth: 0xf4f4f8, pants: 0xd0d4e8, armor: 0x8ab0f0, hat: 'bun', hatColor: 0x1a1a22, weapon: 'whisk', robe: 0xf4f4f8 },

  // tướng đợt mới: Tam Quốc
  // tướng đợt mới: Kim Dung
  // tướng đợt mới: Tây Du Ký

  // quái thú đợt mới (dáng người)
  // ── tướng đợt mới: mỗi người một dáng riêng (áo dài, giáp vai, cánh, hào quang, vũ khí độc nhất)
  liubei: { skin: SK, cloth: 0xe8c030, pants: 0x8a6a1a, armor: 0x2f8a4a, hat: 'hancap', hatColor: 0x2a2a34, weapon: 'twinblade', robe: 0xe8c030, beard: { color: 0x2a1a1a, len: 5 }, bulk: 1.05 },
  dienvi: { skin: 0xd09060, cloth: 0x8a6a4a, pants: 0x3a2a1a, armor: 0x6a4a2a, hat: 'wildhair', hatColor: 0x1a1a1a, weapon: 'dualaxe', shoulders: 'fur', bulk: 1.5 },
  hauchu: { skin: 0xd89060, cloth: 0xe08a2a, pants: 0x5a3a1a, armor: 0xd89060, hat: 'bald', hatColor: 0xd89060, weapon: 'hammer', stripes: 0x3a1a0a, bulk: 1.6 },
  truonglieu: { skin: SK, cloth: 0x4a2a6a, pants: 0x2a1a3e, armor: 0x8a8aa8, hat: 'ponytail', hatColor: 0x14141c, weapon: 'halberd', mount: { body: 0x3a3a4a, mane: 0x14141c }, shoulders: 'spikes', cape: true },
  hahaudon: { skin: 0xc89070, cloth: 0x1f3a6a, pants: 0x14243e, armor: 0xd9a24a, hat: 'warcap', hatColor: 0x3a4a6a, weapon: 'crescent', patch: true, shoulders: 'pads', cape: true, bulk: 1.25 },
  hoangcai: { skin: 0xd09a70, cloth: 0xd84a1a, pants: 0x4a1a0a, armor: 0x2a2a2a, hat: 'flame', hatColor: 0x3a2a2a, weapon: 'whip', sash: 0xffd34d, shoulders: 'pads', cape: true, bulk: 1.15 },
  bangthong: { skin: 0xd8b890, cloth: 0x6a7a4a, pants: 0x3a4a2a, armor: 0x8a9a5a, hat: 'phoenixcap', hatColor: 0x4a5a3a, weapon: 'brush', wc: 0x7ae8c0, robe: 0x6a7a4a, beard: { color: 0x2a2a1a, len: 9 } },
  dieuthuyen: { skin: 0xffe3cf, cloth: 0xf08ab0, pants: 0xffd0e0, armor: 0xffb6cf, hat: 'fengguan', hatColor: 0xff9ecb, weapon: 'ribbon', wc: 0xff6a9a, robe: 0xf08ab0 },
  hoangdung: { skin: 0xffe3cf, cloth: 0xe8e060, pants: 0xb0c850, armor: 0x7ac85a, hat: 'ponytail', hatColor: 0x2a1a22, weapon: 'jadestaff', sash: 0x3a9a3a },
  hongthatcong: { skin: 0xe0b890, cloth: 0x9a8a5a, pants: 0x5a4a30, armor: 0x7a6a3a, hat: 'wrap', hatColor: 0xb8a878, weapon: 'pole', gourd: true, beard: { color: 0xd8d8d8, len: 16 }, sash: 0xc89a3a, bulk: 1.12 },
  doanduy: { skin: SK, cloth: 0xf6f8ff, pants: 0xc8d4ec, armor: 0xbfe8ff, hat: 'guan', hatColor: 0x6ac8ff, weapon: 'qi', wc: 0x7ae8ff, robe: 0xf6f8ff },
  nhamdoanhdoanh: { skin: 0xffe3cf, cloth: 0x2a8a6a, pants: 0x145a44, armor: 0x7ad8b0, hat: 'longhair', hatColor: 0x3ad89a, weapon: 'guqin', wc: 0x7affc0, robe: 0x2a8a6a },
  hoangduocsu: { skin: 0xe8d0b0, cloth: 0x2a3a7a, pants: 0x141e48, armor: 0x5ad8a0, hat: 'straw', hatColor: 0x3a8a8a, weapon: 'flute', robe: 0x2a3a7a, beard: { color: 0x2a2a2a, len: 10 } },
  modungphuc: { skin: SK, cloth: 0x7a3aa8, pants: 0x3a1a5a, armor: 0xd9a24a, hat: 'wushamao', hatColor: 0x2a1a4a, weapon: 'sword', wc: 0xe8d0ff, robe: 0x7a3aa8 },
  trubatgioi: { skin: 0xf0a0a8, cloth: 0x9a8a6a, pants: 0x4a3a2a, armor: 0x7a6a8a, hat: 'pig', hatColor: 0xf0a0a8, weapon: 'rake', bulk: 1.5 },
  duongtang: { skin: SK, cloth: 0xd23a2a, pants: 0xf0c060, armor: 0xf0b030, hat: 'pilu', hatColor: 0xffd34d, weapon: 'khakkhara', robe: 0xd23a2a, sash: 0xf0b030 },
  thietphien: { skin: 0xffe3cf, cloth: 0xe03030, pants: 0x8a1a22, armor: 0xffa05a, hat: 'bun', hatColor: 0x2a1a22, weapon: 'bananafan', robe: 0xe03030 },
  kimsidieu: { skin: 0xd8a860, cloth: 0xe0a020, pants: 0x6a3a10, armor: 0xffd34d, hat: 'eagle', hatColor: 0xc88a2a, weapon: 'halberd', wings: 0xffc030, shoulders: 'pads', bulk: 1.25 },
  diatang: { skin: 0xf0d8b0, cloth: 0x2a8a5a, pants: 0x1a5a3a, armor: 0xe8d060, hat: 'dizang', hatColor: 0xffd34d, weapon: 'pearl', halo: 0xffe28a, robe: 0x2a8a5a, sash: 0xe8d060 },
  laoquan: { skin: 0xf0d8b8, cloth: 0xf6f2e0, pants: 0xd0c8a8, armor: 0xe8c860, hat: 'taoistcrown', hatColor: 0xe8c030, weapon: 'whisk', robe: 0xf6f2e0, beard: { color: 0xf4f4f4, len: 22 }, halo: 0xbfe8ff },
  bachcot: { skin: 0xf0ecd8, cloth: 0xe8e2cc, pants: 0xcfc8b0, armor: 0xbfb89c, hat: 'horns', hatColor: 0xf0ecd8, weapon: 'dagger', hair: 0xd8d0b8 },
  nguudau: { skin: 0x7a5a3a, cloth: 0x2a2a38, pants: 0x1a1a24, armor: 0x4a4a5a, hat: 'bullhorns', hatColor: 0xf0e0b8, weapon: 'axe', beard: { color: 0x2a1410, len: 5 }, bulk: 1.3 },
  madien: { skin: 0xb89a78, cloth: 0x1f2030, pants: 0x12121c, armor: 0x3a3a52, hat: 'blackhelm', hatColor: 0x2c2c3a, weapon: 'serpent', beard: { color: 0x3a2a1a, len: 14 } },
  cuongthi: { skin: 0x9ab89a, cloth: 0x2a4a5a, pants: 0x1a2a34, armor: 0x1f3a4a, hat: 'scholar', hatColor: 0x1a1a24, weapon: 'talisman', bulk: 1.1 },
  moctinh: { skin: 0x7a5a3a, cloth: 0x4a7a3a, pants: 0x3a2a1a, armor: 0x6a4a2a, hat: 'bald', hatColor: 0x7a5a3a, weapon: 'staff', beard: { color: 0x4a8a3a, len: 10 }, bulk: 1.5 },
};

// ───────────────────────── vũ khí ─────────────────────────
// 'swing': vẽ hướng lên (-y), 'thrust': vẽ hướng +x
type Mode = 'swing' | 'thrust' | 'bow' | 'cast' | 'hold';

/** xoay một dãy điểm (x,y,x,y...) quanh gốc: dựng vũ khí nghiêng nhiều thanh */
const rotPts = (ang: number) => (pts: number[]) => {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const out: number[] = [];
  for (let i = 0; i < pts.length; i += 2) out.push(pts[i] * c - pts[i + 1] * s, pts[i] * s + pts[i + 1] * c);
  return out;
};

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
    case 'twinblade':
      // Lưu Bị: song kiếm
      for (const [ang, col] of [[-0.38, 0xe8f0ff], [0.42, 0xffe9a0]] as const) {
        const f = rotPts(ang);
        poly(w, f([-1.7, -3, 1.7, -3, 1.7, 6, -1.7, 6]), 0x2a2430);
        poly(w, f([-5.2, -5.8, 5.2, -5.8, 5.2, -3, -5.2, -3]), GOLD);
        poly(w, f([-2.8, -5.8, 2.8, -5.8, 0, -36]), col);
      }
      return { g: w, mode: 'swing', rest: 0.35 };
    case 'dualaxe':
      // Điển Vi: song thủ kích
      for (const ang of [-0.5, 0.5]) {
        const f = rotPts(ang);
        poly(w, f([-1.4, -26, 1.4, -26, 1.4, 10, -1.4, 10]), 0x6a4a2a);
        poly(w, f([0.7, -28, 12, -35, 13, -16, 0.7, -21]), 0xcfd6e2);
        poly(w, f([-0.7, -28, -11, -33, -11, -17, -0.7, -21]), 0xa9b2c2);
      }
      return { g: w, mode: 'swing', rest: 0.3 };
    case 'hammer':
      rrect(w, -1.9, -30, 3.8, 46, 1.4, 0x6a4a2a);
      rrect(w, -10, -46, 20, 17, 4, 0x8a8a9a);
      rrect(w, -10, -42, 20, 3, 1, 0x4a4a58);
      rrect(w, -10, -34, 20, 3, 1, 0x4a4a58);
      for (const dx of [-6, 0, 6]) poly(w, [dx - 2, -46, dx, -52, dx + 2, -46], 0xcfd6e2, 1);
      return { g: w, mode: 'swing', rest: 0.25 };
    case 'whip':
      // Hoàng Cái: thiết tiên nhiều đốt
      rrect(w, -1.6, -3, 3.2, 16, 1.2, 0x5a2a2a);
      for (let i = 0; i < 6; i++) rrect(w, -2.4, -6 - i * 5.5, 4.8, 4.4, 1.4, i % 2 ? 0x8a8a98 : 0xc0c0cc);
      poly(w, [-3, -40, 3, -40, 5, -48, 0, -52, -5, -48], 0xd23a3a, 1);
      return { g: w, mode: 'swing', rest: 0.3 };
    case 'crescent':
      // Hạ Hầu Đôn: phương thiên họa kích lưỡi trăng khuyết
      rrect(w, -9, -1.8, 46, 3.6, 1.3, 0x3a3a46);
      poly(w, [34, -2.4, 36, -16, 46, -22, 58, -16, 50, -10, 44, -4, 40, -2.4], 0xe0e6f0);
      poly(w, [34, 2.4, 36, 16, 46, 22, 58, 16, 50, 10, 44, 4, 40, 2.4], 0xe0e6f0);
      poly(w, [37, -2.4, 64, 0, 37, 2.4], 0xd0d8e8, 1.2);
      w.circle(33, 0, 3).fill(0xd23a3a);
      return { g: w, mode: 'thrust', rest: -0.12 };
    case 'brush':
      // Bàng Thống: bút lông bày mưu
      rrect(w, -1.5, -32, 3, 42, 1.2, 0x7a4a2a);
      poly(w, [-3.4, -32, 3.4, -32, 1.6, -52, -1.6, -52], 0x1a1a22);
      w.circle(0, -46, 9).fill({ color: wc ?? 0xffd34d, alpha: 0.2 });
      return { g: w, mode: 'cast', rest: 0.1 };
    case 'ribbon': {
      // Điêu Thuyền: dải lụa múa
      const c = wc ?? 0xff9ecb;
      for (const [k, col] of [[0, c], [1, lighter(c, 0.4)]] as const) {
        w.moveTo(0, 0).bezierCurveTo(10 + k * 3, -10, -10, -24, 8 + k * 2, -38).stroke({ width: 4.2 - k * 2, color: col, cap: 'round' });
      }
      w.circle(8, -38, 3).fill(c);
      return { g: w, mode: 'cast', rest: 0.1 };
    }
    case 'jadestaff':
      // Hoàng Dung: Đả Cẩu Bổng ngọc bích
      rrect(w, -1.6, -36, 3.2, 50, 1.4, 0x2fb078);
      for (const y of [-30, -18, -6]) rrect(w, -2.4, y, 4.8, 2.6, 1, 0x1a7a4e);
      w.circle(0, -40, 8).fill({ color: 0x7affc0, alpha: 0.28 });
      poly(w, [-3, -36, 0, -48, 3, -36], 0x7affc0, 1);
      return { g: w, mode: 'swing', rest: 0.3 };
    case 'qi': {
      // Đoàn Dự: Lục Mạch Thần Kiếm, chỉ lực bắn ra các luồng kiếm khí
      const c = wc ?? 0x7ae8ff;
      w.circle(2, -2, 10).fill({ color: c, alpha: 0.18 });
      for (let i = -2; i <= 3; i++) {
        const a = -0.5 + i * 0.22;
        w.moveTo(3, -2).lineTo(3 + Math.cos(a) * 28, -2 + Math.sin(a) * 28).stroke({ width: 2.4, color: c, alpha: 0.85, cap: 'round' });
        w.moveTo(3, -2).lineTo(3 + Math.cos(a) * 28, -2 + Math.sin(a) * 28).stroke({ width: 1, color: 0xffffff, cap: 'round' });
      }
      ball(w, 2, -2, 3.4, c);
      return { g: w, mode: 'cast', rest: 0 };
    }
    case 'guqin':
      rrect(w, -6, -12, 30, 8, 3, 0x5a3a22);
      rrect(w, -6, -12, 30, 2.4, 1.2, 0x8a5a32);
      for (let i = 0; i < 4; i++) w.moveTo(-4, -10.4 + i * 1.5).lineTo(22, -10.4 + i * 1.5).stroke({ width: 0.7, color: 0xf0e8c0 });
      for (const [x, y] of [[4, -18], [12, -26], [20, -20]] as const) w.circle(x, y, 2).fill({ color: wc ?? 0x7affc0, alpha: 0.7 });
      return { g: w, mode: 'cast', rest: 0.1 };
    case 'flute':
      rrect(w, -3, -2, 36, 3.6, 1.6, 0x3ad89a);
      for (const x of [8, 14, 20, 26]) w.circle(x, -0.2, 1).fill(0x145a3a);
      rrect(w, -3, -2.6, 3, 4.8, 1, GOLD);
      w.circle(36, -0.2, 6).fill({ color: 0x7affc0, alpha: 0.25 });
      return { g: w, mode: 'cast', rest: -0.3 };
    case 'rake':
      // Trư Bát Giới: cửu xỉ đinh ba
      rrect(w, -9, -1.7, 42, 3.4, 1.4, 0x8a6a42);
      rrect(w, 30, -10, 5, 20, 1.6, 0xb0b8c8);
      for (const y of [-8, -4, 0, 4, 8]) poly(w, [35, y - 1.3, 46, y, 35, y + 1.3], 0xe0e8f4, 0.8);
      return { g: w, mode: 'thrust', rest: -0.12 };
    case 'khakkhara':
      // tích trượng của nhà sư
      rrect(w, -1.6, -40, 3.2, 54, 1.4, 0x9a7440);
      w.circle(0, -48, 8).stroke({ width: 2.4, color: GOLD });
      w.circle(0, -48, 3).fill(0xff5a3a);
      for (const dx of [-8, 8]) w.circle(dx, -44, 2.6).stroke({ width: 1.6, color: GOLD });
      rrect(w, -3, -40, 6, 3, 1, GOLD);
      return { g: w, mode: 'swing', rest: 0.2 };
    case 'bananafan':
      rrect(w, -1.4, -2, 2.8, 12, 1, 0x6a4a2a);
      w.moveTo(0, -4).bezierCurveTo(-20, -14, -18, -40, 0, -52).bezierCurveTo(18, -40, 20, -14, 0, -4).fill(0x3ac060).stroke({ width: 1.6, color: 0x1a7a38 });
      for (const a of [-0.5, -0.25, 0, 0.25, 0.5]) w.moveTo(0, -4).lineTo(Math.sin(a) * 18, -4 - Math.cos(a) * 44).stroke({ width: 0.9, color: 0x1a7a38 });
      return { g: w, mode: 'cast', rest: 0.25 };
    case 'pearl':
      w.circle(0, -12, 14).fill({ color: 0xfff0a0, alpha: 0.25 });
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        w.moveTo(Math.cos(a) * 8, -12 + Math.sin(a) * 8).lineTo(Math.cos(a) * 14, -12 + Math.sin(a) * 14).stroke({ width: 1.4, color: 0xffe066 });
      }
      ball(w, 0, -12, 6.5, 0xfff6c0);
      return { g: w, mode: 'cast', rest: 0.1 };
    case 'whisk':
      // phất trần của Lão Quân
      rrect(w, -1.3, -4, 2.6, 20, 1, 0x9a7440);
      for (let i = -4; i <= 4; i++) w.moveTo(0, -4).bezierCurveTo(i * 2.4, -14, i * 4.4, -26, i * 3.6, -36).stroke({ width: 1.1, color: 0xffffff, alpha: 0.95, cap: 'round' });
      ball(w, 0, -4, 2.6, 0xe8c860);
      return { g: w, mode: 'cast', rest: 0.2 };
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
  lionhelm: {
    // Mã Siêu: tóc đen xõa bay sau gáy, mũ vàng đầu sư tử với bờm gai và chùm tua đỏ dài
    back: (h, st) => {
      poly(h, [-R + 2, -6, -R - 12, 0, -R - 20, 14, -R - 10, 12, -R - 14, 24, -R - 3, 16, -R + 2, 9], st.hair ?? 0x1c1620);
    },
    front: (h, st) => {
      dome(h, 0, -0.5, R + 1.6, st.hatColor);
      rrect(h, -R - 1.5, -4.2, 2 * R + 3, 4, 1.6, 0xc8282a);
      ball(h, 7.5, -4.6, 2.1, 0xfff0b0);
      // bờm sư tử: quạt gai vàng dựng trên đỉnh mũ
      for (let i = 0; i < 5; i++) {
        const bx = -7 + i * 3.6;
        poly(h, [bx - 2.2, -R + 1, bx - 1 - (i - 2) * 1.4, -R - 10 + Math.abs(i - 2) * 1.8, bx + 2.2, -R + 1], i % 2 ? lighter(st.hatColor, 0.2) : st.hatColor, 1);
      }
      // chùm tua đỏ buông dài ra sau
      h.moveTo(-3, -R - 1).quadraticCurveTo(-14, -R - 12, -R - 16, -R + 8).stroke({ width: 5.2, color: lineOf(0xc8282a), cap: 'round' });
      h.moveTo(-3, -R - 1).quadraticCurveTo(-14, -R - 12, -R - 16, -R + 8).stroke({ width: 3.2, color: 0xe03a3a, cap: 'round' });
    },
  },
  lotus: {
    // Quan Âm: khăn voan trắng buông sau lưng, mão sen vàng trên tóc đen
    back: (h, st) => {
      poly(h, [-R + 2, -7, -R - 9, 3, -R - 13, 24, -R - 2, 19, -R + 3, 8], st.hatColor);
    },
    front: (h, st) => {
      dome(h, 0, 0, R + 1.2, st.hair ?? 0x1c1620);
      rrect(h, -R - 0.5, -4.4, 2 * R + 1, 3.6, 1.4, GOLD);
      for (const dx of [-6, 0, 6]) poly(h, [dx - 3, -R + 1, dx, -R - 9 + Math.abs(dx) * 0.3, dx + 3, -R + 1], 0xffe28a, 1);
      ball(h, 0, -6.2, 2.1, 0x7ae0b0);
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
  hancap: {
    // Lưu Bị: mũ cao của vua Hán, tua đỏ rủ bên tai
    back: (h) => poly(h, [-R + 2, -4, -R - 6, 8, -R - 2, 14, -R + 3, 6], 0x1a1a22),
    front: (h, st) => {
      dome(h, 0, 0, R + 0.8, 0x1a1a22);
      rrect(h, -9, -R - 12, 18, 14, 3, st.hatColor);
      rrect(h, -9.5, -R - 1.5, 19, 3.2, 1.2, GOLD);
      poly(h, [-5, -R - 12, 0, -R - 16, 5, -R - 12], GOLD, 1);
      for (const x of [-R + 1, R - 1]) {
        const ex = x + (x < 0 ? -2 : 2);
        h.moveTo(x, -2).lineTo(ex, 12).stroke({ width: 1.4, color: 0xd23a3a });
        ball(h, ex, 13, 1.8, 0xd23a3a);
      }
    },
  },
  wildhair: {
    // Điển Vi: tóc dựng ngược, khăn đỏ quấn trán
    back: (h, st) => poly(h, [-R + 1, -4, -R - 11, 3, -R - 6, 10, -R - 14, 16, -R + 2, 12], st.hatColor),
    front: (h, st) => {
      dome(h, 0, 0, R + 1.2, st.hatColor);
      for (let i = 0; i < 6; i++) {
        const bx = -9 + i * 3.6;
        poly(h, [bx - 2.6, -R + 1, bx + (i - 2.5) * 1.2, -R - 8 - (i % 2) * 4, bx + 2.6, -R + 1], st.hatColor, 1);
      }
      rrect(h, -R - 0.5, -4.6, 2 * R + 1, 3.8, 1.4, 0xd23a3a);
    },
  },
  ponytail: {
    // tóc buộc cao, đuôi ngựa dài tung bay
    back: (h, st) => {
      h.moveTo(-R + 2, -8).bezierCurveTo(-R - 14, -18, -R - 20, 2, -R - 12, 22).stroke({ width: 6.6, color: lineOf(st.hatColor), cap: 'round' });
      h.moveTo(-R + 2, -8).bezierCurveTo(-R - 14, -18, -R - 20, 2, -R - 12, 22).stroke({ width: 4.4, color: st.hatColor, cap: 'round' });
    },
    front: (h, st, a) => {
      dome(h, 0, 0, R + 1, st.hatColor);
      poly(h, [-R, 0, -R + 1, 8, -R + 5, 2], st.hatColor);
      rrect(h, -R - 0.5, -4.4, 2 * R + 1, 3, 1.2, a);
      ball(h, -R + 2, -9, 3, a);
    },
  },
  phoenixcap: {
    // Bàng Thống: mũ Phượng Sồ có lông phượng cong ra sau
    front: (h, st) => {
      dome(h, 0, 0, R, 0x2d2f3e);
      poly(h, [-8, -R + 1, -6, -R - 14, 4, -R - 12, 8, -R + 1], st.hatColor, 1.4);
      rrect(h, -9, -R - 2, 18, 2.6, 1, GOLD);
      h.moveTo(2, -R - 12).quadraticCurveTo(-4, -R - 30, -R - 14, -R - 22).stroke({ width: 4.6, color: lineOf(0x2fb8a0), cap: 'round' });
      h.moveTo(2, -R - 12).quadraticCurveTo(-4, -R - 30, -R - 14, -R - 22).stroke({ width: 2.8, color: 0x2fb8a0, cap: 'round' });
      h.moveTo(2, -R - 12).quadraticCurveTo(-4, -R - 30, -R - 14, -R - 22).stroke({ width: 0.9, color: GOLD, cap: 'round' });
    },
  },
  fengguan: {
    // phượng quan của mỹ nhân: hai cánh phượng, tua rủ
    back: (h) => poly(h, [-R + 2, -6, -R - 8, 6, -R - 11, 28, -R - 1, 22, -R + 3, 8], 0x1c1620),
    front: (h, st) => {
      dome(h, 0, 0, R + 1.2, 0x1c1620);
      rrect(h, -R - 0.5, -5, 2 * R + 1, 3.4, 1.3, GOLD);
      poly(h, [-9, -R + 1, -6, -R - 8, -2, -R + 1], st.hatColor, 1);
      poly(h, [2, -R + 1, 6, -R - 8, 9, -R + 1], st.hatColor, 1);
      ball(h, 0, -R - 3, 3, 0xff5a8a);
      for (const dx of [-8, 8]) {
        h.moveTo(dx, -5).lineTo(dx * 1.1, 8).stroke({ width: 1, color: GOLD });
        ball(h, dx * 1.1, 9, 1.8, 0xff9ecb);
      }
    },
  },
  guan: {
    // thư sinh quý tộc: búi tóc đội kim quan, dải lụa buông sau
    back: (h, st) => {
      for (const k of [0, 1]) h.moveTo(-R + 2, -8).bezierCurveTo(-R - 10, -6 + k * 6, -R - 14, 10 + k * 6, -R - 8, 26 + k * 4).stroke({ width: 3, color: st.hatColor, cap: 'round' });
    },
    front: (h, st) => {
      dome(h, 0, 0, R + 0.8, 0x1a1a26);
      ball(h, -1, -R - 2, 4, 0x1a1a26);
      rrect(h, -5, -R - 5, 8, 5, 2, GOLD);
      rrect(h, -R - 0.5, -4.2, 2 * R + 1, 3.2, 1.2, st.hatColor);
      h.moveTo(-6, -R - 3).lineTo(6, -R - 1).stroke({ width: 1.6, color: 0xe8fff4 });
    },
  },
  wushamao: {
    // Mộ Dung Phục: mũ quan có hai cánh dài ngang vai
    front: (h, st) => {
      dome(h, 0, 0, R, 0x1a1a26);
      rrect(h, -R - 1, -R - 9, 2 * R + 2, 11, 2.5, st.hatColor);
      rrect(h, -R - 1, -R - 1, 2 * R + 2, 3, 1, GOLD);
      poly(h, [-R - 22, -R - 6, -R, -R - 8, -R, -R - 4, -R - 22, -R - 2], st.hatColor, 1.2);
      poly(h, [R, -R - 8, R + 22, -R - 6, R + 22, -R - 2, R, -R - 4], st.hatColor, 1.2);
      ball(h, 0, -R - 8, 2, GOLD);
    },
  },
  pig: {
    // Trư Bát Giới: tai heo cụp, mõm hồng
    back: (h, st) => poly(h, [-R + 2, -6, -R - 8, -2, -R - 6, 10, -R + 2, 4], darker(st.hatColor, 0.15)),
    front: (h, st) => {
      poly(h, [-R + 2, -6, -R - 7, -4, -R - 4, 9, -R + 4, 3], darker(st.hatColor, 0.1), 1.2);
      poly(h, [-2, -R + 1, 2, -R - 9, 8, -R + 2], st.hatColor, 1.2);
      h.ellipse(R + 1.5, 6.5, 5.2, 3.8).fill(lighter(st.hatColor, 0.15)).stroke({ width: 1.2, color: lineOf(st.hatColor) });
      h.circle(R, 6.5, 0.9).fill(0x6a2a2a);
      h.circle(R + 3, 6.5, 0.9).fill(0x6a2a2a);
      poly(h, [R - 1, 9, R + 1, 13, R + 3, 9], 0xfff6e0, 0.8);
    },
  },
  pilu: {
    // Đường Tăng: mũ Ngũ Phật nhọn
    front: (h, st) => {
      rrect(h, -R - 0.5, -6, 2 * R + 1, 4, 1.4, GOLD);
      for (let i = 0; i < 5; i++) {
        const bx = -8 + i * 4;
        const hgt = i === 2 ? 16 : i % 2 ? 10 : 13;
        poly(h, [bx - 2.6, -6, bx, -6 - hgt, bx + 2.6, -6], i % 2 ? st.hatColor : 0xf0a030, 1);
        ball(h, bx, -6 - hgt + 3, 1.2, 0xd23a3a);
      }
    },
  },
  eagle: {
    // Kim Sí Đại Bàng: mũ ưng, lông cánh vàng sau gáy
    back: (h) => {
      for (let i = 0; i < 4; i++) poly(h, [-R + 1, -6 + i * 2, -R - 12 - i * 3, -8 + i * 5, -R - 4, i * 5], i % 2 ? 0xffd34d : 0x8a5a1a, 1);
    },
    front: (h, st) => {
      dome(h, 0, 0, R + 1.5, st.hatColor);
      poly(h, [-R, -3, R + 2, -3, R + 7, 4, 2, -1], darker(st.hatColor, 0.2), 1);
      poly(h, [-2, -R, 2, -R - 11, 6, -R + 2], 0xd23a2a, 1);
      poly(h, [2, -R, 7, -R - 9, 9, -R + 3], 0xffd34d, 1);
    },
  },
  dizang: {
    // Địa Tạng Vương: mũ Ngũ Phương Phật cổ, đầu trọc
    front: (h, st) => {
      rrect(h, -R - 0.5, -5.5, 2 * R + 1, 3.6, 1.3, GOLD);
      for (const dx of [-7, 0, 7]) {
        h.ellipse(dx, -R - 3 + Math.abs(dx) * 0.2, 4.2, 7).fill(0xffe28a).stroke({ width: 1.3, color: 0xa8741a });
        ball(h, dx, -R - 3, 1.3, 0x2ec88a);
      }
      ball(h, 0, -R - 12, 2.6, 0xff5a3a);
      void st;
    },
  },
  taoistcrown: {
    // Thái Thượng Lão Quân: mão liên hoa vàng cao, tóc bạc xõa sau lưng
    back: (h) => poly(h, [-R + 2, -6, -R - 8, 4, -R - 12, 26, -R - 1, 20, -R + 3, 6], 0xf4f4f4),
    front: (h, st) => {
      dome(h, 0, 0, R, 0xf4f4f4);
      rrect(h, -7, -R - 14, 14, 16, 3, st.hatColor);
      for (const dx of [-5, 0, 5]) poly(h, [dx - 3, -R - 14, dx, -R - 20 + Math.abs(dx) * 0.4, dx + 3, -R - 14], GOLD, 1);
      rrect(h, -7, -R - 4, 14, 2.6, 1, 0xd23a2a);
      ball(h, 0, -R - 9, 2.4, 0x2a2a30);
    },
  },
  wrap: {
    // Hồng Thất Công: khăn rách quấn đầu, hai đuôi khăn bay
    back: (h, st) => {
      poly(h, [-R + 1, -8, -R - 9, -4, -R - 14, 6, -R - 5, 0, -R + 2, -2], st.hatColor);
      poly(h, [-R + 1, -6, -R - 8, 4, -R - 9, 14, -R - 2, 6], darker(st.hatColor, 0.2));
    },
    front: (h, st) => {
      dome(h, 0, 0, R + 1.3, st.hatColor);
      rrect(h, -R - 0.5, -4.2, 2 * R + 1, 3.4, 1.3, darker(st.hatColor, 0.25));
      ball(h, -2, -R - 1, 3.2, st.hatColor);
      h.circle(5, -R + 3, 1.4).fill(0xc8a050);
    },
  },
  warcap: {
    // Hạ Hầu Đôn: mũ chiến có chỏm vàng, tua đỏ dài
    front: (h, st) => {
      dome(h, 0, 0, R + 1.6, st.hatColor);
      rrect(h, -R - 1.5, -4, 2 * R + 3, 4, 1.6, GOLD);
      poly(h, [-3, -R + 1, 0, -R - 8, 3, -R + 1], GOLD, 1);
      h.moveTo(0, -R - 8).quadraticCurveTo(-8, -R - 16, -R - 12, -R - 4).stroke({ width: 4.4, color: lineOf(0xc8282a), cap: 'round' });
      h.moveTo(0, -R - 8).quadraticCurveTo(-8, -R - 16, -R - 12, -R - 4).stroke({ width: 2.8, color: 0xe03a3a, cap: 'round' });
    },
  },
  flame: {
    // Hoàng Cái: mũ giáp có mào lửa rực
    front: (h, st) => {
      dome(h, 0, 0, R + 1.4, st.hatColor);
      rrect(h, -R - 1, -4.2, 2 * R + 2, 3.6, 1.4, GOLD);
      for (let i = 0; i < 5; i++) {
        const bx = -8 + i * 4;
        const hgt = i === 2 ? 20 : i % 2 ? 12 : 16;
        poly(h, [bx - 3, -R + 1, bx + (i - 2) * 1.5, -R - hgt, bx + 3, -R + 1], i % 2 ? 0xff7a1a : 0xff4a1a, 1);
      }
      poly(h, [-2, -R + 1, 0, -R - 12, 2, -R + 1], 0xffe27a, 0.8);
    },
  },
  longhair: {
    // Nhậm Doanh Doanh: tóc dài thả, dải lụa và hoa cài đầu
    back: (h) => poly(h, [-R + 1, -8, -R - 8, 2, -R - 12, 30, -R + 2, 26, -R + 4, 8], 0x14141c),
    front: (h, st) => {
      dome(h, 0, 0, R + 1.2, 0x14141c);
      poly(h, [-R + 1, -1, -R + 2, 10, -R + 6, 2], 0x14141c);
      poly(h, [R - 2, -3, R, 4, R - 4, 0], 0x14141c);
      rrect(h, -R - 0.5, -4.6, 2 * R + 1, 3, 1.2, st.hatColor);
      ball(h, 5, -R - 1, 3, 0xff9ecb);
      ball(h, 5, -R - 1, 1.2, 0xffffff);
    },
  },
};

function drawHead(parent: Container, st: Style, accent: number, boss: boolean) {
  const hat = HATS[st.hat];
  if (st.halo) {
    const halo = g();
    halo.circle(-1, -3, 18).fill({ color: st.halo, alpha: 0.22 }).stroke({ width: 2.2, color: st.halo, alpha: 0.9 });
    parent.addChild(halo);
  }
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
    const angry = boss || st.hat === 'horns' || st.hat === 'blackhelm' || st.hat === 'guanyu' || st.hat === 'warcap' || st.hat === 'wildhair' || st.hat === 'eagle';
    f.moveTo(2, angry ? -0.2 : -0.8).lineTo(5.6, angry ? 0.8 : -1).stroke({ width: 1.2, color: 0x2a1a1a, cap: 'round' });
    f.moveTo(7.4, angry ? 0.8 : -1).lineTo(11, angry ? -0.8 : -0.8).stroke({ width: 1.2, color: 0x2a1a1a, cap: 'round' });
    if (st.patch) {
      f.moveTo(-R + 1, -2).lineTo(6.2, 0.4).stroke({ width: 1.3, color: 0x120a14 });
      f.ellipse(8.8, 3, 3.4, 4.2).fill(0x120a14).stroke({ width: 0.8, color: 0x4a3a3a });
    }
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
  /** kẻ cưỡi mây (Tôn Ngộ Không): hiện đám mây Cân Đẩu Vân dưới chân khi đang ở lane sông */
  setCloud?(on: boolean): void;
}

/** Dựng một người lính (hoặc tướng) vào `into`; trả về hàm animate */
/** thuyền dưới chân thủy quân: `back` (cột buồm) vẽ sau lưng người, `front` (mạn thuyền) che chân */
function buildBoat(kind: 'skiff' | 'junk' | 'cannon', accent: number) {
  const back = new Container();
  const front = new Container();
  const oars: Graphics[] = [];
  const hullC = 0x8a5a30;
  const L = kind === 'skiff' ? 22 : kind === 'junk' ? 31 : 29;
  if (kind !== 'skiff') {
    const mast = g();
    mast.rect(-1.6, -50, 3.2, 44).fill(0x5a3a1c);
    const sailC = kind === 'junk' ? 0xe8dcc0 : 0xcfc4a8;
    poly(mast, [1.6, -48, 22, -42, 21, -16, 1.6, -12], sailC, 1.2);
    for (const y of [-38, -28, -19]) mast.moveTo(1.6, y).lineTo(21.5, y + 2).stroke({ width: 1, color: darker(sailC, 0.35), alpha: 0.8 });
    poly(mast, [-1.6, -50, -14, -47, -1.6, -43], accent, 1);
    mast.x = -24;
    back.addChild(mast);
  }
  const hull = g();
  // thân thuyền
  poly(hull, [-L, -7, L + 4, -7, L - 6, 6, -L + 8, 6], hullC, 1.5);
  hull.poly([-L + 1, -7, L + 3, -7, L + 2, -3.5, -L + 3, -3.5]).fill({ color: 0xffffff, alpha: 0.18 });
  hull.rect(-L + 2, -1, 2 * L - 4, 2.6).fill(accent);
  if (kind === 'cannon') {
    hull.roundRect(L - 12, -14, 22, 7, 3).fill(0x3a3a46).stroke({ width: 1.4, color: 0x14141c });
    hull.circle(L - 4, -10, 3).fill(0x14141c);
  }
  if (kind === 'junk') poly(hull, [L + 4, -7, L + 11, -12, L + 4, -3], hullC, 1.2);
  front.addChild(hull);
  for (const dx of [-L * 0.45, L * 0.1]) {
    const oar = g();
    oar.moveTo(0, 0).lineTo(-6, 11).stroke({ width: 2, color: 0x6a4a2a, cap: 'round' });
    oar.ellipse(-7, 12, 3.2, 1.6).fill(0x6a4a2a);
    oar.position.set(dx, -5);
    front.addChild(oar);
    oars.push(oar);
  }
  // sóng nước quanh thân thuyền
  const wake = g();
  wake.ellipse(0, 6, L + 8, 4.2).fill({ color: 0xdff4ff, alpha: 0.28 }).stroke({ width: 1.2, color: 0xffffff, alpha: 0.5 });
  front.addChild(wake);
  return { back, front, oars, wake };
}

function buildHumanoid(def: UnitDef, side: UnitSide, accent: number, into: Container) {
  let extra = 0;
  const st = STYLES[def.id];
  const bulk = st.bulk ?? 1;
  const mounted = !!st.mount;
  const boat = st.boat ? buildBoat(st.boat, accent) : null;
  const horseLegs: Graphics[] = [];
  const rider = new Container();
  const hipY = mounted ? -13 : boat ? -6 : 0;
  if (boat) {
    into.addChild(boat.back);
    extra += 6;
  }
  if (mounted) {
    const horse = new Container();
    horse.scale.set(1.14);
    horse.addChild(drawHorse(st.mount!.body, st.mount!.mane, accent, horseLegs));
    for (const l of horseLegs) horse.addChild(l);
    into.addChild(horse);
    extra += 12;
  }
  if (['plumes', 'scholar', 'phoenixcap', 'taoistcrown', 'hancap', 'flame', 'pilu', 'eagle', 'dizang'].includes(st.hat)) extra += 8;
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

  if (boat) into.addChild(boat.front);
  const bodyC = new Container();
  rider.addChild(bodyC);

  // cánh sau lưng (Kim Sí Đại Bàng)
  let wingG: Graphics | null = null;
  if (st.wings) {
    wingG = g();
    for (const [k, c] of [[1.0, darker(st.wings, 0.25)], [0.8, st.wings], [0.55, lighter(st.wings, 0.25)]] as const) {
      poly(wingG, [0, 0, -8 * k, -30 * k, -26 * k, -40 * k, -34 * k, -26 * k, -28 * k, -10 * k, -18 * k, 2 * k], c, 1.2);
    }
    wingG.position.set(-5, -30);
    bodyC.addChild(wingG);
  }

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

  // áo dài che chân
  if (st.robe) {
    const sk = g();
    const rw = 9.5 * bulk;
    poly(sk, [-rw, -17, rw, -17, rw + 6, 0, -rw - 6, 0], st.robe, 1.4);
    poly(sk, [-rw - 5, -3.5, rw + 5, -3.5, rw + 6, 0, -rw - 6, 0], darker(st.robe, 0.25), 0.8);
    sk.moveTo(0, -17).lineTo(1, 0).stroke({ width: 1, color: darker(st.robe, 0.3), alpha: 0.6 });
    bodyC.addChild(sk);
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
  if (st.sash) poly(torso, [-tw / 2, -34, -tw / 2 + 5, -34, tw / 2, -13, tw / 2 - 5, -13], st.sash, 1);
  if (st.stripes) for (let i = 0; i < 4; i++) torso.moveTo(-tw / 2 + 3 + (i * tw) / 4, -33).lineTo(-tw / 2 + 5 + (i * tw) / 4, -22).stroke({ width: 1.8, color: st.stripes });
  if (st.gourd) {
    ball(torso, tw / 2 - 2, -12, 3.6, 0xc8382a, 4.6);
    ball(torso, tw / 2 - 2, -17, 2.2, 0xc8382a);
  }
  if (st.shoulders) {
    for (const sx of [-tw / 2 + 1, tw / 2 - 1]) {
      if (st.shoulders === 'fur') {
        ball(torso, sx, -32, 5.6, 0xf2ead8, 4.4);
        ball(torso, sx, -33.5, 3.4, 0xffffff, 2.6);
      } else {
        ball(torso, sx, -32, 6.2, lighter(st.armor, 0.12), 5);
        if (st.shoulders === 'spikes') poly(torso, [sx - 2.4, -36, sx, -45, sx + 2.4, -36], 0xd0d6e2, 1);
      }
    }
    if (st.shoulders === 'fur') rrect(torso, -tw / 2 - 1, -36, tw + 2, 5, 2.4, 0xf2ead8);
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
    if (wingG) wingG.rotation = Math.sin(clock * 3) * 0.07 - 0.05;
    if (mounted) {
      horseLegs.forEach((l, i) => (l.rotation = moving ? w * 0.7 * (i % 2 ? 1 : -1) : 0));
      rider.y = hipY + (moving ? -Math.abs(w) * 1.8 : 0);
    } else if (boat) {
      // thuyền nhấp nhô theo sóng, mái chèo khua khi di chuyển
      const bob = Math.sin(clock * (moving ? 5 : 2.2)) * (moving ? 1.6 : 1);
      rider.y = hipY + bob;
      boat.front.y = bob;
      boat.back.y = bob;
      boat.oars.forEach((o, i) => (o.rotation = moving ? Math.sin(clock * 7 + i) * 0.55 : Math.sin(clock * 2 + i) * 0.1));
      boat.wake.scale.x = 1 + (moving ? 0.06 * Math.sin(clock * 6) : 0);
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

/** quái bay lơ lửng cách mặt đất bao nhiêu px (bóng vẫn nằm dưới đất) */
export const FLY_LIFT = 46;

/** mây (hoặc bánh xe lửa) dưới chân tướng bay */
function buildFlyBase(wheels: boolean): { node: Container; tick: (clock: number) => void } {
  const node = new Container();
  const spin: Graphics[] = [];
  if (wheels) {
    for (const x of [-9, 9]) {
      const w = g();
      w.circle(0, 0, 7.5).stroke({ width: 2.6, color: 0xffb02a });
      w.circle(0, 0, 4).stroke({ width: 1.6, color: 0xff5a1a });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        w.poly([Math.cos(a) * 7.5, Math.sin(a) * 7.5, Math.cos(a + 0.35) * 12, Math.sin(a + 0.35) * 12, Math.cos(a + 0.7) * 7.5, Math.sin(a + 0.7) * 7.5]).fill({ color: 0xff7a1a, alpha: 0.85 });
      }
      w.position.set(x, -4);
      node.addChild(w);
      spin.push(w);
    }
  } else {
    const c = g();
    for (const [x, y, r] of [[-12, 0, 8], [-3, -2, 10], [8, 0, 9], [15, 2, 6]] as const) c.circle(x, y, r).fill({ color: 0xf2f6ff, alpha: 0.92 });
    c.ellipse(0, 4, 20, 4).fill({ color: 0xcfd8ee, alpha: 0.7 });
    node.addChild(c);
  }
  return {
    node,
    tick: (clock) => {
      spin.forEach((w, i) => (w.rotation = clock * (i ? 9 : -9)));
      if (!wheels) node.y = Math.sin(clock * 3) * 1.2;
    },
  };
}

export function buildUnitArt(def: UnitDef, side: UnitSide, withSquad = false, accentOverride?: number): UnitArt {
  const accent = accentOverride ?? SIDE_COLOR[side];
  if (def.kind === 'defense') {
    const d = buildDefenseArt(def, side, accent);
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
  const fly = !!def.tags?.includes('fly');
  const elite = def.kind === 'general' || def.kind === 'boss' || giant;

  const base = g();
  const naval = !!def.tags?.includes('naval');
  if (naval) base.ellipse(0, 3, 30 * sc, 8 * sc).fill({ color: 0x4aa0e0, alpha: 0.35 });
  else base.ellipse(0, 1.5, 21 * sc, 6 * sc).fill({ color: 0x000000, alpha: 0.34 });
  // vòng màu phe dưới chân: nhận ra ta/địch từ xa
  base.ellipse(0, 1.5, 17 * sc, 4.8 * sc).fill({ color: accent, alpha: 0.14 });
  base.ellipse(0, 1.5, 17 * sc, 4.8 * sc).stroke({ width: 1.6, color: accent, alpha: 0.72 });
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
  } else if (hasEngineArt(def.id)) {
    const e = buildEngine(def.id, accent);
    art.addChild(e.body);
    height = e.height * sc;
    tick = e.tick;
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
    // quái/tướng bay: đứng trên mây (Na Tra: hai bánh xe lửa)
    let cloudTick: ((clock: number) => void) | null = null;
    if (fly) {
      const fb = buildFlyBase(def.id === 'natra');
      art.addChild(fb.node);
      cloudTick = fb.tick;
    }
    // vẽ theo chiều sâu: người phía sau (y nhỏ) trước, người phía trước sau
    for (const f of followers) if (f.c.y < 0) art.addChild(f.c);
    art.addChild(mainC);
    for (const f of followers) if (f.c.y >= 0) art.addChild(f.c);
    tick = (clock, moving, atk) => {
      m.tick(clock, moving, atk);
      cloudTick?.(clock);
      for (const f of followers) f.tick(clock + f.ph, moving, atk > 0 ? Math.max(0.001, atk - 0.06 * f.ph) : 0);
    };
  }

  if (fly) height += FLY_LIFT;
  // Cân Đẩu Vân: mây chỉ hiện khi đang trên lane sông
  let setCloud: ((on: boolean) => void) | undefined;
  if (def.tags?.includes('cloud')) {
    const cb = buildFlyBase(false);
    cb.node.visible = false;
    art.addChildAt(cb.node, 0);
    const inner = tick;
    tick = (clock, moving, atk) => {
      inner(clock, moving, atk);
      if (cb.node.visible) cb.tick(clock);
    };
    setCloud = (on) => {
      cb.node.visible = on;
    };
  }

  const barW = 32;
  const hpBar = g();
  hpBar.position.set(0, -height - 8);
  root.addChild(hpBar);

  const mounted = def.id !== 'trebuchet' && !hasEngineArt(def.id) && !!STYLES[def.id]?.mount;
  const face = def.id === 'trebuchet' || hasEngineArt(def.id) ? { x: 0, y: -30 * sc } : { x: (mounted ? -3 : 1) * sc, y: (mounted ? -58 : -45) * sc - (fly ? FLY_LIFT : 0) };
  return { root, art, hpBar, height, barW, mode, baseScale: sc, face, update: tick, setCloud };
}

/** chữ cấp nhỏ "Lv n" ngay sau thanh máu (con của hpBar nên theo vị trí/scale/ẩn hiện của thanh) */
export function addLevelTag(art: UnitArt, pow: number): Text {
  const tx = new Text({ text: `Lv${levelOfPow(pow)}`, style: textStyle(8, 0xdfe6f5) });
  tx.anchor.set(0, 0.5);
  art.root.addChild(tx);
  syncLevelTag(art, tx);
  return tx;
}

/** đặt chữ cấp theo thanh máu (cùng vị trí, tỉ lệ, ẩn/hiện): Graphics không được làm cha của Text ở PixiJS 8 */
export function syncLevelTag(art: UnitArt, tx: Text) {
  const b = art.hpBar;
  tx.position.set(b.x + (art.barW / 2 + 3) * b.scale.x, b.y + 2.5 * b.scale.y);
  tx.scale.copyFrom(b.scale);
  tx.visible = b.visible;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}
