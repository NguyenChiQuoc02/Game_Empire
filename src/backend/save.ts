import { STARTERS, STARTER_DEFENSES, STARTER_PETS, STARTER_POSTS, POST_DECK_SIZE, isPost, DECK_SIZE, DEFENSE_DECK_SIZE, PET_DECK_SIZE, DECK_EXTRA_COSTS, DEF_EXTRA_COSTS, PET_EXTRA_COSTS, GENERAL_EXTRA_COSTS, MAX_GENERALS_IN_DECK, INCOME_MAX_LV, UNITS } from '../data/units';
import { STATIONS } from '../data/campaign';
import { maxLevelOf } from '../data/gskills';
import { SIEGE_WAVE_COUNT } from '../data/siege';
import { EXPLORE_MAPS, exploreKey, type ExploreState } from '../data/explore';
import type { SaveData } from './types';

/** v2: bố cục 3 bản đồ x 10 trạm (tiến trình trạm của bản cũ không còn khớp nên được đặt lại) */
export const STATION_LAYOUT_VERSION = 2;

/** số ô bộ bài / bộ đồ phòng thủ hiện có (gốc + đã mở thêm) */
export const deckSizeOf = (s: Pick<SaveData, 'deckSlots'>) => DECK_SIZE + (s.deckSlots ?? 0);
export const defSizeOf = (s: Pick<SaveData, 'defSlots'>) => DEFENSE_DECK_SIZE + (s.defSlots ?? 0);
/** số tướng tối đa (mang vào trận và cùng lúc trên chiến trường) */
export const generalCapOf = (s: Pick<SaveData, 'genSlots'>) => MAX_GENERALS_IN_DECK + (s.genSlots ?? 0);
export const petSizeOf = (s: Pick<SaveData, 'petSlots'>) => PET_DECK_SIZE + (s.petSlots ?? 0);

/** Firestore không nhận giá trị undefined: bỏ các khóa không có giá trị */
function cleanExplore(x: ExploreState): ExploreState {
  const out: ExploreState = { cap: x.cap, temp: x.temp === 'fire' ? 'fire' : 'ice', claim: x.claim ?? Date.now() };
  if (x.done) out.done = true;
  if (x.run) out.run = x.run;
  return out;
}

/** làm sạch tiến trình Khám phá: chỉ giữ bản đồ hợp lệ, chỉ số trạm trong khoảng, nhiệt độ hợp lệ */
function normalizeExplore(raw: Record<string, Partial<ExploreState>> | undefined): Record<string, ExploreState> {
  const out: Record<string, ExploreState> = {};
  for (const m of EXPLORE_MAPS) {
    const r = raw?.[exploreKey(m.n)];
    if (!r || !Array.isArray(r.cap)) continue;
    const cap = [...new Set(r.cap.map((x) => Math.floor(Number(x))).filter((x) => x >= 0 && x < m.nodes))];
    if (!cap.includes(0)) cap.unshift(0);
    out[exploreKey(m.n)] = cleanExplore({ cap, done: !!r.done, temp: r.temp, claim: Number(r.claim) || Date.now(), run: Math.max(0, Math.min(1e6, Math.floor(Number(r.run) || 0))) });
  }
  return out;
}

/** gộp tiến trình Khám phá của hai thiết bị: trạm đã chiếm hợp lại, đã hoàn thành nếu bên nào hoàn thành */
function mergeExplore(a: SaveData['explore'], b: SaveData['explore']): Record<string, ExploreState> {
  const out: Record<string, ExploreState> = {};
  for (const m of EXPLORE_MAPS) {
    const k = exploreKey(m.n);
    const x = a?.[k];
    const y = b?.[k];
    if (!x && !y) continue;
    // một bên đã chơi lại bản đồ (run lớn hơn): lấy nguyên tiến trình của bên đó
    if (x && y && (x.run ?? 0) !== (y.run ?? 0)) {
      out[k] = cleanExplore((y.run ?? 0) > (x.run ?? 0) ? y : x);
      continue;
    }
    out[k] = cleanExplore({ cap: [...new Set([...(x?.cap ?? []), ...(y?.cap ?? [])])], done: !!(x?.done || y?.done), temp: (y ?? x)!.temp, claim: Math.max(x?.claim ?? 0, y?.claim ?? 0), run: (y ?? x)!.run });
  }
  return out;
}

export function newSave(name: string): SaveData {
  const unlocked: Record<string, number> = {};
  for (const id of [...STARTERS, ...STARTER_DEFENSES, ...STARTER_PETS, ...STARTER_POSTS]) unlocked[id] = 1;
  return {
    v: 1,
    name,
    coins: 150,
    unlocked,
    deck: [...STARTERS].slice(0, DECK_SIZE),
    defDeck: [...STARTER_DEFENSES].slice(0, DEFENSE_DECK_SIZE),
    petDeck: [...STARTER_PETS].slice(0, PET_DECK_SIZE),
    postDeck: [...STARTER_POSTS].slice(0, POST_DECK_SIZE),
    progress: 0,
    cleared: STATIONS.map(() => false),
    stars: STATIONS.map(() => 0),
    wins: 0,
    losses: 0,
    updatedAt: Date.now(),
    deckSlots: 0,
    defSlots: 0,
    petSlots: 0,
    genSlots: 0,
    flagLv: 0,
    incomeLv: 0,
    siegeBest: 0,
    explore: {},
    huntPlays: 0,
    huntWins: 0,
    sv: STATION_LAYOUT_VERSION,
  };
}

