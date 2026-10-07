import type { Application, Ticker } from 'pixi.js';
import { h } from './dom';
import { getLang, onLang, stationName, t, unitDesc, unitName, unitSkill } from '../i18n';
import { STATIONS, stationLabel, type Station } from '../data/campaign';
import { MAX_DEFENSES_PER_LANE, UNITS, levelMul, type UnitDef } from '../data/units';
import { Battle, OVERTIME_AT, PLAYER_INCOME, type UnitInst } from '../game/sim';
import { EnemyAI } from '../game/ai';
import { BattleView } from '../render/battleView';
import { mutate, state } from '../state';
import { langSwitch, openModal, portrait, toast, fmt, type Modal } from './common';
import { faceUrl, iconUrl } from '../render/icons';
import { rewardFor, starsFor } from '../game/rewards';

export type ExitAction = 'menu' | 'retry' | 'next';

export class BattleScreen {
  private battle: Battle;
  private ai: EnemyAI;
  private view: BattleView;
  private station: Station;
  private deck: string[];

  private screen = h('div', { class: 'screen battle' });
  private hudHost = h('div', { class: 'hud-host' });
  private field = h('div', { class: 'field' });
  private handHost = h('div', { class: 'hand-host' });
  private ro: ResizeObserver;
  private offLang: () => void;

  private paused = false;
  private speed = 1;
  private selected: string | null = null;
  private resultT = 0;
  private resultShown = false;
  private disposed = false;
  private pauseModal: Modal | null = null;
  private resultModal: Modal | null = null;
  private deployedOnce = false;
  private tip = h('div', { class: 'unit-tip' });
  private cardTip = h('div', { class: 'unit-tip card-tip' });
  private tipUnit: UnitInst | null = null;
  private tipUntil = 0;
  private tipX = 0;
  private tipY = 0;
  private tipKey = '';

  private el: {
    timer?: HTMLElement; pips?: HTMLElement[]; gold?: HTMLElement; goldBar?: HTMLElement; goldRow?: HTMLElement;
    cards?: Map<string, HTMLElement>; info?: HTMLElement; speed?: HTMLElement;
    dialMy?: HTMLElement[]; dialEn?: HTMLElement[]; income?: HTMLElement;
    capText?: HTMLElement; capBtn?: HTMLElement; capCost?: HTMLElement; foeLeft?: HTMLElement;
  } = {};
  private lastCardState = '';
  private drag: { id: string; sx: number; sy: number; moved: boolean; ghost?: HTMLElement; pid: number } | null = null;

  constructor(private app: Application, private root: HTMLElement, private stIdx: number, private onExit: (a: ExitAction) => void) {
    const save = state.save!;
    this.station = STATIONS[stIdx];
    // lính | đồ phòng thủ | tướng (phím tắt 1..n theo thứ tự hiển thị)
    this.deck = [
      ...save.deck.filter((id) => UNITS[id]?.kind === 'troop'),
      ...save.defDeck.filter((id) => UNITS[id]?.kind === 'defense'),
      ...save.deck.filter((id) => UNITS[id]?.kind === 'general'),
    ];
    this.battle = new Battle({ station: this.station, levels: { ...save.unlocked } });
    this.ai = new EnemyAI(this.battle, this.station.deck);
    this.view = new BattleView(app, this.battle, this.station);

    // chỉ ở bản dev: để kiểm thử hiệu ứng từ console
    if (import.meta.env.DEV) (window as unknown as { __empire?: unknown }).__empire = { battle: this.battle, view: this.view, screen: this };

    this.screen.append(this.field, this.handHost, this.cardTip);
    this.field.append(app.canvas, this.hudHost, this.tip);
    this.root.replaceChildren(this.screen);
    this.buildUi();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.field);
    this.resize();

