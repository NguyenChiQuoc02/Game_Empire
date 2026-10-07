import { STARTERS, DECK_SIZE, UNITS } from '../data/units';
import { STATIONS } from '../data/campaign';
import type { SaveData } from './types';

export function newSave(name: string): SaveData {
  const unlocked: Record<string, number> = {};
  for (const id of STARTERS) unlocked[id] = 1;
  return {
    v: 1,
    name,
    coins: 150,
    unlocked,
    deck: [...STARTERS].slice(0, DECK_SIZE),
    progress: 0,
    cleared: STATIONS.map(() => false),
    stars: STATIONS.map(() => 0),
    wins: 0,
    losses: 0,
    updatedAt: Date.now(),
  };
}

/** Làm sạch dữ liệu đọc từ server (thiếu field, id cũ đã bị xóa...) */
export function normalizeSave(raw: Partial<SaveData> | null, name: string): SaveData {
  const base = newSave(name);
  if (!raw) return base;
  const unlocked: Record<string, number> = {};
  for (const [id, lv] of Object.entries(raw.unlocked ?? base.unlocked)) {
    if (UNITS[id] && UNITS[id].kind !== 'boss') unlocked[id] = Math.max(1, Math.min(5, Number(lv) || 1));
  }
  for (const id of STARTERS) unlocked[id] ??= 1;
  const deck = (raw.deck ?? base.deck).filter((id, i, a) => unlocked[id] && a.indexOf(id) === i).slice(0, DECK_SIZE);
  const cleared = STATIONS.map((_, i) => !!raw.cleared?.[i]);
  return {
    v: 1,
    name: raw.name || name,
    coins: Math.max(0, Number(raw.coins) || 0),
    unlocked,
    deck: deck.length ? deck : base.deck,
    progress: Math.max(0, Math.min(STATIONS.length - 1, Number(raw.progress) || 0)),
    cleared,
    stars: STATIONS.map((_, i) => Math.max(0, Math.min(3, Number(raw.stars?.[i]) || (cleared[i] ? 1 : 0)))),
    wins: Number(raw.wins) || 0,
    losses: Number(raw.losses) || 0,
    updatedAt: Number(raw.updatedAt) || Date.now(),
    rev: Math.max(0, Number(raw.rev) || 0),
  };
}

/**
 * Gộp save của thiết bị này (`local`) vào bản trên server (`remote`) khi thiết bị khác đã ghi trước.
 * Tiến trình chỉ tăng (màn đã qua, sao, cấp thẻ, thắng/thua); xu cộng phần chênh lệch kể từ lần đồng bộ cuối;
 * bộ bài lấy theo thiết bị này (thao tác mới nhất của người chơi).
 */
export function mergeSaves(remote: SaveData, local: SaveData, baseCoins: number): SaveData {
  const unlocked = { ...remote.unlocked };
  for (const [id, lv] of Object.entries(local.unlocked)) unlocked[id] = Math.max(unlocked[id] ?? 0, lv);
  return normalizeSave(
    {
      ...local,
      unlocked,
      deck: local.deck.filter((id) => unlocked[id]),
      coins: remote.coins + (local.coins - baseCoins),
      progress: Math.max(remote.progress, local.progress),
      cleared: STATIONS.map((_, i) => !!(remote.cleared[i] || local.cleared[i])),
      stars: STATIONS.map((_, i) => Math.max(remote.stars[i] ?? 0, local.stars[i] ?? 0)),
      wins: Math.max(remote.wins, local.wins),
      losses: Math.max(remote.losses, local.losses),
      updatedAt: Math.max(remote.updatedAt, local.updatedAt),
      rev: remote.rev,
    },
    local.name,
  );
}
