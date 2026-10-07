import type { Notice } from './backend/types';
import { state } from './state';

/** Thông báo của người chơi đang đăng nhập (mới nhất trước) và danh sách đã đọc (lưu cục bộ theo tài khoản) */
export const inbox: { list: Notice[] } = { list: [] };
const seenKey = () => `empire.seen.${state.user?.uid ?? ''}`;

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(seenKey()) || '[]') as string[]);
  } catch {
    return new Set();
  }
}

export const unread = (): Notice[] => {
  const seen = readSeen();
  return inbox.list.filter((n) => !seen.has(n.id));
};

export function markAllRead() {
  const seen = readSeen();
  for (const n of inbox.list) seen.add(n.id);
  try {
    localStorage.setItem(seenKey(), JSON.stringify([...seen]));
  } catch {
    /* bỏ qua */
  }
}

export const isUnread = (id: string) => !readSeen().has(id);

export async function loadNotices(): Promise<void> {
  const { backend, user } = state;
  if (!backend || !user) return;
  inbox.list = await backend.listNotices(user.uid);
}
