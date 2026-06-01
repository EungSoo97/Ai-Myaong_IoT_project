import { useEffect, useRef, useState } from 'react'
import {
  Maximize2,
  Minimize2,
  Zap,
  ZapOff,
  Video,
  Camera,
  PawPrint,
  Mic,
  MicOff,
  Moon,
} from 'lucide-react'
import { Card, Badge } from '../components/ui'
import { api } from '../api/api'

const EVENT_LOG = [
  { id: 1, type: '움직임 감지', time: '14:22:08', clip: 'clip-001' },
  { id: 2, type: '배식 동작', time: '13:00:00', clip: 'clip-002' },
  { id: 3, type: '음성 호출', time: '11:45:12', clip: 'clip-003' },
  { id: 4, type: '외부인 감지', time: '09:11:55', clip: 'clip-004' },
  { id: 5, type: '수면 감지', time: '03:20:41', clip: 'clip-005' },
]

const MOVE_COMMANDS = {
  up: 'FORWARD',
  down: 'BACKWARD',
  left: 'LEFT',
  right: 'RIGHT',
}

const CAMERA_COMMANDS = {
  up: 'CAM_UP',
  down: 'CAM_DOWN',
  left: 'CAM_LEFT',
  right: 'CAM_RIGHT',
  center: 'CAM_CENTER',
}

