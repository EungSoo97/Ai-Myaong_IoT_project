import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  RefreshCw,
  Router,
  Search,
  Signal,
  Wifi,
} from 'lucide-react'
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
  const [piStatus, setPiStatus] = useState(null)
  const [networks, setNetworks] = useState([])
  const [selectedNetwork, setSelectedNetwork] = useState(null)
  const [manualSsid, setManualSsid] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [piApFallback, setPiApFallback] = useState(false)

  const selectedSsid = selectedNetwork?.ssid || manualSsid.trim()
  const selectedIsSecure = selectedNetwork?.secure ?? true
  const selectedIsCompatible = selectedNetwork?.compatible ?? selectedNetwork?.esp32Compatible ?? true
  const sortedNetworks = useMemo(
    () => [...networks].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999)),
    [networks],
  )

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

  async function scanWifi() {
    setBusy(true)
    setMessage('주변 Wi-Fi를 검색하는 중입니다.')
    try {
      let data
      try {
        data = await api.scanPiWifi()
      } catch {
        data = await esp32Request('/api/wifi/scan')
      }

      const nextNetworks = data.networks || []
      setNetworks(nextNetworks)
      setSelectedNetwork(null)
      setManualSsid('')
      setPassword('')
      setMessage(nextNetworks.length ? '검색 완료' : '검색된 Wi-Fi가 없습니다.')
      await refreshStatus({ silent: true })
    } catch (error) {
      setMessage(error.message || 'Wi-Fi 검색에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  function chooseNetwork(network) {
    setSelectedNetwork(network)
    setManualSsid('')
    setPassword('')
    if ((network.compatible ?? network.esp32Compatible ?? true) === false) {
      setMessage('ESP32는 2.4GHz Wi-Fi만 지원합니다. 라즈베리파이와 ESP32를 같이 연결하려면 2.4GHz 네트워크를 선택하세요.')
    } else {
      setMessage('')
    }
  }

  async function saveWifi() {
    if (!selectedSsid) {
      setMessage('연결할 Wi-Fi를 선택하거나 SSID를 입력하세요.')
      return
    }
    if (!selectedIsCompatible) {
      setMessage('선택한 Wi-Fi는 ESP32가 지원하지 않습니다. 2.4GHz 네트워크를 선택하세요.')
      return
    }
    if (selectedIsSecure && !password) {
      setMessage('비밀번호를 입력하세요.')
      return
    }

    setBusy(true)
    setMessage('ESP32 설정 저장 중입니다.')
    try {
      const data = await esp32Request('/api/wifi/connect', {
        method: 'POST',
        body: JSON.stringify({ ssid: selectedSsid, password, mqttHost, reboot: false }),
      })
      setMessage(data.rebooting ? '저장 완료. ESP32 재부팅 중입니다.' : '저장 완료.')
    } catch (error) {
      setMessage(error.message || 'ESP32 설정 저장에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function saveSharedWifi() {
    if (!selectedSsid) {
      setMessage('연결할 Wi-Fi를 선택하거나 SSID를 입력하세요.')
      return
    }
    if (!selectedIsCompatible) {
      setMessage('선택한 Wi-Fi는 ESP32가 지원하지 않습니다. 2.4GHz 네트워크를 선택하세요.')
      return
    }
    if (selectedIsSecure && !password) {
      setMessage('비밀번호를 입력하세요.')
      return
    }

    setBusy(true)
    setMessage('라즈베리파이와 ESP32 설정 적용 중입니다.')
    try {
      let data
      try {
        data = await api.configurePiWifi({
          ssid: selectedSsid,
          password,
          mqttHost: mqttHost.trim() || 'auto',
          mqttPort: 1883,
          esp32SetupUrl: setupUrl,
          piApFallback,
        })
      } catch {
        data = await api.configureSharedWifi({
          ssid: selectedSsid,
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
          <h1 className="font-display text-2xl font-bold text-brand-brown leading-tight">Wi-Fi</h1>
          <p className="mt-1 text-sm text-brand-mute truncate">{piStatus?.wifiSsid || '연결 설정'}</p>
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
        <input
          value={mqttHost}
          onChange={(event) => setMqttHost(event.target.value)}
          className="mt-3 w-full rounded-2xl border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-brown outline-none focus:border-brand-primary"
          placeholder="MQTT 호스트 IP 또는 비우면 자동"
        />
      </Card>

      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="font-display text-base font-bold text-brand-brown">네트워크</h2>
          <GhostButton className="px-3 py-2 rounded-2xl text-sm" onClick={scanWifi} disabled={busy}>
            <Search className="w-4 h-4" />
            스캔
          </GhostButton>
        </div>

        <div className="overflow-hidden rounded-3xl border border-brand-line bg-brand-card shadow-soft">
          {sortedNetworks.length > 0 ? (
            sortedNetworks.map((network, index) => (
              <NetworkRow
                key={`${network.ssid}-${network.channel}-${index}`}
                network={network}
                selected={selectedNetwork?.ssid === network.ssid && selectedNetwork?.channel === network.channel}
                onClick={() => chooseNetwork(network)}
              />
            ))
          ) : (
            <div className="px-4 py-5 text-sm font-semibold text-brand-mute">스캔을 눌러 주변 Wi-Fi를 검색하세요.</div>
          )}
        </div>
      </section>

      <Card className="mt-4 p-4">
        <p className="text-xs font-bold text-brand-mute">선택한 네트워크</p>
        <input
          value={selectedNetwork?.ssid || manualSsid}
          onChange={(event) => {
            setSelectedNetwork(null)
            setManualSsid(event.target.value)
          }}
          className="mt-2 w-full rounded-2xl border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-brown outline-none focus:border-brand-primary"
          placeholder="목록에서 선택하거나 SSID 직접 입력"
        />
        {selectedSsid && (
          <>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="mt-2 w-full rounded-2xl border border-brand-line bg-white px-3 py-2.5 text-sm font-semibold text-brand-brown outline-none focus:border-brand-primary"
              placeholder={selectedIsSecure ? '비밀번호' : '개방형 네트워크'}
              disabled={!selectedIsSecure}
            />
            <PrimaryButton className="mt-3 w-full rounded-2xl" onClick={saveSharedWifi} disabled={busy || !selectedIsCompatible}>
              <Wifi className="w-4 h-4" />
              연결
            </PrimaryButton>
            <GhostButton className="mt-2 w-full rounded-2xl" onClick={saveWifi} disabled={busy || !selectedIsCompatible}>
              <CheckCircle2 className="w-4 h-4" />
              ESP32만 저장
            </GhostButton>
            <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-brand-cream px-3 py-2.5">
              <span className="text-xs font-bold text-brand-brown">실패 시 Pi AP 모드</span>
              <input
                type="checkbox"
                checked={piApFallback}
                onChange={(event) => setPiApFallback(event.target.checked)}
                className="h-4 w-4 accent-brand-primary"
              />
            </label>
          </>
        )}
        {message && <p className="mt-3 text-xs font-bold text-brand-mute">{message}</p>}
      </Card>
    </div>
  )
}

function NetworkRow({ network, selected, onClick }) {
  const compatible = network.compatible ?? network.esp32Compatible ?? true
  const band = network.band || (network.channel >= 1 && network.channel <= 14 ? '2.4GHz' : '')

  return (
    <button
      type="button"
      className={`w-full flex items-center gap-3 border-b border-brand-line px-4 py-3 text-left last:border-b-0 touch-active ${selected ? 'bg-brand-primary/10' : 'bg-white'}`}
      onClick={onClick}
    >
      <span className="w-10 h-10 rounded-2xl bg-brand-cream text-brand-brown flex items-center justify-center shrink-0">
        {network.secure ? <Lock className="w-4 h-4" /> : <Signal className="w-4 h-4" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-brand-brown truncate">{network.ssid || '숨겨진 네트워크'}</span>
        <span className="block text-xs text-brand-mute">
          신호 {network.rssi} · CH {network.channel || '-'}{band ? ` · ${band}` : ''}
          {!compatible ? ' · ESP32 미지원' : ''}
        </span>
      </span>
      {selected ? <Badge tone="primary">선택</Badge> : !compatible ? <Badge tone="warn">5GHz</Badge> : null}
    </button>
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
