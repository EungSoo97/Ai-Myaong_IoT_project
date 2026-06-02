import { useState } from 'react'
import {
  PawPrint,
  Pencil,
  ChevronRight,
  LogOut,
  UserMinus,
  Link as LinkIcon,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { Card, CreamCard, PageHeader, Badge } from '../components/ui'
import { useAccount, petAge, speciesLabel, clearAccount } from '../lib/accountRepository'

function handleLogout() {
  try { sessionStorage.removeItem('aimyaong:auth') } catch { /* ignore */ }
  window.location.href = '/splash'
}

function handleWithdraw() {
  // 회원 탈퇴 (현재: 로컬 데이터 삭제 · 내일 백엔드 붙으면 DELETE /api/me 로 교체)
  try { sessionStorage.removeItem('aimyaong:auth') } catch { /* ignore */ }
  clearAccount()
  window.location.href = '/splash'
}

const FALLBACK_PET = {
  name: '미야옹',
  breed: '코리안 숏헤어',
  birthDate: '2023-04-12',
  weightKg: 4.2,
}

function fmtDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '-' : d.toISOString().slice(0, 10)
}

export function MyPage() {
  const [showWithdraw, setShowWithdraw] = useState(false)
  const account = useAccount()
  const user = account?.user || null
  const pet = account?.pets?.[0] || FALLBACK_PET

  const nickname = user?.nickname || '묘냥집사'
  const email = user?.email || 'nyce18711@gmail.com'
  const initial = nickname.trim().charAt(0) || '집'

  const age = petAge(pet.birthDate)
  const registeredAt = fmtDate(account?.createdAt) === '-' ? '2024-09-01' : fmtDate(account.createdAt)

  return (
    <div className="px-5 pb-6">
      <PageHeader title="마이페이지" subtitle="펫 프로필과 계정을 관리해요" />

      {/* 유저 카드 */}
      <Card className="px-5 py-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-brand-primary/15 text-brand-primary flex items-center justify-center shadow-soft-inset">
          <span className="font-display text-2xl font-bold">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg font-bold text-brand-brown">{nickname}</p>
          <p className="text-xs text-brand-mute truncate">{email}</p>
        </div>
        <button className="px-3 py-1.5 rounded-2xl bg-brand-cream text-brand-brown text-xs font-bold touch-active shadow-soft">
          편집
        </button>
      </Card>

      {/* 펫 프로필 */}
      <section className="mt-5">
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="font-display text-base font-bold text-brand-brown">펫 프로필</h3>
          <button className="flex items-center gap-1 text-xs font-bold text-brand-primary touch-active">
            <Pencil className="w-3.5 h-3.5" /> 수정
          </button>
        </div>

        <Card className="paw-watermark px-5 py-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-brand-cream flex items-center justify-center shadow-soft-inset overflow-hidden">
              {pet.photo
                ? <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
                : <PawPrint className="w-10 h-10 text-brand-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-2xl font-bold text-brand-brown leading-tight">{pet.name}</p>
              <p className="text-xs text-brand-mute">{pet.breed || speciesLabel(pet.species)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {age != null && <Badge tone="brown">{age}살</Badge>}
                {pet.weightKg && <Badge tone="primary">{pet.weightKg}kg</Badge>}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-brand-line grid grid-cols-2 gap-3">
            <InfoCell label="생일" value={pet.birthDate || '-'} icon={<Calendar className="w-4 h-4" />} />
            <InfoCell label="등록일" value={registeredAt} />
          </div>
        </Card>
      </section>

      {/* 연동/구독 */}
      <section className="mt-6">
        <h3 className="font-display text-base font-bold text-brand-brown px-1 mb-2">계정 연동</h3>
        <CreamCard className="divide-y divide-brand-line">
          <LinkRow
            icon={<LinkIcon className="w-5 h-5 text-brand-brown" />}
            title="카카오 계정 연결"
            right={<Badge tone="success">연결됨</Badge>}
          />
          <LinkRow
            icon={<LinkIcon className="w-5 h-5 text-brand-mute" />}
            title="Google 계정 연결"
            right={<span className="text-xs font-bold text-brand-primary">연결하기</span>}
          />
        </CreamCard>
      </section>

      {/* 계정 관리 */}
      <section className="mt-6">
        <h3 className="font-display text-base font-bold text-brand-brown px-1 mb-2">계정 관리</h3>
        <Card className="divide-y divide-brand-line">
          <ActionRow icon={<LogOut className="w-5 h-5 text-brand-brown" />} title="로그아웃" onClick={handleLogout} />
          <ActionRow
            icon={<UserMinus className="w-5 h-5 text-brand-danger" />}
            title="회원 탈퇴"
            danger
            onClick={() => setShowWithdraw(true)}
          />
        </Card>
      </section>

      <p className="mt-6 text-center text-[11px] text-brand-mute">
        AiMyaong v1.0.0 · 사료를 전하고 싶다던가 🐾
      </p>

      {showWithdraw && (
        <WithdrawModal
          onCancel={() => setShowWithdraw(false)}
          onConfirm={handleWithdraw}
        />
      )}
    </div>
  )
}

function WithdrawModal({ onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: 'rgba(45,37,32,0.45)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[360px] rounded-3xl bg-brand-card p-6 shadow-soft-lg text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-14 h-14 rounded-full bg-brand-danger/15 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-brand-danger" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-brand-brown">정말 탈퇴하시겠어요?</h3>
        <p className="mt-2 text-sm text-brand-mute leading-relaxed">
          탈퇴하면 계정과 등록한 모든 반려동물 정보가 삭제되며,
          이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl py-3.5 text-base font-bold bg-brand-cream text-brand-brown touch-active"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-2xl py-3.5 text-base font-bold text-white touch-active"
            style={{ background: '#E26D5C' }}
          >
            탈퇴하기
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoCell({ label, value, icon }) {
  return (
    <div className="rounded-2xl bg-brand-cream px-3 py-2.5">
      <p className="text-[11px] text-brand-mute font-semibold flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-sm font-bold text-brand-brown mt-0.5">{value}</p>
    </div>
  )
}

function LinkRow({ icon, title, right }) {
  return (
    <button className="w-full flex items-center gap-3 px-4 py-3.5 touch-active text-left">
      <span className="w-10 h-10 rounded-2xl bg-brand-card flex items-center justify-center shrink-0 shadow-soft">
        {icon}
      </span>
      <p className="flex-1 text-sm font-bold text-brand-brown">{title}</p>
      {right || <ChevronRight className="w-4 h-4 text-brand-mute" />}
    </button>
  )
}

function ActionRow({ icon, title, danger, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 touch-active text-left">
      <span className="w-10 h-10 rounded-2xl bg-brand-cream flex items-center justify-center shrink-0">
        {icon}
      </span>
      <p className={`flex-1 text-sm font-bold ${danger ? 'text-brand-danger' : 'text-brand-brown'}`}>
        {title}
      </p>
      <ChevronRight className="w-4 h-4 text-brand-mute" />
    </button>
  )
}

export default MyPage
