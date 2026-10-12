import type { WeatherId } from './terrain';
import { EXTRA_LANE_BUDGET_MUL, OUTPOST_BUDGET_MUL, OUTPOST_TIME_MUL, OUTPOST_AT_FRACS, extraBridgeFor, extraLanePlan, outpostPlan, tunnelFor, type ExtraLane, type OutpostLanes, type Tunnel } from './lane';
import { lairPlanFor, type LairPlan } from './wild';

export type StationTheme =
  | 'plains' | 'bamboo' | 'stone' | 'castle' | 'throne'
  | 'sea' | 'snow' | 'desert' | 'heaven' | 'volcano' | 'night';

/** điều kiện đặc biệt của trạm */
export type StationMod = 'armored' | 'quick' | 'swarm';

/** số trạm của mỗi bản đồ (trạm cuối là Boss) */
export const STATIONS_PER_MAP = 10;

/** đường nối hai lane kề nhau: quân đi qua vị trí `x` (0..1000) có thể rẽ sang lane bên kia */
export interface Bridge {
  /** chỉ số lane (0-based), b = a + 1 */
  a: number;
  b: number;
  x: number;
}

export interface Station {
  /** chỉ số toàn cục (0..29) */
  id: number;
  /** bản đồ/chương (0-based) */
  chapter: number;
  name: string;
  subtitle: string;
  /** trạm Boss: chỉ 1 lane, boss xuất hiện gần cuối trận */
  boss: boolean;
  bossId?: string;
  /** deck của AI */
  deck: string[];
  /** nhân sát thương/máu lính địch */
  power: number;
  /** vàng/giây của địch */
  income: number;
  flagHp: number;
  /** tổng số quân (lính + tướng) địch được triển khai: càng sâu càng nhiều */
  units: number;
  /** công trình phòng thủ địch có thể xây (tuỳ chọn) */
  defenses?: string[];
  /** vàng thưởng lần đầu thắng */
  reward: number;
  /** thắng nhanh hơn số giây này để đạt 3 sao */
  fastSec: number;
  mod?: StationMod;
  theme: StationTheme;
  /** thời tiết của trạm (địa hình lấy theo `theme`, xem data/terrain.ts) */
  weather: WeatherId;
  /** quái thú khổng lồ xuất hiện gần cuối trận (trạm thứ 5 của mỗi bản đồ) */
  giantId?: string;
  /** lane sông (0-based): chỉ thủy quân và quân bay đi được; bộ binh / kỵ binh chỉ đi các lane đất còn lại */
  river?: number;
  /** đường nối giữa các lane (một số trạm) */
  bridges: Bridge[];
  /** căn cứ phụ của địch ở từng lane, từ gần ta nhất → xa nhất (rỗng = trạm không có): lane dài ra, quân nhỏ lại */
  outposts: OutpostLanes;
  /** số căn cứ phụ mỗi lane (0–3) */
  posts: number;
  /** lane thứ 4 chỉ địch có, nhập vào một lane của ta (4 trạm mỗi bản đồ) */
  extraLane?: ExtraLane;
  /** hầm nối hai lane */
  tunnels: Tunnel[];
  /** ổ quái hoang dã giữa lane (đánh cả hai phe) */
  lairs: LairPlan[];
  /** thành chung: 3–4 cờ của địch gộp thành một tòa thành (một thanh máu), cung thủ trên tường bắn quân tấn công */
  castle?: boolean;
  desc: string;
}

/**
 * Thành chung của một số màn (mỗi bản đồ một màn trên đất liền): máu = máu cờ × số lane × hpMul; mỗi lane có `archers` cung thủ trên tường,
 * bắn quân ta trong tầm `range` (ngắn hơn máy công thành tầm xa như Hỏa Pháo, Pháo Thạch Cự Hình).
 */
export const CASTLE = { hpMul: 0.7, archers: 2, dmg: 13, cd: 1.0, range: 270 } as const;
const CASTLE_STATIONS = new Set([3, 17, 28, 36, 45, 51, 65, 72, 78, 81, 88, 92, 98, 102, 108]);

export interface Chapter {
  id: number;
  name: string;
  subtitle: string;
  /** chỉ số các trạm thuộc bản đồ */
  stations: number[];
  /** thành xuất phát / thành địch trên bản đồ */
  start: { l: [number, number]; p: [number, number] };
  end: { l: [number, number]; p: [number, number] };
}

interface Def {
  name: string;
  subtitle: string;
  theme: StationTheme;
  deck: string[];
  desc: string;
  mod?: StationMod;
  defenses?: string[];
  bossId?: string;
}

// ───────────── Bản đồ 1: Tam Lộ Công Thành (Tam Quốc) ─────────────
const MAP1: Def[] = [
  { name: 'Trạm Tiền Tiêu', subtitle: 'Chòi canh biên giới', theme: 'plains', deck: ['samurai', 'spear', 'archer'], desc: 'Một đội tuần tra yếu ớt. Làm quen với kéo thả quân vào lane.' },
  { name: 'Trạm Rừng Trúc', subtitle: 'Ninja ẩn mình trong rừng', theme: 'bamboo', deck: ['samurai', 'spear', 'archer', 'shield', 'ninja', 'soihoang'], desc: 'Ninja chạy nhanh phá cờ. Cần giữ lính phòng thủ ở mỗi lane.' },
  { name: 'Trạm Cầu Đá', subtitle: 'Nơi Trương Phi chặn đường', theme: 'stone', deck: ['samurai', 'spear', 'shield', 'knight', 'berserker', 'trebuchet', 'truongphi', 'lonrung'], desc: 'Địch có kỵ binh, máy ném đá và tướng Trương Phi.' },
  { name: 'Trạm Thành Ngoại', subtitle: 'Quan Vũ trấn giữ', theme: 'castle', deck: ['samurai', 'archer', 'shield', 'knight', 'healer', 'bomber', 'trebuchet', 'quanvu', 'trieuvan'], desc: 'Phòng tuyến kiên cố, có Y sư, tử sĩ và hai mãnh tướng.' },
  { name: 'Trường Bản Pha', subtitle: 'Triệu Tử Long đơn kỵ cứu chúa', theme: 'plains', deck: ['spear', 'knight', 'archer', 'shield', 'healer', 'trieuvan', 'truongphi'], desc: 'Kỵ binh và Triệu Vân xung trận liên tục. Giữ vững hàng khiên và lính giáo để chặn đà tấn công.' },
  { name: 'Xích Bích', subtitle: 'Hỏa công trên sông Trường Giang', theme: 'sea', deck: ['archer', 'spear', 'bomber', 'crossbow', 'berserker', 'giacatluong', 'thaisutu'], desc: 'Tử sĩ và nỏ thủ gây sát thương lan, Gia Cát Lượng dội mưa lửa lên đội hình tụ tập.' },
  { name: 'Hổ Lao Quan', subtitle: 'Cửa ải Lữ Bố chặn đường', theme: 'stone', deck: ['knight', 'spear', 'shield', 'trebuchet', 'berserker', 'lubo'], defenses: ['wall'], desc: 'Lữ Bố trấn giữ cửa ải với kỵ binh, máy ném đá và tường thành.' },
  { name: 'Quan Độ', subtitle: 'Tào Tháo đốt kho lương', theme: 'plains', mod: 'swarm', deck: ['samurai', 'archer', 'ninja', 'knight', 'bomber', 'taothao', 'philong'], desc: 'Địch ào ạt thả quân rẻ (mỗi lần 2 quân); Tào Tháo tăng sức cả đàn.' },
  { name: 'Ngũ Trượng Nguyên', subtitle: 'Tư Mã Ý án binh bất động', theme: 'night', deck: ['ninja', 'crossbow', 'shield', 'healer', 'taoist', 'tumayi', 'baoden'], defenses: ['archertower'], desc: 'Tư Mã Ý khiến quân bạn đứng yên; nỏ thủ và tháp cung bắn xuyên giáp từ xa.' },
  { name: 'Hoàng Thành', subtitle: 'Boss: Đổng Trác', theme: 'throne', bossId: 'dongtrac', deck: ['samurai', 'spear', 'shield', 'knight', 'ninja', 'berserker', 'healer', 'trebuchet', 'lubo', 'gauden', 'philong'], desc: 'Màn Boss chỉ có 1 lane. Đổng Trác xuất hiện khi trận gần kết thúc: hạ gục hắn để hoàn thành bản đồ.' },
];

