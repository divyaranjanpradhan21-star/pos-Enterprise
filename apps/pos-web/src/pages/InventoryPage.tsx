import { useState } from 'react';
import { AlertTriangle, Package, Plus, ArrowUpDown } from 'lucide-react';

interface IngredientStock {
  id: string;
  name: string;
  unit: string;
  current: number;
  minLevel: number;
  maxLevel: number;
  cost: number;
}

const STOCK: IngredientStock[] = [
  { id: 'i-1', name: 'Chicken',         unit: 'kg',  current: 12.5, minLevel: 5,   maxLevel: 50,  cost: 280 },
  { id: 'i-2', name: 'Paneer',           unit: 'kg',  current: 3.2,  minLevel: 4,   maxLevel: 20,  cost: 320 },
  { id: 'i-3', name: 'Basmati Rice',    unit: 'kg',  current: 28,   minLevel: 10,  maxLevel: 60,  cost: 90  },
  { id: 'i-4', name: 'Cooking Oil',     unit: 'ltr', current: 6.8,  minLevel: 5,   maxLevel: 30,  cost: 130 },
  { id: 'i-5', name: 'Tomatoes',        unit: 'kg',  current: 2.1,  minLevel: 3,   maxLevel: 20,  cost: 45  },
  { id: 'i-6', name: 'Onions',          unit: 'kg',  current: 15,   minLevel: 5,   maxLevel: 40,  cost: 30  },
  { id: 'i-7', name: 'Butter',          unit: 'kg',  current: 1.2,  minLevel: 2,   maxLevel: 10,  cost: 450 },
  { id: 'i-8', name: 'Mutton',          unit: 'kg',  current: 0.8,  minLevel: 3,   maxLevel: 20,  cost: 720 },
  { id: 'i-9', name: 'Wheat Flour',     unit: 'kg',  current: 22,   minLevel: 8,   maxLevel: 50,  cost: 45  },
  { id: 'i-10',name: 'Ginger-Garlic',   unit: 'kg',  current: 1.5,  minLevel: 1,   maxLevel: 8,   cost: 200 },
];

function StockBar({ current, min, max }: { current: number; min: number; max: number }) {
  const pct = Math.min((current / max) * 100, 100);
  const isCritical = current < min;
  const isLow = current < min * 1.5;
  const color = isCritical ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-emerald-500';
  return (
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock'>('name');

  const alertCount = STOCK.filter(i => i.current < i.minLevel).length;
  const lowCount   = STOCK.filter(i => i.current >= i.minLevel && i.current < i.minLevel * 1.5).length;

  const filtered = STOCK
    .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === 'name' ? a.name.localeCompare(b.name) : (a.current / a.minLevel) - (b.current / b.minLevel));

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Alert banner */}
      {alertCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 animate-slide-down">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">
            <span className="font-semibold">{alertCount} ingredient{alertCount > 1 ? 's' : ''}</span> below minimum stock level.{' '}
            {lowCount > 0 && <span className="text-orange-300">{lowCount} more approaching minimum.</span>}
          </p>
          <button id="btn-reorder-all" className="ml-auto btn-danger btn-sm">Reorder All</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Package size={16} className="text-brand-400" />
        <span className="text-sm font-semibold text-white">{STOCK.length} Ingredients</span>
        <div className="relative ml-4">
          <input
            id="inv-search"
            type="search"
            className="input py-1.5 pl-3 w-44 text-xs"
            placeholder="Search ingredient…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          id="btn-sort-toggle"
          onClick={() => setSortBy(s => s === 'name' ? 'stock' : 'name')}
          className="btn-ghost btn-sm border border-white/10"
        >
          <ArrowUpDown size={13} /> Sort by {sortBy === 'name' ? 'Stock Level' : 'Name'}
        </button>
        <button id="btn-add-ingredient" className="btn-primary btn-sm ml-auto">
          <Plus size={14} /> Add Ingredient
        </button>
      </div>

      {/* Stock table */}
      <div className="card overflow-hidden flex-1 flex flex-col">
        <div className="grid grid-cols-[1fr_6rem_6rem_6rem_8rem_5rem] gap-3 px-4 py-2 text-xs font-medium text-slate-500 border-b border-white/5">
          <span>Ingredient</span>
          <span className="text-right">Current</span>
          <span className="text-right">Min</span>
          <span className="text-right">Cost/unit</span>
          <span>Stock Level</span>
          <span className="text-center">Action</span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-white/5">
          {filtered.map(item => {
            const isCritical = item.current < item.minLevel;
            const isLow = item.current < item.minLevel * 1.5;
            return (
              <div
                key={item.id}
                className={`grid grid-cols-[1fr_6rem_6rem_6rem_8rem_5rem] gap-3 px-4 py-3 items-center text-sm hover:bg-white/2 transition-colors ${isCritical ? 'bg-red-500/5' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-medium">{item.name}</span>
                  {isCritical && <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />}
                  {!isCritical && isLow && <AlertTriangle size={12} className="text-orange-400 flex-shrink-0" />}
                </div>
                <span className={`text-right text-money font-semibold ${isCritical ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-slate-300'}`}>
                  {item.current} {item.unit}
                </span>
                <span className="text-right text-money text-slate-400">{item.minLevel} {item.unit}</span>
                <span className="text-right text-money text-slate-400">₹{item.cost}</span>
                <div className="space-y-1">
                  <StockBar current={item.current} min={item.minLevel} max={item.maxLevel} />
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>0</span><span>{item.maxLevel}</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <button
                    id={`btn-adjust-${item.id}`}
                    className={`btn-sm ${isCritical ? 'btn-danger' : 'btn-ghost border border-white/10'} text-xs`}
                    title="Adjust stock"
                  >
                    {isCritical ? '⚠ Order' : 'Adjust'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
