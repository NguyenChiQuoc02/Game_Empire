export type SkillId =
  | 'none'
  | 'monkeys'
  | 'quick'
  | 'charge'
  | 'antiCav'
  | 'shield'
  | 'ninja'
  | 'siege'
  | 'heal'
  | 'berserk'
  | 'bomb'
  | 'palm'
  | 'pairHeal'
  | 'ironWill'
  | 'sweep'
  | 'revive'
  | 'fireAttack'
  | 'splash'
  | 'tyrant'
  | 'monk'
  | 'taoist'
  | 'crossbow'
  | 'trample'
  | 'poisoner'
  | 'wukong'
  | 'erlang'
  | 'warlord'
  | 'melody'
  | 'dash'
  | 'sniper'
  | 'stun'
  | 'shieldAura'
  | 'dragonPalm'
  | 'swordSaint'
  | 'reflect'
  | 'poisonCloud'
  | 'phantom'
  | 'inferno'
  | 'wall'
  | 'thorns'
  | 'tower'
  | 'ballista'
  | 'catapult'
  | 'trap'
  | 'firepit'
  | 'drum'
  | 'altar'
  | 'frost'
  | 'blink'
  | 'burrow'
  | 'thunder'
  | 'blessing'
  | 'howl'
  | 'crossShot'
  | 'skyRoam'
  | 'tide'
  // ── đợt kỹ năng mới
  | 'cleave'
  | 'volley'
  | 'leap'
  | 'ward'
  | 'vanish'
  | 'charm'
  | 'freeze'
  | 'launch'
  | 'rebirth'
  | 'undying'
  | 'resurrect'
  | 'rescue'
  | 'springAura'
  | 'skyMount'
  // ── thiết bị công thành tầm xa (xem ENGINES)
  | 'cannon'
  | 'rocket'
  | 'spawner'
  | 'boltcart'
  | 'mangonel'
  // ── quái hoang dã
  | 'brood';

export type UnitKind = 'troop' | 'general' | 'boss' | 'summon' | 'defense' | 'beast' | 'pet';

/** thú cưỡi của kỹ năng skyMount (xem render/mountArt.ts) */
export type MountKind = 'cloud' | 'crane' | 'phoenix' | 'dragon' | 'eagle' | 'ox';

/**
 * Kỹ năng KẾT HỢP: khi đi cùng đồng đội phù hợp (trong bán kính COMBO_RANGE, cùng lane) cả hai nhận hiệu ứng.
 * `with`: id đơn vị, hoặc 'kind:general' / 'kind:troop' / 'tag:cav'...
 */
export type ComboKind = 'power' | 'guard' | 'haste' | 'heal' | 'strike';
export interface Combo {
  with: string[];
  kind: ComboKind;
}
export const COMBO_RANGE = 170;

/** các con số của đợt kỹ năng mới (sim và mô tả cùng dùng) */
export const SK = {
  cleave: { r: 55, mul: 0.55 },
  volley: { r: 60, mul: 0.55 },
  leap: { reach: 380, dmg: 70, r: 55, stun: 0.6 },
  ward: { sec: 3 },
  vanish: { sec: 4, speed: 1.2, reach: 350 },
  charm: { n: 2, sec: 4, reach: 300 },
  freeze: { n: 3, sec: 2.5, reach: 260, bonus: 1.25, slow: 0.7, slowSec: 2 },
  launch: { sec: 1.6, dmg: 55, r: 100 },
  rebirth: { hp: 0.7, burst: 90, r: 110 },
  undying: { hp: 0.45, n: 2 },
  resurrect: { hp: 0.55 },
  rescue: { pct: 0.3, flat: 40, reach: 320 },
  spring: { r: 150, pct: 0.03, every: 2 },
  mount: { speed: 1.3, reach: 400 },
  combo: { power: { dmg: 1.2, rate: 1.15 }, guard: { armor: 1.5 }, haste: { speed: 1.25, rate: 1.2 }, heal: { pct: 0.06, every: 5 }, strike: { every: 8, mul: 1.1, r: 110 } },
} as const;

/**
 * Thiết bị công thành tầm xa: mỗi đòn đánh bắn `shots` quả (cách nhau `spread`), nổ lan bán kính `r` (0 = đơn mục tiêu, dùng `pierce`);
 * đập cờ nhân `flag` (đã tính tổng số quả).
 */
export interface Engine {
  r: number;
  flag: number;
  shots?: number;
  spread?: number;
  pierce?: number;
  proj: 'rock' | 'fire' | 'arrow';
  shake?: number;
  color: number;
}
export const ENGINES: Partial<Record<SkillId, Engine>> = {
  cannon: { r: 52, flag: 3, proj: 'fire', shake: 3, color: 0xff9a4d },
  rocket: { r: 36, flag: 2.4, shots: 3, spread: 34, proj: 'fire', color: 0xff6a4d },
  boltcart: { r: 0, flag: 1.8, pierce: 0.6, proj: 'arrow', color: 0xe8d8a0 },
  mangonel: { r: 75, flag: 3.5, proj: 'rock', shake: 4, color: 0xc9a070 },
};

export interface UnitDef {
  id: string;
  name: string;
  kind: UnitKind;
  /** Vàng để triển khai trong trận */
  cost: number;
  hp: number;
  dmg: number;
  /** giây giữa 2 đòn đánh */
  cd: number;
  /** đơn vị lane / giây (lane dài 1000) */
  speed: number;
  range: number;
  armor: number;
  skill: SkillId;
  /** kỹ năng thứ hai (luôn có, kể cả khi đang hóa thân) */
  skill2?: SkillId;
  /** kỹ năng kết hợp khi đi chung với đồng đội phù hợp */
  combo?: Combo;
  /** skyMount: loại thú cưỡi và thời gian bay (giây) */
  mount?: MountKind;
  mountSec?: number;
  skillName: string;
  desc: string;
  tags?: string[];
  /** thời gian tồn tại (giây); bỏ trống = vô hạn (công trình, hố lửa...) */
  life?: number;
  /** Vàng (xu) để mở khóa ngoài trận; 0 = có sẵn */
  unlockCost: number;
  /** kích thước vẽ */
  scale: number;
}

export const MAX_LEVEL = 5;
/** nhân chỉ số theo cấp: +12%/cấp đến cấp 5, từ cấp 6 +5%/cấp (tướng dừng ở cấp 20 gấp ~2,2 lần; lính/phòng thủ/thú cưng không giới hạn) */
export const levelMul = (lv: number) => 1 + 0.12 * (Math.min(lv, MAX_LEVEL) - 1) + 0.05 * Math.max(0, lv - MAX_LEVEL);
/** cấp tương đương của hệ số `pow` (nghịch đảo levelMul): quái/địch không có cấp riêng nên suy ra từ độ khó */
export const levelOfPow = (pow: number) => {
  const lv = 1 + (pow - 1) / 0.12;
  return Math.max(1, Math.round(lv > MAX_LEVEL ? MAX_LEVEL + (pow - levelMul(MAX_LEVEL)) / 0.05 : lv));
};
/** phân thân của tướng: càng lên cấp càng nhiều khỉ con (2 → 6) và mạnh hơn (30% → 50% chỉ số chủ) */
export const cubCount = (lv: number) => Math.min(6, 2 + Math.floor((lv - 1) / 2));
export const cubRatio = (lv: number) => Math.min(0.5, 0.3 + 0.02 * (lv - 1));
/** Hao Thiên Khuyển: 50% chỉ số chủ ở cấp 1, +3%/cấp, tối đa 80% */
export const houndRatio = (lv: number) => Math.min(0.8, 0.5 + 0.03 * (lv - 1));
export const upgradeCost = (def: UnitDef, lv: number) =>
  Math.round((def.kind === 'general' ? 140 : def.kind === 'defense' ? 70 : def.kind === 'pet' ? 80 : 60) * lv);

/** hồi chiêu gốc (giây) của các kỹ năng chủ động; nâng cấp thẻ làm hồi chiêu nhanh hơn (xem skillHaste) */
export const SKILL_CD: Partial<Record<SkillId, number>> = {
  monk: 8, palm: 10, pairHeal: 5, heal: 2, fireAttack: 8, tyrant: 9, wukong: 8, monkeys: 10, erlang: 14, warlord: 11,
  melody: 9, dash: 8, phantom: 7, stun: 11, shieldAura: 12, dragonPalm: 9, poisonCloud: 9, inferno: 10,
  blink: 9, burrow: 11, thunder: 15, blessing: 10, howl: 12, skyRoam: 10, tide: 12,
  leap: 9, ward: 14, vanish: 12, charm: 14, freeze: 13, launch: 10, resurrect: 18, rescue: 8, skyMount: 16,
};
/** tốc độ hồi chiêu theo cấp: +7%/cấp (cấp 3 → 8s còn 7s), tối đa x4; không giới hạn cấp nên có trần */
export const skillHaste = (lv: number) => Math.min(4, 1 + 0.07 * Math.max(0, lv - 1));
/** hồi chiêu thực tế (giây) của một kỹ năng gốc `cd` ở cấp `lv` */
export const skillCdAt = (cd: number, lv: number) => cd / skillHaste(lv);
/** hồi chiêu chủ động chính của một đơn vị (kỹ năng gốc, hoặc chu kỳ của công trình hỗ trợ); null = không có */
export const activeCdOf = (d: UnitDef): number | null => {
  if (d.kind === 'defense') return d.skill === 'altar' || d.skill === 'frost' || d.skill === 'thorns' ? d.cd : null;
  return SKILL_CD[d.skill] ?? (d.skill2 ? SKILL_CD[d.skill2] ?? null : null);
};

const U = (d: UnitDef) => d;

