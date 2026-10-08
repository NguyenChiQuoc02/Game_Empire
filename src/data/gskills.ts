import type { UnitDef } from './units';

// ───────────── Kỹ năng mở theo cấp của TƯỚNG ─────────────
// Tướng tối đa cấp 20. Kỹ năng gốc có từ Lv1; cứ 4 cấp mở thêm 1 kỹ năng (Lv5, 9, 13, 17) → tối đa 5 kỹ năng.
// Tôn Ngộ Không còn có thêm 1 kỹ năng ĐẶC BIỆT (Phân Thân) luôn sẵn có.

export const GENERAL_MAX_LEVEL = 20;
/** cấp mở kỹ năng thứ 1..5 (kỹ năng 1 là kỹ năng gốc) */
export const SKILL_UNLOCK_LEVELS = [1, 5, 9, 13, 17];

export type GSkillId =
  | 'ironSkin' | 'fury' | 'swift' | 'regen' | 'keen' | 'lifesteal' | 'thornsAura' | 'rapid' | 'execute' | 'lastStand'
  | 'warcry' | 'guard' | 'shockwave' | 'mend' | 'bladeStorm' | 'dread';

export interface GSkill {
  id: GSkillId;
  icon: string;
  /** passive: chỉ số/hiệu ứng thường trực; active: tự thi triển theo hồi chiêu khi có địch gần */
  kind: 'passive' | 'active';
}

export const GSKILLS: Record<GSkillId, GSkill> = {
  ironSkin: { id: 'ironSkin', icon: '🛡️', kind: 'passive' },
  fury: { id: 'fury', icon: '🔥', kind: 'passive' },
  swift: { id: 'swift', icon: '💨', kind: 'passive' },
  regen: { id: 'regen', icon: '💚', kind: 'passive' },
  keen: { id: 'keen', icon: '🗡️', kind: 'passive' },
  lifesteal: { id: 'lifesteal', icon: '🩸', kind: 'passive' },
  thornsAura: { id: 'thornsAura', icon: '🌵', kind: 'passive' },
  rapid: { id: 'rapid', icon: '⚡', kind: 'passive' },
  execute: { id: 'execute', icon: '💀', kind: 'passive' },
  lastStand: { id: 'lastStand', icon: '🦁', kind: 'passive' },
  warcry: { id: 'warcry', icon: '📯', kind: 'active' },
  guard: { id: 'guard', icon: '🔰', kind: 'active' },
  shockwave: { id: 'shockwave', icon: '🌋', kind: 'active' },
  mend: { id: 'mend', icon: '✨', kind: 'active' },
  bladeStorm: { id: 'bladeStorm', icon: '🌪️', kind: 'active' },
  dread: { id: 'dread', icon: '👁️', kind: 'active' },
};

/** các con số của từng kỹ năng (sim và mô tả cùng dùng) */
export const GS = {
  ironSkin: { hp: 0.2, armor: 4 },
  fury: { dmg: 0.15 },
  swift: { speed: 0.15, dodge: 0.1 },
  regen: { rate: 0.012 },
  keen: { pierce: 0.25 },
  lifesteal: { pct: 0.12 },
  thornsAura: { reflect: 0.15 },
  rapid: { rate: 0.15 },
  execute: { below: 0.3, mul: 1.5 },
  lastStand: { below: 0.3, shield: 0.3, dmg: 1.2, speed: 1.25, sec: 5 },
  warcry: { cd: 12, range: 220, dmg: 1.18, sec: 5 },
  guard: { cd: 14, shield: 0.22, reach: 260 },
  shockwave: { cd: 10, r: 90, mul: 1.8, stun: 0.8 },
  mend: { cd: 12, r: 130, pct: 0.08, self: 0.15 },
  bladeStorm: { cd: 11, reach: 300, r: 80, mul: 2.2 },
  dread: { cd: 13, r: 200, slow: 0.35, sec: 3, mul: 0.8 },
} as const;

