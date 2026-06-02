import { useRef, useState } from 'react'
import {
  Check, ChevronLeft, ChevronRight, User, Smile,
  PawPrint, Dog, Cat, Calendar, Scale, Camera, Plus,
  PartyPopper, Trash2,
} from 'lucide-react'
import { GoogleButton } from '../components/GoogleButton'
import { EmailVerifyField } from '../components/EmailVerifyField'
import { PasswordField, isStrongPassword } from '../components/PasswordField'
import { saveAccount } from '../lib/accountRepository'

/* Warm-tone 팔레트 (Login.jsx 와 동일) */
const C = {
  bg: '#FFF3E2',
  card: '#FFFFFF',
  input: '#FFF6E9',
  border: '#F1DEC2',
  brown: '#5C3D1F',
  mute: '#A98A6B',
  primary: '#F2A06A',
  primaryDeep: '#D6814A',
  outline: '#2D2520',
  danger: '#E26D5C',
  ok: '#7FB28A',
}

/* 단계 메타 (약관 동의 단계 제거 → 유저 정보부터 시작) */
const STEPS = [
  { key: 'user', label: '정보 입력' },
  { key: 'pet', label: '펫 정보' },
  { key: 'branch', label: '등록 확인' },
]
const STEP_USER = 0
const STEP_PET = 1
const STEP_BRANCH = 2

/* 빈 펫 객체 — 초기값 & Reset 용 */
const emptyPet = () => ({
  name: '',
  species: 'DOG',
  breed: '',
  gender: 'M',
  birthDate: '',
  weightKg: '',
  photo: '',     // Base64 미리보기 문자열
  notes: '',
})

/**
 * 다중 단계 회원가입 (프론트 전용).
 * - userInfo 오브젝트 + petList 배열로 전체 흐름 상태 관리
 * - 백엔드 없음 → 최종 페이로드는 console.log + localStorage 저장
 */
