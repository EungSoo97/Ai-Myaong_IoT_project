import { useEffect, useState } from 'react'
import { api } from '../api/api'

/* ───────────────────────────────────────────────────────────
 * 디스펜서 1회 제공량 설정 (사료 g / 물 ml)
 *
 * 단일 출처 = DB(settings.feed_amount / water_amount).
 * 화면 간 공유(디스펜서 ↔ 대시보드 빠른배식)는 메모리 캐시 + 커스텀 이벤트로 처리한다.
 * localStorage·폴백 없음 → DB값 도착 전이나 미설정 시에는 아래 기본값으로 동작한다.
 * ─────────────────────────────────────────────────────────── */

const DEFAULTS = { food: 150, water: 160 } // DB값 도착 전 / 미설정 시 기본값 (슬라이더 중앙값)
let cache = { ...DEFAULTS }

export function getFeedSettings() {
  return { ...cache }
}

/* 메모리 캐시 갱신 + 같은 세션 내 다른 화면에 알림 */
function setCache(next) {
  cache = { ...cache, ...next }
  window.dispatchEvent(new Event('dispenser-changed'))
}

export function setFoodAmount(food) {
  setCache({ food: Number(food) })
  api.updateSettings({ feed_amount: Number(food) }).catch(() => {}) // DB 저장
}

export function setWaterAmount(water) {
  setCache({ water: Number(water) })
  api.updateSettings({ water_amount: Number(water) }).catch(() => {}) // DB 저장
}

/* DB(settings)에서 제공량을 불러와 캐시에 반영한다. */
export function hydrateFeedSettings() {
  return api
    .getSettings()
    .then((s) => {
      const next = {}
      if (s.feed_amount != null) next.food = Number(s.feed_amount)
      if (s.water_amount != null) next.water = Number(s.water_amount)
      if (Object.keys(next).length) setCache(next)
    })
    .catch(() => {})
}

/* React 훅 — 제공량 설정 구독 + 마운트 시 DB값으로 동기화 */
export function useFeedSettings() {
  const [s, setS] = useState(getFeedSettings)

  useEffect(() => {
    const refresh = () => setS(getFeedSettings())
    window.addEventListener('dispenser-changed', refresh)
    hydrateFeedSettings() // 로그인 상태면 DB값으로 동기화
    return () => window.removeEventListener('dispenser-changed', refresh)
  }, [])

  return s
}
