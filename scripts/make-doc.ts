// Tạo tài liệu mô tả game (Word): npm run doc  ->  docs/Tam-Lo-Cong-Thanh-Tai-Lieu.docx + .doc
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, Packer, PageBreak, PageNumber, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from 'docx';
import {
  UNIT_LIST, UNITS, DEFENSES, levelMul, upgradeCost, DECK_SIZE, DEFENSE_DECK_SIZE, MAX_DEFENSES_PER_LANE, MAX_GENERALS_IN_DECK, MAX_LEVEL,
  STARTER_DEFENSES, DECK_EXTRA_COSTS, DEF_EXTRA_COSTS, FLAG_MAX_LV, flagHpMul, flagUpgradeCost, type UnitDef,
} from '../src/data/units';
import { CHAPTERS, STATIONS, STATIONS_PER_MAP, stationLabel } from '../src/data/campaign';
import {
  BOSS_AT_HP, BOSS_AT_TIME, BOSS_FLAG_GUARD, BOUNTY_BOSS, BOUNTY_GENERAL, BOUNTY_TROOP, CAP_COSTS, CAP_INCOME_MUL, CAP_STEPS, LANE_COUNT,
  PLAYER_FLAG_HP, PLAYER_INCOME, PLAYER_START_GOLD,
} from '../src/game/sim';

const OUT = 'docs';
const ASSETS = join(OUT, 'assets');
const NAME = 'Tam-Lo-Cong-Thanh-Tai-Lieu';
mkdirSync(OUT, { recursive: true });

// ───────────────────────── mô hình nội dung trung gian ─────────────────────────
type Block =
  | { k: 'h1' | 'h2' | 'h3'; text: string }
  | { k: 'p'; text: string; bold?: boolean; italic?: boolean; center?: boolean; color?: string }
  | { k: 'ul'; items: string[] }
  | { k: 'ol'; items: string[] }
  | { k: 'table'; head: string[]; rows: string[][]; widths: number[] }
  | { k: 'img'; file: string; width: number; caption?: string }
  | { k: 'card'; img: string; title: string; sub: string; lines: [string, string][]; accent: string }
  | { k: 'note'; title: string; text: string }
  | { k: 'break' };

const B: Block[] = [];
const h1 = (text: string) => B.push({ k: 'h1', text });
const h2 = (text: string) => B.push({ k: 'h2', text });
const h3 = (text: string) => B.push({ k: 'h3', text });
const p = (text: string, o: Partial<Extract<Block, { k: 'p' }>> = {}) => B.push({ k: 'p', text, ...o });
const ul = (...items: string[]) => B.push({ k: 'ul', items });
const ol = (...items: string[]) => B.push({ k: 'ol', items });
const table = (head: string[], rows: string[][], widths: number[]) => B.push({ k: 'table', head, rows, widths });
const img = (file: string, width: number, caption?: string) => B.push({ k: 'img', file, width, caption });
const note = (title: string, text: string) => B.push({ k: 'note', title, text });

const f = (n: number, d = 1) => (Number.isInteger(n) ? String(n) : n.toFixed(d));
const dps = (u: UnitDef) => (u.dmg > 0 ? f(u.dmg / u.cd, 1) : '—');
const rangeText = (u: UnitDef) => (u.range > 70 ? `${u.range} (tầm xa)` : u.range === 0 ? '—' : `${u.range} (cận chiến)`);
const KIND: Record<UnitDef['kind'], string> = { troop: 'Lính', general: 'Tướng', boss: 'Boss', summon: 'Triệu hồi', defense: 'Đồ phòng thủ' };
const kindName = (u: UnitDef) => KIND[u.kind];
const THEME: Record<string, string> = {
  plains: 'Đồng bằng', bamboo: 'Rừng trúc', stone: 'Núi đá', castle: 'Thành lũy', throne: 'Hoàng thành', sea: 'Biển',
  snow: 'Tuyết sơn', desert: 'Sa mạc', heaven: 'Thiên đình', volcano: 'Núi lửa', night: 'Đêm tối',
};
const MOD: Record<string, string> = { armored: 'Giáp dày (+6 giáp)', quick: 'Quân nhanh (+20% tốc độ)', swarm: 'Dồn dập (2 quân/lần)' };

// ───────────────────────── dữ liệu mô tả bổ sung ─────────────────────────
const SKILL_DETAIL: Record<string, { effect: string; numbers: string; tip: string; counter: string }> = {
  quick: {
    effect: 'Đánh liên tục với nhịp cực nhanh (0,45 giây/đòn).',
    numbers: 'Sát thương 11/đòn ≈ 24 sát thương mỗi giây — cao nhất trong nhóm lính phổ thông so với giá tiền.',
    tip: 'Rẻ nhất trong nhóm lính chiến, dùng để lấp lane, bảo vệ cờ và ép máu địch.',
    counter: 'Dễ bị Cung thủ/Máy ném đá bào mòn từ xa; yếu trước Lính khiên (giáp 18 làm sát thương nhỏ gần như vô nghĩa).',
  },
  none: {
    effect: 'Bắn tên từ xa 190 đơn vị, đứng sau tuyến đầu.',
    numbers: 'Sát thương 11/đòn, mỗi 0,9 giây. Mỏng máu (60).',
    tip: 'Đặt phía sau Lính khiên/Samurai. Bắn được cả cờ địch từ xa.',
    counter: 'Kỵ sĩ, Ninja và Tử sĩ lao thẳng vào rất nhanh; Lính khiên giảm 50% sát thương mũi tên.',
  },
  antiCav: {
    effect: 'Giáo dài với tầm đâm 62; sát thương ×2,2 khi đánh Kỵ sĩ.',
    numbers: 'Bonus ×2,2 chỉ áp dụng lên đơn vị có thẻ "kỵ binh" (Kỵ sĩ).',
    tip: 'Khắc chế Kỵ sĩ: đặt Lính giáo ở lane đối phương hay dùng kỵ binh xông.',
    counter: 'Yếu máu (95) trước Samurai/Cuồng chiến; dễ bị nổ bởi Tử sĩ.',
  },
  shield: {
    effect: 'Thuẫn thủ: giảm 50% sát thương nhận từ đòn đánh tầm xa (tên, đá, ngân châm, phép).',
    numbers: 'Máu 320, giáp 18, tốc độ chậm (26). Sát thương rất thấp (6).',
    tip: 'Tuyến đầu lý tưởng để che chở Cung thủ / Máy ném đá phía sau.',
    counter: 'Tử sĩ (nổ lan), Cuồng chiến, Lữ Bố/Quan Vũ; sát thương xuyên giáp của Gia Cát Lượng.',
  },
  charge: {
    effect: 'Xung phong: đòn đầu tiên cộng thêm sát thương theo quãng đường đã chạy.',
    numbers: 'Hệ số = 1 + quãng đường/120, tối đa ×5 (≈ 80 sát thương ở cấp 1). Chỉ đòn đầu tiên (cả với cờ địch).',
    tip: 'Thả sớm, để kỵ sĩ chạy hết lane rồi mới va chạm: càng xa càng đau. Rất hiệu quả đập cờ khi lane trống.',
    counter: 'Lính giáo (×2,2), Lính khiên chặn đường, Y sư hồi máu.',
  },
  ninja: {
    effect: 'Ảnh thân: 30% né đòn đánh đơn mục tiêu; phá cờ gấp đôi sát thương.',
    numbers: 'Tốc độ chạy 80, máu 75, đánh 0,55 giây/đòn. Né KHÔNG áp dụng với sát thương lan (nổ, chưởng, hỏa công...).',
    tip: 'Đẩy lane khi địch đang dồn quân sang lane khác; mỗi nhát vào cờ gấp đôi.',
    counter: 'Sát thương lan (Máy ném đá, Tử sĩ, Quan Vũ, Dương Quá).',
  },
  berserk: {
    effect: 'Cuồng nộ: càng mất máu càng đánh đau.',
    numbers: 'Sát thương ×(1 + 1,2 × % máu đã mất): tối đa +120% khi gần chết.',
    tip: 'Dùng làm "đánh đổi": để địch tấn công trước rồi đáp trả cực mạnh.',
    counter: 'Hạ nhanh bằng sát thương cao đồng loạt hoặc kiting bằng Cung thủ.',
  },
  heal: {
    effect: 'Diệu thủ: không đánh được, mỗi 2 giây hồi 15 máu cho mọi đồng đội trong bán kính 120.',
    numbers: 'Hồi 15 × hệ số cấp độ. Tự theo sau đồng đội, giữ cách tuyến đầu ~55.',
    tip: 'Đi kèm Lính khiên/Tướng để kéo dài giao tranh; nhiều Y sư xếp chồng hiệu quả hồi.',
    counter: 'Mỏng manh (80 máu): Ninja, Cung thủ, phép Gia Cát Lượng.',
  },
  bomb: {
    effect: 'Tự bạo: lao vào địch, nổ lan rồi chết.',
    numbers: 'Nổ 90 sát thương bán kính 62 (×3 khi trúng cờ, tức 270).',
    tip: 'Rẻ nhất (9 vàng). Nổ vào đám đông hoặc đập cờ cuối trận để kết thúc lane.',
    counter: 'Hạ trước khi chạm (Cung thủ). Nổ mà không ai ở gần thì lãng phí.',
  },
  siege: {
    effect: 'Công thành: ném đá cực xa (300), sát thương lan bán kính 55; đập cờ ×2,5.',
    numbers: 'Sát thương 38/đòn mỗi 3 giây, tốc độ chậm (16), máu 100.',
    tip: 'Đặt sau tuyến phòng thủ ổn định, dọn đám lính tụ tập và phá cờ từ xa.',
    counter: 'Rất chậm và chỉ 100 máu: Kỵ sĩ/Ninja/Tử sĩ áp sát nhanh khi không có lính bảo vệ phía trước.',
  },
  palm: {
    effect: 'Hãn Thiên Chưởng: cứ 10 giây tung chưởng vàng gây sát thương diện rộng phía trước.',
    numbers: '170 sát thương (× hệ số cấp), bán kính 95 tâm cách 95 phía trước (phủ ≈ 190). Chỉ phát khi có địch/cờ địch trong tầm 170.',
    tip: 'Đẩy cùng lính khiên; cực mạnh khi địch dồn thành chùm. Có thể trúng cờ.',
    counter: 'Ninja né không được (sát thương lan); nên phân tán quân hoặc dùng hồi máu.',
  },
  pairHeal: {
    effect: 'Ngọc Nữ Tâm Kinh: đi cùng Dương Quá thì mỗi 5 giây hồi máu cho cả hai.',
    numbers: 'Hồi 50 × hệ số cấp cho mỗi người nếu Dương Quá ở cùng lane trong 170. Ngân châm tầm 130.',
    tip: 'Thả hai người vào CÙNG một lane. Cặp đôi này bền hơn nhiều so với từng người riêng lẻ.',
    counter: 'Hạ Tiểu Long Nữ trước (máu 400, giáp 5) hoặc tách hai người khác lane.',
  },
  ironWill: {
    effect: 'Cương Thể: mỗi lần hạ gục đối thủ tăng giáp vĩnh viễn trong trận.',
    numbers: 'Hạ 1 lính: +2 giáp. Hạ 1 tướng/boss: +5 giáp. Không giới hạn.',
    tip: 'Càng giao tranh dài càng cứng; hào quang thép quanh chân thể hiện mức giáp tích lũy.',
    counter: 'Sát thương xuyên giáp (Gia Cát Lượng) hoặc dồn nhiều đối thủ nhỏ để hạ sớm.',
  },
  revive: {
    effect: 'Thất Tiến Thất Xuất: hồi sinh một lần; hạ địch hồi máu.',
    numbers: 'Chết lần đầu: hồi sinh 50% máu tối đa, bất khả xâm phạm 1,5 giây. Mỗi lần hạ địch: hồi 12% máu tối đa. Tốc độ 90.',
    tip: 'Kỵ binh tướng chạy rất nhanh, dùng để cắt cờ hoặc đột kích lane yếu.',
    counter: 'Phải hạ hai lần: dồn sát thương lúc anh ta đang bất khả xâm phạm là lãng phí.',
  },
  sweep: {
    effect: 'Thanh Long Trảm: cứ đòn thứ 3 chém quét diện rộng.',
    numbers: 'Sát thương ×1,8, bán kính 95 (tâm cách 55 phía trước), trúng cả cờ.',
    tip: 'Ưu thế khi đứng giữa đám lính địch; phối hợp Lính khiên để chặn cho đủ 3 đòn.',
    counter: 'Giữ khoảng cách bằng tầm xa; Ninja né các đòn đơn mục tiêu nhưng không né đòn quét.',
  },
  fireAttack: {
    effect: 'Hỏa Thiêu Chiến Thuyền: mỗi 8 giây dội mưa tên lửa lên chỗ địch tụ đông nhất trong lane.',
    numbers: '130 sát thương (× cấp), bán kính 90, XUYÊN GIÁP (bỏ qua toàn bộ giáp); không đánh vào cờ. Tầm đánh thường 230.',
    tip: 'Khắc tinh của Lính khiên, Trương Phi, Dương Quá nhờ xuyên giáp. Thả sau lưng tuyến đầu.',
    counter: 'Máu thấp (320): Ninja/Kỵ sĩ xông vào hạ nhanh.',
  },
  splash: {
    effect: 'Vô Song: mỗi nhát kích gây thêm sát thương lan.',
    numbers: '60% sát thương gây lan lên mọi địch trong bán kính 60 quanh mục tiêu. Máu 900, giáp 14, sát thương 42/nhịp 1,0s, tốc độ 56.',
    tip: 'Tướng mạnh nhất, giá 75 vàng (cao nhất). Giữ lại cho lane then chốt hoặc để kết liễu boss.',
    counter: 'Hạ bằng Gia Cát Lượng (xuyên giáp) + Quan Vũ + Triệu Vân; kéo dài bằng Lính khiên.',
  },
  tyrant: {
    effect: 'Bạo Chúa: triệu hồi lính và nổi điên khi sắp thua.',
    numbers: 'Mỗi 9 giây triệu hồi 2 Samurai (lần đầu sau 6 giây). Dưới 50% máu: sát thương ×1,4, tốc độ ×1,4. Máu 3.150, giáp 16, tốc độ chậm (20).',
    tip: 'Hạ gục Đổng Trác là THẮNG NGAY toàn trận; khi hắn còn sống cờ địch chỉ nhận 30% sát thương. Dồn tướng xuyên giáp và tường chặn để câu giờ.',
    counter: '—',
  },
};

