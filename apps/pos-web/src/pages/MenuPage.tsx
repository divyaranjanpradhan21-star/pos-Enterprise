import { useState } from 'react';
import { Plus, Search, ToggleLeft, ToggleRight, Edit2 } from 'lucide-react';

interface MenuItem {
  id: string;
  category: string;
  name: string;
  price: number;
  available: boolean;
  emoji: string;
}

const MOCK_MENU: MenuItem[] = [
  { id: 'm-1', category: 'Starters',  name: 'Paneer Tikka',     price: 280, available: true,  emoji: '🧀' },
  { id: 'm-2', category: 'Starters',  name: 'Veg Seekh Kebab',  price: 240, available: true,  emoji: '🌿' },
  { id: 'm-3', category: 'Starters',  name: 'Fish Amritsari',   price: 320, available: false, emoji: '🐟' },
  { id: 'm-4', category: 'Starters',  name: 'Chicken Wings',    price: 360, available: true,  emoji: '🍗' },
  { id: 'm-5', category: 'Mains',     name: 'Butter Chicken',   price: 420, available: true,  emoji: '🍛' },
  { id: 'm-6', category: 'Mains',     name: 'Dal Makhani',      price: 280, available: true,  emoji: '🫘' },
  { id: 'm-7', category: 'Mains',     name: 'Palak Paneer',     price: 300, available: true,  emoji: '🥬' },
  { id: 'm-8', category: 'Mains',     name: 'Mutton Rogan Josh',price: 520, available: false, emoji: '🥩' },
  { id: 'm-9', category: 'Breads',    name: 'Butter Naan',      price: 50,  available: true,  emoji: '🫓' },
  { id: 'm-10',category: 'Breads',    name: 'Garlic Naan',      price: 70,  available: true,  emoji: '🧄' },
  { id: 'm-11',category: 'Beverages', name: 'Mango Lassi',      price: 120, available: true,  emoji: '🥭' },
  { id: 'm-12',category: 'Beverages', name: 'Masala Chai',      price: 60,  available: true,  emoji: '🍵' },
];

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>(MOCK_MENU);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');

  const categories = ['All', ...Array.from(new Set(MOCK_MENU.map(i => i.category)))];
  const filtered = items.filter(i =>
    (catFilter === 'All' || i.category === catFilter) &&
    (!search || i.name.toLowerCase().includes(search.toLowerCase()))
  );

  function toggle(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, available: !i.available } : i));
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="menu-search"
            type="search"
            className="input pl-8 py-1.5 w-48 text-xs"
            placeholder="Search menu…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
          {categories.map(c => (
            <button
              key={c}
              id={`menu-cat-${c.toLowerCase()}`}
              onClick={() => setCatFilter(c)}
              className={`btn-sm flex-shrink-0 ${catFilter === c ? 'btn-primary' : 'btn-ghost border border-white/10'}`}
            >
              {c}
            </button>
          ))}
        </div>
        <button id="btn-add-menu-item" className="btn-primary btn-sm ml-auto">
          <Plus size={14} /> Add Item
        </button>
      </div>

      {/* Menu table */}
      <div className="card overflow-hidden flex-1 flex flex-col">
        <div className="grid grid-cols-[3rem_1fr_6rem_5rem_7rem_5rem] gap-3 px-4 py-2 text-xs font-medium text-slate-500 border-b border-white/5">
          <span></span>
          <span>Item Name</span>
          <span>Category</span>
          <span className="text-right">Price</span>
          <span className="text-center">Availability</span>
          <span className="text-center">Actions</span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-white/5">
          {filtered.map(item => (
            <div
              key={item.id}
              className={`grid grid-cols-[3rem_1fr_6rem_5rem_7rem_5rem] gap-3 px-4 py-3 items-center text-sm hover:bg-white/2 transition-colors ${!item.available ? 'opacity-50' : ''}`}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className={`font-medium ${item.available ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                {item.name}
              </span>
              <span className="text-slate-400 text-xs">{item.category}</span>
              <span className="text-right text-money text-slate-300">₹{item.price}</span>
              <div className="flex justify-center">
                <button
                  id={`toggle-avail-${item.id}`}
                  onClick={() => toggle(item.id)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${item.available ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700'}`}
                >
                  {item.available ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                  {item.available ? 'Available' : 'Off'}
                </button>
              </div>
              <div className="flex justify-center">
                <button id={`edit-item-${item.id}`} className="btn-ghost p-1.5 rounded-lg" title="Edit">
                  <Edit2 size={13} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
              No items found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