// ───────────── Bản đồ 2: Hiệp Khách Hành (Kim Dung) ─────────────
const MAP2: Def[] = [
  { name: 'Đào Hoa Đảo', subtitle: 'Hoàng Dược Sư bày trận ngũ hành', theme: 'sea', deck: ['spear', 'archer', 'ninja', 'taoist', 'crossbow', 'lenhhoxung', 'mangxa'], desc: 'Hòn đảo đầy trận pháp. Đạo sĩ và nỏ thủ bắn từ xa, Lệnh Hồ Xung phá giáp.' },
  { name: 'Cổ Mộ Phái', subtitle: 'Tiểu Long Nữ giữ mộ', theme: 'night', deck: ['ninja', 'poisoner', 'crossbow', 'shield', 'healer', 'tieulongnu', 'nhendoc'], defenses: ['spiketrap'], desc: 'Cổ mộ tối tăm: độc sư, nỏ thủ ẩn mình, bẫy gai dưới chân. Tiểu Long Nữ hồi máu cho đồng đội.' },
  { name: 'Võ Đang Sơn', subtitle: 'Trương Tam Phong tọa thiền', theme: 'bamboo', deck: ['monk', 'shield', 'spear', 'taoist', 'healer', 'truongvoky', 'hocnui', 'soivuong'], defenses: ['wall'], desc: 'Phòng thủ chắc chắn với tường thành, đạo sĩ thả sấm sét; Trương Vô Kỵ phản đòn.' },
  { name: 'Tuyết Sơn', subtitle: 'Băng giá Tuyết Sơn Phi Hồ', theme: 'snow', mod: 'armored', deck: ['shield', 'monk', 'crossbow', 'berserker', 'poisoner', 'quachtinh', 'gauden', 'soihoang'], desc: 'Đối thủ giáp dày (+6 giáp), rất khó phá. Dùng sát thương xuyên giáp, độc và sát thương lan.' },
  { name: 'Hoa Sơn Luận Kiếm', subtitle: 'Quần hùng tranh đỉnh', theme: 'stone', deck: ['ninja', 'knight', 'berserker', 'crossbow', 'taoist', 'lenhhoxung', 'kieuphong', 'baoden', 'loithu'], defenses: ['archertower'], desc: 'Cao thủ giang hồ tụ hội: Lệnh Hồ Xung phá giáp, Kiều Phong đẩy lùi đội hình.' },
  { name: 'Quang Minh Đỉnh', subtitle: 'Minh Giáo Tây Vực', theme: 'desert', mod: 'quick', deck: ['knight', 'ninja', 'bomber', 'taoist', 'poisoner', 'truongvoky', 'auduongphong', 'philong'], desc: 'Quân Minh Giáo di chuyển nhanh hơn 20%. Trương Vô Kỵ phản đòn, Âu Dương Phong thả mây độc.' },
  { name: 'Lệ Xuân Viện', subtitle: 'Vi Tiểu Bảo giở trò', theme: 'castle', mod: 'swarm', deck: ['samurai', 'ninja', 'bomber', 'poisoner', 'healer', 'crossbow', 'chudu', 'vitieubao'], defenses: ['firepit'], desc: 'Lính lác ào ạt (mỗi lần 2 quân), bom nổ liên tục, hố lửa chắn lối. Chu Du làm chậm cả đội.' },
  { name: 'Thiếu Lâm Tự', subtitle: 'Kiều Phong tung chưởng rồng', theme: 'castle', deck: ['monk', 'shield', 'spear', 'healer', 'elephant', 'kieuphong', 'hocnui'], defenses: ['wall', 'spikewall'], desc: 'Võ tăng, voi chiến và tường gai chặn đường; Kiều Phong đẩy lùi cả đội hình của bạn.' },
  { name: 'Tuyệt Tình Cốc', subtitle: 'Hoa tuyệt tình ngàn độc', theme: 'plains', deck: ['archer', 'poisoner', 'taoist', 'monk', 'elephant', 'auduongphong', 'mangxa'], defenses: ['firepit', 'archertower'], desc: 'Độc dày đặc: độc sư, mây độc và hố lửa. Cần Y sư/trụ hồi máu và đánh nhanh.' },
  { name: 'Hắc Mộc Nhai', subtitle: 'Boss: Đông Phương Bất Bại', theme: 'night', bossId: 'dongphuongbatbai', deck: ['ninja', 'crossbow', 'poisoner', 'knight', 'monk', 'lenhhoxung', 'truongvoky', 'baoden', 'philong'], desc: 'Màn Boss chỉ có 1 lane. Đông Phương Bất Bại xuất hiện khi trận gần kết thúc, lướt rất nhanh và né đòn.' },
];

// ───────────── Bản đồ 3: Đại Náo Thiên Cung (Phong Thần · Tây Du) ─────────────
const MAP3: Def[] = [
  { name: 'Hoa Quả Sơn', subtitle: 'Núi khỉ, thác nước', theme: 'bamboo', mod: 'quick', deck: ['berserker', 'archer', 'ninja', 'monk', 'spear', 'masieu', 'hocnui', 'lonrung', 'soihoang'], desc: 'Binh khỉ nhanh nhẹn; Mã Siêu phi ngựa xuyên đội hình.' },
  { name: 'Long Cung Đông Hải', subtitle: 'Long Vương giữ ngọc', theme: 'sea', deck: ['shield', 'crossbow', 'taoist', 'elephant', 'healer', 'chudu', 'mangxa'], defenses: ['frosttotem'], desc: 'Thủy quân bắn từ xa, trụ băng làm chậm đội của bạn; Chu Du tấu khúc làm chậm thêm.' },
  { name: 'Lưu Sa Hà', subtitle: 'Dòng sông cát chảy ngược', theme: 'stone', deck: ['shield', 'crossbow', 'trebuchet', 'poisoner', 'elephant', 'hoangtrung', 'tegiac', 'diatrung'], defenses: ['catapult'], desc: 'Xạ thủ, máy ném đá và pháo thạch khống chế tầm xa; Hoàng Trung bắn xuyên giáp.' },
  { name: 'Ngũ Chỉ Sơn', subtitle: 'Đá đè Tôn Hành Giả', theme: 'desert', mod: 'armored', deck: ['elephant', 'berserker', 'trebuchet', 'monk', 'bomber', 'quachtinh', 'tegiac'], defenses: ['wall', 'spikewall'], desc: 'Quân đá giáp dày (+6 giáp), tường thành và tường gai. Quách Tĩnh ban khiên khí cho cả đội.' },
  { name: 'Bàn Đào Viên', subtitle: 'Tiên đào ngàn năm', theme: 'heaven', deck: ['spear', 'healer', 'taoist', 'shield', 'knight', 'taothao'], defenses: ['altar'], desc: 'Tế đàn hồi phục và Y sư kéo dài giao tranh; Tào Tháo tăng sức đội hình.' },
  { name: 'Nam Thiên Môn', subtitle: 'Thiên binh thiên tướng', theme: 'heaven', mod: 'armored', deck: ['spear', 'taoist', 'healer', 'shield', 'knight', 'tumayi', 'chudu', 'natra'], defenses: ['wall', 'archertower'], desc: 'Thiên binh giáp thép (+6 giáp). Tư Mã Ý làm quân bạn đứng yên, Chu Du làm chậm cả đội.' },
  { name: 'Bàn Tơ Động', subtitle: 'Yêu nữ giăng tơ độc', theme: 'night', mod: 'swarm', deck: ['poisoner', 'ninja', 'bomber', 'berserker', 'taoist', 'auduongphong', 'taothao', 'mangxa', 'nhendoc'], defenses: ['spiketrap'], desc: 'Địch thả quân dồn dập (mỗi lần 2 quân). Mây độc, bẫy gai và Tào Tháo tăng sức cả đàn.' },
  { name: 'Thông Thiên Hà', subtitle: 'Dòng sông băng giá', theme: 'snow', deck: ['crossbow', 'poisoner', 'shield', 'monk', 'taoist', 'hoangtrung', 'tumayi', 'gauden', 'soihoang', 'philong', 'loicong'], defenses: ['frosttotem', 'ballista'], desc: 'Trụ băng và nỏ thần khống chế tầm xa; Hoàng Trung xuyên giáp, Tư Mã Ý làm choáng.' },
  { name: 'Lăng Tiêu Bảo Điện', subtitle: 'Thiên đình hội tụ', theme: 'throne', deck: ['knight', 'elephant', 'trebuchet', 'taoist', 'healer', 'kieuphong', 'masieu', 'hocnui', 'philong'], defenses: ['wall', 'archertower', 'ballista'], desc: 'Tuyến phòng thủ cuối cùng: tường thành, tháp cung, nỏ thần; Kiều Phong và Mã Siêu phản công.' },
  { name: 'Hỏa Diệm Sơn', subtitle: 'Boss: Ngưu Ma Vương', theme: 'volcano', bossId: 'nguumavuong', deck: ['bomber', 'berserker', 'elephant', 'trebuchet', 'taoist', 'poisoner', 'kieuphong', 'honglong'], desc: 'Màn Boss chỉ có 1 lane. Ngưu Ma Vương xuất hiện khi trận gần kết thúc và phun sóng lửa thiêu đốt.' },
];

