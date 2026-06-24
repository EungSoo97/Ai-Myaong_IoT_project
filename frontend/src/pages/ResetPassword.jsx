import { useState } from 'react'
import { Check, LogIn, KeyRound } from '../components/icons'
import { AuthHeader, BackLink, FormCard, Stitch, PaperIcon, BG_CARD, BG_INFO } from './FindId'
import { PasswordField, isStrongPassword } from '../components/PasswordField'
import { updatePassword } from '../lib/accountRepository'

/**
 * 비밀번호 재설정 (프론트 전용).
 * - 본인 확인(이메일 인증)을 마친 뒤 진입
 * - 새 비밀번호 + 확인 → accountRepository 의 비밀번호 갱신
 *   (내일 백엔드 붙으면 updatePassword 내부만 API 호출로 교체)
 */
export default function ResetPassword({ onBackToLogin, onDone }) {
  const [pw, setPw] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setErr('')
    if (!isStrongPassword(pw)) { setErr('비밀번호는 8자 이상이며 영문·숫자·특수문자를 포함해야 합니다.'); return }
    if (pw !== pwConfirm) { setErr('비밀번호가 일치하지 않습니다.'); return }

    updatePassword(pw) // 저장된 계정 비밀번호 갱신 (없으면 데모상 무시)
    console.log('%c[ResetPassword] 비밀번호 재설정 완료', 'color:#D6814A;font-weight:bold')
    setDone(true)
  }

  if (done) {
    return (
      <div className="page-enter font-cute min-h-[100dvh] flex flex-col px-5 pt-5 pb-8 bg-brand-bg">
        <AuthHeader title="비밀번호 재설정" subtitle="변경이 완료되었어요" onBack={onDone} />

        <div className="mt-5 relative overflow-hidden rounded-3xl shadow-soft px-5 py-6 text-center" style={{ backgroundColor: BG_CARD }}>
          <Stitch />
          <PaperIcon shape="heart" color="rgb(var(--brand-primary))" opacity={0.5} className="absolute left-6 top-5 w-3.5 h-3.5" />
          <PaperIcon shape="paw" color="rgb(var(--brand-primary-deep))" opacity={0.1} className="absolute -right-3 -bottom-3 w-20 h-20 rotate-6" />
          <div className="relative z-10">
            <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-brand-success/20 text-brand-success border border-dashed border-brand-success/40 shadow-soft-inset">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-brand-brown">비밀번호가 변경되었어요 🐾</h2>
            <p className="mt-2 text-sm text-brand-mute">새 비밀번호로 다시 로그인해 주세요.</p>
            <button
              type="button"
              onClick={onDone}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl text-white py-3.5 text-base font-bold shadow-soft border border-dashed border-white/30 bg-brand-primary transition-colors active:brightness-95"
            >
              <LogIn className="w-5 h-5" /> 로그인하러 가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter font-cute min-h-[100dvh] flex flex-col px-5 pt-5 pb-8 bg-brand-bg">
      <AuthHeader title="비밀번호 재설정" subtitle="새 비밀번호를 설정해요" onBack={onBackToLogin} />

      <FormCard
        icon={<KeyRound className="w-6 h-6" />}
        onSubmit={submit}
        submitIcon={<Check className="w-5 h-5" />}
        submitLabel="비밀번호 변경하기"
      >
        <p className="text-sm text-brand-mute">
          새로 사용할 비밀번호를 입력해 주세요.
        </p>

        <PasswordField label="새 비밀번호" value={pw} onChange={setPw} />
        <PasswordField label="새 비밀번호 확인" value={pwConfirm} onChange={setPwConfirm} placeholder="비밀번호 재입력" showStrength={false} />
        {pwConfirm && (
          <p className={`mt-1.5 text-xs font-bold pl-1 ${pw === pwConfirm ? 'text-brand-success' : 'text-brand-danger'}`}>
            {pw === pwConfirm ? '✓ 비밀번호가 일치해요' : '비밀번호가 일치하지 않아요'}
          </p>
        )}

        {err && <p className="mt-4 text-sm font-bold text-brand-danger">{err}</p>}
      </FormCard>

      <BackLink onBackToLogin={onBackToLogin} />
    </div>
  )
}
