import type { User } from 'firebase/auth';

/**
 * docapp 데이터 접근 허용 계정
 * → 바꿀 때 firestore.rules / storage.rules 의 isAllowedUser() 목록도 같이 수정하고
 *   `firebase deploy --only firestore:rules,storage` 로 배포하세요. (실제 차단은 규칙이 담당)
 */
export const ALLOWED_EMAILS = ['googiden@gmail.com'];

export const isAllowedUser = (user: User | null): boolean =>
  !!user?.email && user.emailVerified && ALLOWED_EMAILS.includes(user.email.toLowerCase());
