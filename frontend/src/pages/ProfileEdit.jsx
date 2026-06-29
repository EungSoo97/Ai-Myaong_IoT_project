import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, ChevronLeft, ChevronRight, User, Mail, Smile, Lock, Plus } from '../components/icons'
import { useAccount, updateUser } from '../lib/accountRepository'
import { api } from '../api/api'

// 카드 배경: 흰색 80% + 크림 20% (대시보드·마이페이지와 동일) / 정보·칩: 따뜻한 탄
const BG_CARD = 'color-mix(in srgb, rgb(var(--brand-card)) 80%, rgb(var(--brand-cream)) 20%)'
const BG_INFO = 'color-mix(in srgb, rgb(var(--brand-cream)) 78%, rgb(var(--brand-mute)) 22%)'

/* 안쪽 점선 바느질 테두리 (펠트 느낌) */
function Stitch({ className = '' }) {
  return (
    <span className={`pointer-events-none absolute inset-[6px] rounded-[18px] border border-dashed border-brand-brown/15 ${className}`} />
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

export function ProfileEdit() {
  const navigate = useNavigate()
  const account = useAccount()
  const user = account?.user || {}

  const [nickname, setNickname] = useState(user.nickname || '')
  const [email, setEmail] = useState(user.email || '')
  // 구글 기본 프로필(googleusercontent)은 표시하지 않고 기본 이미지로 (마이페이지와 동일)
  const initialPhoto = user.photo || user.profile_photo_path || ''
  const [photo, setPhoto] = useState(initialPhoto.includes('googleusercontent') ? '' : initialPhoto)
  const [photoFile, setPhotoFile] = useState(null)
  const [err, setErr] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const onPick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setPhoto(reader.result)
      setPhotoFile(file)
    }
    reader.readAsDataURL(file)
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    const nn = nickname.trim()
    const em = email.trim()
    if (!nn) { setErr('닉네임을 입력해 주세요.'); return }
    if (!em.includes('@')) { setErr('올바른 이메일을 입력해 주세요.'); return }

    setBusy(true)
    try {
      // 1) DB 반영 (백엔드 PATCH /me 준비되면 실제 컬럼 변경)
      let updated = await api.updateMe({ nickname: nn, email: em })
      if (photoFile) {
        updated = await api.uploadUserPhoto(photoFile)
      }
      const data =
        updated && (updated.nickname || updated.email) ?
          updated
        : { nickname: nn, email: em, profile_photo_path: photo }
      const photoUrl = data.profile_photo_path || photo
      // 2) 토큰 유저(sessionStorage) 동기화
      try {
        const su = JSON.parse(sessionStorage.getItem('aimyaong:user') || '{}')
        sessionStorage.setItem('aimyaong:user', JSON.stringify({ ...su, ...data, photo: photoUrl }))
      } catch { /* ignore */ }
      // 3) 화면용 로컬(useAccount) 동기화
      updateUser({ nickname: data.nickname, email: data.email, photo: photoUrl, profile_photo_path: photoUrl })
    } catch {
      // 백엔드 미구현/오류 → 로컬만이라도 반영 (기존 동작 유지)
      updateUser({ nickname: nn, email: em, photo })
    } finally {
      setBusy(false)
      setSaved(true)
      setTimeout(() => navigate(-1), 600)
    }
  }

  return (
    <div className="px-5 pb-6">
      {/* 헤더 + 뒤로가기 */}
      <header className="flex items-center gap-2.5 pt-5 pb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로가기"
          className="w-9 h-9 -ml-1 flex items-center justify-center text-brand-brown touch-active shrink-0"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="min-w-0">
          <h1 className="font-cute text-2xl font-bold text-brand-brown leading-tight">
            회원 정보 수정
          </h1>
          <p className="text-sm text-brand-mute truncate">프로필을 관리해요</p>
        </div>
      </header>

      <form onSubmit={submit}>
        <div className="relative overflow-hidden rounded-3xl shadow-soft px-5 py-5" style={{ backgroundColor: BG_CARD }}>
          <Stitch />
          <PaperIcon shape="paw" color="rgb(var(--brand-primary-deep))" opacity={0.1} className="absolute -right-3 -bottom-3 w-20 h-20 rotate-6" />
          <PaperIcon shape="heart" color="rgb(var(--brand-primary))" opacity={0.5} className="absolute right-5 top-4 w-3.5 h-3.5" />
          <div className="relative z-10">
            <div className="mb-5 flex justify-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden shadow-soft border-2 border-dashed border-brand-brown/25"
                style={{ backgroundColor: BG_INFO }}
              >
                {photo ?
                  <img src={photo} alt="프로필" className="w-full h-full object-cover" />
                : <Camera className="w-7 h-7 text-brand-mute" />}
                <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center text-white bg-brand-primary border-2 border-brand-card">
                  <Plus className="w-4 h-4" />
                </span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
            </div>

            {/* 아이디 (읽기 전용) */}
            <ReadOnly label="아이디" icon={<User className="w-5 h-5" />} value={user.userId || '—'} />

            <Field icon={<Smile className="w-5 h-5" />} label="닉네임" value={nickname}
              onChange={setNickname} placeholder="집사 이름" />
            <Field icon={<Mail className="w-5 h-5" />} label="이메일" value={email}
              onChange={setEmail} placeholder="example@aimyaong.com" type="email" />

            {err && <p className="mt-4 text-sm font-bold text-brand-danger">{err}</p>}
            {saved && <p className="mt-4 text-sm font-bold text-brand-success">저장되었어요!</p>}
          </div>
        </div>

        {/* 비밀번호 변경 안내 */}
        <button
          type="button"
          onClick={() => navigate('/find-password')}
          className="mt-3 w-full relative overflow-hidden flex items-center gap-3 rounded-3xl shadow-soft px-4 py-3.5 touch-active text-left"
          style={{ backgroundColor: BG_CARD }}
        >
          <Stitch />
          <span className="relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-dashed border-brand-brown/20" style={{ backgroundColor: BG_INFO }}>
            <Lock className="w-4 h-4 text-brand-brown" />
          </span>
          <span className="relative z-10 flex-1 text-sm font-bold text-brand-brown">비밀번호 변경</span>
          <ChevronRight className="relative z-10 w-4 h-4 text-brand-mute" />
        </button>

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 rounded-2xl py-3.5 text-base font-bold border border-dashed border-brand-brown/25 text-brand-brown touch-active"
            style={{ backgroundColor: BG_INFO }}>
            취소
          </button>
          <button type="submit" disabled={busy}
            className="flex-1 rounded-2xl py-3.5 text-base font-bold text-white shadow-soft touch-active disabled:opacity-60 bg-brand-primary border border-dashed border-white/30">
            {busy ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ReadOnly({ icon, label, value }) {
  return (
    <div className="block">
      <span className="text-xs font-bold text-brand-mute pl-1">{label}</span>
      <div className="mt-1.5 flex items-center gap-2.5 rounded-2xl px-4 py-3.5 border border-brand-brown/15 opacity-90" style={{ backgroundColor: BG_INFO }}>
        {icon && <span className="text-brand-mute">{icon}</span>}
        <span className="flex-1 text-base font-semibold text-brand-brown">{value}</span>
        <span className="text-[11px] font-bold text-brand-mute">변경 불가</span>
      </div>
    </div>
  )
}

function Field({ icon, label, value, onChange, type = 'text', placeholder }) {
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
          className="flex-1 min-w-0 bg-transparent text-base font-semibold text-brand-brown outline-none placeholder:font-normal placeholder:text-brand-mute/60"
        />
      </div>
    </label>
  )
}

export default ProfileEdit
