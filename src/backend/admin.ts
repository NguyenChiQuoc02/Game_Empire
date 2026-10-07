import { AuthError, type Account, type Notice, type SaveData } from './types';
import { emailFor } from './names';
import { normalizeSave } from './save';
import { ACCT_PREFIX, NOTICES, readNotices } from './local';

export const ADMIN_USER = 'admin';
// Không để mật khẩu trong code (code chạy ở trình duyệt nên ai cũng đọc được).
// Firebase: mật khẩu do Firebase Auth kiểm tra, tài khoản admin@gameempire.app tạo tay trong Firebase Console.
// Offline (chỉ để thử trên máy): đặt VITE_LOCAL_ADMIN_PASS trong .env; để trống thì không đăng nhập admin được.
const LOCAL_ADMIN_PASS: string = import.meta.env.VITE_LOCAL_ADMIN_PASS ?? '';

export interface PlayerRow {
  uid: string;
  name: string;
  save: SaveData | null;
  account: Account;
}

export interface NewNotice {
  title: string;
  body: string;
  /** 'all' = toàn bộ người chơi; mảng = danh sách người nhận được chọn */
  to: 'all' | { uid: string; name: string }[];
}

export interface AdminApi {
  kind: 'firebase' | 'local';
  /** true nếu phiên đăng nhập admin còn hiệu lực (khôi phục khi tải lại trang) */
  restore(): Promise<boolean>;
  login(user: string, pass: string): Promise<void>;
  logout(): Promise<void>;
  listPlayers(): Promise<PlayerRow[]>;
  /** Đọc save mới nhất, áp dụng `fn`, tăng rev rồi ghi lại */
  updateSave(uid: string, fn: (s: SaveData) => void): Promise<SaveData>;
  setLocked(uid: string, name: string, locked: boolean, reason?: string): Promise<void>;
  listNotices(): Promise<Notice[]>;
  sendNotice(n: NewNotice): Promise<void>;
  deleteNotice(id: string): Promise<void>;
}

const checkUser = (user: string) => {
  if (user.trim().toLowerCase() !== ADMIN_USER) throw new AuthError('err.badLogin');
};
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ───────────────────────── chế độ offline (localStorage) ─────────────────────────
const ADMIN_SESSION = 'empire.admin';

function createLocalAdmin(): AdminApi {
  return {
    kind: 'local',
    async restore() {
      return sessionStorage.getItem(ADMIN_SESSION) === '1';
    },
    async login(user, pass) {
      checkUser(user);
      if (!LOCAL_ADMIN_PASS || pass !== LOCAL_ADMIN_PASS) throw new AuthError('err.badLogin');
      sessionStorage.setItem(ADMIN_SESSION, '1');
    },
    async logout() {
      sessionStorage.removeItem(ADMIN_SESSION);
    },
    async listPlayers() {
      const users: Record<string, string> = JSON.parse(localStorage.getItem('empire.users') || '{}');
      return Object.keys(users).map((name) => {
        const raw = localStorage.getItem(`empire.save.${name}`);
        const acct = localStorage.getItem(ACCT_PREFIX + name);
        return {
          uid: name,
          name,
          save: raw ? normalizeSave(JSON.parse(raw), name) : null,
          account: acct ? (JSON.parse(acct) as Account) : { locked: false },
        };
      });
    },
    async updateSave(uid, fn) {
      const raw = localStorage.getItem(`empire.save.${uid}`);
      if (!raw) throw new Error('no-save');
      const s = normalizeSave(JSON.parse(raw), uid);
      fn(s);
      s.rev = (s.rev ?? 0) + 1;
      s.updatedAt = Date.now();
      localStorage.setItem(`empire.save.${uid}`, JSON.stringify(s));
      return s;
    },
    async setLocked(uid, _name, locked, reason) {
      localStorage.setItem(ACCT_PREFIX + uid, JSON.stringify({ locked, reason: reason || '' } satisfies Account));
    },
    async listNotices() {
      return readNotices().sort((a, b) => b.createdAt - a.createdAt);
    },
    async sendNotice(n) {
      const list = readNotices();
      list.push(toNotice(n));
      localStorage.setItem(NOTICES, JSON.stringify(list));
    },
    async deleteNotice(id) {
      localStorage.setItem(NOTICES, JSON.stringify(readNotices().filter((x) => x.id !== id)));
    },
  };
}