export function RobotVision() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [irOn, setIrOn] = useState(false)
  const [recording, setRecording] = useState(false)
  const [selectedClip, setSelectedClip] = useState(null)
  const [controlBusy, setControlBusy] = useState(false)
  const controlBusyRef = useRef(false)
  // 뷰포트가 portrait 인데 전체화면이면 CSS 로 강제 가로 회전.
  // Android Chrome 등에서 screen.orientation.lock 이 성공하면 false 로 유지.
  const [forceCssLandscape, setForceCssLandscape] = useState(false)
  const fsRef = useRef(null)

  // Fullscreen API ↔ React 상태 동기화 (ESC 해제 포함)
  useEffect(() => {
    const sync = () => {
      const active = !!document.fullscreenElement
      setIsFullscreen(active)
      if (!active) {
        // 풀스크린 종료 시 orientation lock 도 해제
        try { window.screen?.orientation?.unlock?.() } catch { /* noop */ }
        setForceCssLandscape(false)
      }
    }
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [])

  // 풀스크린 중 실제 가로 회전이 일어나면 CSS 회전을 풀고, portrait 로 돌아오면 다시 적용
  useEffect(() => {
    if (!isFullscreen) return
    const check = () => {
      const portrait = window.innerHeight > window.innerWidth
      setForceCssLandscape(portrait)
    }
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [isFullscreen])

  const enterFullscreen = async () => {
    const el = fsRef.current
    if (!el) return
    try {
      const req = el.requestFullscreen || el.webkitRequestFullscreen
      if (req) {
        await req.call(el)
      } else {
        setIsFullscreen(true)
      }
    } catch {
      setIsFullscreen(true)
    }
    // 전체화면 진입 직후 가로 모드 잠금 시도 (Android Chrome 등)
    try {
      const orientation = window.screen?.orientation
      if (orientation?.lock) {
        await orientation.lock('landscape')
      }
    } catch {
      // iOS Safari 등 미지원 → CSS 회전 폴백이 useEffect 에서 자동 적용됨
    }
  }

  const exitFullscreen = async () => {
    try { window.screen?.orientation?.unlock?.() } catch { /* noop */ }
    try {
      if (document.fullscreenElement) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen
        await exit?.call(document)
      } else {
        setIsFullscreen(false)
      }
    } catch {
      setIsFullscreen(false)
    }
    setForceCssLandscape(false)
  }

  const sendCommand = async (kind, command) => {
    if (!command || controlBusyRef.current) return

    controlBusyRef.current = true
    setControlBusy(true)
    try {
      if (kind === 'camera') {
        await api.moveCamera(command)
      } else {
        await api.moveRobot(command)
      }
    } catch (error) {
      console.error(`[RobotVision] ${kind} command failed:`, error)
    } finally {
      controlBusyRef.current = false
      setControlBusy(false)
    }
  }

  const onMove = (dir) => {
    sendCommand('move', MOVE_COMMANDS[dir])
  }

  const onPan = (dir) => {
    sendCommand('camera', CAMERA_COMMANDS[dir])
  }

  return (
    <div className="px-5 pt-5 pb-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-display text-2xl font-bold text-brand-brown">로봇 비전</h1>
        <Badge tone="success">연결됨</Badge>
      </div>

      {/* 일반 모드 비디오 */}
      <Card className="overflow-hidden">
        <div ref={fsRef} className={isFullscreen ? 'fullscreen-stage' : 'relative w-full aspect-video bg-gradient-to-br from-brand-brown to-black overflow-hidden'}>
          {isFullscreen ? (
            <div className={forceCssLandscape ? 'landscape-rotor' : 'landscape-native'}>
              <FullscreenView
                onExit={exitFullscreen}
                onMove={onMove}
                onPan={onPan}
                recording={recording}
                irOn={irOn}
                setIrOn={setIrOn}
              />
            </div>
          ) : (
            <>
              <div className="absolute inset-0 flex items-center justify-center text-white/80">
                <div className="text-center">
                  <Video className="w-12 h-12 mx-auto mb-1.5 opacity-80" />
                  <p className="text-sm font-semibold">스트리밍 영역</p>
                  <p className="text-xs opacity-70">WebRTC / RTSP placeholder</p>
                </div>
              </div>
              <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 text-white text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> LIVE
              </span>
              {recording && (
                <span className="absolute top-3 left-20 px-2.5 py-1 rounded-full bg-brand-danger text-white text-[11px] font-bold">
                  ● REC
                </span>
              )}
              <button
                onClick={enterFullscreen}
                className="absolute top-3 right-3 w-10 h-10 rounded-2xl bg-black/55 text-white flex items-center justify-center active:bg-black/80 transition-colors"
                title="전체화면 (가로 모드)"
                aria-label="전체화면"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </Card>

      {/* 세로 모드 조종 패드 (이동 + 카메라) — 스트리밍 바로 아래 */}
      <section className="mt-5">
        <h3 className="font-display text-base font-bold text-brand-brown mb-3">조종 패드</h3>
        <Card className="px-4 py-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col items-center gap-2">
              <DPad label="이동" onPress={onMove} tone="light" />
              <span className="text-[11px] font-bold text-brand-mute">기기 이동</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <DPad label="카메라" onPress={onPan} centerAction="center" muted tone="light" />
              <span className="text-[11px] font-bold text-brand-mute">카메라 회전</span>
            </div>
          </div>
        </Card>
      </section>

      {/* 컨트롤 (IR / 녹화 / 캡처) */}
      <section className="mt-5">
        <h3 className="font-display text-base font-bold text-brand-brown mb-3">제어</h3>
        <Card className="px-5 py-5">
          <div className="flex items-center justify-around gap-3">
            <button
              onClick={() => setIrOn((v) => !v)}
              className={`flex flex-col items-center gap-1 px-4 py-3 rounded-3xl shadow-soft min-w-[88px] transition-colors ${
                irOn ? 'bg-brand-brown text-white active:bg-brand-brown/80' : 'bg-brand-card text-brand-brown active:bg-brand-cream'
              }`}
            >
              {irOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
              <span className="text-xs font-bold">IR {irOn ? 'ON' : 'OFF'}</span>
            </button>
            <button
              onClick={() => setRecording((v) => !v)}
              className={`flex flex-col items-center gap-1 px-4 py-3 rounded-3xl shadow-soft min-w-[88px] transition-colors ${
                recording ? 'bg-brand-danger text-white active:bg-brand-danger/80' : 'bg-brand-card text-brand-brown active:bg-brand-cream'
              }`}
            >
              <Video className="w-5 h-5" />
              <span className="text-xs font-bold">{recording ? '녹화 중' : '녹화'}</span>
            </button>
            <button className="flex flex-col items-center gap-1 px-4 py-3 rounded-3xl bg-brand-card text-brand-brown shadow-soft active:bg-brand-cream transition-colors min-w-[88px]">
              <Camera className="w-5 h-5" />
              <span className="text-xs font-bold">캡처</span>
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-brand-mute">
            가로 조종 패드는 <span className="font-bold text-brand-primary">전체화면</span>에서 활성화됩니다.
          </p>
        </Card>
      </section>

      {/* 이벤트 로그 */}
      <section className="mt-6">
        <h3 className="font-display text-base font-bold text-brand-brown mb-3">이벤트 로그</h3>
        <Card className="divide-y divide-brand-line">
          {EVENT_LOG.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelectedClip(e)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-brand-cream transition-colors"
            >
              <span className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${e.type === '수면 감지' ? 'bg-brand-brown/10 text-brand-brown' : 'bg-brand-primary/15 text-brand-primary'}`}>
                {e.type === '수면 감지' ? <Moon className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-brand-brown">{e.type}</p>
                <p className="text-xs text-brand-mute">{e.time}</p>
              </div>
              <span className="text-[11px] text-brand-primary font-bold">VOD ▶</span>
            </button>
          ))}
        </Card>
      </section>

      {/* VOD 모달 */}
      {selectedClip && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelectedClip(null)}
        >
          <div
            className="w-full max-w-[420px] bg-brand-bg rounded-3xl shadow-soft-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video bg-black flex items-center justify-center text-white/70 text-sm">
              VOD 재생 placeholder · {selectedClip.clip}
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-brand-brown">{selectedClip.type}</p>
                <p className="text-xs text-brand-mute">{selectedClip.time}</p>
              </div>
              <button
                onClick={() => setSelectedClip(null)}
                className="px-4 py-2 rounded-2xl bg-brand-primary text-white text-sm font-bold active:bg-brand-brown transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 전체화면 스테이지 - 가로 모드 풀스크린 */}
      <style>{`
        .fullscreen-stage {
          position: fixed;
          inset: 0;
          z-index: 50;
          width: 100vw;
          height: 100vh;
          background: #000;
          overflow: hidden;
        }
        /* OS 가 직접 가로로 회전해 준 경우 */
        .landscape-native {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        /* iOS Safari 등 orientation lock 미지원 → CSS 로 강제 회전.
         * 사용자가 폰을 가로로 잡으면 콘텐츠가 올바른 방향으로 보임. */
        .landscape-rotor {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100vh;
          height: 100vw;
          transform: translate(-50%, -50%) rotate(90deg);
          transform-origin: center center;
          background: #000;
        }
      `}</style>
    </div>
  )
}

/**
 * 전체화면(Landscape) 뷰:
 *  - 배경: 전체 화면 비디오 스트림
 *  - 좌측 하단: 기계 이동 D-Pad (십자, 발바닥 아이콘)
 *  - 우측 하단: 카메라 Pan/Tilt D-Pad (십자, 반투명 배경)
 *  - 상단: IR 토글 + 마이크 + 종료
 *
 * 양손 엄지 동선을 고려해 컨트롤은 하단 좌우, 토글은 상단에 배치.
 */
function FullscreenView({ onExit, onMove, onPan, recording, irOn, setIrOn }) {
  const [micOn, setMicOn] = useState(false)
  const toggleMic = () => {
    setMicOn((v) => {
      console.log('[RobotVision] mic:', !v ? 'ON' : 'OFF')
      return !v
    })
  }

  return (
    <>
      {/* 배경 비디오 스트림 (전체화면) */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-brown via-[#2a1d12] to-black flex items-center justify-center text-white/60">
        <div className="text-center">
          <Video className="w-16 h-16 mx-auto mb-2 opacity-70" />
          <p className="text-sm font-semibold tracking-wider">LANDSCAPE · 실시간 스트림</p>
        </div>
      </div>

      {/* 상단 좌측: LIVE / REC 인디케이터 */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[11px] font-bold">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> LIVE
        </span>
        {recording && (
          <span className="px-2.5 py-1 rounded-full bg-brand-danger text-white text-[11px] font-bold">
            ● REC
          </span>
        )}
      </div>

      {/* 상단 우측: IR 토글 + 마이크 + 전체화면 종료 */}
      <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
        <IRToggle on={irOn} onChange={setIrOn} />
        <MicButton on={micOn} onClick={toggleMic} />
        <button
          onClick={onExit}
          className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-sm text-white flex items-center justify-center transition-colors active:bg-brand-brown"
          aria-label="전체화면 종료"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>

      {/* 좌측 하단: 기계 이동 D-Pad */}
      <DPad
        className="absolute bottom-6 left-6 z-50"
        label="이동"
        onPress={onMove}
      />

      {/* 우측 하단: 카메라 Pan/Tilt D-Pad */}
      <DPad
        className="absolute bottom-6 right-6 z-50"
        label="카메라"
        onPress={onPan}
        centerAction="center"
        muted
      />
    </>
  )
}

/**
 * 표준 십자(Cross) D-Pad.
 *  - 외형: 평범한 cross 레이아웃 (전체 패드는 발바닥 모양 아님).
 *  - 각 방향 버튼 아이콘만 고양이 발바닥(PawPrint)으로.
 *  - 영상 위 시인성을 위해 반투명 배경 + 블러.
 *  - 누름 피드백: scale 변화 없이 배경색만 brand-brown 으로 즉시 전환.
 */
function DPad({ centerAction = null, className = '', label, onPress, muted = false, tone = 'dark' }) {
  const light = tone === 'light'
  const baseBg = light ? 'bg-brand-cream' : muted ? 'bg-white/12' : 'bg-white/18'
  const labelBox = light ? 'bg-brand-primary/15 text-brand-primary' : 'bg-black/35 backdrop-blur-sm text-white/85'
  return (
    <div className={className}>
      <div className="relative">
        <div className="grid grid-cols-3 gap-1.5 w-[148px]">
          <span />
          <DBtn onClick={() => onPress('up')} bg={baseBg} tone={tone} aria="Up" />
          <span />
          <DBtn onClick={() => onPress('left')} bg={baseBg} tone={tone} aria="Left" rotate="rotate-[270deg]" />
          {centerAction ? (
            <CenterBtn onClick={() => onPress(centerAction)} tone={tone} />
          ) : (
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${labelBox}`}>
              <span className="text-[10px] font-bold tracking-wider">{label}</span>
            </div>
          )}
          <DBtn onClick={() => onPress('right')} bg={baseBg} tone={tone} aria="Right" rotate="rotate-90" />
          <span />
          <DBtn onClick={() => onPress('down')} bg={baseBg} tone={tone} aria="Down" rotate="rotate-180" />
          <span />
        </div>
      </div>
    </div>
  )
}

function DBtn({ onClick, bg, aria, rotate = '', tone = 'dark' }) {
  const repeatTimerRef = useRef(null)
  const repeatDelayTimerRef = useRef(null)

  const stopRepeat = () => {
    window.clearTimeout(repeatDelayTimerRef.current)
    window.clearInterval(repeatTimerRef.current)
    repeatDelayTimerRef.current = null
    repeatTimerRef.current = null
  }

  const startRepeat = (event) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    onClick()
    stopRepeat()
    repeatDelayTimerRef.current = window.setTimeout(() => {
      repeatTimerRef.current = window.setInterval(onClick, 120)
    }, 240)
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        if (event.detail === 0) {
          onClick()
        }
      }}
      onPointerCancel={stopRepeat}
      onPointerDown={startRepeat}
      onPointerLeave={stopRepeat}
      onPointerUp={stopRepeat}
      aria-label={aria}
      className={`
        w-12 h-12 rounded-2xl
        ${bg}
        flex items-center justify-center
        transition-colors duration-75
        ${tone === 'light'
          ? 'text-brand-brown shadow-soft active:bg-brand-primary active:text-white'
          : 'backdrop-blur-sm text-white shadow-md active:bg-brand-brown'}
      `}
    >
      <PawPrint className={`w-5 h-5 ${rotate}`} strokeWidth={2.2} />
    </button>
  )
}