export const UNIT_LIST: UnitDef[] = [
  // ───────────── LÍNH ─────────────
  U({
    id: 'samurai', name: 'Samurai', kind: 'troop', cost: 10,
    hp: 130, dmg: 11, cd: 0.45, speed: 38, range: 28, armor: 3,
    skill: 'quick', skillName: 'Chém Nhanh',
    desc: 'Chiến binh cân bằng, vung kiếm cực nhanh. Rẻ và hiệu quả.',
    unlockCost: 0, scale: 1,
  }),
  U({
    id: 'archer', name: 'Cung Thủ', kind: 'troop', cost: 12,
    hp: 60, dmg: 11, cd: 0.9, speed: 36, range: 190, armor: 0,
    skill: 'none', skillName: 'Tầm Xa',
    desc: 'Bắn tên từ xa, mỏng manh. Đứng sau lính khiên là tuyệt nhất.',
    unlockCost: 0, scale: 1,
  }),
  U({
    id: 'spear', name: 'Lính Giáo', kind: 'troop', cost: 11,
    hp: 95, dmg: 12, cd: 0.9, speed: 36, range: 62, armor: 2,
    skill: 'antiCav', skillName: 'Giáo Dài',
    desc: 'Đâm xa hơn kiếm. Sát thương x2.2 lên kỵ binh.',
    tags: [], unlockCost: 0, scale: 1,
  }),
  U({
    id: 'shield', name: 'Lính Khiên', kind: 'troop', cost: 14,
    hp: 320, dmg: 6, cd: 1.0, speed: 26, range: 28, armor: 18,
    skill: 'shield', skillName: 'Thuẫn Thủ',
    desc: 'Cực trâu, chậm. Giảm 50% sát thương từ đòn đánh tầm xa.',
    unlockCost: 0, scale: 1.05,
  }),
  U({
    id: 'knight', name: 'Kỵ Sĩ', kind: 'troop', cost: 20,
    hp: 170, dmg: 16, cd: 1.0, speed: 95, range: 30, armor: 8,
    skill: 'charge', skillName: 'Xung Phong',
    desc: 'Chạy rất nhanh. Đòn đầu tiên cực mạnh: càng chạy xa sát thương càng cao (tối đa x5).',
    tags: ['cav'], unlockCost: 120, scale: 1.05,
  }),
  U({
    id: 'ninja', name: 'Ninja', kind: 'troop', cost: 16,
    hp: 75, dmg: 11, cd: 0.55, speed: 80, range: 28, armor: 0,
    skill: 'ninja', skillName: 'Ảnh Thân',
    desc: 'Né 30% đòn đơn mục tiêu. Chạy nhanh, phá cờ x2 sát thương.',
    unlockCost: 150, scale: 0.95,
  }),
  U({
    id: 'berserker', name: 'Cuồng Chiến', kind: 'troop', cost: 18,
    hp: 190, dmg: 16, cd: 0.8, speed: 44, range: 30, armor: 2,
    skill: 'berserk', skillName: 'Cuồng Nộ',
    desc: 'Càng mất máu càng đánh đau: tối đa +120% sát thương khi sắp chết.',
    unlockCost: 150, scale: 1.05,
  }),
  U({
    id: 'healer', name: 'Y Sư', kind: 'troop', cost: 16,
    hp: 80, dmg: 0, cd: 1, speed: 34, range: 0, armor: 0,
    skill: 'heal', skillName: 'Diệu Thủ',
    desc: 'Không đánh được. Mỗi 2s hồi 15 máu cho mọi đồng đội xung quanh.',
    unlockCost: 140, scale: 0.95,
  }),
  U({
    id: 'bomber', name: 'Tử Sĩ', kind: 'troop', cost: 9,
    hp: 45, dmg: 90, cd: 1, speed: 70, range: 22, armor: 0,
    skill: 'bomb', skillName: 'Tự Bạo',
    desc: 'Ôm bom lao vào địch, nổ gây 90 sát thương lan (x3 lên cờ) rồi chết.',
    unlockCost: 100, scale: 0.9,
  }),
  U({
    id: 'trebuchet', name: 'Máy Ném Đá', kind: 'troop', cost: 30,
    hp: 100, dmg: 38, cd: 3.0, speed: 16, range: 300, armor: 4,
    skill: 'siege', skillName: 'Công Thành',
    desc: 'Ném đá cực xa, gây sát thương lan. Đập cờ x2.5. Rất chậm.',
    tags: ['engine'], unlockCost: 220, scale: 1.25,
  }),
  U({
    id: 'noxe', name: 'Nỏ Xe Liên Hoàn', kind: 'troop', cost: 26,
    hp: 110, dmg: 20, cd: 1.0, speed: 24, range: 270, armor: 5,
    skill: 'boltcart', skillName: 'Nỏ Xuyên Giáp',
    desc: 'Xe nỏ khổng lồ bắn tên liên tục từ xa, xuyên 60% giáp. Đập cờ x1.8. Chậm và mỏng máu, cần quân che chắn.',
    tags: ['engine'], unlockCost: 260, scale: 1.2,
  }),
  U({
    id: 'hoapao', name: 'Hỏa Pháo', kind: 'troop', cost: 34,
    hp: 130, dmg: 70, cd: 4.5, speed: 15, range: 340, armor: 6,
    skill: 'cannon', skillName: 'Đạn Pháo Nổ',
    desc: 'Pháo thần công bắn đạn nổ gây sát thương lan (bán kính 52) từ rất xa. Đập cờ x3. Cực chậm, nạp đạn lâu.',
    tags: ['engine'], unlockCost: 300, scale: 1.2,
  }),
  U({
    id: 'xetenlua', name: 'Xe Hỏa Tiễn', kind: 'troop', cost: 32,
    hp: 90, dmg: 22, cd: 3.2, speed: 22, range: 310, armor: 3,
    skill: 'rocket', skillName: 'Hỏa Tiễn Tề Phát',
    desc: 'Mỗi lượt phóng 3 hỏa tiễn rải một vùng, mỗi quả nổ lan (bán kính 36). Đập cờ x2.4. Rất hiệu quả với quân tụ đông.',
    tags: ['engine'], unlockCost: 280, scale: 1.15,
  }),
  U({
    id: 'phaothach', name: 'Pháo Thạch Cự Hình', kind: 'troop', cost: 40,
    hp: 160, dmg: 100, cd: 5.5, speed: 11, range: 400, armor: 8,
    skill: 'mangonel', skillName: 'Cự Thạch Công Thành',
    desc: 'Máy bắn đá hạng nặng, tầm xa nhất (400): tảng đá nổ lan rộng (bán kính 75), đập cờ x3.5. Chậm kinh khủng, giá đắt.',
    tags: ['engine'], unlockCost: 380, scale: 1.3,
  }),

  U({
    id: 'monk', name: 'Võ Tăng', kind: 'troop', cost: 18,
    hp: 260, dmg: 12, cd: 0.9, speed: 34, range: 28, armor: 12,
    skill: 'monk', skillName: 'Kim Chung Tráo',
    desc: 'Võ tăng Thiếu Lâm. Có lớp khí giáp hấp thụ 80 sát thương, tự hồi lại sau 8 giây khi bị vỡ.',
    unlockCost: 180, scale: 1.05,
  }),
  U({
    id: 'taoist', name: 'Đạo Sĩ', kind: 'troop', cost: 20,
    hp: 85, dmg: 20, cd: 1.8, speed: 30, range: 170, armor: 2,
    skill: 'taoist', skillName: 'Lôi Phù',
    desc: 'Phóng sấm sét từ xa, sát thương lan nhỏ (bán kính 45) lên cụm địch.',
    unlockCost: 200, scale: 1,
  }),
  U({
    id: 'crossbow', name: 'Nỏ Thủ', kind: 'troop', cost: 18,
    hp: 80, dmg: 26, cd: 1.7, speed: 30, range: 250, armor: 2,
    skill: 'crossbow', skillName: 'Nỏ Xuyên Giáp',
    desc: 'Nỏ liên châu bắn rất xa, mũi tên xuyên 50% giáp của mục tiêu.',
    unlockCost: 170, scale: 1,
  }),
  U({
    id: 'elephant', name: 'Voi Chiến', kind: 'troop', cost: 34,
    hp: 720, dmg: 30, cd: 1.7, speed: 24, range: 40, armor: 14,
    skill: 'trample', skillName: 'Giậm Chân',
    desc: 'Voi chiến khổng lồ nhưng chậm chạp. Mỗi đòn gây sát thương lan bán kính 55.',
    unlockCost: 260, scale: 1.7,
  }),
  U({
    id: 'poisoner', name: 'Độc Sư', kind: 'troop', cost: 17,
    hp: 70, dmg: 8, cd: 1.1, speed: 34, range: 130, armor: 0,
    skill: 'poisoner', skillName: 'Kịch Độc',
    desc: 'Ném độc từ xa: mục tiêu trúng đòn bị trúng độc, mất 9 máu mỗi giây trong 5 giây (xuyên giáp).',
    unlockCost: 190, scale: 1,
  }),

  // ───────────── LÍNH ĐỢT MỚI (đánh lan · nhảy ra sau lưng · kết hợp · trạng thái) ─────────────
  U({
    id: 'daodaobinh', name: 'Đại Đao Binh', kind: 'troop', cost: 15,
    hp: 200, dmg: 15, cd: 1.0, speed: 34, range: 32, armor: 6,
    skill: 'cleave', skillName: 'Đại Đao Quét Ngang',
    desc: 'ĐÁNH LAN: mỗi nhát đao chém lan 55% sát thương lên địch quanh mục tiêu (bán kính 55). Trâu bò, giữ tuyến rất tốt.',
    unlockCost: 180, scale: 1.08,
  }),
  U({
    id: 'toanphong', name: 'Toàn Phong Kiếm Sĩ', kind: 'troop', cost: 14,
    hp: 130, dmg: 9, cd: 0.6, speed: 52, range: 28, armor: 2,
    skill: 'cleave', skillName: 'Toàn Phong Kiếm',
    desc: 'ĐÁNH LAN: xoay kiếm liên hồi, mỗi nhát chém lan 55% sát thương lên địch quanh mục tiêu. KẾT HỢP: đi cùng Samurai (trong 170) cả hai +20% sát thương và +15% tốc độ đánh.',
    combo: { with: ['samurai'], kind: 'power' },
    unlockCost: 200, scale: 1,
  }),
  U({
    id: 'hoathuong', name: 'Hỏa Thương Binh', kind: 'troop', cost: 18,
    hp: 95, dmg: 20, cd: 1.5, speed: 30, range: 150, armor: 1,
    skill: 'volley', skillName: 'Hỏa Thương Nổ Đạn',
    desc: 'BẮN LAN: súng hỏa thương tầm 150, đạn nổ gây 55% sát thương lên địch quanh mục tiêu (bán kính 60).',
    unlockCost: 240, scale: 1,
  }),
  U({
    id: 'liethoa', name: 'Liệt Hỏa Cung Thủ', kind: 'troop', cost: 16,
    hp: 65, dmg: 12, cd: 1.0, speed: 34, range: 210, armor: 0,
    skill: 'volley', skillName: 'Hỏa Tiễn Nổ',
    desc: 'BẮN LAN: mũi tên lửa tầm 210, nổ lan 55% sát thương lên địch quanh mục tiêu (bán kính 60). Mỏng máu.',
    unlockCost: 220, scale: 1,
  }),
  U({
    id: 'phikiem', name: 'Phi Kiếm Khách', kind: 'troop', cost: 17,
    hp: 120, dmg: 13, cd: 0.7, speed: 58, range: 28, armor: 2,
    skill: 'leap', skillName: 'Phi Thân Tập Hậu',
    desc: 'NHẢY RA SAU LƯNG: cứ 9 giây vọt qua đầu đối thủ, đáp xuống phía sau (ưu tiên xạ thủ), gây 70 sát thương lan và làm choáng 0,6 giây. KẾT HỢP: đi cùng Samurai hoặc Ninja, mỗi 8 giây cả hai tung đòn hợp kích lan bán kính 110.',
    combo: { with: ['samurai', 'ninja', 'anhsat'], kind: 'strike' },
    unlockCost: 260, scale: 1,
  }),
  U({
    id: 'phiky', name: 'Phi Kỵ Tập Hậu', kind: 'troop', cost: 24,
    hp: 190, dmg: 17, cd: 1.0, speed: 88, range: 30, armor: 6,
    skill: 'leap', skill2: 'charge', skillName: 'Phi Mã Vượt Trận',
    desc: 'Kỵ binh nhảy ngựa: cứ 9 giây phi vọt qua đầu địch đáp xuống sau lưng (70 sát thương lan, choáng 0,6s); đòn đầu tiên xung phong càng chạy xa càng mạnh.',
    tags: ['cav'], unlockCost: 400, scale: 1.05,
  }),
  U({
    id: 'kimcang', name: 'Kim Cang Lực Sĩ', kind: 'troop', cost: 22,
    hp: 300, dmg: 14, cd: 1.0, speed: 30, range: 30, armor: 12,
    skill: 'ward', skillName: 'Kim Cang Bất Hoại',
    desc: 'MIỄN THƯƠNG: cứ 14 giây thân thể hóa kim cương, miễn nhiễm mọi sát thương trong 3 giây.',
    unlockCost: 380, scale: 1.1,
  }),
  U({
    id: 'anhsat', name: 'Ảnh Sát Thủ', kind: 'troop', cost: 18,
    hp: 85, dmg: 14, cd: 0.55, speed: 78, range: 26, armor: 0,
    skill: 'vanish', skill2: 'ninja', skillName: 'Ẩn Thân Ảnh Độn',
    desc: 'KHÔNG THỂ CHỌN LÀM MỤC TIÊU: cứ 12 giây ẩn thân 4 giây (chỉ chịu sát thương lan, chạy nhanh hơn 20%). Né 30% đòn đơn mục tiêu, phá cờ x2.',
    unlockCost: 350, scale: 0.95,
  }),
  U({
    id: 'mehon', name: 'Mê Hồn Sư', kind: 'troop', cost: 20,
    hp: 75, dmg: 8, cd: 1.3, speed: 32, range: 140, armor: 0,
    skill: 'charm', skillName: 'Mê Hồn Thuật',
    desc: 'THÔI MIÊN: cứ 14 giây mê hoặc 2 địch gần nhất trong 300; chúng quay sang đánh chính đồng đội mình trong 4 giây (Boss miễn nhiễm).',
    unlockCost: 420, scale: 1,
  }),
  U({
    id: 'hanbang', name: 'Hàn Băng Đạo Sĩ', kind: 'troop', cost: 20,
    hp: 80, dmg: 12, cd: 1.4, speed: 30, range: 160, armor: 1,
    skill: 'freeze', skillName: 'Huyền Băng Phù',
    desc: 'ĐÓNG BĂNG: cứ 13 giây đóng băng 3 địch gần nhất trong 260 suốt 2,5 giây (không hành động được, chịu thêm 25% sát thương); tan băng bị chậm 30% trong 2 giây.',
    unlockCost: 420, scale: 1,
  }),
  U({
    id: 'thanluc', name: 'Thần Lực Sĩ', kind: 'troop', cost: 22,
    hp: 280, dmg: 20, cd: 1.2, speed: 34, range: 30, armor: 8,
    skill: 'launch', skillName: 'Bạt Sơn Hất Tung',
    desc: 'HẤT TUNG: cứ 10 giây hất tung mọi địch trước mặt (bán kính 100) lên không 1,6 giây, gây 55 sát thương; kẻ bị hất không thể hành động.',
    unlockCost: 400, scale: 1.15,
  }),
  U({
    id: 'phuonghoangtu', name: 'Phượng Hoàng Tử Sĩ', kind: 'troop', cost: 19,
    hp: 130, dmg: 16, cd: 0.9, speed: 44, range: 28, armor: 2,
    skill: 'rebirth', skillName: 'Niết Bàn Trùng Sinh',
    desc: 'HỒI SINH: khi bị hạ lần đầu sẽ hóa lửa sống lại với 70% máu, bất tử 1,5 giây và nổ lửa 90 sát thương lan (bán kính 110).',
    unlockCost: 380, scale: 1,
  }),
  U({
    id: 'chieuhon', name: 'Chiêu Hồn Sư', kind: 'troop', cost: 24,
    hp: 90, dmg: 10, cd: 1.4, speed: 30, range: 150, armor: 1,
    skill: 'resurrect', skillName: 'Chiêu Hồn Phiên',
    desc: 'HỒI SINH ĐỒNG ĐỘI: cứ 18 giây gọi hồn lính/thú vừa ngã xuống của phe mình sống lại ngay cạnh với 55% máu (mỗi quân chỉ được gọi một lần).',
    unlockCost: 500, scale: 1,
  }),
  U({
    id: 'langy', name: 'Lang Y Giang Hồ', kind: 'troop', cost: 20,
    hp: 100, dmg: 7, cd: 1.2, speed: 34, range: 100, armor: 1,
    skill: 'rescue', skillName: 'Diệu Thủ Hồi Xuân',
    desc: 'HỒI MÁU: cứ 8 giây cứu chữa đồng đội thấp máu nhất trong 320 (kể cả lane liền kề): hồi 30% máu tối đa (+40). Đi sau lưng đồng đội, tự vệ bằng ngân châm.',
    unlockCost: 360, scale: 0.98,
  }),
  U({
    id: 'duocdong', name: 'Dược Đồng', kind: 'troop', cost: 16,
    hp: 90, dmg: 6, cd: 1.2, speed: 34, range: 60, armor: 0,
    skill: 'springAura', skillName: 'Dược Hương Phục Linh',
    desc: 'HỒI MÁU DIỆN RỘNG: hào quang dược hương, mỗi 2 giây hồi 3% máu tối đa cho mọi đồng đội trong bán kính 150 (kể cả bản thân).',
    unlockCost: 320, scale: 0.9,
  }),
  U({
    id: 'thanhac', name: 'Thần Hạc Kỵ', kind: 'troop', cost: 26,
    hp: 170, dmg: 18, cd: 0.9, speed: 46, range: 32, armor: 4,
    skill: 'skyMount', skillName: 'Triệu Hạc Thăng Thiên',
    desc: 'GỌI THÚ CƯỠI BAY: cứ 16 giây triệu Tiên Hạc, bay lên trời 6 giây: chỉ tướng và quân tầm xa mới đánh trúng, chạy nhanh hơn 30%.',
    mount: 'crane', mountSec: 6, unlockCost: 520, scale: 1.05,
  }),
  U({
    id: 'hogia', name: 'Hộ Giá Thân Binh', kind: 'troop', cost: 16,
    hp: 240, dmg: 10, cd: 0.9, speed: 32, range: 28, armor: 12,
    skill: 'cleave', skillName: 'Thân Vệ Quét Ngang',
    desc: 'ĐÁNH LAN: mỗi đòn lan 55% sát thương quanh mục tiêu. KẾT HỢP: đi cùng bất kỳ TƯỚNG nào (trong 170), cả hai được +50% giáp.',
    combo: { with: ['kind:general'], kind: 'guard' },
    unlockCost: 300, scale: 1.05,
  }),
  U({
    id: 'lahan', name: 'La Hán Quyền Sư', kind: 'troop', cost: 17,
    hp: 180, dmg: 12, cd: 0.8, speed: 36, range: 28, armor: 6,
    skill: 'cleave', skillName: 'La Hán Quyền',
    desc: 'ĐÁNH LAN: quyền phong lan 55% sát thương quanh mục tiêu. KẾT HỢP: đi cùng Võ Tăng, cả hai +20% sát thương và +15% tốc độ đánh.',
    combo: { with: ['monk'], kind: 'power' },
    unlockCost: 280, scale: 1.05,
  }),
  U({
    id: 'lienchau', name: 'Liên Châu Xạ Thủ', kind: 'troop', cost: 17,
    hp: 70, dmg: 11, cd: 0.8, speed: 32, range: 220, armor: 0,
    skill: 'volley', skillName: 'Liên Châu Tiễn',
    desc: 'BẮN LAN: tên nổ lan 55% sát thương quanh mục tiêu. KẾT HỢP: đi cùng Cung Thủ, Nỏ Thủ hay Xạ thủ lửa, cả hai chạy nhanh hơn 25% và bắn nhanh hơn 20%.',
    combo: { with: ['archer', 'crossbow', 'hoathuong', 'liethoa'], kind: 'haste' },
    unlockCost: 300, scale: 1,
  }),
  U({
    id: 'daodong', name: 'Đạo Đồng', kind: 'troop', cost: 15,
    hp: 85, dmg: 14, cd: 1.5, speed: 30, range: 160, armor: 0,
    skill: 'taoist', skillName: 'Tiểu Lôi Phù',
    desc: 'Phóng sấm sét lan nhỏ (bán kính 45) từ xa. KẾT HỢP: đi cùng Đạo Sĩ, Tư Mã Ý, Gia Cát Lượng hay Chu Du, mỗi 5 giây hồi 6% máu cho cả hai.',
    combo: { with: ['taoist', 'tumayi', 'giacatluong', 'chudu'], kind: 'heal' },
    unlockCost: 240, scale: 0.92,
  }),

  // ───────────── THỦY BINH (chỉ đi trên lane sông) ─────────────
  U({
    id: 'thuybinh', name: 'Thủy Binh', kind: 'troop', cost: 11,
    hp: 140, dmg: 11, cd: 0.55, speed: 44, range: 28, armor: 3,
    skill: 'quick', skillName: 'Chèo Nhanh',
    desc: 'THỦY QUÂN: chỉ ra trận ở lane sông. Lính chèo thuyền nhỏ, vung đao rất nhanh. Rẻ, linh hoạt.',
    tags: ['naval'], unlockCost: 100, scale: 1,
  }),
  U({
    id: 'cungthuyen', name: 'Cung Thủ Thuyền', kind: 'troop', cost: 13,
    hp: 85, dmg: 12, cd: 0.9, speed: 38, range: 200, armor: 1,
    skill: 'none', skillName: 'Xạ Thủ Trên Sóng',
    desc: 'THỦY QUÂN: chỉ ra trận ở lane sông. Cung thủ đứng trên thuyền, bắn tên từ xa, mỏng máu.',
    tags: ['naval'], unlockCost: 150, scale: 1,
  }),
  U({
    id: 'chienthuyen', name: 'Chiến Thuyền', kind: 'troop', cost: 22,
    hp: 420, dmg: 18, cd: 1.2, speed: 30, range: 36, armor: 14,
    skill: 'trample', skillName: 'Húc Thuyền',
    desc: 'THỦY QUÂN: chỉ ra trận ở lane sông. Thuyền chiến bọc giáp: rất trâu, mỗi cú húc gây sát thương lan bán kính 55.',
    tags: ['naval'], unlockCost: 300, scale: 1.3,
  }),
  U({
    id: 'phaothuyen', name: 'Pháo Thuyền', kind: 'troop', cost: 26,
    hp: 200, dmg: 34, cd: 2.2, speed: 24, range: 270, armor: 5,
    skill: 'siege', skillName: 'Pháo Kích Sông',
    desc: 'THỦY QUÂN: chỉ ra trận ở lane sông. Thuyền mang pháo bắn xa 270, đạn nổ lan; x2.5 sát thương lên cờ. Chậm, mỏng.',
    tags: ['naval'], unlockCost: 450, scale: 1.25,
  }),

  // ───────────── TƯỚNG ─────────────
  U({
    id: 'duongqua', name: 'Dương Quá', kind: 'general', cost: 45,
    hp: 560, dmg: 30, cd: 0.8, speed: 48, range: 30, armor: 10,
    skill: 'palm', skillName: 'Hãn Thiên Chưởng',
    desc: 'Cứ mỗi 10s tung một chưởng gây 170 sát thương diện rộng phía trước.',
    unlockCost: 0, scale: 1.3,
  }),
  U({
    id: 'tieulongnu', name: 'Tiểu Long Nữ', kind: 'general', cost: 45,
    hp: 400, dmg: 18, cd: 0.8, speed: 48, range: 130, armor: 5,
    skill: 'pairHeal', skillName: 'Ngọc Nữ Tâm Kinh',
    desc: 'Đi cùng Dương Quá: mỗi 5s hồi 50 máu cho cả hai. Phóng ngân châm tầm xa.',
    unlockCost: 350, scale: 1.3,
  }),
  U({
    id: 'truongphi', name: 'Trương Phi', kind: 'general', cost: 55,
    hp: 700, dmg: 28, cd: 0.9, speed: 40, range: 32, armor: 8,
    skill: 'ironWill', skillName: 'Cương Thể',
    desc: 'Hạ 1 lính: +2 phòng thủ. Hạ 1 tướng: +5 phòng thủ. Càng đánh càng cứng.',
    unlockCost: 400, scale: 1.4,
  }),
  U({
    id: 'trieuvan', name: 'Triệu Vân', kind: 'general', cost: 55,
    hp: 520, dmg: 26, cd: 0.7, speed: 90, range: 32, armor: 8,
    skill: 'revive', skillName: 'Thất Tiến Thất Xuất',
    desc: 'Chạy nhanh. Chết lần đầu sẽ hồi sinh với 50% máu. Hạ địch hồi 12% máu.',
    unlockCost: 450, scale: 1.3,
  }),
  U({
    id: 'quanvu', name: 'Quan Vũ', kind: 'general', cost: 60,
    hp: 650, dmg: 36, cd: 1.2, speed: 42, range: 36, armor: 12,
    skill: 'sweep', skillName: 'Thanh Long Trảm',
    desc: 'Mỗi đòn thứ 3 chém quét diện rộng gây x1.8 sát thương.',
    unlockCost: 500, scale: 1.4,
  }),
  U({
    id: 'giacatluong', name: 'Gia Cát Lượng', kind: 'general', cost: 60,
    hp: 320, dmg: 20, cd: 1.3, speed: 34, range: 230, armor: 4,
    skill: 'fireAttack', skillName: 'Hỏa Thiêu Chiến Thuyền',
    desc: 'Mỗi 8s phóng lửa vào chỗ địch đông nhất trong lane (130 sát thương, xuyên giáp).',
    unlockCost: 550, scale: 1.3,
  }),
  U({
    id: 'lubo', name: 'Lữ Bố', kind: 'general', cost: 75,
    hp: 900, dmg: 42, cd: 1.0, speed: 56, range: 36, armor: 14,
    skill: 'splash', skillName: 'Vô Song',
    desc: 'Mỗi nhát kích gây 60% sát thương lan sang địch xung quanh mục tiêu.',
    unlockCost: 700, scale: 1.45,
  }),

  U({
    id: 'tonngokhong', name: 'Tôn Ngộ Không', kind: 'general', cost: 70,
    hp: 640, dmg: 34, cd: 0.7, speed: 70, range: 36, armor: 8,
    skill: 'wukong', skill2: 'monkeys', skillName: 'Bảy Mươi Hai Phép Biến Hóa',
    desc: 'Cứ 8 giây (hồi chiêu tính khi đã hết hình dạng) biến thành một vị tướng bất kỳ và lập tức thi triển kỹ năng của vị tướng đó, giữ hình dạng 5 giây. Ngoài ra có kỹ năng đặc biệt Phân Thân: cứ 10 giây thổi lông hóa khỉ con, lên cấp thì nhiều khỉ hơn và mạnh hơn. CÂN ĐẨU VÂN: đạp mây đi được cả lane sông lẫn lane đất.',
    tags: ['cloud'], unlockCost: 950, scale: 1.3,
  }),
  U({
    id: 'duongtien', name: 'Dương Tiễn', kind: 'general', cost: 70,
    hp: 700, dmg: 38, cd: 0.9, speed: 52, range: 40, armor: 12,
    skill: 'erlang', skillName: 'Hao Thiên Khuyển',
    desc: 'Cứ 14 giây triệu hồi Hao Thiên Khuyển (50% máu, sát thương, giáp của Dương Tiễn, lên cấp thì mạnh hơn) và tăng 50% chỉ số của bản thân trong 5 giây.',
    unlockCost: 950, scale: 1.35,
  }),
  U({
    id: 'taothao', name: 'Tào Tháo', kind: 'general', cost: 65,
    hp: 600, dmg: 28, cd: 0.9, speed: 42, range: 34, armor: 10,
    skill: 'warlord', skillName: 'Lệnh Kỳ Gian Hùng',
    desc: 'Cứ 11 giây hạ lệnh: toàn quân ta cùng lane +25% sát thương và +15% tốc độ đánh trong 5 giây.',
    unlockCost: 750, scale: 1.3,
  }),
  U({
    id: 'chudu', name: 'Chu Du', kind: 'general', cost: 60,
    hp: 380, dmg: 22, cd: 1.2, speed: 36, range: 200, armor: 4,
    skill: 'melody', skillName: 'Khúc Nhạc Dẫn Hồn',
    desc: 'Cứ 9 giây tấu khúc làm địch quanh mục tiêu bị chậm 45% trong 4 giây và chịu 55 sát thương.',
    unlockCost: 700, scale: 1.3,
  }),
  U({
    id: 'masieu', name: 'Mã Siêu', kind: 'general', cost: 60,
    hp: 560, dmg: 34, cd: 0.9, speed: 80, range: 36, armor: 8,
    skill: 'dash', skillName: 'Tây Lương Xung Trận',
    desc: 'Cưỡi ngựa. Cứ 8 giây phi nước đại xuyên đội hình địch (tối đa 260), gây 110 sát thương cho mọi địch trên đường.',
    unlockCost: 750, scale: 1.3,
  }),
  U({
    id: 'hoangtrung', name: 'Hoàng Trung', kind: 'general', cost: 55,
    hp: 420, dmg: 30, cd: 1.3, speed: 32, range: 280, armor: 6,
    skill: 'sniper', skillName: 'Bách Bộ Xuyên Dương',
    desc: 'Cung thủ già tầm cực xa (280). Mỗi mũi tên thứ 3 gây x3 sát thương và xuyên 60% giáp.',
    unlockCost: 700, scale: 1.3,
  }),
  U({
    id: 'tumayi', name: 'Tư Mã Ý', kind: 'general', cost: 60,
    hp: 360, dmg: 18, cd: 1.2, speed: 36, range: 200, armor: 4,
    skill: 'stun', skillName: 'Không Thành Kế',
    desc: 'Cứ 11 giây khiến 3 địch gần nhất (trong 280 phía trước) hoang mang, đứng yên 2 giây.',
    unlockCost: 750, scale: 1.3,
  }),
  U({
    id: 'quachtinh', name: 'Quách Tĩnh', kind: 'general', cost: 60,
    hp: 760, dmg: 30, cd: 1.0, speed: 38, range: 32, armor: 14,
    skill: 'shieldAura', skillName: 'Hiệp Chi Đại Giả',
    desc: 'Cứ 12 giây ban khiên khí 60 cho mọi đồng đội trong bán kính 170 (kể cả bản thân).',
    unlockCost: 750, scale: 1.35,
  }),
  U({
    id: 'kieuphong', name: 'Kiều Phong', kind: 'general', cost: 70,
    hp: 820, dmg: 40, cd: 1.0, speed: 44, range: 34, armor: 12,
    skill: 'dragonPalm', skillName: 'Hàng Long Thập Bát Chưởng',
    desc: 'Cứ 9 giây tung chưởng rồng: 140 sát thương diện rộng phía trước và đẩy lùi địch 90 đơn vị.',
    unlockCost: 900, scale: 1.4,
  }),
  U({
    id: 'lenhhoxung', name: 'Lệnh Hồ Xung', kind: 'general', cost: 55,
    hp: 480, dmg: 30, cd: 0.65, speed: 56, range: 34, armor: 6,
    skill: 'swordSaint', skillName: 'Độc Cô Cửu Kiếm',
    desc: 'Kiếm pháp phá giáp: mỗi đòn xuyên 50% giáp, 20% cơ hội chí mạng x2,5.',
    unlockCost: 700, scale: 1.3,
  }),
  U({
    id: 'truongvoky', name: 'Trương Vô Kỵ', kind: 'general', cost: 65,
    hp: 640, dmg: 30, cd: 0.9, speed: 46, range: 34, armor: 10,
    skill: 'reflect', skillName: 'Càn Khôn Đại Na Di',
    desc: 'Phản lại 30% sát thương nhận từ đối thủ đánh gần (trong 90 đơn vị).',
    unlockCost: 850, scale: 1.3,
  }),
  U({
    id: 'auduongphong', name: 'Âu Dương Phong', kind: 'general', cost: 60,
    hp: 460, dmg: 20, cd: 1.1, speed: 38, range: 150, armor: 6,
    skill: 'poisonCloud', skillName: 'Hà Mô Công',
    desc: 'Cứ 9 giây thả đám mây độc lên cụm địch: 30 sát thương, rồi mất 12 máu/giây trong 6 giây (xuyên giáp).',
    unlockCost: 750, scale: 1.3,
  }),

  U({
    id: 'natra', name: 'Na Tra', kind: 'general', cost: 65,
    hp: 520, dmg: 34, cd: 0.7, speed: 74, range: 34, armor: 7,
    skill: 'skyRoam', skillName: 'Phong Hỏa Luân',
    desc: 'BAY trên Phong Hỏa Luân: chỉ tướng và quân tầm xa mới đánh trúng. Cứ 10 giây bay sang lane bên cạnh đang cần chi viện (không cần cầu nối) và giáng xuống 90 sát thương lửa lan.',
    tags: ['fly'], unlockCost: 1000, scale: 1.25,
  }),
  U({
    id: 'vitieubao', name: 'Vi Tiểu Bảo', kind: 'general', cost: 55,
    hp: 400, dmg: 24, cd: 0.7, speed: 62, range: 30, armor: 4,
    skill: 'blink', skillName: 'Thần Hành Bách Biến',
    desc: 'DỊCH CHUYỂN: cứ 9 giây biến mất và hiện ra sau lưng cụm địch đông nhất trên bất kỳ lane nào, gây 85 sát thương lan và làm choáng 0,8 giây.',
    unlockCost: 900, scale: 1.15,
  }),
  U({
    id: 'loicong', name: 'Lôi Công', kind: 'general', cost: 75,
    hp: 440, dmg: 22, cd: 1.3, speed: 34, range: 200, armor: 6,
    skill: 'thunder', skillName: 'Cửu Thiên Lôi Pháp',
    desc: 'SÁT THƯƠNG TOÀN BẢN ĐỒ: cứ 15 giây giáng sét xuống MỌI địch ở cả 3 lane (60 sát thương, xuyên 50% giáp).',
    unlockCost: 1200, scale: 1.35,
  }),
  U({
    id: 'quanam', name: 'Quan Âm Bồ Tát', kind: 'general', cost: 65,
    hp: 540, dmg: 15, cd: 1.1, speed: 36, range: 170, armor: 8,
    skill: 'blessing', skillName: 'Cam Lồ Tịnh Bình',
    desc: 'ẢNH HƯỞNG LANE KHÁC: cứ 10 giây rưới cam lồ: đồng đội trong bán kính 260 — kể cả ở lane liền kề — được hồi 10% máu và nhận khiên khí 50.',
    unlockCost: 1100, scale: 1.3,
  }),
  U({
    id: 'thaisutu', name: 'Thái Sử Từ', kind: 'general', cost: 60,
    hp: 410, dmg: 28, cd: 1.0, speed: 36, range: 260, armor: 5,
    skill: 'crossShot', skill2: 'sniper', skillName: 'Thần Tiễn Xuyên Lane',
    desc: 'Tầm xa 260 và BẮN SANG LANE KHÁC: đứng ở lane giữa vẫn bắn được lane trên và lane dưới, BẮN 360 ĐỘ: địch phía sau lưng cũng không thoát. Mỗi mũi tên thứ 3 gây x3 sát thương, xuyên 60% giáp.',
    unlockCost: 900, scale: 1.3,
  }),
  U({
    id: 'tatu', name: 'Tả Từ', kind: 'general', cost: 60,
    hp: 500, dmg: 32, cd: 1.0, speed: 40, range: 34, armor: 8,
    skill: 'burrow', skillName: 'Độn Thổ Thuật',
    desc: 'ĐỘN THỔ: cứ 11 giây chui xuống đất 2 giây (không ai đánh trúng), lao nhanh về phía địch rồi trồi lên gây 100 sát thương lan và làm choáng 1 giây.',
    unlockCost: 850, scale: 1.3,
  }),

  U({
    id: 'camninh', name: 'Cam Ninh', kind: 'general', cost: 60,
    hp: 560, dmg: 34, cd: 0.8, speed: 80, range: 34, armor: 8,
    skill: 'dash', skillName: 'Cẩm Phàm Xung Thủy',
    desc: 'THỦY TƯỚNG Đông Ngô: chỉ ra trận ở lane sông. Cứ 8 giây lái thuyền xé sóng xuyên đội hình địch (tối đa 260), gây 110 sát thương cho mọi địch trên đường.',
    tags: ['naval'], unlockCost: 800, scale: 1.3,
  }),
  U({
    id: 'satang', name: 'Sa Tăng', kind: 'general', cost: 62,
    hp: 820, dmg: 30, cd: 1.1, speed: 34, range: 36, armor: 16,
    skill: 'trample', skill2: 'ironWill', skillName: 'Hàng Yêu Bảo Trượng',
    desc: 'THỦY TƯỚNG Lưu Sa Hà: chỉ ra trận ở lane sông. Mỗi đòn gậy gây sát thương lan bán kính 55; hạ 1 lính +2 phòng thủ, hạ 1 tướng +5 phòng thủ.',
    tags: ['naval'], unlockCost: 850, scale: 1.4,
  }),
  U({
    id: 'longvuong', name: 'Long Vương Ngao Quảng', kind: 'general', cost: 72,
    hp: 640, dmg: 28, cd: 1.0, speed: 40, range: 160, armor: 10,
    skill: 'tide', skillName: 'Triều Cường Sóng Thần',
    desc: 'THỦY TƯỚNG Đông Hải: chỉ ra trận ở lane sông. Cứ 12 giây dâng sóng thần quét về phía trước: 75 sát thương lên mọi địch trong 380 và đẩy lùi họ 110 đơn vị.',
    tags: ['naval'], unlockCost: 1100, scale: 1.4,
  }),

  // ───────────── TƯỚNG ĐỢT MỚI (Tam Quốc · Kim Dung · Tây Du Ký) ─────────────
  U({
    id: 'liubei', name: 'Lưu Bị', kind: 'general', cost: 60,
    hp: 600, dmg: 26, cd: 1.0, speed: 40, range: 34, armor: 9,
    skill: 'rescue', skillName: 'Nhân Đức Thiên Hạ',
    desc: 'HỒI MÁU: cứ 8 giây cứu chữa đồng đội thấp máu nhất trong 320 (kể cả lane liền kề): hồi 30% máu tối đa (+40). KẾT HỢP: Đào Viên Kết Nghĩa, đi cùng Quan Vũ, Trương Phi hoặc Triệu Vân cả hai +20% sát thương và +15% tốc độ đánh.',
    combo: { with: ['quanvu', 'truongphi', 'trieuvan'], kind: 'power' },
    unlockCost: 900, scale: 1.3,
  }),
  U({
    id: 'dienvi', name: 'Điển Vi', kind: 'general', cost: 62,
    hp: 880, dmg: 30, cd: 1.0, speed: 38, range: 34, armor: 12,
    skill: 'ward', skill2: 'cleave', skillName: 'Ác Lai Tử Thủ',
    desc: 'MIỄN THƯƠNG: cứ 14 giây miễn nhiễm mọi sát thương 3 giây. ĐÁNH LAN: song kích lan 55% sát thương quanh mục tiêu. KẾT HỢP: đi cùng Tào Tháo, cả hai +50% giáp.',
    combo: { with: ['taothao'], kind: 'guard' },
    unlockCost: 1000, scale: 1.4,
  }),
  U({
    id: 'hauchu', name: 'Hứa Chử', kind: 'general', cost: 66,
    hp: 960, dmg: 36, cd: 1.3, speed: 36, range: 36, armor: 14,
    skill: 'launch', skill2: 'cleave', skillName: 'Hổ Si Hất Ngựa',
    desc: 'HẤT TUNG: cứ 10 giây hất tung mọi địch trước mặt (bán kính 100) lên không 1,6 giây, gây 55 sát thương. ĐÁNH LAN: mỗi đòn lan 55% sát thương quanh mục tiêu.',
    unlockCost: 1050, scale: 1.45,
  }),
  U({
    id: 'truonglieu', name: 'Trương Liêu', kind: 'general', cost: 58,
    hp: 520, dmg: 30, cd: 0.8, speed: 64, range: 34, armor: 8,
    skill: 'leap', skill2: 'cleave', skillName: 'Tiêu Dao Tân Phi Kích',
    desc: 'NHẢY RA SAU LƯNG: cứ 9 giây phi vọt qua đầu đối thủ, đáp xuống sau lưng (ưu tiên xạ thủ), gây 70 sát thương lan, choáng 0,6s. ĐÁNH LAN: mỗi đòn lan 55% sát thương.',
    unlockCost: 950, scale: 1.3,
  }),
  U({
    id: 'hahaudon', name: 'Hạ Hầu Đôn', kind: 'general', cost: 60,
    hp: 700, dmg: 28, cd: 0.8, speed: 46, range: 34, armor: 8,
    skill: 'cleave', skill2: 'berserk', skillName: 'Nuốt Nhãn Cuồng Chiến',
    desc: 'ĐÁNH LAN: mỗi đòn lan 55% sát thương quanh mục tiêu. Càng mất máu càng đánh đau: tối đa +120% sát thương khi sắp chết.',
    unlockCost: 900, scale: 1.3,
  }),
  U({
    id: 'hoangcai', name: 'Hoàng Cái', kind: 'general', cost: 58,
    hp: 520, dmg: 24, cd: 1.2, speed: 36, range: 150, armor: 6,
    skill: 'fireAttack', skill2: 'rebirth', skillName: 'Khổ Nhục Kế Hỏa Công',
    desc: 'Mỗi 8s phóng lửa vào chỗ địch đông nhất (130 sát thương, xuyên giáp). HỒI SINH: bị hạ lần đầu sống lại với 70% máu, bất tử 1,5s và nổ lửa 90 sát thương lan.',
    unlockCost: 1000, scale: 1.3,
  }),
  U({
    id: 'bangthong', name: 'Bàng Thống', kind: 'general', cost: 58,
    hp: 360, dmg: 22, cd: 1.2, speed: 34, range: 200, armor: 3,
    skill: 'stun', skill2: 'volley', skillName: 'Liên Hoàn Kế',
    desc: 'Cứ 11 giây khiến 3 địch gần nhất hoang mang đứng yên 2 giây. BẮN LAN: hỏa tiễn nổ lan 55% sát thương. KẾT HỢP: Ngọa Long Phượng Sồ, đi cùng Gia Cát Lượng cả hai +20% sát thương và +15% tốc độ đánh.',
    combo: { with: ['giacatluong'], kind: 'power' },
    unlockCost: 950, scale: 1.3,
  }),
  U({
    id: 'dieuthuyen', name: 'Điêu Thuyền', kind: 'general', cost: 56,
    hp: 340, dmg: 18, cd: 1.1, speed: 40, range: 170, armor: 2,
    skill: 'charm', skillName: 'Mỹ Nhân Kế',
    desc: 'THÔI MIÊN: cứ 14 giây mê hoặc 2 địch gần nhất trong 300; chúng quay sang đánh đồng đội mình 4 giây. KẾT HỢP: đi cùng Lữ Bố cả hai +20% sát thương và +15% tốc độ đánh.',
    combo: { with: ['lubo'], kind: 'power' },
    unlockCost: 1100, scale: 1.2,
  }),
  U({
    id: 'hoangdung', name: 'Hoàng Dung', kind: 'general', cost: 55,
    hp: 400, dmg: 22, cd: 0.8, speed: 52, range: 120, armor: 3,
    skill: 'vanish', skillName: 'Linh Lung Ẩn Thân',
    desc: 'KHÔNG THỂ CHỌN LÀM MỤC TIÊU: cứ 12 giây ẩn thân 4 giây (chỉ chịu sát thương lan, chạy nhanh hơn 20%). KẾT HỢP: đi cùng Quách Tĩnh, mỗi 8 giây cả hai tung hợp kích lan bán kính 110.',
    combo: { with: ['quachtinh'], kind: 'strike' },
    unlockCost: 950, scale: 1.2,
  }),
  U({
    id: 'hongthatcong', name: 'Hồng Thất Công', kind: 'general', cost: 66,
    hp: 760, dmg: 36, cd: 1.0, speed: 42, range: 36, armor: 10,
    skill: 'dragonPalm', skill2: 'cleave', skillName: 'Đả Cẩu Bổng Pháp',
    desc: 'Cứ 9 giây tung chưởng rồng 140 sát thương diện rộng, đẩy lùi địch 90. ĐÁNH LAN: bổng pháp lan 55% sát thương quanh mục tiêu.',
    unlockCost: 1100, scale: 1.35,
  }),
  U({
    id: 'doanduy', name: 'Đoàn Dự', kind: 'general', cost: 62,
    hp: 430, dmg: 26, cd: 0.9, speed: 36, range: 240, armor: 4,
    skill: 'volley', skill2: 'crossShot', skillName: 'Lục Mạch Thần Kiếm',
    desc: 'BẮN LAN: kiếm khí tầm 240 nổ lan 55% sát thương quanh mục tiêu, và BẮN SANG LANE KHÁC: đứng lane giữa vẫn bắn được lane trên và dưới.',
    unlockCost: 1000, scale: 1.3,
  }),
  U({
    id: 'nhamdoanhdoanh', name: 'Nhậm Doanh Doanh', kind: 'general', cost: 58,
    hp: 420, dmg: 14, cd: 1.2, speed: 36, range: 170, armor: 4,
    skill: 'springAura', skillName: 'Thanh Tâm Phổ Thiện Chú',
    desc: 'HỒI MÁU DIỆN RỘNG: tiếng đàn hồi 3% máu tối đa mỗi 2 giây cho đồng đội trong bán kính 150. KẾT HỢP: đi cùng Lệnh Hồ Xung, mỗi 5 giây hồi 6% máu cho cả hai.',
    combo: { with: ['lenhhoxung'], kind: 'heal' },
    unlockCost: 1000, scale: 1.25,
  }),
  U({
    id: 'hoangduocsu', name: 'Hoàng Dược Sư', kind: 'general', cost: 62,
    hp: 480, dmg: 28, cd: 1.0, speed: 40, range: 180, armor: 6,
    skill: 'volley', skill2: 'vanish', skillName: 'Đạn Chỉ Thần Thông',
    desc: 'BẮN LAN: đạn chỉ nổ lan 55% sát thương quanh mục tiêu. KHÔNG THỂ CHỌN LÀM MỤC TIÊU: cứ 12 giây ẩn thân trong trận ngũ hành 4 giây.',
    unlockCost: 1100, scale: 1.3,
  }),
  U({
    id: 'modungphuc', name: 'Mộ Dung Phục', kind: 'general', cost: 62,
    hp: 640, dmg: 32, cd: 0.9, speed: 44, range: 34, armor: 10,
    skill: 'reflect', skill2: 'cleave', skillName: 'Đẩu Chuyển Tinh Di',
    desc: 'Phản lại 30% sát thương nhận từ kẻ đánh gần (trong 90). ĐÁNH LAN: mỗi đòn lan 55% sát thương quanh mục tiêu.',
    unlockCost: 1050, scale: 1.3,
  }),
  U({
    id: 'trubatgioi', name: 'Trư Bát Giới', kind: 'general', cost: 64,
    hp: 880, dmg: 32, cd: 1.1, speed: 34, range: 36, armor: 12,
    skill: 'cleave', skillName: 'Cửu Xỉ Đinh Ba',
    desc: 'ĐÁNH LAN: đinh ba lan 55% sát thương quanh mục tiêu. KẾT HỢP: Thầy Trò Tây Du, đi cùng Tôn Ngộ Không, Sa Tăng hoặc Đường Tăng cả hai +20% sát thương và +15% tốc độ đánh.',
    combo: { with: ['tonngokhong', 'satang', 'duongtang'], kind: 'power' },
    unlockCost: 1000, scale: 1.4,
  }),
  U({
    id: 'duongtang', name: 'Đường Tăng', kind: 'general', cost: 56,
    hp: 520, dmg: 10, cd: 1.4, speed: 30, range: 100, armor: 8,
    skill: 'ward', skill2: 'rescue', skillName: 'Kim Thiền Bảo Hộ',
    desc: 'MIỄN THƯƠNG: cứ 14 giây niệm chú, miễn nhiễm mọi sát thương 3 giây. HỒI MÁU: cứ 8 giây hồi 30% máu tối đa (+40) cho đồng đội thấp máu nhất trong 320.',
    unlockCost: 1100, scale: 1.2,
  }),
  U({
    id: 'thietphien', name: 'Thiết Phiến Công Chúa', kind: 'general', cost: 62,
    hp: 560, dmg: 26, cd: 1.0, speed: 42, range: 120, armor: 6,
    skill: 'launch', skill2: 'volley', skillName: 'Ba Tiêu Phiến',
    desc: 'HẤT TUNG: cứ 10 giây quạt cuồng phong hất tung mọi địch trước mặt (bán kính 100) lên không 1,6 giây, gây 55 sát thương. BẮN LAN: kiếm khí quạt nổ lan 55% sát thương.',
    unlockCost: 1100, scale: 1.25,
  }),
  U({
    id: 'kimsidieu', name: 'Kim Sí Đại Bàng', kind: 'general', cost: 68,
    hp: 640, dmg: 34, cd: 0.8, speed: 60, range: 36, armor: 8,
    skill: 'skyMount', skill2: 'cleave', skillName: 'Đại Bàng Triển Sí',
    desc: 'GỌI THÚ CƯỠI BAY: cứ 16 giây triệu Kim Sí Điêu, bay lên trời 7 giây: chỉ tướng và quân tầm xa mới đánh trúng, chạy nhanh hơn 30%. ĐÁNH LAN: mỗi đòn lan 55% sát thương.',
    mount: 'eagle', mountSec: 7, unlockCost: 1250, scale: 1.3,
  }),
  U({
    id: 'diatang', name: 'Địa Tạng Vương', kind: 'general', cost: 70,
    hp: 600, dmg: 18, cd: 1.2, speed: 32, range: 100, armor: 10,
    skill: 'resurrect', skill2: 'ward', skillName: 'Địa Ngục Bất Không',
    desc: 'HỒI SINH ĐỒNG ĐỘI: cứ 18 giây gọi hồn lính/thú vừa ngã xuống sống lại với 55% máu. MIỄN THƯƠNG: cứ 14 giây miễn nhiễm mọi sát thương 3 giây.',
    unlockCost: 1300, scale: 1.3,
  }),
  U({
    id: 'laoquan', name: 'Thái Thượng Lão Quân', kind: 'general', cost: 72,
    hp: 560, dmg: 24, cd: 1.2, speed: 34, range: 180, armor: 8,
    skill: 'freeze', skill2: 'skyMount', skillName: 'Bát Quái Lô Hàn Băng',
    desc: 'ĐÓNG BĂNG: cứ 13 giây đóng băng 3 địch gần nhất trong 260 suốt 2,5s (chịu thêm 25% sát thương). GỌI THÚ CƯỠI BAY: cứ 16 giây gọi Thanh Ngưu bay lên trời 6 giây (chỉ tướng và quân tầm xa đánh trúng).',
    mount: 'ox', mountSec: 6, unlockCost: 1300, scale: 1.3,
  }),

  // ───────────── BOSS ─────────────
  U({
    id: 'dongtrac', name: 'Đổng Trác', kind: 'boss', cost: 0,
    hp: 3150, dmg: 46, cd: 1.3, speed: 20, range: 50, armor: 16,
    skill: 'tyrant', skillName: 'Bạo Chúa',
    desc: 'Mỗi 9s triệu hồi 2 Samurai. Dưới 50% máu sẽ nổi điên (+40% sát thương, chạy nhanh hơn). 3 giai đoạn: dưới 50% hạ lệnh tăng sức quân; dưới 20% hóa to, triệu hồi 4 Samurai và lửa thiêu Hoàng Thành.',
    unlockCost: 0, scale: 1.9,
  }),
  U({
    id: 'dongphuongbatbai', name: 'Đông Phương Bất Bại', kind: 'boss', cost: 0,
    hp: 3250, dmg: 34, cd: 0.7, speed: 46, range: 44, armor: 12,
    skill: 'phantom', skillName: 'Quỳ Hoa Bảo Điển',
    desc: 'Né 25% đòn đơn mục tiêu; cứ 7 giây lướt xuyên đội hình địch gây 90 sát thương cho mọi kẻ trên đường. 3 giai đoạn: dưới 50% lướt thêm một chiêu; dưới 20% rừng ám khí xuất hiện; khi chết phân thân thành 2 → 4 → 8 bản nhỏ hơn.',
    unlockCost: 0, scale: 1.85,
  }),
  U({
    id: 'nguumavuong', name: 'Ngưu Ma Vương', kind: 'boss', cost: 0,
    hp: 3450, dmg: 48, cd: 1.4, speed: 22, range: 56, armor: 14,
    skill: 'inferno', skillName: 'Hỏa Diệm Vương',
    desc: 'Cứ 10 giây phun sóng lửa rộng (85 sát thương, thiêu đốt 10 máu/giây trong 4 giây). Dưới 50% máu sát thương +30%. 3 giai đoạn: dưới 50% thêm hỏa tập; dưới 20% hóa thân khổng lồ và núi lửa phun trào xuống đội hình bạn.',
    unlockCost: 0, scale: 2.05,
  }),
  U({
    id: 'caocau', name: 'Cao Cầu', kind: 'boss', cost: 0,
    hp: 3700, dmg: 50, cd: 1.2, speed: 24, range: 50, armor: 16,
    skill: 'warlord', skill2: 'dragonPalm', skillName: 'Thái Úy Chuyên Quyền',
    desc: 'Cứ 11 giây hạ lệnh: toàn quân địch cùng lane +25% sát thương và +15% tốc độ đánh trong 5 giây; cứ 9 giây tung chưởng rồng 140 sát thương và đẩy lùi đội hình của bạn. 3 giai đoạn: dưới 50% gọi lính giáo và ban khiên khí; dưới 20% cấm vệ kỵ binh xuất trận.',
    unlockCost: 0, scale: 1.9,
  }),
  U({
    id: 'diemla', name: 'Diêm La Vương', kind: 'boss', cost: 0,
    hp: 3900, dmg: 54, cd: 1.3, speed: 22, range: 56, armor: 14,
    skill: 'poisonCloud', skill2: 'stun', skillName: 'Phán Quan Âm Phủ',
    desc: 'Cứ 9 giây thả mây độc lên cụm quân bạn (30 sát thương rồi mất 12 máu/giây trong 6 giây); cứ 11 giây khiến 3 quân gần nhất đứng yên 2 giây. 3 giai đoạn: dưới 50% thêm hỏa tập và Quỷ Binh; dưới 20% sương độc phủ chiến trường và mưa độc rơi xuống quân bạn.',
    unlockCost: 0, scale: 2.05,
  }),
  U({
    id: 'cuumatri', name: 'Cưu Ma Trí', kind: 'boss', cost: 0,
    hp: 4100, dmg: 56, cd: 1.3, speed: 24, range: 52, armor: 16,
    skill: 'fireAttack', skill2: 'reflect', skillName: 'Hỏa Diệm Đao · Tiểu Vô Tướng',
    desc: 'Cứ 8 giây phóng Hỏa Diệm Đao vào chỗ quân bạn đông nhất (130 sát thương, xuyên giáp); phản lại 30% sát thương nhận từ kẻ đánh gần. 3 giai đoạn: dưới 50% thêm Đóng băng và gọi 3 La Hán hộ pháp; dưới 20% mặt đất cháy rực và mưa lửa rơi xuống quân bạn.',
    unlockCost: 0, scale: 1.9,
  }),
  U({
    id: 'hoangmi', name: 'Hoàng Mi Đại Vương', kind: 'boss', cost: 0,
    hp: 4300, dmg: 58, cd: 1.2, speed: 24, range: 50, armor: 15,
    skill: 'launch', skill2: 'stun', skillName: 'Kim Nạo Chấn Thiên',
    desc: 'Cứ 10 giây đập Kim Nạo hất tung mọi quân bạn trước mặt (bán kính 100) lên không 1,6 giây, gây 55 sát thương; cứ 11 giây khiến 3 quân gần nhất đứng yên 2 giây. 3 giai đoạn: dưới 50% thêm mây độc và gọi 2 Hổ Núi; dưới 20% hóa to, sương độc phủ Tiểu Lôi Âm Tự và mưa độc rơi xuống quân bạn.',
    unlockCost: 0, scale: 2.0,
  }),
  U({
    id: 'tonquyen', name: 'Tôn Quyền', kind: 'boss', cost: 0,
    hp: 4500, dmg: 60, cd: 1.2, speed: 26, range: 56, armor: 16,
    skill: 'melody', skill2: 'blessing', skillName: 'Giang Đông Bá Nghiệp',
    desc: 'Cứ 9 giây tấu khúc làm quân bạn quanh mục tiêu bị chậm 45% trong 4 giây và chịu 55 sát thương; cứ 10 giây rưới phúc cho quân địch quanh mình (hồi 10% máu, khiên khí 50). 3 giai đoạn: dưới 50% thêm hỏa công và gọi 3 Nỏ Thủ; dưới 20% kỵ binh Giang Đông xuất trận, gò cao nổi lên và hỏa tiễn rơi xuống quân bạn.',
    unlockCost: 0, scale: 1.9,
  }),

  U({
    id: 'thanhcat', name: 'Thành Cát Tư Hãn', kind: 'boss', cost: 0,
    hp: 6500, dmg: 78, cd: 1.1, speed: 32, range: 60, armor: 20,
    skill: 'warlord', skill2: 'charge', skillName: 'Vó Ngựa Đại Hãn',
    desc: 'Cứ 11 giây hạ lệnh: quân địch cùng lane +25% sát thương, +15% tốc độ đánh trong 5 giây; đòn đầu tiên lao tới rất mạnh. 3 giai đoạn: dưới 50% thêm lướt nhanh và triệu 3 kỵ binh; dưới 20% đòn đánh nhanh hơn, giáp dày hơn, gọi thêm 4 kỵ binh, gò cao nổi lên và lửa rơi xuống quân bạn.',
    unlockCost: 0, scale: 1.9,
  }),
  U({
    id: 'chunghoi', name: 'Chung Hội', kind: 'boss', cost: 0,
    hp: 7500, dmg: 84, cd: 1.1, speed: 28, range: 60, armor: 22,
    skill: 'freeze', skill2: 'shieldAura', skillName: 'Phản Kế Diệt Thục',
    desc: 'Cứ 13 giây đóng băng 3 quân bạn gần nhất trong 2,5 giây (nhận thêm 25% sát thương); cứ 12 giây ban khiên khí cho quân địch quanh mình. 3 giai đoạn: dưới 50% thêm hạ lệnh tăng sức cả đàn và gọi 4 nỏ thủ; dưới 20% sát thương tăng mạnh, tự hồi máu, gọi thêm 4 lính giáo, khí độc bao phủ và độc rơi xuống quân bạn.',
    unlockCost: 0, scale: 1.9,
  }),
  U({
    id: 'ngochoang', name: 'Ngọc Hoàng Đại Đế', kind: 'boss', cost: 0,
    hp: 9500, dmg: 90, cd: 1.2, speed: 26, range: 70, armor: 24,
    skill: 'thunder', skill2: 'blessing', skillName: 'Thiên Lôi Giáng Thế',
    desc: 'Cứ 15 giây giáng lôi xuống đội hình bạn; cứ 10 giây rưới phúc cho quân địch quanh mình (hồi 10% máu, khiên khí 50). 3 giai đoạn: dưới 50% thêm đóng băng và gọi 3 đạo sĩ; dưới 20% hồi máu, giáp dày hơn, gọi 4 hàn băng đạo sĩ, lửa thiên giới thiêu đốt quân bạn.',
    unlockCost: 0, scale: 2.0,
  }),

  // ───────────── ĐỒ PHÒNG THỦ ─────────────
  U({
    id: 'wall', name: 'Tường Thành', kind: 'defense', cost: 18,
    hp: 900, dmg: 0, cd: 1, speed: 0, range: 0, armor: 20,
    skill: 'wall', skillName: 'Chắn Đường',
    desc: 'Bức tường đá chắn ngang lane: địch buộc phải phá tường mới đi tiếp. Rất trâu, giáp 20.',
    unlockCost: 0, scale: 1,
  }),
  U({
    id: 'spikewall', name: 'Tường Gai', kind: 'defense', cost: 22,
    hp: 480, dmg: 16, cd: 1.2, speed: 0, range: 70, armor: 8,
    skill: 'thorns', skillName: 'Gai Nhọn',
    desc: 'Vừa chắn đường vừa đâm gai: cứ 1,2 giây gây 16 sát thương (xuyên 50% giáp) lên mọi địch trong 70 đơn vị.',
    unlockCost: 200, scale: 1,
  }),
  U({
    id: 'archertower', name: 'Tháp Cung', kind: 'defense', cost: 24,
    hp: 360, dmg: 14, cd: 1.0, speed: 0, range: 260, armor: 6,
    skill: 'tower', skillName: 'Xạ Thủ Canh Gác',
    desc: 'Tháp canh bắn tên liên tục vào địch gần nhất trong tầm 260.',
    unlockCost: 0, scale: 1.1,
  }),
  U({
    id: 'ballista', name: 'Nỏ Thần', kind: 'defense', cost: 30,
    hp: 300, dmg: 60, cd: 3.0, speed: 0, range: 380, armor: 4,
    skill: 'ballista', skillName: 'Mũi Tên Khổng Lồ',
    desc: 'Nỏ cực lớn bắn rất xa (380): 60 sát thương mỗi 3 giây, xuyên 40% giáp.',
    unlockCost: 300, scale: 1.15,
  }),
  U({
    id: 'catapult', name: 'Pháo Thạch', kind: 'defense', cost: 32,
    hp: 320, dmg: 38, cd: 3.2, speed: 0, range: 300, armor: 6,
    skill: 'catapult', skillName: 'Đá Tảng',
    desc: 'Bệ máy ném đá cố định: mỗi 3,2 giây ném đá gây 38 sát thương lan bán kính 55 trong tầm 300.',
    unlockCost: 320, scale: 1.2,
  }),
  U({
    id: 'spiketrap', name: 'Bẫy Gai', kind: 'defense', cost: 12,
    hp: 1, dmg: 120, cd: 1, speed: 0, range: 45, armor: 0,
    skill: 'trap', skillName: 'Gai Bật',
    desc: 'Bẫy ẩn dưới đất: khi địch bước tới, gai bật lên gây 120 sát thương lan (bán kính 70) và làm choáng 1,5 giây, rồi biến mất.',
    tags: ['ghost'], unlockCost: 150, scale: 1,
  }),
  U({
    id: 'firepit', name: 'Hố Lửa', kind: 'defense', cost: 16,
    hp: 1, dmg: 14, cd: 1, speed: 0, range: 70, armor: 0, life: 14,
    skill: 'firepit', skillName: 'Thiêu Đốt',
    desc: 'Vùng lửa cháy 14 giây: địch đi qua bán kính 70 bị thiêu 14 sát thương mỗi giây (xuyên giáp). Không chặn đường.',
    tags: ['ghost'], unlockCost: 200, scale: 1,
  }),
  U({
    id: 'drum', name: 'Trống Chiến', kind: 'defense', cost: 22,
    hp: 280, dmg: 0, cd: 1, speed: 0, range: 200, armor: 6,
    skill: 'drum', skillName: 'Tiếng Trống Xung Trận',
    desc: 'Đồng đội trong bán kính 200 được +10% sát thương và +20% tốc độ đánh khi còn gần trống.',
    unlockCost: 250, scale: 1.1,
  }),
  U({
    id: 'altar', name: 'Tế Đàn Hồi Phục', kind: 'defense', cost: 24,
    hp: 300, dmg: 14, cd: 2.0, speed: 0, range: 160, armor: 6,
    skill: 'altar', skillName: 'Phúc Lành',
    desc: 'Cứ 2 giây hồi 14 máu cho mọi đồng đội trong bán kính 160.',
    unlockCost: 260, scale: 1.1,
  }),
  U({
    id: 'frosttotem', name: 'Trụ Băng', kind: 'defense', cost: 22,
    hp: 300, dmg: 10, cd: 4.0, speed: 0, range: 150, armor: 6,
    skill: 'frost', skillName: 'Hàn Băng',
    desc: 'Cứ 4 giây phát sóng lạnh: địch trong bán kính 150 bị chậm 45% trong 3 giây và nhận 10 sát thương.',
    unlockCost: 280, scale: 1.1,
  }),

  // ───────────── THÚ TRIỆU HỒI ─────────────
  U({
    id: 'khicon', name: 'Khỉ Con', kind: 'summon', cost: 0,
    hp: 200, dmg: 10, cd: 0.5, speed: 84, range: 26, armor: 2,
    skill: 'none', skillName: 'Phân Thân',
    desc: 'Phân thân lông khỉ của Ngộ Không: 30% máu, sát thương và giáp của chủ (tăng theo cấp, tối đa 50%), tồn tại 5 giây.',
    unlockCost: 0, scale: 0.72, life: 5,
  }),
  // ───────────── QUÁI THÚ (địch) ─────────────
  U({
    id: 'soihoang', name: 'Sói Hoang', kind: 'beast', cost: 12,
    hp: 95, dmg: 12, cd: 0.5, speed: 72, range: 26, armor: 1,
    skill: 'quick', skillName: 'Vồ Nhanh',
    desc: 'Sói rừng nhanh nhẹn, cắn liên tục. Mỏng máu nhưng lao tới rất nhanh.',
    unlockCost: 0, scale: 1,
  }),
  U({
    id: 'lonrung', name: 'Lợn Rừng', kind: 'beast', cost: 16,
    hp: 190, dmg: 14, cd: 1, speed: 50, range: 28, armor: 4,
    skill: 'charge', skillName: 'Húc Xung Phong',
    desc: 'Lợn lòi húc thẳng vào đội hình: đòn đầu tiên cộng thêm sát thương theo quãng đường đã chạy.',
    unlockCost: 0, scale: 1,
  }),
  U({
    id: 'gauden', name: 'Gấu Đen', kind: 'beast', cost: 28,
    hp: 480, dmg: 24, cd: 1.1, speed: 30, range: 32, armor: 8,
    skill: 'berserk', skillName: 'Gấu Điên',
    desc: 'Gấu núi to khỏe, càng mất máu càng điên cuồng (sát thương tăng theo máu đã mất).',
    unlockCost: 0, scale: 1.1,
  }),
  U({
    id: 'hocnui', name: 'Hổ Núi', kind: 'beast', cost: 30,
    hp: 330, dmg: 30, cd: 0.9, speed: 54, range: 32, armor: 6,
    skill: 'sweep', skillName: 'Vồ Quét',
    desc: 'Chúa sơn lâm: mỗi đòn thứ 3 vồ quét diện rộng, gây x1.8 sát thương.',
    unlockCost: 0, scale: 1.1,
  }),
  U({
    id: 'mangxa', name: 'Mãng Xà', kind: 'beast', cost: 18,
    hp: 120, dmg: 8, cd: 1, speed: 36, range: 120, armor: 2,
    skill: 'poisoner', skillName: 'Nọc Rắn',
    desc: 'Rắn lớn phun nọc độc từ xa: mục tiêu trúng đòn mất 9 máu mỗi giây trong 5 giây (xuyên giáp).',
    unlockCost: 0, scale: 1,
  }),
  U({
    id: 'baoden', name: 'Báo Đen', kind: 'beast', cost: 20,
    hp: 110, dmg: 14, cd: 0.6, speed: 82, range: 28, armor: 2,
    skill: 'ninja', skillName: 'Thân Pháp Báo',
    desc: 'Báo đen lướt như bóng: 30% né đòn đơn mục tiêu, phá cờ gấp đôi sát thương.',
    unlockCost: 0, scale: 1,
  }),
  U({
    id: 'tegiac', name: 'Tê Giác Sắt', kind: 'beast', cost: 34,
    hp: 520, dmg: 28, cd: 1.5, speed: 26, range: 34, armor: 14,
    skill: 'trample', skillName: 'Giậm Sừng',
    desc: 'Tê giác da sắt, giáp rất dày. Mỗi đòn húc gây sát thương lan bán kính 55.',
    unlockCost: 0, scale: 1.15,
  }),
  U({
    id: 'honglong', name: 'Hỏa Long', kind: 'beast', cost: 38,
    hp: 320, dmg: 16, cd: 1.2, speed: 34, range: 230, armor: 6,
    skill: 'fireAttack', skillName: 'Long Hỏa',
    desc: 'Rồng lửa nhỏ: mỗi 8 giây phun lửa xuống chỗ địch đông nhất lane (130 sát thương, xuyên giáp).',
    unlockCost: 0, scale: 1.1,
  }),
  U({
    id: 'philong', name: 'Phi Long Liệt Hỏa', kind: 'beast', cost: 40,
    hp: 380, dmg: 18, cd: 1.3, speed: 46, range: 215, armor: 4,
    skill: 'fireAttack', skill2: 'skyRoam', skillName: 'Liệt Hỏa Phi Thiên',
    desc: 'Rồng lửa BAY trên không: chỉ tướng và quân tầm xa (cung, nỏ, pháo...) mới đánh trúng; kỵ binh và quân cận chiến không chạm tới. Mỗi 8 giây phun lửa xuống chỗ quân ta đông nhất lane (130 sát thương, xuyên giáp); cứ 10 giây có thể bay sang lane bên cạnh đang cần chi viện.',
    tags: ['fly'], unlockCost: 0, scale: 1.25,
  }),
  U({
    id: 'holy', name: 'Hồ Ly Tinh', kind: 'beast', cost: 30,
    hp: 260, dmg: 22, cd: 0.7, speed: 64, range: 28, armor: 2,
    skill: 'blink', skillName: 'Hồ Ly Thoát Ảnh',
    desc: 'Yêu hồ 3 đuôi DỊCH CHUYỂN: cứ 9 giây hiện ra sau lưng cụm quân bạn đông nhất ở bất kỳ lane nào, gây 85 sát thương lan và làm choáng 0,8 giây.',
    unlockCost: 0, scale: 1,
  }),
  U({
    id: 'diatrung', name: 'Địa Long Trùng', kind: 'beast', cost: 32,
    hp: 420, dmg: 26, cd: 1.1, speed: 30, range: 30, armor: 8,
    skill: 'burrow', skillName: 'Độn Thổ',
    desc: 'Sâu đất khổng lồ ĐỘN THỔ: cứ 11 giây chui xuống đất (không bị đánh trúng), lao tới rồi trồi lên gây 100 sát thương lan và làm choáng 1 giây.',
    unlockCost: 0, scale: 1.1,
  }),
  U({
    id: 'loithu', name: 'Thiên Lôi Thú', kind: 'beast', cost: 44,
    hp: 360, dmg: 16, cd: 1.2, speed: 34, range: 190, armor: 6,
    skill: 'thunder', skillName: 'Lôi Thú Nộ Hống',
    desc: 'Quái sấm sét: cứ 15 giây giáng sét xuống MỌI quân bạn ở cả 3 lane (60 sát thương, xuyên 50% giáp).',
    unlockCost: 0, scale: 1.15,
  }),
  U({
    id: 'soivuong', name: 'Sói Vương', kind: 'beast', cost: 36,
    hp: 520, dmg: 24, cd: 0.7, speed: 60, range: 30, armor: 6,
    skill: 'howl', skillName: 'Hú Gọi Bầy',
    desc: 'Tiếng hú vang sang cả lane liền kề: cứ 12 giây quái trong bán kính 260 (kể cả lane bên cạnh) +20% sát thương và +15% tốc độ chạy trong 5 giây.',
    unlockCost: 0, scale: 1.2,
  }),
  U({
    id: 'nhendoc', name: 'Nhện Độc', kind: 'beast', cost: 28,
    hp: 240, dmg: 12, cd: 0.9, speed: 40, range: 170, armor: 2,
    skill: 'poisoner', skill2: 'crossShot', skillName: 'Tơ Độc Xuyên Lane',
    desc: 'Nhện phun nọc độc từ xa (9 máu/giây trong 5 giây, xuyên giáp) và BẮN SANG LANE KHÁC: đứng ở lane giữa vẫn bắn được lane trên và dưới.',
    unlockCost: 0, scale: 1,
  }),
  U({
    id: 'cacau', name: 'Cá Sấu Sông', kind: 'beast', cost: 24,
    hp: 360, dmg: 26, cd: 1.0, speed: 40, range: 32, armor: 10,
    skill: 'charge', skillName: 'Lao Đớp',
    desc: 'Thủy quái chỉ ở lane sông: cá sấu lao nhanh vào đội hình, đòn đầu tiên cộng thêm sát thương theo quãng đường đã bơi.',
    tags: ['naval'], unlockCost: 0, scale: 1.1,
  }),
  U({
    id: 'camap', name: 'Cá Mập', kind: 'beast', cost: 22,
    hp: 230, dmg: 22, cd: 0.6, speed: 74, range: 28, armor: 2,
    skill: 'berserk', skillName: 'Máu Tanh',
    desc: 'Thủy quái chỉ ở lane sông: bơi rất nhanh, càng mất máu càng cắn đau (tối đa +120% sát thương khi sắp chết).',
    tags: ['naval'], unlockCost: 0, scale: 1,
  }),
  U({
    id: 'ruathan', name: 'Rùa Thần', kind: 'beast', cost: 30,
    hp: 700, dmg: 16, cd: 1.4, speed: 20, range: 30, armor: 22,
    skill: 'monk', skillName: 'Giáp Mai Rùa',
    desc: 'Thủy quái chỉ ở lane sông: rùa khổng lồ giáp cực dày; mai rùa tạo khiên khí 80 sát thương, dựng lại sau 8 giây khi vỡ.',
    tags: ['naval'], unlockCost: 0, scale: 1.3,
  }),
  U({
    id: 'giaolong', name: 'Giao Long', kind: 'beast', cost: 40,
    hp: 420, dmg: 20, cd: 1.2, speed: 32, range: 200, armor: 6,
    skill: 'tide', skillName: 'Thủy Triều',
    desc: 'Thủy quái chỉ ở lane sông: rồng nước phun sóng từ xa; cứ 12 giây dâng sóng quét 75 sát thương và đẩy lùi cả đội hình bạn.',
    tags: ['naval'], unlockCost: 0, scale: 1.4,
  }),
  // ───────────── QUÁI THÚ ĐỢT MỚI (yêu quái Tây Du · Địa Phủ) ─────────────
  U({
    id: 'bachcot', name: 'Bạch Cốt Tinh', kind: 'beast', cost: 34,
    hp: 360, dmg: 24, cd: 1.0, speed: 40, range: 30, armor: 6,
    skill: 'undying', skill2: 'vanish', skillName: 'Tam Biến Bạch Cốt',
    desc: 'HỒI SINH: bị hạ vẫn sống lại tối đa 2 lần, mỗi lần 45% máu. KHÔNG THỂ CHỌN LÀM MỤC TIÊU: cứ 12 giây hóa thành làn khói trắng 4 giây (chỉ chịu sát thương lan).',
    unlockCost: 0, scale: 1,
  }),
  U({
    id: 'hacphong', name: 'Hắc Phong Hùng Quái', kind: 'beast', cost: 30,
    hp: 520, dmg: 26, cd: 1.1, speed: 34, range: 34, armor: 8,
    skill: 'cleave', skill2: 'berserk', skillName: 'Hắc Phong Điên Cuồng',
    desc: 'ĐÁNH LAN: mỗi đòn vả lan 55% sát thương lên quân quanh mục tiêu; càng mất máu càng đánh đau (tối đa +120%).',
    unlockCost: 0, scale: 1.2,
  }),
  U({
    id: 'hoangphong', name: 'Hoàng Phong Quái', kind: 'beast', cost: 28,
    hp: 260, dmg: 18, cd: 1.2, speed: 50, range: 150, armor: 2,
    skill: 'launch', skillName: 'Tam Muội Cuồng Phong',
    desc: 'HẤT TUNG: cứ 10 giây thổi cuồng phong hất tung mọi quân bạn phía trước (bán kính 100) lên không 1,6 giây, gây 55 sát thương.',
    unlockCost: 0, scale: 1,
  }),
  U({
    id: 'tuongtinh', name: 'Bạch Tượng Tinh', kind: 'beast', cost: 36,
    hp: 700, dmg: 28, cd: 1.5, speed: 26, range: 38, armor: 12,
    skill: 'cleave', skillName: 'Voi Chúa Quét Ngà',
    desc: 'ĐÁNH LAN: ngà quét lan 55% sát thương lên quân quanh mục tiêu. Rất trâu, chậm chạp.',
    unlockCost: 0, scale: 1.6,
  }),
  U({
    id: 'sudavuong', name: 'Sư Đà Vương', kind: 'beast', cost: 36,
    hp: 560, dmg: 28, cd: 0.9, speed: 42, range: 34, armor: 8,
    skill: 'cleave', skill2: 'howl', skillName: 'Sư Hống Lan Tỏa',
    desc: 'ĐÁNH LAN: vuốt sư tử lan 55% sát thương. Tiếng hống vang sang cả lane liền kề: mỗi 12 giây quái trong bán kính 260 +20% sát thương và +15% tốc độ chạy trong 5 giây.',
    unlockCost: 0, scale: 1.3,
  }),
  U({
    id: 'phiung', name: 'Phi Ưng Quái', kind: 'beast', cost: 26,
    hp: 190, dmg: 20, cd: 0.8, speed: 70, range: 30, armor: 1,
    skill: 'leap', skillName: 'Ưng Kích Trường Không',
    desc: 'BAY: chỉ tướng và quân tầm xa mới đánh trúng. NHẢY RA SAU LƯNG: cứ 9 giây lao vọt qua đầu quân bạn, đáp xuống phía sau (ưu tiên xạ thủ), gây 70 sát thương lan, choáng 0,6s.',
    tags: ['fly'], unlockCost: 0, scale: 1,
  }),
  U({
    id: 'thanhnguu', name: 'Thanh Ngưu Tinh', kind: 'beast', cost: 34,
    hp: 620, dmg: 26, cd: 1.4, speed: 32, range: 36, armor: 12,
    skill: 'launch', skill2: 'cleave', skillName: 'Thanh Ngưu Hất Sừng',
    desc: 'HẤT TUNG: cứ 10 giây hất tung mọi quân bạn trước mặt (bán kính 100) lên không 1,6s, gây 55 sát thương. ĐÁNH LAN: mỗi cú húc lan 55% sát thương.',
    unlockCost: 0, scale: 1.3,
  }),
  U({
    id: 'thanhxa', name: 'Thanh Xà Tinh', kind: 'beast', cost: 24,
    hp: 150, dmg: 10, cd: 1.0, speed: 40, range: 130, armor: 2,
    skill: 'poisoner', skill2: 'vanish', skillName: 'Xà Độn Ẩn Hình',
    desc: 'Phun nọc độc từ xa (9 máu/giây trong 5 giây, xuyên giáp). KHÔNG THỂ CHỌN LÀM MỤC TIÊU: cứ 12 giây ẩn mình 4 giây (chỉ chịu sát thương lan).',
    unlockCost: 0, scale: 1,
  }),
  U({
    id: 'cuuvi', name: 'Cửu Vĩ Hồ Ly', kind: 'beast', cost: 38,
    hp: 340, dmg: 22, cd: 0.7, speed: 62, range: 30, armor: 3,
    skill: 'charm', skill2: 'leap', skillName: 'Cửu Vĩ Mê Hồn',
    desc: 'THÔI MIÊN: cứ 14 giây mê hoặc 2 quân bạn gần nhất, chúng quay sang đánh đồng đội 4 giây. NHẢY RA SAU LƯNG: cứ 9 giây vọt qua đầu và đáp xuống sau lưng đội hình bạn.',
    unlockCost: 0, scale: 1.15,
  }),
  U({
    id: 'langyeu', name: 'Lang Yêu Hấp Hồn', kind: 'beast', cost: 26,
    hp: 200, dmg: 14, cd: 1.2, speed: 44, range: 140, armor: 2,
    skill: 'charm', skillName: 'Hấp Hồn Nhãn',
    desc: 'THÔI MIÊN: cứ 14 giây nhìn chằm chằm 2 quân bạn gần nhất trong 300; chúng quay sang đánh đồng đội 4 giây.',
    unlockCost: 0, scale: 1.05,
  }),
  U({
    id: 'bangphuong', name: 'Băng Phượng', kind: 'beast', cost: 38,
    hp: 300, dmg: 16, cd: 1.2, speed: 44, range: 200, armor: 4,
    skill: 'freeze', skillName: 'Hàn Băng Vũ',
    desc: 'BAY: chỉ tướng và quân tầm xa mới đánh trúng. ĐÓNG BĂNG: cứ 13 giây đóng băng 3 quân bạn gần nhất 2,5 giây (chịu thêm 25% sát thương), tan băng bị chậm 30%.',
    tags: ['fly'], unlockCost: 0, scale: 1.15,
  }),
  U({
    id: 'hoaphuong', name: 'Hỏa Phượng', kind: 'beast', cost: 42,
    hp: 380, dmg: 18, cd: 1.2, speed: 44, range: 210, armor: 4,
    skill: 'fireAttack', skill2: 'rebirth', skillName: 'Phượng Hoàng Niết Bàn',
    desc: 'BAY: chỉ tướng và quân tầm xa mới đánh trúng. Mỗi 8 giây phun lửa xuống chỗ quân bạn đông nhất (130 sát thương, xuyên giáp). HỒI SINH: bị hạ lần đầu sống lại 70% máu và nổ lửa 90 sát thương lan.',
    tags: ['fly'], unlockCost: 0, scale: 1.2,
  }),
  U({
    id: 'macau', name: 'Địa Ngục Ma Cẩu', kind: 'beast', cost: 28,
    hp: 260, dmg: 22, cd: 0.7, speed: 66, range: 28, armor: 4,
    skill: 'leap', skill2: 'berserk', skillName: 'Ma Cẩu Vồ Hậu',
    desc: 'NHẢY RA SAU LƯNG: cứ 9 giây vọt qua đầu quân bạn, đáp xuống phía sau (ưu tiên xạ thủ), gây 70 sát thương lan, choáng 0,6s. Càng mất máu càng điên cuồng.',
    unlockCost: 0, scale: 1.05,
  }),
  U({
    id: 'ngocong', name: 'Ngô Công Tinh', kind: 'beast', cost: 26,
    hp: 240, dmg: 14, cd: 0.9, speed: 46, range: 30, armor: 6,
    skill: 'poisoner', skill2: 'cleave', skillName: 'Trăm Chân Độc Nanh',
    desc: 'ĐÁNH LAN: nanh độc lan 55% sát thương quanh mục tiêu, mục tiêu trúng đòn bị nhiễm độc 9 máu/giây trong 5 giây (xuyên giáp).',
    unlockCost: 0, scale: 1.1,
  }),
  U({
    id: 'khongtuoc', name: 'Khổng Tước Minh Vương', kind: 'beast', cost: 36,
    hp: 330, dmg: 20, cd: 1.1, speed: 40, range: 200, armor: 4,
    skill: 'volley', skillName: 'Ngũ Sắc Thần Quang',
    desc: 'BAY: chỉ tướng và quân tầm xa mới đánh trúng. BẮN LAN: chùm lông vũ ngũ sắc nổ lan 55% sát thương lên quân quanh mục tiêu.',
    tags: ['fly'], unlockCost: 0, scale: 1.2,
  }),
  U({
    id: 'moctinh', name: 'Mộc Thụ Tinh', kind: 'beast', cost: 32,
    hp: 600, dmg: 16, cd: 1.4, speed: 20, range: 40, armor: 10,
    skill: 'springAura', skill2: 'monk', skillName: 'Cổ Thụ Hồi Xuân',
    desc: 'HỒI MÁU DIỆN RỘNG: mỗi 2 giây hồi 3% máu tối đa cho quái trong bán kính 150; vỏ cây tạo khiên 80 sát thương, dựng lại sau 8 giây khi vỡ.',
    unlockCost: 0, scale: 1.4,
  }),
  U({
    id: 'hotinh', name: 'Hổ Tinh Phi Thân', kind: 'beast', cost: 32,
    hp: 380, dmg: 28, cd: 0.8, speed: 56, range: 30, armor: 5,
    skill: 'leap', skill2: 'sweep', skillName: 'Hổ Phi Sơn Lâm',
    desc: 'NHẢY RA SAU LƯNG: cứ 9 giây vọt qua đầu quân bạn, đáp xuống phía sau gây 70 sát thương lan, choáng 0,6s; mỗi đòn thứ 3 vồ quét diện rộng x1.8.',
    unlockCost: 0, scale: 1.15,
  }),
  U({
    id: 'nguudau', name: 'Ngưu Đầu', kind: 'beast', cost: 34,
    hp: 640, dmg: 28, cd: 1.2, speed: 34, range: 36, armor: 12,
    skill: 'cleave', skill2: 'berserk', skillName: 'Câu Hồn Phủ',
    desc: 'ĐÁNH LAN: rìu quét lan 55% sát thương; càng mất máu càng đánh đau. KẾT HỢP: đi cùng Mã Diện, cả hai +20% sát thương và +15% tốc độ đánh.',
    combo: { with: ['madien'], kind: 'power' },
    unlockCost: 0, scale: 1.4,
  }),
  U({
    id: 'madien', name: 'Mã Diện', kind: 'beast', cost: 30,
    hp: 400, dmg: 24, cd: 0.8, speed: 52, range: 30, armor: 6,
    skill: 'cleave', skill2: 'quick', skillName: 'Câu Hồn Tỏa',
    desc: 'ĐÁNH LAN: xích sắt quét lan 55% sát thương, ra đòn rất nhanh. KẾT HỢP: đi cùng Ngưu Đầu, cả hai +20% sát thương và +15% tốc độ đánh.',
    combo: { with: ['nguudau'], kind: 'power' },
    unlockCost: 0, scale: 1.2,
  }),
  U({
    id: 'cuongthi', name: 'Cương Thi Vương', kind: 'beast', cost: 34,
    hp: 520, dmg: 22, cd: 1.1, speed: 28, range: 30, armor: 10,
    skill: 'resurrect', skill2: 'ward', skillName: 'Thi Vương Hộ Thể',
    desc: 'HỒI SINH ĐỒNG ĐỘI: cứ 18 giây gọi quái vừa ngã xuống sống lại với 55% máu. MIỄN THƯƠNG: cứ 14 giây thây khô cứng, miễn nhiễm mọi sát thương 3 giây.',
    unlockCost: 0, scale: 1.2,
  }),
  // ───────────── QUÁI THÚ KHỔNG LỒ (trạm thứ 5 mỗi bản đồ, xuất hiện gần cuối trận) ─────────────
  U({
    id: 'nguoida', name: 'Người Đá Khổng Lồ', kind: 'beast', cost: 120,
    hp: 1100, dmg: 34, cd: 1.6, speed: 16, range: 40, armor: 22,
    skill: 'trample', skillName: 'Giậm Đất',
    desc: 'Pho tượng đá sống dậy gần cuối trận. Giáp cực dày, chậm chạp; mỗi đòn giậm gây sát thương lan bán kính 55.',
    tags: ['giant'], unlockCost: 0, scale: 2.1,
  }),
  U({
    id: 'cumang', name: 'Cự Mãng Ngàn Năm', kind: 'beast', cost: 120,
    hp: 900, dmg: 26, cd: 1.2, speed: 20, range: 130, armor: 10,
    skill: 'poisoner', skill2: 'poisonCloud', skillName: 'Độc Mãng',
    desc: 'Rắn khổng lồ phun nọc từ xa (9 máu/giây trong 5 giây, xuyên giáp); mỗi 9 giây thả mây độc lên cụm quân đông nhất.',
    tags: ['giant'], unlockCost: 0, scale: 2.1,
  }),
  U({
    id: 'culong', name: 'Cổ Long Thiên Hỏa', kind: 'beast', cost: 120,
    hp: 1000, dmg: 22, cd: 1.3, speed: 18, range: 240, armor: 12,
    skill: 'fireAttack', skillName: 'Thiên Hỏa',
    desc: 'Rồng cổ đại bay xuống gần cuối trận: mỗi 8 giây phun lửa xuống chỗ địch đông nhất lane (130 sát thương, xuyên giáp).',
    tags: ['giant'], unlockCost: 0, scale: 1.9,
  }),
  U({
    id: 'daitrung', name: 'Đại Trùng Cảnh Dương', kind: 'beast', cost: 120,
    hp: 1200, dmg: 34, cd: 0.9, speed: 26, range: 36, armor: 8,
    skill: 'sweep', skillName: 'Hổ Vồ',
    desc: 'Mãnh hổ khổng lồ nhảy ra gần cuối trận: mỗi đòn thứ 3 vồ quét diện rộng gây x1.8 sát thương.',
    tags: ['giant'], unlockCost: 0, scale: 2.3,
  }),
  U({
    id: 'quysai', name: 'Quỷ Sai Khổng Lồ', kind: 'beast', cost: 120,
    hp: 1300, dmg: 32, cd: 1.5, speed: 18, range: 44, armor: 14,
    skill: 'trample', skill2: 'stun', skillName: 'Câu Hồn Giậm Đất',
    desc: 'Quỷ sai Âm phủ trỗi dậy gần cuối trận: mỗi đòn giậm gây sát thương lan bán kính 55; cứ 11 giây khiến 3 quân gần nhất của bạn đứng yên 2 giây.',
    tags: ['giant'], unlockCost: 0, scale: 2.1,
  }),
  U({
    id: 'cutuong', name: 'Cự Tượng Đại Lý', kind: 'beast', cost: 120,
    hp: 1400, dmg: 36, cd: 1.6, speed: 16, range: 44, armor: 16,
    skill: 'trample', skill2: 'launch', skillName: 'Voi Chúa Hất Tung',
    desc: 'Bạch tượng khổng lồ xông ra gần cuối trận: mỗi đòn giậm gây sát thương lan bán kính 55; cứ 10 giây quật vòi hất tung mọi quân bạn trước mặt lên không 1,6 giây (55 sát thương).',
    tags: ['giant'], unlockCost: 0, scale: 2.3,
  }),
  U({
    id: 'cuquy', name: 'Cự Quy Thông Thiên', kind: 'beast', cost: 120,
    hp: 1500, dmg: 30, cd: 1.6, speed: 12, range: 42, armor: 24,
    skill: 'trample', skill2: 'ward', skillName: 'Mai Rùa Bất Hoại',
    desc: 'Rùa thần ngàn năm trồi lên gần cuối trận: giáp cực dày, rất chậm; mỗi đòn giậm gây sát thương lan bán kính 55; cứ 14 giây thu mình vào mai, miễn nhiễm mọi sát thương 3 giây.',
    tags: ['giant'], unlockCost: 0, scale: 2.2,
  }),
  U({
    id: 'cuhung', name: 'Sơn Việt Cự Hùng', kind: 'beast', cost: 120,
    hp: 1500, dmg: 38, cd: 1.0, speed: 22, range: 38, armor: 10,
    skill: 'berserk', skill2: 'cleave', skillName: 'Hùng Nộ Quét Ngang',
    desc: 'Gấu núi khổng lồ lao ra gần cuối trận: mỗi đòn quét lan 55% sát thương quanh mục tiêu; càng mất máu càng điên cuồng, đánh càng đau.',
    tags: ['giant'], unlockCost: 0, scale: 2.3,
  }),
  // ───────────── QUÁI HOANG DÃ (ổ quái giữa lane, đánh cả hai phe; xem data/wild.ts) ─────────────
  U({
    id: 'nhenme', name: 'Nhện Mẹ', kind: 'beast', cost: 100,
    hp: 900, dmg: 20, cd: 1.0, speed: 0, range: 40, armor: 6,
    skill: 'poisoner', skill2: 'brood', skillName: 'Nhện Mẹ Thả Đàn',
    desc: 'Chủ ổ nhện giữa lane, bất động. Cắn tẩm độc (9 máu/giây trong 5 giây) mọi quân cả hai phe đi ngang; cứ 3 cú cắn thả 1 nhện con, mỗi 8 giây thả thêm 2 con (tối đa 8). Hạ nhện mẹ là cả đàn tan biến và nhận thêm vàng thưởng.',
    tags: ['wild'], unlockCost: 0, scale: 1.9,
  }),
  U({
    id: 'nhencon', name: 'Nhện Con', kind: 'beast', cost: 6,
    hp: 75, dmg: 7, cd: 0.6, speed: 62, range: 26, armor: 0,
    skill: 'quick', skillName: 'Lúc Nhúc',
    desc: 'Nhện con do nhện mẹ thả ra: mỏng máu, chạy nhanh, đuổi đánh mọi quân gần ổ rồi quay về. Không có tiền thưởng.',
    tags: ['wild'], unlockCost: 0, scale: 0.55,
  }),
  U({
    id: 'langchua', name: 'Sói Chúa', kind: 'beast', cost: 100,
    hp: 820, dmg: 26, cd: 0.8, speed: 0, range: 38, armor: 7,
    skill: 'howl', skill2: 'brood', skillName: 'Sói Chúa Hú Gọi',
    desc: 'Chúa hang sói giữa lane, bất động. Cắn mọi quân cả hai phe đi ngang; cứ 3 cú cắn gọi 1 sói con, mỗi 9 giây gọi thêm 2 con (tối đa 6); tiếng hú tăng sức cho sói con. Hạ Sói Chúa là cả đàn tan biến và nhận thêm vàng thưởng.',
    tags: ['wild'], unlockCost: 0, scale: 1.6,
  }),
  U({
    id: 'soicon', name: 'Sói Con', kind: 'beast', cost: 8,
    hp: 95, dmg: 9, cd: 0.5, speed: 70, range: 26, armor: 1,
    skill: 'quick', skillName: 'Vồ Nhanh',
    desc: 'Sói con trong hang: chạy nhanh, cắn liên tục mọi quân gần hang rồi quay về. Không có tiền thưởng.',
    tags: ['wild'], unlockCost: 0, scale: 0.7,
  }),
  U({
    id: 'xamau', name: 'Xà Mẫu', kind: 'beast', cost: 100,
    hp: 760, dmg: 16, cd: 1.1, speed: 0, range: 130, armor: 5,
    skill: 'poisoner', skill2: 'brood', skillName: 'Xà Mẫu Sinh Đàn',
    desc: 'Chủ ổ rắn giữa lane, bất động. Phun nọc độc từ xa (9 máu/giây trong 5 giây) vào mọi quân cả hai phe; cứ 3 lần phun thả 1 rắn con, mỗi 8 giây thả thêm 2 con (tối đa 7). Hạ Xà Mẫu là cả đàn tan biến và nhận thêm vàng thưởng.',
    tags: ['wild'], unlockCost: 0, scale: 1.5,
  }),
  U({
    id: 'xacon', name: 'Rắn Con', kind: 'beast', cost: 6,
    hp: 70, dmg: 8, cd: 0.7, speed: 52, range: 26, armor: 0,
    skill: 'quick', skillName: 'Trườn Nhanh',
    desc: 'Rắn con do Xà Mẫu thả ra: mỏng máu, đuổi cắn mọi quân gần ổ rồi quay về. Không có tiền thưởng.',
    tags: ['wild'], unlockCost: 0, scale: 0.6,
  }),
  U({
    id: 'lonme', name: 'Lợn Mẹ Hung Dữ', kind: 'beast', cost: 100,
    hp: 1100, dmg: 24, cd: 1.1, speed: 0, range: 38, armor: 9,
    skill: 'berserk', skill2: 'brood', skillName: 'Lợn Mẹ Nổi Điên',
    desc: 'Chủ hang lợn rừng giữa lane, bất động. Húc mọi quân cả hai phe đi ngang, càng mất máu càng điên; cứ 3 cú húc thả 1 lợn con, mỗi 9 giây thả thêm 2 con (tối đa 6). Hạ lợn mẹ là cả đàn tan biến và nhận thêm vàng thưởng.',
    tags: ['wild'], unlockCost: 0, scale: 1.7,
  }),
  U({
    id: 'loncon', name: 'Lợn Con', kind: 'beast', cost: 8,
    hp: 110, dmg: 9, cd: 0.9, speed: 56, range: 26, armor: 2,
    skill: 'charge', skillName: 'Húc Xung Phong',
    desc: 'Lợn con lao húc mọi quân gần hang rồi quay về (đòn đầu cộng thêm sát thương theo quãng đường chạy). Không có tiền thưởng.',
    tags: ['wild'], unlockCost: 0, scale: 0.62,
  }),
  U({
    id: 'ngocongme', name: 'Ngô Công Mẫu', kind: 'beast', cost: 100,
    hp: 840, dmg: 18, cd: 1.0, speed: 0, range: 120, armor: 6,
    skill: 'poisoner', skill2: 'brood', skillName: 'Ngô Công Sinh Đàn',
    desc: 'Chủ ổ rết giữa lane, bất động. Phun nọc độc từ xa (9 máu/giây trong 5 giây) vào mọi quân cả hai phe; cứ 3 lần phun thả 1 rết con, mỗi 8 giây thả thêm 2 con (tối đa 7). Hạ Ngô Công Mẫu là cả đàn tan biến và nhận thêm vàng thưởng.',
    tags: ['wild'], unlockCost: 0, scale: 1.5,
  }),
  U({
    id: 'ngoconcon', name: 'Rết Con', kind: 'beast', cost: 6,
    hp: 72, dmg: 8, cd: 0.7, speed: 58, range: 26, armor: 0,
    skill: 'quick', skillName: 'Bò Nhanh',
    desc: 'Rết con do Ngô Công Mẫu thả ra: mỏng máu, đuổi cắn mọi quân gần ổ rồi quay về. Không có tiền thưởng.',
    tags: ['wild'], unlockCost: 0, scale: 0.6,
  }),
  // ───────────── SỰ KIỆN NGẪU NHIÊN ─────────────
  U({
    id: 'longthan', name: 'Long Thần', kind: 'summon', cost: 0,
    hp: 900, dmg: 34, cd: 1.1, speed: 40, range: 230, armor: 10,
    skill: 'fireAttack', skillName: 'Long Thần Giáng Thế',
    desc: 'Rồng thần từ sự kiện "Long Thần giáng thế": đứng về phía người chơi, phun lửa xuống chỗ địch đông nhất, tồn tại 30 giây.',
    unlockCost: 0, scale: 1.6, life: 30,
  }),
  U({
    id: 'quybinh', name: 'Quỷ Binh', kind: 'summon', cost: 0,
    hp: 170, dmg: 15, cd: 0.7, speed: 48, range: 28, armor: 4,
    skill: 'berserk', skillName: 'Oán Khí',
    desc: 'Quái từ sự kiện "Quỷ môn mở": 5 con tràn vào phe địch, càng mất máu càng điên cuồng.',
    unlockCost: 0, scale: 1.05,
  }),

  // ───────────── THÚ CƯNG (ta) ─────────────
  U({
    id: 'silverwolf', name: 'Sói Bạc', kind: 'pet', cost: 14,
    hp: 110, dmg: 13, cd: 0.55, speed: 74, range: 26, armor: 1,
    skill: 'quick', skillName: 'Vuốt Bạc',
    desc: 'Thú cưng nhanh nhẹn, cắn liên tục. Có sẵn từ đầu.',
    unlockCost: 0, scale: 1,
  }),
  U({
    id: 'panda', name: 'Gấu Trúc', kind: 'pet', cost: 22,
    hp: 360, dmg: 14, cd: 1.1, speed: 32, range: 28, armor: 10,
    skill: 'monk', skillName: 'Khí Giáp Trúc',
    desc: 'Gấu trúc mũm mĩm có lớp khí giáp hấp thụ 80 sát thương, tự dựng lại sau 8 giây khi vỡ.',
    unlockCost: 250, scale: 1.05,
  }),
  U({
    id: 'tigercub', name: 'Hổ Con', kind: 'pet', cost: 24,
    hp: 230, dmg: 26, cd: 0.85, speed: 56, range: 30, armor: 5,
    skill: 'sweep', skillName: 'Vồ Quét',
    desc: 'Hổ con hung dữ: mỗi đòn thứ 3 vồ quét diện rộng, gây x1.8 sát thương.',
    unlockCost: 400, scale: 1,
  }),
  U({
    id: 'jadesnake', name: 'Rắn Ngọc', kind: 'pet', cost: 16,
    hp: 100, dmg: 8, cd: 1, speed: 38, range: 120, armor: 1,
    skill: 'poisoner', skillName: 'Nọc Ngọc',
    desc: 'Rắn ngọc phun độc từ xa: mục tiêu mất 9 máu mỗi giây trong 5 giây (xuyên giáp).',
    unlockCost: 300, scale: 1,
  }),
  U({
    id: 'babydragon', name: 'Rồng Con', kind: 'pet', cost: 34,
    hp: 280, dmg: 16, cd: 1.2, speed: 36, range: 220, armor: 5,
    skill: 'fireAttack', skillName: 'Hỏa Tức',
    desc: 'Rồng con phun lửa: mỗi 8 giây thiêu chỗ địch đông nhất lane (130 sát thương, xuyên giáp).',
    unlockCost: 700, scale: 1.05,
  }),
  U({
    id: 'qilin', name: 'Kỳ Lân', kind: 'pet', cost: 30,
    hp: 300, dmg: 0, cd: 1, speed: 38, range: 0, armor: 6,
    skill: 'heal', skillName: 'Phúc Khí',
    desc: 'Linh thú chữa lành: mỗi 2 giây hồi máu cho đồng đội trong bán kính 120. Không tấn công.',
    unlockCost: 600, scale: 1.05,
  }),
  U({
    id: 'caheo', name: 'Cá Heo', kind: 'pet', cost: 15,
    hp: 150, dmg: 14, cd: 0.55, speed: 70, range: 28, armor: 1,
    skill: 'quick', skillName: 'Húc Nhanh',
    desc: 'Thú cưng THỦY: chỉ ra trận ở lane sông. Cá heo bơi cực nhanh, húc liên tục.',
    tags: ['naval'], unlockCost: 300, scale: 1,
  }),
  U({
    id: 'ruangoc', name: 'Rùa Ngọc', kind: 'pet', cost: 24,
    hp: 420, dmg: 12, cd: 1.2, speed: 24, range: 28, armor: 14,
    skill: 'monk', skillName: 'Mai Ngọc',
    desc: 'Thú cưng THỦY: chỉ ra trận ở lane sông. Rùa ngọc có mai tạo khiên khí 80 sát thương, dựng lại sau 8 giây khi vỡ.',
    tags: ['naval'], unlockCost: 450, scale: 1.1,
  }),
  // ───────────── THÚ CƯNG ĐỢT MỚI ─────────────
  U({
    id: 'bachhac', name: 'Bạch Hạc Tiên', kind: 'pet', cost: 24,
    hp: 200, dmg: 8, cd: 1.2, speed: 40, range: 90, armor: 2,
    skill: 'springAura', skillName: 'Tiên Hạc Phục Linh',
    desc: 'HỒI MÁU DIỆN RỘNG: mỗi 2 giây hồi 3% máu tối đa cho đồng đội trong bán kính 150 (kể cả bản thân). Đi sau lưng đồng đội, mổ địch khi tới gần.',
    unlockCost: 500, scale: 1.05,
  }),
  U({
    id: 'thandieu', name: 'Thần Điêu', kind: 'pet', cost: 30,
    hp: 330, dmg: 26, cd: 0.8, speed: 60, range: 32, armor: 5,
    skill: 'leap', skillName: 'Thần Điêu Đại Hiệp',
    desc: 'NHẢY RA SAU LƯNG: cứ 9 giây vọt qua đầu địch, đáp xuống phía sau (ưu tiên xạ thủ) gây 70 sát thương lan, choáng 0,6s. KẾT HỢP: đi cùng Dương Quá hoặc Tiểu Long Nữ, cả hai +20% sát thương và +15% tốc độ đánh.',
    combo: { with: ['duongqua', 'tieulongnu'], kind: 'power' },
    unlockCost: 800, scale: 1.1,
  }),
  U({
    id: 'bachlongma', name: 'Bạch Long Mã', kind: 'pet', cost: 28,
    hp: 300, dmg: 18, cd: 1.0, speed: 70, range: 30, armor: 4,
    skill: 'skyMount', skillName: 'Long Mã Đằng Vân',
    desc: 'GỌI THÚ CƯỠI BAY: cứ 16 giây hóa rồng bay lên trời 6 giây: chỉ tướng và quân tầm xa mới đánh trúng, chạy nhanh hơn 30%. KẾT HỢP: đi cùng Đường Tăng hoặc Tôn Ngộ Không, cả hai chạy nhanh hơn 25% và đánh nhanh hơn 20%.',
    mount: 'dragon', mountSec: 6, combo: { with: ['duongtang', 'tonngokhong'], kind: 'haste' },
    unlockCost: 800, scale: 1.1,
  }),
  U({
    id: 'khivang', name: 'Khỉ Vàng', kind: 'pet', cost: 18,
    hp: 140, dmg: 12, cd: 0.5, speed: 76, range: 26, armor: 1,
    skill: 'leap', skillName: 'Khỉ Vàng Phóng Hậu',
    desc: 'NHẢY RA SAU LƯNG: cứ 9 giây phóng qua đầu địch, đáp xuống phía sau gây 70 sát thương lan, choáng 0,6s. KẾT HỢP: đi cùng Tôn Ngộ Không, cả hai +20% sát thương và +15% tốc độ đánh.',
    combo: { with: ['tonngokhong'], kind: 'power' },
    unlockCost: 450, scale: 0.95,
  }),
  U({
    id: 'tieuho', name: 'Tiểu Hồ Ly', kind: 'pet', cost: 22,
    hp: 150, dmg: 10, cd: 1.1, speed: 56, range: 120, armor: 1,
    skill: 'charm', skillName: 'Mị Nhãn',
    desc: 'THÔI MIÊN: cứ 14 giây mê hoặc 2 địch gần nhất trong 300; chúng quay sang đánh đồng đội mình trong 4 giây (Boss miễn nhiễm).',
    unlockCost: 600, scale: 1,
  }),
  U({
    id: 'phuonghoangnon', name: 'Phượng Hoàng Non', kind: 'pet', cost: 28,
    hp: 220, dmg: 14, cd: 1.1, speed: 46, range: 180, armor: 3,
    skill: 'rebirth', skillName: 'Niết Bàn Non',
    desc: 'HỒI SINH: khi bị hạ lần đầu hóa lửa sống lại với 70% máu, bất tử 1,5 giây và nổ lửa 90 sát thương lan (bán kính 110). Phun lửa từ xa.',
    unlockCost: 750, scale: 1.05,
  }),
  U({
    id: 'tuyetlinh', name: 'Tuyết Linh Báo', kind: 'pet', cost: 24,
    hp: 190, dmg: 16, cd: 0.8, speed: 58, range: 30, armor: 3,
    skill: 'freeze', skillName: 'Hàn Sương Vồ',
    desc: 'ĐÓNG BĂNG: cứ 13 giây đóng băng 3 địch gần nhất trong 260 suốt 2,5s (chịu thêm 25% sát thương), tan băng bị chậm 30% trong 2s.',
    unlockCost: 600, scale: 1.05,
  }),
  U({
    id: 'linhquy', name: 'Linh Quy Hộ Mệnh', kind: 'pet', cost: 22,
    hp: 380, dmg: 10, cd: 1.3, speed: 22, range: 28, armor: 16,
    skill: 'ward', skill2: 'monk', skillName: 'Mai Rùa Bất Hoại',
    desc: 'MIỄN THƯƠNG: cứ 14 giây miễn nhiễm mọi sát thương 3 giây; mai rùa còn tạo khiên khí 80 sát thương, dựng lại sau 8 giây khi vỡ.',
    unlockCost: 700, scale: 1.1,
  }),
  U({
    id: 'trauvang', name: 'Trâu Vàng', kind: 'pet', cost: 26,
    hp: 420, dmg: 18, cd: 1.4, speed: 30, range: 34, armor: 10,
    skill: 'launch', skillName: 'Trâu Vàng Hất Sừng',
    desc: 'HẤT TUNG: cứ 10 giây hất tung mọi địch trước mặt (bán kính 100) lên không 1,6 giây, gây 55 sát thương.',
    unlockCost: 650, scale: 1.15,
  }),
  U({
    id: 'rongvan', name: 'Rồng Mây', kind: 'pet', cost: 34,
    hp: 280, dmg: 16, cd: 1.2, speed: 46, range: 190, armor: 4,
    skill: 'volley', skillName: 'Vân Long Phun Hỏa',
    desc: 'BAY: chỉ tướng và quân tầm xa mới đánh trúng. BẮN LAN: cầu lửa nổ lan 55% sát thương lên địch quanh mục tiêu (bán kính 60).',
    tags: ['fly'], unlockCost: 900, scale: 1.1,
  }),
  U({
    id: 'bachtho', name: 'Bạch Thố Ngọc', kind: 'pet', cost: 20,
    hp: 130, dmg: 6, cd: 1.2, speed: 56, range: 70, armor: 1,
    skill: 'rescue', skillName: 'Ngọc Thố Giã Dược',
    desc: 'HỒI MÁU: cứ 8 giây hồi 30% máu tối đa (+40) cho đồng đội thấp máu nhất trong 320, kể cả lane liền kề. Đi sau lưng đồng đội.',
    unlockCost: 500, scale: 0.95,
  }),
  U({
    id: 'thienkhuyen', name: 'Tiểu Thiên Khuyển', kind: 'pet', cost: 22,
    hp: 200, dmg: 15, cd: 0.6, speed: 72, range: 28, armor: 3,
    skill: 'leap', skillName: 'Khuyển Phi Hậu Tập',
    desc: 'NHẢY RA SAU LƯNG: cứ 9 giây vọt qua đầu địch, đáp xuống sau lưng gây 70 sát thương lan, choáng 0,6s. KẾT HỢP: đi cùng Dương Tiễn, mỗi 8 giây cả hai tung hợp kích lan bán kính 110.',
    combo: { with: ['duongtien'], kind: 'strike' },
    unlockCost: 700, scale: 1,
  }),
  U({
    id: 'langnho', name: 'Lang Vương Nhỏ', kind: 'pet', cost: 22,
    hp: 190, dmg: 14, cd: 0.6, speed: 68, range: 28, armor: 2,
    skill: 'leap', skill2: 'howl', skillName: 'Sói Con Hú Gọi',
    desc: 'NHẢY RA SAU LƯNG: cứ 9 giây vọt qua đầu địch đáp xuống sau lưng (70 sát thương lan, choáng 0,6s). Tiếng hú: cứ 12 giây đồng đội trong 260 (cả lane liền kề) +20% sát thương và +15% tốc độ chạy trong 5s.',
    unlockCost: 600, scale: 1,
  }),
  U({
    id: 'gaumat', name: 'Gấu Mật Võ Sĩ', kind: 'pet', cost: 26,
    hp: 360, dmg: 16, cd: 1.1, speed: 34, range: 30, armor: 6,
    skill: 'cleave', skill2: 'berserk', skillName: 'Gấu Mật Quyền',
    desc: 'ĐÁNH LAN: mỗi cú vả lan 55% sát thương lên địch quanh mục tiêu; càng mất máu càng đánh đau (tối đa +120%).',
    unlockCost: 550, scale: 1.1,
  }),
  U({
    id: 'thanloc', name: 'Thần Lộc', kind: 'pet', cost: 26,
    hp: 300, dmg: 6, cd: 1.5, speed: 44, range: 60, armor: 4,
    skill: 'springAura', skill2: 'rescue', skillName: 'Lộc Thần Phúc Ấm',
    desc: 'HỒI MÁU: mỗi 2 giây hồi 3% máu tối đa cho đồng đội trong 150; cứ 8 giây cứu chữa đồng đội thấp máu nhất (30% máu tối đa +40), kể cả lane liền kề.',
    unlockCost: 850, scale: 1.1,
  }),
  U({
    id: 'kylanlua', name: 'Kỳ Lân Lửa', kind: 'pet', cost: 30,
    hp: 260, dmg: 18, cd: 1.3, speed: 44, range: 170, armor: 4,
    skill: 'volley', skill2: 'fireAttack', skillName: 'Hỏa Kỳ Lân',
    desc: 'BẮN LAN: cầu lửa nổ lan 55% sát thương quanh mục tiêu; mỗi 8 giây phun lửa xuống chỗ địch đông nhất (130 sát thương, xuyên giáp).',
    unlockCost: 850, scale: 1.1,
  }),
  U({
    id: 'linhdieu', name: 'Linh Điểu', kind: 'pet', cost: 20,
    hp: 110, dmg: 12, cd: 0.8, speed: 60, range: 110, armor: 0,
    skill: 'vanish', skillName: 'Linh Điểu Ẩn Vân',
    desc: 'KHÔNG THỂ CHỌN LÀM MỤC TIÊU: cứ 12 giây ẩn trong mây 4 giây (chỉ chịu sát thương lan, chạy nhanh hơn 20%). Mổ địch từ xa.',
    unlockCost: 500, scale: 0.95,
  }),
  U({
    id: 'huyenvu', name: 'Huyền Vũ Non', kind: 'pet', cost: 28,
    hp: 360, dmg: 12, cd: 1.2, speed: 22, range: 28, armor: 14,
    skill: 'freeze', skill2: 'monk', skillName: 'Huyền Vũ Hàn Giáp',
    desc: 'ĐÓNG BĂNG: cứ 13 giây đóng băng 3 địch gần nhất 2,5s (chịu thêm 25% sát thương); mai rùa tạo khiên khí 80 sát thương, dựng lại sau 8 giây khi vỡ.',
    unlockCost: 800, scale: 1.1,
  }),
  U({
    id: 'thanhlongnon', name: 'Thanh Long Non', kind: 'pet', cost: 32,
    hp: 320, dmg: 20, cd: 1.1, speed: 40, range: 160, armor: 5,
    skill: 'launch', skill2: 'volley', skillName: 'Thanh Long Cuồng Phong',
    desc: 'HẤT TUNG: cứ 10 giây quẫy đuôi hất tung mọi địch trước mặt (bán kính 100) lên không 1,6s, gây 55 sát thương. BẮN LAN: cầu gió nổ lan 55% sát thương.',
    unlockCost: 900, scale: 1.1,
  }),
  U({
    id: 'kimo', name: 'Tam Túc Kim Ô', kind: 'pet', cost: 30,
    hp: 240, dmg: 14, cd: 1.0, speed: 52, range: 150, armor: 3,
    skill: 'resurrect', skill2: 'volley', skillName: 'Kim Ô Triệu Hồn',
    desc: 'HỒI SINH ĐỒNG ĐỘI: cứ 18 giây gọi hồn lính/thú vừa ngã xuống sống lại với 55% máu (mỗi quân một lần). BẮN LAN: cầu lửa nổ lan 55% sát thương.',
    unlockCost: 900, scale: 1.05,
  }),
  U({
    id: 'haothienkhuyen', name: 'Hao Thiên Khuyển', kind: 'summon', cost: 0,
    hp: 300, dmg: 20, cd: 0.7, speed: 78, range: 28, armor: 6,
    skill: 'none', skillName: 'Thiên Khuyển',
    desc: 'Chó thần của Dương Tiễn: 50% máu, sát thương và giáp của chủ (tăng theo cấp, tối đa 80%), tồn tại 15 giây.',
    unlockCost: 0, scale: 1,
  }),
];

