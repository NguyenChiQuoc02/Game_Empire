import type { Station } from '../data/campaign';

/** Vàng (xu) nhận sau trận */
export function rewardFor(st: Station, win: boolean, firstClear: boolean): number {
  if (!win) return Math.round(st.reward * 0.15);
  return firstClear ? st.reward : Math.round(st.reward * 0.5);
}

/** thắng nhanh hơn ngưỡng này (giây) để đạt 3 sao */
export const FAST_WIN_SEC = 100;

/** 1★ thắng · 2★ không thua lane nào · 3★ thắng nhanh */
export function starsFor(win: boolean, lanesLost: number, seconds: number, fastSec = FAST_WIN_SEC): number {
  if (!win) return 0;
  if (lanesLost > 0) return 1;
  return seconds <= fastSec ? 3 : 2;
}
