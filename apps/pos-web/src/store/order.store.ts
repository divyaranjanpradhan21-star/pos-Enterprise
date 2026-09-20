import { create } from 'zustand';
import { db, uuidv7, type LocalOrder } from '../lib/db';

interface CartItem {
  localItemId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  modifiers: { modifierId: string; name: string; price: string }[];
  notes?: string;
}

interface ActiveOrderState {
  /** Current active order being built (may be offline) */
  activeOrder: LocalOrder | null;
  cartItems: CartItem[];

  /** Initialise a new order (or resume existing) */
  startOrder: (params: {
    branchId: string;
    tableId?: string;
    orderType: LocalOrder['orderType'];
  }) => Promise<void>;

  addItem: (item: Omit<CartItem, 'localItemId'>) => void;
  updateQuantity: (localItemId: string, quantity: number) => void;
  removeItem: (localItemId: string) => void;
  clearCart: () => void;

  /** Subtotal in paise/cents — use domain package for final calc */
  subtotal: () => number;
}

export const useOrderStore = create<ActiveOrderState>((set, get) => ({
  activeOrder: null,
  cartItems: [],

  startOrder: async ({ branchId, tableId, orderType }) => {
    const localId = uuidv7();
    const now = Date.now();
    const order: LocalOrder = {
      localId,
      branchId,
      tableId,
      orderType,
      status: 'DRAFT',
      items: [],
      createdAt: now,
      updatedAt: now,
      synced: false,
    };
    await db.orders.add(order);
    set({ activeOrder: order, cartItems: [] });
  },

  addItem: (item) => {
    const newItem: CartItem = { ...item, localItemId: uuidv7() };
    set((s) => ({ cartItems: [...s.cartItems, newItem] }));
  },

  updateQuantity: (localItemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(localItemId);
      return;
    }
    set((s) => ({
      cartItems: s.cartItems.map((i) =>
        i.localItemId === localItemId ? { ...i, quantity } : i,
      ),
    }));
  },

  removeItem: (localItemId) => {
    set((s) => ({ cartItems: s.cartItems.filter((i) => i.localItemId !== localItemId) }));
  },

  clearCart: () => set({ cartItems: [], activeOrder: null }),

  subtotal: () => {
    return get().cartItems.reduce((sum, item) => {
      const base = parseFloat(item.unitPrice) * item.quantity;
      const mods = item.modifiers.reduce((ms, m) => ms + parseFloat(m.price) * item.quantity, 0);
      return sum + base + mods;
    }, 0);
  },
}));