const UNIT_STORY: Record<string, string> = {
  samurai: 'Kiếm sĩ cơ bản, hàng đầu của mọi đội quân.',
  archer: 'Xạ thủ lặng lẽ yểm trợ từ phía sau.',
  spear: 'Lính giáo đội nón lá, khắc tinh của kỵ binh.',
  shield: 'Bức tường thép di động.',
  knight: 'Kỵ binh xung phong, đòn mở màn có thể đổi cục diện.',
  ninja: 'Sát thủ bóng đêm, đến nhanh đi nhanh.',
  berserker: 'Chiến binh man rợ, càng đau càng điên.',
  healer: 'Y sư theo quân, hơi ấm giữa chiến trường.',
  bomber: 'Tử sĩ ôm bom, sẵn sàng đổi mạng lấy cờ.',
  trebuchet: 'Máy ném đá công thành, hủy diệt từ xa.',
  duongqua: 'Đại hiệp "Thần Điêu Đại Hiệp", một tay kiếm, chưởng pháp chấn động trời đất.',
  tieulongnu: 'Cổ Mộ Phái, thanh khiết như tuyết, ngân châm vô ảnh. Cặp bài trùng của Dương Quá.',
  truongphi: 'Mãnh tướng Thục Hán, "Trượng Bát Xà Mâu", thét một tiếng quân địch run sợ.',
  trieuvan: 'Thường Sơn Triệu Tử Long, bảy lần ra vào trận địch, không ai cản nổi.',
  quanvu: 'Võ Thánh Quan Vân Trường, Thanh Long Yển Nguyệt Đao uy chấn thiên hạ.',
  giacatluong: 'Khổng Minh Gia Cát Lượng, phe phẩy quạt lông, dùng hỏa công định đoạt trận.',
  lubo: 'Ôn Hầu Lữ Phụng Tiên, "Nhân trung Lữ Bố, mã trung Xích Thố", vô song thiên hạ.',
  dongtrac: 'Bạo Chúa Đổng Trác, kẻ chiếm giữ Hoàng Thành. Boss cuối của chương 1.',
};

const STORY2: Record<string, string> = {
  monk: 'Võ tăng Thiếu Lâm, mình đồng da sắt với Kim Chung Tráo.',
  taoist: 'Đạo sĩ Võ Đang, tay vẽ phù, gọi sấm xuống chiến trường.',
  crossbow: 'Xạ thủ nỏ liên châu, mũi tên xuyên cả giáp dày.',
  elephant: 'Voi chiến man tộc, bước chân rung chuyển mặt đất.',
  poisoner: 'Độc sư Ngũ Độc giáo, ném bình độc từ xa.',
  tonngokhong: 'Tề Thiên Đại Thánh Tôn Ngộ Không: bảy mươi hai phép biến hóa, nhổ lông hóa phân thân.',
  duongtien: 'Nhị Lang Thần Dương Tiễn, mắt thần thứ ba, cùng Hao Thiên Khuyển trấn giữ thiên đình.',
  taothao: 'Ngụy Vương Tào Mạnh Đức, "thà ta phụ người", chỉ huy đại quân cả phương Bắc.',
  chudu: 'Chu Công Cẩn tuấn tú, tấu khúc đàn khiến cả Xích Bích phải ngoái nhìn.',
  masieu: 'Cẩm Mã Siêu, "Mã Siêu mặt ngọc", phi ngựa Tây Lương xé nát trận địch.',
  hoangtrung: 'Lão tướng Hoàng Hán Thăng, già mà vẫn trăm bước xuyên dương.',
  tumayi: 'Tư Mã Ý, mưu sĩ lạnh lùng, đối thủ cả đời của Khổng Minh.',
  quachtinh: 'Quách Tĩnh, "vị đại hiệp vì nước vì dân", nội công thâm hậu của Xạ Điêu Anh Hùng.',
  kieuphong: 'Kiều Phong (Tiêu Phong) Cái Bang bang chủ, Hàng Long Thập Bát Chưởng uy chấn giang hồ.',
  lenhhoxung: 'Lệnh Hồ Xung, kiếm khách phóng khoáng, tinh thông Độc Cô Cửu Kiếm.',
  truongvoky: 'Trương Vô Kỵ, giáo chủ Minh Giáo với Cửu Dương Thần Công, Càn Khôn Đại Na Di.',
  auduongphong: 'Âu Dương Phong, "Tây Độc", Cáp Mô Công khiến thiên hạ khiếp sợ.',
  dongphuongbatbai: 'Đông Phương Bất Bại, Nhật Nguyệt Thần Giáo giáo chủ, thân pháp quỷ mị. Boss cuối của chương 2.',
  nguumavuong: 'Ngưu Ma Vương, cha của Hồng Hài Nhi, đại ma vương Hỏa Diệm Sơn. Boss cuối của chương 3.',
  haothienkhuyen: 'Hao Thiên Khuyển, chó thần trung thành của Dương Tiễn.',
  khicon: 'Khỉ con từ lông của Ngộ Không, nhanh nhẹn nhưng chỉ tồn tại ít giây.',
  wall: 'Tường đá chắn ngang lane.',
  spikewall: 'Tường rào cắm đầy chông nhọn.',
  archertower: 'Tháp canh có cung thủ gác.',
  ballista: 'Nỏ thần khổng lồ bắn mũi tên như cây thương.',
  catapult: 'Bệ pháo thạch cố định, ném đá tầm xa.',
  spiketrap: 'Bẫy gai giấu dưới đất, bật lên khi có địch bước tới.',
  firepit: 'Hố lửa cháy rực chặn lối đi.',
  drum: 'Trống trận cổ vũ tinh thần binh sĩ.',
  altar: 'Tế đàn ban phúc, hồi sức cho đồng đội.',
  frosttotem: 'Trụ băng tỏa hàn khí làm chậm đối thủ.',
};

