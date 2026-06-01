import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wifi,
  Play,
  PhoneCall,
  Camera,
  PawPrint,
  AlertTriangle,
  UtensilsCrossed,
  UserX,
  Plane,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'
import { Card, CreamCard, PageHeader, Badge } from '../components/ui'
import { useAccount, petAgeLabel, speciesLabel, addPet } from '../lib/accountRepository'
import { AddPetModal } from '../components/AddPetModal'

const RECENT = [
  { id: 1, icon: UtensilsCrossed, tone: 'primary', title: '자동 배식 완료', desc: '15g · 정기 스케줄', time: '방금 전' },
  { id: 2, icon: AlertTriangle, tone: 'warn', title: '이상 행동 감지', desc: '거실 카메라', time: '12분 전' },
  { id: 3, icon: UserX, tone: 'danger', title: '외부인 감지', desc: '현관 카메라', time: '1시간 전' },
  { id: 4, icon: PawPrint, tone: 'brown', title: '발자국 활동 기록', desc: '12회', time: '오늘' },
]

const TONE = {
  primary: 'bg-brand-primary/15 text-brand-primary',
  warn: 'bg-brand-warning/20 text-[#A06B1A]',
  danger: 'bg-brand-danger/15 text-brand-danger',
  brown: 'bg-brand-brown/10 text-brand-brown',
}

const SHORTCUTS = [
  { id: 'feed', label: '빠른 배식', icon: UtensilsCrossed },
  { id: 'away', label: '외출 모드', icon: Plane },
  { id: 'call', label: '음성 호출', icon: PhoneCall },
  { id: 'cap', label: '캡처', icon: Camera },
]

/* 펫 1마리 표시용 값 (null이면 샘플 fallback) */
function petView(p) {
  const name = p?.name || '미야옹'
  const species = p ? speciesLabel(p.species) : '고양이'
  const breed = p?.breed || '코숏'
  const ageLabel = p ? petAgeLabel(p.birthDate) : '3살'
  const ageBreed = [ageLabel, breed].filter(Boolean).join(' · ')
  return { name, species, ageBreed, photo: p?.photo }
}

