import { h } from './dom';
import { getLang, t } from '../i18n';
import { inbox, isUnread, markAllRead } from '../notices';
import { openModal } from './common';

/** Hộp thư thông báo của admin; đóng hộp thì đánh dấu tất cả đã đọc */
export function openInbox(onClose?: () => void) {
  const fresh = new Set(inbox.list.filter((n) => isUnread(n.id)).map((n) => n.id));
  markAllRead();
  const when = (ms: number) => new Date(ms).toLocaleString(getLang() === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'short', timeStyle: 'short' });
  const m = openModal((close) =>
    h(
      'div',
      { class: 'inbox' },
      h('h2', { text: `🔔 ${t('inbox.title')}` }),
      inbox.list.length
        ? h(
            'div',
            { class: 'inbox-list' },
            ...inbox.list.map((n) =>
              h(
                'article',
                { class: `inbox-item${fresh.has(n.id) ? ' fresh' : ''}` },
                h('div', { class: 'inbox-top' }, h('b', { text: n.title }), fresh.has(n.id) ? h('span', { class: 'pill', text: t('inbox.new') }) : null),
                h('p', { text: n.body }),
                h('small', { text: when(n.createdAt) }),
              ),
            ),
          )
        : h('p', { class: 'inbox-empty', text: t('inbox.empty') }),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn primary', text: t('common.close'), attrs: { type: 'button' }, on: { click: () => { close(); onClose?.(); } } })),
    ),
  );
  m.el.addEventListener('pointerdown', (e) => { if (e.target === m.el) onClose?.(); });
}
