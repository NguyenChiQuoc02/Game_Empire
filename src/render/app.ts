import type { Application } from 'pixi.js';

// Giữ tham chiếu tới Pixi Application dùng chung (để UI DOM nhờ render tranh nền, bản đồ...)
let app: Application | null = null;
export const setApp = (a: Application) => {
  app = a;
};
export const getApp = (): Application | null => app;
