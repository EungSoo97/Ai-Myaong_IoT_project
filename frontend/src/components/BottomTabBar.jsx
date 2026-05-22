import { LayoutDashboard, Camera, Cookie, Settings } from 'lucide-react'

const menuItems = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'robot-vision', label: '로봇비전', icon: Camera },
  { id: 'dispenser', label: '디스펜서', icon: Cookie },
  { id: 'settings', label: '세팅', icon: Settings },
]

export function BottomTabBar({ activeMenu, onMenuChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-bottom z-50">
      <div className="flex items-center justify-around py-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeMenu === item.id
          return (
            <button
              key={item.id}
              onClick={() => onMenuChange(item.id)}
              className={`
                flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-all touch-active
                ${isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
                }
              `}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className={`text-xs mt-1 font-medium ${isActive ? 'text-primary' : ''}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
