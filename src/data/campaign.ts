import type { WeatherId } from './terrain';
import { OUTPOST_TIME_MUL, outpostPlan, type OutpostKind } from './lane';

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
  /** đường nối giữa các lane (một số trạm) */
  bridges: Bridge[];
  /** căn cứ phụ của địch ở từng lane (rỗng = trạm không có): lane dài ra, quân nhỏ lại */
  outposts: OutpostKind[];
  desc: string;
}

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
  { name: 'Xích Bích', subtitle: 'Hỏa công trên sông Trường Giang', theme: 'sea', deck: ['archer', 'spear', 'bomber', 'crossbow', 'berserker', 'giacatluong'], desc: 'Tử sĩ và nỏ thủ gây sát thương lan, Gia Cát Lượng dội mưa lửa lên đội hình tụ tập.' },
  { name: 'Hổ Lao Quan', subtitle: 'Cửa ải Lữ Bố chặn đường', theme: 'stone', deck: ['knight', 'spear', 'shield', 'trebuchet', 'berserker', 'lubo'], defenses: ['wall'], desc: 'Lữ Bố trấn giữ cửa ải với kỵ binh, máy ném đá và tường thành.' },
  { name: 'Quan Độ', subtitle: 'Tào Tháo đốt kho lương', theme: 'plains', mod: 'swarm', deck: ['samurai', 'archer', 'ninja', 'knight', 'bomber', 'taothao'], desc: 'Địch ào ạt thả quân rẻ (mỗi lần 2 quân); Tào Tháo tăng sức cả đàn.' },
  { name: 'Ngũ Trượng Nguyên', subtitle: 'Tư Mã Ý án binh bất động', theme: 'night', deck: ['ninja', 'crossbow', 'shield', 'healer', 'taoist', 'tumayi', 'baoden'], defenses: ['archertower'], desc: 'Tư Mã Ý khiến quân bạn đứng yên; nỏ thủ và tháp cung bắn xuyên giáp từ xa.' },
  { name: 'Hoàng Thành', subtitle: 'Boss: Đổng Trác', theme: 'throne', bossId: 'dongtrac', deck: ['samurai', 'spear', 'shield', 'knight', 'ninja', 'berserker', 'healer', 'trebuchet', 'lubo', 'gauden'], desc: 'Màn Boss chỉ có 1 lane. Đổng Trác xuất hiện khi trận gần kết thúc: hạ gục hắn để hoàn thành bản đồ.' },
];

