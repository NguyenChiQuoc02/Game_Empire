import { h } from './dom';
import { t } from '../i18n';
import { langSwitch, openModal } from './common';
import { state } from '../state';
import { getFx, setFx, type FxMode } from '../render/fxmode';

/** nút gạt hiệu ứng gọn / đầy đủ (dùng lại kiểu lang-switch) */
export function fxSwitch(): HTMLElement {
  const wrap = h('div', { class: 'lang-switch compact' });
  const draw = () => {
    wrap.replaceChildren(
      ...(['lite', 'full'] as FxMode[]).map((m) =>
        h('button', { class: `lang-btn${getFx() === m ? ' active' : ''}`, text: t(`settings.fx.${m}`), attrs: { type: 'button' }, on: { click: () => { setFx(m); draw(); } } })),
    );
  };
  draw();
  return wrap;
}

export function openSettings(opts: { onLogout?: () => void } = {}) {
  openModal((close) =>
    h(
      'div',
      { class: 'settings' },
      h('h2', { text: `⚙ ${t('settings.title')}` }),
      h('div', { class: 'set-row' }, h('div', { class: 'set-label', text: t('settings.language') }), langSwitch()),
      h('div', { class: 'set-row' }, h('div', { class: 'set-label', text: t('settings.fx') }), fxSwitch()),
      state.user ? h('div', { class: 'set-row' }, h('div', { class: 'set-label', text: t('settings.account') }), h('div', { class: 'set-val', text: state.user.name })) : null,
      state.backend
        ? h('div', { class: 'set-row' }, h('div', { class: 'set-label', text: t('settings.storage') }), h('div', { class: 'set-val', text: state.backend.kind === 'firebase' ? t('settings.cloud') : t('settings.local') }))
        : null,
      h(
        'div',
        { class: 'modal-actions' },
        opts.onLogout
          ? h('button', { class: 'btn danger', text: t('settings.logout'), attrs: { type: 'button' }, on: { click: () => { close(); opts.onLogout!(); } } })
          : null,
        h('button', { class: 'btn primary', text: t('common.close'), attrs: { type: 'button' }, on: { click: close } }),
      ),
    ),
  );
}
