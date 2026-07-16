import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Minus,
  Plus,
  Play,
  Clock,
  UtensilsCrossed,
  AlertTriangle,
  Droplets,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  PawPrint,
  Bone,
  Plus as PlusIcon,
} from '../components/icons'
import { Card, CreamCard, PageHeader, PrimaryButton } from '../components/ui'
import { TimeWheel } from '../components/TimeWheel'
import { api } from '../api/api'
import { useFeedSettings, setFoodAmount, setWaterAmount } from '../lib/dispenserSettings'
import { addNotification } from '../lib/notificationRepository'

// 브랜드 색 토큰(CSS 변수) 사용 → 다크모드에서 자동으로 차분한 톤으로 전환
const COLORS = {
  food: 'rgb(var(--brand-food))',
  water: 'rgb(var(--brand-water))',
  brown: 'rgb(var(--brand-brown))',
  mute: 'rgb(var(--brand-mute))',
}
// rgb(var(--x)) 색에 투명도 적용: rgb(var(--x) / a)
const withAlpha = (c, a) => `${c.slice(0, -1)} / ${a})`

// 카드 배경: 흰색 80% + 크림 20% (은은) / 정보·칩: 따뜻한 탄
const BG_CARD = "color-mix(in srgb, rgb(var(--brand-card)) 80%, rgb(var(--brand-cream)) 20%)"
const BG_INFO = "color-mix(in srgb, rgb(var(--brand-cream)) 78%, rgb(var(--brand-mute)) 22%)"
const ROBOT_SERIAL_KEY = 'aimyaong:robotSerial'

/* 안쪽 점선 바느질 테두리 (펠트 느낌) */
function Stitch({ className = '' }) {
  return (
    <span className={`pointer-events-none absolute inset-[6px] rounded-[18px] border-2 border-dashed border-brand-brown/20 ${className}`} />
  )
}

/* 종이질감 장식 아이콘 — public/icons/*.svg 실루엣을 마스크로, paper.jpg 텍스처를 그 안에만.
 * 아이콘 출처: Phosphor Icons (MIT) — public/icons/{paw,bone,heart}.svg */
