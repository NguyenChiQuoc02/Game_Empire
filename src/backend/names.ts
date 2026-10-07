const DOMAIN = 'gameempire.app';

/** Cho phép nhập tên đăng nhập thường (không cần email thật) */
export function emailFor(input: string): string {
  const s = input.trim().toLowerCase();
  return s.includes('@') ? s : `${s}@${DOMAIN}`;
}

/** Trả về khóa i18n của lỗi, hoặc null nếu hợp lệ */
export function validName(input: string): string | null {
  const s = input.trim();
  if (s.length < 3) return 'err.nameShort';
  if (s.includes('@')) return null; // chấp nhận email thật
  if (!/^[a-zA-Z0-9._-]+$/.test(s)) return 'err.nameChars';
  return null;
}

export function normalizeName(input: string): string {
  return input.trim().toLowerCase();
}
