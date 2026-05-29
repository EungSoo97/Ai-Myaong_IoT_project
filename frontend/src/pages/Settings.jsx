import { useState } from 'react'
import {
  Wifi,
  Bell,
  Power,
  RotateCw,
  ChevronRight,
  Info,
  ShieldCheck,
} from 'lucide-react'
import { Card, CreamCard, PageHeader, ToggleSwitch, Badge } from '../components/ui'

export function Settings() {
  const [pushOn, setPushOn] = useState(true)
  const [motionAlert, setMotionAlert] = useState(true)
  const [strangerAlert, setStrangerAlert] = useState(true)
  const [feedAlert, setFeedAlert] = useState(false)

  return (
    <div className="px-5 pb-6">
      <PageHeader title="설정" subtitle="기기와 알림을 관리해요" />

      {/* 네트워크 */}
      <section id="network" className="scroll-mt-6">
        <h3 className="font-display text-base font-bold text-brand-brown px-1 mb-2">네트워크</h3>
        <Card className="px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-brand-success/15 text-brand-success flex items-center justify-center shrink-0">
              <Wifi className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-brand-brown truncate">AiMyaong-Home</p>
              <p className="text-xs text-brand-mute">신호 강도 우수 · 5GHz</p>
            </div>
            <Badge tone="success">연결됨</Badge>
          </div>
          <button className="mt-3 w-full py-2.5 rounded-2xl bg-brand-cream text-brand-brown text-sm font-bold touch-active shadow-soft">
            와이파이 변경
          </button>
        </Card>
      </section>

      {/* 알림 제어 */}
      <section className="mt-6">
        <h3 className="font-display text-base font-bold text-brand-brown px-1 mb-2">알림 제어</h3>
        <CreamCard className="divide-y divide-brand-line">
          <Row
            icon={<Bell className="w-5 h-5" />}
            title="푸시 알림"
            desc="모든 푸시 알림 전역 On/Off"
            right={<ToggleSwitch checked={pushOn} onChange={setPushOn} label="푸시 알림" />}
          />
          <Row
            title="이상 행동 감지"
            desc="비정상 패턴 감지 시 알림"
            right={<ToggleSwitch checked={motionAlert} onChange={setMotionAlert} label="이상 행동" />}
            disabled={!pushOn}
          />
          <Row
            title="외부인 감지"
            desc="등록되지 않은 사람 알림"
            right={<ToggleSwitch checked={strangerAlert} onChange={setStrangerAlert} label="외부인 감지" />}
            disabled={!pushOn}
          />
          <Row
            title="배식 완료 알림"
            desc="자동 배식이 끝났을 때"
            right={<ToggleSwitch checked={feedAlert} onChange={setFeedAlert} label="배식 알림" />}
            disabled={!pushOn}
          />
        </CreamCard>
      </section>

      {/* 기기 제어 */}
      <section className="mt-6">
        <h3 className="font-display text-base font-bold text-brand-brown px-1 mb-2">기기 제어</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="flex flex-col items-center gap-2 py-5 rounded-3xl bg-brand-card shadow-soft touch-active">
            <span className="w-11 h-11 rounded-2xl bg-brand-primary/15 text-brand-primary flex items-center justify-center">
              <RotateCw className="w-5 h-5" />
            </span>
            <span className="text-sm font-bold text-brand-brown">재부팅</span>
          </button>
          <button className="flex flex-col items-center gap-2 py-5 rounded-3xl bg-brand-card shadow-soft touch-active">
            <span className="w-11 h-11 rounded-2xl bg-brand-danger/15 text-brand-danger flex items-center justify-center">
              <Power className="w-5 h-5" />
            </span>
            <span className="text-sm font-bold text-brand-brown">전원 Off</span>
          </button>
        </div>
      </section>

      {/* 정보 */}
      <section className="mt-6">
        <Card className="divide-y divide-brand-line">
          <LinkRow icon={<ShieldCheck className="w-5 h-5 text-brand-success" />} title="보안 및 권한" />
          <LinkRow icon={<Info className="w-5 h-5 text-brand-mute" />} title="앱 정보 · 버전 1.0.0" />
        </Card>
      </section>
    </div>
  )
}

function Row({ icon, title, desc, right, disabled }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${disabled ? 'opacity-50' : ''}`}>
      {icon && (
        <span className="w-10 h-10 rounded-2xl bg-brand-card text-brand-primary flex items-center justify-center shrink-0 shadow-soft">
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-brand-brown truncate">{title}</p>
        {desc && <p className="text-xs text-brand-mute truncate">{desc}</p>}
      </div>
      {right}
    </div>
  )
}

function LinkRow({ icon, title }) {
  return (
    <button className="w-full flex items-center gap-3 px-4 py-3.5 touch-active text-left">
      <span className="w-10 h-10 rounded-2xl bg-brand-cream flex items-center justify-center shrink-0">
        {icon}
      </span>
      <p className="flex-1 text-sm font-bold text-brand-brown">{title}</p>
      <ChevronRight className="w-4 h-4 text-brand-mute" />
    </button>
  )
}

export default Settings
