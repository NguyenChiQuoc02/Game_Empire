export const EN_UNITS: Record<string, { name: string; skill: string; desc: string }> = {
  samurai: { name: 'Samurai', skill: 'Rapid Slash', desc: 'Balanced fighter who swings his blade very fast. Cheap and effective.' },
  archer: { name: 'Archer', skill: 'Long Range', desc: 'Shoots from afar but is fragile. Best placed behind shield bearers.' },
  spear: { name: 'Spearman', skill: 'Long Spear', desc: 'Reaches farther than a sword. Deals x2.2 damage to cavalry.' },
  shield: { name: 'Shield Bearer', skill: 'Bulwark', desc: 'Very tanky but slow. Takes 50% less damage from ranged attacks.' },
  knight: { name: 'Knight', skill: 'Charge', desc: 'Very fast. The first strike is devastating: the farther he runs, the harder it hits (up to x5).' },
  ninja: { name: 'Ninja', skill: 'Shadow Body', desc: 'Dodges 30% of single-target hits. Runs fast and deals x2 damage to flags.' },
  berserker: { name: 'Berserker', skill: 'Fury', desc: 'The lower his health, the harder he hits: up to +120% damage when near death.' },
  healer: { name: 'Healer', skill: 'Gentle Hands', desc: 'Cannot attack. Every 2s heals 15 HP to all nearby allies.' },
  bomber: { name: 'Bomber', skill: 'Self-Destruct', desc: 'Charges in with a bomb: explodes for 90 area damage (x3 on flags), then dies.' },
  trebuchet: { name: 'Trebuchet', skill: 'Siege', desc: 'Hurls rocks from very far with splash damage. x2.5 against flags. Very slow.' },
  duongqua: { name: 'Yang Guo', skill: 'Heaven-Shaking Palm', desc: 'Every 10s unleashes a palm strike dealing 170 area damage ahead of him.' },
  tieulongnu: { name: 'Xiaolongnü', skill: 'Jade Maiden Sutra', desc: 'While beside Yang Guo, heals 50 HP to both of them every 5s. Throws silver needles from range.' },
  truongphi: { name: 'Zhang Fei', skill: 'Iron Body', desc: 'Each soldier slain: +2 armor. Each general slain: +5 armor. Grows tougher as he fights.' },
  trieuvan: { name: 'Zhao Yun', skill: 'Seven In, Seven Out', desc: 'Very fast. Revives once with 50% health when slain. Heals 12% HP on each kill.' },
  quanvu: { name: 'Guan Yu', skill: 'Green Dragon Slash', desc: 'Every 3rd attack is a sweeping slash dealing x1.8 area damage.' },
  giacatluong: { name: 'Zhuge Liang', skill: 'Scorched Fleet', desc: 'Every 8s rains fire on the densest enemy cluster in the lane (130 armor-piercing damage).' },
  lubo: { name: 'Lü Bu', skill: 'Peerless', desc: 'Every halberd strike splashes 60% damage onto enemies around the target.' },
  dongtrac: { name: 'Dong Zhuo', skill: 'Tyrant', desc: 'Summons 2 Samurai every 9s. Below 50% health he enrages (+40% damage, moves faster).' },
};

export const EN_STATIONS: Record<number, { name: string; sub: string; desc: string }> = {
  0: { name: 'Outpost', sub: 'Border watchtower', desc: 'A feeble patrol. Learn how to drag units into the lanes.' },
  1: { name: 'Bamboo Station', sub: 'Ninjas hide in the forest', desc: 'Ninjas rush your flags. Keep defenders in every lane.' },
  2: { name: 'Stone Bridge', sub: 'Zhang Fei blocks the road', desc: 'The enemy fields cavalry, trebuchets and the general Zhang Fei.' },
  3: { name: 'Outer Wall', sub: 'Guarded by Guan Yu', desc: 'A fortified line with healers, bombers and two mighty generals.' },
  4: { name: 'Imperial City', sub: 'Boss: Dong Zhuo', desc: 'Defeat the tyrant Dong Zhuo to end the campaign. He starts the battle in a random lane.' },
};