/** hướng dẫn cho các đơn vị mới: thông số chi tiết, cách dùng, điểm yếu */
const NEW_INFO: Record<string, { numbers: string; tip: string; weak?: string }> = {
  monk: { numbers: 'Khí giáp hấp thụ 80 sát thương (× cấp), vỡ thì dựng lại sau 8 giây. Máu 260, giáp 12.', tip: 'Tuyến đầu rẻ và bền, tốt nhất khi địch gây sát thương nhỏ lẻ.', weak: 'Sát thương lớn một lần (chưởng, nổ) làm vỡ khiên nhanh; đánh yếu (12).' },
  taoist: { numbers: 'Sấm sét 20 sát thương mỗi 1,8 giây, lan bán kính 45, tầm 170.', tip: 'Đứng sau tuyến đầu để dọn đám lính tụ tập.', weak: 'Máu thấp (85).' },
  crossbow: { numbers: 'Tầm 250, 26 sát thương mỗi 1,7 giây, xuyên 50% giáp.', tip: 'Khắc tinh của Lính khiên, Voi chiến và tướng giáp dày.', weak: 'Máu 80, bị áp sát là chết.' },
  elephant: { numbers: 'Máu 720, giáp 14, sát thương lan bán kính 55, tốc độ chậm (24).', tip: 'Xe tăng đầu lane; thả sớm để kịp tới tuyến giữa, che cho xạ thủ phía sau.', weak: 'Chậm; dễ bị độc và sát thương xuyên giáp bào mòn.' },
  poisoner: { numbers: 'Mỗi đòn gây độc 9 máu/giây trong 5 giây (xuyên giáp), tầm 130.', tip: 'Rất hiệu quả trước đối thủ máu dày, tướng và boss; nhiều Độc sư cộng độc chồng lên nhau.', weak: 'Máu 70, sát thương đòn thường rất thấp.' },
  tonngokhong: { numbers: 'Kỹ năng 1: cứ 5 giây (hồi chiêu chỉ đếm khi đã hết hình dạng, lần đầu sau 5 giây) biến thành một trong 18 tướng còn lại (ngẫu nhiên) và lập tức dùng kỹ năng của tướng đó; giữ hình 8 giây (vẫn dùng chỉ số của Ngộ Không, kỹ năng gốc vẫn hoạt động). Kỹ năng 2: cứ 20 giây (lần đầu sau 10 giây) thổi lông hóa 2 Khỉ Con có 30% máu, sát thương, giáp của Ngộ Không, tồn tại 5 giây.', tip: 'Đặt vào lane đông địch để các kỹ năng diện rộng được dịp phát huy; khỉ con vừa chặn đường vừa gây sát thương phụ.', weak: 'Kỹ năng 1 ngẫu nhiên, không chọn được tướng biến thành.' },
  duongtien: { numbers: 'Cứ 14 giây (lần đầu sau 8 giây): triệu hồi Hao Thiên Khuyển (50% máu, sát thương, giáp của Dương Tiễn; tồn tại 15 giây, chỉ giữ một con) và tự tăng 50% sát thương, tốc độ, giáp, tốc độ đánh trong 5 giây.', tip: 'Càng sống lâu càng có lợi vì chu kỳ kỹ năng lặp lại; đi cùng Y sư/Tế đàn để trụ.', weak: 'Chỉ kích hoạt khi có địch trong tầm 500 hoặc gần cờ.' },
  taothao: { numbers: 'Cứ 11 giây: mọi quân ta cùng lane +25% sát thương và +15% tốc độ đánh trong 5 giây.', tip: 'Đi kèm đội quân đông (Samurai, Tử sĩ, Voi chiến) để buff có giá trị.', weak: 'Gần như vô dụng nếu lane ít quân.' },
  chudu: { numbers: 'Cứ 9 giây: vùng quanh mục tiêu bị chậm 45% trong 4 giây và nhận 55 sát thương. Tầm 200.', tip: 'Làm chậm Kỵ sĩ/Ninja, tạo thời gian cho Cung/Nỏ bắn.', weak: 'Máu 380, giáp thấp.' },
  masieu: { numbers: 'Cứ 8 giây phi nước đại xuyên đội hình địch (tối đa 260 đơn vị), gây 110 sát thương mọi địch trên đường. Tốc độ 80.', tip: 'Phá đội hình xếp thành hàng dài; hợp khi lane có nhiều lính cùng tụ.', weak: 'Giáp 8, bị vây dễ chết.' },
  hoangtrung: { numbers: 'Tầm 280 (xa nhất trong tướng). Mỗi mũi tên thứ 3 gây ×3 sát thương và xuyên 60% giáp.', tip: 'Đứng cuối lane, hạ tướng và boss giáp dày.', weak: 'Máu 420, bị áp sát là yếu.' },
  tumayi: { numbers: 'Cứ 11 giây: 3 địch gần nhất (trong 280 phía trước) hoang mang đứng yên 2 giây.', tip: 'Đóng băng kẻ mạnh nhất để đồng đội tập trung hạ; cắt đường của kỵ binh.', weak: 'Sát thương thấp (18), máu 360.' },
  quachtinh: { numbers: 'Cứ 12 giây: khiên khí 60 (× cấp) cho mọi đồng đội trong bán kính 170, kể cả bản thân. Máu 760, giáp 14.', tip: 'Đội cận chiến đông nhận lợi lớn nhất; chặn các đợt sát thương diện rộng.', weak: 'Sát thương trung bình.' },
  kieuphong: { numbers: 'Cứ 9 giây: chưởng rồng 140 sát thương diện rộng phía trước và đẩy lùi địch 90 đơn vị (kể cả khi đang đập cờ).', tip: 'Đẩy lùi cả đám địch đang đập cờ nhà; phối hợp xạ thủ tầm xa.', weak: 'Đắt (70 vàng).' },
  lenhhoxung: { numbers: 'Mỗi đòn xuyên 50% giáp, 20% chí mạng ×2,5; nhịp đánh 0,65 giây.', tip: 'Đối trọng với mọi đội giáp dày, boss giáp cao.', weak: 'Máu 480.' },
  truongvoky: { numbers: 'Phản lại 30% sát thương nhận từ đối thủ cận chiến trong 90 đơn vị.', tip: 'Đứng giữa tuyến đầu địch cận chiến, càng bị đánh càng mạnh.', weak: 'Không phản được đòn tầm xa.' },
  auduongphong: { numbers: 'Cứ 9 giây: đám mây độc lên cụm địch, 30 sát thương rồi 12 máu/giây trong 6 giây (xuyên giáp). Tầm 150.', tip: 'Rất hiệu quả trước Voi chiến, tướng và boss.', weak: 'Máu 460, giáp 6.' },
  dongphuongbatbai: { numbers: 'Máu 3.250, né 25% đòn đơn mục tiêu; mỗi 7 giây lướt xuyên đội hình gây 90 sát thương mọi kẻ trên đường. Tốc độ 46, nhịp đánh 0,7 giây.', tip: 'Dùng sát thương lan (không bị né) và tướng làm chậm/choáng (Chu Du, Tư Mã Ý).', weak: 'Máu thấp hơn Ngưu Ma Vương.' },
  nguumavuong: { numbers: 'Máu 3.450, giáp 14, tốc độ chậm (22). Mỗi 10 giây phun sóng lửa 85 sát thương diện rộng + thiêu 10 máu/giây trong 4 giây; dưới 50% máu sát thương +30%.', tip: 'Phân tán đội hình, có Y sư/Tế đàn, dùng xuyên giáp (Nỏ, Hoàng Trung, Lệnh Hồ Xung).', weak: 'Rất chậm; có thể bị kéo dài bằng tường/chặn đường.' },
  wall: { numbers: 'Máu 900, giáp 20, không tấn công. Địch buộc phải phá tường mới đi tiếp.', tip: 'Đặt phía trước Cung/Nỏ/Tháp để câu giờ.', weak: 'Không gây sát thương.' },
  spikewall: { numbers: 'Máu 480, mỗi 1,2 giây gây 16 sát thương (xuyên 50% giáp) lên mọi địch trong 70 đơn vị.', tip: 'Chắn đường và bào mòn địch đang đập tường; mạnh nhất ở lane địch dồn đông.', weak: 'Máu thấp hơn Tường đá.' },
  archertower: { numbers: 'Máu 360, bắn 14 sát thương mỗi giây vào địch gần nhất trong tầm 260.', tip: 'Đặt sau tường; có sẵn từ đầu game.', weak: 'Sát thương thấp, ưu tiên bảo vệ bằng tường.' },
  ballista: { numbers: 'Tầm 380 (xa nhất), 60 sát thương mỗi 3 giây, xuyên 40% giáp.', tip: 'Hạ mục tiêu giáp cao từ xa (voi, tướng, boss).', weak: 'Bắn chậm, mục tiêu đơn.' },
  catapult: { numbers: 'Mỗi 3,2 giây ném đá 38 sát thương lan bán kính 55, tầm 300.', tip: 'Dọn đám lính tụ tập trước tường.', weak: 'Sát thương thấp lên mục tiêu giáp dày.' },
  spiketrap: { numbers: 'Ẩn dưới đất. Khi địch bước tới: 120 sát thương lan (bán kính 70) + choáng 1,5 giây rồi biến mất (dùng một lần).', tip: 'Đặt ở nơi địch phải đi qua; bẫy rẻ nhất (12 vàng).', weak: 'Dùng một lần, địch tầm xa có thể bắn từ xa.' },
  firepit: { numbers: 'Cháy 14 giây; địch đi qua bán kính 70 bị thiêu 14 sát thương/giây (xuyên giáp). Không chặn đường.', tip: 'Đặt ngay trước tường để địch đứng đập tường trong lửa.', weak: 'Chỉ tồn tại 14 giây.' },
  drum: { numbers: 'Đồng đội trong bán kính 200 được +10% sát thương và +20% tốc độ đánh.', tip: 'Đặt giữa lane nơi quân ta giao tranh.', weak: 'Không tự tấn công.' },
  altar: { numbers: 'Mỗi 2 giây hồi 14 máu cho mọi đồng đội trong bán kính 160.', tip: 'Kéo dài giao tranh cho đội cận chiến, chống chịu độc.', weak: 'Hồi ít, dễ bị phá.' },
  frosttotem: { numbers: 'Mỗi 4 giây: địch trong bán kính 150 bị chậm 45% trong 3 giây và nhận 10 sát thương.', tip: 'Chậm kỵ binh/quân nhanh để xạ thủ có thời gian bắn.', weak: 'Sát thương thấp.' },
};

// ───────────────────────── nội dung tài liệu ─────────────────────────
const troops = UNIT_LIST.filter((x) => x.kind === 'troop');
const generals = UNIT_LIST.filter((x) => x.kind === 'general');
const bosses = UNIT_LIST.filter((x) => x.kind === 'boss');
const summons = UNIT_LIST.filter((x) => x.kind === 'summon');
const stationsOf = (ch: number) => STATIONS.filter((s) => s.chapter === ch);

