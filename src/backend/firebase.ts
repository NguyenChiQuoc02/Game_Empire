import { AuthError, type AuthUser, type Backend, type SaveData } from './types';
import { emailFor } from './names';
import { mergeSaves, normalizeSave } from './save';

export interface FirebaseEnv {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const nameOf = (email: string | null) => (email ?? '').split('@')[0];

function mapError(e: unknown): AuthError {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return new AuthError('err.exists');
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return new AuthError('err.badLogin');
    case 'auth/weak-password':
      return new AuthError('err.weakPw');
    case 'auth/too-many-requests':
      return new AuthError('err.tooMany');
    case 'auth/network-request-failed':
      return new AuthError('err.network');
    case 'auth/operation-not-allowed':
      return new AuthError('err.notEnabled');
    default:
      return new AuthError('err.generic', (e as Error)?.message ?? code);
  }
}

/** Firebase được nạp động để bản offline không phải tải SDK */
export async function createFirebaseBackend(env: FirebaseEnv): Promise<Backend> {
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
  const app = initializeApp(env);
  const a = auth.getAuth(app);
  // Giữ đăng nhập sau khi tắt trình duyệt (vào lại là vào thẳng game)
  await auth.setPersistence(a, auth.browserLocalPersistence).catch(() => {});
  const db = fs.getFirestore(app);

  return {
    kind: 'firebase',
    onAuth(cb) {
      auth.onAuthStateChanged(a, (u) => {
        cb(u ? ({ uid: u.uid, name: nameOf(u.email) } as AuthUser) : null);
      });
    },
    async register(name, pw) {
      try {
        await auth.createUserWithEmailAndPassword(a, emailFor(name), pw);
      } catch (e) {
        throw mapError(e);
      }
    },
    async login(name, pw) {
      try {
        await auth.signInWithEmailAndPassword(a, emailFor(name), pw);
      } catch (e) {
        throw mapError(e);
      }
    },
    async logout() {
      await auth.signOut(a);
    },
    async loadSave(uid) {
      const snap = await fs.getDocFromServer(fs.doc(db, 'saves', uid));
      return snap.exists() ? (snap.data() as SaveData) : null;
    },
    async writeSave(uid, data, base) {
      const ref = fs.doc(db, 'saves', uid);
      // Transaction: đọc bản trên server, nếu thiết bị khác đã ghi sau lần đồng bộ cuối thì gộp thay vì ghi đè
      return fs.runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        let out = data;
        let rev = 0;
        if (snap.exists()) {
          const remote = normalizeSave(snap.data() as Partial<SaveData>, data.name);
          rev = remote.rev ?? 0;
          if (rev !== base.rev) out = mergeSaves(remote, data, base.coins);
        }
        out = { ...out, rev: rev + 1 };
        tx.set(ref, out);
        return out;
      });
    },
  };
}
