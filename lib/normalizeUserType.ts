import { UserRole } from "@/types/userRole";

/** يوحّد type القادم من API (enum string، PascalCase، legacy). */
export function normalizeUserType(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  return s.length ? s : null;
}

export function isControlRoomStaffType(type: unknown): boolean {
  const t = normalizeUserType(type);
  if (!t) return false;
  return (
    t === UserRole.ADMIN ||
    t === UserRole.SUPER_ADMIN ||
    t === UserRole.MODERATOR ||
    t === UserRole.PROGRAMMER ||
    t === UserRole.OPERATOR
  );
}