// ───────────── Bản đồ 2: Hiệp Khách Hành (Kim Dung) ─────────────
const MAP2: Def[] = [
  { name: 'Đào Hoa Đảo', subtitle: 'Hoàng Dược Sư bày trận ngũ hành', theme: 'sea', deck: ['spear', 'archer', 'ninja', 'taoist', 'crossbow', 'lenhhoxung', 'mangxa'], desc: 'Hòn đảo đầy trận pháp. Đạo sĩ và nỏ thủ bắn từ xa, Lệnh Hồ Xung phá giáp.' },
  { name: 'Cổ Mộ Phái', subtitle: 'Tiểu Long Nữ giữ mộ', theme: 'night', deck: ['ninja', 'poisoner', 'crossbow', 'shield', 'healer', 'tieulongnu'], defenses: ['spiketrap'], desc: 'Cổ mộ tối tăm: độc sư, nỏ thủ ẩn mình, bẫy gai dưới chân. Tiểu Long Nữ hồi máu cho đồng đội.' },
  { name: 'Võ Đang Sơn', subtitle: 'Trương Tam Phong tọa thiền', theme: 'bamboo', deck: ['monk', 'shield', 'spear', 'taoist', 'healer', 'truongvoky', 'hocnui'], defenses: ['wall'], desc: 'Phòng thủ chắc chắn với tường thành, đạo sĩ thả sấm sét; Trương Vô Kỵ phản đòn.' },
  { name: 'Tuyết Sơn', subtitle: 'Băng giá Tuyết Sơn Phi Hồ', theme: 'snow', mod: 'armored', deck: ['shield', 'monk', 'crossbow', 'berserker', 'poisoner', 'quachtinh', 'gauden', 'soihoang'], desc: 'Đối thủ giáp dày (+6 giáp), rất khó phá. Dùng sát thương xuyên giáp, độc và sát thương lan.' },
  { name: 'Hoa Sơn Luận Kiếm', subtitle: 'Quần hùng tranh đỉnh', theme: 'stone', deck: ['ninja', 'knight', 'berserker', 'crossbow', 'taoist', 'lenhhoxung', 'kieuphong', 'baoden'], defenses: ['archertower'], desc: 'Cao thủ giang hồ tụ hội: Lệnh Hồ Xung phá giáp, Kiều Phong đẩy lùi đội hình.' },
  { name: 'Quang Minh Đỉnh', subtitle: 'Minh Giáo Tây Vực', theme: 'desert', mod: 'quick', deck: ['knight', 'ninja', 'bomber', 'taoist', 'poisoner', 'truongvoky', 'auduongphong'], desc: 'Quân Minh Giáo di chuyển nhanh hơn 20%. Trương Vô Kỵ phản đòn, Âu Dương Phong thả mây độc.' },
  { name: 'Lệ Xuân Viện', subtitle: 'Vi Tiểu Bảo giở trò', theme: 'castle', mod: 'swarm', deck: ['samurai', 'ninja', 'bomber', 'poisoner', 'healer', 'crossbow', 'chudu'], defenses: ['firepit'], desc: 'Lính lác ào ạt (mỗi lần 2 quân), bom nổ liên tục, hố lửa chắn lối. Chu Du làm chậm cả đội.' },
  { name: 'Thiếu Lâm Tự', subtitle: 'Kiều Phong tung chưởng rồng', theme: 'castle', deck: ['monk', 'shield', 'spear', 'healer', 'elephant', 'kieuphong', 'hocnui'], defenses: ['wall', 'spikewall'], desc: 'Võ tăng, voi chiến và tường gai chặn đường; Kiều Phong đẩy lùi cả đội hình của bạn.' },
  { name: 'Tuyệt Tình Cốc', subtitle: 'Hoa tuyệt tình ngàn độc', theme: 'plains', deck: ['archer', 'poisoner', 'taoist', 'monk', 'elephant', 'auduongphong', 'mangxa'], defenses: ['firepit', 'archertower'], desc: 'Độc dày đặc: độc sư, mây độc và hố lửa. Cần Y sư/trụ hồi máu và đánh nhanh.' },
  { name: 'Hắc Mộc Nhai', subtitle: 'Boss: Đông Phương Bất Bại', theme: 'night', bossId: 'dongphuongbatbai', deck: ['ninja', 'crossbow', 'poisoner', 'knight', 'monk', 'lenhhoxung', 'truongvoky', 'baoden'], desc: 'Màn Boss chỉ có 1 lane. Đông Phương Bất Bại xuất hiện khi trận gần kết thúc, lướt rất nhanh và né đòn.' },
];