function build() {
  B.push({ k: 'p', text: 'TAM LỘ CÔNG THÀNH', bold: true, center: true, color: '7A3E12' });
  B.push({ k: 'p', text: 'Three Lanes Siege', italic: true, center: true });
  B.push({ k: 'p', text: 'Tài liệu mô tả game, cách chơi, nhân vật, chiêu thức và trang quản trị', center: true, bold: true });
  B.push({ k: 'p', text: 'Game chiến thuật 2D chạy trên trình duyệt (laptop & điện thoại)  ·  Phiên bản 2.1  ·  08/10/2026', center: true, italic: true });
  img('shot-map.png', 560, 'Bản đồ chiến dịch: mỗi bản đồ có 10 trạm nối nhau bằng con đường quanh co, trạm cuối là Boss');
  B.push({ k: 'break' });

  h1('Mục lục');
  ol(
    'Tổng quan trò chơi',
    'Bắt đầu nhanh',
    'Cách chơi chi tiết (vàng, nâng cấp giới hạn vàng, vàng thưởng, màn Boss)',
    'Chiến dịch: 3 bản đồ, 30 trạm',
    'Binh đoàn: bộ bài, mở khóa, nâng cấp',
    `Danh sách lính (${troops.length} loại)`,
    `Danh sách tướng (${generals.length} vị)`,
    `Đồ phòng thủ (${DEFENSES.length} loại)`,
    `Boss (${bosses.length}) và quân triệu hồi`,
    'Tổng hợp chiêu thức và hiệu ứng',
    'Chiến thuật, khắc chế và mẹo',
    'Đồ họa, hoạt ảnh và đa ngôn ngữ',
    'Trang quản trị (/admin) và hệ thống thông báo',
    'Thông tin kỹ thuật & triển khai',
    'Phụ lục: bảng chỉ số tổng hợp, thuật ngữ',
  );

  // 1
  h1('1. Tổng quan trò chơi');
  p(`Tam Lộ Công Thành là game chiến thuật công thành 2D chạy ngay trên trình duyệt web. Chiến dịch gồm ${CHAPTERS.length} bản đồ, mỗi bản đồ ${STATIONS_PER_MAP} trạm (trạm thứ ${STATIONS_PER_MAP} là Boss), tổng cộng ${STATIONS.length} trạm. Các trạm thường diễn ra song song trên ba làn đường (lane) độc lập: người chơi kéo thả lính, tướng và đồ phòng thủ vào lane, phá cờ của đối phương và ai ăn được 2/3 lane sẽ thắng. Trạm Boss chỉ có MỘT lane và Boss xuất hiện gần cuối trận.`);
  h3('Điểm nổi bật');
  ul(
    `${STATIONS.length} trạm trên ${CHAPTERS.length} bản đồ (Tam Quốc · Kim Dung · Tây Du/Phong Thần) với 11 loại địa hình khác nhau; phải hoàn thành đủ ${STATIONS_PER_MAP} trạm của bản đồ trước mới mở bản đồ kế tiếp, nhưng được XEM TRƯỚC mọi trạm (trạm đang khóa chưa chơi được).`,
    `${troops.length} loại lính, ${generals.length} vị tướng (Tam Quốc, Kim Dung, Tây Du) và ${DEFENSES.length} loại đồ phòng thủ (tường, tường gai, tháp cung, nỏ thần, pháo đá, bẫy, hố lửa, trống trận, tế đàn, trụ băng).`,
    `${bosses.length} Boss: Đổng Trác, Đông Phương Bất Bại, Ngưu Ma Vương; mỗi trạm Boss chỉ có 1 lane, Boss xuất hiện gần cuối trận và rất trâu.`,
    'Số quân địch của mỗi trạm là cố định và tăng dần theo độ sâu của trạm; hạ quân địch được thưởng vàng; có thể nâng cấp giới hạn vàng để thả được nhiều quân hơn.',
    'Hệ thống binh đoàn: mở khóa thẻ mới, nâng cấp tối đa 5 cấp, chọn bộ bài 6 thẻ (tối đa 2 tướng) và bộ đồ phòng thủ 3 món.',
    'Chấm 1–3 sao cho từng trạm, khuyến khích đánh lại để hoàn hảo.',
    'Đồ họa 2D vẽ hoàn toàn bằng code (PixiJS): nhân vật cel-shading, chiến trường liền mạch, bản đồ chiến dịch minh họa, hiệu ứng kỹ năng riêng cho từng chiêu.',
    'Mỗi tài khoản một game riêng (Firebase Auth + Firestore); chơi được trên laptop và điện thoại (tối ưu iPhone 15); hỗ trợ tiếng Việt / tiếng Anh.',
    'Trang quản trị /admin: xem toàn bộ người chơi, chỉnh vàng/tiến trình, khóa tài khoản, gửi thông báo cho tất cả hoặc từng người.',
  );
  table(
    ['Thông tin', 'Chi tiết'],
    [
      ['Thể loại', 'Chiến thuật công thành thời gian thực, đa làn đường (lane-based), kéo thả quân'],
      ['Nền tảng', 'Web (trình duyệt); bố cục thích ứng laptop và điện thoại'],
      ['Số lane', `${LANE_COUNT} lane mỗi trận thường; 1 lane ở trạm Boss`],
      ['Điều kiện thắng', 'Phá cờ đối phương ở 2/3 lane; trạm Boss: hạ gục Boss'],
      ['Nội dung', `${STATIONS.length} trạm (${CHAPTERS.length} bản đồ), ${troops.length} lính, ${generals.length} tướng, ${DEFENSES.length} đồ phòng thủ, ${bosses.length} boss`],
      ['Ngôn ngữ', 'Tiếng Việt, English (đổi trong Cài đặt)'],
      ['Lưu trữ', 'Firebase (tài khoản và tiến trình trên cloud) hoặc chế độ offline trong trình duyệt'],
    ],
    [2200, 7100],
  );
  img('shot-battle.png', 560, 'Màn hình chiến trận: 3 lane, tháp canh có cờ, thẻ lính (xanh) – đồ phòng thủ (nâu) – tướng (đỏ-vàng) ở dưới');
  B.push({ k: 'break' });

  // 2
  h1('2. Bắt đầu nhanh');
  ol(
    'Mở game, chọn ngôn ngữ (VI/EN) ở góc phải trên cùng.',
    'Đăng ký: nhập tên đăng nhập (chữ không dấu, số, . _ -; tối thiểu 3 ký tự — không cần email; tên "admin" được dành riêng) và mật khẩu từ 6 ký tự, hoặc đăng nhập nếu đã có tài khoản.',
    'Mỗi tài khoản có tiến trình riêng: bắt đầu với 150 xu, 4 lính cơ bản (Samurai, Cung thủ, Lính giáo, Lính khiên), tướng Dương Quá và 2 đồ phòng thủ (Tường đá, Tháp cung).',
    'Ở tab Chiến dịch, chọn trạm đầu tiên rồi bấm "Ra trận".',
    'Trong trận: kéo thẻ vào lane để triển khai quân. Thắng trận để nhận xu, sao và mở khóa trạm tiếp theo.',
    'Ở tab Binh đoàn, dùng xu mở khóa/nâng cấp thẻ và sắp xếp bộ bài, bộ đồ phòng thủ trước khi đánh trạm khó hơn.',
    'Biểu tượng chuông 🔔 ở góc trên chứa thông báo từ quản trị viên (nếu có sẽ hiện số thông báo chưa đọc).',
  );
  img('shot-login.png', 460, 'Màn hình đăng nhập / đăng ký');
  note('Chế độ offline', 'Nếu chưa cấu hình Firebase, game tự chạy chế độ offline: tài khoản và tiến trình lưu trong trình duyệt hiện tại (không đồng bộ giữa thiết bị).');
  B.push({ k: 'break' });

  // 3
  h1('3. Cách chơi chi tiết');
  h2('3.1. Mục tiêu một trận');
  p('Mỗi lane có hai lá cờ (tháp canh): cờ của bạn ở bên trái và cờ của địch ở bên phải. Quân của bạn đi từ cờ nhà sang cờ địch. Bên nào phá hủy cờ đối phương trước thì thắng lane đó. Khi một bên thắng đủ 2 lane, trận kết thúc.');
  ul(
    'Lane đã có người thắng bị đóng: quân còn lại trong lane biến mất và không thể thả thêm quân vào lane đó.',
    `Cờ của bạn có ${PLAYER_FLAG_HP} máu (trạm Boss chỉ có 1 lane nên cờ nhà bền hơn: ${Math.round(PLAYER_FLAG_HP * 1.8)} máu); cờ địch có ${STATIONS[0].flagHp}–${STATIONS[STATIONS.length - 1].flagHp} máu tùy trạm.`,
    'Thanh máu cờ hiển thị dạng "hiện tại/tối đa" ngay dưới mỗi tháp canh.',
    'Góc trên-phải có bộ đếm "quân địch còn lại" (gồm quân chưa ra và quân đang sống). Mỗi trạm có tổng số quân địch cố định (xem mục 4); địch ngừng thả quân khi hết số lượng này.',
  );
  h2('3.2. Giao diện trong trận');
  table(
    ['Vị trí', 'Thành phần', 'Ý nghĩa'],
    [
      ['Trên-trái', 'Chân dung chỉ huy (bạn)', 'Tên, cấp độ (tính theo số trận thắng), nút Tạm dừng'],
      ['Trên-giữa', 'Bảng "Trạm m-n"', 'Đồng hồ trận đấu và các thanh trạng thái lane (xanh = bạn thắng, đỏ = địch thắng)'],
      ['Trên-phải', 'Chân dung chỉ huy địch', 'Tên trạm, cấp độ địch, số quân địch còn lại; bên dưới là nút tốc độ ×1 · ×1,5 · ×2 · ×2,5 · ×3'],
      ['Giữa', 'Chiến trường', 'Kéo thả thẻ vào lane; xem quân giao chiến; hai bên là tháp canh có cờ'],
      ['Dưới-trái', 'Bảng vàng', 'Vàng hiện có, tốc độ sản xuất vàng, mức tối đa và nút ↑ nâng cấp kho vàng (phím U; rê chuột để xem chi tiết)'],
      ['Dưới-giữa', 'Thẻ bài: lính | đồ phòng thủ | tướng', 'Giá vàng ở góc trái, kéo thẻ vào lane; thẻ xám = chưa đủ vàng'],
      ['Dưới-phải', 'Đồng hồ lane', 'Máu cờ ta/địch của từng lane theo thời gian thực'],
      ['Trên thẻ / trên quân', 'Cửa sổ thông tin', 'Rê chuột (hoặc chạm) để xem tên, máu hiện tại, chỉ số và mô tả kỹ năng'],
    ],
    [1600, 2700, 5000],
  );
  h2('3.3. Điều khiển');
  table(
    ['Thao tác', 'Cách làm'],
    [
      ['Kéo thả (khuyên dùng)', 'Giữ thẻ bài, kéo vào lane muốn triển khai rồi thả. Lane được tô vàng khi rê chuột/ngón tay qua. Đồ phòng thủ được đặt đúng vị trí thả theo chiều ngang của lane.'],
      ['Chạm hai bước', 'Chạm thẻ để chọn, sau đó chạm vào lane. Thẻ vẫn được chọn nên có thể chạm liên tiếp để thả nhiều quân.'],
      ['Phím tắt (laptop)', '1–9: chọn thẻ theo thứ tự hiển thị · Q / W / E: thả vào lane 1 / 2 / 3 · U: nâng giới hạn vàng · Esc hoặc P: tạm dừng'],
      ['Tạm dừng', 'Nút ⏸ hoặc phím Esc: có thể đổi ngôn ngữ, tiếp tục hoặc rút lui trong menu tạm dừng'],
      ['Tốc độ', 'Nhóm nút ×1 · ×1,5 · ×2 · ×2,5 · ×3 dưới chân dung chỉ huy địch (trên điện thoại chỉ hiện mức đang chọn, chạm để chuyển mức kế tiếp)'],
      ['Xem thông tin', 'Rê chuột (hoặc chạm) vào quân/thẻ/nút nâng cấp vàng để xem chi tiết; ngoài bản đồ, rê chuột vào Boss hoặc quân địch trong bảng trạm để xem thông số'],
    ],
    [2400, 6900],
  );
  h2('3.4. Vàng (tài nguyên trong trận)');
  ul(
    `Bắt đầu trận với ${PLAYER_START_GOLD} vàng, sản xuất ${f(PLAYER_INCOME)} vàng mỗi giây, mức tối đa ban đầu ${CAP_STEPS[0]}.`,
    'Lưu ý: "vàng" trong trận chỉ dùng để xuất quân và nâng cấp kho vàng; hoàn toàn tách biệt với "xu" (tiền ngoài trận) dùng để mở khóa/nâng cấp thẻ, ô bộ bài và thành trì.',
    'Triển khai quân tốn vàng (lính 10–34, đồ phòng thủ 12–32, tướng 45–75). Địch cũng có vàng riêng, thu nhập tăng dần theo trạm; đầu trận địch vào chậm hơn một chút.',
    'Mỗi tướng chỉ xuất hiện ở MỘT lane tại một thời điểm. Khi tướng chết hoặc lane của tướng đã kết thúc (thắng/thua), tướng biến khỏi chiến trường và nếu đủ vàng bạn có thể thả lại.',
    'Không đủ vàng: thanh vàng rung nhẹ, quân không được thả.',
  );
  h3('Nâng cấp giới hạn vàng');
  p('Nút "↑" cạnh bảng vàng cho phép trả vàng để nâng mức vàng tối đa VÀ tăng tốc độ sản xuất vàng. Rê chuột vào nút để xem giới hạn/tốc độ hiện tại → kế tiếp, chi phí và các mốc:');
  table(
    ['Cấp', 'Vàng tối đa', 'Tốc độ sản xuất vàng', 'Chi phí nâng lên cấp này'],
    CAP_STEPS.map((cap, i) => [String(i + 1), String(cap), `${f(PLAYER_INCOME * CAP_INCOME_MUL[i], 2)}/s (×${f(CAP_INCOME_MUL[i], 1)})`, i === 0 ? 'Ban đầu' : `${CAP_COSTS[i - 1]} vàng`]),
    [1000, 2200, 3100, 3000],
  );
  img('shot-captip.png', 560, 'Rê chuột vào nút ↑ để xem chi tiết nâng cấp: giới hạn vàng, tốc độ sản xuất vàng, chi phí và các mốc; góc phải trên là nhóm nút tốc độ ×1 → ×3');
  p('Nâng cấp chỉ áp dụng trong trận hiện tại; trận mới bắt đầu lại từ cấp 1. Khi vàng đang ở mức tối đa mà không dùng, vàng sản xuất thêm sẽ bị bỏ phí: hãy nâng cấp hoặc xuất quân.', { italic: true });
  h3('Vàng thưởng khi hạ quân');
  ul(
    `Hạ một lính địch: nhận ${Math.round(BOUNTY_TROOP * 100)}% giá vàng của lính đó; hạ một tướng địch: ${Math.round(BOUNTY_GENERAL * 100)}% giá; hạ Boss: ${BOUNTY_BOSS} vàng cố định.`,
    'Quân triệu hồi (Hao Thiên Khuyển, Khỉ Con, lính Bạo Chúa triệu hồi) và công trình không cho vàng, để tránh cày vàng quá dễ.',
    'Vàng thưởng cũng bị giới hạn bởi mức tối đa hiện tại. Màn kết quả hiển thị tổng số vàng thu được từ hạ quân.',
  );
  img('shot-result.png', 460, 'Màn kết quả: số lane, thời gian, số quân hạ gục, xu nhận được và vàng thu từ hạ quân');
  h2('3.5. Đồ phòng thủ');
  ul(
    `Bộ đồ phòng thủ mang vào trận gồm tối đa ${DEFENSE_DECK_SIZE} món (chọn ở tab Binh đoàn → Phòng thủ). Mới vào game có sẵn: ${STARTER_DEFENSES.map((id) => UNITS[id].name).join(', ')}.`,
    `Kéo thẻ vào lane và thả đúng vị trí muốn đặt; mỗi lane chứa tối đa ${MAX_DEFENSES_PER_LANE} công trình của mỗi bên. Công trình không thể đặt quá gần cờ hoặc quá sâu vào lane địch.`,
    'Tường chặn đường: quân địch buộc phải phá tường mới đi tiếp, trong thời gian đó Tường gai, Tháp cung, Nỏ thần, Pháo đá... bắn vào chúng. Hố lửa và bẫy là "ẩn": không chặn đường nhưng gây sát thương/choáng.',
    'Địch ở các trạm sâu cũng xây công trình riêng (ghi trong mô tả trạm).',
    'Công trình nâng cấp bằng xu giống lính/tướng (giá 70 × cấp).',
  );
  h2('3.6. Hành vi quân đội');
  ul(
    'Quân tự động đi về phía cờ địch; gặp địch trong tầm đánh sẽ dừng lại giao chiến (ưu tiên đơn vị gần nhất phía trước).',
    'Hết địch thì tấn công cờ; đơn vị tầm xa có thể bắn cờ từ xa. Mỗi lane dài 1000 đơn vị; quân xuất hiện cách cờ nhà 45 đơn vị.',
    'Thứ tự ưu tiên: (1) địch phía trước trong tầm đánh, (2) cờ địch nếu đã sát cờ, (3) địch ở phía sau lưng trong tầm đánh, (4) tiếp tục tiến. Vì vậy quân đang đứng sát cờ vẫn tập trung phá cờ, còn quân mới thả ra ở phía sau sẽ quay lại đánh quân đang phá thành (áp dụng cho cả hai phe).',
    'Tầm đánh > 70 được tính là tầm xa (Lính khiên giảm 50% sát thương từ đòn tầm xa).',
    'Sát thương thực = sát thương × 100 / (100 + giáp), tối thiểu 1. Ví dụ giáp 18 giảm khoảng 15%.',
    'Mỗi lần kéo thả chỉ xuất hiện MỘT quân (một thanh máu). Rê chuột vào quân (hoặc chạm vào quân trên điện thoại) để xem cửa sổ thông tin gọn: tên, loại, máu hiện tại, chỉ số và mô tả kỹ năng. Rê chuột vào thẻ bài để xem thông tin tương tự theo cấp thẻ.',
    'Mỗi lần gây sát thương đều hiện con số sát thương nổi lên trên mục tiêu (đỏ khi quân ta bị đánh, trắng/vàng khi ta gây sát thương, xanh lục khi hồi máu, vàng khi nhận vàng thưởng).',
  );
  h2('3.7. Điều kiện đặc biệt của trạm');
  table(
    ['Điều kiện', 'Ảnh hưởng'],
    [
      ['Giáp dày', 'Toàn bộ quân địch +6 giáp: nên dùng sát thương xuyên giáp, độc, hoặc sát thương lan lớn'],
      ['Quân nhanh', 'Quân địch di chuyển nhanh hơn 20%'],
      ['Dồn dập', 'Địch thả quân dồn dập, mỗi lần 2 quân'],
    ],
    [2400, 6900],
  );
  h2('3.8. Thưởng và sao');
  table(
    ['Kết quả', 'Xu nhận được'],
    [
      ['Thắng lần đầu', `Toàn bộ thưởng của trạm (${STATIONS[0].reward} xu ở trạm đầu → ${STATIONS[STATIONS.length - 1].reward} xu ở trạm cuối)`],
      ['Thắng lại', '50% thưởng của trạm'],
      ['Thua', '15% thưởng của trạm'],
    ],
    [3000, 6300],
  );
  table(
    ['Sao', 'Điều kiện'],
    [
      ['★', 'Chiến thắng trạm'],
      ['★★', 'Chiến thắng và không để địch thắng lane nào'],
      ['★★★', 'Chiến thắng không mất lane và đủ nhanh. Ngưỡng thời gian tăng dần theo độ sâu: khoảng 100 giây ở trạm đầu → 200 giây ở trạm cuối (hiển thị trong bảng thông tin trạm)'],
    ],
    [1600, 7700],
  );
  p('Sao được lưu lại theo từng trạm (giữ số sao cao nhất đã đạt) và hiển thị ngay trên bản đồ.');
  h2('3.9. Màn Boss');
  ul(
    'Chỉ có MỘT lane: toàn bộ quân hai bên dồn vào một đường nên không thể bỏ lane để cứu lane khác. Cờ nhà được tăng độ bền.',
    `Boss không xuất hiện ngay: nó chỉ vào trận khi cờ địch còn ≤ ${Math.round(BOSS_AT_HP * 100)}% máu hoặc sau ${BOSS_AT_TIME} giây (không sớm hơn 25 giây), kèm cảnh báo trên màn hình. Trước đó bạn đối đầu quân thường của địch.`,
    `Khi Boss còn sống, cờ địch chỉ nhận ${Math.round(BOSS_FLAG_GUARD * 100)}% sát thương: bắt buộc phải hạ Boss. Hạ gục Boss là chiến thắng ngay lập tức.`,
    'Boss có nhiều máu hơn hẳn tướng thường (3.150–3.450) và chiêu thức riêng (xem mục 9).',
  );
  B.push({ k: 'break' });

  // 4
  h1('4. Chiến dịch: 3 bản đồ, 30 trạm');
  p(`Chiến dịch gồm ${CHAPTERS.length} bản đồ, mỗi bản đồ ${STATIONS_PER_MAP} trạm đi từ Thành Xuất Phát (góc dưới) tới Thành Địch (góc trên). Mỗi trạm có cờ, nhãn "bản đồ-trạm" (ví dụ 2-5), số sao đạt được; trạm Boss có huy hiệu riêng. Quy tắc mở khóa:`);
  ul(
    'Hoàn thành một trạm để mở trạm kế tiếp; hoàn thành đủ 10 trạm (kể cả Boss) mới mở bản đồ tiếp theo.',
    'Có thể bấm vào BẤT KỲ trạm nào (kể cả trạm và bản đồ đang khóa) và dùng nút ◀ ▶ để chuyển bản đồ: bạn xem được quân địch, thưởng, điều kiện thắng của các trạm sau; nút "Ra trận" bị vô hiệu cho trạm chưa mở.',
    'Trạm đã qua có thể chơi lại để cải thiện sao và nhận thêm xu.',
  );
  img('shot-map-locked.png', 560, 'Xem trước trạm bị khóa: bảng thông tin vẫn hiển thị đầy đủ, nút "Chưa mở khóa" bị vô hiệu');
  img('shot-map3.png', 560, 'Bản đồ 3 "Đại Náo Thiên Cung" với trạm Boss cuối: Hỏa Diệm Sơn');
  p('Bảng dưới liệt kê các trạm. "Số quân" là tổng số quân địch được thả (tăng dần theo độ sâu; trạm Boss ít hơn vì chỉ có 1 lane). "Sức mạnh" là hệ số nhân máu và sát thương của quân địch; quân của bạn nhân theo cấp thẻ (xem mục 5).', { italic: true });
  CHAPTERS.forEach((ch, ci) => {
    h2(`Bản đồ ${ci + 1}: ${ch.name} — ${ch.subtitle}`);
    table(
      ['Trạm', 'Tên', 'Địa hình', 'Số quân', 'Sức mạnh', 'Thu nhập', 'Máu cờ', 'Thưởng'],
      stationsOf(ci).map((s) => [
        stationLabel(s.id), s.name + (s.boss ? ' (Boss)' : '') + (s.mod ? ` · ${MOD[s.mod]}` : ''), THEME[s.theme], String(s.units), `×${s.power}`, `${s.income}/s`, String(s.flagHp), `${s.reward} xu`,
      ]),
      [750, 3350, 1200, 800, 900, 900, 750, 900],
    );
    for (const s of stationsOf(ci)) {
      h3(`Trạm ${stationLabel(s.id)}: ${s.name} — ${s.subtitle}`);
      p(s.desc);
      const bd = s.bossId ? [UNITS[s.bossId].name] : [];
      p(`Quân địch: ${[...bd, ...s.deck.map((id) => UNITS[id].name)].join(', ')}${s.defenses?.length ? ` · Công trình: ${s.defenses.map((id) => UNITS[id].name).join(', ')}` : ''}`, { italic: true });
    }
    B.push({ k: 'break' });
  });
  img('shot-boss.png', 560, 'Trạm Boss: Ngưu Ma Vương xuất hiện giữa trận; chỉ có một lane, tên Boss hiển thị trên đầu');
  B.push({ k: 'break' });

  // 5
  h1('5. Binh đoàn: bộ bài, mở khóa, nâng cấp');
  ul(
    `Bộ bài ra trận gồm tối đa ${DECK_SIZE} thẻ lính/tướng, trong đó tối đa ${MAX_GENERALS_IN_DECK} tướng; tối thiểu 1 thẻ. Bộ đồ phòng thủ riêng, tối đa ${DEFENSE_DECK_SIZE} món.`,
    'Mở khóa thẻ bằng xu (giá mỗi loại ở phần danh sách). Thẻ mới mở ở cấp 1. Tab Binh đoàn chia ba mục: Lính · Phòng thủ · Tướng.',
    `Nâng cấp tối đa ${MAX_LEVEL} cấp: mỗi cấp tăng 12% máu và 12% sát thương (kể cả sát thương kỹ năng, hồi máu...) so với cấp 1. Cấp 5 = +48%.`,
    'Giá nâng cấp: lính = 60 × cấp hiện tại; đồ phòng thủ = 70 × cấp; tướng = 140 × cấp (ví dụ lính từ cấp 2 lên 3 tốn 120 xu).',
    'Ô BỘ BÀI và ô ĐỒ PHÒNG THỦ mở thêm bằng xu (xem bảng dưới): nhấn ô "+" viền vàng cuối hàng ô trong tab Binh đoàn.',
    'THÀNH TRÌ: nâng cấp máu cờ nhà bằng xu (mỗi cấp +12% máu, tối đa 10 cấp), áp dụng cho mọi trận.',
    'Trong trận, thẻ xếp theo thứ tự: lính | đồ phòng thủ | tướng; thẻ lính nền xanh, đồ phòng thủ nền nâu, thẻ tướng nền đỏ thẫm viền vàng với chân dung lớn.',
  );
  table(
    ['Cấp', 'Hệ số máu/sát thương', 'Giá lên cấp (lính)', 'Giá lên cấp (phòng thủ)', 'Giá lên cấp (tướng)'],
    [1, 2, 3, 4, 5].map((lv) => [
      String(lv), `×${levelMul(lv).toFixed(2)}`,
      lv < MAX_LEVEL ? `${upgradeCost(UNITS.samurai, lv)} xu` : '—',
      lv < MAX_LEVEL ? `${upgradeCost(UNITS.wall, lv)} xu` : '—',
      lv < MAX_LEVEL ? `${upgradeCost(UNITS.duongqua, lv)} xu` : '—',
    ]),
    [900, 2300, 2000, 2100, 2000],
  );
  h3('Nâng cấp ô bộ bài và thành trì');
  table(
    ['Hạng mục', 'Giới hạn', 'Chi phí (xu)'],
    [
      ['Ô bộ bài ra trận (6 → 9 ô)', `+${DECK_EXTRA_COSTS.length} ô`, DECK_EXTRA_COSTS.map((c, i) => `ô ${7 + i}: ${c}`).join(' · ')],
      ['Ô bộ đồ phòng thủ (3 → 5 ô)', `+${DEF_EXTRA_COSTS.length} ô`, DEF_EXTRA_COSTS.map((c, i) => `ô ${4 + i}: ${c}`).join(' · ')],
      ['Máu thành trì', `${FLAG_MAX_LV} cấp`, `cấp 1: ${flagUpgradeCost(0)} → cấp ${FLAG_MAX_LV}: ${flagUpgradeCost(FLAG_MAX_LV - 1)} (mỗi cấp +12% máu cờ nhà: ${PLAYER_FLAG_HP} → ${Math.round(PLAYER_FLAG_HP * flagHpMul(FLAG_MAX_LV))})`],
    ],
    [3300, 1500, 4500],
  );
  p('Khi bộ bài có hơn 9 thẻ (lính + đồ phòng thủ + tướng), thẻ trong trận được chia thành hai hàng trên màn hình nhỏ.', { italic: true });
  img('shot-army.png', 560, 'Tab Binh đoàn: thành trì, bộ bài ra trận, bộ đồ phòng thủ (ô "+" mở thêm), danh sách thẻ');
  img('shot-army-generals.png', 560, 'Danh sách tướng (19 vị)');
  img('shot-army-defense.png', 560, 'Danh sách đồ phòng thủ (10 loại)');
  B.push({ k: 'break' });

  // 6
  h1(`6. Danh sách lính (${troops.length} loại)`);
  p('Chỉ số bên dưới là chỉ số gốc ở cấp 1. "Nhịp" là số giây giữa hai đòn; "DPS" là sát thương mỗi giây ước tính.');
  for (const u of troops) unitCard(u);
  B.push({ k: 'break' });

  // 7
  h1(`7. Danh sách tướng (${generals.length} vị)`);
  p('Tướng mạnh hơn lính nhiều nhưng đắt (45–75 vàng) và chỉ có một bản trên chiến trường (xem mục 3.4). Tướng có tên hiển thị trên đầu và vòng sáng vàng dưới chân. Tướng lấy cảm hứng từ Thần Điêu Đại Hiệp, Tam Quốc, Kim Dung và Tây Du.');
  for (const u of generals) unitCard(u);
  note('Phối hợp đặc biệt', 'Tiểu Long Nữ chỉ phát huy hồi máu khi đi cùng Dương Quá trong cùng lane (cách nhau ≤ 170). Tôn Ngộ Không biến thành tướng khác nên hợp với đội có nhiều tướng làm "mồi"; Tào Tháo + đội lính đông; Quách Tĩnh + Tế đàn cho đội cận chiến bất tử; Tư Mã Ý + Hoàng Trung/Nỏ để hạ mục tiêu bị đứng yên.');
  B.push({ k: 'break' });

  // 8
  h1(`8. Đồ phòng thủ (${DEFENSES.length} loại)`);
  p('Đồ phòng thủ không di chuyển, được đặt đúng vị trí thả trong lane (xem mục 3.5). Chỉ số ở cấp 1.');
  for (const u of DEFENSES) unitCard(u);
  B.push({ k: 'break' });

  // 9
  h1(`9. Boss (${bosses.length}) và quân triệu hồi`);
  p('Mỗi bản đồ kết thúc bằng một trạm Boss (1 lane). Boss chỉ vào trận khi gần cuối (xem mục 3.9) và không thể triển khai bởi người chơi.');
  for (const u of bosses) unitCard(u);
  ul(
    'Gợi ý chung: giữ vàng ở mức cao trước khi Boss xuất hiện (nâng giới hạn vàng), xây tường chặn ở lane để câu giờ rồi dồn tướng xuyên giáp; Y sư/Tế đàn giúp chống sóng lửa và độc.',
    'Hạ gục Boss là chiến thắng ngay lập tức, kể cả khi cờ địch còn nhiều máu.',
  );
  h2('Quân triệu hồi');
  for (const u of summons) unitCard(u);
  B.push({ k: 'break' });

  // 10
  h1('10. Tổng hợp chiêu thức và hiệu ứng');
  p('Mỗi kỹ năng đều có hiệu ứng hình ảnh riêng để người chơi nhận biết ngay trong trận. Bảng dưới tóm tắt các chiêu chủ động của tướng, boss và đồ phòng thủ.');
  const activeRows = [...generals, ...bosses, ...DEFENSES].map((u): string[] => [u.skillName, u.name, u.desc]);
  table(['Chiêu thức', 'Chủ sở hữu', 'Hiệu ứng'], activeRows, [2200, 1700, 5400]);
  img('shot-skills.png', 560, 'Hiệu ứng: Hãn Thiên Chưởng (lane trên), Hỏa Thiêu (lane giữa), Thanh Long Trảm + Hồi sinh (lane dưới)');
  img('shot-skills2.png', 560, 'Hiệu ứng: Tâm Kinh (tim), Triệu hồi của Đổng Trác (ma trận tím), Tự bạo, Xung phong');
  B.push({ k: 'break' });

  // 11
  h1('11. Chiến thuật, khắc chế và mẹo');
  h2('11.1. Bảng khắc chế nhanh');
  table(
    ['Đối thủ', 'Nên dùng', 'Vì sao'],
    [
      ['Kỵ sĩ / Mã Siêu', 'Lính giáo, Lính khiên, Tường đá, Chu Du', 'Giáo ×2,2 lên kỵ binh; tường chặn xung phong; Chu Du làm chậm'],
      ['Cung thủ / Máy ném đá', 'Kỵ sĩ, Ninja, Tử sĩ, Mã Siêu', 'Áp sát nhanh để tiêu diệt máu giấy'],
      ['Lính khiên / Trương Phi / Voi chiến', 'Xạ thủ nỏ, Hoàng Trung, Lệnh Hồ Xung, Độc sư, Nỏ thần', 'Xuyên giáp hoặc độc bỏ qua ưu thế giáp'],
      ['Ninja (né 30%) / Đông Phương Bất Bại', 'Máy ném đá, Tử sĩ, chưởng/trảm, Đạo sĩ', 'Sát thương lan không bị né'],
      ['Đám lính tụ tập', 'Dương Quá, Quan Vũ, Lữ Bố, Kiều Phong, Đạo sĩ, Pháo đá', 'Sát thương diện rộng'],
      ['Y sư / Tế đàn của địch', 'Ninja, Cung thủ, Nỏ thần', 'Mỏng máu, hạ trước để phá hồi máu'],
      ['Đội đông (Dồn dập)', 'Tào Tháo, Tế đàn, Pháo đá, Bẫy gai', 'Buff đội quân và sát thương diện rộng'],
      ['Quân giáp dày (+6 giáp)', 'Nỏ, Hoàng Trung, Lệnh Hồ Xung, Độc sư, Âu Dương Phong', 'Xuyên giáp / độc / xuyên mọi giáp'],
      ['Boss', 'Tướng xuyên giáp, tường chặn, Y sư', 'Nhiều máu, giáp cao; cần tích vàng trước khi Boss ra'],
    ],
    [2500, 3200, 3600],
  );
  h2('11.2. Lời khuyên');
  ul(
    'Đừng thả hết vàng cùng lúc: giữ lại 20–30 vàng để phản ứng khi địch dồn quân sang lane khác.',
    'Chỉ cần thắng 2/3 lane (trạm thường): có thể bỏ một lane để dồn lực thắng hai lane còn lại.',
    'Hạ quân địch cũng cho vàng: hãy ưu tiên đổi quân có lợi (Tường, Tháp cung kéo địch vào vùng sát thương) thay vì xông ra.',
    'Nâng giới hạn vàng sớm khi trận kéo dài (đặc biệt ở trạm Boss) để có thể thả tướng sau khi Boss xuất hiện.',
    'Nâng kho vàng cũng tăng tốc độ sản xuất vàng: ở trận dài hoặc trạm Boss, nâng sớm sẽ có lợi hơn.',
    'Kỵ sĩ nên thả khi lane còn trống để chạy được quãng đường dài (bonus tới ×5).',
    'Đặt Tường đá/Lính khiên phía trước, Cung thủ/Nỏ/Tháp cung phía sau; thêm Y sư hoặc Tế đàn để kéo dài giao tranh.',
    'Dùng xu nâng cấp thẻ chủ lực thay vì mở rộng quá nhiều thẻ; ưu tiên tướng chủ lực và 1–2 công trình tốt.',
    'Sau mỗi trạm, kiểm tra tab Binh đoàn: trạm sau luôn mạnh hơn (hệ số quân địch tăng, số quân địch tăng, công trình địch).',
  );
  B.push({ k: 'break' });

  // 12
  h1('12. Đồ họa, hoạt ảnh và đa ngôn ngữ');
  h2('12.1. Đồ họa');
  ul(
    'Nhân vật vẽ bằng code theo phong cách chibi cel-shading: viền đậm theo màu gốc, mảng sáng/tối cứng, mắt to; mỗi nhân vật có trang phục, mũ và vũ khí riêng; kỵ binh có ngựa; Voi chiến, Hao Thiên Khuyển và công trình có hình vẽ riêng.',
    'Vòng màu dưới chân giúp phân biệt phe: xanh dương = quân ta, đỏ = quân địch; tướng có thêm vòng vàng, boss có vòng đỏ.',
    'Chiến trường là một bức toàn cảnh liền mạch với 11 chủ đề: đồng bằng, rừng trúc, núi đá, thành lũy, hoàng thành trăng máu, biển rồng, tuyết sơn, sa mạc, thiên đình, núi lửa, đêm tối. Lane gần người xem hơi lớn hơn tạo chiều sâu; trạm Boss dùng một lane rộng.',
    'Tháp canh kiểu chùa có mái cong, đèn lồng, cờ dài đổi màu theo phe; khi cờ sụp, tháp đổ, bốc khói và lửa.',
    'Bản đồ chiến dịch vẽ riêng cho từng chương (rừng/hồ, sa mạc, mây thiên đình, núi lửa...) và từng kích thước màn hình (ngang cho laptop, dọc cho điện thoại).',
  );
  h2('12.2. Hoạt ảnh');
  ul(
    'Nhân vật: hít thở, đung đưa khi đi, nghiêng người khi chạy, vung vũ khí theo từng loại, giật lùi và bẹp khi bị đánh, bật nảy khi xuất hiện, ngã xuống khi chết, bụi chân.',
    'Bối cảnh: mây trôi, chim (dơi ở màn đêm) đập cánh, quầng sáng mặt trời/trăng thở nhẹ, cỏ và hoa đung đưa, cánh hoa/lá/đom đóm/tàn lửa/tuyết rơi, ánh nắng, nước lấp lánh, đuốc/đèn lồng chập chờn, cờ bay.',
    'Hiệu ứng: số sát thương nảy lên, vệt chém, tên/đá/phép có vệt đuôi, rung màn hình khi va chạm mạnh, pháo giấy khi thắng lane, cảnh báo Boss xuất hiện, hiệu ứng riêng cho mỗi chiêu của tướng, boss và công trình (sóng lửa, mây độc, sấm sét, trụ băng, hóa thân, phân thân...).',
  );
  h2('12.3. Điện thoại: dọc và ngang');
  ul(
    'Điện thoại dọc: bản đồ dọc + thanh trạm gọn ở dưới; thẻ bài xếp một hàng (tối đa 9 thẻ, nhiều hơn chia hai hàng), nút tốc độ dạng gọn.',
    'Điện thoại NẰM NGANG: bản đồ ngang bên trái + bảng thông tin trạm bên phải (nút Ra trận cố định ở đáy), thanh điều hướng mỏng, HUD thấp, khung thẻ một hàng gọn để chiến trường rộng nhất có thể. Xoay máy là bố cục tự đổi.',
    'Nhấn thẻ để xem mô tả: khung mô tả nổi lên trên chiến trường và không làm đổi kích thước khung hình nên không bị giật.',
  );
  img('shot-mobile-land-map.png', 440, 'Điện thoại nằm ngang: bản đồ bên trái, bảng trạm bên phải, nút Ra trận cố định');
  img('shot-mobile-land-battle.png', 440, 'Điện thoại nằm ngang: chiến trường rộng, khung thẻ một hàng gọn, nút tốc độ gọn dưới chân dung chỉ huy địch');
  h2('12.4. Đa ngôn ngữ');
  p('Có thể chuyển giữa tiếng Việt và tiếng Anh ở: màn hình đăng nhập (nút VI/EN), Cài đặt (⚙) trong màn hình chính, menu Tạm dừng khi đang chơi và trang quản trị. Lựa chọn được ghi nhớ trên trình duyệt; lần đầu mở game, ngôn ngữ chọn theo trình duyệt. Tên lính/tướng, mô tả kỹ năng, tên trạm và chữ nổi trong trận đều được dịch (tên tướng tiếng Anh dùng phiên âm Pinyin như Yang Guo, Zhang Fei...).');
  img('shot-mobile-battle.png', 300, 'Giao diện điện thoại (iPhone 15): thẻ bài thu nhỏ, bảng vàng có nút nâng giới hạn, chỉ huy ở trên');
  B.push({ k: 'break' });

  // 13
  h1('13. Trang quản trị (/admin) và hệ thống thông báo');
  p('Trang quản trị nằm ở địa chỉ /admin của game (ví dụ https://tên-miền-của-bạn/admin), tách khỏi giao diện người chơi. Đăng nhập bằng tài khoản quản trị:');
  table(
    ['Thông tin', 'Giá trị'],
    [
      ['Tên đăng nhập', 'admin'],
      ['Mật khẩu', 'Do chủ dự án đặt khi tạo tài khoản trong Firebase Console (không ghi trong code/tài liệu)'],
      ['Tài khoản Firebase tương ứng', 'admin@gameempire.app (tạo tay trong Firebase Console, trang /admin không tự tạo)'],
    ],
    [3000, 6300],
  );
  note('Lưu ý', 'Mật khẩu quản trị được ghi cố định trong mã nguồn phía trình duyệt (phù hợp game cá nhân, yêu cầu bảo mật thấp). Nếu cần bảo mật cao hơn, hãy đổi mật khẩu của tài khoản admin trong Firebase và chuyển việc xác thực sang máy chủ. Tên "admin" bị chặn khi người chơi đăng ký.');
  h2('13.1. Quản lý người chơi');
  ul(
    'Danh sách toàn bộ người chơi: tên, trạm hiện tại (ví dụ 2-5), số trạm đã qua trên 30, tổng số sao, số vàng, thắng/thua, lần cập nhật cuối, trạng thái (Hoạt động / Đã khóa). Có ô tìm theo tên và thống kê tổng người chơi, số tài khoản bị khóa, tổng vàng.',
    'Sửa thông tin: tên hiển thị, số vàng, trạm hiện tại (các trạm trước đó tính là đã qua; có thể đánh dấu hoàn thành cả 30 trạm), số trận thắng/thua; nút nhanh "Mở khóa mọi thẻ" và "Đặt lại tiến trình".',
    'Khóa / mở khóa tài khoản kèm lý do: người chơi bị khóa khi đăng nhập sẽ thấy màn hình "Tài khoản đã bị khóa" cùng lý do, không vào được game; luật Firestore cũng chặn việc ghi tiến trình của tài khoản bị khóa.',
    'Khi người chơi đang online: số vàng admin sửa sẽ được gộp với vàng họ kiếm thêm (không mất vàng); tuy nhiên hạ thấp tiến trình có thể bị thiết bị người chơi ghi đè lại vì tiến trình luôn "chỉ tăng" khi gộp. Nên khóa tài khoản trước khi hạ tiến trình.',
  );
  img('shot-admin.png', 560, 'Trang quản trị: danh sách người chơi (tiếng Việt)');
  img('shot-admin-edit.png', 420, 'Hộp thoại sửa thông tin người chơi');
  h2('13.2. Thông báo');
  ul(
    'Tab "Thông báo": nhập tiêu đề và nội dung, chọn gửi tới "Toàn bộ người chơi" hoặc "Người chơi được chọn" (tích chọn trong danh sách, hoặc bấm biểu tượng chuông ở từng dòng người chơi).',
    'Danh sách thông báo đã gửi, có nút xóa.',
    'Phía người chơi: biểu tượng chuông 🔔 ở thanh trên cùng màn hình chính hiện số thông báo chưa đọc; khi đăng nhập, thông báo mới tự mở ra một lần. Trạng thái đã đọc lưu trên thiết bị của người chơi.',
  );
  img('shot-admin-notices.png', 560, 'Tab Thông báo: tạo thông báo mới và lịch sử thông báo đã gửi');
  h2('13.3. Triển khai quyền admin trên Firebase');
  ol(
    'Cập nhật Firestore Rules bằng nội dung file firestore.rules mới (có thêm quy tắc admin, accounts và notices) rồi bấm Publish.',
    'Mở https://tên-miền/admin, đăng nhập bằng admin và mật khẩu của tài khoản admin@gameempire.app (tạo tay trước trong Firebase Console: Authentication → Users → Add user).',
    'Firestore dùng 3 nhóm tài liệu: saves/{uid} (tiến trình), accounts/{uid} (trạng thái khóa), notices/{id} (thông báo). Người chơi chỉ đọc được của mình; chỉ admin được ghi accounts và notices.',
  );
  B.push({ k: 'break' });

  // 14
  h1('14. Thông tin kỹ thuật & triển khai');
  table(
    ['Hạng mục', 'Chi tiết'],
    [
      ['Ngôn ngữ', 'TypeScript'],
      ['Đồ họa', 'PixiJS 8 (2D, vẽ bằng code, cache bằng texture); giao diện menu bằng HTML/CSS'],
      ['Công cụ build', 'Vite'],
      ['Tài khoản & lưu trữ', 'Firebase Authentication (Email/Password, tên đăng nhập quy đổi thành email nội bộ) và Firestore (saves, accounts, notices)'],
      ['Triển khai', 'Vercel (build "npm run build", thư mục "dist", vercel.json có rewrite cho /admin); thêm biến môi trường VITE_FIREBASE_* và thêm domain vào Authorized domains của Firebase'],
      ['Bảo mật dữ liệu', 'Firestore Rules: người chơi chỉ đọc/ghi save của mình (và không ghi được khi bị khóa); admin đọc/ghi mọi save, accounts, notices. Logic game chạy ở client (phù hợp game cá nhân, chưa chống gian lận)'],
      ['Đồng bộ', 'Save có số phiên bản (rev): khi nhiều thiết bị ghi cùng lúc thì gộp (xu cộng phần chênh lệch, tiến trình chỉ tăng). Save cũ trước bố cục 30 trạm được giữ xu/thẻ/bộ bài và đặt lại tiến trình trạm'],
      ['Thiết bị', 'Laptop và điện thoại, tối ưu iPhone 15 (vùng an toàn, kéo thả bằng cảm ứng)'],
    ],
    [2300, 7000],
  );
  h3('Cấu trúc thư mục');
  ul(
    'src/data: số liệu lính, tướng, boss, đồ phòng thủ, trạm và bản đồ',
    'src/game: lõi mô phỏng trận đấu (sim.ts), AI địch (ai.ts), thưởng và sao (rewards.ts)',
    'src/render: nhân vật (unitArt.ts, extraArt.ts), chiến trường (scenery.ts, battleView.ts), hiệu ứng kỹ năng (vfx.ts), địa danh (landmarks.ts), bản đồ (mapArt.ts)',
    'src/ui: đăng nhập, bản đồ & binh đoàn, trận đấu, cài đặt, hộp thư thông báo, trang quản trị (admin.ts)',
    'src/backend: Firebase, chế độ offline, định dạng dữ liệu save, API quản trị (admin.ts)',
    'src/i18n: bảng chuỗi tiếng Việt/Anh và tên/mô tả dữ liệu tiếng Anh',
    'scripts: balance.ts (mô phỏng cân bằng bằng bot), check-i18n.ts (kiểm tra bản dịch), make-doc.ts (tạo tài liệu này)',
  );
  h3('Lệnh thường dùng');
  ul('npm run dev — chạy thử', 'npm run build — kiểm tra kiểu và build production', 'npm run balance — mô phỏng độ khó từng trạm', 'npm run check:i18n — kiểm tra đủ chuỗi VI/EN', 'npm run doc — tạo lại tài liệu này');
  B.push({ k: 'break' });

  // Phụ lục
  h1('Phụ lục A: bảng chỉ số tổng hợp (cấp 1)');
  table(
    ['Tên', 'Loại', 'Giá', 'Máu', 'Sát thương', 'Nhịp (s)', 'DPS', 'Tốc độ', 'Tầm', 'Giáp', 'Giá mở khóa'],
    UNIT_LIST.map((u) => [
      u.name, kindName(u), u.cost ? String(u.cost) : '—', String(u.hp), u.dmg ? String(u.dmg) : '—', f(u.cd, 2), dps(u),
      String(u.speed), u.range ? String(u.range) : '—', String(u.armor), u.kind === 'boss' || u.kind === 'summon' ? '—' : u.unlockCost === 0 ? 'Có sẵn' : `${u.unlockCost} xu`,
    ]),
    [1450, 800, 500, 650, 800, 700, 600, 700, 550, 550, 1000],
  );
  p('Ghi chú: Y sư và Tế đàn hồi máu thay vì gây sát thương; Tử sĩ "sát thương" là sức nổ; Bẫy gai/Tường/Trống có chỉ số đặc thù (xem mục 8).', { italic: true });
  h1('Phụ lục B: thuật ngữ');
  table(
    ['Thuật ngữ', 'Ý nghĩa'],
    [
      ['Lane', 'Một làn đường chiến đấu độc lập; trạm thường có 3 lane, trạm Boss có 1 lane'],
      ['Cờ / Tháp canh', 'Mục tiêu phá hủy của mỗi lane; có máu riêng'],
      ['Bản đồ / Trạm', `Chiến dịch có ${CHAPTERS.length} bản đồ, mỗi bản đồ ${STATIONS_PER_MAP} trạm (nhãn dạng 2-5)`],
      ['Thẻ', 'Một loại lính, tướng hoặc đồ phòng thủ có thể mang vào trận'],
      ['Bộ bài', `Tập tối đa ${DECK_SIZE} thẻ lính/tướng (≤ ${MAX_GENERALS_IN_DECK} tướng) và ${DEFENSE_DECK_SIZE} đồ phòng thủ mang vào trận`],
      ['Xu', 'Tiền ngoài trận: mở khóa/nâng cấp thẻ'],
      ['Vàng', 'Tiền trong trận: triển khai quân; hồi theo thời gian và nhận thêm khi hạ quân địch'],
      ['Giới hạn vàng', 'Mức vàng tối đa trong trận, có thể nâng cấp bằng chính vàng'],
      ['Giáp', 'Giảm sát thương nhận theo công thức 100 / (100 + giáp)'],
      ['Xuyên giáp', 'Bỏ qua một phần hoặc toàn bộ giáp của mục tiêu'],
      ['Sát thương lan (AoE)', 'Gây sát thương lên nhiều mục tiêu trong một vùng'],
      ['Tầm xa', 'Đơn vị có tầm đánh > 70'],
      ['Triệu hồi', 'Quân tạm thời do kỹ năng tạo ra (Hao Thiên Khuyển, Khỉ Con...), không cho vàng thưởng'],
    ],
    [2400, 6900],
  );
}

