import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  IconDashboard,
  IconCampaign,
  IconOffer,
  IconReports,
  IconClickLogs,
  IconBell,
  IconSparkles,
  IconSettings,
} from './Icons'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { to: '/campaigns', label: 'Campaigns', icon: IconCampaign },
  { to: '/offers', label: 'Offers', icon: IconOffer },
  { to: '/reports', label: 'Reports', icon: IconReports },
  { to: '/click-logs', label: 'Click Logs', icon: IconClickLogs },
  { to: '/notifications', label: 'Notifications', icon: IconBell },
  { to: '/ad-copy', label: 'Ad Copy Studio', icon: IconSparkles },
]

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
    isActive
      ? 'bg-gradient-to-r from-accent to-violet-500 text-white shadow-[0_2px_10px_-2px_rgba(99,102,241,0.6)]'
      : 'text-text-muted hover:bg-surface-2 hover:text-text'
  }`
}

function mobileNavLinkClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
    isActive
      ? 'bg-gradient-to-r from-accent to-violet-500 text-white shadow-[0_2px_10px_-2px_rgba(99,102,241,0.6)]'
      : 'text-text-muted hover:bg-surface-2 hover:text-text'
  }`
}

export function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const Logo = (
    <span className="flex items-center gap-2 whitespace-nowrap text-lg font-bold tracking-tight">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-violet-500 text-xs text-white shadow-[0_2px_10px_-2px_rgba(99,102,241,0.7)]">
        L
      </span>
      link
      <span className="bg-gradient-to-r from-accent to-cyan-400 bg-clip-text text-transparent">
        osystem
      </span>
    </span>
  )

  const Avatar = (
    <div
      title={user?.email ?? ''}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-cyan-400 text-sm font-semibold text-white shadow-[0_2px_10px_-2px_rgba(99,102,241,0.7)] ring-2 ring-surface-2"
    >
      {(user?.email?.[0] ?? '?').toUpperCase()}
    </div>
  )

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-surface/90 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5">
          <div className="flex items-center gap-6">
            {Logo}
            <nav className="hidden items-center gap-1 lg:flex">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  <item.icon width={15} height={15} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <NavLink
              to="/settings"
              title="Settings"
              className={({ isActive }) =>
                `rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text ${isActive ? 'bg-surface-2 text-accent' : ''}`
              }
            >
              <IconSettings width={18} height={18} />
            </NavLink>
            {Avatar}
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent/40 hover:bg-surface-2 hover:text-text"
            >
              Sign Out
            </button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {Avatar}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-accent/40 hover:bg-surface-2 hover:text-text"
            >
              {menuOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-border/80 bg-surface px-3 py-3 lg:hidden">
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={mobileNavLinkClass}>
                  <item.icon width={17} height={17} />
                  {item.label}
                </NavLink>
              ))}
              <NavLink to="/settings" className={mobileNavLinkClass}>
                <IconSettings width={17} height={17} />
                Settings
              </NavLink>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="truncate text-xs text-text-muted">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-accent/40 hover:bg-surface-2 hover:text-text"
              >
                Sign Out
              </button>
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-[1600px] p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}
