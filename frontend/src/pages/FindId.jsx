import { useState } from 'react'
import { User, ChevronLeft, Search, LogIn, Eye, EyeOff, PawPrint } from '../components/icons'
import { EmailVerifyField } from '../components/EmailVerifyField'

// 카드 배경: 흰색 80% + 크림 20% (대시보드·마이페이지와 동일) / 정보·칩: 따뜻한 탄
export const BG_CARD = 'color-mix(in srgb, rgb(var(--brand-card)) 80%, rgb(var(--brand-cream)) 20%)'
export const BG_INFO = 'color-mix(in srgb, rgb(var(--brand-cream)) 78%, rgb(var(--brand-mute)) 22%)'

/* 안쪽 점선 바느질 테두리 (펠트 느낌) */
export function Stitch({ className = '' }) {
  return (
    <span className={`pointer-events-none absolute inset-[6px] rounded-[18px] border border-dashed border-brand-brown/15 ${className}`} />
  )
}

/* 종이질감 장식 아이콘 — public/icons/*.svg 실루엣을 마스크로, paper.jpg 텍스처를 그 안에만.
 * 아이콘 출처: Phosphor Icons (MIT) — public/icons/{paw,bone,heart}.svg */
export function PaperIcon({ shape, color, className = '', opacity = 1 }) {
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

/* 가짜 아이디 생성 — DB 없으므로 이메일 앞부분으로 흉내만 냄 */
function fullUserId(email) {
  return (email.split('@')[0] || 'myaong').replace(/[^a-zA-Z0-9]/g, '') || 'myaong'
}
function maskUserId(id) {
  const head = id.slice(0, 2)
  return `${head}${'*'.repeat(Math.max(id.length - 2, 3))}`
}

/**
 * 아이디 찾기 (프론트 전용 · 목 동작).
 * - 이메일 입력 → 가입된 아이디(마스킹) 표시
 * - 실제 조회 로직은 백엔드/DB 연동 후 구현
 */
export default function FindId({ onBackToLogin }) {
  const [email, setEmail] = useState('')
  const [verified, setVerified] = useState(false) // 이메일 인증 완료 여부
  const [result, setResult] = useState(null) // 마스킹된 아이디 or null
  const [err, setErr] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setErr('')
    if (!verified) { setErr('이메일 인증을 완료해 주세요.'); return }
    // 백엔드 없음 → 이메일로 가짜 아이디 생성
    const full = fullUserId(email)
    setResult({ full, masked: maskUserId(full) })
  }

  return (
    <div className="page-enter font-cute min-h-[100dvh] flex flex-col px-5 pt-5 pb-8 bg-brand-bg">
      <AuthHeader title="아이디 찾기" subtitle="가입한 이메일로 아이디를 찾아요" onBack={onBackToLogin} />

      {result ? (
        <ResultCard
          icon={<User className="w-7 h-7" />}
          title="이런 아이디로 가입되어 있어요"
          masked={result.masked}
          full={result.full}
          desc="눈 아이콘을 눌러 전체 아이디를 확인할 수 있어요."
          onBackToLogin={onBackToLogin}
        />
      ) : (
        <FormCard
          icon={<Search className="w-6 h-6" />}
          onSubmit={submit}
          submitIcon={<Search className="w-5 h-5" />}
          submitLabel="아이디 찾기"
        >
          <p className="text-sm text-brand-mute">
            가입 시 등록한 이메일을 인증하면 아이디를 알려드려요.
          </p>

          <EmailVerifyField
            email={email}
            onEmailChange={setEmail}
            verified={verified}
            onVerifiedChange={setVerified}
            label="이메일"
          />

          {err && <p className="mt-4 text-sm font-bold text-brand-danger">{err}</p>}
        </FormCard>
      )}

      <BackLink onBackToLogin={onBackToLogin} />
    </div>
  )
}

/* ─────────────── 공통 (FindPassword 와 동일 톤) ─────────────── */

/* 페이지 헤더 — 대시보드/마이페이지와 동일한 뒤로가기 + 제목 + 서브타이틀 */
export function AuthHeader({ title, subtitle, onBack }) {
  return (
    <header className="flex items-center gap-2.5 pt-1 pb-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="뒤로가기"
        className="w-9 h-9 -ml-1 flex items-center justify-center text-brand-brown touch-active shrink-0"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <div className="min-w-0">
        <h1 className="font-cute text-2xl font-bold text-brand-brown leading-tight inline-flex items-center gap-1.5">
          {title}
          <PawPrint className="w-5 h-5 shrink-0" />
        </h1>
        <p className="text-sm text-brand-mute truncate">{subtitle}</p>
      </div>
    </header>
  )
}

