import { useEffect, useRef, useState } from 'react'
import { Lock, LogIn, User } from 'lucide-react'

const DEMO_ID = 'admin'
const DEMO_PW = 'meow1234'

/* Warm-tone 팔레트 (주황/크림 고양이 컨셉) */
const C = {
  bg: '#FFF3E2',          // 따뜻한 크림 배경
  card: '#FFFFFF',
  input: '#FFF6E9',
  border: '#F1DEC2',
  brown: '#5C3D1F',
  mute: '#A98A6B',
  primary: '#F39557',     // 주황
  primaryDeep: '#D86D2F',
  cream: '#FFE9CF',
  catOrange: '#F39557',
  catOrangeDark: '#E07A3C',
  catWhite: '#FDF5E8',
  catNose: '#F6B6A3',
  catEar: '#F8B58C',
}

/**
 * 로그인 화면.
 * - 마우스/터치 좌표 → 고양이 머리/눈동자 transform 에 부드럽게 바인딩.
 * - 둥글둥글한 캐릭터 비례에 맞춰 트래킹 수치 미세 조정.
 */
export function Login({ onLogin }) {
  const [id, setId] = useState(DEMO_ID)
  const [pw, setPw] = useState(DEMO_PW)
  const [err, setErr] = useState('')

  const stageRef = useRef(null)
  const headRef = useRef(null)
  const eyeLRef = useRef(null)
  const eyeRRef = useRef(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const apply = (clientX, clientY) => {
      const rect = stage.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2.4
      const nx = Math.max(-1, Math.min(1, (clientX - cx) / (rect.width / 2)))
      const ny = Math.max(-1, Math.min(1, (clientY - cy) / (rect.height / 2)))

      // 머리: 천천히 갸웃 (translate ±2.5px / rotate ±4deg)
      if (headRef.current) {
        const tx = nx * 2.5
        const ty = ny * 1.5
        const rotZ = nx * 4
        const tiltX = -ny * 3
        headRef.current.style.transform = `translate(${tx}px, ${ty}px) rotate(${rotZ}deg) rotateX(${tiltX}deg)`
      }
      // 눈동자: 좁은 슬릿 안에서만 미세하게 (max 2.5px / 1.5px)
      const ex = nx * 2.5
      const ey = ny * 1.5
      if (eyeLRef.current) eyeLRef.current.style.transform = `translate(${ex}px, ${ey}px)`
      if (eyeRRef.current) eyeRRef.current.style.transform = `translate(${ex}px, ${ey}px)`
    }

    const onMouse = (e) => apply(e.clientX, e.clientY)
    const onTouch = (e) => {
      if (e.touches?.length) apply(e.touches[0].clientX, e.touches[0].clientY)
    }
    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchstart', onTouch, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchstart', onTouch)
    }
  }, [])

  const submit = (e) => {
    e.preventDefault()
    if (id === DEMO_ID && pw === DEMO_PW) {
      onLogin?.()
      return
    }
    setErr('아이디 또는 비밀번호를 확인해 주세요')
  }

  return (
    <div
      ref={stageRef}
      className="flex-1 flex flex-col px-6 pt-10 pb-8"
      style={{ background: C.bg, perspective: '900px' }}
    >
      {/* 브랜드 */}
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: C.brown }}>
          Ai<span style={{ color: C.primary }}>:</span>Myaong
        </h1>
        <p className="mt-1 text-xs font-semibold" style={{ color: C.mute }}>
          사료를 전하고 싶다던가 🐾
        </p>
      </div>

      {/* 둥글둥글한 주황 고양이 */}
      <div className="mt-6 flex justify-center" style={{ transformStyle: 'preserve-3d' }}>
        <ChubbyCat headRef={headRef} eyeLRef={eyeLRef} eyeRRef={eyeRRef} />
      </div>

      {/* 로그인 폼 (warm tone) */}
      <form
        onSubmit={submit}
        className="mt-6 rounded-3xl p-5 shadow-lg"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
      >
        <p className="text-center text-xs font-bold tracking-widest uppercase" style={{ color: C.primary }}>
          로그인
        </p>

        <WarmField
          icon={<User className="w-4 h-4" />}
          label="아이디"
          value={id}
          onChange={setId}
          placeholder="아이디를 입력해 주세요"
          autoComplete="username"
        />
        <WarmField
          icon={<Lock className="w-4 h-4" />}
          label="비밀번호"
          value={pw}
          onChange={setPw}
          type="password"
          placeholder="비밀번호"
          autoComplete="current-password"
        />

        {err && (
          <p className="mt-2 text-xs font-semibold" style={{ color: '#E26D5C' }}>{err}</p>
        )}

        <button
          type="submit"
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-2xl text-white font-bold py-3.5 shadow-md transition-colors active:brightness-90"
          style={{ background: C.primary }}
        >
          <LogIn className="w-4 h-4" />
          들어가기
        </button>

        <div className="mt-4 flex items-center justify-between text-xs" style={{ color: C.mute }}>
          <button type="button" className="font-semibold hover:underline">비밀번호 찾기</button>
          <button type="button" className="font-bold hover:underline" style={{ color: C.primary }}>
            회원가입
          </button>
        </div>

        <p className="mt-3 text-center text-[11px]" style={{ color: C.mute }}>
          테스트 계정 · {DEMO_ID} / {DEMO_PW}
        </p>
      </form>
    </div>
  )
}

