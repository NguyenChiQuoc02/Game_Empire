export interface SaveData {
  v: 1;
  name: string;
  coins: number;
  /** id thẻ -> cấp độ (có mặt = đã mở khóa) */
  unlocked: Record<string, number>;
  deck: string[];
  /** trạm cao nhất đã mở (0..STATIONS.length-1) */
  progress: number;
  cleared: boolean[];
  /** số sao (0..3) từng trạm */
  stars: number[];
  wins: number;
  losses: number;
  updatedAt: number;
  /** Số phiên bản trên server, tăng mỗi lần ghi; dùng để phát hiện thiết bị khác đã ghi trước */
  rev?: number;
}

/** Trạng thái save lần cuối đã đồng bộ với server */
export interface SaveBase {
  rev: number;
  coins: number;
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
}

/** `key` là khóa i18n (err.*) để UI dịch theo ngôn ngữ hiện tại */
export class AuthError extends Error {
  constructor(public key: string, public detail?: string) {
    super(key);
  }
}
