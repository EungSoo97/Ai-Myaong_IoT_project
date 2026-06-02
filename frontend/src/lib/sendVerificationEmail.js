import emailjs from '@emailjs/browser'

/* EmailJS 설정 — .env 의 VITE_EMAILJS_* 로 주입 (코드에 하드코딩 X) */
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

/* 3개 키가 모두 있어야 실제 발송 가능 (없으면 호출부에서 mock 처리) */
export const emailjsConfigured = Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY)

/**
 * 인증번호 메일 발송 (EmailJS · 프론트 전용).
 * 템플릿에서 사용할 수 있는 변수: {{email}}, {{code}}, {{passcode}}
 * - EmailJS 템플릿의 "To Email" 을 {{email}} 로 설정하세요.
 * - 본문 어딘가에 {{code}} (또는 {{passcode}}) 를 넣으세요.
 */
export async function sendVerificationEmail(email, code) {
  if (!emailjsConfigured) throw new Error('EmailJS가 설정되지 않았습니다.')
  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    { email, to_email: email, code, passcode: code },
    { publicKey: PUBLIC_KEY },
  )
}