// ───────────── Bản đồ 4: Thủy Hử Lương Sơn ─────────────
const MAP4: Def[] = [
  { name: 'Thập Tự Pha', subtitle: 'Quán rượu ven đường', theme: 'plains', deck: ['samurai', 'spear', 'archer', 'shield', 'ninja', 'knight', 'soihoang'], desc: 'Quán rượu bẫy khách: kỵ binh và ninja ập tới từ hai bên. Giữ hàng khiên ở mỗi lane.' },
  { name: 'Dã Trư Lâm', subtitle: 'Rừng heo rừng', theme: 'bamboo', mod: 'quick', deck: ['berserker', 'spear', 'crossbow', 'ninja', 'lonrung', 'baoden', 'truongphi', 'soivuong'], desc: 'Quân nhanh nhẹn lao ra từ bụi rậm; Trương Phi trấn giữ lối vào rừng.' },
  { name: 'Giang Châu Pháp Trường', subtitle: 'Pháp trường chờ ngày hành quyết', theme: 'castle', deck: ['shield', 'crossbow', 'healer', 'knight', 'trebuchet', 'quanvu', 'trieuvan'], defenses: ['wall', 'archertower'], desc: 'Phòng tuyến thành quách với tường thành và tháp cung; nỏ thủ bắn từ xa, Quan Vũ và Triệu Vân xung trận.' },
  { name: 'Hoàng Nê Cương', subtitle: 'Gò đất vàng bụi mù', theme: 'desert', mod: 'swarm', deck: ['knight', 'samurai', 'poisoner', 'taoist', 'bomber', 'masieu', 'hoangtrung', 'philong', 'diatrung'], desc: 'Địch thả quân dồn dập (mỗi lần 2 quân), độc sư và tử sĩ gây hỗn loạn; Mã Siêu phi ngựa xuyên đội hình.' },
  { name: 'Cảnh Dương Cương', subtitle: 'Mãnh hổ chặn đường', theme: 'stone', deck: ['hocnui', 'gauden', 'berserker', 'archer', 'monk', 'duongqua', 'lonrung'], desc: 'Rừng núi đầy mãnh thú; Dương Quá xuất chưởng. Gần cuối trận một Đại Trùng khổng lồ nhảy ra từ hang.' },
  { name: 'Lương Sơn Thủy Bạc', subtitle: 'Thủy trại giữa đầm lầy', theme: 'sea', deck: ['crossbow', 'archer', 'shield', 'healer', 'taoist', 'chudu', 'giacatluong', 'loithu'], defenses: ['frosttotem', 'ballista'], desc: 'Thủy trại bắn từ xa: nỏ thủ, trụ băng, nỏ thần; Chu Du làm chậm, Gia Cát Lượng dội hỏa công.' },
  { name: 'Chúc Gia Trang', subtitle: 'Trang viên kiên cố', theme: 'castle', mod: 'armored', deck: ['shield', 'monk', 'spear', 'elephant', 'trebuchet', 'quachtinh', 'lubo'], defenses: ['wall', 'spikewall'], desc: 'Quân giáp dày (+6 giáp) sau tường thành và tường gai; Quách Tĩnh ban khiên khí, Lữ Bố càn quét.' },
  { name: 'Đông Xương Phủ', subtitle: 'Đột nhập trong đêm', theme: 'night', deck: ['ninja', 'poisoner', 'bomber', 'crossbow', 'healer', 'baoden', 'tumayi', 'auduongphong', 'philong'], defenses: ['spiketrap'], desc: 'Bóng đêm che mắt: ninja, báo đen và bẫy gai; Tư Mã Ý làm quân bạn đứng yên, Âu Dương Phong thả mây độc.' },
  { name: 'Tụ Nghĩa Sảnh', subtitle: 'Anh hùng tụ họp', theme: 'throne', deck: ['knight', 'berserker', 'taoist', 'healer', 'elephant', 'taothao', 'kieuphong', 'duongtien'], defenses: ['wall', 'archertower', 'ballista'], desc: 'Tuyến cuối trước phủ Thái Úy: tường, tháp cung, nỏ thần; Tào Tháo tăng sức cả đàn, Kiều Phong và Dương Tiễn phản công.' },
  { name: 'Thái Úy Phủ', subtitle: 'Boss: Cao Cầu', theme: 'castle', bossId: 'caocau', deck: ['samurai', 'spear', 'shield', 'knight', 'crossbow', 'healer', 'trebuchet', 'lubo', 'quanvu', 'taothao'], desc: 'Màn Boss chỉ có 1 lane. Cao Cầu xuất hiện khi trận gần kết thúc: hạ lệnh tăng sức cả quân địch và đẩy lùi đội hình của bạn.' },
];

// ───────────── Bản đồ 5: Địa Phủ Hồi Hồn ─────────────
const MAP5: Def[] = [
  { name: 'Quỷ Môn Quan', subtitle: 'Cửa ải vào Âm Phủ', theme: 'night', deck: ['ninja', 'poisoner', 'crossbow', 'shield', 'baoden', 'tumayi'], desc: 'Ninja và báo đen lẩn trong sương đêm; Tư Mã Ý khiến quân bạn đứng yên. Nỏ thủ bắn từ xa.' },
  { name: 'Hoàng Tuyền Lộ', subtitle: 'Con đường vàng nhạt', theme: 'desert', mod: 'quick', deck: ['knight', 'spear', 'bomber', 'taoist', 'soihoang', 'masieu', 'holy'], desc: 'Quân Âm phủ di chuyển nhanh hơn 20%; Mã Siêu phi ngựa xuyên đội hình, tử sĩ nổ liên tục.' },
  { name: 'Nại Hà Kiều', subtitle: 'Cây cầu bên dòng sông quên lãng', theme: 'sea', deck: ['crossbow', 'archer', 'shield', 'healer', 'mangxa', 'chudu', 'giacatluong'], defenses: ['frosttotem', 'spiketrap'], desc: 'Có đường nối lane trên cầu: quân hai bên rẽ qua lại. Trụ băng, bẫy gai và Gia Cát Lượng dội lửa.' },
  { name: 'Vong Xuyên Hà', subtitle: 'Dòng sông băng giá của linh hồn', theme: 'snow', mod: 'armored', deck: ['shield', 'monk', 'crossbow', 'poisoner', 'tegiac', 'quachtinh', 'gauden', 'philong'], desc: 'Quân giáp dày (+6 giáp), rất khó phá. Dùng sát thương xuyên giáp, độc và sát thương lan.' },
  { name: 'Thập Điện Diêm Vương', subtitle: 'Đại điện của mười vị Diêm Vương', theme: 'throne', deck: ['berserker', 'bomber', 'elephant', 'taoist', 'poisoner', 'kieuphong', 'duongqua'], defenses: ['firepit'], desc: 'Hố lửa và tử sĩ chặn lối; gần cuối trận một Quỷ Sai khổng lồ trỗi dậy từ lòng đất.' },
  { name: 'Phong Đô Thành', subtitle: 'Kinh đô của Âm Tào', theme: 'castle', deck: ['knight', 'spear', 'shield', 'healer', 'trebuchet', 'trieuvan', 'lubo', 'taothao', 'tatu'], defenses: ['wall', 'archertower', 'drum'], desc: 'Thành quách kiên cố, trống chiến tăng sức đồng đội; Tào Tháo hạ lệnh, Lữ Bố và Triệu Vân xung trận.' },
  { name: 'Oan Hồn Cốc', subtitle: 'Thung lũng của những oan hồn', theme: 'night', mod: 'swarm', deck: ['poisoner', 'ninja', 'bomber', 'berserker', 'taoist', 'auduongphong', 'tumayi', 'baoden', 'nhendoc'], defenses: ['spiketrap', 'firepit'], desc: 'Oan hồn dồn dập (mỗi lần 2 quân), mây độc, bẫy gai và hố lửa. Cần Y sư và đánh nhanh.' },
  { name: 'Vọng Hương Đài', subtitle: 'Nơi linh hồn ngoái nhìn quê cũ', theme: 'heaven', deck: ['spear', 'healer', 'taoist', 'shield', 'knight', 'chudu', 'quachtinh', 'hoangtrung'], defenses: ['altar', 'archertower'], desc: 'Tế đàn hồi phục và Y sư kéo dài giao tranh; Hoàng Trung bắn xuyên giáp từ tháp cao.' },
  { name: 'Sâm La Điện', subtitle: 'Cửa cuối trước Diêm La', theme: 'stone', mod: 'armored', deck: ['knight', 'elephant', 'trebuchet', 'taoist', 'healer', 'kieuphong', 'masieu', 'hocnui', 'lenhhoxung', 'philong'], defenses: ['wall', 'archertower', 'ballista'], desc: 'Tuyến phòng thủ cuối: quân giáp dày (+6), tường, tháp cung, nỏ thần; Kiều Phong và Lệnh Hồ Xung phản công.' },
  { name: 'Diêm La Điện', subtitle: 'Boss: Diêm La Vương', theme: 'volcano', bossId: 'diemla', deck: ['berserker', 'bomber', 'elephant', 'trebuchet', 'taoist', 'poisoner', 'kieuphong', 'honglong', 'tegiac'], desc: 'Màn Boss chỉ có 1 lane. Diêm La Vương xuất hiện khi trận gần kết thúc: thả mây độc và khiến quân bạn đứng yên.' },
];

// ───────────── Bản đồ 6: Thiên Long Bát Bộ (Kim Dung) ─────────────
const MAP6: Def[] = [
  { name: 'Mạn Đà Sơn Trang', subtitle: 'Rừng trà hoa Thái Hồ', theme: 'bamboo', deck: ['spear', 'archer', 'shield', 'ninja', 'poisoner', 'doanduy'], desc: 'Sơn trang giữa rừng hoa: độc sư và ninja ẩn trong bụi cây; Đoàn Dự bắn kiếm khí xuyên sang cả lane khác.' },
  { name: 'Tụ Hiền Trang', subtitle: 'Quần hùng vây Kiều Phong', theme: 'castle', deck: ['samurai', 'shield', 'knight', 'berserker', 'healer', 'trebuchet', 'kieuphong'], defenses: ['wall'], desc: 'Đại chiến Tụ Hiền Trang: kỵ binh, cuồng chiến và máy ném đá; Kiều Phong đẩy lùi cả đội hình của bạn.' },
  { name: 'Nhạn Môn Quan', subtitle: 'Cửa ải biên giới Tống - Liêu', theme: 'snow', mod: 'armored', deck: ['shield', 'monk', 'crossbow', 'spear', 'elephant', 'trebuchet', 'quachtinh'], defenses: ['wall', 'spikewall'], desc: 'Quân Liêu giáp dày (+6 giáp) sau tường thành và tường gai; Quách Tĩnh ban khiên khí. Cần sát thương xuyên giáp.' },
  { name: 'Thiếu Thất Sơn', subtitle: 'Tàng Kinh Các và 72 tuyệt kỹ', theme: 'stone', deck: ['monk', 'shield', 'spear', 'healer', 'elephant', 'lahan', 'kimcang', 'doanduy'], defenses: ['spikewall'], desc: 'Võ tăng, La Hán và Kim Cang dựng tuyến đầu vững chãi; Y sư hồi máu liên tục. Cần sát thương lan và độc.' },
  { name: 'Đại Lý Cố Đô', subtitle: 'Bạch tượng hộ thành', theme: 'plains', deck: ['knight', 'elephant', 'archer', 'healer', 'monk', 'hocnui', 'doanduy'], desc: 'Voi chiến và kỵ binh Đại Lý xung phong. Gần cuối trận một Cự Tượng khổng lồ lao ra từ cổng thành.' },
  { name: 'Tây Hạ Hoàng Cung', subtitle: 'Nhất Phẩm Đường', theme: 'desert', mod: 'quick', deck: ['knight', 'ninja', 'bomber', 'poisoner', 'taoist', 'modungphuc', 'philong'], defenses: ['firepit'], desc: 'Quân Tây Hạ di chuyển nhanh hơn 20%; hố lửa chắn lối, Mộ Dung Phục phản lại một phần sát thương đánh gần.' },
  { name: 'Yến Tử Ổ', subtitle: 'Tòa sơn trang trên Thái Hồ', theme: 'sea', mod: 'swarm', deck: ['samurai', 'ninja', 'bomber', 'poisoner', 'healer', 'crossbow', 'modungphuc', 'hoangdung'], defenses: ['archertower'], desc: 'Địch thả quân dồn dập (mỗi lần 2 quân); bom nổ liên tục, tháp cung bắn từ xa, Hoàng Dung nhả đòn hiểm.' },
  { name: 'Linh Thứu Cung', subtitle: 'Thiên Sơn Đồng Mỗ', theme: 'snow', deck: ['crossbow', 'hanbang', 'taoist', 'shield', 'healer', 'nhamdoanhdoanh', 'tieulongnu'], defenses: ['frosttotem', 'ballista'], desc: 'Cung điện băng giá: trụ băng và nỏ thần khống chế tầm xa, Hàn Băng Đạo Sĩ làm chậm cả đội.' },
  { name: 'Trân Lung Kỳ Cục', subtitle: 'Thế cờ giết người', theme: 'stone', mod: 'armored', deck: ['knight', 'elephant', 'trebuchet', 'taoist', 'healer', 'lahan', 'kieuphong', 'doanduy', 'modungphuc'], defenses: ['wall', 'archertower', 'ballista'], desc: 'Thế cờ cuối cùng: quân giáp dày (+6) bày như bàn cờ sau tường, tháp cung và nỏ thần; Kiều Phong, Đoàn Dự và Mộ Dung Phục phản công.' },
  { name: 'Thiên Long Tự', subtitle: 'Boss: Cưu Ma Trí', theme: 'throne', bossId: 'cuumatri', deck: ['monk', 'lahan', 'shield', 'knight', 'healer', 'crossbow', 'trebuchet', 'kieuphong', 'doanduy', 'philong'], desc: 'Màn Boss chỉ có 1 lane. Cưu Ma Trí xuất hiện khi trận gần kết thúc: phun Hỏa Diệm Đao và phản lại sát thương của kẻ đánh gần — nên dùng đòn tầm xa.' },
];

