import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card } from '../components/ui'
import { api } from '../api/api'

const COLORS = {
  food: '#F08D86',
  water: '#5BA4D9',
  brown: '#4B3621',
  mute: '#9C8A78',
  line: '#EFE3D2',
}

/* ───── DB 기록(feed_logs / water_logs) → 일/주/월 집계 ───── */
const DAY_LABELS = ['아침', '점심', '오후', '저녁', '야식']
const WEEK_CHARS = ['일', '월', '화', '수', '목', '금', '토']

// 시각(시) → 시간대 버킷 인덱스
function hourBucket(h) {
  if (h >= 5 && h < 11) return 0 // 아침
  if (h >= 11 && h < 14) return 1 // 점심
  if (h >= 14 && h < 18) return 2 // 오후
  if (h >= 18 && h < 22) return 3 // 저녁
  return 4 // 야식 (22~04)
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function fmtTime(d) {
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ap = h < 12 ? '오전' : '오후'
  h %= 12
  if (h === 0) h = 12
  return `${ap} ${h}:${m}`
}

// logs: { feed:[{amount_g,created_at}], water:[{amount_ml,created_at}] }
function buildStats(logs) {
  const now = new Date()
  const F = (logs.feed || []).map((x) => ({ t: new Date(x.created_at), v: Number(x.amount_g) || 0 }))
  const W = (logs.water || []).map((x) => ({ t: new Date(x.created_at), v: Number(x.amount_ml) || 0 }))

  // 일간: 오늘 시간대별
  const daily = DAY_LABELS.map((label) => ({ label, food: 0, water: 0 }))
  F.forEach(({ t, v }) => { if (sameDay(t, now)) daily[hourBucket(t.getHours())].food += v })
  W.forEach(({ t, v }) => { if (sameDay(t, now)) daily[hourBucket(t.getHours())].water += v })

  // 주간: 최근 7일 (오래된→오늘)
  const weekly = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    weekly.push({ key: d, label: WEEK_CHARS[d.getDay()], food: 0, water: 0 })
  }
  const findDay = (t) => weekly.find((w) => sameDay(w.key, t))
  F.forEach(({ t, v }) => { const w = findDay(t); if (w) w.food += v })
  W.forEach(({ t, v }) => { const w = findDay(t); if (w) w.water += v })

  // 월간: 최근 24개월 (현재 달이 오른쪽 끝)
  const monthly = []
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthly.push({ y: d.getFullYear(), mo: d.getMonth(), label: `${String(d.getFullYear()).slice(2)}.${d.getMonth() + 1}`, food: 0, water: 0 })
  }
  const findMonth = (t) => monthly.find((mm) => mm.y === t.getFullYear() && mm.mo === t.getMonth())
  F.forEach(({ t, v }) => { const mm = findMonth(t); if (mm) mm.food += v })
  W.forEach(({ t, v }) => { const mm = findMonth(t); if (mm) mm.water += v })

  // 소수 누적 정리 + 임시 키 제거
  const tidy = (arr) => arr.map(({ key, y, mo, ...rest }) => ({ ...rest, food: Math.round(rest.food), water: Math.round(rest.water) }))
  const DAILY = tidy(daily)
  const WEEKLY = tidy(weekly)
  const MONTHLY = tidy(monthly)

  const todayFood = DAILY.reduce((s, d) => s + d.food, 0)
  const todayWater = DAILY.reduce((s, d) => s + d.water, 0)
  const lastFeed = F.length ? fmtTime(F[F.length - 1].t) : '-'

  return { DAILY, WEEKLY, MONTHLY, summary: { todayFood, todayWater, lastFeed } }
}

const PERIODS = [
  { id: 'day', label: '일간' },
  { id: 'week', label: '주간' },
  { id: 'month', label: '월간' },
]

export function Feeding() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState('day')
  const [logs, setLogs] = useState({ feed: [], water: [] })

  // 실제 배식/급수 기록을 DB에서 불러옴
  useEffect(() => {
    api
      .getDispenserLogs()
      .then((d) => setLogs({ feed: d.feed || [], water: d.water || [] }))
      .catch(() => {})
  }, [])

  // DB 기록으로 일/주/월 집계 + 요약 계산
  const { DAILY, WEEKLY, MONTHLY, summary } = useMemo(() => buildStats(logs), [logs])

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
        <div key={period} className="page-enter">
        {period === 'month' ? (
          <MonthlyPanChart all={MONTHLY} />
        ) : (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={period === 'day' ? DAILY : WEEKLY}
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
        )}
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

/* 월간 차트 — 현재 달이 오른쪽 끝, 좌우 드래그로 과거 보기 (주식 차트 느낌) */
function MonthlyPanChart({ all, visible = 6 }) {
  const maxOffset = Math.max(0, all.length - visible)
  const [offset, setOffset] = useState(0) // 0 = 최신(현재 달이 오른쪽)
  const drag = useRef(null)

  const start = Math.max(0, all.length - visible - offset)
  const data = all.slice(start, start + visible)

  const STEP = 46 // 한 칸(=한 달) 이동에 필요한 드래그 px
  const onDown = (e) => {
    drag.current = { x: e.clientX, offset, moved: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onMove = (e) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(dx) > 4) drag.current.moved = true
    // 오른쪽으로 끌면(dx>0) 과거(offset↑)
    const next = Math.max(0, Math.min(maxOffset, drag.current.offset + Math.round(dx / STEP)))
    setOffset(next)
  }
  const onUp = (e) => {
    drag.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  const first = data[0]?.label
  const last = data[data.length - 1]?.label

  return (
    <div>
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="select-none touch-none cursor-grab active:cursor-grabbing"
        style={{ width: '100%', height: 260 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 0, left: -18, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: COLORS.mute }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="food" tick={{ fontSize: 11, fill: COLORS.food }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="water" orientation="right" tick={{ fontSize: 11, fill: COLORS.water }} axisLine={false} tickLine={false} width={36} />
            <Tooltip {...tooltipProps} cursor={{ fill: `${COLORS.mute}14` }}
              formatter={(v, name) => [name === '사료' ? `${v}g` : `${v}ml`, name]} />
            <Bar yAxisId="food" dataKey="food" name="사료" fill={COLORS.food} radius={[6, 6, 0, 0]} maxBarSize={20} isAnimationActive={false} />
            <Bar yAxisId="water" dataKey="water" name="급수" fill={COLORS.water} radius={[6, 6, 0, 0]} maxBarSize={20} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 범위 + 드래그 안내 */}
      <div className="mt-1 flex items-center justify-between px-1 text-[11px] text-brand-mute font-semibold">
        <span>{first} ~ {last}</span>
        <span className="flex items-center gap-1">
          {offset < maxOffset ? '◀ 드래그해서 과거 보기' : '최근'}
          {offset > 0 && (
            <button
              type="button"
              onClick={() => setOffset(0)}
              className="ml-1 px-2 py-0.5 rounded-full bg-brand-cream text-brand-brown font-bold touch-active"
            >
              현재로
            </button>
          )}
        </span>
      </div>
    </div>
  )
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