// ───────────── Bản đồ 3: Đại Náo Thiên Cung (Phong Thần · Tây Du) ─────────────
const MAP3: Def[] = [
  { name: 'Hoa Quả Sơn', subtitle: 'Núi khỉ, thác nước', theme: 'bamboo', mod: 'quick', deck: ['berserker', 'archer', 'ninja', 'monk', 'spear', 'masieu', 'hocnui', 'lonrung', 'soihoang'], desc: 'Binh khỉ nhanh nhẹn; Mã Siêu phi ngựa xuyên đội hình.' },
  { name: 'Long Cung Đông Hải', subtitle: 'Long Vương giữ ngọc', theme: 'sea', deck: ['shield', 'crossbow', 'taoist', 'elephant', 'healer', 'chudu', 'mangxa'], defenses: ['frosttotem'], desc: 'Thủy quân bắn từ xa, trụ băng làm chậm đội của bạn; Chu Du tấu khúc làm chậm thêm.' },
  { name: 'Lưu Sa Hà', subtitle: 'Dòng sông cát chảy ngược', theme: 'stone', deck: ['shield', 'crossbow', 'trebuchet', 'poisoner', 'elephant', 'hoangtrung', 'tegiac'], defenses: ['catapult'], desc: 'Xạ thủ, máy ném đá và pháo thạch khống chế tầm xa; Hoàng Trung bắn xuyên giáp.' },
  { name: 'Ngũ Chỉ Sơn', subtitle: 'Đá đè Tôn Hành Giả', theme: 'desert', mod: 'armored', deck: ['elephant', 'berserker', 'trebuchet', 'monk', 'bomber', 'quachtinh', 'tegiac'], defenses: ['wall', 'spikewall'], desc: 'Quân đá giáp dày (+6 giáp), tường thành và tường gai. Quách Tĩnh ban khiên khí cho cả đội.' },
  { name: 'Bàn Đào Viên', subtitle: 'Tiên đào ngàn năm', theme: 'heaven', deck: ['spear', 'healer', 'taoist', 'shield', 'knight', 'taothao'], defenses: ['altar'], desc: 'Tế đàn hồi phục và Y sư kéo dài giao tranh; Tào Tháo tăng sức đội hình.' },
  { name: 'Nam Thiên Môn', subtitle: 'Thiên binh thiên tướng', theme: 'heaven', mod: 'armored', deck: ['spear', 'taoist', 'healer', 'shield', 'knight', 'tumayi', 'chudu'], defenses: ['wall', 'archertower'], desc: 'Thiên binh giáp thép (+6 giáp). Tư Mã Ý làm quân bạn đứng yên, Chu Du làm chậm cả đội.' },
  { name: 'Bàn Tơ Động', subtitle: 'Yêu nữ giăng tơ độc', theme: 'night', mod: 'swarm', deck: ['poisoner', 'ninja', 'bomber', 'berserker', 'taoist', 'auduongphong', 'taothao', 'mangxa'], defenses: ['spiketrap'], desc: 'Địch thả quân dồn dập (mỗi lần 2 quân). Mây độc, bẫy gai và Tào Tháo tăng sức cả đàn.' },
  { name: 'Thông Thiên Hà', subtitle: 'Dòng sông băng giá', theme: 'snow', deck: ['crossbow', 'poisoner', 'shield', 'monk', 'taoist', 'hoangtrung', 'tumayi', 'gauden', 'soihoang'], defenses: ['frosttotem', 'ballista'], desc: 'Trụ băng và nỏ thần khống chế tầm xa; Hoàng Trung xuyên giáp, Tư Mã Ý làm choáng.' },
  { name: 'Lăng Tiêu Bảo Điện', subtitle: 'Thiên đình hội tụ', theme: 'throne', deck: ['knight', 'elephant', 'trebuchet', 'taoist', 'healer', 'kieuphong', 'masieu', 'hocnui'], defenses: ['wall', 'archertower', 'ballista'], desc: 'Tuyến phòng thủ cuối cùng: tường thành, tháp cung, nỏ thần; Kiều Phong và Mã Siêu phản công.' },
  { name: 'Hỏa Diệm Sơn', subtitle: 'Boss: Ngưu Ma Vương', theme: 'volcano', bossId: 'nguumavuong', deck: ['bomber', 'berserker', 'elephant', 'trebuchet', 'taoist', 'poisoner', 'kieuphong', 'honglong'], desc: 'Màn Boss chỉ có 1 lane. Ngưu Ma Vương xuất hiện khi trận gần kết thúc và phun sóng lửa thiêu đốt.' },
];

