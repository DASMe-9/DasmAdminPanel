import { usePlatformAuthStore } from "@/store/platformAuthStore";
import { UserRole } from "@/types/userRole";
import { normalizeUserType } from "@/lib/normalizeUserType";

export function useAuth() {
  const {
    user,
    token,
    isLoggedIn,
    loading,
    error,
    login,
    logout,
    hydrated,
    initialized,
    fetchProfile,
    initializeFromStorage,
  } = usePlatformAuthStore();

  const userType = normalizeUserType(user?.type);
  const isAdmin =
    userType === UserRole.ADMIN || userType === UserRole.SUPER_ADMIN;
  const isModerator = userType === UserRole.MODERATOR;
  const isOperator = userType === UserRole.OPERATOR;
  // طاقم الكنترول روم = أدمن + مشرف + مشغّل + مبرمج
  const isControlRoomStaff =
    isAdmin ||
    isModerator ||
    isOperator ||
    userType === UserRole.PROGRAMMER;

  return {
    user,
    isAdmin,
    isSuperAdmin: userType === UserRole.SUPER_ADMIN,
    isProgrammer: userType === UserRole.PROGRAMMER,
    isModerator,
    isOperator,
    isControlRoomStaff,
    hydrated,
    initialized,
    isReady: hydrated,
    isLoading: loading,
    login,
    logout,
    fetchProfile,
    initializeFromStorage,
    token,
    isLoggedIn,
    error,
  };
}

export default useAuth;
