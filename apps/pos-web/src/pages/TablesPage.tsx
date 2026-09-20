import { useState } from 'react';
import { Users, Plus, RefreshCw } from 'lucide-react';

type TableStatus = 'FREE' | 'BUSY' | 'RESERVED' | 'BILLED';

interface RestaurantTable {
  id: string;
  number: string;
  seats: number;
  status: TableStatus;
  orderTotal?: number;
  waiter?: string;
  elapsedMin?: number;
}

const MOCK_TABLES: RestaurantTable[] = [
  { id: 't-1',  number: 'T01', seats: 2, status: 'FREE' },
  { id: 't-2',  number: 'T02', seats: 4, status: 'BUSY',     orderTotal: 840,  waiter: 'Raj',   elapsedMin: 22 },
  { id: 't-3',  number: 'T03', seats: 4, status: 'RESERVED', waiter: 'Priya' },
  { id: 't-4',  number: 'T04', seats: 6, status: 'BUSY',     orderTotal: 1560, waiter: 'Ankit', elapsedMin: 45 },
  { id: 't-5',  number: 'T05', seats: 2, status: 'BILLED',   orderTotal: 520,  waiter: 'Raj',   elapsedMin: 58 },
  { id: 't-6',  number: 'T06', seats: 2, status: 'FREE' },
  { id: 't-7',  number: 'T07', seats: 8, status: 'BUSY',     orderTotal: 2340, waiter: 'Sunita',elapsedMin: 31 },
  { id: 't-8',  number: 'T08', seats: 4, status: 'FREE' },
  { id: 't-9',  number: 'T09', seats: 2, status: 'BUSY',     orderTotal: 380,  waiter: 'Priya', elapsedMin: 12 },
  { id: 't-10', number: 'T10', seats: 4, status: 'FREE' },
  { id: 't-11', number: 'T11', seats: 6, status: 'BILLED',   orderTotal: 1820, waiter: 'Ankit', elapsedMin: 67 },
  { id: 't-12', number: 'T12', seats: 2, status: 'FREE' },
];

const STATUS_BADGE: Record<TableStatus, string> = {
  FREE:     'badge-free',
  BUSY:     'badge-busy',
  RESERVED: 'badge-reserved',
  BILLED:   'badge-billed',
};

const STATUS_CARD: Record<TableStatus, string> = {
  FREE:     'border-emerald-500/20 hover:border-emerald-500/40',
  BUSY:     'border-orange-500/30 hover:border-orange-500/50 bg-orange-500/5',
  RESERVED: 'border-purple-500/30 hover:border-purple-500/50 bg-purple-500/5',
  BILLED:   'border-blue-500/30 hover:border-blue-500/50 bg-blue-500/5',
};

export default function TablesPage() {
  const [filter, setFilter] = useState<TableStatus | 'ALL'>('ALL');
  const [selected, setSelected] = useState<RestaurantTable | null>(null);

  const tables = filter === 'ALL' ? MOCK_TABLES : MOCK_TABLES.filter(t => t.status === filter);
  const stats = {
    free:     MOCK_TABLES.filter(t => t.status === 'FREE').length,
    busy:     MOCK_TABLES.filter(t => t.status === 'BUSY').length,
    reserved: MOCK_TABLES.filter(t => t.status === 'RESERVED').length,
    billed:   MOCK_TABLES.filter(t => t.status === 'BILLED').length,
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {([
          { label: 'Free',     count: stats.free,     cls: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/20' },
          { label: 'Occupied', count: stats.busy,     cls: 'text-orange-400',  bg: 'bg-orange-500/5 border-orange-500/20' },
          { label: 'Reserved', count: stats.reserved, cls: 'text-purple-400',  bg: 'bg-purple-500/5 border-purple-500/20' },
          { label: 'Billed',   count: stats.billed,   cls: 'text-blue-400',    bg: 'bg-blue-500/5 border-blue-500/20' },
        ] as const).map(s => (
          <div key={s.label} className={`card p-4 border ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.cls} text-money`}>{s.count}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter + actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['ALL', 'FREE', 'BUSY', 'RESERVED', 'BILLED'] as const).map(f => (
          <button
            key={f}
            id={`filter-table-${f.toLowerCase()}`}
            onClick={() => setFilter(f)}
            className={`btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost border border-white/10'}`}
          >
            {f === 'ALL' ? 'All Tables' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button id="btn-refresh-tables" className="btn-ghost btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button id="btn-add-table" className="btn-primary btn-sm">
            <Plus size={14} /> Add Table
          </button>
        </div>
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 overflow-y-auto scrollbar-thin flex-1 content-start">
        {tables.map(table => (
          <button
            key={table.id}
            id={`table-${table.id}`}
            onClick={() => setSelected(table)}
            className={`card border transition-all duration-200 p-4 text-left cursor-pointer ${STATUS_CARD[table.status]} ${selected?.id === table.id ? 'ring-2 ring-brand-500' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-lg font-bold text-white">{table.number}</span>
              <span className={STATUS_BADGE[table.status]}>{table.status}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-xs mb-2">
              <Users size={11} /> <span>{table.seats} seats</span>
            </div>
            {table.orderTotal && (
              <p className="text-money text-xs font-semibold text-slate-300">₹{table.orderTotal}</p>
            )}
            {table.elapsedMin && (
              <p className="text-xs text-slate-500 mt-0.5">{table.elapsedMin}m elapsed</p>
            )}
            {table.waiter && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{table.waiter}</p>
            )}
          </button>
        ))}
      </div>

      {/* Detail sidebar */}
      {selected && (
        <div className="fixed inset-y-0 right-0 w-72 bg-surface-900 border-l border-white/5 p-6 flex flex-col gap-4 z-40 animate-slide-down shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Table {selected.number}</h2>
            <button id="btn-close-table-detail" onClick={() => setSelected(null)} className="btn-ghost p-1.5 rounded-lg">×</button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <span className={STATUS_BADGE[selected.status]}>{selected.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Seats</span>
              <span className="text-white">{selected.seats}</span>
            </div>
            {selected.waiter && (
              <div className="flex justify-between">
                <span className="text-slate-400">Waiter</span>
                <span className="text-white">{selected.waiter}</span>
              </div>
            )}
            {selected.orderTotal && (
              <div className="flex justify-between">
                <span className="text-slate-400">Running Total</span>
                <span className="text-money text-white font-semibold">₹{selected.orderTotal}</span>
              </div>
            )}
            {selected.elapsedMin && (
              <div className="flex justify-between">
                <span className="text-slate-400">Elapsed</span>
                <span className={`text-white ${selected.elapsedMin > 60 ? 'text-red-400' : ''}`}>{selected.elapsedMin}m</span>
              </div>
            )}
          </div>
          <div className="mt-auto space-y-2">
            {selected.status === 'FREE' && (
              <button id="btn-open-table" className="btn-primary w-full">Open Table</button>
            )}
            {selected.status === 'BUSY' && (
              <>
                <button id="btn-add-items" className="btn-primary w-full">+ Add Items</button>
                <button id="btn-print-kot" className="btn-ghost w-full border border-white/10">Print KOT</button>
              </>
            )}
            {selected.status === 'BILLED' && (
              <button id="btn-settle-payment" className="btn-success w-full">Settle Payment</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
