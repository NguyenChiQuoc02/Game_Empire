import { AuthError, type AuthUser, type Backend, type SaveData } from './types';

// Chế độ offline: tài khoản + save nằm trong localStorage của trình duyệt.
const USERS = 'empire.users';
const SESSION = 'empire.session';
const saveKey = (uid: string) => `empire.save.${uid}`;

const readUsers = (): Record<string, string> => JSON.parse(localStorage.getItem(USERS) || '{}');
const enc = (pw: string) => btoa(encodeURIComponent(pw));

export function createLocalBackend(): Backend {
  let cb: ((u: AuthUser | null) => void) | null = null;
  const setSession = (name: string | null) => {
    if (name) localStorage.setItem(SESSION, name);
    else localStorage.removeItem(SESSION);
    cb?.(name ? { uid: name, name } : null);
  };
  return {
    kind: 'local',
    onAuth(fn) {
      cb = fn;
      const s = localStorage.getItem(SESSION);
      fn(s ? { uid: s, name: s } : null);
    },
    async register(name, pw) {
      const users = readUsers();
      if (users[name]) throw new AuthError('err.exists');
      users[name] = enc(pw);
      localStorage.setItem(USERS, JSON.stringify(users));
      setSession(name);
    },
    async login(name, pw) {
      const users = readUsers();
      if (users[name] !== enc(pw)) throw new AuthError('err.badLogin');
      setSession(name);
    },
    async logout() {
      setSession(null);
    },
    async loadSave(uid) {
      const s = localStorage.getItem(saveKey(uid));
      return s ? (JSON.parse(s) as SaveData) : null;
    },
    async writeSave(uid, data) {
      localStorage.setItem(saveKey(uid), JSON.stringify(data));
      return data;
    },
  };
}
