import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from './storage';

const googleProvider = new GoogleAuthProvider();

/**
 * Google 로그인
 */
export const signInWithGoogle = async (): Promise<User> => {
  try {
    console.log('[AuthService] Google 로그인 시작');
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log('[AuthService] Google 로그인 성공:', user.email);
    return user;
  } catch (error: any) {
    console.error('[AuthService] Google 로그인 실패:', error);
    throw error;
  }
};

/**
 * 로그아웃
 */
export const logout = async (): Promise<void> => {
  try {
    console.log('[AuthService] 로그아웃 시작');
    await signOut(auth);
    console.log('[AuthService] 로그아웃 성공');
  } catch (error: any) {
    console.error('[AuthService] 로그아웃 실패:', error);
    throw error;
  }
};

/**
 * 현재 사용자 가져오기
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * 인증 상태 변경 리스너
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