// ───────────── Bản đồ 7: Tây Thiên Thỉnh Kinh (Tây Du Ký) ─────────────
const MAP7: Def[] = [
  { name: 'Song Xoa Lĩnh', subtitle: 'Hổ yêu chặn đường', theme: 'plains', deck: ['spear', 'archer', 'shield', 'berserker', 'hocnui', 'lonrung', 'trubatgioi'], desc: 'Hổ yêu và lợn rừng chặn đường thỉnh kinh; Trư Bát Giới vung cào chắn lối. Giữ hàng khiên ở mỗi lane.' },
  { name: 'Hắc Phong Sơn', subtitle: 'Hùng quái cướp cà sa', theme: 'night', deck: ['ninja', 'poisoner', 'crossbow', 'shield', 'hacphong', 'gauden', 'baoden'], defenses: ['spiketrap'], desc: 'Hùng quái và báo đen lẩn trong đêm tối; bẫy gai dưới chân, nỏ thủ bắn từ xa.' },
  { name: 'Hoàng Phong Lĩnh', subtitle: 'Gió vàng thổi mù mắt', theme: 'desert', mod: 'swarm', deck: ['samurai', 'archer', 'ninja', 'bomber', 'poisoner', 'hoangphong', 'soivuong'], desc: 'Yêu phong cuốn bụi: địch thả quân dồn dập (mỗi lần 2 quân), tử sĩ nổ liên tục, độc sư nhả độc.' },
  { name: 'Bạch Hổ Lĩnh', subtitle: 'Bạch Cốt Tinh ba lần biến hóa', theme: 'stone', mod: 'armored', deck: ['ninja', 'shield', 'taoist', 'healer', 'bachcot', 'cuongthi', 'hocnui', 'mehon'], defenses: ['spikewall'], desc: 'Quân xương giáp dày (+6 giáp); Bạch Cốt Tinh sống lại nhiều lần, Cương Thi Vương hồi sinh đồng đội. Hạ nhanh bằng sát thương xuyên giáp.' },
  { name: 'Hắc Thủy Hà', subtitle: 'Dòng sông đen ngòm', theme: 'sea', deck: ['crossbow', 'archer', 'shield', 'healer', 'taoist', 'mangxa', 'laoquan'], defenses: ['frosttotem'], desc: 'Thủy yêu bắn từ xa trên lane sông. Gần cuối trận một Cự Quy ngàn năm trồi lên từ lòng sông.' },
  { name: 'Nữ Nhi Quốc', subtitle: 'Nữ vương kén rể', theme: 'castle', deck: ['ninja', 'archer', 'healer', 'taoist', 'mehon', 'phuonghoangtu', 'dieuthuyen', 'tieulongnu'], defenses: ['altar'], desc: 'Nữ binh và Mê Hồn Sư thôi miên; Điêu Thuyền mê hoặc quân gần nhất khiến chúng quay sang đánh lẫn nhau.' },
  { name: 'Kim Đâu Động', subtitle: 'Thanh Ngưu và vòng Kim Cương Trác', theme: 'volcano', mod: 'armored', deck: ['berserker', 'knight', 'bomber', 'elephant', 'trebuchet', 'thanhnguu', 'laoquan'], defenses: ['wall', 'catapult'], desc: 'Quân giáp dày (+6 giáp) sau tường thành và pháo thạch; Thanh Ngưu Tinh húc tung đội hình, Lão Quân đóng băng quân bạn.' },
  { name: 'Tỳ Bà Động', subtitle: 'Bọ Cạp Tinh nhả độc', theme: 'night', mod: 'swarm', deck: ['poisoner', 'ninja', 'bomber', 'taoist', 'ngocong', 'nhendoc', 'langyeu', 'auduongphong'], defenses: ['spiketrap', 'firepit'], desc: 'Độc trùng dồn dập (mỗi lần 2 quân), mây độc, bẫy gai và hố lửa. Cần Y sư và đánh thật nhanh.' },
  { name: 'Sư Đà Lĩnh', subtitle: 'Ba đại vương chặn lối', theme: 'desert', mod: 'quick', deck: ['knight', 'elephant', 'trebuchet', 'taoist', 'healer', 'sudavuong', 'tuongtinh', 'kimsidieu'], defenses: ['wall', 'archertower', 'ballista'], desc: 'Sư Đà Vương, Bạch Tượng Tinh và Kim Sí Đại Bàng dẫn quân nhanh hơn 20%; tường thành, tháp cung và nỏ thần yểm trợ.' },
  { name: 'Tiểu Lôi Âm Tự', subtitle: 'Boss: Hoàng Mi Đại Vương', theme: 'heaven', bossId: 'hoangmi', deck: ['monk', 'shield', 'spear', 'knight', 'taoist', 'healer', 'crossbow', 'trebuchet', 'hocnui', 'philong'], desc: 'Màn Boss chỉ có 1 lane. Hoàng Mi Đại Vương xuất hiện khi trận gần kết thúc: đập Kim Nạo hất tung quân bạn và khiến chúng đứng yên.' },
];

// ───────────── Bản đồ 8: Giang Đông Thủy Chiến (Tam Quốc) ─────────────
const MAP8: Def[] = [
  { name: 'Sài Tang', subtitle: 'Nơi Tôn Quyền khởi binh', theme: 'plains', deck: ['samurai', 'spear', 'archer', 'shield', 'knight', 'hogia', 'hoangcai'], desc: 'Thân binh Giang Đông giữ doanh trại; kỵ binh bọc hai cánh, Hoàng Cái phóng hỏa tiễn.' },
  { name: 'Nhu Tu Khẩu', subtitle: 'Thủy trại Giang Đông', theme: 'sea', deck: ['crossbow', 'archer', 'shield', 'healer', 'taoist', 'chudu', 'hoangcai'], defenses: ['frosttotem'], desc: 'Thủy trại bắn từ xa: nỏ thủ và trụ băng; Chu Du tấu khúc làm chậm cả đội.' },
  { name: 'Hợp Phì', subtitle: 'Trương Liêu 800 quân phá 10 vạn', theme: 'castle', deck: ['knight', 'spear', 'shield', 'crossbow', 'trebuchet', 'truonglieu', 'hahaudon'], defenses: ['wall', 'archertower'], desc: 'Thành Hợp Phì tường cao tháp vững; Trương Liêu xông thẳng vào trận, Hạ Hầu Đôn càn quét.' },
  { name: 'Kinh Châu', subtitle: 'Quan Vũ thất thủ Mạch Thành', theme: 'plains', mod: 'armored', deck: ['shield', 'monk', 'spear', 'knight', 'healer', 'quanvu', 'trieuvan'], defenses: ['wall', 'spikewall'], desc: 'Quân Thục giáp dày (+6 giáp) sau tường thành và tường gai; Quan Vũ và Triệu Vân xung trận. Dùng sát thương xuyên giáp, độc và sát thương lan.' },
  { name: 'Sơn Việt Lĩnh', subtitle: 'Man binh rừng núi phương Nam', theme: 'bamboo', deck: ['berserker', 'archer', 'ninja', 'monk', 'spear', 'hocnui', 'gauden', 'lonrung', 'hauchu'], desc: 'Man binh và mãnh thú xông ra từ rừng sâu; Hứa Chử xuất trận. Gần cuối trận một Cự Hùng khổng lồ lao ra khỏi hang.' },
  { name: 'Phàn Khẩu', subtitle: 'Thủy quân Giang Hạ', theme: 'sea', deck: ['crossbow', 'archer', 'shield', 'healer', 'taoist', 'chudu', 'bangthong', 'hoangcai'], defenses: ['frosttotem', 'ballista'], desc: 'Thủy quân bắn từ xa: nỏ thủ, trụ băng, nỏ thần; Chu Du làm chậm, Bàng Thống làm choáng, Hoàng Cái hỏa công.' },
  { name: 'Di Lăng', subtitle: 'Lục Tốn hỏa thiêu liên doanh', theme: 'bamboo', mod: 'swarm', deck: ['samurai', 'archer', 'hoathuong', 'liethoa', 'bomber', 'knight', 'hoangcai', 'liubei'], defenses: ['firepit'], desc: 'Liên doanh trăm dặm bốc cháy: quân dồn dập (mỗi lần 2 quân), hỏa thương, tử sĩ và hố lửa. Cần Y sư và dứt điểm nhanh.' },
  { name: 'Tiêu Dao Tân', subtitle: 'Cầu nổi trên sông Hoài', theme: 'night', mod: 'quick', deck: ['ninja', 'knight', 'crossbow', 'shield', 'healer', 'truonglieu', 'taothao', 'dienvi', 'philong'], defenses: ['drum', 'archertower'], desc: 'Quân Ngụy nhanh hơn 20%; trống trận tăng sức đồng đội, Tào Tháo hạ lệnh, Điển Vi và Trương Liêu xung phong.' },
  { name: 'Thạch Đầu Thành', subtitle: 'Cửa ải cuối trước Kiến Nghiệp', theme: 'stone', mod: 'armored', deck: ['knight', 'elephant', 'trebuchet', 'taoist', 'healer', 'hahaudon', 'chudu', 'dienvi', 'quanvu', 'philong'], defenses: ['wall', 'archertower', 'ballista'], desc: 'Tuyến phòng thủ cuối: quân giáp dày (+6), tường thành, tháp cung, nỏ thần; Hạ Hầu Đôn, Quan Vũ và Điển Vi phản công.' },
  { name: 'Kiến Nghiệp Cung', subtitle: 'Boss: Tôn Quyền', theme: 'throne', bossId: 'tonquyen', deck: ['samurai', 'spear', 'shield', 'knight', 'crossbow', 'healer', 'trebuchet', 'chudu', 'hoangcai', 'thaisutu'], desc: 'Màn Boss chỉ có 1 lane. Tôn Quyền xuất hiện khi trận gần kết thúc: tấu khúc làm chậm quân bạn và ban phúc hồi máu cho quân địch.' },
];

