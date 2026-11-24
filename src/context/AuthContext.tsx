import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import {
  changePasswordWithApi,
  clearActiveAuthSession,
  apiFetch,
  loginWithCredentials,
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
  safeLocalStorageSetItem,
  setActiveAuthSession,
  verifyPasswordWithApi,
} from '../services/dataService';
import { logAuditAction } from '../services/auditService';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; forcePasswordChange?: boolean }>;
  loginWithIqama: (iqama: string, pass: string) => Promise<{ success: boolean; error?: string; forcePasswordChange?: boolean }>;
  logout: () => void;
  updatePassword: (newPassword: string) => Promise<boolean>;
  verifyPassword: (password: string) => Promise<boolean>;
  forcePasswordModalOpen: boolean;
  setForcePasswordModalOpen: (open: boolean) => void;
  canAccess: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isValidUserProfile = (value: unknown): value is UserProfile => {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<UserProfile>;
  return Boolean(
    typeof user.id === 'string' && user.id &&
    typeof user.fullName === 'string' && user.fullName &&
    typeof user.iqamaNumber === 'string' && user.iqamaNumber &&
    typeof user.email === 'string' &&
    typeof user.jobTitle === 'string' &&
    typeof user.phone === 'string' &&
    ['admin', 'executive', 'general_manager', 'operations_manager', 'supervisor'].includes(user.role || '') &&
    user.status === 'active'
  );
};

const readStoredUser = (): UserProfile | null => {
  try {
    if (!safeLocalStorageGetItem('fleetops_session_token')) return null;
    const storedUser = safeLocalStorageGetItem('fleetops_current_user');
    if (!storedUser) return null;
    const parsedUser: unknown = JSON.parse(storedUser);
    return isValidUserProfile(parsedUser) ? parsedUser : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(readStoredUser);
  const [loading, setLoading] = useState<boolean>(true);
  const [forcePasswordModalOpen, setForcePasswordModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleSessionExpired = () => {
      clearActiveAuthSession();
      safeLocalStorageRemoveItem('fleetops_session_token');
      safeLocalStorageRemoveItem('fleetops_current_user');
      safeLocalStorageRemoveItem('fleetops_user_id');
      setCurrentUser(null);
      setForcePasswordModalOpen(false);
      if (window.location.pathname !== '/login') window.location.replace('/login');
    };
    window.addEventListener('fleetops_auth_expired', handleSessionExpired);
    return () => window.removeEventListener('fleetops_auth_expired', handleSessionExpired);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function initAuth() {
      try {
        const storedUser = readStoredUser();
        if (isMounted) {
          setCurrentUser(storedUser);
          if (storedUser?.isTemporaryPassword) setForcePasswordModalOpen(true);
          if (!storedUser) {
            safeLocalStorageRemoveItem('fleetops_user_id');
            safeLocalStorageRemoveItem('fleetops_session_token');
            safeLocalStorageRemoveItem('fleetops_current_user');
          }
        }
      } catch {
        if (isMounted) setCurrentUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    initAuth();
    return () => { isMounted = false; };
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      const loginResult = await loginWithCredentials(username.trim(), password);
      const userProfile: UserProfile = loginResult.user;

      if (!isValidUserProfile(userProfile)) {
        return { success: false, error: 'بيانات الحساب غير مكتملة أو غير صالحة' };
      }

      setCurrentUser(userProfile);
      setActiveAuthSession(userProfile, loginResult.token);
      safeLocalStorageSetItem('fleetops_user_id', userProfile.id);
      safeLocalStorageSetItem('fleetops_session_token', loginResult.token);
      safeLocalStorageSetItem('fleetops_current_user', JSON.stringify(userProfile));
      await logAuditAction(userProfile, 'LOGIN_SUCCESS', 'auth', userProfile.id, `تسجيل دخول ناجح للمستخدم ${userProfile.fullName}`);
      if (loginResult.forcePasswordChange) {
        setForcePasswordModalOpen(true);
        return { success: true, forcePasswordChange: true };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'حدث خطأ أثناء تسجيل الدخول' };
    } finally {
      setLoading(false);
    }
  };

  const loginWithIqama = login;

  const updatePassword = async (newPassword: string) => {
    if (!currentUser) return false;
    try {
      const updated = await changePasswordWithApi(newPassword);
      if (!updated) return false;

      setCurrentUser({ ...currentUser, isTemporaryPassword: false });
      safeLocalStorageSetItem('fleetops_current_user', JSON.stringify({ ...currentUser, isTemporaryPassword: false }));
      setForcePasswordModalOpen(false);
      await logAuditAction(currentUser, 'PASSWORD_CHANGED', 'users', currentUser.id, 'تم تحديث كلمة المرور');
      return true;
    } catch (err) {
      console.error('Failed to update password:', err);
      return false;
    }
  };

  const verifyPassword = async (passwordToCheck: string): Promise<boolean> => {
    const trimmed = (passwordToCheck || '').trim();
    if (!trimmed) return false;
    if (!currentUser) return false;
    try {
      return await verifyPasswordWithApi(trimmed);
    } catch (e) {
      console.warn('[verifyPassword] Error:', e);
    }
    return false;
  };

  const logout = () => {
    if (currentUser) {
      logAuditAction(currentUser, 'LOGOUT', 'auth', currentUser.id, `تسجيل خروج للمستخدم ${currentUser.fullName}`);
      void apiFetch('/api/auth/logout', { method: 'POST' });
    }
    safeLocalStorageRemoveItem('fleetops_user_id');
    safeLocalStorageRemoveItem('fleetops_session_token');
    safeLocalStorageRemoveItem('fleetops_current_user');
    clearActiveAuthSession();
    setCurrentUser(null);
    setForcePasswordModalOpen(false);
  };

  const canAccess = (allowedRoles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return allowedRoles.includes(currentUser.role);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        login,
        loginWithIqama,
        logout,
        updatePassword,
        verifyPassword,
        forcePasswordModalOpen,
        setForcePasswordModalOpen,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