// ───────────── Bản đồ 4: Thủy Hử Lương Sơn ─────────────
const MAP4: Def[] = [
  { name: 'Thập Tự Pha', subtitle: 'Quán rượu ven đường', theme: 'plains', deck: ['samurai', 'spear', 'archer', 'shield', 'ninja', 'knight', 'soihoang'], desc: 'Quán rượu bẫy khách: kỵ binh và ninja ập tới từ hai bên. Giữ hàng khiên ở mỗi lane.' },
  { name: 'Dã Trư Lâm', subtitle: 'Rừng heo rừng', theme: 'bamboo', mod: 'quick', deck: ['berserker', 'spear', 'crossbow', 'ninja', 'lonrung', 'baoden', 'truongphi'], desc: 'Quân nhanh nhẹn lao ra từ bụi rậm; Trương Phi trấn giữ lối vào rừng.' },
  { name: 'Giang Châu Pháp Trường', subtitle: 'Pháp trường chờ ngày hành quyết', theme: 'castle', deck: ['shield', 'crossbow', 'healer', 'knight', 'trebuchet', 'quanvu', 'trieuvan'], defenses: ['wall', 'archertower'], desc: 'Phòng tuyến thành quách với tường thành và tháp cung; nỏ thủ bắn từ xa, Quan Vũ và Triệu Vân xung trận.' },
  { name: 'Hoàng Nê Cương', subtitle: 'Gò đất vàng bụi mù', theme: 'desert', mod: 'swarm', deck: ['knight', 'samurai', 'poisoner', 'taoist', 'bomber', 'masieu', 'hoangtrung'], desc: 'Địch thả quân dồn dập (mỗi lần 2 quân), độc sư và tử sĩ gây hỗn loạn; Mã Siêu phi ngựa xuyên đội hình.' },
  { name: 'Cảnh Dương Cương', subtitle: 'Mãnh hổ chặn đường', theme: 'stone', deck: ['hocnui', 'gauden', 'berserker', 'archer', 'monk', 'duongqua', 'lonrung'], desc: 'Rừng núi đầy mãnh thú; Dương Quá xuất chưởng. Gần cuối trận một Đại Trùng khổng lồ nhảy ra từ hang.' },
  { name: 'Lương Sơn Thủy Bạc', subtitle: 'Thủy trại giữa đầm lầy', theme: 'sea', deck: ['crossbow', 'archer', 'shield', 'healer', 'taoist', 'chudu', 'giacatluong'], defenses: ['frosttotem', 'ballista'], desc: 'Thủy trại bắn từ xa: nỏ thủ, trụ băng, nỏ thần; Chu Du làm chậm, Gia Cát Lượng dội hỏa công.' },
  { name: 'Chúc Gia Trang', subtitle: 'Trang viên kiên cố', theme: 'castle', mod: 'armored', deck: ['shield', 'monk', 'spear', 'elephant', 'trebuchet', 'quachtinh', 'lubo'], defenses: ['wall', 'spikewall'], desc: 'Quân giáp dày (+6 giáp) sau tường thành và tường gai; Quách Tĩnh ban khiên khí, Lữ Bố càn quét.' },
  { name: 'Đông Xương Phủ', subtitle: 'Đột nhập trong đêm', theme: 'night', deck: ['ninja', 'poisoner', 'bomber', 'crossbow', 'healer', 'baoden', 'tumayi', 'auduongphong'], defenses: ['spiketrap'], desc: 'Bóng đêm che mắt: ninja, báo đen và bẫy gai; Tư Mã Ý làm quân bạn đứng yên, Âu Dương Phong thả mây độc.' },
  { name: 'Tụ Nghĩa Sảnh', subtitle: 'Anh hùng tụ họp', theme: 'throne', deck: ['knight', 'berserker', 'taoist', 'healer', 'elephant', 'taothao', 'kieuphong', 'duongtien'], defenses: ['wall', 'archertower', 'ballista'], desc: 'Tuyến cuối trước phủ Thái Úy: tường, tháp cung, nỏ thần; Tào Tháo tăng sức cả đàn, Kiều Phong và Dương Tiễn phản công.' },
  { name: 'Thái Úy Phủ', subtitle: 'Boss: Cao Cầu', theme: 'castle', bossId: 'caocau', deck: ['samurai', 'spear', 'shield', 'knight', 'crossbow', 'healer', 'trebuchet', 'lubo', 'quanvu', 'taothao'], desc: 'Màn Boss chỉ có 1 lane. Cao Cầu xuất hiện khi trận gần kết thúc: hạ lệnh tăng sức cả quân địch và đẩy lùi đội hình của bạn.' },
];