// ───────────── Bản đồ 9: Xạ Điêu Anh Hùng (Kim Dung) — khó hơn ─────────────
const MAP9: Def[] = [
  { name: 'Thảo Nguyên Mông Cổ', subtitle: 'Vó ngựa Đại Hãn giày xéo đại mạc', theme: 'plains', deck: ['knight', 'archer', 'spear', 'berserker', 'crossbow', 'hogia', 'quachtinh', 'hongthatcong'], defenses: ['spiketrap', 'archertower'], desc: 'Kỵ binh Mông Cổ ào ạt, cung thủ bắn như mưa; Quách Tĩnh và Hồng Thất Công dẫn quân. Địch mạnh hơn hẳn các bản đồ trước.' },
  { name: 'Yên Kinh Thành', subtitle: 'Kinh đô nước Kim kiên cố', theme: 'castle', mod: 'armored', deck: ['shield', 'monk', 'crossbow', 'spear', 'healer', 'trebuchet', 'hoangduocsu', 'doanduy'], defenses: ['wall', 'archertower', 'ballista'], desc: 'Quân giáp dày (+6) sau tường thành, tháp cung và nỏ thần; cờ các lane gộp thành một tòa thành chung có cung thủ trên tường.' },
  { name: 'Thái Hồ Thủy Trại', subtitle: 'Thủy quân Quy Vân Trang', theme: 'sea', deck: ['crossbow', 'archer', 'shield', 'healer', 'taoist', 'mehon', 'hoangdung', 'auduongphong'], defenses: ['frosttotem', 'ballista'], desc: 'Thủy trại bắn từ xa trên Thái Hồ: nỏ thủ, trụ băng, nỏ thần; Hoàng Dung bày kế, Âu Dương Phong hạ độc.' },
  { name: 'Hoa Sơn Nhị Luận', subtitle: 'Quần hùng tranh đệ nhất thiên hạ', theme: 'stone', mod: 'quick', deck: ['ninja', 'knight', 'berserker', 'crossbow', 'healer', 'lenhhoxung', 'auduongphong', 'hongthatcong'], defenses: ['drum', 'archertower'], desc: 'Cao thủ giang hồ nhanh hơn 20%; trống trận tăng sức, Âu Dương Phong và Hồng Thất Công đối đầu.' },
  { name: 'Tương Dương Thành', subtitle: 'Quách Tĩnh Hoàng Dung giữ thành', theme: 'castle', deck: ['shield', 'spear', 'crossbow', 'trebuchet', 'healer', 'lienchau', 'quachtinh', 'hoangdung', 'duongqua'], defenses: ['wall', 'ballista', 'catapult'], desc: 'Tương Dương vững như bàn thạch: tường thành, nỏ thần, pháo thạch; ba đại hiệp xung trận. Gần cuối trận một Cự Tượng khổng lồ xông ra.' },
  { name: 'Thiết Chưởng Phong', subtitle: 'Cừu Thiên Nhận trấn đỉnh núi', theme: 'stone', mod: 'armored', deck: ['monk', 'shield', 'kimcang', 'thanluc', 'healer', 'daodaobinh', 'kieuphong', 'duongqua'], defenses: ['wall', 'spikewall', 'archertower'], desc: 'Quân giáp dày (+6) trên đỉnh núi dựng đứng; Kiều Phong đẩy lùi cả đội hình, Dương Quá phản công.' },
  { name: 'Tuyệt Tình Cốc Hạ Độc', subtitle: 'Hoa tuyệt tình ngàn độc', theme: 'plains', mod: 'swarm', deck: ['poisoner', 'mehon', 'archer', 'ninja', 'healer', 'nhendoc', 'duongqua', 'tieulongnu', 'auduongphong'], defenses: ['firepit', 'spiketrap'], desc: 'Độc sư và nhện độc dồn dập (mỗi lần 2 quân); hố lửa và bẫy gai chắn lối. Cần Y sư và sát thương lan.' },
  { name: 'Cổ Mộ Tàng Kinh', subtitle: 'Cửa ngầm dưới lòng đất', theme: 'night', mod: 'quick', deck: ['ninja', 'anhsat', 'poisoner', 'chieuhon', 'healer', 'tieulongnu', 'lenhhoxung', 'doanduy'], defenses: ['spikewall', 'drum'], desc: 'Sát thủ nhanh hơn 20% lao ra từ bóng tối; Tiểu Long Nữ hồi máu, Chiêu Hồn Sư gọi quân ngã dậy.' },
  { name: 'Bạch Đà Sơn Trang', subtitle: 'Âu Dương Phong dưỡng độc xà', theme: 'desert', mod: 'armored', deck: ['elephant', 'knight', 'trebuchet', 'poisoner', 'healer', 'auduongphong', 'hongthatcong', 'quachtinh'], defenses: ['wall', 'archertower', 'catapult'], desc: 'Quân giáp dày (+6) giữa sa mạc; tường thành, tháp cung, pháo thạch; ba cao thủ thành danh xuất trận. Cờ các lane gộp thành thành chung.' },
  { name: 'Kim Trướng Đại Hãn', subtitle: 'Boss: Thành Cát Tư Hãn', theme: 'throne', bossId: 'thanhcat', deck: ['knight', 'archer', 'spear', 'shield', 'crossbow', 'berserker', 'elephant', 'trebuchet', 'hongthatcong', 'quachtinh'], desc: 'Màn Boss chỉ có 1 lane. Thành Cát Tư Hãn xuất hiện khi trận gần kết thúc: hạ lệnh tăng sức cả đàn, vó ngựa dồn dập và triệu thiết kỵ.' },
];

