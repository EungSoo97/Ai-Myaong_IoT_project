import { useMemo, useState } from 'react'
import {
  Minus,
  Plus,
  Play,
  Clock,
  UtensilsCrossed,
  AlertTriangle,
  Droplets,
  Plus as PlusIcon,
} from 'lucide-react'
import { Card, CreamCard, PageHeader, PrimaryButton } from '../components/ui'

const COLORS = {
  food: '#F08D86',
  water: '#5BA4D9',
  brown: '#4B3621',
  mute: '#9C8A78',
}

const WEEKLY_TREND = [
  { label: '월', food: 22, water: 110 },
  { label: '화', food: 18, water: 95 },
  { label: '수', food: 30, water: 140 },
  { label: '목', food: 26, water: 125 },
  { label: '금', food: 35, water: 150 },
  { label: '토', food: 20, water: 130 },
  { label: '일', food: 28, water: 120 },
]

const MONTHLY_TREND = [
  { label: '1주', food: 168, water: 820 },
  { label: '2주', food: 182, water: 870 },
  { label: '3주', food: 159, water: 760 },
  { label: '4주', food: 179, water: 890 },
]

export function Dispenser() {
  const [foodAmount, setFoodAmount] = useState(15)
  const [waterAmount, setWaterAmount] = useState(80)
  const [period, setPeriod] = useState('week')

  const [schedule, setSchedule] = useState([
    { id: 1, time: '08:00', type: 'food', amount: 15, on: true },
    { id: 2, time: '12:00', type: 'water', amount: 100, on: true },
    { id: 3, time: '13:00', type: 'food', amount: 10, on: true },
    { id: 4, time: '19:00', type: 'food', amount: 15, on: false },
  ])

  const foodRemain = 28
  const waterRemain = 62
  const foodLow = foodRemain < 30
  const waterLow = waterRemain < 25

  const trend = period === 'week' ? WEEKLY_TREND : MONTHLY_TREND
  const totals = useMemo(() => ({
    food: trend.reduce((s, d) => s + d.food, 0),
    water: trend.reduce((s, d) => s + d.water, 0),
  }), [trend])
  const maxFood = Math.max(...trend.map((d) => d.food))
  const maxWater = Math.max(...trend.map((d) => d.water))

  return (
    <div className="px-5 pb-6">
      <PageHeader title="디스펜서" subtitle="사료 · 음수 · 통계" />

      {/* 잔여량 (사료 + 물) */}
      <section className="grid grid-cols-2 gap-3">
        <ResourceCard
          icon={<UtensilsCrossed className="w-4 h-4" />}
          label="사료 잔여량"
          value={foodRemain}
          unit="%"
          color="primary"
          low={foodLow}
        />
        <ResourceCard
          icon={<Droplets className="w-4 h-4" />}
          label="수위 (Water Level)"
          value={waterRemain}
          unit="%"
          color="water"
          low={waterLow}
        />
      </section>

      <ManualCard
        kind="food"
        title="수동 배식"
        unitLabel="g"
        amount={foodAmount}
        min={5}
        max={50}
        step={5}
        onChange={setFoodAmount}
        button={`지금 ${foodAmount}g 배식하기`}
        icon={<UtensilsCrossed className="w-4 h-4" />}
      />

      <ManualCard
        kind="water"
        title="수동 급수"
        unitLabel="ml"
        amount={waterAmount}
        min={20}
        max={300}
        step={20}
        onChange={setWaterAmount}
        button={`지금 ${waterAmount}ml 급수하기`}
        icon={<Droplets className="w-4 h-4" />}
      />

      {/* 스케줄 */}
      <section className="mt-5">
        <div className="flex items-center justify-between px-1 mb-3">
          <h3 className="font-display text-base font-bold text-brand-brown">자동 스케줄</h3>
          <button className="flex items-center gap-1 text-xs font-bold text-brand-primary touch-active">
            <PlusIcon className="w-3.5 h-3.5" /> 추가
          </button>
        </div>
        <CreamCard className="divide-y divide-brand-line">
          {schedule.map((s) => {
            const isFood = s.type === 'food'
            return (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                <span
                  className="w-10 h-10 rounded-2xl bg-brand-card flex items-center justify-center shadow-soft"
                  style={{ color: isFood ? COLORS.food : COLORS.water }}
                >
                  {isFood ? <UtensilsCrossed className="w-5 h-5" /> : <Droplets className="w-5 h-5" />}
                </span>
                <div className="flex-1">
                  <p className="font-display text-lg font-bold text-brand-brown leading-none">{s.time}</p>
                  <p className="text-xs text-brand-mute mt-1">
                    {isFood ? `사료 ${s.amount}g` : `물 ${s.amount}ml`}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={s.on}
                    onChange={(e) =>
                      setSchedule((prev) => prev.map((x) => (x.id === s.id ? { ...x, on: e.target.checked } : x)))
                    }
                  />
                  <span className="w-12 h-7 rounded-full bg-brand-line peer-checked:bg-brand-primary transition-colors" />
                  <span className="absolute left-1 top-1 w-5 h-5 rounded-full bg-white shadow-soft transition-transform peer-checked:translate-x-5" />
                </label>
              </div>
            )
          })}
        </CreamCard>
      </section>

      {/* 통계 (단순 막대 차트, 외부 라이브러리 미사용) */}
      <section className="mt-6">
        <div className="flex items-center justify-between px-1 mb-3">
          <h3 className="font-display text-base font-bold text-brand-brown">섭취 통계</h3>
          <PeriodTabs value={period} onChange={setPeriod} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SummaryStat color={COLORS.food} label={period === 'week' ? '주간 사료' : '월간 사료'} value={`${totals.food}g`} />
          <SummaryStat color={COLORS.water} label={period === 'week' ? '주간 음수' : '월간 음수'} value={`${totals.water}ml`} />
        </div>

        <Card className="mt-3 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-brand-mute font-semibold">
              {period === 'week' ? '이번 주' : '이번 달'} 트렌드
            </p>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <Legend color={COLORS.food} label="사료(g)" />
              <Legend color={COLORS.water} label="음수(ml)" />
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 h-32">
            {trend.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div className="w-full flex items-end justify-center gap-1 h-full">
                  <div
                    className="w-1/2 rounded-t-lg transition-all"
                    style={{ height: `${(d.food / maxFood) * 100}%`, background: COLORS.food }}
                    title={`사료 ${d.food}g`}
                  />
                  <div
                    className="w-1/2 rounded-t-lg transition-all"
                    style={{ height: `${(d.water / maxWater) * 100}%`, background: COLORS.water }}
                    title={`음수 ${d.water}ml`}
                  />
                </div>
                <span className="text-[10px] font-semibold text-brand-mute">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}

/* ───── 보조 컴포넌트 ───── */

function ResourceCard({ icon, label, value, unit, color, low }) {
  const accent = color === 'water' ? COLORS.water : COLORS.food
  return (
    <Card className={`px-4 py-4 ${low ? 'border-brand-danger/40' : ''}`}>
      <div className="flex items-center gap-1.5 text-brand-mute mb-1">
        <span style={{ color: accent }}>{icon}</span>
        <p className="text-[11px] font-semibold truncate">{label}</p>
      </div>
      <p className="font-display text-2xl font-bold text-brand-brown leading-none">
        {value}
        <span className="text-base ml-0.5 text-brand-mute font-bold">{unit}</span>
      </p>
      <div className="mt-3 h-2.5 rounded-full bg-brand-line overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: low ? '#E26D5C' : accent }}
        />
      </div>
      {low ? (
        <p className="mt-2 text-[11px] text-brand-danger font-bold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> 부족 경고
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-brand-success font-bold">충분</p>
      )}
    </Card>
  )
}

function ManualCard({ kind, title, unitLabel, amount, min, max, step, onChange, button, icon }) {
  const isWater = kind === 'water'
  const accent = isWater ? COLORS.water : COLORS.food
  const ratio = (amount - min) / (max - min)
  return (
    <Card className="mt-4 px-5 py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{ background: `${accent}26`, color: accent }}
          >
            {icon}
          </span>
          <div>
            <p className="text-xs text-brand-mute font-semibold">{title}</p>
            <p className="font-display text-base font-bold text-brand-brown">1회 제공량</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: `${accent}26`, color: accent }}>
          {amount}{unitLabel}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => onChange(Math.max(min, amount - step))}
          className="w-12 h-12 rounded-2xl bg-brand-cream text-brand-brown shadow-soft touch-active flex items-center justify-center"
          aria-label="감소"
        >
          <Minus className="w-5 h-5" />
        </button>
        <div className="flex-1 h-3 rounded-full bg-brand-line overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${ratio * 100}%`, background: accent }} />
        </div>
        <button
          onClick={() => onChange(Math.min(max, amount + step))}
          className="w-12 h-12 rounded-2xl bg-brand-cream text-brand-brown shadow-soft touch-active flex items-center justify-center"
          aria-label="증가"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {isWater ? (
        <button
          type="button"
          className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-3xl text-white font-bold py-3.5 shadow-soft transition-colors"
          style={{ background: accent }}
        >
          <Play className="w-4 h-4" />
          {button}
        </button>
      ) : (
        <PrimaryButton className="mt-4 w-full">
          <Play className="w-4 h-4" />
          {button}
        </PrimaryButton>
      )}
    </Card>
  )
}

function PeriodTabs({ value, onChange }) {
  return (
    <div className="inline-flex bg-brand-cream rounded-full p-1 shadow-soft-inset">
      {[{ id: 'week', label: '주간' }, { id: 'month', label: '월간' }].map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
              active ? 'bg-brand-primary text-white shadow-soft' : 'text-brand-mute'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function SummaryStat({ color, label, value }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <p className="text-xs text-brand-mute font-semibold">{label}</p>
      </div>
      <p className="font-display text-2xl font-bold text-brand-brown mt-1">{value}</p>
    </Card>
  )
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1 text-brand-brown">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

export default Dispenser
