import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card } from '../components/ui'

const COLORS = {
  food: '#F08D86',
  water: '#5BA4D9',
  brown: '#4B3621',
  mute: '#9C8A78',
  line: '#EFE3D2',
}

/* ───── Mock 통계 데이터 (사료 food=g / 급수 water=ml) ───── */
// 일간: 오늘 시간대별
const DAILY = [
  { label: '아침', food: 15, water: 90 },
  { label: '점심', food: 10, water: 60 },
  { label: '오후', food: 8, water: 70 },
  { label: '저녁', food: 15, water: 100 },
  { label: '야식', food: 5, water: 40 },
]
// 주간: 최근 7일 일별 합계
const WEEKLY = [
  { label: '월', food: 42, water: 320 },
  { label: '화', food: 38, water: 300 },
  { label: '수', food: 50, water: 360 },
  { label: '목', food: 45, water: 330 },
  { label: '금', food: 53, water: 380 },
  { label: '토', food: 40, water: 310 },
  { label: '일', food: 48, water: 350 },
]
// 월간: 올해 월별 합계
const MONTHLY = [
  { label: '1월', food: 1240, water: 9200 }, { label: '2월', food: 1120, water: 8600 }, { label: '3월', food: 1310, water: 9600 },
  { label: '4월', food: 1280, water: 9300 }, { label: '5월', food: 1360, water: 9900 }, { label: '6월', food: 1295, water: 9400 },
  { label: '7월', food: 1410, water: 10200 }, { label: '8월', food: 1380, water: 10000 }, { label: '9월', food: 1330, water: 9700 },
]

const PERIODS = [
  { id: 'day', label: '일간' },
  { id: 'week', label: '주간' },
  { id: 'month', label: '월간' },
]

export function Feeding() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState('day')

  /* 요약 통계 */
  const summary = useMemo(() => {
    const todayFood = DAILY.reduce((s, d) => s + d.food, 0)
    const todayWater = DAILY.reduce((s, d) => s + d.water, 0)
    return { todayFood, todayWater, lastFeed: '오후 6:10' }
  }, [])

  return (
    <div className="px-5 pb-6">
      {/* 헤더 + 뒤로가기 */}
      <header className="flex items-center gap-2.5 pt-5 pb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로가기"
          className="w-10 h-10 rounded-2xl bg-brand-card shadow-soft flex items-center justify-center text-brand-brown touch-active shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-brand-brown leading-tight">급여 통계</h1>
          <p className="text-sm text-brand-mute truncate">일 · 주 · 월 급여량 통계</p>
        </div>
      </header>

      {/* 기간 탭 */}
      <div className="flex justify-center mb-4">
        <PeriodTabs value={period} onChange={setPeriod} />
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-2.5">
        <SummaryCard label="오늘 사료" value={`${summary.todayFood}g`} dot={COLORS.food} />
        <SummaryCard label="오늘 급수" value={`${summary.todayWater}ml`} dot={COLORS.water} />
        <SummaryCard label="마지막 급여" value={summary.lastFeed} small />
      </div>

      {/* 차트 (사료 + 급수 한눈에) */}
      <Card className="mt-3 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-brand-mute font-semibold">
            {period === 'day' && '오늘 시간대별'}
            {period === 'week' && '최근 7일 일별'}
            {period === 'month' && '올해 월별'} 사료·급수
          </p>
          <div className="flex items-center gap-3 text-[11px] font-bold">
            <Legend2 color={COLORS.food} label="사료(g)" />
            <Legend2 color={COLORS.water} label="급수(ml)" />
          </div>
        </div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={period === 'day' ? DAILY : period === 'week' ? WEEKLY : MONTHLY}
              margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: COLORS.mute }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="food" tick={{ fontSize: 11, fill: COLORS.food }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="water" orientation="right" tick={{ fontSize: 11, fill: COLORS.water }} axisLine={false} tickLine={false} width={36} />
              <Tooltip {...tooltipProps} cursor={{ fill: `${COLORS.mute}14` }}
                formatter={(v, name) => [name === '사료' ? `${v}g` : `${v}ml`, name]} />
              <Bar yAxisId="food" dataKey="food" name="사료" fill={COLORS.food} radius={[6, 6, 0, 0]} maxBarSize={20} animationDuration={500} />
              <Bar yAxisId="water" dataKey="water" name="급수" fill={COLORS.water} radius={[6, 6, 0, 0]} maxBarSize={20} animationDuration={500} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

const tooltipProps = {
  contentStyle: {
    borderRadius: 12,
    border: `1px solid ${COLORS.line}`,
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.brown,
    boxShadow: '0 8px 24px -6px rgba(75,54,33,0.15)',
  },
  labelStyle: { color: COLORS.mute, fontWeight: 700 },
}

/* ───── 보조 컴포넌트 ───── */
function PeriodTabs({ value, onChange }) {
  return (
    <div className="inline-flex bg-brand-cream rounded-full p-1 shadow-soft-inset">
      {PERIODS.map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`px-5 py-1.5 text-sm font-bold rounded-full transition-colors ${active ? 'bg-brand-primary text-white shadow-soft' : 'text-brand-mute'}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function SummaryCard({ label, value, small, dot }) {
  return (
    <Card className="px-3 py-3.5 text-center">
      <p className="text-[11px] text-brand-mute font-semibold truncate flex items-center justify-center gap-1">
        {dot && <span className="w-2 h-2 rounded-full" style={{ background: dot }} />}
        {label}
      </p>
      <p className={`font-display font-bold text-brand-brown mt-1 leading-none ${small ? 'text-base' : 'text-xl'}`}>{value}</p>
    </Card>
  )
}

function Legend2({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1 text-brand-brown">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

export default Feeding
