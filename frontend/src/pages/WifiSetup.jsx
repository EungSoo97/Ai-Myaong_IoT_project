import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Lock, RefreshCw, Router, Search, Signal, Wifi } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge, Card, GhostButton, PrimaryButton } from '../components/ui'
import { api } from '../api/api'

const ESP32_SETUP_URL_KEY = 'aimyaong:esp32SetupUrl'
const ESP32_MQTT_HOST_KEY = 'aimyaong:esp32MqttHost'
const DEFAULT_ESP32_SETUP_URL = import.meta.env.VITE_ESP32_SETUP_URL || 'http://192.168.4.1'
const DEFAULT_ESP32_MQTT_HOST = import.meta.env.VITE_ESP32_MQTT_HOST || '10.1.82.103'

export function WifiSetup() {
  const navigate = useNavigate()
  const [setupUrl, setSetupUrl] = useState(() => readLocal(ESP32_SETUP_URL_KEY, DEFAULT_ESP32_SETUP_URL))
  const [mqttHost, setMqttHost] = useState(() => readLocal(ESP32_MQTT_HOST_KEY, DEFAULT_ESP32_MQTT_HOST))
  const [status, setStatus] = useState(null)
  const [networks, setNetworks] = useState([])
  const [ssid, setSsid] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [piStatus, setPiStatus] = useState(null)
  const [piApFallback, setPiApFallback] = useState(false)

  useEffect(() => writeLocal(ESP32_SETUP_URL_KEY, setupUrl), [setupUrl])
  useEffect(() => writeLocal(ESP32_MQTT_HOST_KEY, mqttHost), [mqttHost])

  useEffect(() => {
    refreshStatus()
    refreshPiStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function esp32Request(path, options = {}) {
    const base = setupUrl.replace(/\/$/, '')
    const response = await fetch(`${base}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || `ESP32 API error: ${response.status}`)
    return data
  }

  async function refreshStatus({ silent = false } = {}) {
    try {
      if (!silent) setMessage('')
      const data = await esp32Request('/api/wifi/status')
      setStatus(data)
      if (data.mqttHost) setMqttHost(data.mqttHost)
    } catch {
      setStatus(null)
      if (!silent) setMessage('ESP32 설정 주소에 연결할 수 없습니다.')
    }
  }

  async function scanWifi() {
    setBusy(true)
    setMessage('라즈베리파이에서 주변 Wi-Fi를 검색하는 중입니다.')
    try {
      let data
      try {
        data = await api.scanPiWifi()
      } catch {
        setMessage('라즈베리파이 스캔 실패. ESP32 스캔으로 다시 시도합니다.')
        data = await esp32Request('/api/wifi/scan')
      }
      const nextNetworks = data.networks || []
      setNetworks(nextNetworks)
      setMessage(nextNetworks.length ? '검색 완료. 연결할 Wi-Fi를 선택하세요.' : '검색된 Wi-Fi가 없습니다.')
      await refreshStatus({ silent: true })
    } catch (error) {
      setMessage(error.message || 'Wi-Fi 검색에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function saveWifi() {
    if (!ssid.trim()) {
      setMessage('SSID를 선택해 주세요.')
      return
    }

    setBusy(true)
    setMessage('ESP32 설정 저장 중입니다.')
    try {
      const data = await esp32Request('/api/wifi/connect', {
        method: 'POST',
        body: JSON.stringify({ ssid, password, mqttHost, reboot: false }),
      })
      setMessage(data.rebooting ? '저장 완료. ESP32 재부팅 중입니다.' : '저장 완료.')
    } catch (error) {
      setMessage(error.message || 'ESP32 설정 저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function refreshPiStatus() {
    try {
      const data = await api.getNetworkStatus()
      setPiStatus(data)
      const host = data.raspberrypiEnv?.MQTT_BROKER_HOST
      if (host) setMqttHost(host)
    } catch {
      setPiStatus(null)
    }
  }

  async function saveSharedWifi() {
    if (!ssid.trim()) {
      setMessage('SSID를 선택해 주세요.')
      return
    }

    setBusy(true)
    setMessage('라즈베리파이와 ESP32 설정 적용 중입니다.')
    try {
      let data
      try {
        data = await api.configurePiWifi({
          ssid,
          password,
          mqttHost: mqttHost.trim() || 'auto',
          mqttPort: 1883,
          esp32SetupUrl: setupUrl,
          piApFallback,
        })
      } catch {
        data = await api.configureSharedWifi({
          ssid,
          password,
          mqttHost: mqttHost.trim() || 'auto',
          mqttPort: 1883,
          esp32SetupUrl: setupUrl,
          piApFallback,
        })
      }
      const nextHost = data.raspberrypiEnv?.MQTT_BROKER_HOST
      if (nextHost) setMqttHost(nextHost)
      setMessage(nextHost ? `적용 완료. MQTT ${nextHost}:1883` : '적용 완료.')
      await refreshPiStatus()
      await refreshStatus({ silent: true })
    } catch (error) {
      setMessage(error.message || '공통 설정 적용에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg px-5 pt-safe pb-6">
      <header className="flex items-center gap-3 pt-4 pb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-2xl bg-brand-card shadow-soft flex items-center justify-center text-brand-brown touch-active"
          aria-label="뒤로"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold text-brand-brown leading-tight">Wi-Fi 설정</h1>
          <p className="mt-1 text-sm text-brand-mute truncate">라즈베리파이 스캔 우선</p>
        </div>
        <Badge tone={status?.stationConnected ? 'success' : 'warn'}>
          {status?.stationConnected ? '연결됨' : '설정'}
        </Badge>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <StatusTile icon={<Wifi className="w-5 h-5" />} label="ESP32" value={status?.apIp || '192.168.4.1'} />
        <StatusTile icon={<Router className="w-5 h-5" />} label="MQTT" value={piStatus?.raspberrypiEnv?.MQTT_BROKER_HOST || status?.mqttHost || mqttHost} />
      </section>

      <Card className="mt-4 p-4">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            value={setupUrl}
            onChange={(event) => setSetupUrl(event.target.value)}
            className="min-w-0 rounded-2xl border border-brand-line bg-brand-cream px-3 py-2.5 text-sm font-semibold text-brand-brown outline-none focus:border-brand-primary"
            placeholder="ESP32 설정 주소"
          />
          <GhostButton className="px-3 py-2.5 rounded-2xl" onClick={() => refreshStatus()} disabled={busy}>
            <RefreshCw className="w-4 h-4" />
          </GhostButton>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <input
            value={mqttHost}
            onChange={(event) => setMqttHost(event.target.value)}
            className="min-w-0 rounded-2xl border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-brown outline-none focus:border-brand-primary"
            placeholder="MQTT 호스트 IP 또는 비우면 자동"
          />
          <PrimaryButton className="px-4 py-2.5 rounded-2xl" onClick={scanWifi} disabled={busy}>
            <Search className="w-4 h-4" />
          </PrimaryButton>
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <input
          value={ssid}
          onChange={(event) => setSsid(event.target.value)}
          className="w-full rounded-2xl border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-brown outline-none focus:border-brand-primary"
          placeholder="SSID"
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          className="mt-2 w-full rounded-2xl border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-brown outline-none focus:border-brand-primary"
          placeholder="비밀번호"
        />
        <PrimaryButton className="mt-3 w-full rounded-2xl" onClick={saveWifi} disabled={busy}>
          <CheckCircle2 className="w-4 h-4" />
          ESP32만 저장
        </PrimaryButton>
        <PrimaryButton className="mt-2 w-full rounded-2xl" onClick={saveSharedWifi} disabled={busy}>
          <Wifi className="w-4 h-4" />
          라즈베리파이 + ESP32 같이 적용
        </PrimaryButton>
        <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-brand-cream px-3 py-2.5">
          <span className="text-xs font-bold text-brand-brown">실패 시 Pi AP 모드</span>
          <input
            type="checkbox"
            checked={piApFallback}
            onChange={(event) => setPiApFallback(event.target.checked)}
            className="h-4 w-4 accent-brand-primary"
          />
        </label>
        {message && <p className="mt-3 text-xs font-bold text-brand-mute">{message}</p>}
      </Card>

      {networks.length > 0 && (
        <section className="mt-4 rounded-3xl overflow-hidden border border-brand-line bg-brand-card shadow-soft">
          {networks.map((network, index) => (
            <button
              key={`${network.ssid}-${network.channel}-${index}`}
              type="button"
              className={`w-full flex items-center gap-3 px-4 py-3 text-left touch-active border-b border-brand-line last:border-b-0 ${ssid === network.ssid ? 'bg-brand-primary/10' : 'bg-white'}`}
              onClick={() => setSsid(network.ssid)}
            >
              <span className="w-10 h-10 rounded-2xl bg-brand-cream text-brand-brown flex items-center justify-center shrink-0">
                {network.secure ? <Lock className="w-4 h-4" /> : <Signal className="w-4 h-4" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-brand-brown truncate">{network.ssid || '숨겨진 네트워크'}</span>
                <span className="block text-xs text-brand-mute">신호 {network.rssi} dBm · CH {network.channel}</span>
              </span>
              {ssid === network.ssid && <Badge tone="primary">선택</Badge>}
            </button>
          ))}
        </section>
      )}
    </div>
  )
}

function StatusTile({ icon, label, value }) {
  return (
    <Card className="p-4">
      <span className="w-10 h-10 rounded-2xl bg-brand-primary/15 text-brand-primary flex items-center justify-center">
        {icon}
      </span>
      <p className="mt-3 text-xs font-bold text-brand-mute">{label}</p>
      <p className="mt-1 text-sm font-bold text-brand-brown truncate">{value}</p>
    </Card>
  )
}

function readLocal(key, fallback) {
  try { return localStorage.getItem(key) || fallback } catch { return fallback }
}

function writeLocal(key, value) {
  try { localStorage.setItem(key, value) } catch { /* ignore */ }
}

export default WifiSetup
