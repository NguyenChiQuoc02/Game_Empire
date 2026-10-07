import { mergeSaves, normalizeSave } from './backend/save';
import type { AuthUser, Backend, SaveBase, SaveData } from './backend/types';

export const state: { backend: Backend | null; user: AuthUser | null; save: SaveData | null } = {
  backend: null,
  user: null,
  save: null,
};

/** 'merged': dữ liệu trên màn hình vừa đổi vì gộp với thiết bị khác, UI nên vẽ lại */
type SaveStatus = 'saving' | 'saved' | 'merged' | 'error';
const statusListeners = new Set<(s: SaveStatus, detail?: string) => void>();
export const onSaveStatus = (fn: (s: SaveStatus, detail?: string) => void) => {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
};
const notify = (s: SaveStatus, d?: string) => statusListeners.forEach((fn) => fn(s, d));

let timer: ReturnType<typeof setTimeout> | undefined;
let inflight: Promise<void> = Promise.resolve();
/** Phiên bản + xu của save ở lần đồng bộ cuối với server */
let base: SaveBase = { rev: 0, coins: 0 };

/** Gọi sau khi nạp save từ server (hoặc tạo mới) */
export function setBase(s: SaveData) {
  base = { rev: s.rev ?? 0, coins: s.coins };
}

async function writeNow() {
  const { backend, user, save } = state;
  if (!backend || !user || !save) return;
  save.updatedAt = Date.now();
  notify('saving');
  const sentCoins = save.coins;
  try {
    const out = await backend.writeSave(user.uid, save, base);
    // Có thể thiết bị khác đã ghi trước (hoặc người chơi vừa đổi thêm trong lúc ghi): gộp lại vào bản đang dùng
    const merged = mergeSaves(out, save, sentCoins);
    const changed = JSON.stringify({ ...merged, rev: 0, updatedAt: 0 }) !== JSON.stringify({ ...save, rev: 0, updatedAt: 0 });
    Object.assign(save, merged);
    base = { rev: out.rev ?? 0, coins: out.coins };
    notify(changed ? 'merged' : 'saved');
  } catch (e) {
    console.error('save failed', e);
    notify('error', (e as Error)?.message);
  }
}

/** Sửa dữ liệu save và lưu (gộp các lần ghi liên tiếp) */
export function mutate(fn: (s: SaveData) => void, immediate = false) {
  if (!state.save) return;
  fn(state.save);
  clearTimeout(timer);
  timer = undefined;
  if (immediate) {
    inflight = inflight.then(writeNow);
  } else {
    timer = setTimeout(() => {
      timer = undefined;
      inflight = inflight.then(writeNow);
    }, 700);
  }
}

export function flush(): Promise<void> {
  clearTimeout(timer);
  timer = undefined;
  inflight = inflight.then(writeNow);
  return inflight;
}

/**
 * Lấy bản mới nhất từ server (vd. vừa chơi xong ở thiết bị khác rồi quay lại tab này).
 * Bỏ qua nếu đang có thay đổi chưa lưu. Trả về true nếu dữ liệu trên màn hình đã đổi.
 */
export async function refresh(): Promise<boolean> {
  await inflight;
  const { backend, user, save } = state;
  if (!backend || !user || !save || timer) return false;
  const raw = await backend.loadSave(user.uid);
  if (!raw || timer || state.save !== save || (raw.rev ?? 0) <= base.rev) return false;
  Object.assign(save, normalizeSave(raw, save.name));
  base = { rev: save.rev ?? 0, coins: save.coins };
  return true;
}
