// Boss nhiều giai đoạn (phase): máu giảm tới ngưỡng thì boss đổi chiêu, đổi dạng và thay đổi cả chiến trường.
import type { SkillId } from './units';
import type { ZoneId } from './lane';

export interface BossPhase {
  /** vào giai đoạn khi máu ≤ tỉ lệ này (0..1) */
  at: number;
  /** hệ số áp lên boss một lần khi vào giai đoạn (nhân), `heal` = hồi thêm theo máu tối đa, `armor` = cộng thêm */
  buff?: { dmg?: number; speed?: number; rate?: number; armor?: number; heal?: number; scale?: number };
  /** kỹ năng chủ động mới */
  skills?: SkillId[];
  /** triệu hồi quân hộ vệ (không có thưởng vàng) */
  summon?: { id: string; n: number };
  /** chiến trường đổi: thêm vùng địa hình vào lane boss */
  zones?: ZoneId[];
  /** thiên tai định kỳ nhắm vào chỗ quân ta đang đứng */
  hazard?: { kind: 'fire' | 'poison'; every: number };
  shake?: number;
}

/** boss.id → các giai đoạn SAU giai đoạn 1 (giai đoạn 1 là trạng thái ban đầu) */
export const BOSS_PHASES: Record<string, BossPhase[]> = {
  dongtrac: [
    { at: 0.5, buff: { dmg: 1.4, speed: 1.4 }, skills: ['warlord'], shake: 9 },
    { at: 0.2, buff: { rate: 1.25, armor: 6, scale: 1.1 }, summon: { id: 'samurai', n: 4 }, zones: ['scorch', 'scorch'], hazard: { kind: 'fire', every: 7 }, shake: 12 },
  ],
  dongphuongbatbai: [
    { at: 0.5, buff: { speed: 1.2, rate: 1.2 }, skills: ['dash'], shake: 7 },
    { at: 0.2, buff: { dmg: 1.15 }, zones: ['forest', 'forest'], hazard: { kind: 'poison', every: 8 }, shake: 8 },
  ],
  nguumavuong: [
    { at: 0.5, buff: { dmg: 1.3, speed: 1.25 }, skills: ['fireAttack'], shake: 10 },
    { at: 0.2, buff: { dmg: 1.25, armor: 8, heal: 0.1, scale: 1.15 }, zones: ['scorch', 'scorch'], hazard: { kind: 'fire', every: 5 }, shake: 14 },
  ],
  caocau: [
    { at: 0.5, buff: { armor: 6, rate: 1.15 }, skills: ['shieldAura'], summon: { id: 'spear', n: 3 }, shake: 8 },
    { at: 0.2, buff: { dmg: 1.25 }, summon: { id: 'knight', n: 3 }, zones: ['hill'], shake: 10 },
  ],
  diemla: [
    { at: 0.5, buff: { rate: 1.15 }, skills: ['fireAttack'], summon: { id: 'quybinh', n: 3 }, shake: 9 },
    { at: 0.2, buff: { dmg: 1.25, speed: 1.2, heal: 0.08 }, summon: { id: 'quybinh', n: 4 }, zones: ['miasma', 'miasma'], hazard: { kind: 'poison', every: 6 }, shake: 12 },
  ],
};

/** boss chết thì phân thân: mỗi lần tách làm 2 bản nhỏ hơn, tối đa `gens` đời (1 → 2 → 4 ...) */
export interface BossSplit {
  gens: number;
  /** máu / sát thương / kích thước của mỗi bản so với bản mẹ */
  hp: number;
  dmg: number;
  size: number;
}
export const BOSS_SPLIT: Record<string, BossSplit> = {
  dongphuongbatbai: { gens: 3, hp: 0.25, dmg: 0.75, size: 0.8 },
};

export const bossPhaseCount = (id: string) => 1 + (BOSS_PHASES[id]?.length ?? 0);
