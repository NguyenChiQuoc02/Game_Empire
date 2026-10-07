export interface Station {
  id: number;
  name: string;
  subtitle: string;
  boss: boolean;
  /** deck của AI */
  deck: string[];
  /** nhân sát thương/máu lính địch */
  power: number;
  /** vàng/giây của địch */
  income: number;
  flagHp: number;
  /** vàng thưởng lần đầu thắng */
  reward: number;
  /** màu chủ đạo của chiến trường */
  theme: 'plains' | 'bamboo' | 'stone' | 'castle' | 'throne';
  desc: string;
  /** vị trí trên bản đồ (0..1): ngang [x,y] / dọc [x,y] */
  map: { l: [number, number]; p: [number, number] };
}

export const STATIONS: Station[] = [
  {
    id: 0, name: 'Trạm Tiền Tiêu', subtitle: 'Chòi canh biên giới', boss: false,
    deck: ['samurai', 'spear', 'archer'], power: 1.0, income: 1.9, flagHp: 340, reward: 120,
    theme: 'plains', desc: 'Một đội tuần tra yếu ớt. Làm quen với kéo thả quân vào lane.',
    map: { l: [0.27, 0.6], p: [0.3, 0.83] },
  },
  {
    id: 1, name: 'Trạm Rừng Trúc', subtitle: 'Ninja ẩn mình trong rừng', boss: false,
    deck: ['samurai', 'spear', 'archer', 'shield', 'ninja'], power: 1.08, income: 2.3, flagHp: 440, reward: 160,
    theme: 'bamboo', desc: 'Ninja chạy nhanh phá cờ. Cần giữ lính phòng thủ ở mỗi lane.',
    map: { l: [0.43, 0.77], p: [0.7, 0.73] },
  },
  {
    id: 2, name: 'Trạm Cầu Đá', subtitle: 'Nơi Trương Phi chặn đường', boss: false,
    deck: ['samurai', 'spear', 'shield', 'knight', 'berserker', 'trebuchet', 'truongphi'],
    power: 1.15, income: 2.7, flagHp: 540, reward: 220,
    theme: 'stone', desc: 'Địch có kỵ binh, máy ném đá và tướng Trương Phi.',
    map: { l: [0.53, 0.46], p: [0.3, 0.63] },
  },
  {
    id: 3, name: 'Trạm Thành Ngoại', subtitle: 'Quan Vũ trấn giữ', boss: false,
    deck: ['samurai', 'archer', 'shield', 'knight', 'healer', 'bomber', 'trebuchet', 'quanvu', 'trieuvan'],
    power: 1.25, income: 3.1, flagHp: 660, reward: 300,
    theme: 'castle', desc: 'Phòng tuyến kiên cố, có Y sư, tử sĩ và hai mãnh tướng.',
    map: { l: [0.68, 0.66], p: [0.7, 0.52] },
  },
  {
    id: 4, name: 'Hoàng Thành', subtitle: 'Boss: Đổng Trác', boss: true,
    deck: ['samurai', 'spear', 'shield', 'knight', 'ninja', 'berserker', 'healer', 'trebuchet', 'lubo'],
    power: 1.2, income: 3.2, flagHp: 720, reward: 500,
    theme: 'throne', desc: 'Hạ gục Bạo Chúa Đổng Trác để kết thúc chiến dịch. Hắn bắt đầu trận ở một lane bất kỳ.',
    map: { l: [0.78, 0.36], p: [0.4, 0.4] },
  },
];

/** thành xuất phát / thành địch trên bản đồ */
export const MAP_CITIES = {
  start: { l: [0.1, 0.8] as [number, number], p: [0.25, 0.93] as [number, number] },
  end: { l: [0.88, 0.17] as [number, number], p: [0.66, 0.26] as [number, number] },
};
