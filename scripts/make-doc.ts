// Tạo tài liệu mô tả game (Word): npm run doc  ->  docs/Tam-Lo-Cong-Thanh-Tai-Lieu.docx + .doc
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, Packer, PageBreak, PageNumber, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from 'docx';
import { UNIT_LIST, UNITS, levelMul, upgradeCost, DECK_SIZE, MAX_GENERALS_IN_DECK, MAX_LEVEL, type UnitDef } from '../src/data/units';
import { STATIONS } from '../src/data/campaign';
import { GOLD_CAP, LANE_COUNT, OVERTIME_AT, PLAYER_FLAG_HP, PLAYER_INCOME, PLAYER_START_GOLD } from '../src/game/sim';
import { FAST_WIN_SEC } from '../src/game/rewards';

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
const kindName = (u: UnitDef) => (u.kind === 'troop' ? 'Lính' : u.kind === 'general' ? 'Tướng' : 'Boss');

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
    numbers: 'Mỗi 9 giây triệu hồi 2 Samurai (lần đầu sau 6 giây). Dưới 50% máu: sát thương ×1,4, tốc độ ×1,4. Máu 2.600, giáp 16.',
    tip: 'Hạ gục Đổng Trác là THẮNG NGAY toàn trận. Dồn tướng mạnh vào lane của hắn thay vì ăn 2/3 lane.',
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
  dongtrac: 'Bạo Chúa Đổng Trác, kẻ chiếm giữ Hoàng Thành. Trùm cuối của chiến dịch.',
};

