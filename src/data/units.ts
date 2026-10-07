export type SkillId =
  | 'none'
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
  | 'tyrant';

export type UnitKind = 'troop' | 'general' | 'boss';

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
  skillName: string;
  desc: string;
  tags?: string[];
  /** Vàng (xu) để mở khóa ngoài trận; 0 = có sẵn */
  unlockCost: number;
  /** kích thước vẽ */
  scale: number;
}

export const MAX_LEVEL = 5;
export const levelMul = (lv: number) => 1 + 0.12 * (lv - 1);
export const upgradeCost = (def: UnitDef, lv: number) =>
  Math.round((def.kind === 'general' ? 140 : 60) * lv);

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
    unlockCost: 220, scale: 1.25,
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

  // ───────────── BOSS ─────────────
  U({
    id: 'dongtrac', name: 'Đổng Trác', kind: 'boss', cost: 0,
    hp: 2600, dmg: 46, cd: 1.3, speed: 20, range: 50, armor: 16,
    skill: 'tyrant', skillName: 'Bạo Chúa',
    desc: 'Mỗi 9s triệu hồi 2 Samurai. Dưới 50% máu sẽ nổi điên (+40% sát thương, chạy nhanh hơn).',
    unlockCost: 0, scale: 1.9,
  }),
];

export const UNITS: Record<string, UnitDef> = Object.fromEntries(UNIT_LIST.map((u) => [u.id, u]));
export const PLAYABLE = UNIT_LIST.filter((u) => u.kind !== 'boss');
export const STARTERS = PLAYABLE.filter((u) => u.unlockCost === 0).map((u) => u.id);
export const DECK_SIZE = 6;
export const MAX_GENERALS_IN_DECK = 2;
