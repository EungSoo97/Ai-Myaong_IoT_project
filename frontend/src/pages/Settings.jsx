import { useState } from 'react'
import { ChevronRight, Cpu, Radio, RefreshCw, Save, Server, Wifi } from 'lucide-react'
import { api } from '../api/api'
import { useMQTT } from '../hooks/useMQTT'
import { useRobotStatus } from '../hooks/useRobotStatus'

export function Settings() {
  const [robotIP, setRobotIP] = useState('192.168.0.100')
  const [dispenserIP, setDispenserIP] = useState('192.168.0.101')
  const [mqttBroker, setMqttBroker] = useState('192.168.0.1')
  const [mqttPort, setMqttPort] = useState('1883')
  const [saved, setSaved] = useState(false)
  const { status, refresh } = useRobotStatus(3000)
  const mqtt = useMQTT()

  const deviceInfo = {
    robot: {
      name: '로봇 (Pi + Robot MCU)',
      components: [
        { label: 'Raspberry Pi', value: 'camera + MQTT bridge' },
        { label: 'Robot MCU', value: 'serial motor controller' },
        { label: 'Camera', value: 'MJPEG stream source' },
      ],
    },
    dispenser: {
      name: '디스펜서 (ESP32)',
      components: [
        { label: 'ESP32 DevKit', value: 'Wi-Fi + MQTT' },
        { label: 'Food actuator', value: 'servo or auger' },
        { label: 'Water actuator', value: 'pump or valve' },
      ],
    },
  }

  const protocols = [
    { from: 'React', to: 'FastAPI', protocol: 'REST API', purpose: 'manual control and dashboard' },
    { from: 'FastAPI', to: 'Raspberry Pi', protocol: 'MQTT', purpose: 'robot move and camera commands' },
    { from: 'FastAPI', to: 'ESP32', protocol: 'MQTT', purpose: 'dispenser food and water commands' },
    { from: 'Raspberry Pi', to: 'Robot MCU', protocol: 'Serial', purpose: 'low-level robot actuation' },
    { from: 'Raspberry Pi', to: 'React', protocol: 'MJPEG', purpose: 'camera stream' },
  ]

  const saveSettings = async () => {
    await api.getStatus()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">설정</h1>
        <p className="text-muted-foreground text-sm mt-1">로봇과 디스펜서 통신 구성을 확인합니다.</p>
      </div>

      <div className="p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Wifi className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">네트워크 설정</h3>
        </div>
        <div className="space-y-4">
          <Field label="로봇 IP 주소" value={robotIP} onChange={setRobotIP} />
          <Field label="디스펜서 IP 주소" value={dispenserIP} onChange={setDispenserIP} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="MQTT 브로커" value={mqttBroker} onChange={setMqttBroker} />
            <Field label="포트" value={mqttPort} onChange={setMqttPort} />
          </div>
          <div className="flex gap-2">
            <button onClick={saveSettings} className="flex-1 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors touch-active flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              {saved ? '저장됨' : '저장'}
            </button>
            <button onClick={refresh} className="py-2 px-4 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors touch-active">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DeviceCard icon={Cpu} device={deviceInfo.robot} />
        <DeviceCard icon={Server} device={deviceInfo.dispenser} />
      </div>

      <div className="p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">통신 프로토콜</h3>
        </div>
        <div className="space-y-2">
          {protocols.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <span className="text-sm font-medium text-foreground min-w-[60px]">{item.from}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground min-w-[70px]">{item.to}</span>
              <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded">{item.protocol}</span>
              <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{item.purpose}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-card rounded-xl border border-border">
        <h3 className="font-semibold text-foreground mb-4">시스템 정보</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Info label="버전" value="v1.0.0" />
          <Info label="펌웨어 기준" value="2024.01.15" />
          <Info label="연결 상태" value={status?.connected ? '시뮬레이터 정상' : '대기'} />
          <Info label="MQTT WS" value={mqtt.connected ? '연결됨' : '브라우저 대기'} />
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm text-muted-foreground mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  )
}

function DeviceCard({ icon: Icon, device }) {
  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">{device.name}</h3>
      </div>
      <div className="space-y-2">
        {device.components.map((item, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-sm font-medium text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}
