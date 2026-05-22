import { Activity, Battery, Camera, Cookie, User, Wifi } from 'lucide-react'
import { api } from '../api/api'
import { RobotSimulator } from '../components/RobotSimulator'
import { useRobotStatus } from '../hooks/useRobotStatus'

export function Dashboard({ userName = '사용자' }) {
  const { status, dashboard, error, refresh } = useRobotStatus(2500)
  const events = dashboard?.events || []
  const battery = status?.battery ?? 85
  const connected = status?.connected ?? false
  const foodRemaining = status?.dispenser?.food_remaining ?? 75

  const runQuickAction = async (action) => {
    try {
      if (action === 'feed') {
        await api.dispenserFeed(1)
      } else if (action === 'water') {
        await api.dispenserWater(1)
      } else if (action === 'snapshot') {
        await api.moveCamera('CAM_CENTER')
      } else if (action === 'connect') {
        await api.getStatus()
      }
      refresh()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">대시보드</h1>
          <p className="text-muted-foreground text-sm mt-1">로봇과 디스펜서 상태를 한 번에 확인합니다.</p>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground">관리자</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatusCard icon={Camera} label="로봇 카메라" value={connected ? '온라인' : '대기'} status={connected ? 'success' : 'warning'} />
        <StatusCard icon={Cookie} label="디스펜서" value={`${foodRemaining}%`} status={foodRemaining > 20 ? 'success' : 'warning'} />
        <StatusCard icon={Wifi} label="네트워크" value={error ? 'API 오류' : 'REST 연결'} status={error ? 'error' : 'success'} />
        <StatusCard icon={Battery} label="배터리" value={`${battery}%`} status={battery > 30 ? 'success' : 'warning'} />
      </div>

      <RobotSimulator status={status} compact />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-4 bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">실시간 미리보기</h2>
            <span className="flex items-center gap-1 text-xs text-primary font-medium">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="aspect-video bg-secondary rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary via-muted to-secondary" />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center opacity-25">
                <Camera className="w-10 h-10 md:w-12 md:h-12 text-foreground mx-auto mb-2" />
                <p className="text-xs md:text-sm text-foreground">OV5647 · MJPEG</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-card rounded-xl border border-border">
          <h2 className="font-semibold text-foreground mb-4">최근 활동</h2>
          <div className="space-y-3">
            {events.length === 0 ? (
              <ActivityItem
                icon={Activity}
                title="시뮬레이터 준비됨"
                time="방금"
                description="buttons publish robot or dispenser commands through the backend simulator"
              />
            ) : (
              events.map((event, index) => (
                <ActivityItem
                  key={`${event.created_at}-${index}`}
                  icon={Activity}
                  title={event.message}
                  time={formatTime(event.created_at)}
                  description={event.payload?.last_command || event.event_type}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-4 bg-card rounded-xl border border-border">
        <h2 className="font-semibold text-foreground mb-4">빠른 실행</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction icon={Cookie} label="사료 급여" onClick={() => runQuickAction('feed')} />
          <QuickAction icon={Activity} label="물 급수" onClick={() => runQuickAction('water')} />
          <QuickAction icon={Camera} label="카메라 센터" onClick={() => runQuickAction('snapshot')} />
          <QuickAction icon={Wifi} label="연결 확인" onClick={() => runQuickAction('connect')} />
        </div>
      </div>
    </div>
  )
}

function StatusCard({ icon: Icon, label, value, status }) {
  const statusColors = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-destructive',
  }

  return (
    <div className="p-3 md:p-4 bg-card rounded-xl border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 md:w-5 md:h-5 ${statusColors[status]}`} />
        <span className="text-xs md:text-sm text-muted-foreground">{label}</span>
      </div>
      <p className={`text-base md:text-lg font-bold ${statusColors[status]}`}>{value}</p>
    </div>
  )
}

function ActivityItem({ icon: Icon, title, time, description }) {
  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          <span className="text-xs text-muted-foreground shrink-0">{time}</span>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors touch-active">
      <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
      <span className="text-xs md:text-sm font-medium text-foreground">{label}</span>
    </button>
  )
}

function formatTime(value) {
  if (!value) {
    return '방금'
  }
  return new Date(value).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}