    this.field.addEventListener('pointerdown', this.onFieldDown);
    this.field.addEventListener('pointermove', this.onFieldMove);
    this.field.addEventListener('pointerleave', this.onFieldLeave);
    window.addEventListener('keydown', this.onKey);
    this.offLang = onLang(() => this.buildUi());
    app.ticker.add(this.tick);
    app.ticker.start();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.app.ticker.remove(this.tick);
    this.ro.disconnect();
    this.offLang();
    window.removeEventListener('keydown', this.onKey);
    this.field.removeEventListener('pointerdown', this.onFieldDown);
    this.field.removeEventListener('pointermove', this.onFieldMove);
    this.field.removeEventListener('pointerleave', this.onFieldLeave);
    this.pauseModal?.close();
    this.resultModal?.close();
    this.drag?.ghost?.remove();
    this.view.destroy();
    this.app.canvas.remove();
  }

  private resize() {
    const r = this.field.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    this.app.renderer.resize(r.width, r.height);
    this.view.layout(r.width, r.height);
  }

  // ───────────────────────── giao diện DOM ─────────────────────────
  private face(id: string, side: 0 | 1, cls: string) {
    const src = faceUrl(id, side);
    return h('div', { class: `face ${cls}` }, src ? h('img', { attrs: { src, alt: '', draggable: 'false' } }) : null);
  }

  private buildUi() {
    const save = state.save!;
    const st = this.station;
    const laneN = this.battle.lanes.length;
    const pips = Array.from({ length: laneN }, () => h('span', { class: 'pip' }));
    const timer = h('div', { class: 'timer', text: '0:00' });
    const speed = h('button', { class: 'icon-btn round small', text: `×${this.speed}`, attrs: { type: 'button', 'aria-label': t('hud.speed') }, on: { click: () => this.toggleSpeed() } });
    const foeLeft = h('b', { text: '0' });
    const myId = this.deck.find((id) => UNITS[id].kind === 'general') ?? this.deck[0];
    const enemyId = st.boss ? (st.bossId ?? 'dongtrac') : st.deck.find((id) => UNITS[id].kind === 'general') ?? st.deck[st.deck.length - 1];
    this.hudHost.replaceChildren(
      h('header', { class: 'hud' },
        h('div', { class: 'cmd left' },
          this.face(myId, 0, 'mine'),
          h('div', { class: 'cmd-info' },
            h('b', { text: save.name }),
            h('span', { class: 'lv', text: `Lv. ${1 + save.wins}` }),
            h('div', { class: 'xp' }, h('i', { attrs: { style: `width:${((save.wins % 5) / 5) * 100}%` } }))),
          h('button', { class: 'icon-btn round', text: '⏸', attrs: { type: 'button', 'aria-label': t('hud.pause') }, on: { click: () => this.pause() } })),
        h('div', { class: 'stage-plate' },
          h('small', { text: t('hud.stage', { n: stationLabel(this.stIdx) }) }),
          h('div', { class: 'stage-time' }, h('i', { text: '⚔' }), timer),
          h('div', { class: 'pips' }, ...pips)),
        h('div', { class: 'cmd right' },
          speed,
          h('div', { class: 'cmd-info' },
            h('b', { text: stationName(st) }),
            h('span', { class: 'lv', text: `Lv. ${Math.round(st.power * 10)}` }),
            h('div', { class: 'foe-left', attrs: { title: t('hud.foeLeft') } }, h('i', { text: '☠' }), foeLeft)),
          this.face(enemyId, 1, 'enemy'))),
    );

    const capText = h('small', { class: 'cap', text: '/100' });
    const capCost = h('b', { text: '' });
    const capBtn = h('button', {
      class: 'cap-up', attrs: { type: 'button', title: t('hud.upgradeCap') },
      on: { click: () => this.upgradeCap() },
    }, h('span', { text: '⬆' }), capCost);
    const gold = h('b', { text: '0' });
    const goldBar = h('div', { class: 'gold-fill' });
    const income = h('small', { text: `+${PLAYER_INCOME}/s` });
    const goldRow = h('div', { class: 'gold-box' },
      h('span', { class: 'coin' }),
      h('div', { class: 'gold-num' }, gold, income),
      h('div', { class: 'gold-track' }, goldBar),
      capText,
      capBtn);
    const info = h('div', { class: 'info' });
    const cards = new Map<string, HTMLElement>();
    const hand = h('div', { class: 'hand' });
    let prevKind = '';
    this.deck.forEach((id, i) => {
      const d = UNITS[id];
      if (i > 0 && d.kind !== prevKind) hand.append(h('span', { class: 'hand-sep' }));
      prevKind = d.kind;
      const c = h('div', { class: `hcard ${d.kind}`, attrs: { 'data-id': id } },
        h('span', { class: 'key', text: String(i + 1) }),
        d.kind === 'general' ? this.face(id, 0, 'card-face') : portrait(id),
        h('span', { class: 'cost', text: String(d.cost) }),
        h('span', { class: 'nm', text: unitName(d) }));
      c.addEventListener('pointerdown', (e) => this.onCardDown(e, id, c));
      c.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && this.showCardTip(id, c));
      c.addEventListener('pointerleave', () => this.hideCardTip());
      c.addEventListener('contextmenu', (e) => e.preventDefault());
      cards.set(id, c);
      hand.append(c);
    });
    // đồng hồ lane: máu cờ ta (xanh) / địch (đỏ) mỗi làn
    const dialMy: HTMLElement[] = [];
    const dialEn: HTMLElement[] = [];
    const dial = h('div', { class: 'dial' }, h('div', { class: 'dial-title', text: t('hud.dragLane') }),
      ...Array.from({ length: laneN }, (_, i) => {
        const my = h('i', {});
        const en = h('i', {});
        dialMy.push(my);
        dialEn.push(en);
        return h('div', { class: 'dial-row' }, h('b', { text: String(i + 1) }), h('span', { class: 'bar my' }, my), h('span', { class: 'bar en' }, en));
      }));
    this.handHost.replaceChildren(h('footer', { class: 'hand-panel' }, info, h('div', { class: 'hand-row' }, goldRow, hand, dial)));
    this.el = { timer, pips, gold, goldBar, goldRow, cards, info, speed, dialMy, dialEn, income, capText, capBtn, capCost, foeLeft };
    this.lastCardState = '';
    this.refreshInfo();
    this.updateHud();
  }

  private refreshInfo() {
    const info = this.el.info!;
    const id = this.selected;
    if (!id) {
      info.className = 'info hint';
      info.textContent = this.deployedOnce ? t('hud.hintShort') : t('hud.hint');
      return;
    }
    const d = UNITS[id];
    info.className = 'info';
    info.replaceChildren(h('b', { text: unitName(d) }), h('span', { class: 'sk', text: ` · ${unitSkill(d)}` }), h('div', { class: 'desc', text: unitDesc(d) }));
  }

  private updateHud() {
    const b = this.battle;
    const e = this.el;
    const sec = Math.floor(b.time);
    e.timer!.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    e.timer!.classList.toggle('over', b.time > OVERTIME_AT);
    b.lanes.forEach((l, i) => {
      const p = e.pips![i];
      p.className = `pip${l.winner === 0 ? ' win' : l.winner === 1 ? ' lose' : ''}`;
    });
    b.lanes.forEach((l, i) => {
      e.dialMy![i].style.width = `${(l.flags[0].hp / l.flags[0].maxHp) * 100}%`;
      e.dialEn![i].style.width = `${(l.flags[1].hp / l.flags[1].maxHp) * 100}%`;
    });
    const cap = b.goldCap(0);
    e.gold!.textContent = String(Math.floor(b.gold[0]));
    e.goldBar!.style.width = `${Math.min(100, (b.gold[0] / cap) * 100)}%`;
    e.capText!.textContent = `/${cap}`;
    const upCost = b.capUpgradeCost();
    e.capCost!.textContent = upCost === null ? 'MAX' : String(upCost);
    e.capBtn!.classList.toggle('max', upCost === null);
    e.capBtn!.classList.toggle('poor', upCost !== null && b.gold[0] < upCost);
    e.foeLeft!.textContent = String(b.enemyLeft + b.enemyAlive);
    // trạng thái thẻ (chỉ cập nhật DOM khi đổi)
    const st = this.deck.map((id) => {
      const d = UNITS[id];
      return `${id}:${b.gold[0] >= d.cost ? 1 : 0}${d.kind === 'general' && b.generalOnField(0, id) ? 'u' : ''}${this.selected === id ? 's' : ''}`;
    }).join('|');
    if (st !== this.lastCardState) {
      this.lastCardState = st;
      for (const id of this.deck) {
        const d = UNITS[id];
        const c = e.cards!.get(id)!;
        c.classList.toggle('poor', b.gold[0] < d.cost);
        c.classList.toggle('used', d.kind === 'general' && b.generalOnField(0, id));
        c.classList.toggle('selected', this.selected === id);
      }
    }
  }

  // ───────────────────────── vòng lặp ─────────────────────────
  private tick = (ticker: Ticker) => {
    if (this.disposed) return;
    if (this.paused) return;
    const dt = Math.min(ticker.deltaMS / 1000, 0.05) * this.speed;
    this.ai.update(dt);
    this.battle.update(dt);
    this.view.update(dt);
    this.updateHud();
    this.updateTip();
    if (this.battle.over && !this.resultShown) {
      this.resultT += dt;
      if (this.resultT > 1.5) this.showResult();
    }
  };

  private toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1;
    this.el.speed!.textContent = `×${this.speed}`;
  }

  private pause() {
    if (this.paused || this.battle.over) return;
    this.paused = true;
    this.cancelDrag();
    this.pauseModal = openModal(
      (close) => h('div', { class: 'pause' },
        h('h2', { text: `⏸ ${t('hud.paused')}` }),
        h('div', { class: 'set-row' }, h('div', { class: 'set-label', text: t('settings.language') }), langSwitch()),
        h('div', { class: 'modal-actions col' },
          h('button', { class: 'btn primary big', text: `▶ ${t('hud.resume')}`, attrs: { type: 'button' }, on: { click: () => { close(); this.resume(); } } }),
          h('button', { class: 'btn danger', text: `🏳 ${t('hud.retreat')}`, attrs: { type: 'button' }, on: { click: () => { close(); this.pauseModal = null; this.onExit('menu'); } } }))),
      { dismissible: false },
    );
  }

  private resume() {
    this.paused = false;
    this.pauseModal = null;
  }

  // ───────────────────────── kéo thả ─────────────────────────
  private laneAtPoint(cx: number, cy: number): number {
    const r = this.field.getBoundingClientRect();
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return -1;
    const lane = this.view.laneAt(cy - r.top);
    return this.battle.lanes[lane].winner === null ? lane : -1;
  }

  private onCardDown(e: PointerEvent, id: string, card: HTMLElement) {
    if (this.paused || this.battle.over || e.button > 0) return;
    this.hideCardTip();
    e.preventDefault();
    this.drag = { id, sx: e.clientX, sy: e.clientY, moved: false, pid: e.pointerId };
    try {
      card.setPointerCapture(e.pointerId);
    } catch {
      /* một số trình duyệt từ chối capture; vẫn hoạt động nhờ sự kiện trên thẻ */
    }
    const move = (ev: PointerEvent) => this.onDragMove(ev);
    const up = (ev: PointerEvent) => {
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerup', up);
      card.removeEventListener('pointercancel', cancel);
      this.onDragEnd(ev, false);
    };
    const cancel = (ev: PointerEvent) => {
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerup', up);
      card.removeEventListener('pointercancel', cancel);
      this.onDragEnd(ev, true);
    };
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerup', up);
    card.addEventListener('pointercancel', cancel);
  }

  private onDragMove(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 8) {
      d.moved = true;
      const src = iconUrl(d.id);
      d.ghost = h('div', { class: 'drag-ghost' }, h('img', { attrs: { src, alt: '' } }));
      document.body.append(d.ghost);
      this.selected = d.id;
      this.refreshInfo();
    }
    if (d.moved && d.ghost) {
      d.ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -62%)`;
      const lane = this.laneAtPoint(e.clientX, e.clientY);
      this.view.setDrag(true, lane, UNITS[d.id].kind === 'defense' && lane >= 0 ? this.placeX(e.clientX) : -1);
    }
  }

  /** toạ độ lane (0..1000) ứng với vị trí ngang của con trỏ, giới hạn trong nửa sân nhà */
  private placeX(clientX: number): number {
    const r = this.field.getBoundingClientRect();
    return Math.max(90, Math.min(560, this.view.toLaneX(clientX - r.left)));
  }

  private onDragEnd(e: PointerEvent, canceled: boolean) {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    d.ghost?.remove();
    this.view.setDrag(false, -1);
    if (canceled) return;
    if (d.moved) {
      const lane = this.laneAtPoint(e.clientX, e.clientY);
      if (lane >= 0) this.tryDeploy(d.id, lane, UNITS[d.id].kind === 'defense' ? this.placeX(e.clientX) : undefined);
    } else {
      // chạm nhẹ: chọn / bỏ chọn thẻ
      this.selected = this.selected === d.id ? null : d.id;
      this.refreshInfo();
      this.updateHud();
    }
  }

  private cancelDrag() {
    if (!this.drag) return;
    this.drag.ghost?.remove();
    this.drag = null;
    this.view.setDrag(false, -1);
  }

  private onFieldDown = (e: PointerEvent) => {
    if (this.paused || this.battle.over) return;
    const lane = this.laneAtPoint(e.clientX, e.clientY);
    if (lane < 0) return;
    if (!this.selected) {
      // chạm vào quân (điện thoại không có hover): hiện thông tin vài giây
      const u = this.unitAtEvent(e);
      if (u) {
        this.tipUnit = u;
        this.tipUntil = performance.now() + 2600;
        this.placeTip(e);
        return;
      }
      return void this.nudgeHand();
    }
    this.tryDeploy(this.selected, lane, UNITS[this.selected].kind === 'defense' ? this.placeX(e.clientX) : undefined);
  };

  // ───────────────────────── thông tin khi rê chuột vào quân ─────────────────────────
  private unitAtEvent(e: PointerEvent): UnitInst | null {
    const r = this.field.getBoundingClientRect();
    return this.view.unitAt(e.clientX - r.left, e.clientY - r.top);
  }

  private placeTip(e: PointerEvent) {
    const r = this.field.getBoundingClientRect();
    this.tipX = e.clientX - r.left;
    this.tipY = e.clientY - r.top;
  }

  private onFieldMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || this.drag || this.paused) return;
    const u = this.unitAtEvent(e);
    this.tipUnit = u;
    this.tipUntil = 0;
    if (u) this.placeTip(e);
  };

  private onFieldLeave = () => {
    if (!this.tipUntil) this.tipUnit = null;
  };

  private updateTip() {
    const u = this.tipUnit;
    const tip = this.tip;
    if (!u || !u.alive || (this.tipUntil && performance.now() > this.tipUntil) || this.battle.over) {
      this.tipUnit = null;
      tip.style.display = 'none';
      this.tipKey = '';
      return;
    }
    const key = `${u.uid}|${Math.ceil(u.hp)}|${Math.round(u.armor)}|${Math.round(u.dmg)}|${Math.round(u.speed)}|${getLang()}`;
    if (key !== this.tipKey) {
      this.tipKey = key;
      tip.className = `unit-tip ${u.side === 0 ? 'ally' : 'foe'} ${u.def.kind}`;
      tip.replaceChildren(...tipBody({
        def: u.def, side: u.side, hp: u.hp, maxHp: u.maxHp, dmg: u.dmg, armor: u.armor, speed: u.speed, range: u.range, cd: u.cd, pow: u.pow,
        level: u.side === 0 ? state.save?.unlocked[u.def.id] : undefined,
      }));
    }
    tip.style.display = 'block';
    const fw = this.field.clientWidth;
    const w = tip.offsetWidth || 150;
    const hh = tip.offsetHeight || 60;
    const box = this.view.unitBox(u);
    const cx = box ? box.x : this.tipX;
    let top = box ? box.top - hh - 6 : this.tipY - hh - 20;
    if (top < 4) top = box ? box.bottom + 8 : this.tipY + 20; // sát mép trên: đặt phía dưới chân
    tip.style.left = `${Math.max(4, Math.min(fw - w - 4, cx - w / 2))}px`;
    tip.style.top = `${top}px`;
  }

  /** rê chuột vào thẻ bài: xem đầy đủ chỉ số và kỹ năng (theo cấp thẻ hiện tại) */
  private showCardTip(id: string, card: HTMLElement) {
    if (this.drag) return;
    const d = UNITS[id];
    const lv = state.save?.unlocked[id] ?? 1;
    const m = levelMul(lv);
    const tip = this.cardTip;
    tip.className = `unit-tip card-tip ${d.kind === 'general' ? 'ally general' : 'ally'}`;
    tip.replaceChildren(...tipBody({ def: d, side: 0, hp: d.hp * m, maxHp: d.hp * m, dmg: d.dmg * m, armor: d.armor, speed: d.speed, range: d.range, cd: d.cd, pow: m, level: lv }));
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

  private onKey = (e: KeyboardEvent) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape' || e.key === 'p') return void this.pause();
    if (this.paused || this.battle.over) return;
    const n = Number(e.key);
    if (n >= 1 && n <= this.deck.length) {
      this.selected = this.deck[n - 1];
      this.refreshInfo();
      this.updateHud();
      return;
    }
    if (e.key.toLowerCase() === 'u') return void this.upgradeCap();
    const laneKey = ['q', 'w', 'e'].indexOf(e.key.toLowerCase());
    if (laneKey >= 0 && laneKey < this.battle.lanes.length && this.selected) this.tryDeploy(this.selected, laneKey);
  };

  private nudgeHand() {
    const info = this.el.info!;
    info.classList.remove('nudge');
    void info.offsetWidth;
    info.classList.add('nudge');
  }

  /** nâng cấp giới hạn vàng (trả bằng vàng trong trận) */
  private upgradeCap() {
    const b = this.battle;
    if (b.over || this.paused) return;
    const cost = b.capUpgradeCost();
    if (cost === null) return void toast(t('hud.capMax'), 'info');
    if (!b.upgradeCap()) {
      const row = this.el.goldRow!;
      row.classList.remove('nogold');
      void row.offsetWidth;
      row.classList.add('nogold');
      return;
    }
    toast(t('hud.capUp', { cap: b.goldCap(0) }), 'good');
  }

  private tryDeploy(id: string, lane: number, x?: number) {
    const b = this.battle;
    const d = UNITS[id];
    if (b.lanes[lane].winner !== null) return;
    if (d.kind === 'general' && b.generalOnField(0, id)) return void toast(t('hud.generalUsed'), 'error');
    if (d.kind === 'defense' && b.defensesIn(0, lane) >= MAX_DEFENSES_PER_LANE) return void toast(t('hud.defenseFull', { n: MAX_DEFENSES_PER_LANE }), 'error');
    if (b.gold[0] < d.cost) {
      const row = this.el.goldRow!;
      row.classList.remove('nogold');
      void row.offsetWidth;
      row.classList.add('nogold');
      return;
    }
    if (b.deploy(0, id, lane, x)) {
      this.deployedOnce = true;
      this.refreshInfo();
    }
  }

  // ───────────────────────── kết quả ─────────────────────────
  private showResult() {
    if (this.resultShown) return;
    this.resultShown = true;
    const b = this.battle;
    const win = b.winner === 0;
    const save = state.save!;
    const idx = this.stIdx;
    const first = win && !save.cleared[idx];
    const coins = rewardFor(this.station, win, first);
    const last = STATIONS.length - 1;
    const campaignDone = win && first && idx === last;
    const chapterDone = win && first && this.station.boss && idx !== last;
    const stars = starsFor(win, b.wins[1], b.time, this.station.fastSec);
    const bestBefore = save.stars[idx] ?? 0;
    mutate((s) => {
      s.coins += coins;
      if (win) {
        s.wins++;
        s.cleared[idx] = true;
        s.stars[idx] = Math.max(s.stars[idx] ?? 0, stars);
        s.progress = Math.max(s.progress, Math.min(idx + 1, last));
      } else s.losses++;
    }, true);
    const time = Math.floor(b.time);
    const hasNext = win && idx < last;
    this.resultModal = openModal(
      () => h('div', { class: `result ${win ? 'win' : 'lose'}` },
        h('div', { class: 'res-ico', text: win ? '🏆' : '💀' }),
        h('h2', { text: win ? t('result.win') : t('result.lose') }),
        win ? h('div', { class: 'res-stars' }, ...[1, 2, 3].map((n) => h('span', { class: `rs${n <= stars ? ' on' : ''}${n <= stars && n > bestBefore ? ' new' : ''}`, text: '★', attrs: { style: `animation-delay:${0.15 * n}s` } }))) : null,
        h('p', { class: 'res-sub', text: win ? t('result.winSub', { name: stationName(this.station) }) : t('result.loseSub') }),
        h('div', { class: 'res-stats' },
          h('div', {}, h('small', { text: t('result.lanes') }), h('b', { text: `${b.wins[0]} – ${b.wins[1]}` })),
          h('div', {}, h('small', { text: t('result.time') }), h('b', { text: `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}` })),
          h('div', {}, h('small', { text: t('result.kills') }), h('b', { text: String(b.kills[0]) }))),
        h('div', { class: 'res-reward', text: `🪙 +${fmt(coins)}` }),
        b.bountyTotal[0] > 0 ? h('div', { class: 'res-bounty', text: `💰 ${t('result.bounty', { n: b.bountyTotal[0] })}` }) : null,
        chapterDone ? h('div', { class: 'banner-win', text: `🎉 ${t('result.chapterDone', { n: this.station.chapter + 1 })}` }) : null,
        campaignDone ? h('div', { class: 'banner-win', text: `🎉 ${t('result.campaignDone')}` }) : null,
        !win ? h('p', { class: 'res-tip', text: t('result.tip') }) : null,
        h('div', { class: 'modal-actions col' },
          hasNext ? h('button', { class: 'btn primary big', text: `${t('result.next')} ▸`, attrs: { type: 'button' }, on: { click: () => this.onExit('next') } }) : null,
          h('button', { class: `btn ${hasNext ? 'ghost' : 'primary big'}`, text: `↻ ${t('result.retry')}`, attrs: { type: 'button' }, on: { click: () => this.onExit('retry') } }),
          h('button', { class: 'btn ghost', text: t('result.menu'), attrs: { type: 'button' }, on: { click: () => this.onExit('menu') } }))),
      { dismissible: false },
    );
  }
}


// ───────────────────────── nội dung tooltip (quân trên chiến trường và thẻ bài) ─────────────────────────
interface TipData {
  def: UnitDef;
  side: 0 | 1;
  hp: number;
  maxHp: number;
  dmg: number;
  armor: number;
  speed: number;
  range: number;
  cd: number;
  pow: number;
  level?: number;
}

function tipBody(d: TipData): HTMLElement[] {
  const { def } = d;
  const ally = d.side === 0;
  const pct = Math.max(0, Math.min(1, d.hp / d.maxHp));
  const stat = (ico: string, val: string, title: string) => h('span', { class: 'ts', attrs: { title } }, h('i', { text: ico }), val);
  const tags = [t(`kind.${def.kind}`), t(ally ? 'hud.ally' : 'hud.foe'), d.level ? `Lv ${d.level}` : ''].filter(Boolean).join(' · ');
  const stats: HTMLElement[] = [];
  if (def.kind === 'defense') {
    if (def.skill === 'altar') stats.push(stat('✚', String(Math.round(d.dmg)), t('stat.heal')));
    else if (def.dmg > 0) stats.push(stat('⚔', String(Math.round(d.dmg)), t('stat.atk')));
    if (def.dmg > 0 || def.skill === 'altar') stats.push(stat('⏱', `${Number(d.cd.toFixed(2))}s`, t('stat.cd')));
    if (def.range > 0) stats.push(stat('🎯', String(d.range), t('stat.rng')));
    if (d.armor > 0) stats.push(stat('🛡', String(Math.round(d.armor)), t('stat.armor')));
  } else if (def.skill === 'heal') stats.push(stat('✚', String(Math.round(15 * d.pow)), t('stat.heal')));
  else {
    stats.push(stat(def.skill === 'bomb' ? '💥' : '⚔', String(Math.round(d.dmg)), t('stat.atk')));
    if (def.skill !== 'bomb') stats.push(stat('⏱', `${Number(d.cd.toFixed(2))}s`, t('stat.cd')));
  }
  if (def.kind !== 'defense') {
    stats.push(stat('👟', String(Math.round(d.speed)), t('stat.spd')));
    stats.push(stat('🎯', d.range > 70 ? String(d.range) : t('stat.melee'), t('stat.rng')));
    stats.push(stat('🛡', String(Math.round(d.armor)), t('stat.armor')));
  }
  return [
    h('div', { class: 'tip-head' }, h('b', { text: unitName(def) }), h('em', { text: tags })),
    h('div', { class: 'tip-hp' }, h('span', { text: `❤ ${Math.ceil(d.hp)} / ${Math.ceil(d.maxHp)}` }), h('span', { class: 'bar' }, h('i', { attrs: { style: `width:${pct * 100}%` } }))),
    h('div', { class: 'tip-stats' }, ...stats),
    h('div', { class: 'tip-skill' }, h('b', { text: `✦ ${unitSkill(def)}` }), h('p', { text: unitDesc(def) })),
  ];
}
