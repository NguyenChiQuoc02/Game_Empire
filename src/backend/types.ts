export interface SaveData {
  v: 1;
  name: string;
  coins: number;
  /** id thẻ -> cấp độ (có mặt = đã mở khóa) */
  unlocked: Record<string, number>;
  deck: string[];
  /** bộ đồ phòng thủ mang vào trận (tối đa 3) */
  defDeck: string[];
  /** trạm cao nhất đã mở (0..STATIONS.length-1) */
  progress: number;
  cleared: boolean[];
  /** số sao (0..3) từng trạm */
  stars: number[];
  wins: number;
  losses: number;
  updatedAt: number;
  /** số ô bộ bài mở thêm (0..3, ngoài 6 ô gốc) */
  deckSlots?: number;
  /** số ô bộ đồ phòng thủ mở thêm (0..2, ngoài 3 ô gốc) */
  defSlots?: number;
  /** cấp nâng cấp máu thành trì (0..10) */
  flagLv?: number;
  /** phiên bản bố cục trạm (2 = 3 bản đồ x 10 trạm) */
  sv?: number;
  /** Số phiên bản trên server, tăng mỗi lần ghi; dùng để phát hiện thiết bị khác đã ghi trước */
  rev?: number;
}

/** Trạng thái save lần cuối đã đồng bộ với server */
export interface SaveBase {
  rev: number;
  coins: number;
}

/** Trạng thái khóa tài khoản do admin đặt */
export interface Account {
  locked: boolean;
  reason?: string;
}

/** Thông báo của admin gửi tới toàn bộ hoặc một số người chơi */
export interface Notice {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  to: 'all' | 'users';
  /** uid người nhận khi to = 'users' (luôn có, rỗng nếu gửi tất cả) */
  uids: string[];
  /** tên hiển thị của người nhận (chỉ để admin xem lại) */
  names?: string[];
}

export interface AuthUser {
  uid: string;
  name: string;
}

export interface Backend {
  kind: 'firebase' | 'local';
  /** Gọi cb khi trạng thái đăng nhập đổi (kể cả lần khôi phục phiên đầu tiên) */
  onAuth(cb: (u: AuthUser | null) => void): void;
  register(username: string, password: string): Promise<void>;
  login(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
  loadSave(uid: string): Promise<SaveData | null>;
  /** Ghi save; nếu thiết bị khác đã ghi sau `base` thì gộp rồi trả về bản đã gộp (kèm rev mới) */
  writeSave(uid: string, data: SaveData, base: SaveBase): Promise<SaveData>;
  /** Trạng thái khóa của tài khoản (lỗi đọc = coi như không khóa) */
  getAccount(uid: string): Promise<Account>;
  /** Thông báo dành cho người chơi này (gửi tất cả + gửi riêng), mới nhất trước */
  listNotices(uid: string): Promise<Notice[]>;
}

/** `key` là khóa i18n (err.*) để UI dịch theo ngôn ngữ hiện tại */
export class AuthError extends Error {
  constructor(public key: string, public detail?: string) {
    super(key);
  }
}