// ───────────── Bản đồ 10: Bắc Phạt Trung Nguyên (Tam Quốc) — khó hơn ─────────────
const MAP10: Def[] = [
  { name: 'Kỳ Sơn', subtitle: 'Khổng Minh xuất quân lần đầu', theme: 'plains', deck: ['spear', 'archer', 'crossbow', 'knight', 'shield', 'hogia', 'giacatluong', 'trieuvan'], defenses: ['archertower', 'spiketrap'], desc: 'Quân Thục tiến ra Kỳ Sơn: Gia Cát Lượng dội mưa lửa, Triệu Vân xung phong. Địch mạnh hơn hẳn bản đồ trước.' },
  { name: 'Nhai Đình', subtitle: 'Mã Tốc thất thủ', theme: 'stone', mod: 'armored', deck: ['shield', 'spear', 'crossbow', 'healer', 'monk', 'tumayi', 'truonglieu', 'hahaudon'], defenses: ['wall', 'spikewall'], desc: 'Quân Ngụy giáp dày (+6) chiếm điểm cao; Tư Mã Ý đóng băng đội hình, Trương Liêu và Hạ Hầu Đôn càn quét.' },
  { name: 'Trần Thương', subtitle: 'Hác Chiêu giữ thành nhỏ', theme: 'castle', deck: ['shield', 'spear', 'crossbow', 'trebuchet', 'healer', 'lienchau', 'hahaudon', 'dienvi'], defenses: ['wall', 'archertower', 'ballista', 'catapult'], desc: 'Thành nhỏ mà cứng: tường cao, tháp cung, nỏ thần, pháo thạch. Cờ các lane gộp thành thành chung có cung thủ trên tường.' },
  { name: 'Vị Thủy', subtitle: 'Đại chiến bên bờ sông Vị', theme: 'sea', deck: ['crossbow', 'archer', 'shield', 'healer', 'taoist', 'chudu', 'tumayi', 'taothao'], defenses: ['frosttotem', 'ballista'], desc: 'Thủy quân Ngụy bắn từ xa: nỏ thủ, trụ băng, nỏ thần; Tư Mã Ý đóng băng, Tào Tháo hạ lệnh.' },
  { name: 'Tà Cốc Đạo', subtitle: 'Sạn đạo hiểm trở', theme: 'bamboo', deck: ['berserker', 'archer', 'ninja', 'crossbow', 'spear', 'hocnui', 'tegiac', 'giacatluong', 'hoangtrung'], desc: 'Quân mai phục trong rừng trúc; Hoàng Trung bắn xuyên giáp. Gần cuối trận một Cự Quy khổng lồ lao ra khỏi hang.' },
  { name: 'Thượng Phương Cốc', subtitle: 'Hỏa thiêu Tư Mã Ý', theme: 'volcano', mod: 'swarm', deck: ['bomber', 'hoathuong', 'liethoa', 'samurai', 'healer', 'archer', 'hoangcai', 'chudu', 'giacatluong'], defenses: ['firepit', 'spiketrap'], desc: 'Hẻm núi bốc lửa: quân dồn dập (mỗi lần 2 quân), hỏa thương, tử sĩ, hố lửa. Cần Y sư và dứt điểm nhanh.' },
  { name: 'Tây Thành', subtitle: 'Không thành kế', theme: 'desert', mod: 'quick', deck: ['ninja', 'knight', 'phiky', 'crossbow', 'healer', 'masieu', 'trieuvan', 'tumayi'], defenses: ['drum', 'archertower'], desc: 'Kỵ binh nhanh hơn 20% ập tới thành trống; trống trận tăng sức, Mã Siêu và Triệu Vân xung phong.' },
  { name: 'Hán Trung', subtitle: 'Cửa ngõ Thục Hán', theme: 'stone', mod: 'armored', deck: ['elephant', 'monk', 'kimcang', 'trebuchet', 'healer', 'daodaobinh', 'quanvu', 'truongphi', 'liubei'], defenses: ['wall', 'spikewall', 'ballista'], desc: 'Quân giáp dày (+6) sau tường thành và tường gai; Quan Vũ, Trương Phi, Lưu Bị cùng xuất trận.' },
  { name: 'Lạc Dương', subtitle: 'Cố đô nhà Ngụy', theme: 'castle', mod: 'armored', deck: ['knight', 'shield', 'crossbow', 'trebuchet', 'healer', 'hogia', 'taothao', 'dienvi', 'hauchu', 'hahaudon'], defenses: ['wall', 'archertower', 'ballista', 'drum'], desc: 'Tuyến cuối của Ngụy: quân giáp dày (+6), tường, tháp cung, nỏ thần, trống chiến; bốn mãnh tướng trấn giữ. Cờ các lane gộp thành thành chung.' },
  { name: 'Đại Doanh Chung Hội', subtitle: 'Boss: Chung Hội', theme: 'throne', bossId: 'chunghoi', deck: ['knight', 'spear', 'shield', 'crossbow', 'healer', 'trebuchet', 'monk', 'elephant', 'tumayi', 'taothao'], desc: 'Màn Boss chỉ có 1 lane. Chung Hội xuất hiện khi trận gần kết thúc: đóng băng quân bạn, dựng giáp khí và gọi nỏ thủ yểm trợ.' },
];

// ───────────── Bản đồ 11: Thiên Đình Quyết Chiến (Tây Du · Phong Thần) — khó nhất ─────────────
const MAP11: Def[] = [
  { name: 'Nam Thiên Môn', subtitle: 'Cổng trời có Na Tra trấn giữ', theme: 'heaven', deck: ['knight', 'shield', 'taoist', 'crossbow', 'healer', 'hanbang', 'natra', 'duongtien', 'loicong'], defenses: ['archertower', 'drum'], desc: 'Thiên binh giữ cổng trời: Na Tra bay lượn, Dương Tiễn triệu Hao Thiên Khuyển, Lôi Công giáng sét. Địch khó nhất từ trước tới nay.' },
  { name: 'Thiên Hà', subtitle: 'Dòng sông trời ngàn dặm', theme: 'sea', deck: ['crossbow', 'archer', 'shield', 'healer', 'taoist', 'mehon', 'longvuong', 'satang'], defenses: ['frosttotem', 'ballista'], desc: 'Thủy quân Thiên Hà bắn từ xa: nỏ thủ, trụ băng, nỏ thần; Long Vương và Sa Tăng dẫn thủy quân.' },
  { name: 'Linh Tiêu Điện', subtitle: 'Cung điện Ngọc Hoàng', theme: 'throne', deck: ['monk', 'shield', 'crossbow', 'taoist', 'healer', 'trebuchet', 'laoquan', 'quanam', 'duongtien'], defenses: ['wall', 'archertower', 'ballista', 'drum'], desc: 'Cung điện cao ngất: tường, tháp cung, nỏ thần, trống chiến; Lão Quân đóng băng, Quan Âm rưới cam lộ. Cờ các lane gộp thành thành chung.' },
  { name: 'Bàn Đào Viên', subtitle: 'Vườn đào tiên của Vương Mẫu', theme: 'bamboo', mod: 'swarm', deck: ['samurai', 'ninja', 'bomber', 'healer', 'crossbow', 'duocdong', 'tonngokhong', 'trubatgioi', 'duongtang'], defenses: ['firepit', 'altar'], desc: 'Thiên binh dồn dập (mỗi lần 2 quân) quanh vườn đào; Tôn Ngộ Không biến hóa, Trư Bát Giới càn quét.' },
  { name: 'Hỏa Diệm Sơn Nộ Hỏa', subtitle: 'Lửa thiêu tám trăm dặm', theme: 'volcano', mod: 'armored', deck: ['berserker', 'elephant', 'bomber', 'hoathuong', 'healer', 'liethoa', 'thietphien', 'kimsidieu', 'laoquan'], defenses: ['wall', 'firepit', 'catapult'], desc: 'Quân giáp dày (+6) giữa biển lửa; Thiết Phiến Công Chúa quạt gió, Kim Sí Đại Bàng bay lượn. Gần cuối trận một Cổ Long Thiên Hỏa khổng lồ xuất hiện.' },
  { name: 'Tây Thiên Linh Sơn', subtitle: 'Thánh địa Phật môn', theme: 'heaven', mod: 'armored', deck: ['monk', 'lahan', 'kimcang', 'shield', 'healer', 'taoist', 'diatang', 'quanam', 'duongtang'], defenses: ['wall', 'altar', 'archertower'], desc: 'Quân giáp dày (+6) của Phật môn; Địa Tạng Vương, Quan Âm và Đường Tăng hồi phục cả đội. Cần sát thương xuyên giáp.' },
  { name: 'Âm Phủ Phản Loạn', subtitle: 'Quỷ binh dậy đất', theme: 'night', mod: 'quick', deck: ['ninja', 'anhsat', 'chieuhon', 'mehon', 'poisoner', 'healer', 'tatu', 'loicong', 'diatang'], defenses: ['spikewall', 'firepit'], desc: 'Quỷ binh nhanh hơn 20% tràn khỏi âm phủ; Chiêu Hồn Sư gọi quân ngã dậy, Tả Từ độn thổ.' },
  { name: 'Tru Tiên Trận', subtitle: 'Vạn kiếm giăng trời', theme: 'stone', mod: 'armored', deck: ['knight', 'elephant', 'crossbow', 'taoist', 'healer', 'hanbang', 'natra', 'duongtien', 'giacatluong', 'chudu'], defenses: ['wall', 'ballista', 'catapult', 'drum'], desc: 'Trận pháp chặn lối: quân giáp dày (+6), tường, nỏ thần, pháo thạch; Na Tra, Dương Tiễn, Gia Cát Lượng và Chu Du cùng ra tay.' },
  { name: 'Chu Tước Môn', subtitle: 'Cửa cuối trước Thiên Đế', theme: 'throne', mod: 'armored', deck: ['knight', 'elephant', 'crossbow', 'healer', 'monk', 'trebuchet', 'quanvu', 'lubo', 'tonngokhong', 'laoquan'], defenses: ['wall', 'archertower', 'ballista', 'drum'], desc: 'Tuyến cuối: quân giáp dày (+6), tường, tháp cung, nỏ thần, trống chiến; Quan Vũ, Lữ Bố, Tôn Ngộ Không và Lão Quân tụ hội. Cờ các lane gộp thành thành chung.' },
  { name: 'Ngọc Hoàng Đế Điện', subtitle: 'Boss: Ngọc Hoàng Đại Đế', theme: 'heaven', bossId: 'ngochoang', deck: ['monk', 'shield', 'taoist', 'crossbow', 'healer', 'knight', 'trebuchet', 'hanbang', 'laoquan', 'natra'], desc: 'Màn Boss chỉ có 1 lane. Ngọc Hoàng Đại Đế xuất hiện khi trận gần kết thúc: giáng lôi, ban phúc cho quân địch và đóng băng quân bạn.' },
];

const MAPS: Def[][] = [MAP1, MAP2, MAP3, MAP4, MAP5, MAP6, MAP7, MAP8, MAP9, MAP10, MAP11];

