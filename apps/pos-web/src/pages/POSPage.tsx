import { useState, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, Send, ChevronRight, X } from 'lucide-react';
import { useOrderStore } from '../store/order.store';
import { useAuthStore } from '../store/auth.store';

// ──────────────────── Mock Data (replaced by React Query when API ready) ──────
const CATEGORIES = [
  { id: 'cat-1', name: 'Starters' },
  { id: 'cat-2', name: 'Mains' },
  { id: 'cat-3', name: 'Breads' },
  { id: 'cat-4', name: 'Beverages' },
  { id: 'cat-5', name: 'Desserts' },
];

const MENU_ITEMS = [
  { id: 'm-1', categoryId: 'cat-1', name: 'Paneer Tikka',    price: 280, emoji: '🧀' },
  { id: 'm-2', categoryId: 'cat-1', name: 'Veg Seekh Kebab', price: 240, emoji: '🌿' },
  { id: 'm-3', categoryId: 'cat-1', name: 'Fish Amritsari',  price: 320, emoji: '🐟' },
  { id: 'm-4', categoryId: 'cat-1', name: 'Chicken Wings',   price: 360, emoji: '🍗' },
  { id: 'm-5', categoryId: 'cat-2', name: 'Butter Chicken',  price: 420, emoji: '🍛' },
  { id: 'm-6', categoryId: 'cat-2', name: 'Dal Makhani',     price: 280, emoji: '🫘' },
  { id: 'm-7', categoryId: 'cat-2', name: 'Palak Paneer',    price: 300, emoji: '🥬' },
  { id: 'm-8', categoryId: 'cat-2', name: 'Mutton Rogan Josh', price: 520, emoji: '🥩' },
  { id: 'm-9', categoryId: 'cat-3', name: 'Butter Naan',     price: 50,  emoji: '🫓' },
  { id: 'm-10',categoryId: 'cat-3', name: 'Garlic Naan',     price: 70,  emoji: '🧄' },
  { id: 'm-11',categoryId: 'cat-3', name: 'Tandoori Roti',   price: 40,  emoji: '🫓' },
  { id: 'm-12',categoryId: 'cat-4', name: 'Mango Lassi',     price: 120, emoji: '🥭' },
  { id: 'm-13',categoryId: 'cat-4', name: 'Masala Chai',     price: 60,  emoji: '🍵' },
  { id: 'm-14',categoryId: 'cat-4', name: 'Fresh Lime Soda', price: 80,  emoji: '🍋' },
  { id: 'm-15',categoryId: 'cat-5', name: 'Gulab Jamun',     price: 120, emoji: '🍮' },
  { id: 'm-16',categoryId: 'cat-5', name: 'Ice Cream',       price: 140, emoji: '🍨' },
];