// ───────────── Bản đồ 5: Địa Phủ Hồi Hồn ─────────────
const MAP5: Def[] = [
  { name: 'Quỷ Môn Quan', subtitle: 'Cửa ải vào Âm Phủ', theme: 'night', deck: ['ninja', 'poisoner', 'crossbow', 'shield', 'baoden', 'tumayi'], desc: 'Ninja và báo đen lẩn trong sương đêm; Tư Mã Ý khiến quân bạn đứng yên. Nỏ thủ bắn từ xa.' },
  { name: 'Hoàng Tuyền Lộ', subtitle: 'Con đường vàng nhạt', theme: 'desert', mod: 'quick', deck: ['knight', 'spear', 'bomber', 'taoist', 'soihoang', 'masieu'], desc: 'Quân Âm phủ di chuyển nhanh hơn 20%; Mã Siêu phi ngựa xuyên đội hình, tử sĩ nổ liên tục.' },
  { name: 'Nại Hà Kiều', subtitle: 'Cây cầu bên dòng sông quên lãng', theme: 'sea', deck: ['crossbow', 'archer', 'shield', 'healer', 'mangxa', 'chudu', 'giacatluong'], defenses: ['frosttotem', 'spiketrap'], desc: 'Có đường nối lane trên cầu: quân hai bên rẽ qua lại. Trụ băng, bẫy gai và Gia Cát Lượng dội lửa.' },
  { name: 'Vong Xuyên Hà', subtitle: 'Dòng sông băng giá của linh hồn', theme: 'snow', mod: 'armored', deck: ['shield', 'monk', 'crossbow', 'poisoner', 'tegiac', 'quachtinh', 'gauden'], desc: 'Quân giáp dày (+6 giáp), rất khó phá. Dùng sát thương xuyên giáp, độc và sát thương lan.' },
  { name: 'Thập Điện Diêm Vương', subtitle: 'Đại điện của mười vị Diêm Vương', theme: 'throne', deck: ['berserker', 'bomber', 'elephant', 'taoist', 'poisoner', 'kieuphong', 'duongqua'], defenses: ['firepit'], desc: 'Hố lửa và tử sĩ chặn lối; gần cuối trận một Quỷ Sai khổng lồ trỗi dậy từ lòng đất.' },
  { name: 'Phong Đô Thành', subtitle: 'Kinh đô của Âm Tào', theme: 'castle', deck: ['knight', 'spear', 'shield', 'healer', 'trebuchet', 'trieuvan', 'lubo', 'taothao'], defenses: ['wall', 'archertower', 'drum'], desc: 'Thành quách kiên cố, trống chiến tăng sức đồng đội; Tào Tháo hạ lệnh, Lữ Bố và Triệu Vân xung trận.' },
  { name: 'Oan Hồn Cốc', subtitle: 'Thung lũng của những oan hồn', theme: 'night', mod: 'swarm', deck: ['poisoner', 'ninja', 'bomber', 'berserker', 'taoist', 'auduongphong', 'tumayi', 'baoden'], defenses: ['spiketrap', 'firepit'], desc: 'Oan hồn dồn dập (mỗi lần 2 quân), mây độc, bẫy gai và hố lửa. Cần Y sư và đánh nhanh.' },
  { name: 'Vọng Hương Đài', subtitle: 'Nơi linh hồn ngoái nhìn quê cũ', theme: 'heaven', deck: ['spear', 'healer', 'taoist', 'shield', 'knight', 'chudu', 'quachtinh', 'hoangtrung'], defenses: ['altar', 'archertower'], desc: 'Tế đàn hồi phục và Y sư kéo dài giao tranh; Hoàng Trung bắn xuyên giáp từ tháp cao.' },
  { name: 'Sâm La Điện', subtitle: 'Cửa cuối trước Diêm La', theme: 'stone', mod: 'armored', deck: ['knight', 'elephant', 'trebuchet', 'taoist', 'healer', 'kieuphong', 'masieu', 'hocnui', 'lenhhoxung'], defenses: ['wall', 'archertower', 'ballista'], desc: 'Tuyến phòng thủ cuối: quân giáp dày (+6), tường, tháp cung, nỏ thần; Kiều Phong và Lệnh Hồ Xung phản công.' },
  { name: 'Diêm La Điện', subtitle: 'Boss: Diêm La Vương', theme: 'volcano', bossId: 'diemla', deck: ['berserker', 'bomber', 'elephant', 'trebuchet', 'taoist', 'poisoner', 'kieuphong', 'honglong', 'tegiac'], desc: 'Màn Boss chỉ có 1 lane. Diêm La Vương xuất hiện khi trận gần kết thúc: thả mây độc và khiến quân bạn đứng yên.' },
];

const MAPS: Def[][] = [MAP1, MAP2, MAP3, MAP4, MAP5];