function unitCard(u: UnitDef) {
  const sk = SKILL_DETAIL[u.skill];
  const info = NEW_INFO[u.id];
  const isDef = u.kind === 'defense';
  const stat = isDef
    ? `Máu ${u.hp > 1 ? u.hp : '—'} · Sát thương/hiệu ứng ${u.dmg || '—'} · Chu kỳ ${f(u.cd, 2)}s · Tầm ${u.range || '—'} · Giáp ${u.armor}`
    : `Máu ${u.hp} · Sát thương ${u.dmg || '—'} · Nhịp ${f(u.cd, 2)}s (DPS ${dps(u)}) · Tốc độ ${u.speed} · Tầm ${rangeText(u)} · Giáp ${u.armor}`;
  const price =
    u.kind === 'boss' ? 'Không thể triển khai (đối thủ)' : u.kind === 'summon' ? 'Do kỹ năng triệu hồi, không thể thả trực tiếp' : `Triển khai ${u.cost} vàng · ${u.unlockCost === 0 ? 'Có sẵn từ đầu' : `Mở khóa ${u.unlockCost} xu`}`;
  const lines: [string, string][] = [['Chỉ số', stat], ['Giá', price]];
  lines.push([`Kỹ năng: ${u.skillName}`, sk && !info ? sk.effect.replace(new RegExp('^' + u.skillName + ':\\s*', 'iu'), '') : u.desc]);
  if (info) {
    lines.push(['Thông số', info.numbers], ['Cách dùng', info.tip]);
    if (info.weak) lines.push(['Điểm yếu', info.weak]);
  } else if (sk) {
    lines.push(['Thông số', sk.numbers], ['Cách dùng', sk.tip]);
    if (sk.counter !== '—') lines.push(['Điểm yếu', sk.counter]);
  }
  const story = UNIT_STORY[u.id] ?? STORY2[u.id] ?? '';
  const accent = u.kind === 'troop' ? '3D6FB0' : u.kind === 'general' ? 'B8860B' : u.kind === 'defense' ? '8A5A2B' : u.kind === 'summon' ? '4A8A6A' : 'A02020';
  B.push({ k: 'card', img: `${u.id}_full.png`, title: u.name, sub: `${kindName(u)} · ${story}`, lines, accent });
}

