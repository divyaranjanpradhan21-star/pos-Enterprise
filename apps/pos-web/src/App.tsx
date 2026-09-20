import { useEffect, useState } from 'react';
import { useAuthStore } from './store/auth.store';
import { startOutboxSync } from './lib/sync';
import LoginPage from './pages/LoginPage';
import Shell from './components/layout/Shell';

// Pages
import POSPage from './pages/POSPage';
import TablesPage from './pages/TablesPage';
import KitchenPage from './pages/KitchenPage';
import BillingPage from './pages/BillingPage';
import MenuPage from './pages/MenuPage';
import ReportsPage from './pages/ReportsPage';
import InventoryPage from './pages/InventoryPage';

export type PageKey = 'pos' | 'tables' | 'kitchen' | 'billing' | 'menu' | 'reports' | 'inventory';

export default function App() {
  const { isAuthenticated } = useAuthStore();
  const [page, setPage] = useState<PageKey>('pos');

  useEffect(() => {
    if (isAuthenticated) startOutboxSync();
  }, [isAuthenticated]);

  if (!isAuthenticated) return <LoginPage />;

  const pageMap: Record<PageKey, JSX.Element> = {
    pos:       <POSPage />,
    tables:    <TablesPage />,
    kitchen:   <KitchenPage />,
    billing:   <BillingPage />,
    menu:      <MenuPage />,
    reports:   <ReportsPage />,
    inventory: <InventoryPage />,
  };

  return (
    <Shell currentPage={page} onNavigate={setPage}>
      {pageMap[page]}
    </Shell>
  );
}
