import { Container } from 'pixi.js';
import type { MountKind } from '../data/units';
import { buildBeast, buildBird, buildSnake, type Bird } from './beastArt';
import { g } from './draw';

// Thú cưỡi của kỹ năng skyMount: dựng theo yêu cầu khi quân gọi thú bay lên trời

export interface Mount {
  node: Container;
  tick: (clock: number, moving: boolean) => void;
  /** y (âm = lên cao) của mặt lưng thú nơi chân người đứng, tính từ gốc node */
  seatY: number;
  half: number;
}

const BIRD: Partial<Record<MountKind, Bird>> = {
  crane: { body: 0xffffff, wing: 0xf0f4ff, tail: 'short', tailC: 0x2a2a30, beak: 0xe8a040, crest: 0xd23a3a, legs: 0, size: 22, neck: 18, fly: true },
  phoenix: { body: 0xe8442a, wing: 0xffb02a, belly: 0xffd34d, tail: 'long', tailC: 0xff7a1a, beak: 0xffd34d, crest: 0xffd34d, legs: 0, size: 22, fly: true, glow: 0xff7a2a },
  eagle: { body: 0x8a6a3a, wing: 0x5a4128, belly: 0xe8d8b0, tail: 'short', beak: 0xffc93a, legs: 0, size: 22, fly: true, eye: 0xffe066 },
};

/** đám mây trắng dưới chân (mây độc lập, hoặc nâng thú đi bộ như trâu xanh) */
function cloud(): Container {
  const node = new Container();
  const c = g();
  for (const [x, y, r] of [[-18, 0, 9], [-6, -3, 12], [8, 0, 11], [19, 3, 7]] as const) c.circle(x, y, r).fill({ color: 0xf2f6ff, alpha: 0.95 });
  c.ellipse(0, 6, 26, 4).fill({ color: 0xcfd8ee, alpha: 0.7 });
  node.addChild(c);
  return node;
}

export function buildMount(kind: MountKind): Mount {
  const node = new Container();
  if (kind === 'cloud') {
    const c = cloud();
    c.scale.set(1.3);
    node.addChild(c);
    return { node, seatY: -6, half: 30, tick: (clock) => (c.y = Math.sin(clock * 3) * 1.4) };
  }
  const bird = BIRD[kind];
  if (bird) {
    const a = buildBird(bird, 0xffffff);
    node.addChild(a.body);
    // thân chim cao ~ size*1.4: lưng nằm ở khoảng -size*1.3
    return { node, seatY: -bird.size * 1.25, half: bird.size * 1.6, tick: (clock) => a.tick(clock, true, 0) };
  }
  if (kind === 'dragon') {
    const a = buildSnake(0x3ec6a4, 0xfff0b0, 0xffffff, false);
    const c = cloud();
    c.position.set(0, 10);
    node.addChild(c, a.body);
    a.body.scale.set(1.25);
    return { node, seatY: -14, half: 34, tick: (clock) => a.tick(clock, true, 0) };
  }
  // ox: trâu xanh đứng trên mây
  const a = buildBeast('thanhnguu', 0xffffff);
  const c = cloud();
  c.scale.set(1.5);
  c.position.set(0, 8);
  a.body.position.y = -4;
  node.addChild(c, a.body);
  return { node, seatY: -46, half: 34, tick: (clock) => a.tick(clock, true, 0) };
}
