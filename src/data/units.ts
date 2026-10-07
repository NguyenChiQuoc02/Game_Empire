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
  | 'frost';

export type UnitKind = 'troop' | 'general' | 'boss' | 'summon' | 'defense';

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
export const levelMul = (lv: number) => 1 + 0.12 * (lv - 1);
export const upgradeCost = (def: UnitDef, lv: number) =>
  Math.round((def.kind === 'general' ? 140 : def.kind === 'defense' ? 70 : 60) * lv);

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
    desc: 'Kỹ năng 1: cứ 15 giây biến thành một vị tướng bất kỳ và lập tức thi triển kỹ năng của vị tướng đó, giữ hình dạng 8 giây. Kỹ năng 2: cứ 20 giây thổi lông hóa 2 khỉ con (30% máu, sát thương, giáp của Ngộ Không) tồn tại 5 giây.',
    unlockCost: 950, scale: 1.3,
  }),
  U({
    id: 'duongtien', name: 'Dương Tiễn', kind: 'general', cost: 70,
    hp: 700, dmg: 38, cd: 0.9, speed: 52, range: 40, armor: 12,
    skill: 'erlang', skillName: 'Hao Thiên Khuyển',
    desc: 'Cứ 14 giây triệu hồi Hao Thiên Khuyển (50% máu, sát thương, giáp của Dương Tiễn) và tăng 50% chỉ số của bản thân trong 5 giây.',
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

  // ───────────── BOSS ─────────────
  U({
    id: 'dongtrac', name: 'Đổng Trác', kind: 'boss', cost: 0,
    hp: 3300, dmg: 46, cd: 1.3, speed: 20, range: 50, armor: 16,
    skill: 'tyrant', skillName: 'Bạo Chúa',
    desc: 'Mỗi 9s triệu hồi 2 Samurai. Dưới 50% máu sẽ nổi điên (+40% sát thương, chạy nhanh hơn).',
    unlockCost: 0, scale: 1.9,
  }),
  U({
    id: 'dongphuongbatbai', name: 'Đông Phương Bất Bại', kind: 'boss', cost: 0,
    hp: 3400, dmg: 34, cd: 0.7, speed: 46, range: 44, armor: 12,
    skill: 'phantom', skillName: 'Quỳ Hoa Bảo Điển',
    desc: 'Né 25% đòn đơn mục tiêu; cứ 7 giây lướt xuyên đội hình địch gây 90 sát thương cho mọi kẻ trên đường.',
    unlockCost: 0, scale: 1.85,
  }),
  U({
    id: 'nguumavuong', name: 'Ngưu Ma Vương', kind: 'boss', cost: 0,
    hp: 3600, dmg: 48, cd: 1.4, speed: 22, range: 56, armor: 14,
    skill: 'inferno', skillName: 'Hỏa Diệm Vương',
    desc: 'Cứ 10 giây phun sóng lửa rộng (85 sát thương, thiêu đốt 10 máu/giây trong 4 giây). Dưới 50% máu sát thương +30%.',
    unlockCost: 0, scale: 2.05,
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
    desc: 'Phân thân lông khỉ của Ngộ Không: 30% máu, sát thương và giáp của chủ, tồn tại 5 giây.',
    unlockCost: 0, scale: 0.72, life: 5,
  }),
  U({
    id: 'haothienkhuyen', name: 'Hao Thiên Khuyển', kind: 'summon', cost: 0,
    hp: 300, dmg: 20, cd: 0.7, speed: 78, range: 28, armor: 6,
    skill: 'none', skillName: 'Thiên Khuyển',
    desc: 'Chó thần của Dương Tiễn: 50% máu, sát thương và giáp của chủ, tồn tại 15 giây.',
    unlockCost: 0, scale: 1,
  }),
];

export const UNITS: Record<string, UnitDef> = Object.fromEntries(UNIT_LIST.map((u) => [u.id, u]));
export const PLAYABLE = UNIT_LIST.filter((u) => u.kind === 'troop' || u.kind === 'general');
/** đồ phòng thủ (xếp riêng, bộ phòng thủ tối đa 3 món) */
export const DEFENSES = UNIT_LIST.filter((u) => u.kind === 'defense');
export const DEFENSE_DECK_SIZE = 3;
export const STARTER_DEFENSES = DEFENSES.filter((u) => u.unlockCost === 0).map((u) => u.id);
/** mỗi lane mỗi bên tối đa số công trình */
export const MAX_DEFENSES_PER_LANE = 3;
export const STARTERS = PLAYABLE.filter((u) => u.unlockCost === 0).map((u) => u.id);
export const DECK_SIZE = 6;
export const MAX_GENERALS_IN_DECK = 2;