// ───────────── TRỤ SẢN SINH ─────────────
// Đặt ở nửa sân nhà (không quá nửa lane): cứ vài giây tự sinh ngẫu nhiên một đơn vị cùng loại, tới số lượng tối đa.
// Mua bằng vàng trong trận (đắt) và nâng cấp ngay trong trận để sinh nhanh hơn, sinh được nhiều quân hơn.
export interface PostLevel {
  /** giây giữa hai lần sinh quân */
  every: number;
  /** tổng số quân trụ này sinh được tới cấp đó */
  max: number;
  /** vàng để nâng lên cấp này */
  cost: number;
}
export const POST_LEVELS: PostLevel[] = [
  { every: 8, max: 5, cost: 0 },
  { every: 6.5, max: 8, cost: 50 },
  { every: 5, max: 11, cost: 75 },
  { every: 4, max: 15, cost: 100 },
];
/** mỗi lane tối đa số doanh trại (không tính vào giới hạn công trình phòng thủ) */
export const MAX_POSTS_PER_LANE = 2;
export const POST_HP_PER_LEVEL = 1.3;
/** cấp thẻ doanh trại (mua bằng xu): +1 quân tối đa mỗi 2 cấp; chu kỳ sinh quân nhanh hơn theo skillHaste (+7%/cấp) */
export const postMaxBonus = (cardLv: number) => Math.floor((Math.max(1, cardLv) - 1) / 2);
/** chu kỳ chiêu quân thực tế (giây) của doanh trại cấp trận `battleLv` (1..4) và cấp thẻ `cardLv` */
export const postEveryAt = (battleLv: number, cardLv: number) => POST_LEVELS[battleLv - 1].every / skillHaste(cardLv);
export interface PostInfo {
  icon: string;
  color: number;
  /** đơn vị trụ có thể sinh ra */
  pool: string[];
}
export const POSTS: Record<string, PostInfo> = {
  post_infantry: { icon: '⚔', color: 0x7ac0ff, pool: ['samurai', 'spear', 'shield', 'berserker', 'daodaobinh', 'toanphong', 'lahan', 'kimcang'] },
  post_cavalry: { icon: '🐎', color: 0xffb36b, pool: ['knight', 'phiky', 'elephant'] },
  post_archer: { icon: '🏹', color: 0x7dffb0, pool: ['archer', 'crossbow', 'liethoa', 'lienchau', 'taoist'] },
  post_air: { icon: '🪽', color: 0xd9c8ff, pool: ['phiung', 'bangphuong', 'hoaphuong', 'philong', 'khongtuoc'] },
  post_naval: { icon: '⚓', color: 0x5ad0ff, pool: ['thuybinh', 'cungthuyen', 'chienthuyen', 'phaothuyen'] },
  post_siege: { icon: '💣', color: 0xff8a6a, pool: ['trebuchet', 'noxe', 'hoapao', 'xetenlua', 'phaothach'] },
};
const POST_UNLOCK: Record<string, number> = { post_infantry: 0, post_cavalry: 400, post_archer: 400, post_naval: 450, post_air: 800, post_siege: 900 };
const POST_COSTS: Record<string, number> = { post_infantry: 45, post_cavalry: 60, post_archer: 55, post_air: 85, post_naval: 55, post_siege: 90 };
const POST_NAMES: Record<string, string> = {
  post_infantry: 'Trại Bộ Binh', post_cavalry: 'Trại Kỵ Binh', post_archer: 'Trại Cung Thủ',
  post_air: 'Trại Không Binh', post_naval: 'Trại Thủy Binh', post_siege: 'Trại Công Thành',
};
export const POST_LIST: UnitDef[] = Object.keys(POSTS).map((id) => U({
  id, name: POST_NAMES[id], kind: 'defense', cost: POST_COSTS[id],
  hp: 280, dmg: 0, cd: POST_LEVELS[0].every, speed: 0, range: 0, armor: 6,
  skill: 'spawner', skillName: 'Chiêu Mộ Quân',
  desc: 'Cứ vài giây tự chiêu mộ ngẫu nhiên một đơn vị cùng loại. Chỉ đặt được ở nửa sân nhà. Nâng cấp thẻ (bằng xu) để chiêu quân nhanh hơn và nhiều quân hơn.',
  tags: id === 'post_naval' ? ['spawner', 'naval'] : ['spawner'], unlockCost: POST_UNLOCK[id], scale: 1.1,
}));
export const isPost = (d: Pick<UnitDef, 'tags'>) => !!d.tags?.includes('spawner');
/** bộ doanh trại mang vào một trận: tối đa 3 loại */
export const POST_DECK_SIZE = 3;
/** doanh trại có sẵn từ đầu (các trại khác mở khóa bằng xu ở tab Binh đoàn → Doanh trại) */
export const STARTER_POSTS = POST_LIST.filter((u) => u.unlockCost === 0).map((u) => u.id);