/** kỹ năng mở thêm của từng tướng (theo thứ tự mở: Lv5, 9, 13, 17) */
export const GENERAL_SKILLS: Record<string, GSkillId[]> = {
  duongqua: ['fury', 'ironSkin', 'shockwave', 'lastStand'],
  tieulongnu: ['rapid', 'mend', 'swift', 'keen'],
  truongphi: ['ironSkin', 'dread', 'thornsAura', 'shockwave'],
  trieuvan: ['swift', 'lifesteal', 'lastStand', 'rapid'],
  quanvu: ['fury', 'execute', 'warcry', 'ironSkin'],
  giacatluong: ['bladeStorm', 'guard', 'dread', 'keen'],
  lubo: ['fury', 'lifesteal', 'shockwave', 'execute'],
  tonngokhong: ['swift', 'rapid', 'lifesteal', 'lastStand'],
  duongtien: ['fury', 'keen', 'warcry', 'regen'],
  taothao: ['warcry', 'guard', 'execute', 'ironSkin'],
  chudu: ['dread', 'bladeStorm', 'mend', 'guard'],
  masieu: ['swift', 'execute', 'rapid', 'shockwave'],
  hoangtrung: ['keen', 'execute', 'rapid', 'bladeStorm'],
  tumayi: ['dread', 'guard', 'mend', 'keen'],
  quachtinh: ['ironSkin', 'guard', 'mend', 'warcry'],
  kieuphong: ['fury', 'shockwave', 'regen', 'lastStand'],
  lenhhoxung: ['rapid', 'execute', 'swift', 'keen'],
  truongvoky: ['thornsAura', 'guard', 'regen', 'lastStand'],
  auduongphong: ['bladeStorm', 'dread', 'regen', 'lifesteal'],
};

/** kỹ năng đặc biệt (luôn sẵn có, không tính vào 5 kỹ năng): chỉ Tôn Ngộ Không */
export const SPECIAL_SKILL: Record<string, string> = { tonngokhong: 'monkeys' };

/** cấp tối đa của một đơn vị: tướng 20, còn lại 5 */
export const MAX_UNIT_LEVEL = 5;
export const maxLevelOf = (d: Pick<UnitDef, 'kind'>) => (d.kind === 'general' ? GENERAL_MAX_LEVEL : MAX_UNIT_LEVEL);

/** số kỹ năng đã mở (cả kỹ năng gốc) ở cấp `lv` */
export const skillCountAt = (lv: number) => SKILL_UNLOCK_LEVELS.filter((l) => lv >= l).length;

/** kỹ năng mở thêm (không tính kỹ năng gốc) của tướng ở cấp `lv` */
export const extraSkillsAt = (id: string, lv: number): GSkillId[] => (GENERAL_SKILLS[id] ?? []).slice(0, Math.max(0, skillCountAt(lv) - 1));

/** cấp mở kỹ năng mở thêm thứ `i` (0-based) */
export const extraUnlockLevel = (i: number) => SKILL_UNLOCK_LEVELS[i + 1];

/** số kỹ năng mở thêm của tướng ĐỊCH theo độ sâu chiến dịch (trạm 0..29): 0 → 4 */
export const enemyExtraCount = (stationId: number) => Math.min(4, Math.floor(stationId / 7));

const pct = (v: number) => Math.round(v * 100);

/** tham số hiển thị cho mô tả `gskill.<id>.desc` */
export function gskillParams(id: GSkillId): Record<string, number> {
  switch (id) {
    case 'ironSkin': return { hp: pct(GS.ironSkin.hp), armor: GS.ironSkin.armor };
    case 'fury': return { dmg: pct(GS.fury.dmg) };
    case 'swift': return { speed: pct(GS.swift.speed), dodge: pct(GS.swift.dodge) };
    case 'regen': return { rate: Number((GS.regen.rate * 100).toFixed(1)) };
    case 'keen': return { pierce: pct(GS.keen.pierce) };
    case 'lifesteal': return { pct: pct(GS.lifesteal.pct) };
    case 'thornsAura': return { reflect: pct(GS.thornsAura.reflect) };
    case 'rapid': return { rate: pct(GS.rapid.rate) };
    case 'execute': return { below: pct(GS.execute.below), mul: pct(GS.execute.mul - 1) };
    case 'lastStand': return { below: pct(GS.lastStand.below), shield: pct(GS.lastStand.shield), dmg: pct(GS.lastStand.dmg - 1), speed: pct(GS.lastStand.speed - 1), sec: GS.lastStand.sec };
    case 'warcry': return { cd: GS.warcry.cd, range: GS.warcry.range, dmg: pct(GS.warcry.dmg - 1), sec: GS.warcry.sec };
    case 'guard': return { cd: GS.guard.cd, shield: pct(GS.guard.shield) };
    case 'shockwave': return { cd: GS.shockwave.cd, r: GS.shockwave.r, mul: pct(GS.shockwave.mul), stun: GS.shockwave.stun };
    case 'mend': return { cd: GS.mend.cd, r: GS.mend.r, pct: pct(GS.mend.pct), self: pct(GS.mend.self) };
    case 'bladeStorm': return { cd: GS.bladeStorm.cd, r: GS.bladeStorm.r, mul: pct(GS.bladeStorm.mul) };
    case 'dread': return { cd: GS.dread.cd, r: GS.dread.r, slow: pct(GS.dread.slow), sec: GS.dread.sec, mul: pct(GS.dread.mul) };
  }
}
