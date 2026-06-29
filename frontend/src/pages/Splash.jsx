import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
export function Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const isAuth = (() => {
      // App.jsx 와 동일하게 token 기준으로 판단 (키 불일치 시 /splash↔/ 무한 루프 방지)
      try { return !!sessionStorage.getItem('aimyaong:token') } catch { return false }
    })()
    const t = setTimeout(() => {
      navigate(isAuth ? '/' : '/login', { replace: true })
    }, 1800)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="splash-logo-page">
      <div className="splash-logo-intro">
        <img
          className="splash-logo-image"
          src="/myaongLogo.png"
          alt="Ai:Myaong"
        />
        <div className="splash-logo-text-frame">
          <img
            className="splash-logo-text"
            src="/logotext.png"
            alt="사료를 전하고 싶다던가"
          />
        </div>
      </div>
    </div>
  )
}

export default Splash
