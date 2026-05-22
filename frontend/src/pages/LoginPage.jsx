import { useEffect, useMemo, useRef, useState } from 'react'
import { Lock, LogIn, User } from 'lucide-react'

const DEMO_ID = 'admin'
const DEMO_PASSWORD = 'meow1234'

export function LoginPage({ onLogin }) {
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.42 })
  const [cat, setCat] = useState({ x: 0.5, y: 0.38 })
  const [walking, setWalking] = useState(false)
  const [facing, setFacing] = useState(1)
  const targetRef = useRef({ x: 0.5, y: 0.42 })
  const catRef = useRef({ x: 0.5, y: 0.38 })
  const [loginId, setLoginId] = useState(DEMO_ID)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState('')

  const eyeOffset = useMemo(() => ({
    x: Math.max(-9, Math.min(9, (mouse.x - cat.x) * 34)),
    y: Math.max(-7, Math.min(7, (mouse.y - cat.y) * 26)),
  }), [cat, mouse])

  const catStyle = useMemo(() => ({
    left: `${cat.x * 100}%`,
    top: `${cat.y * 100}%`,
    '--look-x': `${eyeOffset.x}px`,
    '--look-y': `${eyeOffset.y}px`,
    '--tilt-x': `${eyeOffset.y * -0.45}deg`,
    '--tilt-y': `${eyeOffset.x * 0.45}deg`,
    '--face': facing,
  }), [cat, eyeOffset, facing])

  useEffect(() => {
    let frameId
    const animate = () => {
      const current = catRef.current
      const target = targetRef.current
      const next = {
        x: current.x + (target.x - current.x) * 0.035,
        y: current.y + (target.y - current.y) * 0.035,
      }
      const distance = Math.hypot(target.x - current.x, target.y - current.y)
      if (Math.abs(target.x - current.x) > 0.004) {
        setFacing(target.x >= current.x ? 1 : -1)
      }
      setWalking(distance > 0.012)
      catRef.current = next
      setCat(next)
      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  const handlePointerMove = (event) => {
    const x = event.clientX / window.innerWidth
    const y = event.clientY / window.innerHeight
    const target = {
      x: Math.max(0.16, Math.min(0.84, x)),
      y: Math.max(0.18, Math.min(0.66, y)),
    }
    setMouse({ x, y })
    targetRef.current = target
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (loginId === DEMO_ID && password === DEMO_PASSWORD) {
      onLogin()
      return
    }
    setError('아이디 또는 비밀번호를 확인해주세요')
  }

  return (
    <main
      className="login-stage min-h-full overflow-hidden bg-background text-foreground"
      onPointerMove={handlePointerMove}
    >
      <div className="login-brand">
        <span>Ai</span>
        <i>:</i>
        <b>Myaong</b>
      </div>

      <div className="cat-scene" aria-hidden="true">
        <LogoCat style={catStyle} walking={walking} />
      </div>

      <form onSubmit={handleSubmit} className="login-panel">
        <div className="mb-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Ai-Myaong</p>
          <h1 className="mt-1 text-xl font-bold text-foreground">로그인</h1>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-muted-foreground">아이디</span>
          <span className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <input
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
              autoComplete="username"
            />
          </span>
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-muted-foreground">비밀번호</span>
          <span className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
              autoComplete="current-password"
            />
          </span>
        </label>

        {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

        <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90">
          <LogIn className="h-4 w-4" />
          들어가기
        </button>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          테스트 계정: {DEMO_ID} / {DEMO_PASSWORD}
        </p>
      </form>
    </main>
  )
}

function LogoCat({ style, walking }) {
  return (
    <div className={`logo-cat ${walking ? 'is-walking' : ''}`} style={style}>
      <div className="cat-sprite">
        <div className="cat-shadow" />
        <div className="cat-tail" />
        <div className="cat-body">
          <span className="cat-leg front-left" />
          <span className="cat-leg front-right" />
          <span className="cat-leg back-left" />
          <span className="cat-leg back-right" />
        </div>
        <div className="cat-head">
          <span className="cat-ear left" />
          <span className="cat-ear right" />
          <span className="cat-inner-ear left" />
          <span className="cat-inner-ear right" />
          <span className="cat-eye-dot left" />
          <span className="cat-eye-dot right" />
          <span className="cat-mouth" />
          <span className="cat-whisker left one" />
          <span className="cat-whisker left two" />
          <span className="cat-whisker right one" />
          <span className="cat-whisker right two" />
        </div>
      </div>
    </div>
  )
}
