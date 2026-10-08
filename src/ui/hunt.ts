import type { Application, Ticker } from 'pixi.js';
import { h } from './dom';
import { getLang, huntMapName, onLang, t, unitName } from '../i18n';
import { UNITS, incomeUpgradeMul, levelMul } from '../data/units';
import { Hunt, type HEvent, type HStance, type HUnit } from '../game/hunt';
import { HuntAI } from '../game/huntAI';
import { HuntView } from '../render/huntView';
import { HUNT_METEOR, HUNT_STORM_AT, HUNT_TEAM_STYLE, huntMapDef, huntReward, type HuntSetup } from '../data/treasure';
import { mutate, state } from '../state';
import { fmt, langSwitch, openModal, portrait, toast, type Modal } from './common';
import { faceUrl } from '../render/icons';
import { tipBody } from './tip';
import { extraSkillsAt } from '../data/gskills';
import { generalCapOf } from '../backend/save';

export type HuntExit = 'menu' | 'retry';

const SPEEDS = [1, 1.5, 2, 3];
const STANCES: { id: HStance; ico: string; key: string }[] = [
  { id: 'guard', ico: '🏰', key: 'Q' },
  { id: 'rally', ico: '⚔', key: 'W' },
  { id: 'treasure', ico: '💎', key: 'E' },
];

/** Màn chơi Truy Tìm Kho Báu: bản đồ 2D nhiều đội, HUD gọn để nhìn rộng bản đồ. */
export class HuntScreen {
  private hunt: Hunt;
  private ais: HuntAI[] = [];
  private view: HuntView;
  private deck: string[];
  private screen = h('div', { class: 'screen hunt' });
  private field = h('div', { class: 'hunt-field' });
  private hud = h('div', { class: 'hunt-hud' });
  private hand = h('footer', { class: 'hunt-hand' });
  private tip = h('div', { class: 'unit-tip' });
  private cardTip = h('div', { class: 'unit-tip card-tip' });
  private ro: ResizeObserver;
  private offLang: () => void;
  private paused = false;
  private speed = 1;
  private disposed = false;
  private resultT = 0;
  private resultShown = false;
  private pauseModal: Modal | null = null;
  private resultModal: Modal | null = null;
  private tipUnit: HUnit | null = null;
  private tipUntil = 0;
  private tipKey = '';
  private lastW = 0;
  private lastH = 0;
  private lastLava = -99;
  private el: {
    timer?: HTMLElement; mode?: HTMLElement; chips?: HTMLElement[]; status?: HTMLElement; gold?: HTMLElement; goldBar?: HTMLElement;
    goldRow?: HTMLElement; stances?: HTMLElement[]; cards?: Map<string, HTMLElement>; speed?: HTMLElement[]; info?: HTMLElement;
  } = {};
  private lastCardState = '';
  private pointers = new Map<number, { x: number; y: number }>();
  private dragStart: { x: number; y: number; moved: boolean; id: number } | null = null;
  private pinch = 0;