/** Làm sạch dữ liệu đọc từ server (thiếu field, id cũ đã bị xóa...) */
export function normalizeSave(raw: Partial<SaveData> | null, name: string): SaveData {
  const base = newSave(name);
  if (!raw) return base;
  const unlocked: Record<string, number> = {};
  for (const [id, lv] of Object.entries(raw.unlocked ?? base.unlocked)) {
    const k = UNITS[id]?.kind;
    if (k === 'troop' || k === 'general' || k === 'defense' || k === 'pet') unlocked[id] = Math.max(1, Math.min(maxLevelOf(UNITS[id]), Math.floor(Number(lv)) || 1));
  }
  for (const id of [...STARTERS, ...STARTER_DEFENSES, ...STARTER_PETS, ...STARTER_POSTS]) unlocked[id] ??= 1;
  const clampInt = (v: unknown, hi: number) => Math.max(0, Math.min(hi, Math.floor(Number(v) || 0)));
  const deckSlots = clampInt(raw.deckSlots, DECK_EXTRA_COSTS.length);
  const defSlots = clampInt(raw.defSlots, DEF_EXTRA_COSTS.length);
  const petSlots = clampInt(raw.petSlots, PET_EXTRA_COSTS.length);
  const genSlots = clampInt(raw.genSlots, GENERAL_EXTRA_COSTS.length);
  const petDeck = (raw.petDeck ?? base.petDeck ?? []).filter((id, i, a) => unlocked[id] && UNITS[id]?.kind === 'pet' && a.indexOf(id) === i).slice(0, PET_DECK_SIZE + petSlots);
  const postDeck = (raw.postDeck ?? base.postDeck ?? []).filter((id, i, a) => unlocked[id] && UNITS[id] && isPost(UNITS[id]) && a.indexOf(id) === i).slice(0, POST_DECK_SIZE);
  const deck = (raw.deck ?? base.deck).filter((id, i, a) => unlocked[id] && UNITS[id]?.kind !== 'defense' && a.indexOf(id) === i).slice(0, DECK_SIZE + deckSlots);
  const defDeck = (raw.defDeck ?? base.defDeck).filter((id, i, a) => unlocked[id] && UNITS[id]?.kind === 'defense' && !isPost(UNITS[id]) && a.indexOf(id) === i).slice(0, DEFENSE_DECK_SIZE + defSlots);
  // save cũ (trước v2) có bố cục trạm khác: giữ xu/thẻ/bộ bài, đặt lại tiến trình trạm
  const legacy = (raw.sv ?? 1) < STATION_LAYOUT_VERSION;
  const cleared = STATIONS.map((_, i) => !legacy && !!raw.cleared?.[i]);
  // trạm mới thêm sau trạm đã thắng: mở khóa tiếp (progress cũ dừng ở trạm cuối cũ)
  let unlockedTo = legacy ? 0 : Math.max(0, Math.min(STATIONS.length - 1, Number(raw.progress) || 0));
  while (cleared[unlockedTo] && unlockedTo < STATIONS.length - 1) unlockedTo++;
  return {
    v: 1,
    name: raw.name || name,
    coins: Math.max(0, Number(raw.coins) || 0),
    unlocked,
    deck: deck.length ? deck : base.deck,
    defDeck,
    petDeck,
    postDeck,
    progress: unlockedTo,
    cleared,
    stars: STATIONS.map((_, i) => (legacy ? 0 : Math.max(0, Math.min(3, Number(raw.stars?.[i]) || (cleared[i] ? 1 : 0))))),
    wins: Number(raw.wins) || 0,
    losses: Number(raw.losses) || 0,
    updatedAt: Number(raw.updatedAt) || Date.now(),
    rev: Math.max(0, Number(raw.rev) || 0),
    deckSlots,
    defSlots,
    petSlots,
    genSlots,
    flagLv: clampInt(raw.flagLv, 1e6),
    incomeLv: clampInt(raw.incomeLv, INCOME_MAX_LV),
    siegeBest: clampInt(raw.siegeBest, SIEGE_WAVE_COUNT),
    explore: normalizeExplore(raw.explore),
    huntPlays: clampInt(raw.huntPlays, 1e6),
    huntWins: clampInt(raw.huntWins, 1e6),
    sv: STATION_LAYOUT_VERSION,
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
      defDeck: local.defDeck.filter((id) => unlocked[id]),
      petDeck: (local.petDeck ?? []).filter((id) => unlocked[id]),
      postDeck: (local.postDeck ?? []).filter((id) => unlocked[id]),
      petSlots: Math.max(remote.petSlots ?? 0, local.petSlots ?? 0),
      genSlots: Math.max(remote.genSlots ?? 0, local.genSlots ?? 0),
      coins: remote.coins + (local.coins - baseCoins),
      progress: Math.max(remote.progress, local.progress),
      cleared: STATIONS.map((_, i) => !!(remote.cleared[i] || local.cleared[i])),
      stars: STATIONS.map((_, i) => Math.max(remote.stars[i] ?? 0, local.stars[i] ?? 0)),
      deckSlots: Math.max(remote.deckSlots ?? 0, local.deckSlots ?? 0),
      defSlots: Math.max(remote.defSlots ?? 0, local.defSlots ?? 0),
      flagLv: Math.max(remote.flagLv ?? 0, local.flagLv ?? 0),
      incomeLv: Math.max(remote.incomeLv ?? 0, local.incomeLv ?? 0),
      siegeBest: Math.max(remote.siegeBest ?? 0, local.siegeBest ?? 0),
      explore: mergeExplore(remote.explore, local.explore),
      huntPlays: Math.max(remote.huntPlays ?? 0, local.huntPlays ?? 0),
      huntWins: Math.max(remote.huntWins ?? 0, local.huntWins ?? 0),
      wins: Math.max(remote.wins, local.wins),
      losses: Math.max(remote.losses, local.losses),
      updatedAt: Math.max(remote.updatedAt, local.updatedAt),
      rev: remote.rev,
    },
    local.name,
  );
}
