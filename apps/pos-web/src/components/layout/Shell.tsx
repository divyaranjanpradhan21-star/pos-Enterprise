import type { ReactNode } from 'react';
import type { PageKey } from '../../App';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import OnlineIndicator from '../ui/OnlineIndicator';

interface ShellProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}

export default function Shell({ currentPage, onNavigate, children }: ShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-950">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar currentPage={currentPage} />
        <main className="flex-1 overflow-hidden relative">
          <div className="h-full overflow-y-auto scrollbar-thin p-4 lg:p-6 animate-fade-in">
            {children}
          </div>
        </main>
        <div className="fixed bottom-4 right-4 z-50">
          <OnlineIndicator />
        </div>
      </div>
    </div>
  );
}