/* 펠트 폼 카드 — 상단 둥근 아이콘칩 + 종이질감 장식 + 제출 버튼 */
export function FormCard({ icon, onSubmit, submitIcon, submitLabel, children }) {
  return (
    <form
      onSubmit={onSubmit}
      className="mt-5 relative overflow-hidden rounded-3xl shadow-soft px-5 py-6"
      style={{ backgroundColor: BG_CARD }}
    >
      <Stitch />
      <PaperIcon shape="paw" color="rgb(var(--brand-primary-deep))" opacity={0.1} className="absolute -right-3 -bottom-3 w-20 h-20 rotate-6" />
      <PaperIcon shape="heart" color="rgb(var(--brand-primary))" opacity={0.5} className="absolute right-5 top-4 w-3.5 h-3.5" />
      <div className="relative z-10">
        <div
          className="mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center border border-dashed border-brand-brown/20 text-brand-primary shadow-soft-inset"
          style={{ backgroundColor: BG_INFO }}
        >
          {icon}
        </div>
        {children}
        <button
          type="submit"
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl text-white py-3.5 text-base font-bold shadow-soft border border-dashed border-white/30 bg-brand-primary transition-colors active:brightness-95"
        >
          {submitIcon} {submitLabel}
        </button>
      </div>
    </form>
  )
}

export function ResultCard({ icon, title, highlight, masked, full, desc, onBackToLogin }) {
  const [revealed, setRevealed] = useState(false)
  const revealable = masked != null && full != null

  return (
    <div className="mt-5 relative overflow-hidden rounded-3xl shadow-soft px-5 py-6 text-center" style={{ backgroundColor: BG_CARD }}>
      <Stitch />
      <PaperIcon shape="heart" color="rgb(var(--brand-primary))" opacity={0.5} className="absolute left-6 top-5 w-3.5 h-3.5" />
      <PaperIcon shape="paw" color="rgb(var(--brand-primary-deep))" opacity={0.1} className="absolute -right-3 -bottom-3 w-20 h-20 rotate-6" />
      <div className="relative z-10">
        <div
          className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center border border-dashed border-brand-brown/20 text-brand-primary shadow-soft-inset"
          style={{ backgroundColor: BG_INFO }}
        >
          {icon}
        </div>
        <h2 className="mt-4 text-lg font-bold text-brand-brown">{title}</h2>

        <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl py-4 px-4 border border-brand-brown/15" style={{ backgroundColor: BG_INFO }}>
          <span className="font-sans text-lg font-bold break-all text-brand-primary-deep">
            {revealable ? (revealed ? full : masked) : highlight}
          </span>
          {revealable && (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="shrink-0 text-brand-mute active:brightness-90"
              aria-label={revealed ? '아이디 가리기' : '아이디 보기'}
            >
              {revealed ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          )}
        </div>

        {desc && <p className="mt-3 text-sm text-brand-mute">{desc}</p>}
        <button
          type="button"
          onClick={onBackToLogin}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl text-white py-3.5 text-base font-bold shadow-soft border border-dashed border-white/30 bg-brand-primary transition-colors active:brightness-95"
        >
          <LogIn className="w-5 h-5" /> 로그인하러 가기
        </button>
      </div>
    </div>
  )
}

export function Field({ icon, label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="mt-4 block">
      <span className="text-xs font-bold text-brand-mute pl-1">{label}</span>
      <div className="mt-1.5 flex items-center gap-2.5 rounded-2xl px-4 py-3.5 border border-brand-brown/15 focus-within:border-brand-primary/50 transition-colors" style={{ backgroundColor: BG_INFO }}>
        {icon && <span className="text-brand-primary">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-sans flex-1 min-w-0 bg-transparent text-base font-semibold text-brand-brown outline-none placeholder:font-normal placeholder:text-brand-mute/60"
        />
      </div>
    </label>
  )
}

export function BackLink({ onBackToLogin }) {
  return (
    <button
      type="button"
      onClick={onBackToLogin}
      className="mt-6 inline-flex items-center justify-center gap-1 self-center text-sm font-bold text-brand-mute hover:underline"
    >
      <ChevronLeft className="w-4 h-4" /> 로그인으로 돌아가기
    </button>
  )
}
