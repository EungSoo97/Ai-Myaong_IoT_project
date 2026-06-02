import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Video, Moon, UserX, UtensilsCrossed, Mic, Activity as ActivityIcon,
} from 'lucide-react'
import { Card, CreamCard, Badge } from '../components/ui'

/* ───── Mock 활동 데이터 ───── */
// 로봇 비전 감지 로그
const DETECTIONS = [
  { id: 'd1', cat: 'vision', type: '움직임 감지', time: '14:22', icon: Video, desc: '거실 카메라' },
  { id: 'd2', cat: 'vision', type: '음성 호출', time: '11:45', icon: Mic, desc: '집사 호출' },
  { id: 'd3', cat: 'vision', type: '외부인 감지', time: '09:11', icon: UserX, desc: '현관 카메라' },
  { id: 'd4', cat: 'vision', type: '수면 감지', time: '03:20', icon: Moon, desc: '안방' },
]
// 디스펜서 급여 기록
const FEEDINGS = [
  { id: 'f1', cat: 'feed', type: '자동 배식', time: '08:00', icon: UtensilsCrossed, amount: 15 },
  { id: 'f2', cat: 'feed', type: '자동 배식', time: '13:00', icon: UtensilsCrossed, amount: 10 },
  { id: 'f3', cat: 'feed', type: '자동 배식', time: '19:00', icon: UtensilsCrossed, amount: 15 },
]

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'vision', label: '감지' },
  { id: 'feed', label: '급여' },
]

export function Activity() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  const all = useMemo(
    () => [...DETECTIONS, ...FEEDINGS].sort((a, b) => b.time.localeCompare(a.time)),
    [],
  )
  const list = filter === 'all' ? all : all.filter((x) => x.cat === filter)

  const detectCount = DETECTIONS.length
  const feedTotal = FEEDINGS.reduce((s, f) => s + f.amount, 0)

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
          <h1 className="font-display text-2xl font-bold text-brand-brown leading-tight">활동 전체 보기</h1>
          <p className="text-sm text-brand-mute truncate">오늘의 감지 · 급여 기록</p>
        </div>
      </header>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="px-4 py-4">
          <div className="flex items-center gap-1.5 text-brand-mute mb-1">
            <ActivityIcon className="w-4 h-4 text-brand-primary" />
            <p className="text-[11px] font-semibold">오늘 감지</p>
          </div>
          <p className="font-display text-2xl font-bold text-brand-brown leading-none">{detectCount}건</p>
        </Card>
        <Card className="px-4 py-4">
          <div className="flex items-center gap-1.5 text-brand-mute mb-1">
            <UtensilsCrossed className="w-4 h-4 text-brand-primary" />
            <p className="text-[11px] font-semibold">오늘 급여</p>
          </div>
          <p className="font-display text-2xl font-bold text-brand-brown leading-none">{feedTotal}g</p>
        </Card>
      </div>

      {/* 필터 탭 */}
      <div className="mt-4 flex justify-center">
        <div className="inline-flex bg-brand-cream rounded-full p-1 shadow-soft-inset">
          {FILTERS.map((f) => {
            const active = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-5 py-1.5 text-sm font-bold rounded-full transition-colors ${active ? 'bg-brand-primary text-white shadow-soft' : 'text-brand-mute'}`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 통합 타임라인 */}
      <section className="mt-4">
        <CreamCard className="divide-y divide-brand-line">
          {list.map((e) => {
            const Icon = e.icon
            const isFeed = e.cat === 'feed'
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3.5">
                <span className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isFeed ? 'bg-brand-primary/15 text-brand-primary' : 'bg-brand-brown/10 text-brand-brown'}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-brand-brown truncate">{e.type}</p>
                  <p className="text-xs text-brand-mute truncate">{isFeed ? `사료 ${e.amount}g` : e.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={isFeed ? 'primary' : 'brown'}>{isFeed ? '급여' : '감지'}</Badge>
                  <span className="text-[11px] text-brand-mute">{e.time}</span>
                </div>
              </div>
            )
          })}
          {list.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-brand-mute">기록이 없어요.</p>
          )}
        </CreamCard>
      </section>
    </div>
  )
}

export default Activity
