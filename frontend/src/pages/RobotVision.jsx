import { useState, useCallback, useEffect, useMemo } from 'react'
import { 
  Camera, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  RotateCcw,
  Maximize2,
  Circle,
  Square,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { api } from '../api/api'
import { RobotSimulator } from '../components/RobotSimulator'
import { useKeyboard } from '../hooks/useKeyboard'
import { useRobotStatus } from '../hooks/useRobotStatus'

export function RobotVision() {
  const [isRecording, setIsRecording] = useState(false)
  const [panValue, setPanValue] = useState(90)
  const [tiltValue, setTiltValue] = useState(90)
  const [streamUrl, setStreamUrl] = useState(import.meta.env.VITE_STREAM_URL || '')
  const [streamMode, setStreamMode] = useState('loading')
  const [streamError, setStreamError] = useState(false)
  const [streamToken, setStreamToken] = useState(0)
  const [lastResponse, setLastResponse] = useState(null)
  const { status, refresh } = useRobotStatus(2500)

  const loadStreamUrl = useCallback(() => {
    setStreamError(false)
    return api.getStreamUrl()
      .then((data) => {
        setStreamUrl(data.url)
        setStreamMode(data.mode || 'live')
        setStreamToken((value) => value + 1)
      })
      .catch((err) => console.error(err))
  }, [])

  useEffect(() => {
    loadStreamUrl()
  }, [loadStreamUrl])

  const sendRobotCommand = useCallback(async (command) => {
    try {
      const response = await api.moveRobot(command)
      setLastResponse(response)
      await refresh()
    } catch (err) {
      console.error(err)
    }
  }, [refresh])

  useKeyboard(sendRobotCommand)

  const handlePanTilt = useCallback(async (direction) => {
    const commandMap = {
      up: 'CAM_UP',
      down: 'CAM_DOWN',
      left: 'CAM_LEFT',
      right: 'CAM_RIGHT',
      center: 'CAM_CENTER',
    }
    const command = commandMap[direction]
    const step = 10
    switch (direction) {
      case 'up':
        setTiltValue(prev => Math.min(180, prev + step))
        break
      case 'down':
        setTiltValue(prev => Math.max(0, prev - step))
        break
      case 'left':
        setPanValue(prev => Math.max(0, prev - step))
        break
      case 'right':
        setPanValue(prev => Math.min(180, prev + step))
        break
      case 'center':
        setPanValue(90)
        setTiltValue(90)
        break
    }
    try {
      const response = await api.moveCamera(command)
      setLastResponse(response)
      await refresh()
    } catch (err) {
      console.error(err)
    }
  }, [refresh])

  const handleRecordToggle = () => {
    setIsRecording(!isRecording)
  }

  const imageSrc = useMemo(() => {
    if (!streamUrl) {
      return ''
    }
    const separator = streamUrl.includes('?') ? '&' : '?'
    return `${streamUrl}${separator}t=${streamToken}`
  }, [streamToken, streamUrl])

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">로봇비전</h1>
          <p className="text-muted-foreground text-sm mt-1">카메라 스트리밍 및 로봇 제어</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRecordToggle}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all touch-active
              ${isRecording 
                ? 'bg-destructive text-white' 
                : 'bg-card border border-border text-foreground hover:bg-secondary'
              }
            `}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4" />
                <span className="hidden sm:inline">녹화 중지</span>
              </>
            ) : (
              <>
                <Circle className="w-4 h-4 text-destructive" />
                <span className="hidden sm:inline">녹화 시작</span>
              </>
            )}
          </button>
          <button className="p-2 rounded-lg bg-card border border-border text-foreground hover:bg-secondary transition-colors touch-active">
            <Maximize2 className="w-5 h-5" />
          </button>
          <button
            onClick={loadStreamUrl}
            className="px-3 py-2 rounded-lg bg-card border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors touch-active"
          >
            카메라 재연결
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Camera Feed */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
          <div className="aspect-video bg-secondary relative">
            {imageSrc ? (
              <img
                key={imageSrc}
                src={imageSrc}
                alt="MJPEG stream"
                className="absolute inset-0 w-full h-full object-cover opacity-70"
                onError={() => setStreamError(true)}
                onLoad={() => setStreamError(false)}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-secondary via-muted to-secondary" />
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center opacity-25">
                <Camera className="w-12 h-12 md:w-16 md:h-16 text-foreground mx-auto mb-2" />
                <p className="text-sm text-foreground">{streamError ? '카메라 연결 확인 필요' : 'MJPEG 스트리밍'}</p>
              </div>
            </div>
            
            {/* Live badge */}
            <div className="absolute top-4 left-4">
              <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-success text-white text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {streamMode.toUpperCase()}
              </span>
            </div>
            
            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-4 right-4">
                <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-destructive text-white text-xs font-medium">
                  <Circle className="w-2 h-2 fill-white" />
                  REC
                </span>
              </div>
            )}

            {/* Corner markers */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary/60 rounded-tl mt-8" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary/60 rounded-tr mt-8" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary/60 rounded-bl" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary/60 rounded-br" />

            {/* Info bar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <span className="text-xs text-foreground/60 bg-background/40 px-2 py-1 rounded backdrop-blur-sm">
                1280 x 720 · 30fps
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Pan/Tilt Control */}
          <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="font-semibold text-foreground mb-4">팬/틸트 제어</h3>
            <div className="flex flex-col items-center gap-2">
              {/* Up button */}
              <button
                onClick={() => handlePanTilt('up')}
                className="p-3 rounded-lg bg-secondary hover:bg-primary hover:text-white transition-colors touch-active"
              >
                <ChevronUp className="w-6 h-6" />
              </button>
              
              {/* Middle row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePanTilt('left')}
                  className="p-3 rounded-lg bg-secondary hover:bg-primary hover:text-white transition-colors touch-active"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => handlePanTilt('center')}
                  className="p-3 rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors touch-active"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
                <button
                  onClick={() => handlePanTilt('right')}
                  className="p-3 rounded-lg bg-secondary hover:bg-primary hover:text-white transition-colors touch-active"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
              
              {/* Down button */}
              <button
                onClick={() => handlePanTilt('down')}
                className="p-3 rounded-lg bg-secondary hover:bg-primary hover:text-white transition-colors touch-active"
              >
                <ChevronDown className="w-6 h-6" />
              </button>

              {/* Current values */}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>팬: {panValue}°</span>
                <span>틸트: {tiltValue}°</span>
              </div>
            </div>
          </div>

          {/* Robot Movement */}
          <div className="p-4 bg-card rounded-xl border border-border">
            <h3 className="font-semibold text-foreground mb-4">로봇 이동</h3>
            <div className="flex flex-col items-center gap-2">
              {/* Up */}
              <button onClick={() => sendRobotCommand('FORWARD')} className="p-3 rounded-lg bg-secondary hover:bg-primary hover:text-white transition-colors touch-active">
                <ArrowUp className="w-6 h-6" />
              </button>
              
              {/* Middle row */}
              <div className="flex items-center gap-2">
                <button onClick={() => sendRobotCommand('LEFT')} className="p-3 rounded-lg bg-secondary hover:bg-primary hover:text-white transition-colors touch-active">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <button onClick={() => sendRobotCommand('STOP')} className="p-3 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-colors touch-active">
                  <Square className="w-6 h-6" />
                </button>
                <button onClick={() => sendRobotCommand('RIGHT')} className="p-3 rounded-lg bg-secondary hover:bg-primary hover:text-white transition-colors touch-active">
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
              
              {/* Down */}
              <button onClick={() => sendRobotCommand('BACKWARD')} className="p-3 rounded-lg bg-secondary hover:bg-primary hover:text-white transition-colors touch-active">
                <ArrowDown className="w-6 h-6" />
              </button>

              <p className="text-xs text-muted-foreground mt-2">W/A/S/D 또는 방향키 지원</p>
            </div>
          </div>
        </div>
      </div>

      <RobotSimulator status={status} />

      {/* Device Info */}
      <div className="p-4 bg-card rounded-xl border border-border">
        <h3 className="font-semibold text-foreground mb-3">장치 정보</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">카메라</p>
            <p className="font-medium text-foreground">OV5647</p>
          </div>
          <div>
            <p className="text-muted-foreground">연결</p>
            <p className="font-medium text-foreground">{status?.connected ? '시뮬레이터' : '대기'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">서보 모터</p>
            <p className="font-medium text-foreground">SG90/MG90S</p>
          </div>
          <div>
            <p className="text-muted-foreground">모터 드라이버</p>
            <p className="font-medium text-foreground">{lastResponse?.topic || 'L298N'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
