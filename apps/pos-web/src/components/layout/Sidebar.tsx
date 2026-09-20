import {
  ShoppingCart, LayoutGrid, Utensils, Receipt, BookOpen,
  BarChart3, Package, LogOut, ChefHat, LucideIcon,
} from 'lucide-react';
import type { PageKey } from '../../App';
import { useAuthStore } from '../../store/auth.store';

const NAV_ITEMS: { key: PageKey; label: string; icon: LucideIcon }[] = [
  { key: 'pos',       label: 'POS',       icon: ShoppingCart },
  { key: 'tables',    label: 'Tables',    icon: LayoutGrid },
  { key: 'kitchen',   label: 'Kitchen',   icon: Utensils },
  { key: 'billing',   label: 'Billing',   icon: Receipt },
  { key: 'menu',      label: 'Menu',      icon: BookOpen },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'reports',   label: 'Reports',   icon: BarChart3 },
];

interface SidebarProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { user, logout } = useAuthStore();

  return (
    <aside className="flex flex-col w-16 lg:w-56 bg-surface-900 border-r border-white/5 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-white/5">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-glow-brand">
          <ChefHat size={18} className="text-white" />
        </div>
        <div className="hidden lg:block min-w-0">
          <p className="text-sm font-semibold text-white truncate">Restro POS</p>
          <p className="text-xs text-slate-400 truncate">{user?.branchId ?? 'Branch'}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = currentPage === key;
          return (
            <button
              key={key}
              id={`nav-${key}`}
              onClick={() => onNavigate(key)}
              className={active ? 'nav-item-active w-full' : 'nav-item w-full'}
              title={label}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="hidden lg:block">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div className="p-2 border-t border-white/5">
        <div className="hidden lg:block px-3 py-2 mb-1 min-w-0">
          <p className="text-xs font-medium text-slate-200 truncate">{user?.name}</p>
          <p className="text-xs text-slate-500 truncate capitalize">{user?.role?.toLowerCase()}</p>
        </div>
        <button
          id="btn-logout"
          onClick={logout}
          className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          title="Logout"
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span className="hidden lg:block">Logout</span>
        </button>
      </div>
    </aside>
  );
}