function CenterBtn({ onClick, tone = 'dark' }) {
  const light = tone === 'light'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Center"
      className={`
        w-12 h-12 rounded-2xl
        flex items-center justify-center
        transition-colors duration-75
        ${light
          ? 'bg-brand-primary/15 text-brand-primary shadow-soft active:bg-brand-primary active:text-white'
          : 'bg-black/45 backdrop-blur-sm text-white shadow-md active:bg-brand-brown'}
      `}
    >
      <span className="text-[9px] font-bold tracking-wider">CENTER</span>
    </button>
  )
}

/**
 * IR ON/OFF 토글 - pill 모양, 상태 즉시 인지 가능.
 */
function IRToggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={`
        h-11 px-4 inline-flex items-center gap-1.5 rounded-full
        font-bold text-sm shadow-md transition-colors
        ${on
          ? 'bg-brand-primary text-white active:bg-brand-brown'
          : 'bg-white/15 backdrop-blur-sm text-white/85 active:bg-brand-brown'}
      `}
    >
      {on ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
      IR {on ? 'ON' : 'OFF'}
    </button>
  )
}

/**
 * 마이크 버튼 - 클릭으로 ON/OFF 토글.
 */
function MicButton({ on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? '마이크 끄기' : '마이크 켜기'}
      className={`
        w-11 h-11 rounded-full shadow-md flex items-center justify-center
        transition-colors
        ${on
          ? 'bg-brand-primary text-white active:bg-brand-brown ring-2 ring-white/60'
          : 'bg-white/15 backdrop-blur-sm text-white/85 active:bg-brand-brown'}
      `}
    >
      {on ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
    </button>
  )
}

export default RobotVision
