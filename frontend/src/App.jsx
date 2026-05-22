import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { BottomTabBar } from './components/BottomTabBar'
import { Dashboard } from './pages/Dashboard'
import { RobotVision } from './pages/RobotVision'
import { Dispenser } from './pages/Dispenser'
import { Settings } from './pages/Settings'
import { LoginPage } from './pages/LoginPage'
import { Menu, Monitor, Smartphone } from 'lucide-react'

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [viewMode, setViewMode] = useState('auto') // 'auto', 'desktop', 'mobile'
  const [isMobile, setIsMobile] = useState(false)
  const userName = '김민수'

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleMenuChange = (menu) => {
    setActiveMenu(menu)
    setMobileMenuOpen(false)
  }

  const renderPage = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard userName={userName} />
      case 'robot-vision':
        return <RobotVision />
      case 'dispenser':
        return <Dispenser />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard userName={userName} />
    }
  }

  // Determine if should show mobile layout
  const showMobileLayout = viewMode === 'mobile' || (viewMode === 'auto' && isMobile)

  if (!authenticated) {
    return <LoginPage onLogin={() => setAuthenticated(true)} />
  }

  // Mobile App Layout
  if (showMobileLayout) {
    return (
      <div className="h-full flex flex-col bg-background safe-area-top">
        {/* Mobile Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <h1 className="text-lg font-bold text-foreground">PetCare IoT</h1>
          <button
            onClick={() => setViewMode('desktop')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors touch-active"
            title="데스크탑 버전"
          >
            <Monitor className="w-5 h-5" />
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 pb-20">
          {renderPage()}
        </main>

        {/* Bottom Tab Bar */}
        <BottomTabBar 
          activeMenu={activeMenu} 
          onMenuChange={handleMenuChange} 
        />
      </div>
    )
  }

  // Desktop Layout
  return (
    <div className="h-full flex bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          activeMenu={activeMenu}
          onMenuChange={handleMenuChange}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          userName={userName}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          activeMenu={activeMenu}
          onMenuChange={handleMenuChange}
          collapsed={false}
          onToggleCollapse={() => setMobileMenuOpen(false)}
          userName={userName}
        />
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
      }`}>
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary md:hidden transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1 className="text-lg font-bold text-foreground md:hidden">PetCare IoT</h1>

          <div className="hidden md:block" />
          
          {/* View mode toggle */}
          <button
            onClick={() => setViewMode('mobile')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="모바일 버전"
          >
            <Smartphone className="w-5 h-5" />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default App