// ───────────────────────── trình xuất .docx ─────────────────────────
const pngSize = (file: string) => {
  const b = readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};
const FONT = 'Calibri';

function run(text: string, o: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {}) {
  return new TextRun({ text, font: FONT, ...o });
}
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const thin = { style: BorderStyle.SINGLE, size: 4, color: 'C9B88A' };

function docxBlocks(): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  for (const b of B) {
    switch (b.k) {
      case 'h1':
        out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 160 }, children: [run(b.text, { bold: true, color: '7A3E12', size: 34 })] }));
        break;
      case 'h2':
        out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 }, children: [run(b.text, { bold: true, color: '9A5A1A', size: 28 })] }));
        break;
      case 'h3':
        out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 80 }, children: [run(b.text, { bold: true, color: '555555', size: 24 })] }));
        break;
      case 'p':
        out.push(new Paragraph({
          alignment: b.center ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { after: 100, line: 300 },
          children: [run(b.text, { bold: b.bold, italics: b.italic, color: b.color, size: b.bold && b.center ? 40 : 22 })],
        }));
        break;
      case 'ul':
        b.items.forEach((t) => out.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60, line: 290 }, children: [run(t)] })));
        break;
      case 'ol':
        b.items.forEach((t, i) => out.push(new Paragraph({ spacing: { after: 60, line: 290 }, indent: { left: 360, hanging: 360 }, children: [run(`${i + 1}.  `, { bold: true, color: '9A5A1A' }), run(t)] })));
        break;
      case 'table': {
        const total = b.widths.reduce((a, c) => a + c, 0);
        const cell = (t: string, w: number, head: boolean, shade?: string) =>
          new TableCell({
            width: { size: w, type: WidthType.DXA },
            shading: head ? { type: ShadingType.CLEAR, fill: '7A3E12', color: 'auto' } : shade ? { type: ShadingType.CLEAR, fill: shade, color: 'auto' } : undefined,
            margins: { top: 50, bottom: 50, left: 90, right: 90 },
            borders: { top: thin, bottom: thin, left: thin, right: thin },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ children: [run(t, { bold: head, color: head ? 'FFFFFF' : undefined, size: b.widths.length > 7 ? 16 : 19 })] })],
          });
        out.push(new Table({
          width: { size: total, type: WidthType.DXA },
          columnWidths: b.widths,
          rows: [
            new TableRow({ tableHeader: true, children: b.head.map((t, i) => cell(t, b.widths[i], true)) }),
            ...b.rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, b.widths[i], false, ri % 2 ? 'FBF5E6' : undefined)) })),
          ],
        }));
        out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        break;
      }
      case 'img': {
        const file = join(ASSETS, b.file);
        if (!existsSync(file)) break;
        const { w, h } = pngSize(file);
        const width = b.width;
        const height = Math.round((width * h) / w);
        out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 40 }, children: [new ImageRun({ type: 'png', data: readFileSync(file), transformation: { width, height } })] }));
        if (b.caption) out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [run(b.caption, { italics: true, color: '666666', size: 18 })] }));
        break;
      }
      case 'card': {
        const file = join(ASSETS, b.img);
        let imgPara: Paragraph;
        if (existsSync(file)) {
          const { w, h } = pngSize(file);
          const maxW = 105;
          const maxH = 130;
          const k = Math.min(maxW / w, maxH / h);
          imgPara = new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: readFileSync(file), transformation: { width: Math.round(w * k), height: Math.round(h * k) } })] });
        } else imgPara = new Paragraph({ children: [] });
        const left = new TableCell({
          width: { size: 1900, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: 'F4ECD8', color: 'auto' },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
          borders: { top: thin, bottom: thin, left: thin, right: noBorder },
          children: [imgPara],
        });
        const right = new TableCell({
          width: { size: 7400, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 140, right: 100 },
          borders: { top: thin, bottom: thin, left: noBorder, right: thin },
          children: [
            new Paragraph({ spacing: { after: 20 }, children: [run(b.title, { bold: true, size: 30, color: b.accent })] }),
            new Paragraph({ spacing: { after: 80 }, children: [run(b.sub, { italics: true, color: '666666', size: 19 })] }),
            ...b.lines.map(([k, v]) => new Paragraph({ spacing: { after: 40, line: 270 }, children: [run(`${k}: `, { bold: true, size: 19 }), run(v, { size: 19 })] })),
          ],
        });
        out.push(new Table({ width: { size: 9300, type: WidthType.DXA }, columnWidths: [1900, 7400], rows: [new TableRow({ cantSplit: true, children: [left, right] })] }));
        out.push(new Paragraph({ spacing: { after: 140 }, children: [] }));
        break;
      }
      case 'note':
        out.push(new Table({
          width: { size: 9300, type: WidthType.DXA },
          columnWidths: [9300],
          rows: [new TableRow({ children: [new TableCell({
            width: { size: 9300, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: 'FFF4D6', color: 'auto' },
            margins: { top: 80, bottom: 80, left: 140, right: 140 },
            borders: { top: thin, bottom: thin, right: thin, left: { style: BorderStyle.SINGLE, size: 24, color: 'E0902A' } },
            children: [new Paragraph({ children: [run(`${b.title}: `, { bold: true, color: '9A5A1A' }), run(b.text)] })],
          })] })],
        }));
        out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        break;
      case 'break':
        out.push(new Paragraph({ children: [new PageBreak()] }));
        break;
    }
  }
  return out;
}

