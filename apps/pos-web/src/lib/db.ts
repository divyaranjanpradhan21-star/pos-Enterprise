/**
 * Dexie IndexedDB offline database.
 * Tables:
 *  - outbox: pending mutations to sync when back online
 *  - orders:  local cached order drafts
 *  - menu:    cached menu snapshot for offline ordering
 */
import Dexie, { type Table } from 'dexie';

export interface OutboxEntry {
  id?: number;            // auto-increment PK
  opId: string;           // UUIDv7 for deduplication
  method: string;
  path: string;
  body?: unknown;
  idempotencyKey: string;
  createdAt: number;      // Date.now()
  retryCount: number;
  status: 'pending' | 'failed';
}

export interface LocalOrder {
  localId: string;        // UUIDv7
  serverId?: string;      // filled after sync
  branchId: string;
  tableId?: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'ONLINE';
  status: string;
  items: LocalOrderItem[];
  createdAt: number;
  updatedAt: number;
  synced: boolean;
}

export interface LocalOrderItem {
  localItemId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: string;      // decimal string
  modifiers: { modifierId: string; name: string; price: string }[];
  notes?: string;
}

export interface LocalMenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  basePrice: string;
  imageUrl?: string;
  isAvailable: boolean;
  variants: { id: string; name: string; additionalPrice: string }[];
  modifiers: { id: string; name: string; price: string }[];
}

class PosDatabase extends Dexie {
  outbox!: Table<OutboxEntry>;
  orders!: Table<LocalOrder>;
  menuItems!: Table<LocalMenuItem>;

  constructor() {
    super('restro-pos-v1');
    this.version(1).stores({
      outbox: '++id, opId, status, createdAt',
      orders: 'localId, serverId, branchId, tableId, status, synced, updatedAt',
      menuItems: 'id, categoryId, isAvailable',
    });
  }
}

export const db = new PosDatabase();

/** Generate a UUIDv7-compatible ID (time-ordered UUID). */
export function uuidv7(): string {
  const now = Date.now();
  const hi = Math.floor(now / 0x1000);
  const lo = now % 0x1000;
  const rand = crypto.getRandomValues(new Uint8Array(10));
  rand[0] = (rand[0] & 0x3f) | 0x80; // variant bits
  const hex = [
    hi.toString(16).padStart(8, '0'),
    lo.toString(16).padStart(3, '0'),
    '7' + rand[0].toString(16).padStart(3, '0'),
    rand[1].toString(16).padStart(2, '0') + rand[2].toString(16).padStart(2, '0'),
    Array.from(rand.slice(3)).map(b => b.toString(16).padStart(2, '0')).join(''),
  ];
  return `${hex[0]}-${hex[1]}-${hex[2]}-${hex[3]}-${hex[4]}`;
}
