import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card } from '../components/ui'

const COLORS = {
  food: '#F08D86',
  brown: '#4B3621',
  mute: '#9C8A78',
  line: '#EFE3D2',
}

/* ───── Mock 통계 데이터 ───── */
// 일간: 오늘 시간대별 급여량(g)
const DAILY = [
  { label: '아침', g: 15 },
  { label: '점심', g: 10 },
  { label: '오후', g: 8 },
  { label: '저녁', g: 15 },
  { label: '야식', g: 5 },
]
// 주간: 최근 7일 일별 총 급여량(g)
const WEEKLY = [
  { label: '월', g: 42 },
  { label: '화', g: 38 },
  { label: '수', g: 50 },
  { label: '목', g: 45 },
  { label: '금', g: 53 },
  { label: '토', g: 40 },
  { label: '일', g: 48 },
]
// 월간: 올해 월별 총 급여량(g)
const MONTHLY = [
  { label: '1월', g: 1240 }, { label: '2월', g: 1120 }, { label: '3월', g: 1310 },
  { label: '4월', g: 1280 }, { label: '5월', g: 1360 }, { label: '6월', g: 1295 },
  { label: '7월', g: 1410 }, { label: '8월', g: 1380 }, { label: '9월', g: 1330 },
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
    const todayTotal = DAILY.reduce((s, d) => s + d.g, 0)
    const weekAvg = Math.round(WEEKLY.reduce((s, d) => s + d.g, 0) / WEEKLY.length)
    return { todayTotal, weekAvg, lastFeed: '오후 6:10' }
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
        <SummaryCard label="오늘 총 급여량" value={`${summary.todayTotal}g`} />
        <SummaryCard label="주간 평균" value={`${summary.weekAvg}g`} />
        <SummaryCard label="마지막 급여" value={summary.lastFeed} small />
      </div>

      {/* 차트 */}
      <Card className="mt-3 p-4">
        <p className="text-xs text-brand-mute font-semibold mb-3">
          {period === 'day' && '오늘 시간대별 급여량 (g)'}
          {period === 'week' && '최근 7일 일별 급여량 (g)'}
          {period === 'month' && '올해 월별 총 급여량 (g)'}
        </p>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            {period === 'week' ? (
              <LineChart data={WEEKLY} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: COLORS.mute }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: COLORS.mute }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipProps} formatter={(v) => [`${v}g`, '급여량']} />
                <Line type="monotone" dataKey="g" stroke={COLORS.food} strokeWidth={3}
                  dot={{ r: 4, fill: COLORS.food }} activeDot={{ r: 6 }} animationDuration={500} />
              </LineChart>
            ) : (
              <BarChart data={period === 'day' ? DAILY : MONTHLY} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: COLORS.mute }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: COLORS.mute }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipProps} cursor={{ fill: `${COLORS.food}1a` }} formatter={(v) => [`${v}g`, '급여량']} />
                <Bar dataKey="g" fill={COLORS.food} radius={[8, 8, 0, 0]} maxBarSize={36} animationDuration={500} />
              </BarChart>
            )}
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

function SummaryCard({ label, value, small }) {
  return (
    <Card className="px-3 py-3.5 text-center">
      <p className="text-[11px] text-brand-mute font-semibold truncate">{label}</p>
      <p className={`font-display font-bold text-brand-brown mt-1 leading-none ${small ? 'text-base' : 'text-xl'}`}>{value}</p>
    </Card>
  )
}

export default Feeding
