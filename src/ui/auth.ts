import { h } from './dom';
import { t } from '../i18n';
import { langSwitch } from './common';
import { AuthError, type Backend } from '../backend/types';
import { normalizeName, validName } from '../backend/names';

let mode: 'login' | 'register' = 'login';

export function renderAuth(root: HTMLElement, backend: Backend, redraw: () => void) {
  root.replaceChildren();
  const err = h('div', { class: 'form-error', attrs: { role: 'alert' } });
  const user = h('input', { class: 'input', attrs: { type: 'text', autocomplete: 'username', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', placeholder: t('auth.username'), maxlength: '40' } });
  const pass = h('input', { class: 'input', attrs: { type: 'password', autocomplete: mode === 'login' ? 'current-password' : 'new-password', placeholder: t('auth.password'), maxlength: '60' } });
  const pass2 = h('input', { class: 'input', attrs: { type: 'password', autocomplete: 'new-password', placeholder: t('auth.password2'), maxlength: '60' } });
  const submit = h('button', { class: 'btn primary big', attrs: { type: 'submit' }, text: mode === 'login' ? t('auth.login') : t('auth.register') });

  const tab = (m: 'login' | 'register', label: string) =>
    h('button', {
      class: `tab${mode === m ? ' active' : ''}`,
      text: label,
      attrs: { type: 'button' },
      on: {
        click: () => {
          mode = m;
          redraw();
        },
      },
    });

  const form = h(
    'form',
    {
      class: 'auth-form',
      attrs: { novalidate: '' },
      on: {
        submit: async (e) => {
          e.preventDefault();
          err.textContent = '';
          const name = normalizeName(user.value);
          const bad = validName(name);
          if (bad) return void (err.textContent = t(bad));
          if (pass.value.length < 6) return void (err.textContent = t('err.weakPw'));
          if (mode === 'register' && pass.value !== pass2.value) return void (err.textContent = t('err.pwMismatch'));
          submit.disabled = true;
          submit.classList.add('busy');
          try {
            if (mode === 'register') await backend.register(name, pass.value);
            else await backend.login(name, pass.value);
            // onAuth sẽ chuyển màn hình
          } catch (ex) {
            err.textContent = ex instanceof AuthError ? t(ex.key) + (ex.detail ? ` (${ex.detail})` : '') : String(ex);
            submit.disabled = false;
            submit.classList.remove('busy');
          }
        },
      },
    },
    h('div', { class: 'tabs' }, tab('login', t('auth.login')), tab('register', t('auth.register'))),
    h('label', { class: 'field' }, h('span', { text: t('auth.username') }), user),
    h('label', { class: 'field' }, h('span', { text: t('auth.password') }), pass),
    mode === 'register' ? h('label', { class: 'field' }, h('span', { text: t('auth.password2') }), pass2) : null,
    err,
    submit,
    h('p', { class: 'hint', text: mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount'), on: { click: () => { mode = mode === 'login' ? 'register' : 'login'; redraw(); } } }),
  );

  const screen = h(
    'div',
    { class: 'screen auth' },
    h('div', { class: 'auth-lang' }, langSwitch(true)),
    h(
      'div',
      { class: 'auth-card' },
      h('div', { class: 'logo' }, h('span', { class: 'logo-ico', text: '🏯' }), h('h1', { text: t('app.title') }), h('p', { text: t('app.tagline') })),
      form,
      backend.kind === 'local' ? h('div', { class: 'note', text: t('auth.offline') }) : null,
    ),
  );
  root.append(screen);
  user.focus();
}