  constructor(private app: Application, private root: HTMLElement, public setup: HuntSetup, private onExit: (a: HuntExit) => void) {
    const save = state.save!;
    // thủy quân chỉ chạy được trên lane sông nên không mang vào chế độ Kho Báu
    const land = (id: string) => !UNITS[id]?.tags?.includes('naval');
    this.deck = [
      ...save.deck.filter((id) => UNITS[id]?.kind === 'troop' && land(id)),
      ...save.defDeck.filter((id) => UNITS[id]?.kind === 'defense'),
      ...(save.petDeck ?? []).filter((id) => UNITS[id]?.kind === 'pet' && land(id)),
      ...save.deck.filter((id) => UNITS[id]?.kind === 'general' && land(id)),
    ];
    this.hunt = new Hunt({
      setup, levels: { ...save.unlocked }, deck: this.deck, generalCap: generalCapOf(save), flagLevel: save.flagLv ?? 0, incomeMul: incomeUpgradeMul(save.incomeLv ?? 0),
    });
    // đội máy: mỗi đội một phe phái khác nhau
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    for (let i = 1; i < this.hunt.teams.length; i++) this.ais.push(new HuntAI(this.hunt, i, order[i - 1]));
    this.view = new HuntView(app, this.hunt);
    if (import.meta.env.DEV) (window as unknown as { __hunt?: unknown }).__hunt = { hunt: this.hunt, view: this.view, screen: this, ais: this.ais };

    this.field.append(app.canvas, this.hud, this.tip);
    this.screen.append(this.field, this.cardTip, this.hand);
    this.root.replaceChildren(this.screen);
    this.buildUi();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.field);
    this.resize();
    this.field.addEventListener('pointerdown', this.onDown);
    this.field.addEventListener('pointermove', this.onMove);
    this.field.addEventListener('pointerup', this.onUp);
    this.field.addEventListener('pointercancel', this.onUp);
    this.field.addEventListener('pointerleave', this.onLeave);
    this.field.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKey);
    this.offLang = onLang(() => this.buildUi());
    app.ticker.add(this.tick);
    app.ticker.start();
    this.view.showToast(t('hunt.toast.start', { map: huntMapName(huntMapDef(setup.map)) }));
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.app.ticker.remove(this.tick);
    this.ro.disconnect();
    this.offLang();
    window.removeEventListener('keydown', this.onKey);
    this.field.removeEventListener('pointerdown', this.onDown);
    this.field.removeEventListener('pointermove', this.onMove);
    this.field.removeEventListener('pointerup', this.onUp);
    this.field.removeEventListener('pointercancel', this.onUp);
    this.field.removeEventListener('pointerleave', this.onLeave);
    this.field.removeEventListener('wheel', this.onWheel);
    this.pauseModal?.close();
    this.resultModal?.close();
    this.view.destroy();
    this.app.canvas.remove();
  }

  private resize() {
    const r = this.field.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    if (Math.abs(r.width - this.lastW) < 1 && Math.abs(r.height - this.lastH) < 1) return;
    this.lastW = r.width;
    this.lastH = r.height;
    this.app.renderer.resize(r.width, r.height);
    this.view.layout(r.width, r.height);
  }

  // ───────────────────────── giao diện ─────────────────────────
  private face(id: string, cls: string) {
    const src = faceUrl(id, 0);
    return h('div', { class: `face ${cls}` }, src ? h('img', { attrs: { src, alt: '', draggable: 'false' } }) : null);
  }

  private teamLabel(i: number) {
    const tm = this.hunt.teams[i];
    return `${t(`hunt.team.${i}`)}${i === 0 ? ` (${t('hunt.you')})` : tm.group === this.hunt.teams[0].group ? ` (${t('hunt.allyTag')})` : ''}`;
  }

  private buildUi() {
    const hu = this.hunt;
    const chips = hu.teams.map((tm) => {
      const ally = tm.id !== 0 && tm.group === hu.teams[0].group;
      const bar = h('i', {});
      const count = h('span', { class: 'hc-n', text: '0' });
      const c = h('div', { class: `hunt-chip${tm.id === 0 ? ' me' : ally ? ' ally' : ''}`, attrs: { style: `--tc:${HUNT_TEAM_STYLE[tm.id].css}`, title: this.teamLabel(tm.id) } },
        h('span', { class: 'hc-dot' }),
        h('span', { class: 'hc-name', text: tm.ai ? (tm.faction ? t(`hunt.faction.${tm.faction}`) : t(`hunt.team.${tm.id}`)) : t('hunt.you') }),
        h('span', { class: 'hc-bar' }, bar),
        count,
        ally ? h('span', { class: 'hc-ally', text: '🤝' }) : null);
      c.addEventListener('click', () => this.view.focus(tm.castle.x, tm.castle.y, Math.max(1.6, this.view.zoom)));
      return Object.assign(c, { bar, count });
    });
    const timer = h('b', { class: 'timer', text: '0:00' });
    const mode = h('span', { class: 'hunt-mode', text: t(`hunt.win.${this.setup.win}`) });
    const status = h('div', { class: 'hunt-status', text: '' });
    const speedBtns = SPEEDS.map((v) => h('button', { class: 'spd', text: `×${v}`, attrs: { type: 'button' }, on: { click: () => { this.speed = v; this.refreshSpeed(); } } }));
    const zoomBtn = (txt: string, f: number, label: string) => h('button', { class: 'icon-btn hz', text: txt, attrs: { type: 'button', 'aria-label': label }, on: { click: () => this.view.zoomAt(f, this.view.W / 2, this.view.H / 2) } });
    this.hud.replaceChildren(
      h('div', { class: 'hh-row' },
        h('div', { class: 'hh-left' },
          h('button', { class: 'icon-btn round', text: '⏸', attrs: { type: 'button', 'aria-label': t('hud.pause') }, on: { click: () => this.pause() } }),
          h('div', { class: 'hh-time' }, timer, mode)),
        h('div', { class: 'hh-teams' }, ...chips),
        h('div', { class: 'hh-right' },
          h('div', { class: 'speed-box' }, ...speedBtns),
          zoomBtn('−', 1 / 1.35, t('hunt.zoomOut')),
          zoomBtn('+', 1.35, t('hunt.zoomIn')),
          h('button', { class: 'icon-btn hz', text: '🏰', attrs: { type: 'button', title: t('hunt.focusHome') }, on: { click: () => this.view.focus(hu.teams[0].castle.x, hu.teams[0].castle.y, Math.max(1.8, this.view.zoom)) } }),
          h('button', { class: 'icon-btn hz', text: '💎', attrs: { type: 'button', title: t('hunt.focusTreasure') }, on: { click: () => this.focusTreasure() } }))),
      status);

    // khung dưới: vàng + lệnh + thẻ
    const gold = h('b', { text: '0' });
    const goldBar = h('div', { class: 'gold-fill' });
    const goldRow = h('div', { class: 'hunt-gold' }, h('span', { class: 'coin' }), h('div', { class: 'gold-num' }, gold, h('small', { text: `+${Number((hu.teams[0].income).toFixed(1))}/s` })), h('div', { class: 'gold-track' }, goldBar));
    const stances = STANCES.map((s) => h('button', {
      class: 'hunt-stance', attrs: { type: 'button', title: t(`hunt.stanceTip.${s.id}`) },
      on: { click: () => this.setStance(s.id) },
    }, h('i', { text: s.ico }), h('span', { text: t(`hunt.stance.${s.id}`) }), h('kbd', { text: s.key })));
    const cards = new Map<string, HTMLElement>();
    const cardRow = h('div', { class: 'hunt-cards' });
    let prevKind = '';
    this.deck.forEach((id, i) => {
      const d = UNITS[id];
      if (i > 0 && d.kind !== prevKind) cardRow.append(h('span', { class: 'hand-sep' }));
      prevKind = d.kind;
      const c = h('div', { class: `hcard ${d.kind}`, attrs: { 'data-id': id } },
        h('span', { class: 'key', text: String(i + 1) }),
        d.kind === 'general' ? this.face(id, 'card-face') : portrait(id),
        h('span', { class: 'cost', text: String(d.cost) }),
        h('span', { class: 'nm', text: unitName(d) }));
      c.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.hideCardTip();
        this.deployCard(id);
      });
      c.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && this.showCardTip(id, c));
      c.addEventListener('pointerleave', () => this.hideCardTip());
      c.addEventListener('contextmenu', (e) => e.preventDefault());
      cards.set(id, c);
      cardRow.append(c);
    });
    const info = h('div', { class: 'hunt-info', text: t('hunt.hint') });
    this.hand.replaceChildren(
      h('div', { class: 'hunt-hand-top' }, goldRow, h('div', { class: 'hunt-stances' }, ...stances), info),
      cardRow);
    this.el = { timer, mode, chips: chips as unknown as HTMLElement[], status, gold, goldBar, goldRow, stances, cards, speed: speedBtns, info };
    this.lastCardState = '';
    this.refreshSpeed();
    this.updateHud();
  }

  private refreshSpeed() {
    this.el.speed?.forEach((b, i) => b.classList.toggle('active', SPEEDS[i] === this.speed));
  }

  private focusTreasure() {
    const tr = this.hunt.treasures.find((x) => x.state === 'carried') ?? this.hunt.treasures.find((x) => x.state === 'ground') ?? this.hunt.treasures[0];
    const gx = this.hunt.guardian;
    const pos = tr.state === 'locked' && gx ? { x: gx.x, y: gx.y } : { x: tr.x, y: tr.y };
    this.view.focus(pos.x, pos.y, Math.max(1.8, this.view.zoom));
  }

  private setStance(s: HStance) {
    const me = this.hunt.teams[0];
    if (!me.alive) return;
    this.hunt.command(0, s);
    this.updateHud();
  }

  private deployCard(id: string) {
    const hu = this.hunt;
    const d = UNITS[id];
    const me = hu.teams[0];
    if (!me.alive || hu.over || this.paused) return;
    if (d.kind === 'general' && hu.generalOnField(0, id)) return void toast(t('hud.generalUsed'), 'error');
    if (d.kind === 'general' && hu.generalsOf(0) >= me.generalCap) return void toast(t('hud.generalCap', { n: me.generalCap }), 'error');
    if (d.kind === 'defense' && hu.defensesOf(0) >= 5) return void toast(t('hunt.defenseFull', { n: 5 }), 'error');
    if (d.kind !== 'defense' && hu.countOf(0) >= 34) return void toast(t('hunt.unitCap', { n: 34 }), 'error');
    if (me.gold < d.cost) {
      const row = this.el.goldRow!;
      row.classList.remove('nogold');
      void row.offsetWidth;
      row.classList.add('nogold');
      return;
    }
    hu.deploy(0, id);
  }

  private updateHud() {
    const hu = this.hunt;
    const e = this.el;
    const sec = Math.floor(hu.time);
    e.timer!.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    hu.teams.forEach((tm, i) => {
      const chip = e.chips![i] as HTMLElement & { bar: HTMLElement; count: HTMLElement };
      const c = hu.castleHp(i);
      chip.bar.style.width = `${tm.alive ? (c.hp / c.max) * 100 : 0}%`;
      chip.count.textContent = tm.alive ? String(hu.countOf(i)) : '✗';
      chip.classList.toggle('dead', !tm.alive);
    });
    // trạng thái kho báu / bản đồ
    let txt = '';
    const def = hu.map.def;
    const carried = hu.treasures.find((x) => x.state === 'carried');
    const free = hu.treasures.filter((x) => x.state === 'ground');
    const locked = hu.treasures.some((x) => x.state === 'locked');
    if (carried) txt = t('hunt.status.carried', { team: this.teamLabel(carried.team), n: carried.need });
    else if (free.length) txt = t('hunt.status.ground');
    else if (locked && def.unlockAt !== undefined) txt = t('hunt.status.unlock', { s: Math.max(0, Math.ceil(def.unlockAt - hu.time)) });
    else if (locked && hu.guardian) txt = t('hunt.status.locked', { name: unitName(hu.guardian.def), pct: Math.max(0, Math.round((hu.guardian.hp / hu.guardian.maxHp) * 100)) });
    if (hu.zoneR < 2000) txt += `  ☠ ${t('hunt.status.zone')}`;
    else if (def.shrink && hu.time < 300) txt += `  ☠ ${t('hunt.status.zoneIn', { s: Math.max(0, Math.ceil(300 - hu.time)) })}`;
    if (hu.stormOn) txt += `  ⛈ ${t('hunt.status.storm')}`;
    else if (hu.time > HUNT_STORM_AT - 60) txt += `  ⛈ ${t('hunt.status.stormIn', { s: Math.max(0, Math.ceil(HUNT_STORM_AT - hu.time)) })}`;
    if (e.status!.textContent !== txt) e.status!.textContent = txt;
    // vàng
    const me = hu.teams[0];
    e.gold!.textContent = String(Math.floor(me.gold));
    e.goldBar!.style.width = `${Math.min(100, (me.gold / 160) * 100)}%`;
    const sub = e.goldRow!.querySelector('small');
    if (sub) sub.textContent = `+${Number((me.income + me.bonus).toFixed(1))}/s`;
    e.stances!.forEach((b, i) => b.classList.toggle('active', STANCES[i].id === me.stance));
    const st = this.deck.map((id) => {
      const d = UNITS[id];
      return `${id}:${me.gold >= d.cost ? 1 : 0}${d.kind === 'general' && hu.generalOnField(0, id) ? 'u' : ''}`;
    }).join('|');
    if (st !== this.lastCardState) {
      this.lastCardState = st;
      for (const id of this.deck) {
        const d = UNITS[id];
        const c = e.cards!.get(id)!;
        c.classList.toggle('poor', me.gold < d.cost);
        c.classList.toggle('used', d.kind === 'general' && hu.generalOnField(0, id));
      }
    }
  }

  // ───────────────────────── vòng lặp ─────────────────────────
  private tick = (ticker: Ticker) => {
    if (this.disposed) return;
    const real = Math.min(ticker.deltaMS / 1000, 0.05);
    if (!this.paused) {
      const dt = real * this.speed;
      const steps = Math.max(1, Math.ceil(dt / 0.034));
      for (let i = 0; i < steps && !this.hunt.over; i++) {
        for (const a of this.ais) a.update(dt / steps);
        this.hunt.update(dt / steps);
      }
      const evs = this.hunt.events.splice(0);
      if (evs.length) {
        this.onEvents(evs);
        this.view.handle(evs);
      }
      this.view.update(real * this.speed);
      this.updateHud();
      this.updateTip();
      const me = this.hunt.teams[0];
      const myGroupAlive = this.hunt.teams.some((x) => x.alive && x.group === me.group);
      if ((this.hunt.over || !myGroupAlive) && !this.resultShown) {
        this.resultT += real;
        if (this.resultT > 1.6) this.showResult();
      }
    } else this.view.update(0);
  };

  private onEvents(evs: HEvent[]) {
    for (const e of evs) {
      switch (e.t) {
        case 'guardianDown':
          this.view.showToast(t('hunt.toast.guardianDown'));
          break;
        case 'unlock':
          this.view.showToast(t('hunt.toast.unlock'));
          break;
        case 'treasure':
          if (e.kind === 'picked') this.view.showToast(t('hunt.toast.picked', { team: this.teamLabel(e.team) }));
          else if (e.kind === 'dropped') this.view.showToast(t('hunt.toast.dropped'));
          else if (e.kind === 'delivered') this.view.showToast(t('hunt.toast.delivered', { team: this.teamLabel(e.team) }));
          break;
        case 'castleDown':
          this.view.showToast(t('hunt.toast.castleDown', { team: this.teamLabel(e.team) }));
          break;
        case 'storm':
          this.view.showToast(t('hunt.toast.storm'));
          break;
        case 'zone':
          this.view.showToast(t('hunt.toast.zone'));
          break;
        case 'bridgeDown':
          this.view.showToast(t('hunt.toast.bridge'));
          break;
        case 'terrain':
          if (this.hunt.map.lava.length && this.hunt.time - this.lastLava > 25) {
            this.lastLava = this.hunt.time;
            this.view.showToast(t('hunt.toast.lava'));
          }
          break;
        case 'point':
          if (this.hunt.teams[0].group === e.owner) this.view.showToast(t('hunt.toast.point'));
          break;
        case 'meteor':
          if (this.hunt.time < HUNT_METEOR.start + 3) this.view.showToast(t('hunt.toast.meteor'));
          break;
        default:
          break;
      }
    }
  }

  // ───────────────────────── tạm dừng / kết quả ─────────────────────────
  private pause() {
    if (this.paused || this.hunt.over) return;
    this.paused = true;
    this.pauseModal = openModal(
      (close) => h('div', { class: 'pause' },
        h('h2', { text: `⏸ ${t('hud.paused')}` }),
        h('div', { class: 'set-row' }, h('div', { class: 'set-label', text: t('settings.language') }), langSwitch()),
        h('div', { class: 'modal-actions col' },
          h('button', { class: 'btn primary big', text: `▶ ${t('hud.resume')}`, attrs: { type: 'button' }, on: { click: () => { close(); this.paused = false; this.pauseModal = null; } } }),
          h('button', { class: 'btn danger', text: `🏳 ${t('hud.retreat')}`, attrs: { type: 'button' }, on: { click: () => { close(); this.pauseModal = null; this.onExit('menu'); } } }))),
      { dismissible: false },
    );
  }

  private showResult() {
    if (this.resultShown) return;
    this.resultShown = true;
    const hu = this.hunt;
    const me = hu.teams[0];
    const win = hu.over && hu.winnerGroup === me.group;
    const gotTreasure = hu.deliveredBy >= 0 && hu.teams[hu.deliveredBy].group === me.group;
    const coins = huntReward(win, { treasure: gotTreasure, kills: me.kills, difficulty: this.setup.difficulty, teams: this.setup.teams, alliance: this.setup.alliance, level: hu.map.def.level });
    mutate((s) => {
      s.coins += coins;
      s.huntPlays = (s.huntPlays ?? 0) + 1;
      if (win) s.huntWins = (s.huntWins ?? 0) + 1;
    }, true);
    const time = Math.floor(hu.time);
    const winnerName = hu.winnerGroup >= 0 ? this.teamLabel(hu.teams.find((x) => x.group === hu.winnerGroup)!.id) : '—';
    this.resultModal = openModal(
      () => h('div', { class: `result ${win ? 'win' : 'lose'}` },
        h('div', { class: 'res-ico', text: win ? '🏆' : '🏯' }),
        h('h2', { text: win ? t('hunt.resultWin') : t('hunt.resultLose') }),
        h('p', { class: 'res-sub', text: win ? (gotTreasure ? t('hunt.resultWinTreasure') : t('hunt.resultWinElim')) : me.alive ? t('hunt.resultLoseWinner', { team: winnerName }) : t('hunt.resultLoseCastle') }),
        h('div', { class: 'res-stats' },
          h('div', {}, h('small', { text: t('result.time') }), h('b', { text: `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}` })),
          h('div', {}, h('small', { text: t('result.kills') }), h('b', { text: String(me.kills) })),
          h('div', {}, h('small', { text: t('hunt.statTeams') }), h('b', { text: `${hu.teams.filter((x) => x.alive).length}/${hu.teams.length}` }))),
        h('div', { class: 'res-reward', text: `🪙 +${fmt(coins)}` }),
        h('div', { class: 'modal-actions col' },
          h('button', { class: 'btn primary big', text: `↻ ${t('result.retry')}`, attrs: { type: 'button' }, on: { click: () => this.onExit('retry') } }),
          h('button', { class: 'btn ghost', text: t('result.menu'), attrs: { type: 'button' }, on: { click: () => this.onExit('menu') } }))),
      { dismissible: false },
    );
  }

  // ───────────────────────── điều khiển camera / chạm ─────────────────────────
  private local(e: PointerEvent | WheelEvent) {
    const r = this.field.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('.hunt-hud button, .hunt-chip')) return;
    this.pointers.set(e.pointerId, this.local(e));
    try {
      this.field.setPointerCapture(e.pointerId);
    } catch {
      /* bỏ qua */
    }
    if (this.pointers.size === 1) this.dragStart = { ...this.local(e), moved: false, id: e.pointerId };
    else {
      this.dragStart = null;
      this.pinch = this.pinchDist();
    }
  };

  private pinchDist() {
    const pts = [...this.pointers.values()];
    return pts.length >= 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
  }

  private onMove = (e: PointerEvent) => {
    const p = this.local(e);
    const prev = this.pointers.get(e.pointerId);
    if (prev) {
      this.pointers.set(e.pointerId, p);
      if (this.pointers.size >= 2) {
        const d = this.pinchDist();
        if (this.pinch > 0 && d > 0) {
          const pts = [...this.pointers.values()];
          this.view.zoomAt(d / this.pinch, (pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
        }
        this.pinch = d;
        return;
      }
      if (this.dragStart && e.pointerId === this.dragStart.id) {
        if (!this.dragStart.moved && Math.hypot(p.x - this.dragStart.x, p.y - this.dragStart.y) > 7) this.dragStart.moved = true;
        if (this.dragStart.moved) {
          this.view.pan(p.x - prev.x, p.y - prev.y);
          this.tipUnit = null;
        }
      }
      return;
    }
    if (e.pointerType === 'mouse') {
      const u = this.view.unitAt(p.x, p.y);
      this.tipUnit = u;
      this.tipUntil = 0;
    }
  };

  private onUp = (e: PointerEvent) => {
    const p = this.local(e);
    const wasTap = this.dragStart && e.pointerId === this.dragStart.id && !this.dragStart.moved && this.pointers.size === 1;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = 0;
    if (wasTap && e.type === 'pointerup') {
      this.dragStart = null;
      const u = this.view.unitAt(p.x, p.y);
      if (u) {
        this.tipUnit = u;
        this.tipUntil = performance.now() + 2800;
      } else if (!this.paused && !this.hunt.over && this.hunt.teams[0].alive) {
        // chạm vào đất: đặt điểm tập kết và chuyển cả đội sang "Tiến công"
        const w = this.view.screenToWorld(p.x, p.y);
        this.hunt.command(0, 'rally', w);
        this.updateHud();
      }
    }
    if (this.pointers.size === 0) this.dragStart = null;
  };

  private onLeave = () => {
    if (!this.tipUntil) this.tipUnit = null;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const p = this.local(e);
    this.view.zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, p.x, p.y);
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape' || e.key === 'p') return void this.pause();
    if (this.paused || this.hunt.over) return;
    const n = Number(e.key);
    if (n >= 1 && n <= this.deck.length) return void this.deployCard(this.deck[n - 1]);
    const k = e.key.toLowerCase();
    if (k === 'q') return this.setStance('guard');
    if (k === 'w') return this.setStance('rally');
    if (k === 'e') return this.setStance('treasure');
    if (k === '+' || k === '=') return this.view.zoomAt(1.3, this.view.W / 2, this.view.H / 2);
    if (k === '-') return this.view.zoomAt(1 / 1.3, this.view.W / 2, this.view.H / 2);
    if (k === ' ') {
      e.preventDefault();
      const c = this.hunt.teams[0].castle;
      this.view.focus(c.x, c.y, Math.max(1.8, this.view.zoom));
    }
  };

  // ───────────────────────── thông tin quân ─────────────────────────
  private updateTip() {
    const u = this.tipUnit;
    const tip = this.tip;
    if (!u || !u.alive || (this.tipUntil && performance.now() > this.tipUntil) || this.hunt.over) {
      this.tipUnit = null;
      tip.style.display = 'none';
      this.tipKey = '';
      return;
    }
    const key = `${u.uid}|${Math.ceil(u.hp)}|${Math.round(u.armor)}|${Math.round(u.dmg)}|${getLang()}`;
    if (key !== this.tipKey) {
      this.tipKey = key;
      const ally = u.team >= 0 && this.hunt.teams[u.team].group === this.hunt.teams[0].group;
      tip.className = `unit-tip ${ally ? 'ally' : 'foe'} ${u.def.kind}`;
      tip.replaceChildren(...tipBody({ def: u.def, side: ally ? 0 : 1, hp: u.hp, maxHp: u.maxHp, dmg: u.dmg, armor: u.armor, speed: u.speed, range: u.range, cd: u.cd, pow: u.pow, level: u.team === 0 ? state.save?.unlocked[u.def.id] : undefined, gs: u.gs }));
    }
    tip.style.display = 'block';
    const w = tip.offsetWidth || 150;
    const hh = tip.offsetHeight || 60;
    const fw = this.field.clientWidth;
    const fh = this.field.clientHeight;
    const pt = this.view.w2s(u.x, u.y);
    let left = pt.x - w / 2;
    let top = pt.y - 60 * this.view.us - hh;
    if (top < 4) {
      left = pt.x + 40 + w + 4 <= fw ? pt.x + 40 : pt.x - 40 - w;
      top = pt.y - hh / 2;
    }
    tip.style.left = `${Math.max(4, Math.min(fw - w - 4, left))}px`;
    tip.style.top = `${Math.max(4, Math.min(fh - hh - 4, top))}px`;
  }

  private showCardTip(id: string, card: HTMLElement) {
    const d = UNITS[id];
    const lv = state.save?.unlocked[id] ?? 1;
    const m = levelMul(lv);
    const tip = this.cardTip;
    tip.className = `unit-tip card-tip ${d.kind === 'general' ? 'ally general' : 'ally'}`;
    tip.replaceChildren(...tipBody({ def: d, side: 0, hp: d.hp * m, maxHp: d.hp * m, dmg: d.dmg * m, armor: d.armor, speed: d.speed, range: d.range, cd: d.cd, pow: m, level: lv, gs: d.kind === 'general' ? extraSkillsAt(id, lv) : undefined }));
    tip.style.display = 'block';
    const sr = this.screen.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    const w = tip.offsetWidth;
    const hh = tip.offsetHeight;
    tip.style.left = `${Math.max(4, Math.min(sr.width - w - 4, cr.left - sr.left + cr.width / 2 - w / 2))}px`;
    tip.style.top = `${Math.max(4, cr.top - sr.top - hh - 8)}px`;
  }

  private hideCardTip() {
    this.cardTip.style.display = 'none';
  }
}