/* ─────────────── Warm Input ─────────────── */
function WarmField({ icon, label, value, onChange, type = 'text', placeholder, autoComplete }) {
  return (
    <label className="mt-4 block">
      <span className="text-[11px] font-semibold pl-1" style={{ color: C.mute }}>{label}</span>
      <div
        className="mt-1 flex items-center gap-2 rounded-2xl px-4 py-3 transition-colors focus-within:ring-2"
        style={{
          background: C.input,
          border: `1.5px solid ${C.border}`,
        }}
      >
        <span style={{ color: C.mute }}>{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:opacity-60"
          style={{ color: C.brown }}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
      </div>
    </label>
  )
}

/* ─────────────── 둥글둥글한 주황/흰색 고양이 ───────────────
 * 첨부 참조 (laying-down 둥근 체형, 닫힌 눈, 주황 등 + 흰 배):
 *  - 몸통: 주황 둥근 덩어리 + 앞부분/배 흰색 패치
 *  - 머리: 둥근 원, 양 옆 주황 귀, 가운데 흰 마스크 (눈/코/입 영역)
 *  - 눈: 평소엔 곱슬 곡선(닫힘) → 트래킹 위해 가는 슬릿 안 작은 눈동자가 미세 이동
 *  - 코: 작은 핑크 하트
 *  - 꼬리: 옆쪽으로 둥글게 말려있는 주황 호
 */
function ChubbyCat({ headRef, eyeLRef, eyeRRef }) {
  return (
    <svg
      width="230"
      height="200"
      viewBox="0 0 230 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ filter: 'drop-shadow(0 18px 22px rgba(92,61,31,0.18))' }}
    >
      {/* 그림자 (앉아있는 형태) */}
      <ellipse cx="115" cy="186" rx="78" ry="9" fill="#000" opacity="0.08" />

      {/* 꼬리 - 우측 뒤로 말림 */}
      <path
        d="M170 150 Q210 140 208 110 Q207 88 188 86"
        stroke={C.catOrange}
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M170 150 Q210 140 208 110 Q207 88 188 86"
        stroke={C.catOrangeDark}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />

      {/* 몸통 (둥근 loaf) - 주황 */}
      <ellipse cx="115" cy="148" rx="78" ry="40" fill={C.catOrange} />
      {/* 몸통 외곽선 */}
      <ellipse cx="115" cy="148" rx="78" ry="40" fill="none" stroke={C.brown} strokeWidth="2.5" opacity="0.85" />

      {/* 흰 가슴/배 패치 */}
      <path
        d="M65 158 Q70 130 115 128 Q160 130 165 158 Q160 178 115 180 Q70 178 65 158 Z"
        fill={C.catWhite}
      />
      <path
        d="M65 158 Q70 130 115 128 Q160 130 165 158"
        fill="none"
        stroke={C.brown}
        strokeWidth="1.6"
        opacity="0.4"
      />

      {/* 앞발 흰색 (두 개) */}
      <ellipse cx="92" cy="178" rx="14" ry="9" fill={C.catWhite} stroke={C.brown} strokeWidth="2" />
      <ellipse cx="138" cy="178" rx="14" ry="9" fill={C.catWhite} stroke={C.brown} strokeWidth="2" />

      {/* ─── 머리 (트래킹 그룹) ─── */}
      <g
        ref={headRef}
        style={{
          transition: 'transform 160ms ease-out',
          willChange: 'transform',
          transformOrigin: '115px 90px',
        }}
      >
        {/* 귀 (왼쪽) - 주황 삼각형 둥글게 */}
        <path d="M62 62 Q56 26 86 38 Q90 56 84 70 Z" fill={C.catOrange} stroke={C.brown} strokeWidth="2.2" />
        <path d="M70 58 Q70 40 82 46 Q82 54 80 62 Z" fill={C.catEar} />
        {/* 귀 (오른쪽) */}
        <path d="M168 62 Q174 26 144 38 Q140 56 146 70 Z" fill={C.catOrange} stroke={C.brown} strokeWidth="2.2" />
        <path d="M160 58 Q160 40 148 46 Q148 54 150 62 Z" fill={C.catEar} />

        {/* 머리 (둥근 원) */}
        <circle cx="115" cy="90" r="50" fill={C.catOrange} stroke={C.brown} strokeWidth="2.5" />

        {/* 흰 페이스 마스크 (이마부터 턱) - 머리 가운데 */}
        <path
          d="M82 96 Q90 130 115 134 Q140 130 148 96 Q146 80 115 78 Q84 80 82 96 Z"
          fill={C.catWhite}
          stroke={C.brown}
          strokeWidth="1.8"
        />

        {/* 볼터치 (살짝 분홍) */}
        <ellipse cx="86" cy="106" rx="7" ry="4" fill="#F6B6A3" opacity="0.55" />
        <ellipse cx="144" cy="106" rx="7" ry="4" fill="#F6B6A3" opacity="0.55" />

        {/* 눈 - 호기심 많은 슬릿 + 작은 눈동자(트래킹) */}
        {/* 눈 흰자 (얇은 아몬드) */}
        <ellipse cx="100" cy="98" rx="6.5" ry="5" fill="#FFFDFA" stroke={C.brown} strokeWidth="1.5" />
        <ellipse cx="130" cy="98" rx="6.5" ry="5" fill="#FFFDFA" stroke={C.brown} strokeWidth="1.5" />

        {/* 눈동자 (ref) */}
        <g
          ref={eyeLRef}
          style={{ transition: 'transform 110ms ease-out', willChange: 'transform' }}
        >
          <circle cx="100" cy="98" r="3" fill="#1c130a" />
          <circle cx="99" cy="97" r="1" fill="#FFFDFA" />
        </g>
        <g
          ref={eyeRRef}
          style={{ transition: 'transform 110ms ease-out', willChange: 'transform' }}
        >
          <circle cx="130" cy="98" r="3" fill="#1c130a" />
          <circle cx="129" cy="97" r="1" fill="#FFFDFA" />
        </g>

        {/* 코 (작은 핑크 삼각) */}
        <path
          d="M111 110 L119 110 L115 115 Z"
          fill={C.catNose}
          stroke={C.brown}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* 입 - 작은 ω 미소 */}
        <path
          d="M115 115 Q110 121 106 119"
          stroke={C.brown}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M115 115 Q120 121 124 119"
          stroke={C.brown}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />

        {/* 수염 */}
        <g stroke={C.brown} strokeWidth="1.2" strokeLinecap="round" opacity="0.7">
          <line x1="70" y1="108" x2="86" y2="110" />
          <line x1="70" y1="114" x2="86" y2="114" />
          <line x1="160" y1="108" x2="144" y2="110" />
          <line x1="160" y1="114" x2="144" y2="114" />
        </g>
      </g>
    </svg>
  )
}

export default Login