// ───────────────────────── trình xuất .doc (HTML cho Word) ─────────────────────────
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function htmlDoc(): string {
  const dir = `${NAME}_files`;
  mkdirSync(join(OUT, dir), { recursive: true });
  const use = (file: string) => {
    const src = join(ASSETS, file);
    if (!existsSync(src)) return '';
    copyFileSync(src, join(OUT, dir, file));
    return `${dir}/${file}`;
  };
  const th = 'style="border:1px solid #c9b88a;padding:4px 6px;font-size:10pt"';
  const parts: string[] = [];
  for (const b of B) {
    switch (b.k) {
      case 'h1': parts.push(`<h1 style="color:#7a3e12;font-size:20pt;mso-break-type:none">${esc(b.text)}</h1>`); break;
      case 'h2': parts.push(`<h2 style="color:#9a5a1a;font-size:15pt">${esc(b.text)}</h2>`); break;
      case 'h3': parts.push(`<h3 style="color:#555;font-size:12pt">${esc(b.text)}</h3>`); break;
      case 'p': parts.push(`<p style="${b.center ? 'text-align:center;' : ''}${b.bold ? 'font-weight:bold;font-size:22pt;' : ''}${b.italic ? 'font-style:italic;' : ''}${b.color ? `color:#${b.color};` : ''}">${esc(b.text)}</p>`); break;
      case 'ul': parts.push(`<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`); break;
      case 'ol': parts.push(`<ol>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ol>`); break;
      case 'table':
        parts.push(`<table style="border-collapse:collapse;width:100%"><tr>${b.head.map((h) => `<th ${th.replace('padding', 'background:#7a3e12;color:#fff;padding')}>${esc(h)}</th>`).join('')}</tr>${b.rows.map((r, ri) => `<tr${ri % 2 ? ' style="background:#fbf5e6"' : ''}>${r.map((c) => `<td ${th}>${esc(c)}</td>`).join('')}</tr>`).join('')}</table><p></p>`);
        break;
      case 'img': {
        const src = use(b.file);
        if (src) parts.push(`<p style="text-align:center"><img src="${src}" width="${Math.round(b.width * 0.9)}"><br><i style="color:#666;font-size:9pt">${esc(b.caption ?? '')}</i></p>`);
        break;
      }
      case 'card': {
        const src = use(b.img);
        parts.push(`<table style="border-collapse:collapse;width:100%"><tr><td style="width:110px;background:#f4ecd8;border:1px solid #c9b88a;text-align:center;padding:6px">${src ? `<img src="${src}" height="110">` : ''}</td><td style="border:1px solid #c9b88a;padding:6px 10px"><b style="font-size:15pt;color:#${b.accent}">${esc(b.title)}</b><br><i style="color:#666">${esc(b.sub)}</i><br>${b.lines.map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join('<br>')}</td></tr></table><p></p>`);
        break;
      }
      case 'note': parts.push(`<p style="background:#fff4d6;border-left:6px solid #e0902a;padding:6px 10px"><b style="color:#9a5a1a">${esc(b.title)}:</b> ${esc(b.text)}</p>`); break;
      case 'break': parts.push('<br clear=all style="page-break-before:always">'); break;
    }
  }
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><meta name="ProgId" content="Word.Document"><title>Tam Lộ Công Thành</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.35}@page{size:21cm 29.7cm;margin:2cm}td,th{vertical-align:middle}</style></head>
<body>${parts.join('\n')}</body></html>`;
}

// ───────────────────────── chạy ─────────────────────────
build();
const doc = new Document({
  creator: 'Tam Lộ Công Thành',
  title: 'Tam Lộ Công Thành — Tài liệu game',
  description: 'Mô tả game, cách chơi, nhân vật và chiêu thức',
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1304, right: 1304 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Tam Lộ Công Thành  ·  Trang ', { size: 16, color: '888888' }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: '888888' })] })] }) },
    children: docxBlocks(),
  }],
});

const buf = await Packer.toBuffer(doc);
writeFileSync(join(OUT, `${NAME}.docx`), buf);
writeFileSync(join(OUT, `${NAME}.doc`), '﻿' + htmlDoc(), 'utf8');
console.log(`Đã tạo: ${join(OUT, NAME)}.docx (${(buf.length / 1024).toFixed(0)} KB) và .doc`);