function PaperIcon({ shape, color, className = '', opacity = 1 }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none ${className}`}
      style={{
        backgroundColor: color,
        backgroundImage: 'url(/paper.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'multiply',
        WebkitMaskImage: `url(/icons/${shape}.svg)`,
        maskImage: `url(/icons/${shape}.svg)`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        opacity,
      }}
    />
  )
}

/* 오늘(일간) 시간대 버킷 라벨 */
const DAY_LABELS = ['아침', '점심', '오후', '저녁', '야식']

// 시각(시) → 시간대 버킷 인덱스
function hourBucket(h) {
  if (h >= 5 && h < 11) return 0 // 아침
  if (h >= 11 && h < 14) return 1 // 점심
  if (h >= 14 && h < 18) return 2 // 오후
  if (h >= 18 && h < 22) return 3 // 저녁
  return 4 // 야식 (22~04)
}

export function Dispenser() {
  const navigate = useNavigate()
  // 1회 제공량: 저장소에서 공유 (대시보드 빠른 배식과 동일 값 사용)
  const feed = useFeedSettings()
  const foodAmount = feed.food
  const waterAmount = feed.water

  const [schedule, setSchedule] = useState([]) // DB(feed_schedule/water_schedule)에서 불러옴, 없으면 빈 상태
  const [editing, setEditing] = useState(null) // { id?, time, type, amount } | null
  const [logs, setLogs] = useState({ feed: [], water: [] }) // 오늘의 급여 통계용 DB 기록

  // 배식/급수 기록 불러오기 (오늘의 통계 차트) — 자동 배식이 새로고침 없이 바로 반영되도록 폴링
  useEffect(() => {
    let alive = true
    const load = () =>
      api
        .getDispenserLogs()
        .then((d) => { if (alive) setLogs({ feed: d.feed || [], water: d.water || [] }) })
        .catch(() => {})
    load()
    const timer = window.setInterval(load, 3000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [])

  // ── 스케줄 DB 연동 (settings.feed_schedule / water_schedule 에 JSON 직렬화 저장) ──
  // 한 배열을 type 으로 나눠 각 컬럼에 저장하고, 불러올 때 다시 합친다. id 는 로컬 전용.
  const scheduleFirst = useRef(false) // 첫 렌더(기본값) 저장 방지
  const applyingFromDb = useRef(false) // DB 로드로 인한 변경은 재저장(에코) 방지

  useEffect(() => {
    // 마운트 시 DB 에서 스케줄 불러오기
    api
      .getSettings()
      .then((s) => {
        const parse = (raw, type) => {
          try {
            const arr = JSON.parse(raw || '[]')
            return Array.isArray(arr)
              ? arr.map((x) => ({ time: x.time, type, amount: Number(x.amount), on: x.on !== false }))
              : []
          } catch {
            return []
          }
        }
        const loaded = [...parse(s.feed_schedule, 'food'), ...parse(s.water_schedule, 'water')]
          .map((x, i) => ({ ...x, id: Date.now() + i }))
          .sort((a, b) => a.time.localeCompare(b.time))
        if (loaded.length) {
          applyingFromDb.current = true
          setSchedule(loaded)
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // 스케줄 변경(추가/수정/삭제/토글) 시 DB 저장
    if (!scheduleFirst.current) {
      scheduleFirst.current = true
      return
    }
    if (applyingFromDb.current) {
      applyingFromDb.current = false
      return
    }
    const pack = (type) =>
      JSON.stringify(
        schedule.filter((x) => x.type === type).map((x) => ({ time: x.time, amount: x.amount, on: x.on })),
      )
    api.updateSettings({ feed_schedule: pack('food'), water_schedule: pack('water') }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule])

  // 토스트
  const [toast, setToast] = useState(null)
  const [toastOn, setToastOn] = useState(false)
  const toastTimer = useRef(null)
  const showToast = (msg) => {
    clearTimeout(toastTimer.current)
    setToast(msg)
    requestAnimationFrame(() => setToastOn(true))
    toastTimer.current = setTimeout(() => {
      setToastOn(false)
      setTimeout(() => setToast(null), 300)
    }, 2000)
  }

  const [busy, setBusy] = useState(false)
  const [robotSerial] = useState(() => {
    try {
      return localStorage.getItem(ROBOT_SERIAL_KEY) || ''
    } catch {
      return ''
    }
  })
  const hasRobotSerial = !!robotSerial.trim()
  const requireRobotSerial = () => {
    if (hasRobotSerial) return false
    showToast('로봇 시리얼 번호를 먼저 등록해 주세요')
    return true
  }

  // 수동 배식 — 저장된 제공량으로 실제 배식 시도 + 토스트 + 알림
  const doFeed = async () => {
    if (busy) return
    if (requireRobotSerial()) return
    setBusy(true)
    try {
      await api.dispenserFeed(foodAmount)
      api.createFeedLog({ amount_g: foodAmount, feed_type: 'manual' }).catch(() => {}) // DB 기록
      // 오늘의 통계 즉시 반영 (새로고침 없이)
      setLogs((prev) => ({
        ...prev,
        feed: [...prev.feed, { amount_g: foodAmount, feed_type: 'manual', created_at: new Date().toISOString() }],
      }))
      showToast(`🍚 사료 ${foodAmount}g 배식 완료`)
      // 배식은 '일상'이라 알림(경고)으로 보내지 않음 → 통계/최근활동으로만 표현
    } catch {
      showToast('배식 실패 — 기기 연결을 확인해 주세요')
    } finally {
      setBusy(false)
    }
  }

  const doWater = async () => {
    if (busy) return
    if (requireRobotSerial()) return
    setBusy(true)
    try {
      await api.dispenserWater(waterAmount)
      api.createWaterLog({ amount_ml: waterAmount, water_type: 'manual' }).catch(() => {}) // DB 기록
      // 오늘의 통계 즉시 반영 (새로고침 없이)
      setLogs((prev) => ({
        ...prev,
        water: [...prev.water, { amount_ml: waterAmount, water_type: 'manual', created_at: new Date().toISOString() }],
      }))
      showToast(`💧 물 ${waterAmount}ml 급수 완료`)
      // 급수도 '일상'이라 알림(경고)으로 보내지 않음 → 통계/최근활동으로만 표현
    } catch {
      showToast('급수 실패 — 기기 연결을 확인해 주세요')
    } finally {
      setBusy(false)
    }
  }

  const openAdd = () => {
    if (requireRobotSerial()) return
    setEditing({ time: '08:00', type: 'food', amount: 15 })
  }
  const openEdit = (s) => {
    if (requireRobotSerial()) return
    setEditing({ id: s.id, time: s.time, type: s.type, amount: s.amount })
  }

  const saveSchedule = (form) => {
    if (requireRobotSerial()) return
    if (form.id) {
      setSchedule((prev) => prev.map((x) => (x.id === form.id ? { ...x, ...form } : x)))
      showToast('스케줄이 수정되었어요')
    } else {
      setSchedule((prev) =>
        [...prev, { ...form, id: Date.now(), on: true }].sort((a, b) => a.time.localeCompare(b.time)))
      showToast('스케줄이 추가되었어요')
    }
    setEditing(null)
  }

  const [removingIds, setRemovingIds] = useState([])
  const removeSchedule = (id) => {
    if (removingIds.includes(id)) return
    setRemovingIds((p) => [...p, id]) // 먼저 접히는 애니메이션
    setTimeout(() => {
      setSchedule((prev) => prev.filter((x) => x.id !== id))
      setRemovingIds((p) => p.filter((x) => x !== id))
      showToast('스케줄이 삭제되었어요')
    }, 320)
  }
  const toggleSchedule = (id) =>
    setSchedule((prev) => prev.map((x) => (x.id === id ? { ...x, on: !x.on } : x)))

  const foodRemain = 28
  const waterRemain = 62
  const foodLow = foodRemain < 30
  const waterLow = waterRemain < 25

  // 잔여량 부족/없음 → 알림 (세션당 1회, 스팸 방지)
  useEffect(() => {
    const notifyLow = (key, type, title, desc) => {
      const flag = `aimyaong:lowNotified:${key}`
      if (sessionStorage.getItem(flag)) return
      sessionStorage.setItem(flag, '1')
      addNotification({ type, title, desc, link: '/dispenser' })
    }
    if (foodLow) {
      notifyLow('food', 'food_low', '사료 부족',
        foodRemain <= 0 ? '사료가 비었어요. 지금 보충해주세요!' : `남은 사료 ${foodRemain}% · 보충해주세요!`)
    }
    if (waterLow) {
      notifyLow('water', 'water_low', '물 부족',
        waterRemain <= 0 ? '물이 비었어요. 지금 보충해주세요!' : `남은 물 ${waterRemain}% · 보충해주세요!`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 오늘의 급여 통계 — DB 기록(feed_logs/water_logs)으로 시간대별 집계
  const { DAILY_FOOD, DAILY_WATER, todayTotal, todayWater, maxFood, maxWater } = useMemo(() => {
    const now = new Date()
    const sameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
    const food = DAY_LABELS.map((label) => ({ label, g: 0 }))
    const water = DAY_LABELS.map((label) => ({ label, ml: 0 }))
    ;(logs.feed || []).forEach((x) => {
      const t = new Date(x.created_at)
      if (sameDay(t, now)) food[hourBucket(t.getHours())].g += Number(x.amount_g) || 0
    })
    ;(logs.water || []).forEach((x) => {
      const t = new Date(x.created_at)
      if (sameDay(t, now)) water[hourBucket(t.getHours())].ml += Number(x.amount_ml) || 0
    })
    food.forEach((d) => { d.g = Math.round(d.g) })
    water.forEach((d) => { d.ml = Math.round(d.ml) })
    // 사료·물을 같은 눈금(5단위 올림)으로 맞춰 실제 값 차이가 막대 높이에 보이도록
    const peak = Math.max(0, ...food.map((d) => d.g), ...water.map((d) => d.ml))
    const scaleMax = Math.max(5, Math.ceil(peak / 5) * 5)
    return {
      DAILY_FOOD: food,
      DAILY_WATER: water,
      todayTotal: food.reduce((s, d) => s + d.g, 0),
      todayWater: water.reduce((s, d) => s + d.ml, 0),
      maxFood: scaleMax,
      maxWater: scaleMax,
    }
  }, [logs])

  return (
    <div className="px-5 pb-6">
      {/* 헤더 + 뒤로가기 */}
      <header className="flex items-center gap-2.5 pt-5 pb-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="뒤로가기"
          className="w-9 h-9 -ml-1 flex items-center justify-center text-brand-brown touch-active shrink-0"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="min-w-0">
          <h1 className="font-cute text-2xl font-bold text-brand-brown leading-tight">디스펜서</h1>
          <p className="text-sm text-brand-mute truncate">사료 · 음수 · 통계</p>
        </div>
      </header>

      {/* 잔여량 (사료 + 물) */}
      {!hasRobotSerial && (
        <div className="mb-3 rounded-3xl border border-dashed border-brand-primary/30 bg-brand-primary/10 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 w-4 h-4 text-brand-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-brand-brown">
                시리얼 번호 등록이 필요합니다.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-brand-mute">
                수동 급식, 수동 급수와 자동 스케줄은 설정에서 로봇 시리얼 번호를 등록한 뒤 사용할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3">
        <ResourceCard
          icon={<UtensilsCrossed className="w-4 h-4" />}
          label="남은 사료"
          value={foodRemain}
          unit="%"
          color="primary"
          low={foodLow}
        />
        <ResourceCard
          icon={<Droplets className="w-4 h-4" />}
          label="남은 물"
          value={waterRemain}
          unit="%"
          color="water"
          low={waterLow}
        />
      </section>

      <div data-tour="disp-manual">
      <ManualCard
        kind="food"
        title="수동 배식"
        unitLabel="g"
        amount={foodAmount}
        min={5}
        max={50}
        step={5}
        onChange={setFoodAmount}
        onSubmit={doFeed}
        busy={busy}
        disabled={!hasRobotSerial}
        button={`지금 ${foodAmount}g 배식하기`}
        icon={<UtensilsCrossed className="w-4 h-4" />}
      />

      <ManualCard
        kind="water"
        title="수동 급수"
        unitLabel="ml"
        amount={waterAmount}
        min={5}
        max={50}
        step={5}
        onChange={setWaterAmount}
        onSubmit={doWater}
        busy={busy}
        disabled={!hasRobotSerial}
        button={`지금 ${waterAmount}ml 급수하기`}
        icon={<Droplets className="w-4 h-4" />}
      />
      </div>

      {/* 스케줄 (CRUD) */}
      <section className="mt-5" data-tour="disp-schedule">
        <div className="flex items-center px-1 mb-3">
          <h3 className="font-display text-base font-bold text-brand-brown">자동 스케줄</h3>
        </div>
        <div className="relative overflow-hidden rounded-3xl shadow-soft" style={{ backgroundColor: BG_CARD }}>
          <Stitch />
          <PaperIcon shape="bone" color="rgb(var(--brand-primary-deep))" opacity={0.1} className="absolute right-4 top-3 w-8 h-8 rotate-12" />
          <div className="relative z-10 divide-y divide-brand-line/70">
          {schedule.length === 0 && (
            <button
              type="button"
              onClick={openAdd}
              className="w-full px-4 py-9 flex flex-col items-center gap-3 active:opacity-80 transition-opacity"
            >
              <span
                className="w-14 h-14 rounded-full text-white flex items-center justify-center border-2 border-dashed border-white/40 shadow-soft"
                style={{ background: COLORS.food }}
              >
                <PlusIcon className="w-6 h-6" />
              </span>
              <span className="text-sm font-bold text-brand-brown/70">눌러서 자동 급여 일정을 추가하세요</span>
            </button>
          )}
          {schedule.map((s) => {
            const isFood = s.type === 'food'
            const removing = removingIds.includes(s.id)
            return (
              <div
                key={s.id}
                className="overflow-hidden transition-all duration-300 ease-out"
                style={{ maxHeight: removing ? 0 : 120, opacity: removing ? 0 : 1 }}
              >
              <div
                onClick={() => openEdit(s)}
                role="button"
                tabIndex={0}
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer border-l-4 hover:bg-brand-cream/50 active:bg-brand-cream active:scale-[0.985] transition-all duration-200"
                style={{
                  transform: removing ? 'translateX(-12px)' : undefined,
                  borderLeftColor: isFood ? COLORS.food : COLORS.water,
                  opacity: s.on ? 1 : 0.5,
                }}
              >
                {/* 삭제 (작은 ×) — 왼쪽 */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeSchedule(s.id) }}
                  aria-label="삭제"
                  className="w-6 h-6 rounded-full bg-brand-line/60 text-brand-mute flex items-center justify-center shrink-0 hover:bg-brand-danger hover:text-white active:bg-brand-danger active:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* 종류 아이콘 (색상 톤) */}
                <span
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: withAlpha(isFood ? COLORS.food : COLORS.water, 0.1), color: isFood ? COLORS.food : COLORS.water }}
                >
                  {isFood ? <UtensilsCrossed className="w-5 h-5" /> : <Droplets className="w-5 h-5" />}
                </span>

                {/* 시간 + 종류 배지 + 양 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-lg font-bold text-brand-brown leading-none">{s.time}</p>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                      style={{ background: withAlpha(isFood ? COLORS.food : COLORS.water, 0.1), color: isFood ? COLORS.food : COLORS.water }}
                    >
                      {isFood ? '사료' : '물'}
                    </span>
                    {!s.on && <span className="text-[10px] font-bold text-brand-mute">꺼짐</span>}
                  </div>
                  <p className="text-xs text-brand-mute mt-1 font-semibold">
                    {isFood ? `${s.amount}g` : `${s.amount}ml`}
                  </p>
                </div>

                {/* 활성 토글 */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={s.on}
                    onChange={() => toggleSchedule(s.id)}
                  />
                  <span className="w-12 h-7 rounded-full bg-brand-line peer-checked:bg-brand-primary transition-colors" />
                  <span className="absolute left-1 top-1 w-5 h-5 rounded-full bg-white shadow-soft transition-transform peer-checked:translate-x-5" />
                </label>
              </div>
              </div>
            )
          })}
          {schedule.length > 0 && (
            <button
              type="button"
              onClick={openAdd}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-3.5 text-sm font-bold text-brand-primary hover:bg-brand-cream/50 active:bg-brand-cream active:scale-[0.99] transition-all duration-200"
            >
              <PlusIcon className="w-4 h-4" /> 스케줄 추가
            </button>
          )}
          </div>
        </div>
        <p className="mt-2 px-1 text-[11px] text-brand-mute">항목을 누르면 수정할 수 있어요.</p>
      </section>

      {/* 추가/수정 모달 */}
      {editing && (
        <ScheduleModal initial={editing} onClose={() => setEditing(null)} onSave={saveSchedule} />
      )}

      {/* 토스트 */}
      {toast && (
        <div
          className="fixed left-1/2 bottom-24 z-50 px-5 py-3 rounded-2xl shadow-soft-lg text-sm font-bold text-white"
          style={{
            transform: `translateX(-50%) translateY(${toastOn ? '0' : '10px'})`,
            opacity: toastOn ? 1 : 0,
            transition: 'all 250ms ease',
            background: '#4B3621',
            maxWidth: '88%',
          }}
        >
          🐾 {toast}
        </div>
      )}

      {/* 오늘(일간) 급여 통계 */}
      <section className="mt-6">
        <div className="relative overflow-hidden rounded-3xl shadow-soft p-4" style={{ backgroundColor: BG_CARD }}>
          <Stitch />
          <PaperIcon shape="paw" color="rgb(var(--brand-primary-deep))" opacity={0.1} className="absolute right-3 bottom-3 w-12 h-12 rotate-6" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-base font-bold text-brand-brown">오늘 급여 통계</h3>
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-dashed border-brand-brown/20" style={{ background: withAlpha(COLORS.food, 0.15), color: COLORS.food }}>
                  사료 {todayTotal}g
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-dashed border-brand-brown/20" style={{ background: withAlpha(COLORS.water, 0.15), color: COLORS.water }}>
                  물 {todayWater}ml
                </span>
              </div>
            </div>

            <div className="relative rounded-2xl p-3.5 border border-dashed border-brand-brown/15" style={{ backgroundColor: "rgb(var(--brand-card))" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-brand-mute font-semibold">시간대별 급여 · 급수</p>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <Legend color={COLORS.food} label="사료(g)" />
                  <Legend color={COLORS.water} label="물(ml)" />
                </div>
              </div>
              <div className="flex items-end justify-between gap-2 h-44 pt-2">
            {DAILY_FOOD.map((d, i) => {
              const w = DAILY_WATER[i]
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                  <div className="flex-1 w-full flex items-end justify-center gap-1">
                    <div
                      className="w-1/3 rounded-t-md transition-all"
                      style={{ height: `${(d.g / maxFood) * 100}%`, background: COLORS.food }}
                      title={`${d.label} 사료 ${d.g}g`}
                    />
                    <div
                      className="w-1/3 rounded-t-md transition-all"
                      style={{ height: `${(w.ml / maxWater) * 100}%`, background: COLORS.water }}
                      title={`${d.label} 물 ${w.ml}ml`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-brand-mute">{d.label}</span>
                </div>
              )
            })}
          </div>
            </div>
          </div>
        </div>

        {/* 급여 통계 자세히 보기 → 일·주·월 상세 페이지 */}
        <button
          type="button"
          onClick={() => navigate('/feeding')}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-3xl border-2 border-dashed border-brand-brown/20 text-brand-brown font-bold py-3.5 shadow-soft touch-active"
          style={{ backgroundColor: BG_INFO }}
        >
          급여 통계 자세히 보기
          <ChevronRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  )
}

/* ───── 보조 컴포넌트 ───── */

function ResourceCard({ icon, label, value, unit, color, low }) {
  const accent = color === 'water' ? COLORS.water : COLORS.food
  const danger = 'rgb(var(--brand-danger))'
  return (
    <div
      className="relative overflow-hidden rounded-3xl shadow-soft px-4 py-4 flex flex-col h-full"
      style={{ backgroundColor: withAlpha(low ? danger : accent, 0.12) }}
    >
      <Stitch className="border-brand-brown/15" />
      <div className="relative z-10 flex flex-col h-full">
        {/* 라벨 + 상태 배지 */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center border border-dashed border-brand-brown/20"
              style={{ background: withAlpha(low ? danger : accent, 0.2), color: low ? danger : accent }}
            >
              {icon}
            </span>
            <p className="text-xs font-bold text-brand-brown/70 truncate">{label}</p>
          </div>
          {low ? (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-dashed border-white/40 text-white animate-pulse" style={{ background: danger }}>
              <AlertTriangle className="w-3 h-3 shrink-0" /> 보충 필요
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-dashed border-brand-success/40 bg-brand-success/20 text-[rgb(var(--brand-success-ink))]">
              <Check className="w-3 h-3 shrink-0" /> 충분
            </span>
          )}
        </div>

        {/* 잔여 수치 */}
        <p className="font-display text-[34px] font-extrabold leading-none" style={{ color: low ? danger : COLORS.brown }}>
          {value}
          <span className="text-lg ml-0.5 font-bold" style={{ color: low ? danger : COLORS.mute }}>{unit}</span>
        </p>

        {/* 게이지 (스티치 트랙) */}
        <div className="mt-auto pt-4">
          <div className="relative h-3 rounded-full overflow-hidden border border-dashed border-brand-brown/15" style={{ background: BG_INFO }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: low ? danger : accent }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ManualCard({ kind, title, unitLabel, amount, min, max, step, onChange, onSubmit, busy, disabled = false, button, icon }) {
  const isWater = kind === 'water'
  const accent = isWater ? COLORS.water : COLORS.food
  const ratio = (amount - min) / (max - min)
  return (
    <div className="relative overflow-hidden rounded-3xl shadow-soft mt-4 px-5 py-5" style={{ backgroundColor: BG_CARD }}>
      <Stitch />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center border border-dashed border-brand-brown/20"
              style={{ background: withAlpha(accent, 0.15), color: accent }}
            >
              {icon}
            </span>
            <div>
              <p className="text-xs text-brand-mute font-semibold">{title}</p>
              <p className="font-display text-base font-bold text-brand-brown">1회 제공량</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-sm font-extrabold border border-dashed border-brand-brown/20" style={{ background: withAlpha(accent, 0.15), color: accent }}>
            {amount}{unitLabel}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onChange(Math.max(min, amount - step))}
            className="w-11 h-11 shrink-0 rounded-full text-white shadow-soft touch-active flex items-center justify-center border border-dashed border-white/30"
            style={{ background: accent }}
            aria-label="감소"
          >
            <Minus className="w-5 h-5" />
          </button>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={amount}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={`${title} 제공량`}
            className="felt-range flex-1 cursor-pointer"
            style={{
              color: accent,
              background: `linear-gradient(to right, ${accent} 0%, ${accent} ${ratio * 100}%, rgb(var(--brand-line)) ${ratio * 100}%, rgb(var(--brand-line)) 100%)`,
            }}
          />
          <button
            onClick={() => onChange(Math.min(max, amount + step))}
            className="w-11 h-11 shrink-0 rounded-full text-white shadow-soft touch-active flex items-center justify-center border border-dashed border-white/30"
            style={{ background: accent }}
            aria-label="증가"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || disabled}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl text-white font-bold py-3.5 shadow-soft border border-dashed border-white/30 transition-colors disabled:opacity-60"
          style={{ background: accent }}
        >
          <Play className="w-4 h-4" />
          {button}
        </button>
      </div>
    </div>
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

/* 스케줄 추가/수정 — 풀스크린 페이지(아래에서 위로 꽉 차게 슬라이딩) */
/* 펠트 탄색 라벨 칩 (종류·시간·급여량) */
function FeltLabel({ children, icon, className = '' }) {
  return (
    <span
      className={`mt-4 inline-flex items-center gap-1 rounded-lg border border-dashed border-brand-brown/25 px-2.5 py-1 text-xs font-extrabold text-brand-brown ${className}`}
      style={{ backgroundColor: BG_INFO }}
    >
      {icon}
      {children}
    </span>
  )
}

function ScheduleModal({ initial, onClose, onSave }) {
  const isEdit = initial.id != null
  const [time, setTime] = useState(initial.time)
  const [type, setType] = useState(initial.type)
  // 기존에 300 등으로 저장된 스케줄을 편집해도 슬라이더가 어긋나지 않게 5~50 으로 clamp
  const [amount, setAmount] = useState(() => Math.min(Math.max(Number(initial.amount) || 5, 5), 50))
  const [show, setShow] = useState(false) // 슬라이드 인/아웃 제어

  // 마운트 직후 풀스크린으로 슬라이드 업
  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // 아래로 내려간 뒤 실제 닫기/저장 (애니메이션 후 처리)
  const dismiss = (after) => {
    setShow(false)
    setTimeout(after, 280)
  }

  const isFood = type === 'food'
  const unit = isFood ? 'g' : 'ml'
  const step = 5
  const min = 5
  const max = 50 // 수동 배식/급수 슬라이더와 동일한 1회 제공량 상한
  const accent = isFood ? COLORS.food : COLORS.water
  const ratio = (Number(amount) - min) / (max - min)

  const submit = (e) => {
    e.preventDefault()
    const amt = Number(amount)
    if (!time || !amt || amt <= 0) return
    dismiss(() => onSave({ id: initial.id, time, type, amount: amt }))
  }

  const segBase = 'inline-flex items-center justify-center gap-1.5 rounded-2xl py-3 text-base font-extrabold border-2 border-dashed transition-colors touch-active'
  const segOn = (c) => ({ background: c, color: '#fff', borderColor: 'rgba(255,255,255,0.45)' })
  const segOff = { background: BG_INFO, color: COLORS.brown, borderColor: 'rgb(var(--brand-brown) / 0.2)' }
  const circleBtn = 'w-10 h-10 rounded-full border-2 border-dashed border-brand-brown/20 shadow-soft flex items-center justify-center shrink-0 text-brand-brown touch-active'

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:pb-6" onClick={() => dismiss(onClose)}>
      {/* 딤 + 블러 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: show ? 1 : 0 }}
      />

      {/* 바텀 시트 — 하단에 가로로 꽉 차게 붙어 아래에서 위로 슬라이드 업 */}
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[480px] max-h-[90dvh] overflow-y-auto rounded-t-[28px] sm:rounded-b-[28px] px-6 pt-3 shadow-soft-lg transition-transform duration-300 ease-out"
        style={{
          backgroundColor: BG_CARD,
          transform: show ? 'translateY(0)' : 'translateY(100%)',
          paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
        }}
      >
        <Stitch className="!inset-[8px] !rounded-[22px]" />
        <div className="relative">
          {/* 잡이 핸들 */}
          <div className="mx-auto w-10 h-1.5 rounded-full bg-brand-line mb-2" />

          {/* 제목 + 닫기 */}
          <div className="relative flex items-center justify-center">
            <h3 className="font-display text-xl font-extrabold text-brand-brown">{isEdit ? '스케줄 수정' : '스케줄 추가'}</h3>
            <button type="button" onClick={() => dismiss(onClose)} aria-label="닫기" className="absolute right-0 text-brand-mute touch-active"><X className="w-5 h-5" /></button>
          </div>

          {/* 종류 */}
          <div><FeltLabel className="!mt-3">종류</FeltLabel></div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setType('food')} className={segBase} style={isFood ? segOn(COLORS.food) : segOff}>
              <UtensilsCrossed className="w-5 h-5" /> 사료
            </button>
            <button type="button" onClick={() => setType('water')} className={segBase} style={!isFood ? segOn(COLORS.water) : segOff}>
              <Droplets className="w-5 h-5" /> 물
            </button>
          </div>

          {/* 시간 (시/분 휠) */}
          <div><FeltLabel className="!mt-3" icon={<Clock className="w-3.5 h-3.5" />}>시간</FeltLabel></div>
          <div className="mt-2 rounded-2xl p-1.5 border-2 border-dashed border-brand-brown/15" style={{ background: BG_INFO }}>
            <TimeWheel value={time} onChange={setTime} visibleRows={3} />
          </div>

          {/* 급여량/급수량 (슬라이드 막대) */}
          <div className="mt-3 flex items-center justify-between">
            <FeltLabel className="!mt-0">{isFood ? '급여량' : '급수량'}</FeltLabel>
            <span className="px-3 py-1 rounded-full text-sm font-extrabold text-white border border-dashed border-white/40" style={{ background: accent }}>
              {amount}{unit}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-3">
            <button type="button" onClick={() => setAmount((a) => Math.max(min, Number(a) - step))} className={circleBtn} style={{ background: BG_INFO }}><Minus className="w-5 h-5" /></button>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              aria-label={isFood ? '급여량' : '급수량'}
              className="felt-range flex-1 cursor-pointer"
              style={{
                color: accent,
                background: `linear-gradient(to right, ${accent} 0%, ${accent} ${ratio * 100}%, rgb(var(--brand-line)) ${ratio * 100}%, rgb(var(--brand-line)) 100%)`,
              }}
            />
            <button type="button" onClick={() => setAmount((a) => Math.min(max, Number(a) + step))} className={circleBtn} style={{ background: BG_INFO }}><Plus className="w-5 h-5" /></button>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-dashed border-brand-brown/15 text-brand-mute" style={{ background: BG_INFO }}>{min}{unit}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-dashed border-brand-brown/15 text-brand-mute" style={{ background: BG_INFO }}>{max}{unit}</span>
          </div>

          {/* 취소 / 추가 */}
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => dismiss(onClose)} className="flex-1 rounded-2xl py-3 text-base font-extrabold border-2 border-dashed border-brand-brown/20 text-brand-brown touch-active" style={{ background: BG_INFO }}>취소</button>
            <button type="submit" className="flex-1 rounded-2xl py-3 text-base font-extrabold text-white border-2 border-dashed border-white/40 shadow-soft touch-active" style={{ background: accent }}>{isEdit ? '저장' : '추가'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default Dispenser