/** thời tiết từng trạm của mỗi bản đồ */
const WEATHER_PLAN: WeatherId[][] = [
  ['sunny', 'rain', 'thunder', 'sunny', 'fog', 'fireRain', 'sunny', 'thunder', 'rain', 'sunny'],
  ['rain', 'fog', 'sunny', 'fog', 'thunder', 'sunny', 'rain', 'sunny', 'fog', 'thunder'],
  ['sunny', 'thunder', 'fog', 'fireRain', 'sunny', 'thunder', 'fog', 'sunny', 'thunder', 'fireRain'],
  ['sunny', 'fog', 'rain', 'sunny', 'fog', 'rain', 'thunder', 'fog', 'thunder', 'rain'],
  ['fog', 'sunny', 'thunder', 'rain', 'fireRain', 'fog', 'thunder', 'sunny', 'fireRain', 'thunder'],
];
/** trạm có đường nối lane (id toàn cục → [lane a, lane b, vị trí x]): rải đều các bản đồ, không có ở trạm Boss/quái khổng lồ */
const BRIDGE_PLAN: Record<number, [number, number, number]> = {
  2: [0, 1, 520], 6: [1, 2, 480], 8: [0, 1, 500],
  11: [1, 2, 500], 13: [0, 1, 460], 16: [0, 1, 540], 18: [1, 2, 500],
  21: [0, 1, 500], 23: [1, 2, 460], 25: [1, 2, 540], 26: [0, 1, 500], 28: [0, 1, 480],
  31: [0, 1, 500], 33: [1, 2, 480], 36: [0, 1, 520], 37: [1, 2, 500], 38: [0, 1, 500],
  42: [1, 2, 500], 43: [0, 1, 480], 45: [0, 1, 520], 47: [1, 2, 500], 48: [0, 1, 500],
};
/** quái thú khổng lồ của mỗi bản đồ (xuất hiện ở trạm thứ 5) */
export const GIANT_STATION = 4;
const GIANTS = ['nguoida', 'cumang', 'culong', 'daitrung', 'quysai'];

/** hệ số sức mạnh / thu nhập địch theo bản đồ (bắt đầu, bước mỗi trạm) */
const POWER: [number, number][] = [[1.0, 0.027], [1.2, 0.024], [1.3, 0.017], [1.38, 0.012], [1.5, 0.012]];
const INCOME: [number, number][] = [[1.9, 0.17], [3.1, 0.1], [3.8, 0.08], [4.4, 0.05], [4.9, 0.05]];
const BOSS_POWER = [1.04, 1.04, 0.95, 1.0, 1.05];
/** hệ số vàng/giây của địch (giảm để địch ra quân chậm lại một chút) */
const ENEMY_INCOME_SCALE = 0.9;

/** tổng quân địch của trạm thường: tăng 1,5 quân/trạm ở 3 bản đồ đầu, các bản đồ sau tăng chậm hơn để trận không quá dài */
const troopBudget = (id: number) => (id < 30 ? 10 + 1.5 * id : 52 + 0.6 * (id - 30));

/** trạm có căn cứ phụ: mỗi bản đồ ngẫu nhiên (cố định) 3–4 trạm, mỗi lane một loại căn cứ */
const OUTPOST_PLANS = MAPS.map((_, ch) => outpostPlan(ch, STATIONS_PER_MAP));

export const STATIONS: Station[] = MAPS.flatMap((defs, ch) =>
  defs.map((d, j): Station => {
    const id = ch * STATIONS_PER_MAP + j;
    const outposts = OUTPOST_PLANS[ch].get(j) ?? [];
    const boss = !!d.bossId;
    const round5 = (n: number) => Math.round(n / 5) * 5;
    return {
      id, chapter: ch, name: d.name, subtitle: d.subtitle, boss, bossId: d.bossId,
      deck: d.deck, mod: d.mod, defenses: d.defenses, theme: d.theme, desc: d.desc,
      weather: WEATHER_PLAN[ch][j],
      giantId: j === GIANT_STATION ? GIANTS[ch] : undefined,
      outposts,
      bridges: BRIDGE_PLAN[id] ? [{ a: BRIDGE_PLAN[id][0], b: BRIDGE_PLAN[id][1], x: BRIDGE_PLAN[id][2] }] : [],
      power: Math.round((boss ? BOSS_POWER[ch] : POWER[ch][0] + POWER[ch][1] * j) * 100) / 100,
      income: Math.round((INCOME[ch][0] + INCOME[ch][1] * j) * ENEMY_INCOME_SCALE * 100) / 100,
      flagHp: Math.round((id < 30 ? 340 + 33 * id : 1297 + 14 * (id - 29)) * (boss ? 1.15 : 1) / 10) * 10,
      units: Math.round(boss ? troopBudget(id) * 0.62 + 2 : troopBudget(id)),
      reward: Math.round(((100 + 30 * id) * (boss ? 1.8 : 1)) / 10) * 10,
      // thời gian cho 3 sao tăng dần theo độ sâu: 100s (trạm đầu) → ~200s (trạm cuối); Boss cần thêm thời gian chờ Boss xuất hiện
      fastSec: round5((boss ? 140 + 2 * id : 100 + 3.5 * id) * (outposts.length ? OUTPOST_TIME_MUL : 1)),
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

/** số lane của trạm: màn Boss chỉ có 1 lane */
export const laneCountOf = (st: Station) => (st.boss ? 1 : 3);
