import { Rectangle, type Application } from 'pixi.js';
import { UNIT_LIST } from '../data/units';
import { buildUnitArt } from './unitArt';
import type { Side } from '../game/sim';

const cache = new Map<string, string>();

/** Render chân dung từng đơn vị thành data URL để dùng trong DOM (thẻ bài, menu, HUD) */
export async function buildIcons(app: Application): Promise<void> {
  for (const def of UNIT_LIST) {
    for (const side of [0, 1] as Side[]) {
      const art = buildUnitArt(def, side, false);
      art.update(0.4, false, 0);
      const b = art.root.getLocalBounds();
      const pad = 6;
      try {
        const frame = new Rectangle(b.minX - pad, b.minY - pad, b.maxX - b.minX + pad * 2, b.maxY - b.minY + pad * 2);
        cache.set(`${def.id}:${side}`, await app.renderer.extract.base64({ target: art.root, frame, resolution: 2 }));
        // chân dung khuôn mặt (nửa người trên) cho thẻ tướng / chỉ huy
        const sc = def.scale;
        const f = def.id === 'trebuchet' ? frame : new Rectangle(art.face.x - 29 * sc, art.face.y - 34 * sc, 58 * sc, 56 * sc);
        cache.set(`${def.id}:${side}:face`, await app.renderer.extract.base64({ target: art.root, frame: f, resolution: 3 }));
      } catch (e) {
        console.warn('icon failed', def.id, e);
      }
      art.root.destroy({ children: true });
    }
  }
}

export const iconUrl = (id: string, side: Side = 0): string => cache.get(`${id}:${side}`) ?? cache.get(`${id}:0`) ?? '';
export const faceUrl = (id: string, side: Side = 0): string => cache.get(`${id}:${side}:face`) ?? iconUrl(id, side);
