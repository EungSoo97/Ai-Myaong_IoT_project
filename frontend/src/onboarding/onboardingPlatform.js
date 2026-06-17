/* ───────────────────────────────────────────────────────────
 * 온보딩 "플랫폼 어댑터" — 웹 전용 영속화/백엔드 호출 격리 계층
 *
 * 최초 1회 노출 여부의 영속화와, 백엔드에 "최초 로그인 안내 완료"를
 * 알리는 호출을 이 파일에만 둔다.
 * RN 이식 시 이 파일만 교체(localStorage → AsyncStorage 등)하면
 * useOnboarding 의 비즈니스 로직은 그대로 재사용된다.
 * ─────────────────────────────────────────────────────────── */

const KEY = 'aimyaong:onboardingDone'
const isWeb = typeof window !== 'undefined'

/* 이미 온보딩을 본 적이 있는지 (true 면 다시 안 띄움) */
export function hasCompletedOnboarding() {
  if (!isWeb) return true
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

/* 온보딩 재노출 트리거 — 회원가입 등 "최초 1회"를 다시 시작할 때 호출.
 * 완료 플래그를 지워 다음 진입(대시보드)에서 튜토리얼이 처음부터 다시 뜨게 한다.
 */
export function resetOnboarding() {
  if (!isWeb) return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/* 최초 로그인 안내 완료 처리.
 * 백엔드 API 호출을 가정한 가상 함수 → 성공 시 로컬에도 기록.
 * 내일 백엔드 붙으면 setTimeout 자리를 실제 PATCH 호출로 교체:
 *   await api.updateMe({ onboarded: true })
 */
export async function updateUserFirstLoginStatus() {
  try {
    // TODO(백엔드): await api.updateMe({ onboarded: true })
    await new Promise((resolve) => setTimeout(resolve, 150)) // 네트워크 흉내
    if (isWeb) window.localStorage.setItem(KEY, '1')
    return true
  } catch (e) {
    console.warn('[onboarding] 상태 업데이트 실패', e)
    return false
  }
}