function toNotice(n: NewNotice): Notice {
  const all = n.to === 'all';
  return {
    id: newId(),
    title: n.title.trim(),
    body: n.body.trim(),
    createdAt: Date.now(),
    to: all ? 'all' : 'users',
    uids: all ? [] : (n.to as { uid: string }[]).map((p) => p.uid),
    names: all ? [] : (n.to as { name: string }[]).map((p) => p.name),
  };
}

// ───────────────────────── Firebase ─────────────────────────
async function createFirebaseAdmin(env: Record<string, string>): Promise<AdminApi> {
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
  // App riêng tên 'admin' để phiên admin không đè lên phiên đăng nhập của người chơi trong cùng trình duyệt
  const app = initializeApp(env, 'admin');
  const a = auth.getAuth(app);
  await auth.setPersistence(a, auth.browserLocalPersistence).catch(() => {});
  const db = fs.getFirestore(app);
  const email = emailFor(ADMIN_USER);

  const signedIn = () =>
    new Promise<boolean>((resolve) => {
      const off = auth.onAuthStateChanged(a, (u) => {
        off();
        resolve(!!u && u.email === email);
      });
    });

  return {
    kind: 'firebase',
    restore: signedIn,
    async login(user, pass) {
      checkUser(user);
      // Chỉ đăng nhập, KHÔNG tự tạo tài khoản admin (nếu không ai vào /admin trước cũng giành được quyền admin)
      try {
        await auth.signInWithEmailAndPassword(a, email, pass);
      } catch (e) {
        const code = (e as { code?: string }).code ?? '';
        if (code === 'auth/network-request-failed') throw new AuthError('err.network');
        if (code === 'auth/too-many-requests') throw new AuthError('err.tooMany');
        if (['auth/user-not-found', 'auth/invalid-credential', 'auth/wrong-password', 'auth/invalid-email'].includes(code)) {
          throw new AuthError('err.badLogin');
        }
        throw new AuthError('err.generic', (e as Error).message);
      }
    },
    async logout() {
      await auth.signOut(a);
    },
    async listPlayers() {
      const [saves, accts] = await Promise.all([fs.getDocs(fs.collection(db, 'saves')), fs.getDocs(fs.collection(db, 'accounts'))]);
      const acct = new Map<string, Account>();
      for (const d of accts.docs) acct.set(d.id, d.data() as Account);
      return saves.docs.map((d) => {
        const raw = d.data() as Partial<SaveData>;
        const save = normalizeSave(raw, raw.name || d.id);
        return { uid: d.id, name: save.name, save, account: acct.get(d.id) ?? { locked: false } };
      });
    },
    async updateSave(uid, fn) {
      const ref = fs.doc(db, 'saves', uid);
      return fs.runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error('no-save');
        const s = normalizeSave(snap.data() as Partial<SaveData>, uid);
        fn(s);
        s.rev = (s.rev ?? 0) + 1;
        s.updatedAt = Date.now();
        tx.set(ref, s);
        return s;
      });
    },
    async setLocked(uid, name, locked, reason) {
      await fs.setDoc(fs.doc(db, 'accounts', uid), { locked, reason: reason || '', name, updatedAt: Date.now() });
    },
    async listNotices() {
      const snap = await fs.getDocs(fs.collection(db, 'notices'));
      return snap.docs.map((d) => ({ ...(d.data() as Notice), id: d.id })).sort((x, y) => y.createdAt - x.createdAt);
    },
    async sendNotice(n) {
      const notice = toNotice(n);
      const { id, ...data } = notice;
      await fs.setDoc(fs.doc(db, 'notices', id), data);
    },
    async deleteNotice(id) {
      await fs.deleteDoc(fs.doc(db, 'notices', id));
    },
  };
}

export async function createAdminApi(): Promise<AdminApi> {
  const env = import.meta.env;
  if (env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID) {
    return createFirebaseAdmin({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    });
  }
  return createLocalAdmin();
}