/** thời tiết từng trạm của mỗi bản đồ */
const WEATHER_PLAN: WeatherId[][] = [
  ['sunny', 'rain', 'thunder', 'sunny', 'fog', 'fireRain', 'sunny', 'thunder', 'rain', 'sunny'],
  ['rain', 'fog', 'sunny', 'fog', 'thunder', 'sunny', 'rain', 'sunny', 'fog', 'thunder'],
  ['sunny', 'thunder', 'fog', 'fireRain', 'sunny', 'thunder', 'fog', 'sunny', 'thunder', 'fireRain'],
  ['sunny', 'fog', 'rain', 'sunny', 'fog', 'rain', 'thunder', 'fog', 'thunder', 'rain'],
  ['fog', 'sunny', 'thunder', 'rain', 'fireRain', 'fog', 'thunder', 'sunny', 'fireRain', 'thunder'],
  ['rain', 'sunny', 'fog', 'sunny', 'thunder', 'sunny', 'rain', 'fog', 'thunder', 'fireRain'],
  ['sunny', 'fog', 'thunder', 'fog', 'rain', 'rain', 'fireRain', 'fog', 'sunny', 'thunder'],
  ['sunny', 'rain', 'sunny', 'rain', 'fog', 'fog', 'fireRain', 'thunder', 'rain', 'fireRain'],
  ['sunny', 'fog', 'rain', 'thunder', 'fog', 'fireRain', 'thunder', 'fog', 'thunder', 'fireRain'],
  ['rain', 'thunder', 'fog', 'rain', 'sunny', 'fireRain', 'fog', 'thunder', 'fireRain', 'thunder'],
  ['thunder', 'rain', 'sunny', 'fog', 'fireRain', 'thunder', 'fireRain', 'fog', 'thunder', 'fireRain'],
];
/** trạm có đường nối lane (id toàn cục → [lane a, lane b, vị trí x]): rải đều các bản đồ, không có ở trạm Boss/quái khổng lồ */
const BRIDGE_PLAN: Record<number, [number, number, number]> = {
  2: [0, 1, 520], 6: [1, 2, 480], 8: [0, 1, 500],
  11: [1, 2, 500], 13: [0, 1, 460], 16: [0, 1, 540], 18: [1, 2, 500],
  21: [0, 1, 500], 23: [1, 2, 460], 25: [1, 2, 540], 26: [0, 1, 500], 28: [0, 1, 480],
  31: [0, 1, 500], 33: [1, 2, 480], 36: [0, 1, 520], 37: [1, 2, 500], 38: [0, 1, 500],
  42: [1, 2, 500], 43: [0, 1, 480], 45: [0, 1, 520], 47: [1, 2, 500], 48: [0, 1, 500],
  52: [0, 1, 500], 55: [1, 2, 520], 58: [0, 1, 480], 62: [1, 2, 500], 65: [0, 1, 540], 66: [1, 2, 480], 68: [0, 1, 500],
  72: [1, 2, 500], 73: [0, 1, 520], 76: [0, 1, 520], 78: [1, 2, 480],
  80: [0, 1, 500], 83: [1, 2, 500], 85: [0, 1, 480], 86: [1, 2, 520], 87: [0, 1, 500],
  90: [1, 2, 500], 91: [0, 1, 520], 95: [1, 2, 480], 96: [0, 1, 500], 97: [1, 2, 520],
  100: [0, 1, 500], 103: [1, 2, 500], 105: [0, 1, 480], 106: [1, 2, 500], 107: [0, 1, 520],
};
/** quái thú khổng lồ của mỗi bản đồ (xuất hiện ở trạm thứ 5) */
export const GIANT_STATION = 4;
const GIANTS = ['nguoida', 'cumang', 'culong', 'daitrung', 'quysai', 'cutuong', 'cuquy', 'cuhung', 'cutuong', 'cuquy', 'culong'];

/**
 * Trạm có LANE SÔNG: các trạm hợp chủ đề (Xích Bích, Long Cung, Lương Sơn Thủy Bạc, Vong Xuyên Hà...) luôn có,
 * các trạm còn lại rải ngẫu nhiên theo hạt giống cố định (mỗi lần chơi vẫn như nhau). Trạm Boss một lane nên không có.
 */
const RIVER_FORCED: Record<number, number> = { 2: 1, 5: 1, 7: 2, 10: 1, 13: 0, 18: 2, 21: 1, 22: 2, 27: 1, 32: 2, 35: 1, 37: 0, 41: 1, 42: 2, 43: 0, 47: 1, 56: 1, 64: 1, 71: 1, 75: 2, 77: 0, 82: 1, 93: 2, 101: 1 };
function riverLaneOf(id: number, boss: boolean): number | undefined {
  if (boss) return undefined;
  if (RIVER_FORCED[id] !== undefined) return RIVER_FORCED[id];
  const h = ((id * 2654435761) >>> 0) % 100;
  return id >= 3 && h < 16 ? h % 3 : undefined;
}
/** quân địch thêm vào bộ quân của trạm có sông (theo bản đồ); trạm đầu bản đồ chỉ nhận 2 loại đầu */
const RIVER_DECK: string[][] = [
  ['thuybinh', 'cungthuyen', 'chienthuyen', 'camninh'],
  ['thuybinh', 'cungthuyen', 'chienthuyen', 'cacau'],
  ['thuybinh', 'chienthuyen', 'giaolong', 'satang'],
  ['thuybinh', 'cungthuyen', 'phaothuyen', 'camninh'],
  ['thuybinh', 'cacau', 'camap', 'ruathan', 'giaolong'],
  ['thuybinh', 'cungthuyen', 'chienthuyen', 'phaothuyen'],
  ['thuybinh', 'cungthuyen', 'giaolong', 'satang'],
  ['thuybinh', 'cungthuyen', 'chienthuyen', 'phaothuyen', 'camninh'],
  ['thuybinh', 'cungthuyen', 'chienthuyen', 'phaothuyen', 'giaolong'],
  ['thuybinh', 'chienthuyen', 'phaothuyen', 'camninh', 'giaolong'],
  ['thuybinh', 'chienthuyen', 'phaothuyen', 'giaolong', 'camap', 'ruathan'],
];

/**
 * đơn vị đợt mới thêm dần vào bộ quân địch của từng bản đồ (đầu bản đồ ít, cuối bản đồ nhiều);
 * quái thú chỉ xuất hiện từ trạm thứ 5 trở đi
 */
const EXTRA_DECK: string[][] = [
  ['daodaobinh', 'hoathuong', 'hogia', 'toanphong', 'phiky', 'dienvi'],
  ['lahan', 'phikiem', 'langy', 'lienchau', 'anhsat', 'hongthatcong'],
  ['duocdong', 'hacphong', 'hanbang', 'thanluc', 'sudavuong', 'cuuvi'],
  ['daodaobinh', 'mehon', 'macau', 'hotinh', 'phuonghoangtu', 'hauchu'],
  ['bachcot', 'cuongthi', 'nguudau', 'madien', 'chieuhon', 'diatang'],
  ['lahan', 'kimcang', 'liethoa', 'phikiem', 'mehon', 'thanluc'],
  ['daodong', 'hanbang', 'duocdong', 'chieuhon', 'phuonghoangtu', 'thanhac'],
  ['hogia', 'toanphong', 'daodaobinh', 'lienchau', 'phiky', 'hoathuong'],
  ['daodaobinh', 'lienchau', 'kimcang', 'lahan', 'phiky', 'thanluc'],
  ['hogia', 'toanphong', 'hoathuong', 'lienchau', 'phiky', 'daodaobinh'],
  ['hanbang', 'chieuhon', 'thanluc', 'phuonghoangtu', 'thanhac', 'mehon'],
];
const EXTRA_BEASTS: string[][] = [
  ['phiung'],
  ['thanhxa', 'ngocong'],
  ['hoangphong', 'tuongtinh', 'thanhnguu'],
  ['langyeu', 'khongtuoc'],
  ['bangphuong', 'hoaphuong', 'moctinh'],
  ['cuuvi', 'hotinh', 'khongtuoc'],
  ['sudavuong', 'cuuvi', 'moctinh'],
  ['hoaphuong', 'bangphuong', 'macau'],
  ['soivuong', 'hacphong', 'cuuvi'],
  ['tegiac', 'hocnui', 'loithu'],
  ['hoaphuong', 'bangphuong', 'khongtuoc', 'philong'],
];
const extraDeckOf = (ch: number, j: number, have: string[]): string[] =>
  [...EXTRA_DECK[ch].slice(0, Math.floor((j + 1) * 0.6)), ...(j >= GIANT_STATION ? EXTRA_BEASTS[ch] : [])].filter((id) => !have.includes(id));

/** hệ số sức mạnh / thu nhập địch theo bản đồ (bắt đầu, bước mỗi trạm) */
const POWER: [number, number][] = [[1.0, 0.027], [1.2, 0.024], [1.3, 0.017], [1.38, 0.012], [1.5, 0.012], [1.62, 0.011], [1.73, 0.01], [1.83, 0.01], [1.98, 0.012], [2.12, 0.012], [2.26, 0.013]];
const INCOME: [number, number][] = [[1.9, 0.17], [3.1, 0.1], [3.8, 0.08], [4.4, 0.05], [4.9, 0.05], [5.2, 0.05], [5.5, 0.05], [5.8, 0.05], [6.0, 0.06], [6.3, 0.06], [6.6, 0.06]];
const BOSS_POWER = [1.04, 1.04, 0.95, 1.0, 1.05, 1.06, 1.07, 1.08, 1.1, 1.12, 1.15];
/** hệ số vàng/giây của địch (giảm để địch ra quân chậm lại một chút) */
const ENEMY_INCOME_SCALE = 0.9;

/** tổng quân địch của trạm thường: tăng 1,5 quân/trạm ở 3 bản đồ đầu, các bản đồ sau tăng chậm hơn để trận không quá dài */
const troopBudget = (id: number) => (id < 30 ? 10 + 1.5 * id : id < 50 ? 52 + 0.6 * (id - 30) : id < 80 ? 64 + 0.4 * (id - 50) : 76 + 0.8 * (id - 80));

