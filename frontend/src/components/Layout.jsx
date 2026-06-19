import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomTabBar } from './BottomTabBar'
import { CatRemote } from './CatRemote/CatRemote'
import { OnboardingTour } from './OnboardingTour'
import { PageTransition } from './PageTransition'

const AUTH_BACKGROUND_MP4 =
  'https://pybrgtwclllhaanexose.supabase.co/storage/v1/object/public/myaong/asset/CalicoCatSwap_logo_removed.mp4'

/**
 * 글로벌 모바일 셸.
 * - 데스크톱에서는 480px 폭으로 중앙 정렬, 모바일에서는 풀폭.
 * - 가로 스크롤 차단, 세로 스크롤은 inner main 영역에서 발생.
 */
function MobileShell({ children }) {
  return (
    <div className="min-h-screen w-full flex justify-center bg-brand-brown/10">
      <div
        data-app-frame
        className="relative w-full max-w-[480px] mx-auto min-h-screen overflow-x-hidden bg-brand-bg text-brand-brown flex flex-col shadow-soft-lg"
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Public 라우트용 (Splash / Login).
 * 하단 탭 바 없음. 컨텐츠가 전체 셸을 채움.
 */
export function PublicLayout() {
  const { pathname } = useLocation()
  const videoRef = useRef(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const isAuthVideoPage = pathname === '/login' || pathname === '/signup'

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (!isAuthVideoPage) {
      video.pause()
      video.currentTime = 0
      return
    }

    video.play().catch(() => {
      // 자동 재생이 막히면 기존 배경을 그대로 유지한다.
    })
  }, [isAuthVideoPage])

  return (
    <MobileShell>
      <div className="public-route-stage">
        <video
          ref={videoRef}
          className={`auth-background-video public-auth-background-video ${
            isVideoReady ? 'is-ready' : ''
          } ${isAuthVideoPage ? 'is-active' : ''}`}
          src={AUTH_BACKGROUND_MP4}
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setIsVideoReady(true)}
          aria-hidden="true"
        />
        <Outlet />
      </div>
    </MobileShell>
  )
}

/**
 * Private 라우트용 (대시보드 외 메인 5개 탭).
 * Safe area + 하단 탭 바 포함.
 */
export function PrivateLayout() {
  return (
    <MobileShell>
      <div className="h-safe-top bg-brand-bg" />
      <main className="flex-1 overflow-y-auto pb-24">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <CatRemote />
      <BottomTabBar />
      <OnboardingTour />
    </MobileShell>
  )
}
