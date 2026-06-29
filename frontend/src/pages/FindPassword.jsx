import { useState } from 'react'
import { User, ArrowRight, KeyRound } from '../components/icons'
import { AuthHeader, Field, BackLink, FormCard } from './FindId'
import { EmailVerifyField } from '../components/EmailVerifyField'

/**
 * 비밀번호 찾기 (프론트 전용).
 * - 아이디 + 이메일 인증 → 비밀번호 재설정 화면으로 이동
 * - 이메일 인증으로 본인 확인이 끝났으므로 별도 메일 링크 없이 바로 재설정
 *   (내일 백엔드 붙으면 토큰 검증 단계만 추가)
 */
export default function FindPassword({ onBackToLogin, onReset }) {
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [verified, setVerified] = useState(false) // 이메일 인증 완료 여부
  const [err, setErr] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setErr('')
    if (!userId.trim()) { setErr('아이디를 입력해 주세요.'); return }
    if (!verified) { setErr('이메일 인증을 완료해 주세요.'); return }
    // 본인 확인 완료 → 재설정 화면으로
    onReset?.({ userId, email })
  }

  return (
    <div className="page-enter font-cute min-h-[100dvh] flex flex-col px-5 pt-5 pb-8 bg-brand-bg">
      <AuthHeader title="비밀번호 찾기" subtitle="아이디와 이메일로 본인 확인을 해요" onBack={onBackToLogin} />

      <FormCard
        icon={<KeyRound className="w-6 h-6" />}
        onSubmit={submit}
        submitIcon={<ArrowRight className="w-5 h-5" />}
        submitLabel="비밀번호 재설정하기"
      >
        <p className="text-sm text-brand-mute">
          아이디 입력 후 이메일을 인증하면 비밀번호를 새로 설정할 수 있어요.
        </p>

        <Field icon={<User className="w-5 h-5" />} label="아이디" value={userId}
          onChange={setUserId} placeholder="로그인 아이디" />
        <EmailVerifyField
          email={email}
          onEmailChange={setEmail}
          verified={verified}
          onVerifiedChange={setVerified}
          label="이메일"
        />

        {err && <p className="mt-4 text-sm font-bold text-brand-danger">{err}</p>}
      </FormCard>

      <BackLink onBackToLogin={onBackToLogin} />
    </div>
  )
}