// ───────────────────────── nội dung tài liệu ─────────────────────────
function build() {
  B.push({ k: 'p', text: 'TAM LỘ CÔNG THÀNH', bold: true, center: true, color: '7A3E12' });
  B.push({ k: 'p', text: 'Three Lanes Siege', italic: true, center: true });
  B.push({ k: 'p', text: 'Tài liệu mô tả game, cách chơi, nhân vật và chiêu thức', center: true, bold: true });
  B.push({ k: 'p', text: 'Game chiến thuật 2D chạy trên trình duyệt (laptop & điện thoại)  ·  Phiên bản 1.0  ·  07/10/2026', center: true, italic: true });
  img('shot-map.png', 560, 'Bản đồ chiến dịch: các trạm nối nhau bằng con đường quanh co, trạm cuối là Boss');
  B.push({ k: 'break' });

  h1('Mục lục');
  ol(
    'Tổng quan trò chơi',
    'Bắt đầu nhanh',
    'Cách chơi chi tiết',
    'Chiến dịch & bản đồ trạm',
    'Binh đoàn: bộ bài, mở khóa, nâng cấp',
    'Danh sách lính (10 loại)',
    'Danh sách tướng (7 vị)',
    'Boss cuối: Đổng Trác',
    'Tổng hợp chiêu thức và hiệu ứng',
    'Chiến thuật, khắc chế và mẹo',
    'Đồ họa, hoạt ảnh và đa ngôn ngữ',
    'Thông tin kỹ thuật & triển khai',
    'Phụ lục: bảng chỉ số tổng hợp, thuật ngữ',
  );

  // 1
  h1('1. Tổng quan trò chơi');
  p('Tam Lộ Công Thành là game chiến thuật công thành 2D chạy ngay trên trình duyệt web. Người chơi đi công thành lần lượt từng trạm: đánh hết 4 trạm sẽ gặp Boss cuối. Mỗi trận diễn ra song song trên ba làn đường (lane) độc lập. Người chơi kéo thả lính và tướng vào từng lane, phá cờ của đối phương: bên nào ăn được 2/3 lane sẽ thắng.');
  h3('Điểm nổi bật');
  ul(
    'Chiến trường 3 lane độc lập, mỗi lane có cờ (tháp canh) riêng; lane nào đã có người thắng sẽ đóng lại, không thể thả quân vào nữa.',
    '10 loại lính và 7 vị tướng, mỗi loại có kỹ năng riêng, giá tiền và vai trò khác nhau; tướng lấy cảm hứng từ Tam Quốc và Thần Điêu Đại Hiệp.',
    'Boss Đổng Trác: triệu hồi lính, nổi điên khi sắp thua; hạ boss là thắng ngay.',
    'Hệ thống binh đoàn: mở khóa thẻ mới, nâng cấp tối đa 5 cấp, chọn bộ bài 6 thẻ (tối đa 2 tướng).',
    'Chấm 1–3 sao cho từng trạm, khuyến khích đánh lại để hoàn hảo.',
    'Đồ họa 2D vẽ hoàn toàn bằng code (PixiJS): nhân vật cel-shading, chiến trường liền mạch, bản đồ chiến dịch minh họa, hiệu ứng kỹ năng riêng cho từng chiêu.',
    'Mỗi tài khoản một game riêng (Firebase Auth + Firestore); chơi được trên laptop và điện thoại (tối ưu iPhone 15); hỗ trợ tiếng Việt / tiếng Anh.',
  );
  table(
    ['Thông tin', 'Chi tiết'],
    [
      ['Thể loại', 'Chiến thuật công thành thời gian thực, đa làn đường (lane-based), kéo thả quân'],
      ['Nền tảng', 'Web (trình duyệt); bố cục thích ứng laptop và điện thoại'],
      ['Số lane', `${LANE_COUNT} lane mỗi trận`],
      ['Điều kiện thắng', 'Phá cờ đối phương ở 2/3 lane (hoặc hạ gục Boss ở trận cuối)'],
      ['Nội dung', `${STATIONS.length} trạm (4 trạm thường + 1 trạm Boss), 10 lính, 7 tướng, 1 boss`],
      ['Ngôn ngữ', 'Tiếng Việt, English (đổi trong Cài đặt)'],
      ['Lưu trữ', 'Firebase (tài khoản và tiến trình trên cloud) hoặc chế độ offline trong trình duyệt'],
    ],
    [2200, 7100],
  );
  img('shot-battle.png', 560, 'Màn hình chiến trận: 3 lane, tháp canh có cờ, thẻ bài ở dưới (lính xanh, tướng đỏ-vàng)');
  B.push({ k: 'break' });

  // 2
  h1('2. Bắt đầu nhanh');
  ol(
    'Mở game, chọn ngôn ngữ (VI/EN) ở góc phải trên cùng.',
    'Đăng ký: nhập tên đăng nhập (chữ không dấu, số, . _ -; tối thiểu 3 ký tự — không cần email) và mật khẩu từ 6 ký tự, hoặc đăng nhập nếu đã có tài khoản.',
    'Mỗi tài khoản có tiến trình riêng: bắt đầu với 150 xu, 4 lính cơ bản (Samurai, Cung thủ, Lính giáo, Lính khiên) và tướng Dương Quá.',
    'Ở tab Chiến dịch, chọn trạm đầu tiên rồi bấm "Ra trận".',
    'Trong trận: kéo thẻ vào lane để triển khai quân. Thắng trận để nhận xu, sao và mở khóa trạm tiếp theo.',
    'Ở tab Binh đoàn, dùng xu mở khóa/nâng cấp thẻ và sắp xếp bộ bài trước khi đánh trạm khó hơn.',
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
    `Cờ của bạn có ${PLAYER_FLAG_HP} máu; cờ địch có ${STATIONS[0].flagHp}–${STATIONS[STATIONS.length - 1].flagHp} máu tùy trạm.`,
    'Thanh máu cờ hiển thị dạng "hiện tại/tối đa" ngay dưới mỗi tháp canh.',
  );
  h2('3.2. Giao diện trong trận');
  table(
    ['Vị trí', 'Thành phần', 'Ý nghĩa'],
    [
      ['Trên-trái', 'Chân dung chỉ huy (bạn)', 'Tên, cấp độ (tính theo số trận thắng), nút Tạm dừng'],
      ['Trên-giữa', 'Bảng "Trạm n/5"', 'Đồng hồ trận đấu và 3 thanh trạng thái lane (xanh = bạn thắng, đỏ = địch thắng)'],
      ['Trên-phải', 'Chân dung chỉ huy địch', 'Tên trạm, cấp độ địch, nút tốc độ ×1 / ×2'],
      ['Giữa', 'Chiến trường 3 lane', 'Kéo thả thẻ vào lane; xem quân giao chiến; hai bên là tháp canh có cờ'],
      ['Dưới-trái', 'Bảng vàng', 'Vàng hiện có, tốc độ hồi vàng (+2,6/s) và mức tối đa (100)'],
      ['Dưới-giữa', 'Thẻ bài (lính rồi tướng)', 'Giá vàng ở góc trái, kéo thẻ vào lane; thẻ xám = chưa đủ vàng'],
      ['Dưới-phải', 'Đồng hồ lane (laptop)', 'Máu cờ ta/địch của từng lane theo thời gian thực'],
      ['Trên thẻ', 'Dòng mô tả', 'Chạm vào thẻ để xem tên, kỹ năng và mô tả'],
    ],
    [1600, 2700, 5000],
  );
  h2('3.3. Điều khiển');
  table(
    ['Thao tác', 'Cách làm'],
    [
      ['Kéo thả (khuyên dùng)', 'Giữ thẻ bài, kéo vào lane muốn triển khai rồi thả. Lane được tô vàng khi rê chuột/ngón tay qua.'],
      ['Chạm hai bước', 'Chạm thẻ để chọn, sau đó chạm vào lane. Thẻ vẫn được chọn nên có thể chạm liên tiếp để thả nhiều quân.'],
      ['Phím tắt (laptop)', '1–6: chọn thẻ theo thứ tự hiển thị · Q / W / E: thả vào lane 1 / 2 / 3 · Esc hoặc P: tạm dừng'],
      ['Tạm dừng', 'Nút ⏸ hoặc phím Esc: có thể đổi ngôn ngữ, tiếp tục hoặc rút lui trong menu tạm dừng'],
      ['Tốc độ', 'Nút ×1 / ×2 ở góc phải để tăng tốc trận đấu'],
    ],
    [2400, 6900],
  );
  h2('3.4. Vàng (tài nguyên trong trận)');
  ul(
    `Bắt đầu trận với ${PLAYER_START_GOLD} vàng, hồi ${f(PLAYER_INCOME)} vàng mỗi giây, tối đa ${GOLD_CAP}.`,
    'Triển khai quân tốn vàng (lính 9–30, tướng 45–75). Địch cũng có vàng riêng, thu nhập tăng dần theo trạm (1,9 → 3,2 vàng/giây); đầu trận địch vào chậm hơn một chút (vàng khởi điểm thấp, thu nhập tăng dần trong ~25 giây đầu).',
    'Mỗi tướng chỉ xuất hiện ở MỘT lane tại một thời điểm. Khi tướng chết hoặc lane của tướng đã kết thúc (thắng/thua), tướng biến khỏi chiến trường và nếu đủ vàng bạn có thể thả lại.',
    'Không đủ vàng: thanh vàng rung nhẹ, quân không được thả.',
  );
  h2('3.5. Hành vi quân đội');
  ul(
    'Quân tự động đi về phía cờ địch; gặp địch trong tầm đánh sẽ dừng lại giao chiến (ưu tiên đơn vị gần nhất phía trước).',
    'Hết địch thì tấn công cờ; đơn vị tầm xa có thể bắn cờ từ xa. Mỗi lane dài 1000 đơn vị; quân xuất hiện cách cờ nhà 45 đơn vị.',
    'Thứ tự ưu tiên: (1) địch phía trước trong tầm đánh, (2) cờ địch nếu đã sát cờ, (3) địch ở phía sau lưng trong tầm đánh, (4) tiếp tục tiến. Vì vậy quân đang đứng sát cờ vẫn tập trung phá cờ, còn quân mới thả ra ở phía sau sẽ quay lại đánh quân đang phá thành (áp dụng cho cả hai phe).',
    'Tầm đánh > 70 được tính là tầm xa (Lính khiên giảm 50% sát thương từ đòn tầm xa).',
    'Sát thương thực = sát thương × 100 / (100 + giáp), tối thiểu 1. Ví dụ giáp 18 giảm khoảng 15%.',
    'Mỗi lần kéo thả chỉ xuất hiện MỘT quân (một thanh máu). Rê chuột vào quân (hoặc chạm vào quân trên điện thoại) để xem cửa sổ thông tin gọn: tên, loại, máu hiện tại, chỉ số (sát thương, nhịp đánh, tốc độ, tầm, giáp) và mô tả kỹ năng. Rê chuột vào thẻ bài để xem thông tin tương tự theo cấp thẻ.',
    'Mỗi lần gây sát thương đều hiện con số sát thương nổi lên trên mục tiêu (đỏ khi quân ta bị đánh, trắng/vàng khi ta gây sát thương, xanh lục khi hồi máu).',
  );
  h2('3.6. Hết giờ (Overtime)');
  p(`Sau ${OVERTIME_AT} giây, cờ của cả hai bên bắt đầu tự sụp dần (khoảng 1,2% máu tối đa mỗi giây và tăng dần). Ở mỗi lane, bên nào còn nhiều phần trăm máu cờ hơn sẽ thắng lane khi cờ sụp. Cơ chế này tránh các trận hòa kéo dài; đồng hồ chuyển đỏ khi vào hết giờ.`);
  h2('3.7. Thưởng và sao');
  table(
    ['Kết quả', 'Xu nhận được'],
    [
      ['Thắng lần đầu', 'Toàn bộ thưởng của trạm (120 / 160 / 220 / 300 / 500 xu)'],
      ['Thắng lại', '50% thưởng của trạm'],
      ['Thua', '15% thưởng của trạm'],
    ],
    [3000, 6300],
  );
  table(
    ['Sao', 'Điều kiện'],
    [
      ['★', 'Chiến thắng trạm'],
      ['★★', 'Chiến thắng và không để địch thắng lane nào (2–0)'],
      ['★★★', `Chiến thắng 2–0 trong vòng ${FAST_WIN_SEC} giây`],
    ],
    [1600, 7700],
  );
  p('Sao được lưu lại theo từng trạm (giữ số sao cao nhất đã đạt) và hiển thị ngay trên bản đồ.');
  B.push({ k: 'break' });

  // 4
  h1('4. Chiến dịch & bản đồ trạm');
  p('Chiến dịch "Tam Lộ Công Thành" gồm 5 trạm đi từ Thành Xuất Phát (góc dưới) tới Thành Địch (góc trên). Các trạm hiển thị trên một bản đồ minh họa: mỗi trạm có cờ, nhãn "1-n", số sao đạt được; trạm Boss có huy hiệu riêng. Trạm chưa mở bị khóa; chiếm trạm trước đó để mở trạm kế tiếp.');
  img('shot-map.png', 560, 'Bản đồ trạm và bảng thông tin trạm bên phải (phần thưởng, điều kiện thắng, mục tiêu sao, quân địch)');
  table(
    ['Trạm', 'Tên', 'Địa hình', 'Quân địch', 'Sức mạnh', 'Thu nhập', 'Máu cờ', 'Thưởng'],
    STATIONS.map((s, i) => [
      `1-${i + 1}`, s.name + (s.boss ? ' (Boss)' : ''),
      ({ plains: 'Đồng bằng', bamboo: 'Rừng trúc', stone: 'Núi đá', castle: 'Thành lũy', throne: 'Hoàng thành' } as const)[s.theme],
      s.deck.map((id) => UNITS[id].name).join(', '), `×${s.power}`, `${s.income}/s`, String(s.flagHp), `${s.reward} xu`,
    ]),
    [650, 1550, 1100, 2750, 750, 800, 650, 1050],
  );
  p('"Sức mạnh" là hệ số nhân máu và sát thương của quân địch. Quân của bạn nhân theo cấp thẻ (xem mục 5).', { italic: true });
  STATIONS.forEach((s, i) => {
    h3(`Trạm 1-${i + 1}: ${s.name} — ${s.subtitle}`);
    p(s.desc);
  });
  img('shot-boss.png', 560, 'Trạm cuối: Hoàng Thành, Boss Đổng Trác dưới trăng máu');
  B.push({ k: 'break' });

  // 5
  h1('5. Binh đoàn: bộ bài, mở khóa, nâng cấp');
  ul(
    `Bộ bài ra trận gồm tối đa ${DECK_SIZE} thẻ, trong đó tối đa ${MAX_GENERALS_IN_DECK} tướng; tối thiểu 1 thẻ.`,
    'Mở khóa thẻ bằng xu (giá mỗi loại ở phần danh sách lính/tướng). Thẻ mới mở ở cấp 1.',
    `Nâng cấp tối đa ${MAX_LEVEL} cấp: mỗi cấp tăng 12% máu và 12% sát thương (kể cả sát thương kỹ năng, hồi máu...) so với cấp 1. Cấp 5 = +48%.`,
    'Giá nâng cấp: lính = 60 × cấp hiện tại; tướng = 140 × cấp hiện tại (ví dụ lính từ cấp 2 lên 3 tốn 120 xu).',
    'Trong trận, thẻ hiển thị theo thứ tự: lính trước, tướng sau; thẻ lính nền xanh, thẻ tướng nền đỏ thẫm viền vàng với chân dung lớn.',
  );
  table(
    ['Cấp', 'Hệ số máu/sát thương', 'Giá lên cấp (lính)', 'Giá lên cấp (tướng)'],
    [1, 2, 3, 4, 5].map((lv) => [
      String(lv), `×${levelMul(lv).toFixed(2)}`,
      lv < MAX_LEVEL ? `${upgradeCost(UNITS.samurai, lv)} xu` : '—', lv < MAX_LEVEL ? `${upgradeCost(UNITS.duongqua, lv)} xu` : '—',
    ]),
    [1200, 2800, 2650, 2650],
  );
  img('shot-army.png', 560, 'Tab Binh đoàn: bộ bài ra trận, danh sách lính, mở khóa và nâng cấp');
  img('shot-army-generals.png', 560, 'Danh sách tướng');
  B.push({ k: 'break' });

  // 6
  h1('6. Danh sách lính (10 loại)');
  p('Chỉ số bên dưới là chỉ số gốc ở cấp 1. "Tốc độ đánh" là số giây giữa hai đòn; "DPS" là sát thương mỗi giây ước tính.');
  for (const u of UNIT_LIST.filter((x) => x.kind === 'troop')) unitCard(u);
  B.push({ k: 'break' });

  // 7
  h1('7. Danh sách tướng (7 vị)');
  p('Tướng mạnh hơn lính nhiều nhưng đắt (45–75 vàng) và chỉ có một bản trên chiến trường (xem mục 3.4). Tướng có tên hiển thị trên đầu và vòng sáng vàng dưới chân.');
  for (const u of UNIT_LIST.filter((x) => x.kind === 'general')) unitCard(u);
  note('Phối hợp đặc biệt', 'Tiểu Long Nữ chỉ phát huy hồi máu khi đi cùng Dương Quá trong cùng lane (cách nhau ≤ 170 đơn vị). Triệu Vân và Lữ Bố cưỡi ngựa nên rất nhanh; Trương Phi càng đánh càng cứng; Gia Cát Lượng là nguồn sát thương xuyên giáp.');
  B.push({ k: 'break' });

  // 8
  h1('8. Boss cuối: Đổng Trác');
  unitCard(UNITS.dongtrac);
  ul(
    'Xuất hiện ngay từ đầu trận tại một lane ngẫu nhiên phía địch, tiến chậm (tốc độ 20) nhưng rất trâu (2.600 máu, giáp 16).',
    'Cứ 9 giây triệu hồi 2 Samurai chặn đường; dưới 50% máu sẽ nổi điên (+40% sát thương, +40% tốc độ).',
    'Hạ gục Đổng Trác là chiến thắng ngay lập tức, bất kể số lane đã thắng.',
    'Gợi ý: dồn tướng xuyên giáp (Gia Cát Lượng), Lữ Bố/Quan Vũ vào lane của boss, các lane còn lại cầm cự bằng Lính khiên + Y sư.',
  );
  B.push({ k: 'break' });

  // 9
  h1('9. Tổng hợp chiêu thức và hiệu ứng');
  p('Mỗi kỹ năng đều có hiệu ứng hình ảnh riêng để người chơi nhận biết ngay trong trận (đã chụp trong ảnh dưới).');
  table(
    ['Chiêu thức', 'Chủ sở hữu', 'Chu kỳ / điều kiện', 'Hiệu ứng thực tế', 'Hiệu ứng hình ảnh'],
    [
      ['Hãn Thiên Chưởng', 'Dương Quá', 'Mỗi 10 giây (khi có địch/cờ trong tầm 170)', '170 sát thương diện rộng phía trước', 'Sóng chưởng vàng, bàn tay khổng lồ, nứt đất'],
      ['Ngọc Nữ Tâm Kinh', 'Tiểu Long Nữ', 'Mỗi 5 giây (khi có Dương Quá ≤ 170)', 'Hồi 50 máu cho cả hai', 'Tim hồng, cánh hoa, ruy băng nối hai người'],
      ['Cương Thể', 'Trương Phi', 'Mỗi lần hạ địch', '+2 giáp (lính) / +5 giáp (tướng, boss)', 'Gợn thép, hào quang xanh thép tăng dần'],
      ['Thanh Long Trảm', 'Quan Vũ', 'Mỗi đòn thứ 3', '×1,8 sát thương, quét diện rộng', 'Vệt trăng khuyết xanh ngọc'],
      ['Thất Tiến Thất Xuất', 'Triệu Vân', 'Chết lần đầu / mỗi lần hạ địch', 'Hồi sinh 50% máu + bất tử 1,5s; hồi 12% máu mỗi mạng', 'Cột sáng vàng, đôi cánh, tia sáng bay lên'],
      ['Hỏa Thiêu Chiến Thuyền', 'Gia Cát Lượng', 'Mỗi 8 giây', '130 sát thương xuyên giáp lên cụm địch đông nhất', 'Mưa tên lửa rồi cột lửa bùng lên'],
      ['Vô Song', 'Lữ Bố', 'Mỗi đòn đánh', '60% sát thương lan bán kính 60', 'Vòng sóng đỏ cam, tia chém chữ X'],
      ['Bạo Chúa', 'Đổng Trác', 'Triệu hồi mỗi 9s; dưới 50% máu', '2 Samurai; +40% sát thương/tốc độ', 'Ma trận tím + cột sáng; ngọn lửa đỏ khi nổi điên'],
      ['Xung Phong', 'Kỵ sĩ', 'Đòn đầu tiên', '×(1 + quãng đường/120), tối đa ×5', 'Vệt tốc độ khi chạy, sao nổ vàng khi va chạm'],
      ['Tự Bạo', 'Tử sĩ', 'Khi chạm địch/cờ', '90 sát thương lan (×3 lên cờ)', 'Quả cầu lửa, khói, tia lửa, rung màn hình'],
      ['Công Thành', 'Máy ném đá', 'Mỗi 3 giây', '38 sát thương lan 55; cờ ×2,5', 'Đá bay theo vòng cung, bụi và mảnh vỡ'],
      ['Diệu Thủ', 'Y sư', 'Mỗi 2 giây', 'Hồi 15 máu bán kính 120', 'Vòng sóng xanh lục, dấu cộng và tia sáng bay lên'],
      ['Ảnh Thân', 'Ninja', 'Bị đánh đơn mục tiêu', '30% né; phá cờ ×2', 'Chữ "Né!"'],
    ],
    [1650, 1200, 1900, 2350, 2200],
  );
  img('shot-skills.png', 560, 'Hiệu ứng: Hãn Thiên Chưởng (lane trên), Hỏa Thiêu (lane giữa), Thanh Long Trảm + Hồi sinh (lane dưới)');
  img('shot-skills2.png', 560, 'Hiệu ứng: Tâm Kinh (tim), Triệu hồi của Đổng Trác (ma trận tím), Tự bạo, Xung phong');
  B.push({ k: 'break' });

  // 10
  h1('10. Chiến thuật, khắc chế và mẹo');
  h2('10.1. Bảng khắc chế nhanh');
  table(
    ['Đối thủ', 'Nên dùng', 'Vì sao'],
    [
      ['Kỵ sĩ', 'Lính giáo, Lính khiên', 'Giáo ×2,2 sát thương lên kỵ binh; khiên chặn đường xung phong'],
      ['Cung thủ / Máy ném đá', 'Kỵ sĩ, Ninja, Tử sĩ', 'Áp sát nhanh để tiêu diệt máu giấy'],
      ['Lính khiên / Trương Phi', 'Gia Cát Lượng (xuyên giáp), Tử sĩ', 'Xuyên giáp và sát thương lan bỏ qua ưu thế giáp'],
      ['Ninja (né 30%)', 'Máy ném đá, Tử sĩ, chưởng/trảm', 'Sát thương lan không bị né'],
      ['Đám lính tụ tập', 'Dương Quá, Quan Vũ, Lữ Bố, Tử sĩ', 'Sát thương diện rộng'],
      ['Y sư địch', 'Ninja, Cung thủ', 'Mỏng máu, hạ trước để phá hồi máu'],
      ['Đổng Trác', 'Lữ Bố, Quan Vũ, Gia Cát Lượng', 'Giáp 16 và 2.600 máu: cần sát thương cao/xuyên giáp'],
    ],
    [2300, 2900, 4100],
  );
  h2('10.2. Lời khuyên');
  ul(
    'Đừng thả hết vàng cùng lúc: giữ lại 20–30 vàng để phản ứng khi địch dồn quân sang lane khác.',
    'Chỉ cần thắng 2/3 lane: có thể bỏ một lane (thua) để dồn lực thắng hai lane còn lại.',
    'Kỵ sĩ nên thả khi lane còn trống để chạy được quãng đường dài (bonus tới ×5).',
    'Đặt Lính khiên phía trước, Cung thủ/Máy ném đá phía sau; thêm Y sư để kéo dài giao tranh.',
    'Tướng là con bài tẩy: dùng đúng lúc lane sắp vỡ hoặc để kết thúc nhanh (thắng nhanh để đạt 3 sao).',
    'Dùng xu nâng cấp thẻ chủ lực thay vì mở rộng quá nhiều thẻ; ưu tiên Lính khiên, Samurai, tướng chủ lực.',
    'Sau mỗi trạm, kiểm tra tab Binh đoàn: trạm sau luôn mạnh hơn (hệ số quân địch ×1,0 → ×1,2 và nhiều loại quân hơn).',
  );
  B.push({ k: 'break' });

  // 11
  h1('11. Đồ họa, hoạt ảnh và đa ngôn ngữ');
  h2('11.1. Đồ họa');
  ul(
    'Nhân vật vẽ bằng code theo phong cách chibi cel-shading: viền đậm theo màu gốc, mảng sáng/tối cứng, mắt to; mỗi nhân vật có trang phục, mũ và vũ khí riêng; kỵ binh có ngựa; Máy ném đá có bánh xe quay.',
    'Vòng màu dưới chân giúp phân biệt phe: xanh dương = quân ta, đỏ = quân địch; tướng có thêm vòng vàng, boss có vòng đỏ.',
    'Chiến trường là một bức toàn cảnh liền mạch: núi đá vôi có thác, cổ thành, sông, hoa anh đào; 3 lane là các con đường đất ngăn bằng hàng rào gỗ; lane gần người xem hơi lớn hơn tạo chiều sâu. Mỗi trạm có chủ đề riêng: đồng bằng, rừng trúc, núi đá tuyết, thành hoàng hôn, hoàng thành trăng máu.',
    'Tháp canh kiểu chùa có mái cong, đèn lồng, cờ dài đổi màu theo phe; khi cờ sụp, tháp đổ, bốc khói và lửa.',
    'Bản đồ chiến dịch vẽ riêng cho từng kích thước màn hình (ngang cho laptop, dọc cho điện thoại).',
  );
  h2('11.2. Hoạt ảnh');
  ul(
    'Nhân vật: hít thở, đung đưa khi đi, nghiêng người khi chạy, vung vũ khí theo từng loại (chém, đâm, bắn, niệm phép), giật lùi và bẹp khi bị đánh, bật nảy khi xuất hiện, ngã xuống khi chết, bụi chân.',
    'Bối cảnh: mây trôi, chim (dơi ở màn cuối) đập cánh, quầng sáng mặt trời/trăng thở nhẹ, cỏ và hoa đung đưa, cánh hoa/lá/đom đóm/tàn lửa bay, ánh nắng, nước lấp lánh, đuốc/đèn lồng chập chờn, cờ bay.',
    'Hiệu ứng: số sát thương nảy lên, vệt chém, tên/đá/phép có vệt đuôi, rung màn hình khi va chạm mạnh, pháo giấy khi thắng lane.',
  );
  h2('11.3. Đa ngôn ngữ');
  p('Có thể chuyển giữa tiếng Việt và tiếng Anh ở: màn hình đăng nhập (nút VI/EN), Cài đặt (⚙) trong màn hình chính và menu Tạm dừng khi đang chơi. Lựa chọn được ghi nhớ trên trình duyệt; lần đầu mở game, ngôn ngữ chọn theo trình duyệt. Tên lính/tướng, mô tả kỹ năng, tên trạm và chữ nổi trong trận đều được dịch (tên tướng tiếng Anh dùng phiên âm Pinyin như Yang Guo, Zhang Fei...).');
  img('shot-mobile-battle.png', 300, 'Giao diện điện thoại (iPhone 15): thẻ bài thu nhỏ, bảng vàng, chỉ huy ở trên');
  B.push({ k: 'break' });

  // 12
  h1('12. Thông tin kỹ thuật & triển khai');
  table(
    ['Hạng mục', 'Chi tiết'],
    [
      ['Ngôn ngữ', 'TypeScript'],
      ['Đồ họa', 'PixiJS 8 (2D, vẽ bằng code, cache bằng texture); giao diện menu bằng HTML/CSS'],
      ['Công cụ build', 'Vite'],
      ['Tài khoản & lưu trữ', 'Firebase Authentication (Email/Password, tên đăng nhập quy đổi thành email nội bộ) và Firestore (tài liệu saves/{uid})'],
      ['Triển khai', 'Vercel (build "npm run build", thư mục "dist"); thêm biến môi trường VITE_FIREBASE_* và thêm domain vào Authorized domains của Firebase'],
      ['Bảo mật dữ liệu', 'Firestore Rules chỉ cho chủ tài khoản đọc/ghi save của mình; logic game chạy ở client (phù hợp game cá nhân, chưa chống gian lận)'],
      ['Thiết bị', 'Laptop và điện thoại, tối ưu iPhone 15 (vùng an toàn, kéo thả bằng cảm ứng)'],
    ],
    [2300, 7000],
  );
  h3('Cấu trúc thư mục');
  ul(
    'src/data: số liệu lính, tướng, boss, trạm',
    'src/game: lõi mô phỏng trận đấu (sim.ts), AI địch (ai.ts), thưởng và sao (rewards.ts)',
    'src/render: nhân vật (unitArt.ts), chiến trường (scenery.ts, battleView.ts), hiệu ứng kỹ năng (vfx.ts), địa danh (landmarks.ts), bản đồ (mapArt.ts)',
    'src/ui: đăng nhập, bản đồ & binh đoàn, trận đấu, cài đặt',
    'src/backend: Firebase, chế độ offline, định dạng dữ liệu save',
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
      String(u.speed), u.range ? String(u.range) : '—', String(u.armor), u.kind === 'boss' ? '—' : u.unlockCost === 0 ? 'Có sẵn' : `${u.unlockCost} xu`,
    ]),
    [1450, 650, 550, 650, 850, 700, 650, 750, 600, 650, 1000],
  );
  p('Ghi chú: Y sư không có sát thương (hồi máu); Tử sĩ "sát thương" là sức nổ.', { italic: true });
  h1('Phụ lục B: thuật ngữ');
  table(
    ['Thuật ngữ', 'Ý nghĩa'],
    [
      ['Lane', 'Một làn đường chiến đấu độc lập; mỗi trận có 3 lane'],
      ['Cờ / Tháp canh', 'Mục tiêu phá hủy của mỗi lane; có máu riêng'],
      ['Trạm', 'Một màn chơi của chiến dịch (1-1 đến 1-5)'],
      ['Thẻ', 'Một loại lính hoặc tướng có thể mang vào trận'],
      ['Bộ bài', 'Tập tối đa 6 thẻ (≤ 2 tướng) mang vào trận'],
      ['Xu', 'Tiền ngoài trận: mở khóa/nâng cấp thẻ'],
      ['Vàng', 'Tiền trong trận: triển khai quân; hồi theo thời gian'],
      ['Giáp', 'Giảm sát thương nhận theo công thức 100 / (100 + giáp)'],
      ['Xuyên giáp', 'Bỏ qua giáp của mục tiêu (phép của Gia Cát Lượng)'],
      ['Sát thương lan (AoE)', 'Gây sát thương lên nhiều mục tiêu trong một vùng'],
      ['Tầm xa', 'Đơn vị có tầm đánh > 70'],
      ['Overtime (hết giờ)', `Sau ${OVERTIME_AT} giây cờ hai bên tự sụp dần`],
    ],
    [2400, 6900],
  );
}