/** trạm có căn cứ phụ: mỗi bản đồ ngẫu nhiên (cố định) 3–4 trạm (trạm càng sâu càng nhiều căn cứ), mỗi lane một loại căn cứ; trạm có sông không có */
const OUTPOST_PLANS = MAPS.map((_, ch) => outpostPlan(ch, STATIONS_PER_MAP, 3, (j) => riverLaneOf(ch * STATIONS_PER_MAP + j, false) !== undefined));
/** trạm có lane thứ 4 của địch: mỗi bản đồ 4 trạm */
const EXTRA_PLANS = MAPS.map((_, ch) => extraLanePlan(ch, STATIONS_PER_MAP, (j) => OUTPOST_PLANS[ch].has(j), (j) => riverLaneOf(ch * STATIONS_PER_MAP + j, false)));

export const STATIONS: Station[] = MAPS.flatMap((defs, ch) =>
  defs.map((d, j): Station => {
    const id = ch * STATIONS_PER_MAP + j;
    const boss = !!d.bossId;
    const river = riverLaneOf(id, boss);
    const outposts = river === undefined && !boss ? OUTPOST_PLANS[ch].get(j) ?? [] : [];
    const posts = outposts[0]?.length ?? 0;
    const extraLane = boss ? undefined : EXTRA_PLANS[ch].get(j);
    const bridgeBase = BRIDGE_PLAN[id] && river !== BRIDGE_PLAN[id][0] && river !== BRIDGE_PLAN[id][1] ? [{ a: BRIDGE_PLAN[id][0], b: BRIDGE_PLAN[id][1], x: BRIDGE_PLAN[id][2] }] : [];
    const tunnels = tunnelFor(id, boss, river, STATIONS_PER_MAP);
    const bridges = [...bridgeBase, ...extraBridgeFor(id, boss, bridgeBase, river, STATIONS_PER_MAP)];
    const riverDeck = river === undefined ? [] : RIVER_DECK[ch].slice(0, j < 5 ? 2 : j < 8 ? 3 : RIVER_DECK[ch].length);
    const round5 = (n: number) => Math.round(n / 5) * 5;
    return {
      id, chapter: ch, name: d.name, subtitle: d.subtitle, boss, bossId: d.bossId,
      deck: [...d.deck, ...extraDeckOf(ch, j, d.deck), ...riverDeck], mod: d.mod, defenses: d.defenses, theme: d.theme, desc: d.desc,
      weather: WEATHER_PLAN[ch][j],
      giantId: j === GIANT_STATION ? GIANTS[ch] : undefined,
      river,
      outposts, posts,
      extraLane,
      tunnels,
      lairs: lairPlanFor(id, boss, STATIONS_PER_MAP, river, OUTPOST_AT_FRACS[posts] ?? [], [
        ...bridges.flatMap((b) => [{ lane: b.a, x: b.x / 1000 }, { lane: b.b, x: b.x / 1000 }]),
        ...tunnels.flatMap((t) => [{ lane: t.a, x: t.xa / 1000 }, { lane: t.b, x: t.xb / 1000 }]),
      ]),
      bridges,
      castle: !boss && river === undefined && CASTLE_STATIONS.has(id) ? true : undefined,
      power: Math.round((boss ? BOSS_POWER[ch] : POWER[ch][0] + POWER[ch][1] * j) * 100) / 100,
      income: Math.round((INCOME[ch][0] + INCOME[ch][1] * j) * ENEMY_INCOME_SCALE * 100) / 100,
      flagHp: Math.round((id < 30 ? 340 + 33 * id : 1297 + 14 * (id - 29)) * (boss ? 1.15 : 1) / 10) * 10,
      units: Math.round(boss ? troopBudget(id) * 0.62 + 2 : troopBudget(id) * OUTPOST_BUDGET_MUL[posts] * (extraLane ? EXTRA_LANE_BUDGET_MUL : 1)),
      reward: Math.round(((100 + 30 * id) * (boss ? 1.8 : 1)) / 10) * 10,
      // thời gian cho 3 sao tăng dần theo độ sâu: 100s (trạm đầu) → ~200s (trạm cuối); Boss cần thêm thời gian chờ Boss xuất hiện
      fastSec: round5((boss ? 140 + 2 * Math.min(id, 50) + (id > 50 ? id - 50 : 0) : 100 + 3.5 * Math.min(id, 50) + 1.5 * Math.max(0, id - 50)) * OUTPOST_TIME_MUL[posts]),
    };
  }),
);

export const CHAPTERS: Chapter[] = [
  {
    id: 0, name: 'Tam Lộ Công Thành', subtitle: 'Hạ 9 trạm để gặp Boss', stations: Array.from({ length: STATIONS_PER_MAP }, (_, j) => j),
    start: { l: [0.08, 0.84], p: [0.25, 0.94] }, end: { l: [0.92, 0.17], p: [0.82, 0.2] },
  },
  {
    id: 1, name: 'Hiệp Khách Hành', subtitle: 'Giang hồ Kim Dung', stations: Array.from({ length: STATIONS_PER_MAP }, (_, j) => 10 + j),
    start: { l: [0.08, 0.84], p: [0.25, 0.94] }, end: { l: [0.92, 0.17], p: [0.82, 0.2] },
  },
  {
    id: 2, name: 'Đại Náo Thiên Cung', subtitle: 'Phong Thần · Tây Du', stations: Array.from({ length: STATIONS_PER_MAP }, (_, j) => 20 + j),
    start: { l: [0.08, 0.84], p: [0.25, 0.94] }, end: { l: [0.92, 0.17], p: [0.82, 0.2] },
  },
  {
    id: 3, name: 'Thủy Hử Lương Sơn', subtitle: 'Giang hồ hảo hán', stations: Array.from({ length: STATIONS_PER_MAP }, (_, j) => 30 + j),
    start: { l: [0.08, 0.84], p: [0.25, 0.94] }, end: { l: [0.92, 0.17], p: [0.82, 0.2] },
  },
  {
    id: 4, name: 'Địa Phủ Hồi Hồn', subtitle: 'Hành trình vào Âm Tào', stations: Array.from({ length: STATIONS_PER_MAP }, (_, j) => 40 + j),
    start: { l: [0.08, 0.84], p: [0.25, 0.94] }, end: { l: [0.92, 0.17], p: [0.82, 0.2] },
  },
  {
    id: 5, name: 'Thiên Long Bát Bộ', subtitle: 'Ân oán Đại Lý · Liêu · Tây Hạ', stations: Array.from({ length: STATIONS_PER_MAP }, (_, j) => 50 + j),
    start: { l: [0.08, 0.84], p: [0.25, 0.94] }, end: { l: [0.92, 0.17], p: [0.82, 0.2] },
  },
  {
    id: 6, name: 'Tây Thiên Thỉnh Kinh', subtitle: 'Chín chín tám mốt kiếp nạn', stations: Array.from({ length: STATIONS_PER_MAP }, (_, j) => 60 + j),
    start: { l: [0.08, 0.84], p: [0.25, 0.94] }, end: { l: [0.92, 0.17], p: [0.82, 0.2] },
  },
  {
    id: 7, name: 'Giang Đông Thủy Chiến', subtitle: 'Ngô · Thục · Ngụy tranh Trường Giang', stations: Array.from({ length: STATIONS_PER_MAP }, (_, j) => 70 + j),
    start: { l: [0.08, 0.84], p: [0.25, 0.94] }, end: { l: [0.92, 0.17], p: [0.82, 0.2] },
  },
  {
    id: 8, name: 'Xạ Điêu Anh Hùng', subtitle: 'Đại hiệp vì nước vì dân', stations: Array.from({ length: STATIONS_PER_MAP }, (_, j) => 80 + j),
    start: { l: [0.08, 0.84], p: [0.25, 0.94] }, end: { l: [0.92, 0.17], p: [0.82, 0.2] },
  },
  {
    id: 9, name: 'Bắc Phạt Trung Nguyên', subtitle: 'Khổng Minh sáu lần ra Kỳ Sơn', stations: Array.from({ length: STATIONS_PER_MAP }, (_, j) => 90 + j),
    start: { l: [0.08, 0.84], p: [0.25, 0.94] }, end: { l: [0.92, 0.17], p: [0.82, 0.2] },
  },
  {
    id: 10, name: 'Thiên Đình Quyết Chiến', subtitle: 'Tây Du · Phong Thần: trận cuối cùng', stations: Array.from({ length: STATIONS_PER_MAP }, (_, j) => 100 + j),
    start: { l: [0.08, 0.84], p: [0.25, 0.94] }, end: { l: [0.92, 0.17], p: [0.82, 0.2] },
  },
];

/** vị trí trạm trên bản đồ (0..1): ngang (l) hoặc dọc (p) */
export function stationPos(idx: number, orient: 'l' | 'p'): [number, number] {
  const ch = Math.floor(idx / STATIONS_PER_MAP);
  const j = idx % STATIONS_PER_MAP;
  if (orient === 'l') {
    const t = j / (STATIONS_PER_MAP - 1);
    const wobble = j === STATIONS_PER_MAP - 1 ? 0 : 0.07 * Math.sin(j * 2.3 + ch * 1.7);
    return [0.15 + 0.7 * t, 0.78 - 0.46 * t + wobble];
  }
  // zigzag 3 cột: hai trạm cùng cột cách nhau 3 bậc nên không chồng lên nhau trên màn dọc
  const xs = [0.2, 0.5, 0.8];
  return [xs[j % 3], 0.91 - 0.06 * j];
}

/** nhãn trạm kiểu "2-3" (bản đồ-trạm) */
export const stationLabel = (idx: number) => `${Math.floor(idx / STATIONS_PER_MAP) + 1}-${(idx % STATIONS_PER_MAP) + 1}`;

/** số lane của ta: màn Boss chỉ có 1 lane */
export const laneCountOf = (st: Station) => (st.boss ? 1 : 3);
/** tổng số lane trên chiến trường (kể cả lane thứ 4 chỉ địch có) */
export const totalLanesOf = (st: Station) => laneCountOf(st) + (st.extraLane && !st.boss ? 1 : 0);