// ──────────────────── Component ──────────────────────────────────────────────
export default function POSPage() {
  const { user } = useAuthStore();
  const { cartItems, activeOrder, startOrder, addItem, updateQuantity, removeItem, clearCart, subtotal } = useOrderStore();

  const [activeCat, setActiveCat] = useState(CATEGORIES[0].id);
  const [search, setSearch] = useState('');
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('DINE_IN');
  const [sendingKOT, setSendingKOT] = useState(false);

  const filtered = useMemo(() => {
    const base = search
      ? MENU_ITEMS.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
      : MENU_ITEMS.filter(i => i.categoryId === activeCat);
    return base;
  }, [activeCat, search]);

  const sub = subtotal();
  const gst = sub * 0.05; // 5% GST – demo only; real calc via domain package
  const total = sub + gst;

  async function ensureOrder() {
    if (!activeOrder) {
      await startOrder({ branchId: user!.branchId, orderType });
    }
  }

  async function handleAddItem(item: typeof MENU_ITEMS[0]) {
    await ensureOrder();
    addItem({
      menuItemId: item.id,
      name: item.name,
      quantity: 1,
      unitPrice: String(item.price),
      modifiers: [],
    });
  }

  async function handleSendKOT() {
    if (cartItems.length === 0) return;
    setSendingKOT(true);
    // Real: api.post('/orders', { ... }) with idempotencyKey
    await new Promise(r => setTimeout(r, 800));
    setSendingKOT(false);
    clearCart();
    alert('KOT sent to kitchen ✓');
  }

  return (
    <div className="flex h-full gap-4">
      {/* ── Left Panel: Menu ── */}
      <div className="flex flex-col flex-1 min-w-0 gap-3">
        {/* Order type + search */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as const).map(t => (
            <button
              key={t}
              id={`btn-order-type-${t.toLowerCase()}`}
              onClick={() => setOrderType(t)}
              className={`btn-sm transition-all ${orderType === t ? 'btn-primary' : 'btn-ghost border border-white/10'}`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
          <div className="relative ml-auto">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="menu-search"
              type="search"
              value={search}
              onChange={e => { setSearch(e.target.value); if (e.target.value) setActiveCat(''); }}
              placeholder="Search items…"
              className="input pl-8 py-1.5 w-44 lg:w-56 text-xs"
            />
          </div>
        </div>

        {/* Category tabs */}
        {!search && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                id={`cat-${cat.id}`}
                onClick={() => setActiveCat(cat.id)}
                className={`btn-sm flex-shrink-0 ${activeCat === cat.id ? 'btn-primary' : 'btn-ghost border border-white/10'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Item grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 overflow-y-auto scrollbar-thin flex-1 content-start">
          {filtered.map(item => {
            const inCart = cartItems.find(ci => ci.menuItemId === item.id);
            return (
              <button
                key={item.id}
                id={`menu-item-${item.id}`}
                onClick={() => handleAddItem(item)}
                className="card-hover p-3 text-left group"
              >
                <div className="text-3xl mb-2">{item.emoji}</div>
                <p className="text-xs font-medium text-slate-200 leading-tight line-clamp-2 group-hover:text-white transition-colors">
                  {item.name}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-money text-xs text-brand-400 font-semibold">₹{item.price}</span>
                  {inCart && (
                    <span className="badge bg-brand-500/20 text-brand-400 border-brand-500/30 text-[10px]">
                      ×{inCart.quantity}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full flex items-center justify-center py-16 text-slate-500 text-sm">
              No items found
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel: Order Summary ── */}
      <div className="w-72 xl:w-80 flex flex-col card shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Current Order</h2>
          {cartItems.length > 0 && (
            <button
              id="btn-clear-cart"
              onClick={clearCart}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-2">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
              <ChevronRight size={32} className="opacity-20" />
              <p className="text-xs">Tap items to add</p>
            </div>
          ) : (
            cartItems.map(item => (
              <div
                key={item.localItemId}
                className="flex items-center gap-2 p-2 rounded-lg bg-surface-900/50 group animate-slide-up"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{item.name}</p>
                  <p className="text-money text-xs text-slate-400">
                    ₹{(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    id={`btn-dec-${item.localItemId}`}
                    onClick={() => updateQuantity(item.localItemId, item.quantity - 1)}
                    className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="text-money text-xs w-5 text-center text-white">{item.quantity}</span>
                  <button
                    id={`btn-inc-${item.localItemId}`}
                    onClick={() => updateQuantity(item.localItemId, item.quantity + 1)}
                    className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                  >
                    <Plus size={10} />
                  </button>
                  <button
                    id={`btn-rm-${item.localItemId}`}
                    onClick={() => removeItem(item.localItemId)}
                    className="w-5 h-5 rounded flex items-center justify-center text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-0.5"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals + CTA */}
        <div className="border-t border-white/5 px-4 py-3 space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Subtotal</span>
            <span className="text-money">₹{sub.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>GST (5%)</span>
            <span className="text-money">₹{gst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-white border-t border-white/5 pt-2">
            <span>Total</span>
            <span className="text-money">₹{total.toFixed(2)}</span>
          </div>

          <button
            id="btn-send-kot"
            onClick={handleSendKOT}
            disabled={cartItems.length === 0 || sendingKOT}
            className="btn-primary w-full mt-1"
          >
            {sendingKOT ? (
              <>Sending…</>
            ) : (
              <>
                <Send size={14} /> Send to Kitchen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
