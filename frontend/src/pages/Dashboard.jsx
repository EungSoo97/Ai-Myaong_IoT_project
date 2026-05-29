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
  ChevronRight,
} from 'lucide-react'
import { Card, CreamCard, PageHeader, Badge } from '../components/ui'
import { useAccount, petAge, speciesLabel } from '../lib/accountRepository'

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
  { id: 'feed', label: '빠른 배식', icon: UtensilsCrossed, tone: 'bg-brand-primary text-white' },
  { id: 'away', label: '외출 모드', icon: Plane, tone: 'bg-brand-cream text-brand-brown' },
  { id: 'call', label: '음성 호출', icon: PhoneCall, tone: 'bg-brand-cream text-brand-brown' },
  { id: 'cap', label: '캡처', icon: Camera, tone: 'bg-brand-cream text-brand-brown' },
]

export function Dashboard() {
  const navigate = useNavigate()
  const account = useAccount()

  // 가입 데이터 기반 값 (없으면 샘플 fallback)
  const nickname = account?.user?.nickname || '묘냥집사'
  const pets = account?.pets ?? []
  const pet = pets[0] || null
  const petName = pet?.name || '미야옹'
  const petBreed = pet?.breed || '코숏'
  const petSpecies = pet ? speciesLabel(pet.species) : '고양이'
  const age = pet ? petAge(pet.birthDate) : 3
  const ageBreed = [age != null ? `${age}살` : null, petBreed].filter(Boolean).join(' · ')

  return (
    <div className="px-5 pb-6">
      <PageHeader
        title={`안녕, ${nickname} 🐾`}
        subtitle="오늘도 우리 아이를 살펴봐요"
        right={
          <button
            type="button"
            onClick={() => navigate('/wifi-setup')}
            className="w-11 h-11 rounded-2xl bg-brand-card shadow-soft flex items-center justify-center text-brand-brown touch-active"
            aria-label="네트워크 설정"
          >
            <Wifi className="w-5 h-5 text-brand-success" />
          </button>
        }
      />

      {/* 1) 펫 프로필 (가입 데이터 기반) */}
      <Card className="paw-watermark px-5 py-5 flex items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-brand-cream flex items-center justify-center shadow-soft-inset overflow-hidden">
            {pet?.photo
              ? <img src={pet.photo} alt={petName} className="w-full h-full object-cover" />
              : <PawPrint className="w-9 h-9 text-brand-primary" />}
          </div>
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-success border-2 border-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-brand-mute font-semibold">
            우리집 {petSpecies}{pets.length > 1 ? ` · 외 ${pets.length - 1}마리` : ''}
          </p>
          <h2 className="font-display text-2xl font-bold text-brand-brown leading-tight">{petName}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ageBreed && <Badge tone="brown">{ageBreed}</Badge>}
            <Badge tone="success">건강 양호</Badge>
          </div>
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

      {/* 4) 숏컷 (Grid) */}
      <section className="mt-5">
        <h3 className="font-display text-base font-bold text-brand-brown px-1 mb-3">빠른 작업</h3>
        <div className="grid grid-cols-4 gap-3">
          {SHORTCUTS.map(({ id, label, icon: Icon, tone }) => (
            <button
              key={id}
              type="button"
              className="flex flex-col items-center gap-2 touch-active"
            >
              <span className={`w-14 h-14 rounded-3xl flex items-center justify-center shadow-soft ${tone}`}>
                <Icon className="w-6 h-6" />
              </span>
              <span className="text-[11px] font-semibold text-brand-brown text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 3) 최근 활동 */}
      <section className="mt-6">
        <div className="flex items-center justify-between px-1 mb-3">
          <h3 className="font-display text-base font-bold text-brand-brown">최근 활동</h3>
          <button className="text-xs text-brand-mute font-semibold flex items-center">
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
    </div>
  )
}

export default Dashboard
