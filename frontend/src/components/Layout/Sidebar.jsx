import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, LogOut, Zap, ShieldCheck, Clock,
  Warehouse, CalendarClock, BarChart3, Smartphone, Users, Settings
} from 'lucide-react';
import { LiveDot } from '../common';

const NAV_ITEMS = [
  { to: '/',          label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { to: '/gate',      label: 'Gate Entry',   icon: ShieldCheck },
  { to: '/docks',     label: 'Dock Schedule',icon: CalendarClock },
  { to: '/bays',      label: 'Loading Bays', icon: Warehouse },
  { to: '/detention', label: 'Detention',    icon: Clock },
  { to: '/analytics', label: 'Analytics',    icon: BarChart3 },
];

const ADMIN_ITEMS = [
  { to: '/users',    label: 'Users',    icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
    ${isActive
      ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'}`;

  return (
    <aside className="w-60 flex-shrink-0 h-screen sticky top-0 flex flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Logo — same Zap icon, teal color */}
      <div className="px-5 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-zinc-950 fill-zinc-950" />
          </div>
          <div>
            <p className="font-display font-800 text-base text-zinc-100 leading-none">HaulSync</p>
            <p className="text-xs text-zinc-500 mt-0.5">In-Plant Module</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 px-1">
          <LiveDot color="teal" />
          <span className="text-xs text-zinc-500">Live operations</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-3 py-1 text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">Operations</p>
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
          <NavLink key={to} to={to} end={exact} className={linkClass}>
            <Icon size={16} className="flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}

        {isAdmin && isAdmin() && (
          <>
            <p className="px-3 py-1 text-xs font-semibold text-zinc-600 uppercase tracking-wider mt-4 mb-2">Admin</p>
            {ADMIN_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon size={16} className="flex-shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-900">
          <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-teal-400">{user?.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">{user?.name}</p>
            <p className="text-xs text-zinc-500 truncate">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
          <button onClick={handleLogout} className="text-zinc-500 hover:text-red-400 transition-colors p-1 rounded">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