function unitCard(u: UnitDef) {
  const sk = SKILL_DETAIL[u.skill] ?? SKILL_DETAIL.none;
  const lines: [string, string][] = [
    ['Chỉ số', `Máu ${u.hp} · Sát thương ${u.dmg || '—'} · Nhịp ${f(u.cd, 2)}s (DPS ${dps(u)}) · Tốc độ ${u.speed} · Tầm ${rangeText(u)} · Giáp ${u.armor}`],
    ['Giá', u.kind === 'boss' ? 'Không thể triển khai (đối thủ)' : `Triển khai ${u.cost} vàng · ${u.unlockCost === 0 ? 'Có sẵn từ đầu' : `Mở khóa ${u.unlockCost} xu`}`],
    [`Kỹ năng: ${u.skillName}`, sk.effect.replace(new RegExp('^' + u.skillName + ':\\s*', 'iu'), '')],
    ['Thông số', sk.numbers],
    ['Cách dùng', sk.tip],
  ];
  if (sk.counter !== '—') lines.push(['Điểm yếu', sk.counter]);
  B.push({ k: 'card', img: `${u.id}_full.png`, title: u.name, sub: `${kindName(u)} · ${UNIT_STORY[u.id]}`, lines, accent: u.kind === 'troop' ? '3D6FB0' : u.kind === 'general' ? 'B8860B' : 'A02020' });
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
