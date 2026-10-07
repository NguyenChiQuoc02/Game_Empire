import './ui/style.css';
import { Application } from 'pixi.js';
import { createBackend } from './backend';
import { normalizeSave } from './backend/save';
import type { Backend } from './backend/types';
import { buildIcons } from './render/icons';
import { setApp } from './render/app';
import { faceUrl, iconUrl } from './render/icons';
import { flush, mutate, onSaveStatus, refresh, setBase, state } from './state';
import { onLang, t } from './i18n';
import { h } from './ui/dom';
import { renderAuth } from './ui/auth';
import { focusStation, renderHome } from './ui/home';
import { BattleScreen, type ExitAction } from './ui/battle';
import { toast } from './ui/common';
import { STATIONS } from './data/campaign';

const root = document.getElementById('app')!;
document.title = t('app.title');

function splash(msg: string, extra?: HTMLElement[]) {
  root.replaceChildren(
    h('div', { class: 'splash' },
      h('div', {}, h('div', { class: 'logo-ico', text: '🏯' }), h('p', { text: msg }), ...(extra ?? []))),
  );
}

async function boot() {
  splash(t('boot.loading'));

  const app = new Application();
  await app.init({
    width: 320,
    height: 320,
    background: 0x07090f,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoStart: false,
  });
  setApp(app);
  await buildIcons(app);

  let backend: Backend;
  try {
    backend = await createBackend();
  } catch (e) {
    console.error(e);
    splash(t('boot.failed'), [h('p', { class: 'err', text: String((e as Error)?.message ?? e) })]);
    return;
  }
  state.backend = backend;

  let screen: 'auth' | 'home' | 'battle' = 'auth';
  let battle: BattleScreen | null = null;
  let token = 0;

  const redraw = () => {
    if (screen === 'auth') renderAuth(root, backend, redraw);
    else if (screen === 'home' && state.save) {
      renderHome(root, { onPlay: startBattle, onLogout: logout, redraw });
    }
  };

  const logout = async () => {
    await flush();
    await backend.logout();
  };

  const startBattle = (idx: number) => {
    battle?.dispose();
    screen = 'battle';
    battle = new BattleScreen(app, root, idx, (action: ExitAction) => {
      battle?.dispose();
      battle = null;
      app.ticker.stop();
      if (action === 'retry') return startBattle(idx);
      if (action === 'next' && idx + 1 < STATIONS.length) return startBattle(idx + 1);
      focusStation(state.save?.cleared[idx] ? Math.min(idx + 1, STATIONS.length - 1) : idx);
      screen = 'home';
      redraw();
    });
  };

  if (import.meta.env.DEV) Object.assign(window, { __game: { state, startBattle, icons: { iconUrl, faceUrl } } });

  onLang(() => {
    document.title = t('app.title');
    if (screen !== 'battle') redraw();
  });

  onSaveStatus((s, detail) => {
    if (s === 'error') toast(`${t('err.saveFail')}${detail ? ` (${detail})` : ''}`, 'error');
    if (s === 'merged' && screen === 'home') redraw();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
    // Quay lại tab sau khi chơi ở thiết bị khác: lấy tiến trình mới nhất từ server
    else if (screen === 'home') void refresh().then((changed) => changed && screen === 'home' && redraw()).catch(() => {});
  });
  window.addEventListener('pagehide', () => void flush());

  backend.onAuth(async (user) => {
    const my = ++token;
    battle?.dispose();
    battle = null;
    if (!user) {
      state.user = null;
      state.save = null;
      screen = 'auth';
      redraw();
      return;
    }
    splash(t('boot.loadingSave'));
    try {
      const raw = await backend.loadSave(user.uid);
      if (my !== token) return;
      state.user = user;
      state.save = normalizeSave(raw, user.name);
      setBase(state.save);
      if (!raw) mutate(() => {}, true);
      screen = 'home';
      redraw();
    } catch (e) {
      console.error(e);
      if (my !== token) return;
      splash(t('boot.saveFailed'), [
        h('p', { class: 'err', text: String((e as Error)?.message ?? e) }),
        h('button', { class: 'btn primary', text: t('boot.retry'), attrs: { type: 'button' }, on: { click: () => location.reload() } }),
        h('button', { class: 'btn ghost', text: t('settings.logout'), attrs: { type: 'button' }, on: { click: () => void backend.logout() } }),
      ]);
    }
  });
}

boot().catch((e) => {
  console.error(e);
  splash(t('boot.failed'), [h('p', { class: 'err', text: String((e as Error)?.message ?? e) })]);
});
