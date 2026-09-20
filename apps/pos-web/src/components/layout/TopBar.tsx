import { Bell, Search } from 'lucide-react';
import type { PageKey } from '../../App';

const PAGE_TITLES: Record<PageKey, string> = {
  pos:       'Point of Sale',
  tables:    'Table Management',
  kitchen:   'Kitchen Display',
  billing:   'Billing & Payments',
  menu:      'Menu Management',
  inventory: 'Inventory',
  reports:   'Reports & Analytics',
};

interface TopBarProps {
  currentPage: PageKey;
}

export default function TopBar({ currentPage }: TopBarProps) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header className="flex items-center justify-between px-4 lg:px-6 h-14 bg-surface-900 border-b border-white/5 shrink-0">
      <div>
        <h1 className="text-sm lg:text-base font-semibold text-white">{PAGE_TITLES[currentPage]}</h1>
        <p className="text-xs text-slate-400 hidden lg:block">{dateStr} · {timeStr}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          id="btn-search"
          className="btn-ghost rounded-lg p-2 hidden md:flex"
          title="Search"
        >
          <Search size={16} />
        </button>
        <button
          id="btn-notifications"
          className="btn-ghost rounded-lg p-2 relative"
          title="Notifications"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-500" />
        </button>
      </div>
    </header>
  );
}