export default function Signup({ onComplete, onBackToLogin }) {
  // 화면 전환: 'signup' → 'done'
  const [screen, setScreen] = useState('signup')
  const [step, setStep] = useState(0)

  // 상위 폼 상태
  const [userInfo, setUserInfo] = useState({
    userId: '',          // 로그인용 아이디
    password: '',
    passwordConfirm: '',
    email: '',           // 아이디/비밀번호 찾기용 이메일
    nickname: '',
  })
  const [emailVerified, setEmailVerified] = useState(false) // 이메일 인증 완료 여부
  const [petList, setPetList] = useState([])   // 누적되는 펫 배열
  const [pet, setPet] = useState(emptyPet())   // 현재 입력 중인 펫 draft

  const [finalPayload, setFinalPayload] = useState(null) // 완료 화면용
  const [err, setErr] = useState('')

  const [fieldErrors, setFieldErrors] = useState({}) // 빈/잘못된 칸 강조용

  const clearFieldError = (k) => setFieldErrors((p) => (p[k] ? { ...p, [k]: false } : p))

  const setUser = (k, v) => { setUserInfo((p) => ({ ...p, [k]: v })); clearFieldError(k) }
  const setPetField = (k, v) => { setPet((p) => ({ ...p, [k]: v })); clearFieldError(k) }

  const handleEmailVerified = (v) => { setEmailVerified(v); if (v) clearFieldError('email') }

  /* 구글 빠른 가입 (mock): 이메일/닉네임/아이디 프리필 + 이메일 인증 완료 처리 */
  const handleGoogleSignup = (profile) => {
    setErr('')
    setFieldErrors({})
    setUserInfo((p) => ({
      ...p,
      email: profile.email,
      nickname: p.nickname || profile.name,
      userId: p.userId || profile.email.split('@')[0],
    }))
    setEmailVerified(true) // 구글이 인증한 이메일 → 별도 인증번호 불필요
  }

  /* ── 현재 단계에서 비었거나 잘못된 항목 수집 ── */
  const getStepIssues = () => {
    if (step === STEP_USER) {
      return [
        { key: 'userId', bad: !userInfo.userId.trim(), msg: '아이디를 입력해 주세요.' },
        { key: 'password', bad: !isStrongPassword(userInfo.password), msg: '비밀번호는 8자 이상이며 영문·숫자·특수문자를 포함해야 합니다.' },
        { key: 'passwordConfirm', bad: !userInfo.passwordConfirm || userInfo.password !== userInfo.passwordConfirm, msg: '비밀번호 확인이 일치하지 않습니다.' },
        { key: 'email', bad: !userInfo.email.includes('@') || !emailVerified, msg: '이메일 인증을 완료해 주세요.' },
        { key: 'nickname', bad: !userInfo.nickname.trim(), msg: '닉네임을 입력해 주세요.' },
      ]
    }
    if (step === STEP_PET) {
      return [
        { key: 'name', bad: !pet.name.trim(), msg: '펫 이름을 입력해 주세요.' },
        { key: 'breed', bad: !pet.breed.trim(), msg: '품종을 입력해 주세요.' },
      ]
    }
    return []
  }

  const next = () => {
    const failing = getStepIssues().filter((c) => c.bad)
    if (failing.length) {
      const fe = {}
      failing.forEach((c) => { fe[c.key] = true })
      setFieldErrors(fe)
      setErr(failing.length > 1 ? '입력하지 않았거나 올바르지 않은 항목이 있어요.' : failing[0].msg)
      return
    }
    setFieldErrors({})
    setErr('')

    // 펫 입력 → 분기 진입 시 현재 draft 를 배열에 commit
    if (step === STEP_PET) {
      setPetList((list) => [...list, pet])
      setPet(emptyPet())
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const prev = () => {
    setErr('')
    setFieldErrors({})
    // 분기에서 뒤로 → 마지막에 commit 한 펫을 다시 draft 로 꺼내 수정 가능
    if (step === STEP_BRANCH) {
      setPetList((list) => {
        const copy = [...list]
        const last = copy.pop()
        if (last) setPet(last)
        return copy
      })
    }
    setStep((s) => Math.max(s - 1, 0))
  }

  /* 분기: "예, 추가 등록" → 폼 Reset 후 펫 입력으로 */
  const addAnotherPet = () => {
    setErr('')
    setFieldErrors({})
    setPet(emptyPet())
    setStep(STEP_PET)
  }

  const removePet = (idx) => setPetList((list) => list.filter((_, i) => i !== idx))

  /* 최종 가입: 페이로드 조립 → console + localStorage */
  const finish = () => {
    if (petList.length === 0) { setErr('최소 한 마리의 펫을 등록해 주세요.'); return }

    const { passwordConfirm, ...user } = userInfo // 확인용 필드는 페이로드에서 제외
    const payload = {
      user,
      pets: petList,
      createdAt: new Date().toISOString(),
    }

    console.log('%c[Signup] 백엔드 전송 페이로드', 'color:#D6814A;font-weight:bold')
    console.log(JSON.stringify(payload, null, 2))

    // 데이터 계층에 저장 (내일 백엔드 붙으면 repository 내부만 교체)
    saveAccount(payload)

    setFinalPayload(payload)
    setScreen('done')
  }

  /* ───────── 완료(가상 대시보드) 화면 ───────── */
  if (screen === 'done' && finalPayload) {
    return <DonePanel payload={finalPayload} onGo={onComplete} />
  }

  /* ───────── 회원가입 단계 화면 ───────── */
  return (
    <div className="font-cute flex-1 flex flex-col h-[100dvh] overflow-hidden" style={{ background: C.bg }}>
      {/* 상단 고정: 브랜드 + 단계 인디케이터 */}
      <div className="shrink-0 px-5 pt-6 sm:px-8">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: C.brown }}>
            Ai<span style={{ color: C.primary }}>:</span>Myaong
          </h1>
          <p className="mt-1 text-sm font-semibold" style={{ color: C.mute }}>회원가입</p>
          {onBackToLogin && step === STEP_USER && (
            <button
              type="button"
              onClick={onBackToLogin}
              className="mt-2 text-sm font-bold hover:underline"
              style={{ color: C.primary }}
            >
              이미 계정이 있으신가요? 로그인
            </button>
          )}
        </div>
        <Stepper step={step} />
      </div>

      {/* 중앙: 스크롤 영역 (폼 카드) */}
      <div className="flex-1 overflow-y-auto min-h-0 px-5 pt-4 pb-6 sm:px-8">
        <div
          className="rounded-3xl p-6 shadow-lg"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          {step === STEP_USER && (
            <UserStep
              userInfo={userInfo}
              setUser={setUser}
              emailVerified={emailVerified}
              setEmailVerified={handleEmailVerified}
              onGoogle={handleGoogleSignup}
              errors={fieldErrors}
            />
          )}
          {step === STEP_PET && <PetStep pet={pet} setPetField={setPetField} count={petList.length} errors={fieldErrors} />}
          {step === STEP_BRANCH && <BranchStep petList={petList} onAdd={addAnotherPet} onRemove={removePet} />}

          {err && <p className="mt-4 text-sm font-bold" style={{ color: C.danger }}>{err}</p>}
        </div>
      </div>

      {/* 하단 고정: 네비게이션 */}
      <div
        className="shrink-0 flex gap-3 px-5 pt-3 pb-6 sm:px-8 pb-safe"
        style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}
      >
        {step > 0 && (
          <button
            type="button"
            onClick={prev}
            className="inline-flex items-center justify-center gap-1 rounded-2xl px-6 py-4 text-base font-bold transition-colors active:brightness-95"
            style={{ background: C.input, color: C.brown, border: `1.5px solid ${C.border}` }}
          >
            <ChevronLeft className="w-5 h-5" /> 이전
          </button>
        )}

        {step < STEP_BRANCH && (
          <button
            type="button"
            onClick={next}
            className="flex-1 inline-flex items-center justify-center gap-1 rounded-2xl text-white px-6 py-4 text-base font-bold shadow-md transition-colors active:brightness-90"
            style={{ background: C.primary }}
          >
            다음 <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {step === STEP_BRANCH && (
          <button
            type="button"
            onClick={finish}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl text-white px-6 py-4 text-base font-bold shadow-md transition-colors active:brightness-90"
            style={{ background: C.primaryDeep }}
          >
            <Check className="w-5 h-5" /> 가입 완료
          </button>
        )}
      </div>
    </div>
  )
}

/* ─────────────── 단계 인디케이터 ─────────────── */
function Stepper({ step }) {
  return (
    <div className="mt-5 flex items-center justify-center gap-2">
      {STEPS.map((s, i) => {
        const active = i === step
        const done = i < step
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                style={{
                  background: active ? C.primary : done ? C.ok : C.input,
                  color: active || done ? '#fff' : C.mute,
                  border: `1.5px solid ${active ? C.primary : done ? C.ok : C.border}`,
                }}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className="mt-1.5 text-xs font-bold" style={{ color: active ? C.brown : C.mute }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-6 h-0.5 rounded-full mb-5" style={{ background: done ? C.ok : C.border }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────── Step 1 · 유저 정보 ─────────────── */
function UserStep({ userInfo, setUser, emailVerified, setEmailVerified, onGoogle, errors = {} }) {
  return (
    <div>
      <SectionTitle icon={<User className="w-5 h-5" />} title="회원 정보를 입력해 주세요" />

      {/* 구글 빠른 가입 */}
      <div className="mt-5">
        <GoogleButton label="Google로 빠른 가입" onSuccess={onGoogle} />
      </div>
      <Divider />

      <Field icon={<User className="w-5 h-5" />} label="아이디" value={userInfo.userId}
        onChange={(v) => setUser('userId', v)} placeholder="로그인에 사용할 아이디" invalid={errors.userId} />
      <PasswordField label="비밀번호" value={userInfo.password}
        onChange={(v) => setUser('password', v)} invalid={errors.password} />
      <PasswordField label="비밀번호 확인" value={userInfo.passwordConfirm}
        onChange={(v) => setUser('passwordConfirm', v)} placeholder="비밀번호 재입력" showStrength={false} invalid={errors.passwordConfirm} />
      {userInfo.passwordConfirm && (
        <p className="mt-1.5 text-xs font-bold pl-1"
          style={{ color: userInfo.password === userInfo.passwordConfirm ? C.ok : C.danger }}>
          {userInfo.password === userInfo.passwordConfirm ? '✓ 비밀번호가 일치해요' : '비밀번호가 일치하지 않아요'}
        </p>
      )}
      <EmailVerifyField
        email={userInfo.email}
        onEmailChange={(v) => setUser('email', v)}
        verified={emailVerified}
        onVerifiedChange={setEmailVerified}
        label="이메일"
        hint="아이디/비밀번호 찾기에 사용돼요."
        invalid={errors.email}
      />
      <Field icon={<Smile className="w-5 h-5" />} label="닉네임" value={userInfo.nickname}
        onChange={(v) => setUser('nickname', v)} placeholder="집사 이름" invalid={errors.nickname} />
    </div>
  )
}

/* "또는" 구분선 */
function Divider() {
  return (
    <div className="mt-5 flex items-center gap-3">
      <div className="flex-1 h-px" style={{ background: C.border }} />
      <span className="text-xs font-bold" style={{ color: C.mute }}>또는</span>
      <div className="flex-1 h-px" style={{ background: C.border }} />
    </div>
  )
}

/* ─────────────── Step 2 · 펫 정보 ─────────────── */
function PetStep({ pet, setPetField, count, errors = {} }) {
  const fileRef = useRef(null)

  const onPickImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPetField('photo', reader.result) // Base64
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <SectionTitle
        icon={<PawPrint className="w-5 h-5" />}
        title={count === 0 ? '반려동물을 등록해 주세요' : `${count + 1}번째 반려동물 등록`}
      />

      {/* 프로필 이미지 미리보기 */}
      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative w-28 h-28 rounded-full flex items-center justify-center overflow-hidden transition-colors"
          style={{ background: C.input, border: `2px dashed ${C.border}` }}
        >
          {pet.photo ? (
            <img src={pet.photo} alt="펫 미리보기" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-8 h-8" style={{ color: C.mute }} />
          )}
          <span
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: C.primary, border: '2px solid #fff' }}
          >
            <Camera className="w-4 h-4 text-white" />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" />
      </div>

      <Field icon={<PawPrint className="w-5 h-5" />} label="이름" value={pet.name}
        onChange={(v) => setPetField('name', v)} placeholder="예: 나비" invalid={errors.name} />

      {/* 종류 (DOG / CAT) */}
      <FieldLabel>종류</FieldLabel>
      <div className="mt-1.5 grid grid-cols-2 gap-2.5">
        <SegBtn active={pet.species === 'DOG'} onClick={() => setPetField('species', 'DOG')}
          icon={<Dog className="w-5 h-5" />} label="강아지" />
        <SegBtn active={pet.species === 'CAT'} onClick={() => setPetField('species', 'CAT')}
          icon={<Cat className="w-5 h-5" />} label="고양이" />
      </div>

      <Field icon={<PawPrint className="w-5 h-5" />} label="품종" value={pet.breed}
        onChange={(v) => setPetField('breed', v)} placeholder="예: 코리안숏헤어" invalid={errors.breed} />

      {/* 성별 */}
      <FieldLabel>성별</FieldLabel>
      <div className="mt-1.5 grid grid-cols-2 gap-2.5">
        <SegBtn active={pet.gender === 'M'} onClick={() => setPetField('gender', 'M')} label="♂ 수컷" />
        <SegBtn active={pet.gender === 'F'} onClick={() => setPetField('gender', 'F')} label="♀ 암컷" />
      </div>

      <Field icon={<Calendar className="w-5 h-5" />} label="생년월일" value={pet.birthDate}
        onChange={(v) => setPetField('birthDate', v)} type="date" />
      <Field icon={<Scale className="w-5 h-5" />} label="몸무게 (kg)" value={pet.weightKg}
        onChange={(v) => setPetField('weightKg', v)} placeholder="예: 4.2" type="number" />

      {/* 특이사항 */}
      <FieldLabel>특이사항</FieldLabel>
      <textarea
        value={pet.notes}
        onChange={(e) => setPetField('notes', e.target.value)}
        rows={3}
        placeholder="알러지, 복용 약, 성격 등"
        className="font-sans mt-1.5 w-full rounded-2xl px-4 py-4 text-base outline-none resize-none placeholder:opacity-60"
        style={{ background: C.input, border: `1.5px solid ${C.border}`, color: C.brown }}
      />
    </div>
  )
}

/* ─────────────── Step 3 · 추가 등록 분기 ─────────────── */
function BranchStep({ petList, onAdd, onRemove }) {
  return (
    <div>
      <SectionTitle icon={<PawPrint className="w-5 h-5" />} title={`총 ${petList.length}마리 등록됨`} />

      <div className="mt-5 space-y-2.5">
        {petList.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
            style={{ background: C.input, border: `1.5px solid ${C.border}` }}
          >
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0"
              style={{ background: '#fff', border: `1px solid ${C.border}` }}>
              {p.photo
                ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                : <PawPrint className="w-6 h-6" style={{ color: C.mute }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold truncate" style={{ color: C.brown }}>{p.name}</p>
              <p className="text-sm" style={{ color: C.mute }}>
                {p.species === 'DOG' ? '강아지' : '고양이'} · {p.breed || '품종 미입력'}
              </p>
            </div>
            <button type="button" onClick={() => onRemove(i)} className="p-2.5 rounded-xl active:brightness-95">
              <Trash2 className="w-5 h-5" style={{ color: C.danger }} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition-colors active:brightness-95"
        style={{ background: C.input, color: C.primaryDeep, border: `1.5px dashed ${C.primary}` }}
      >
        <Plus className="w-5 h-5" /> 다른 반려동물도 등록하기
      </button>

      <p className="mt-4 text-center text-sm" style={{ color: C.mute }}>
        등록을 마쳤다면 아래 <b>가입 완료</b> 버튼을 눌러주세요 🐾
      </p>
    </div>
  )
}

/* ─────────────── 완료(가상 대시보드) ─────────────── */
function DonePanel({ payload, onGo }) {
  return (
    <div className="font-cute flex-1 flex flex-col h-[100dvh] overflow-y-auto px-5 pt-10 pb-8 sm:px-8" style={{ background: C.bg }}>
      <div className="text-center">
        <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: C.primary }}>
          <PartyPopper className="w-10 h-10 text-white" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold" style={{ color: C.brown }}>
          {payload.user.nickname} 님, 환영해요!
        </h1>
        <p className="mt-1.5 text-sm font-semibold" style={{ color: C.mute }}>
          가입이 완료되었어요 · 반려동물 {payload.pets.length}마리
        </p>
      </div>

      <div className="mt-6 rounded-3xl p-5 shadow-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <p className="text-sm font-bold tracking-widest uppercase" style={{ color: C.primary }}>내 반려동물</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {payload.pets.map((p, i) => (
            <div key={i} className="rounded-2xl p-4 text-center" style={{ background: C.input, border: `1px solid ${C.border}` }}>
              <div className="mx-auto w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
                style={{ background: '#fff', border: `1px solid ${C.border}` }}>
                {p.photo
                  ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                  : <PawPrint className="w-7 h-7" style={{ color: C.mute }} />}
              </div>
              <p className="mt-2.5 text-base font-bold" style={{ color: C.brown }}>{p.name}</p>
              <p className="text-sm" style={{ color: C.mute }}>
                {p.species === 'DOG' ? '강아지' : '고양이'} · {p.weightKg || '?'}kg
              </p>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onGo}
        className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl text-white py-4 text-base font-bold shadow-md transition-colors active:brightness-90"
        style={{ background: C.primary }}
      >
        대시보드로 이동 <ChevronRight className="w-5 h-5" />
      </button>

      <p className="mt-4 text-center text-sm" style={{ color: C.mute }}>
        페이로드는 콘솔 & localStorage(<code>aimyaong:signup</code>)에 저장되었어요.
      </p>
    </div>
  )
}

/* ─────────────── 공통 UI ─────────────── */
function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: C.primary }}>{icon}</span>
      <h2 className="text-xl font-bold" style={{ color: C.brown }}>{title}</h2>
    </div>
  )
}

function FieldLabel({ children }) {
  return <span className="mt-5 block text-sm font-bold pl-1" style={{ color: C.mute }}>{children}</span>
}

function Field({ icon, label, value, onChange, type = 'text', placeholder, invalid }) {
  return (
    <label className="mt-5 block">
      <span className="text-sm font-bold pl-1" style={{ color: invalid ? C.danger : C.mute }}>{label}</span>
      <div className="mt-1.5 flex items-center gap-2.5 rounded-2xl px-4 py-4"
        style={{ background: invalid ? '#FDECE9' : C.input, border: `1.5px solid ${invalid ? C.danger : C.border}` }}>
        {icon && <span style={{ color: invalid ? C.danger : C.mute }}>{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-sans flex-1 min-w-0 bg-transparent text-base outline-none placeholder:opacity-60"
          style={{ color: C.brown }}
        />
      </div>
    </label>
  )
}

function SegBtn({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 rounded-2xl py-4 text-base font-bold transition-colors active:brightness-95"
      style={{
        background: active ? C.primary : C.input,
        color: active ? '#fff' : C.brown,
        border: `1.5px solid ${active ? C.primary : C.border}`,
      }}
    >
      {icon}{label}
    </button>
  )
}
