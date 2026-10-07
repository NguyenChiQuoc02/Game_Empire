import { h } from './dom';
import { fmt, langSwitch, openModal, toast } from './common';
import { getLang, onLang, stationName, t } from '../i18n';
import { AuthError, type Notice } from '../backend/types';
import type { AdminApi, PlayerRow } from '../backend/admin';
import { STATIONS, stationLabel } from '../data/campaign';
import { DEFENSES, PLAYABLE } from '../data/units';

type Tab = 'players' | 'notices';

const clearedCount = (p: PlayerRow) => (p.save ? p.save.cleared.filter(Boolean).length : 0);
const totalStars = (p: PlayerRow) => (p.save ? p.save.stars.reduce((a, b) => a + b, 0) : 0);
const fmtDate = (ms: number) => (ms ? new Date(ms).toLocaleString(getLang() === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }) : '—');

/** Trạm hiện tại của người chơi: trạm cao nhất đã mở (hoặc "xong" nếu đã hạ hết) */
function currentStation(p: PlayerRow): string {
  if (!p.save) return '—';
  if (p.save.cleared.every(Boolean)) return t('adm.allDone');
  return stationLabel(p.save.progress);
}

export function renderAdmin(root: HTMLElement, api: AdminApi) {
  document.title = t('adm.title');
  let authed = false;
  let tab: Tab = 'players';
  let players: PlayerRow[] = [];
  let notices: Notice[] = [];
  let loading = false;
  let search = '';
  /** người chơi được chọn (để gửi thông báo riêng) */
  const picked = new Set<string>();
  let audience: 'all' | 'picked' = 'all';
  let draft = { title: '', body: '' };

  const fail = (e: unknown) => {
    console.error(e);
    const msg = e instanceof AuthError ? t(e.key) : String((e as Error)?.message ?? e);
    toast(msg, 'error');
  };

  async function reload() {
    loading = true;
    draw();
    try {
      [players, notices] = await Promise.all([api.listPlayers(), api.listNotices()]);
      players.sort((a, b) => (b.save?.updatedAt ?? 0) - (a.save?.updatedAt ?? 0));
      for (const id of [...picked]) if (!players.some((p) => p.uid === id)) picked.delete(id);
    } catch (e) {
      fail(e);
    }
    loading = false;
    draw();
  }

  // ───────────────────────── đăng nhập ─────────────────────────
  function loginView(): HTMLElement {
    const user = h('input', { attrs: { type: 'text', autocomplete: 'username', placeholder: t('auth.username'), value: 'admin' } });
    const pass = h('input', { attrs: { type: 'password', autocomplete: 'current-password', placeholder: t('auth.password') } });
    const err = h('p', { class: 'err' });
    const form = h(
      'form',
      {
        class: 'auth-card adm-login',
        on: {
          submit: async (e) => {
            e.preventDefault();
            err.textContent = '';
            try {
              await api.login(user.value, pass.value);
              authed = true;
              await reload();
            } catch (ex) {
              err.textContent = ex instanceof AuthError ? t(ex.key) : String((ex as Error)?.message ?? ex);
            }
          },
        },
      },
      h('div', { class: 'logo-ico', text: '🛡' }),
      h('h1', { text: t('adm.title') }),
      h('p', { class: 'sub', text: t('adm.loginHint') }),
      h('label', { class: 'afield' }, h('span', { text: t('auth.username') }), user),
      h('label', { class: 'afield' }, h('span', { text: t('auth.password') }), pass),
      err,
      h('button', { class: 'btn primary big', attrs: { type: 'submit' }, text: t('auth.login') }),
      api.kind === 'local' ? h('p', { class: 'warn', text: t('adm.localMode') }) : null,
    );
    return h('div', { class: 'screen auth' }, h('div', { class: 'auth-lang' }, langSwitch(true)), form);
  }

  // ───────────────────────── khung chính ─────────────────────────
  function shell(body: HTMLElement): HTMLElement {
    const tabBtn = (k: Tab, label: string) =>
      h('button', { class: `adm-tab${tab === k ? ' active' : ''}`, text: label, attrs: { type: 'button' }, on: { click: () => { tab = k; draw(); } } });
    return h(
      'div',
      { class: 'adm' },
      h(
        'header',
        { class: 'adm-head' },
        h('div', { class: 'adm-brand' }, h('span', { text: '🛡' }), h('b', { text: t('adm.title') }), h('small', { text: api.kind === 'firebase' ? t('settings.cloud') : t('settings.local') })),
        h('nav', { class: 'adm-tabs' }, tabBtn('players', `👥 ${t('adm.tabPlayers')} (${players.length})`), tabBtn('notices', `🔔 ${t('adm.tabNotices')}`)),
        h(
          'div',
          { class: 'adm-right' },
          langSwitch(true),
          h('button', { class: 'btn ghost small', text: `↻ ${t('adm.refresh')}`, attrs: { type: 'button' }, on: { click: () => void reload() } }),
          h('button', { class: 'btn danger small', text: t('settings.logout'), attrs: { type: 'button' }, on: { click: async () => { await api.logout(); authed = false; draw(); } } }),
        ),
      ),
      loading ? h('div', { class: 'adm-loading', text: t('boot.loading') }) : body,
    );
  }

  // ───────────────────────── tab người chơi ─────────────────────────
  const matches = (p: PlayerRow) => !search || p.name.toLowerCase().includes(search.toLowerCase());

  function playersView(): HTMLElement {
    const list = players.filter(matches);
    const locked = players.filter((p) => p.account.locked).length;
    const coins = players.reduce((a, p) => a + (p.save?.coins ?? 0), 0);
    const searchBox = h('input', { class: 'adm-search', attrs: { type: 'search', placeholder: `🔎 ${t('adm.search')}`, value: search } });
    searchBox.addEventListener('input', () => {
      search = searchBox.value;
      const pos = searchBox.selectionStart;
      draw();
      const nb = root.querySelector<HTMLInputElement>('.adm-search');
      nb?.focus();
      if (nb && pos !== null) nb.setSelectionRange(pos, pos);
    });

    const rows = list.map((p) => {
      const s = p.save;
      const check = h('input', { attrs: { type: 'checkbox', 'aria-label': p.name } });
      check.checked = picked.has(p.uid);
      check.addEventListener('change', () => {
        if (check.checked) picked.add(p.uid);
        else picked.delete(p.uid);
        draw();
      });
      return h(
        'tr',
        { class: p.account.locked ? 'locked' : '' },
        h('td', {}, check),
        h('td', { class: 'nm' }, h('b', { text: p.name }), s && s.name !== p.name ? h('small', { text: ` (${s.name})` }) : null),
        h('td', { text: currentStation(p) }),
        h('td', { text: `${clearedCount(p)}/${STATIONS.length}` }),
        h('td', { text: `★ ${totalStars(p)}` }),
        h('td', { class: 'num', text: s ? `🪙 ${fmt(s.coins)}` : '—' }),
        h('td', { text: s ? `${s.wins} / ${s.losses}` : '—' }),
        h('td', { text: s ? fmtDate(s.updatedAt) : '—' }),
        h('td', {}, h('span', { class: `pill ${p.account.locked ? 'bad' : 'ok'}`, text: p.account.locked ? `🔒 ${t('adm.locked')}` : t('adm.active') })),
        h(
          'td',
          { class: 'acts' },
          h('button', { class: 'btn small', text: `✎ ${t('adm.edit')}`, attrs: { type: 'button' }, on: { click: () => editPlayer(p) } }),
          h('button', { class: `btn small ${p.account.locked ? 'gold' : 'danger'}`, text: p.account.locked ? t('adm.unlock') : t('adm.lock'), attrs: { type: 'button' }, on: { click: () => lockPlayer(p) } }),
          h('button', { class: 'btn small', text: `🔔`, attrs: { type: 'button', title: t('adm.notifyOne') }, on: { click: () => { picked.clear(); picked.add(p.uid); audience = 'picked'; tab = 'notices'; draw(); } } }),
        ),
      );
    });

    return h(
      'div',
      { class: 'adm-body' },
      h(
        'div',
        { class: 'adm-stats' },
        h('div', { class: 'adm-stat' }, h('small', { text: t('adm.statPlayers') }), h('b', { text: String(players.length) })),
        h('div', { class: 'adm-stat' }, h('small', { text: t('adm.statLocked') }), h('b', { text: String(locked) })),
        h('div', { class: 'adm-stat' }, h('small', { text: t('adm.statCoins') }), h('b', { text: fmt(coins) })),
      ),
      h(
        'div',
        { class: 'adm-bar' },
        searchBox,
        h('span', { class: 'adm-picked', text: t('adm.picked', { n: picked.size }) }),
        h('button', { class: 'btn small', text: t('adm.pickAll'), attrs: { type: 'button' }, on: { click: () => { list.forEach((p) => picked.add(p.uid)); draw(); } } }),
        h('button', { class: 'btn small', text: t('adm.pickNone'), attrs: { type: 'button' }, on: { click: () => { picked.clear(); draw(); } } }),
        h('button', { class: 'btn primary small', text: `🔔 ${t('adm.notifyPicked')}`, attrs: { type: 'button' }, on: { click: () => { if (!picked.size) return toast(t('adm.needPick'), 'info'); audience = 'picked'; tab = 'notices'; draw(); } } }),
      ),
      list.length
        ? h(
            'div',
            { class: 'adm-table-wrap' },
            h(
              'table',
              { class: 'adm-table' },
              h(
                'thead',
                {},
                h(
                  'tr',
                  {},
                  ...['', t('adm.colName'), t('adm.colStation'), t('adm.colCleared'), t('adm.colStars'), t('adm.colCoins'), t('adm.colWL'), t('adm.colUpdated'), t('adm.colStatus'), ''].map((c) => h('th', { text: c })),
                ),
              ),
              h('tbody', {}, ...rows),
            ),
          )
        : h('p', { class: 'adm-empty', text: t('adm.noPlayers') }),
    );
  }

  function editPlayer(p: PlayerRow) {
    const s = p.save;
    if (!s) return toast(t('adm.noSave'), 'error');
    const num = (v: number, min: number, max?: number) =>
      h('input', { attrs: { type: 'number', min: String(min), ...(max !== undefined ? { max: String(max) } : {}), value: String(v) } });
    const name = h('input', { attrs: { type: 'text', value: s.name, maxlength: '24' } });
    const coins = num(s.coins, 0);
    const wins = num(s.wins, 0);
    const losses = num(s.losses, 0);
    const prog = h('select', {});
    for (let i = 0; i < STATIONS.length; i++) prog.append(h('option', { text: `${stationLabel(i)} — ${stationName(STATIONS[i])}`, attrs: { value: String(i) } }));
    const allDone = s.cleared.every(Boolean);
    prog.value = String(s.progress);
    const done = h('input', { attrs: { type: 'checkbox' } });
    done.checked = allDone;
    const toInt = (el: HTMLInputElement, lo: number, hi = 1e9) => Math.max(lo, Math.min(hi, Math.floor(Number(el.value) || 0)));

    openModal((close) =>
      h(
        'div',
        { class: 'adm-edit' },
        h('h2', { text: `✎ ${p.name}` }),
        h('p', { class: 'adm-hint', text: t('adm.editHint') }),
        h('label', { class: 'afield' }, h('span', { text: t('adm.fName') }), name),
        h('label', { class: 'afield' }, h('span', { text: t('adm.fCoins') }), coins),
        h('label', { class: 'afield' }, h('span', { text: t('adm.fStation') }), prog),
        h('label', { class: 'afield inline' }, done, h('span', { text: t('adm.fAllDone') })),
        h('div', { class: 'two' }, h('label', { class: 'afield' }, h('span', { text: t('adm.fWins') }), wins), h('label', { class: 'afield' }, h('span', { text: t('adm.fLosses') }), losses)),
        h(
          'div',
          { class: 'adm-quick' },
          h('button', {
            class: 'btn small',
            text: t('adm.unlockAll'),
            attrs: { type: 'button' },
            on: { click: () => void apply(close, (x) => { for (const d of [...PLAYABLE, ...DEFENSES]) x.unlocked[d.id] = Math.max(1, x.unlocked[d.id] ?? 0); }) },
          }),
          h('button', {
            class: 'btn small danger',
            text: t('adm.resetProgress'),
            attrs: { type: 'button' },
            on: { click: () => { if (confirm(t('adm.confirmReset'))) void apply(close, (x) => { x.progress = 0; x.cleared = x.cleared.map(() => false); x.stars = x.stars.map(() => 0); }); } },
          }),
        ),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn ghost', text: t('common.cancel'), attrs: { type: 'button' }, on: { click: close } }),
          h('button', {
            class: 'btn primary',
            text: t('adm.save'),
            attrs: { type: 'button' },
            on: {
              click: () =>
                void apply(close, (x) => {
                  x.name = name.value.trim() || x.name;
                  x.coins = toInt(coins, 0);
                  x.wins = toInt(wins, 0);
                  x.losses = toInt(losses, 0);
                  const n = done.checked ? STATIONS.length : Number(prog.value);
                  x.progress = Math.min(STATIONS.length - 1, n);
                  x.cleared = STATIONS.map((_, i) => i < n);
                  x.stars = STATIONS.map((_, i) => (i < n ? Math.max(1, x.stars[i] ?? 0) : 0));
                }),
            },
          }),
        ),
      ),
    );

    async function apply(close: () => void, fn: (x: import('../backend/types').SaveData) => void) {
      try {
        await api.updateSave(p.uid, fn);
        toast(t('adm.saved'), 'good');
        close();
        await reload();
      } catch (e) {
        fail(e);
      }
    }
  }

  function lockPlayer(p: PlayerRow) {
    if (p.account.locked) {
      api
        .setLocked(p.uid, p.name, false)
        .then(() => { toast(t('adm.unlocked'), 'good'); return reload(); })
        .catch(fail);
      return;
    }
    const reason = h('input', { attrs: { type: 'text', placeholder: t('adm.reasonHint'), maxlength: '120' } });
    openModal((close) =>
      h(
        'div',
        { class: 'adm-edit' },
        h('h2', { text: `🔒 ${t('adm.lockTitle', { name: p.name })}` }),
        h('p', { class: 'adm-hint', text: t('adm.lockHint') }),
        h('label', { class: 'afield' }, h('span', { text: t('adm.reason') }), reason),
        h(
          'div',
          { class: 'modal-actions' },
          h('button', { class: 'btn ghost', text: t('common.cancel'), attrs: { type: 'button' }, on: { click: close } }),
          h('button', {
            class: 'btn danger',
            text: t('adm.lock'),
            attrs: { type: 'button' },
            on: { click: () => { api.setLocked(p.uid, p.name, true, reason.value.trim()).then(() => { toast(t('adm.lockedOk'), 'good'); close(); return reload(); }).catch(fail); } },
          }),
        ),
      ),
    );
  }

  // ───────────────────────── tab thông báo ─────────────────────────
  function noticesView(): HTMLElement {
    const title = h('input', { attrs: { type: 'text', maxlength: '80', placeholder: t('adm.nTitle'), value: draft.title } });
    const body = h('textarea', { attrs: { rows: '4', maxlength: '600', placeholder: t('adm.nBody') } });
    body.value = draft.body;
    title.addEventListener('input', () => (draft.title = title.value));
    body.addEventListener('input', () => (draft.body = body.value));

    const radio = (v: 'all' | 'picked', label: string) => {
      const r = h('input', { attrs: { type: 'radio', name: 'aud' } });
      r.checked = audience === v;
      r.addEventListener('change', () => { audience = v; draw(); });
      return h('label', { class: 'adm-radio' }, r, h('span', { text: label }));
    };

    const pickList = h(
      'div',
      { class: 'adm-picklist' },
      ...players.map((p) => {
        const c = h('input', { attrs: { type: 'checkbox' } });
        c.checked = picked.has(p.uid);
        c.addEventListener('change', () => {
          if (c.checked) picked.add(p.uid);
          else picked.delete(p.uid);
          const cnt = root.querySelector('.adm-pickcount');
          if (cnt) cnt.textContent = t('adm.picked', { n: picked.size });
        });
        return h('label', { class: 'adm-pick' }, c, h('span', { text: p.name }));
      }),
    );

    const send = async () => {
      if (!draft.title.trim() || !draft.body.trim()) return toast(t('adm.nNeed'), 'error');
      if (audience === 'picked' && !picked.size) return toast(t('adm.needPick'), 'error');
      const to = audience === 'all' ? 'all' : players.filter((p) => picked.has(p.uid)).map((p) => ({ uid: p.uid, name: p.name }));
      try {
        await api.sendNotice({ title: draft.title, body: draft.body, to });
        toast(t('adm.nSent'), 'good');
        draft = { title: '', body: '' };
        await reload();
      } catch (e) {
        fail(e);
      }
    };

    const history = notices.map((n) =>
      h(
        'div',
        { class: 'adm-notice' },
        h(
          'div',
          { class: 'adm-notice-top' },
          h('b', { text: n.title }),
          h('span', { class: 'pill', text: n.to === 'all' ? t('adm.toAll') : t('adm.toN', { n: n.uids.length }) }),
          h('small', { text: fmtDate(n.createdAt) }),
          h('button', { class: 'btn small danger', text: '✕', attrs: { type: 'button', title: t('adm.delete') }, on: { click: () => { if (confirm(t('adm.confirmDelete'))) api.deleteNotice(n.id).then(reload).catch(fail); } } }),
        ),
        h('p', { text: n.body }),
        n.to === 'users' && n.names?.length ? h('small', { class: 'to', text: `→ ${n.names.join(', ')}` }) : null,
      ),
    );

    return h(
      'div',
      { class: 'adm-body adm-notices' },
      h(
        'section',
        { class: 'adm-card' },
        h('h3', { text: `✉ ${t('adm.nNew')}` }),
        h('label', { class: 'afield' }, h('span', { text: t('adm.nTitleLabel') }), title),
        h('label', { class: 'afield' }, h('span', { text: t('adm.nBodyLabel') }), body),
        h('div', { class: 'adm-aud' }, radio('all', t('adm.audAll')), radio('picked', t('adm.audPicked'))),
        audience === 'picked' ? h('div', {}, h('div', { class: 'adm-pickcount', text: t('adm.picked', { n: picked.size }) }), pickList) : null,
        h('button', { class: 'btn primary big', text: `🔔 ${t('adm.nSend')}`, attrs: { type: 'button' }, on: { click: () => void send() } }),
      ),
      h('section', { class: 'adm-card' }, h('h3', { text: `📜 ${t('adm.nHistory')}` }), history.length ? h('div', { class: 'adm-notice-list' }, ...history) : h('p', { class: 'adm-empty', text: t('adm.nNone') })),
    );
  }

  function draw() {
    if (!authed) return root.replaceChildren(loginView());
    root.replaceChildren(shell(tab === 'players' ? playersView() : noticesView()));
  }

  onLang(() => {
    document.title = t('adm.title');
    draw();
  });

  draw();
  api
    .restore()
    .then(async (ok) => {
      if (ok) {
        authed = true;
        await reload();
      }
    })
    .catch(fail);
}
