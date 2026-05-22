import { useMemo, useState } from 'react'
import { Activity, Clock, Cookie, Droplets, Minus, Play, Plus, Settings, Trash2 } from 'lucide-react'
import { api } from '../api/api'
import { useRobotStatus } from '../hooks/useRobotStatus'

export function Dispenser() {
  const [foodAmount, setFoodAmount] = useState(50)
  const [waterAmount, setWaterAmount] = useState(100)
  const [autoFeed, setAutoFeed] = useState(true)
  const [motionFeed, setMotionFeed] = useState(false)
  const [busy, setBusy] = useState(false)
  const { status, dashboard, refresh } = useRobotStatus(2500)

  const foodRemaining = status?.dispenser?.food_remaining ?? 75
  const waterRemaining = status?.dispenser?.water_remaining ?? 60

  const schedules = [
    { id: 1, time: '08:00', type: 'food', amount: '50g', enabled: true },
    { id: 2, time: '12:00', type: 'water', amount: '100ml', enabled: true },
    { id: 3, time: '18:00', type: 'food', amount: '50g', enabled: true },
    { id: 4, time: '20:00', type: 'water', amount: '100ml', enabled: false },
  ]

  const history = useMemo(() => {
    return (dashboard?.commands || [])
      .filter((item) => item.command_type === 'dispenser_feed' || item.command_type === 'dispenser_water')
      .map((item) => ({
        time: new Date(item.created_at).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        type: item.command_type === 'dispenser_water' ? 'water' : 'food',
        amount:
          item.command_type === 'dispenser_water'
            ? `${item.payload.amount * 100}ml`
            : `${item.payload.amount * 50}g`,
      }))
  }, [dashboard])

  const handleDispense = async (type) => {
    const amount =
      type === 'food'
        ? Math.max(1, Math.round(foodAmount / 50))
        : Math.max(1, Math.round(waterAmount / 100))

    setBusy(true)
    try {
      if (type === 'food') {
        await api.dispenserFeed(amount)
      } else {
        await api.dispenserWater(amount)
      }
      refresh()
    } catch (error) {
      console.error(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">디스펜서</h1>
        <p className="text-muted-foreground text-sm mt-1">
          ESP32 급식/급수 장치를 원격 로봇과 분리해서 제어합니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <StatusTile icon={Cookie} label="사료 잔량" value={`${foodRemaining}%`} />
        <StatusTile icon={Droplets} label="물 잔량" value={`${waterRemaining}%`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AmountCard
          icon={Cookie}
          title="사료 급여"
          unit="g"
          min={10}
          max={200}
          step={10}
          value={foodAmount}
          setValue={setFoodAmount}
          busy={busy}
          onRun={() => handleDispense('food')}
          accent="warning"
        />
        <AmountCard
          icon={Droplets}
          title="물 급수"
          unit="ml"
          min={20}
          max={500}
          step={20}
          value={waterAmount}
          setValue={setWaterAmount}
          busy={busy}
          onRun={() => handleDispense('water')}
          accent="primary"
        />
      </div>

      <div className="p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">자동 동작 설정</h3>
        </div>
        <ToggleRow
          title="자동 급여"
          description="설정된 시간에 자동으로 사료를 공급합니다."
          enabled={autoFeed}
          onToggle={() => setAutoFeed((prev) => !prev)}
        />
        <ToggleRow
          title="모션 감지 급여"
          description="감지 이벤트에 반응해 급여하도록 준비합니다."
          enabled={motionFeed}
          onToggle={() => setMotionFeed((prev) => !prev)}
        />
      </div>

      <div className="p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">급여 스케줄</h3>
          </div>
          <button className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                schedule.enabled ? 'bg-secondary' : 'bg-secondary/50 opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {schedule.type === 'food' ? (
                  <Cookie className="w-5 h-5 text-warning" />
                ) : (
                  <Droplets className="w-5 h-5 text-primary" />
                )}
                <div>
                  <p className="font-medium text-foreground">{schedule.time}</p>
                  <p className="text-xs text-muted-foreground">{schedule.amount}</p>
                </div>
              </div>
              <button className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">오늘 디스펜서 기록</h3>
        </div>
        <div className="space-y-2">
          {(history.length ? history : [{ time: '대기', type: 'food', amount: '아직 명령 없음' }]).map(
            (item, index) => (
              <div key={index} className="flex items-center justify-between p-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  {item.type === 'food' ? (
                    <Cookie className="w-4 h-4 text-warning" />
                  ) : (
                    <Droplets className="w-4 h-4 text-primary" />
                  )}
                  <span className="text-sm text-foreground">{item.time}</span>
                </div>
                <span className="text-sm text-muted-foreground">{item.amount}</span>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  )
}

function StatusTile({ icon: Icon, label, value }) {
  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-primary" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-2xl md:text-3xl font-bold text-foreground">{value}</span>
    </div>
  )
}

function AmountCard({ icon: Icon, title, unit, min, max, step, value, setValue, busy, onRun, accent }) {
  const accentClass = accent === 'warning' ? 'accent-warning' : 'accent-primary'
  const buttonClass = accent === 'warning' ? 'bg-warning hover:bg-warning/90' : 'bg-primary hover:bg-primary/90'

  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex items-center justify-center gap-4 mb-4">
        <button onClick={() => setValue((prev) => Math.max(min, prev - step))} className="p-3 rounded-lg bg-secondary hover:bg-secondary/80">
          <Minus className="w-5 h-5 text-foreground" />
        </button>
        <div className="text-center min-w-[100px]">
          <span className="text-3xl md:text-4xl font-bold text-foreground">{value}</span>
          <span className="text-lg text-muted-foreground ml-1">{unit}</span>
        </div>
        <button onClick={() => setValue((prev) => Math.min(max, prev + step))} className="p-3 rounded-lg bg-secondary hover:bg-secondary/80">
          <Plus className="w-5 h-5 text-foreground" />
        </button>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        className={`w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer ${accentClass}`}
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
      <button onClick={onRun} disabled={busy} className={`w-full mt-4 py-3 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2 ${buttonClass}`}>
        <Play className="w-4 h-4" />
        {busy ? '명령 전송 중' : '지금 실행'}
      </button>
    </div>
  )
}

function ToggleRow({ title, description, enabled, onToggle }) {
  return (
    <div className="flex items-center justify-between p-3 bg-secondary rounded-lg mb-3 last:mb-0">
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`w-12 h-7 rounded-full transition-colors relative ${enabled ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}
