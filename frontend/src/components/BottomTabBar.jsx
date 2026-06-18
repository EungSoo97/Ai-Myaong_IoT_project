import { NavLink } from 'react-router-dom'
/*
 * 하단 탭 아이콘: Phosphor Icons (https://phosphoricons.com, MIT License)
 *   - react-icons(MIT, https://react-icons.github.io/react-icons)의 `pi` 세트를 통해 사용
 *   - 비활성: Duotone(부드러운 투톤) / 활성: Fill(꽉 찬) — 둥글둥글 귀여운 고양이 느낌
 */
import {
  PiHouseDuotone, PiHouseFill,
  PiVideoCameraDuotone, PiVideoCameraFill,
  PiBowlFoodDuotone, PiBowlFoodFill,
  PiGearSixDuotone, PiGearSixFill,
  PiCatDuotone, PiCatFill,
} from 'react-icons/pi'

const TABS = [
  { to: '/', label: '대시보드', Icon: PiHouseDuotone, IconActive: PiHouseFill, end: true, tour: 'dashboard' },
  { to: '/vision', label: '로봇 비전', Icon: PiVideoCameraDuotone, IconActive: PiVideoCameraFill, tour: 'vision' },
  { to: '/dispenser', label: '디스펜서', Icon: PiBowlFoodDuotone, IconActive: PiBowlFoodFill, tour: 'dispenser' },
  { to: '/settings', label: '설정', Icon: PiGearSixDuotone, IconActive: PiGearSixFill },
  { to: '/mypage', label: '마이 페이지', Icon: PiCatDuotone, IconActive: PiCatFill },
]

export function BottomTabBar() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 bg-brand-card/95 backdrop-blur-md border-t border-brand-line pb-safe">
      <ul className="flex justify-around items-stretch px-2 pt-1.5">
        {TABS.map(({ to, label, Icon, IconActive, end, tour }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              data-tour={tour}
              className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-2xl no-select touch-active"
            >
              {({ isActive }) => {
                const TabIcon = isActive ? IconActive : Icon
                return (
                  <>
                    <span
                      className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-colors ${
                        isActive ? 'bg-brand-primary/15' : 'bg-transparent'
                      }`}
                    >
                      <TabIcon
                        className={`w-6 h-6 transition-transform ${
                          isActive ? 'text-brand-primary scale-110' : 'text-brand-mute'
                        }`}
                      />
                    </span>
                    <span className={`text-[10px] font-semibold whitespace-nowrap ${isActive ? 'text-brand-primary' : 'text-brand-mute'}`}>
                      {label}
                    </span>
                  </>
                )
              }}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
