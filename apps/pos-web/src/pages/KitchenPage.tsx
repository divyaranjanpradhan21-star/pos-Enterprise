import { useState, useEffect } from 'react';
import { Timer, ChefHat, CheckCircle, AlertCircle } from 'lucide-react';

type KotStatus = 'PENDING' | 'PREPARING' | 'READY';

interface KotItem {
  name: string;
  qty: number;
  notes?: string;
}

interface KotCard {
  id: string;
  tableNo: string;
  orderType: string;
  kotNo: string;
  status: KotStatus;
  items: KotItem[];
  createdAt: Date;
}

const INITIAL_KOTS: KotCard[] = [
  {
    id: 'k-1', tableNo: 'T02', orderType: 'DINE_IN', kotNo: 'KOT-0041', status: 'PENDING',
    items: [{ name: 'Paneer Tikka', qty: 1 }, { name: 'Butter Naan', qty: 2 }],
    createdAt: new Date(Date.now() - 3 * 60_000),
  },
  {
    id: 'k-2', tableNo: 'T04', orderType: 'DINE_IN', kotNo: 'KOT-0042', status: 'PREPARING',
    items: [{ name: 'Butter Chicken', qty: 2 }, { name: 'Dal Makhani', qty: 1 }, { name: 'Garlic Naan', qty: 4 }],
    createdAt: new Date(Date.now() - 12 * 60_000),
  },
  {
    id: 'k-3', tableNo: 'T07', orderType: 'DINE_IN', kotNo: 'KOT-0043', status: 'PREPARING',
    items: [{ name: 'Mutton Rogan Josh', qty: 2, notes: 'Extra spicy' }, { name: 'Tandoori Roti', qty: 4 }],
    createdAt: new Date(Date.now() - 8 * 60_000),
  },
  {
    id: 'k-4', tableNo: 'TKY-01', orderType: 'TAKEAWAY', kotNo: 'KOT-0044', status: 'READY',
    items: [{ name: 'Chicken Wings', qty: 2 }, { name: 'Mango Lassi', qty: 2 }],
    createdAt: new Date(Date.now() - 20 * 60_000),
  },
  {
    id: 'k-5', tableNo: 'T09', orderType: 'DINE_IN', kotNo: 'KOT-0045', status: 'PENDING',
    items: [{ name: 'Veg Seekh Kebab', qty: 1 }, { name: 'Fresh Lime Soda', qty: 2 }],
    createdAt: new Date(Date.now() - 1 * 60_000),
  },
];

function ElapsedTimer({ since }: { since: Date }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - since.getTime()) / 1000));
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const isWarning = m >= 15;
  return (
    <span className={`text-money text-xs flex items-center gap-1 ${isWarning ? 'text-red-400 animate-pulse-fast' : 'text-slate-400'}`}>
      <Timer size={11} />
      {m}:{s.toString().padStart(2, '0')}
    </span>
  );
}

export default function KitchenPage() {
  const [kots, setKots] = useState<KotCard[]>(INITIAL_KOTS);
  const [filter, setFilter] = useState<KotStatus | 'ALL'>('ALL');

  function advance(id: string) {
    setKots(prev => prev.map(k => {
      if (k.id !== id) return k;
      const next: KotStatus = k.status === 'PENDING' ? 'PREPARING' : 'READY';
      return { ...k, status: next };
    }));
  }

  function bump(id: string) {
    setKots(prev => prev.filter(k => k.id !== id));
  }

  const visible = filter === 'ALL' ? kots : kots.filter(k => k.status === filter);

  const counts = {
    PENDING:   kots.filter(k => k.status === 'PENDING').length,
    PREPARING: kots.filter(k => k.status === 'PREPARING').length,
    READY:     kots.filter(k => k.status === 'READY').length,
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle size={14} className="text-yellow-400" />
            <span className="text-xs font-medium text-yellow-400">{counts.PENDING} Pending</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <ChefHat size={14} className="text-orange-400" />
            <span className="text-xs font-medium text-orange-400">{counts.PREPARING} Preparing</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle size={14} className="text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">{counts.READY} Ready</span>
          </div>
        </div>
        <div className="ml-auto flex gap-1.5">
          {(['ALL', 'PENDING', 'PREPARING', 'READY'] as const).map(f => (
            <button
              key={f}
              id={`kds-filter-${f.toLowerCase()}`}
              onClick={() => setFilter(f)}
              className={`btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost border border-white/10'}`}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KDS Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto scrollbar-thin flex-1 content-start">
        {visible.map(kot => (
          <div
            key={kot.id}
            className={`kds-card-${kot.status.toLowerCase()} animate-slide-up`}
          >
            {/* Card header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{kot.tableNo}</p>
                <p className="text-xs text-slate-400">{kot.kotNo} · {kot.orderType.replace('_', ' ')}</p>
              </div>
              <ElapsedTimer since={kot.createdAt} />
            </div>

            {/* Items */}
            <div className="space-y-1 border-t border-white/5 pt-2">
              {kot.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="font-mono text-xs font-bold text-slate-300 w-5 flex-shrink-0">{item.qty}×</span>
                  <div className="min-w-0">
                    <span className="text-slate-200">{item.name}</span>
                    {item.notes && (
                      <p className="text-xs text-orange-400 mt-0.5">{item.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-1">
              {kot.status !== 'READY' && (
                <button
                  id={`btn-advance-${kot.id}`}
                  onClick={() => advance(kot.id)}
                  className={`btn flex-1 text-xs py-1.5 ${kot.status === 'PENDING' ? 'btn-ghost border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10' : 'btn-ghost border border-orange-500/30 text-orange-400 hover:bg-orange-500/10'}`}
                >
                  {kot.status === 'PENDING' ? '▶ Start' : '✓ Mark Ready'}
                </button>
              )}
              {kot.status === 'READY' && (
                <button
                  id={`btn-bump-${kot.id}`}
                  onClick={() => bump(kot.id)}
                  className="btn flex-1 text-xs py-1.5 btn-success"
                >
                  ✓ Bump (Served)
                </button>
              )}
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center gap-2 py-20 text-slate-500">
            <ChefHat size={40} className="opacity-20" />
            <p className="text-sm">No {filter === 'ALL' ? '' : filter.toLowerCase()} orders in kitchen</p>
          </div>
        )}
      </div>
    </div>
  );
}
