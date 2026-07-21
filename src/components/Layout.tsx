import { NavLink, Outlet } from 'react-router-dom'
import { Users, Swords, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme, useMembers } from '@/store/config'

const navItems = [
  { to: '/players', label: 'Joueurs', Icon: Users },
  { to: '/game', label: 'Partie', Icon: Swords },
]

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
      title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
      aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

export default function Layout() {
  const { members } = useMembers()
  const count = members.length

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar — desktop only */}
      <nav className="hidden md:flex w-56 shrink-0 bg-slate-900 text-slate-100 flex-col">
        <div className="px-5 py-6 border-b border-slate-800">
          <span className="text-lg font-bold tracking-tight text-white">🀄 Kin</span>
          <p className="text-xs text-slate-400 mt-0.5">Royaumes combattants</p>
        </div>
        <ul className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                )}
              >
                <Icon size={18} />
                {label}
                {to === '/players' && count > 0 && (
                  <span className="ml-auto rounded-full bg-slate-700 px-2 py-0.5 text-xs">{count}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header
          className="bg-slate-900 border-b border-slate-800 px-4 flex items-center gap-3 shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(3.5rem + env(safe-area-inset-top))' }}
        >
          <span className="md:hidden text-base font-bold text-white">🀄 Kin</span>
          <div className="flex-1" />
          <ThemeToggle />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          <Outlet />
        </main>

        {/* Bottom nav — mobile only */}
        <nav
          className="md:hidden bg-slate-900 border-t border-slate-800 flex shrink-0"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors relative',
                isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300',
              )}
            >
              <Icon size={22} />
              {label}
              {to === '/players' && count > 0 && (
                <span className="absolute top-1.5 right-[calc(50%-1.75rem)] rounded-full bg-emerald-500 text-white text-[10px] leading-none px-1.5 py-0.5 font-semibold">
                  {count}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