export function Dashboard() {
  const navigate = useNavigate()
  const account = useAccount()
  const [petIdx, setPetIdx] = useState(0)
  const [showAddPet, setShowAddPet] = useState(false)

  // 가입 데이터 기반 값 (없으면 샘플 fallback)
  const nickname = account?.user?.nickname || '냥이집사'
  const pets = account?.pets ?? []
  const slides = pets.length ? pets : [null] // 없으면 샘플 슬라이드 1장
  const idx = Math.min(petIdx, slides.length - 1)

  const goPrev = () => setPetIdx((idx - 1 + slides.length) % slides.length)
  const goNext = () => setPetIdx((idx + 1) % slides.length)

  const handleAddPet = (newPet) => {
    addPet(newPet)
    setPetIdx(pets.length) // 방금 추가한 펫으로 이동
    setShowAddPet(false)
  }

  // 빠른 작업: 외출 모드는 토글, 나머지는 클릭 시 잠깐 강조
  const [awayMode, setAwayMode] = useState(false)
  const [pressedId, setPressedId] = useState(null)
  const pressTimer = useRef(null)
  const onShortcut = (id) => {
    if (id === 'away') { setAwayMode((v) => !v); return }
    setPressedId(id)
    clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => setPressedId(null), 150)
  }

  return (
    <div className="px-5 pb-6">
      <PageHeader
        title={`안녕하세요, ${nickname}님! 🐾`}
        subtitle="오늘도 우리 아이를 살펴봐요"
        right={
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="w-11 h-11 rounded-2xl bg-brand-card shadow-soft flex items-center justify-center text-brand-brown touch-active"
            aria-label="설정"
          >
            <Wifi className="w-5 h-5 text-brand-success" />
          </button>
        }
      />

      {/* 1) 펫 프로필 캐러셀 (카드가 좌우로 슬라이드) */}
      <Card className="paw-watermark px-3 py-5">
        <div className="flex items-center gap-2">
          {/* 이전 화살표 */}
          {slides.length > 1 && (
            <button
              type="button"
              onClick={goPrev}
              aria-label="이전 반려동물"
              className="w-8 h-8 rounded-full bg-brand-cream text-brand-brown flex items-center justify-center shadow-soft active:bg-brand-primary active:text-white transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* 슬라이드 뷰포트 */}
          <div className="flex-1 overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${idx * 100}%)` }}
            >
              {slides.map((p, i) => {
                const v = petView(p)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => p && navigate(`/pet/${i}`)}
                    className="w-full shrink-0 flex items-center gap-4 px-1 text-left touch-active"
                  >
                    <div className="relative shrink-0">
                      <div className="w-20 h-20 rounded-full bg-brand-cream flex items-center justify-center shadow-soft-inset overflow-hidden">
                        {v.photo
                          ? <img src={v.photo} alt={v.name} className="w-full h-full object-cover" />
                          : <PawPrint className="w-9 h-9 text-brand-primary" />}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-success border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-brand-mute font-semibold">
                        우리집 {v.species}{slides.length > 1 ? ` · ${i + 1}/${slides.length}` : ''}
                      </p>
                      <h2 className="font-display text-2xl font-bold text-brand-brown leading-tight truncate">{v.name}</h2>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {v.ageBreed && <Badge tone="brown">{v.ageBreed}</Badge>}
                        <Badge tone="success">건강 양호</Badge>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 다음 화살표 */}
          {slides.length > 1 && (
            <button
              type="button"
              onClick={goNext}
              aria-label="다음 반려동물"
              className="w-8 h-8 rounded-full bg-brand-cream text-brand-brown flex items-center justify-center shadow-soft active:bg-brand-primary active:text-white transition-colors shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 인디케이터(점) + 펫 추가 */}
        <div className="mt-4 flex items-center justify-center gap-3">
          {slides.length > 1 && (
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPetIdx(i)}
                  aria-label={`${i + 1}번째 반려동물`}
                  className="h-2 rounded-full transition-all"
                  style={{ width: i === idx ? 18 : 8, background: i === idx ? '#F08D86' : '#EFE3D2' }}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowAddPet(true)}
            className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary touch-active"
          >
            <Plus className="w-3.5 h-3.5" /> 펫 추가
          </button>
        </div>
      </Card>

      {/* 2) 캠 미리보기 (탭하면 /vision 이동) */}
      <button
        type="button"
        onClick={() => navigate('/vision')}
        className="mt-4 w-full text-left touch-active"
      >
        <Card className="overflow-hidden">
          <div className="relative aspect-video bg-gradient-to-br from-brand-brown to-brand-brown-soft">
            <div className="absolute inset-0 flex items-center justify-center text-white/85">
              <div className="text-center">
                <Camera className="w-10 h-10 mx-auto mb-2 opacity-90" />
                <p className="text-sm font-semibold">실시간 캠 보기</p>
                <p className="text-xs opacity-75">탭하여 로봇 비전으로 이동</p>
              </div>
            </div>
            <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 text-white text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              LIVE
            </span>
            <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/85 text-brand-brown text-[11px] font-bold">
              HD
            </span>
          </div>
        </Card>
      </button>

      {/* 급여 통계 바로가기 */}
      <button
        type="button"
        onClick={() => navigate('/feeding')}
        className="mt-4 w-full text-left touch-active"
      >
        <Card className="px-5 py-4 flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-brand-primary/15 text-brand-primary flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-brand-brown">급여 통계 보기</p>
            <p className="text-xs text-brand-mute">일·주·월 급여량과 자동 스케줄 관리</p>
          </div>
          <ChevronRight className="w-5 h-5 text-brand-mute shrink-0" />
        </Card>
      </button>

      {/* 4) 숏컷 (Grid) */}
      <section className="mt-5">
        <h3 className="font-display text-base font-bold text-brand-brown px-1 mb-3">빠른 작업</h3>
        <div className="grid grid-cols-4 gap-3">
          {SHORTCUTS.map(({ id, label, icon: Icon }) => {
            const active = id === 'away' ? awayMode : pressedId === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onShortcut(id)}
                className="flex flex-col items-center gap-2 touch-active"
              >
                <span className={`w-14 h-14 rounded-3xl flex items-center justify-center shadow-soft transition-colors ${active ? 'bg-brand-primary text-white' : 'bg-brand-cream text-brand-brown'}`}>
                  <Icon className="w-6 h-6" />
                </span>
                <span className={`text-[11px] font-semibold text-center leading-tight ${active ? 'text-brand-primary' : 'text-brand-brown'}`}>
                  {id === 'away' ? (awayMode ? '외출모드 ON' : '외출모드 OFF') : label}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* 3) 최근 활동 */}
      <section className="mt-6">
        <div className="flex items-center justify-between px-1 mb-3">
          <h3 className="font-display text-base font-bold text-brand-brown">최근 활동</h3>
          <button
            type="button"
            onClick={() => navigate('/activity')}
            className="text-xs text-brand-mute font-semibold flex items-center touch-active"
          >
            전체보기 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <CreamCard className="divide-y divide-brand-line">
          {RECENT.map(({ id, icon: Icon, tone, title, desc, time }) => (
            <div key={id} className="flex items-center gap-3 px-4 py-3.5">
              <span className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${TONE[tone]}`}>
                <Icon className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-brand-brown truncate">{title}</p>
                <p className="text-xs text-brand-mute truncate">{desc}</p>
              </div>
              <span className="text-[11px] text-brand-mute shrink-0">{time}</span>
            </div>
          ))}
        </CreamCard>
      </section>

      {showAddPet && (
        <AddPetModal
          onClose={() => setShowAddPet(false)}
          onSave={handleAddPet}
        />
      )}

    </div>
  )
}

export default Dashboard
