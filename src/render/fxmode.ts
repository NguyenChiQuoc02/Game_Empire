// Chế độ hiệu ứng: "gọn" (mặc định, dịu mắt: ít hạt sáng, ít số sát thương, không chớp sét toàn màn hình) hoặc "đầy đủ".
export type FxMode = 'lite' | 'full';
const KEY = 'empire.fx';

let mode: FxMode = 'lite';
try {
  if (localStorage.getItem(KEY) === 'full') mode = 'full';
} catch {
  /* localStorage không khả dụng */
}
if (typeof document !== 'undefined') document.documentElement.dataset.fx = mode;

export const getFx = () => mode;
export const fxLite = () => mode === 'lite';

export function setFx(m: FxMode) {
  mode = m;
  if (typeof document !== 'undefined') document.documentElement.dataset.fx = m;
  try {
    localStorage.setItem(KEY, m);
  } catch {
    /* bỏ qua */
  }
}
