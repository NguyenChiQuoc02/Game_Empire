import { h } from './dom';
import { getLang, LANGS, onLang, setLang, t, type Lang } from '../i18n';
import { levelMul, type UnitDef } from '../data/units';
import { iconUrl } from '../render/icons';

export function toast(msg: string, kind: 'info' | 'error' | 'good' = 'info') {
  let host = document.getElementById('toasts');
  if (!host) {
    host = h('div', { attrs: { id: 'toasts' } });
    document.body.append(host);
  }
  const el = h('div', { class: `toast ${kind}`, text: msg });
  host.append(el);
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3100);
}

export interface Modal {
  el: HTMLElement;
  close(): void;
}

/** Hộp thoại; `build` nhận hàm render lại nội dung khi đổi ngôn ngữ */
export function openModal(build: (close: () => void) => HTMLElement, opts: { dismissible?: boolean } = {}): Modal {
  const back = h('div', { class: 'modal-back' });
  const box = h('div', { class: 'modal' });
  back.append(box);
  const off = onLang(render);
  const close = () => {
    off();
    back.classList.add('out');
    setTimeout(() => back.remove(), 160);
  };
  function render() {
    box.replaceChildren(build(close));
  }
  render();
  if (opts.dismissible !== false) {
    back.addEventListener('pointerdown', (e) => {
      if (e.target === back) close();
    });
  }
  document.body.append(back);
  return { el: back, close };
}

export const LANG_LABEL: Record<Lang, string> = { vi: 'Tiếng Việt', en: 'English' };

/** Công tắc chọn ngôn ngữ (VI / EN) */
export function langSwitch(compact = false): HTMLElement {
  const wrap = h('div', { class: `lang-switch${compact ? ' compact' : ''}`, attrs: { role: 'group', 'aria-label': t('settings.language') } });
  const draw = () => {
    wrap.replaceChildren(
      ...LANGS.map((l) =>
        h('button', {
          class: `lang-btn${getLang() === l ? ' active' : ''}`,
          text: compact ? l.toUpperCase() : LANG_LABEL[l],
          attrs: { type: 'button', 'aria-pressed': String(getLang() === l) },
          on: { click: () => setLang(l) },
        }),
      ),
    );
  };
  draw();
  onLang(draw);
  return wrap;
}

export const fmt = (n: number) => Math.round(n).toLocaleString(getLang() === 'vi' ? 'vi-VN' : 'en-US');

export function portrait(id: string, side: 0 | 1 = 0, cls = ''): HTMLElement {
  const src = iconUrl(id, side);
  return h('div', { class: `portrait ${cls}` }, src ? h('img', { attrs: { src, alt: '', draggable: 'false' } }) : null);
}

/** Chỉ số rút gọn của một đơn vị ở cấp độ `lv` */
export function statLine(def: UnitDef, lv: number): HTMLElement {
  const m = levelMul(lv);
  const item = (icon: string, val: string, tip: string) =>
    h('span', { class: 'stat', attrs: { title: tip } }, h('i', { text: icon }), val);
  if (def.kind === 'defense') {
    return h(
      'div',
      { class: 'stats' },
      item('❤', def.hp > 1 ? fmt(def.hp * m) : '—', t('stat.hp')),
      def.skill === 'altar' ? item('✚', fmt(def.dmg * m), t('stat.heal')) : def.dmg > 0 ? item('⚔', fmt(def.dmg * m), t('stat.atk')) : null,
      def.dmg > 0 || def.skill === 'altar' ? item('⏱', `${def.cd}s`, t('stat.cd')) : null,
      def.range > 0 ? item('🎯', String(def.range), t('stat.rng')) : null,
      def.armor > 0 ? item('🛡', String(def.armor), t('stat.armor')) : null,
    );
  }
  return h(
    'div',
    { class: 'stats' },
    item('❤', fmt(def.hp * m), t('stat.hp')),
    def.dmg > 0 ? item('⚔', fmt(def.dmg * m), t('stat.atk')) : item('✚', '15', t('stat.heal')),
    item('👟', String(def.speed), t('stat.spd')),
    item('🎯', def.range > 70 ? String(def.range) : t('stat.melee'), t('stat.rng')),
    def.armor > 0 ? item('🛡', String(def.armor), t('stat.armor')) : null,
  );
}