/** thủy quân chỉ ra trận ở lane sông; quân bay đi được mọi lane; bộ binh / kỵ binh chỉ đi lane đất */
export const isNaval = (d: Pick<UnitDef, 'tags'>) => !!d.tags?.includes('naval');
export const isFlyer = (d: Pick<UnitDef, 'tags'>) => !!d.tags?.includes('fly');

export const UNITS: Record<string, UnitDef> = Object.fromEntries([...UNIT_LIST, ...POST_LIST].map((u) => [u.id, u]));
export const PLAYABLE = UNIT_LIST.filter((u) => u.kind === 'troop' || u.kind === 'general');
/** đồ phòng thủ (xếp riêng, bộ phòng thủ tối đa 3 món) */
export const DEFENSES = UNIT_LIST.filter((u) => u.kind === 'defense');
/** thiết bị công thành tầm xa (lính, mang theo trong bộ bài thường): hiện chung tab Công thủ thành với công trình phòng thủ */
export const ENGINE_UNITS = UNIT_LIST.filter((u) => u.kind === 'troop' && u.tags?.includes('engine'));
export const DEFENSE_DECK_SIZE = 3;
/** nâng cấp ô bộ bài ra trận: 6 → 9 ô (giá xu để mở thêm từng ô) */
export const DECK_EXTRA_COSTS = [400, 800, 1400];
/** nâng cấp ô bộ đồ phòng thủ: 3 → 5 ô */
export const DEF_EXTRA_COSTS = [300, 700];
/** nâng cấp máu thành trì: KHÔNG giới hạn cấp, mỗi cấp +12% máu cờ nhà (giá tăng 100 xu mỗi cấp) */
export const flagUpgradeCost = (lv: number) => 100 * (lv + 1);
export const flagHpMul = (lv: number) => 1 + 0.12 * lv;
/** nâng cấp tốc độ sản xuất vàng trong trận (mua bằng xu ở tab Binh đoàn): tối đa 10 cấp, mỗi cấp +6% vàng/giây của người chơi */
export const INCOME_MAX_LV = 10;
export const incomeUpgradeCost = (lv: number) => 120 * (lv + 1);
export const incomeUpgradeMul = (lv: number) => 1 + 0.06 * lv;
/** quái thú: chỉ xuất hiện ở phía địch */
export const BEASTS = UNIT_LIST.filter((u) => u.kind === 'beast');
/** thú cưng của người chơi (tab Thú cưng): xuất trận như lính nhưng chọn bộ riêng */
export const PETS = UNIT_LIST.filter((u) => u.kind === 'pet');
export const PET_DECK_SIZE = 2;
/** mở thêm ô thú cưng: 2 → 3 ô */
export const PET_EXTRA_COSTS = [500];
export const STARTER_PETS = PETS.filter((u) => u.unlockCost === 0).map((u) => u.id);
export const STARTER_DEFENSES = DEFENSES.filter((u) => u.unlockCost === 0).map((u) => u.id);
/** mỗi lane mỗi bên tối đa số công trình */
export const MAX_DEFENSES_PER_LANE = 3;
export const STARTERS = PLAYABLE.filter((u) => u.unlockCost === 0).map((u) => u.id);
export const DECK_SIZE = 6;
export const MAX_GENERALS_IN_DECK = 2;
/** nâng cấp số tướng tối đa (mang vào trận và cùng lúc trên chiến trường): 2 → 5, giá xu mỗi bậc */
export const GENERAL_EXTRA_COSTS = [600, 1200, 2000];
