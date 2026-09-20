import { useState } from 'react';
import { Receipt, SplitSquareHorizontal, CreditCard, Banknote, Smartphone, Check, Printer, LucideIcon } from 'lucide-react';

type PaymentMethod = 'CASH' | 'CARD' | 'UPI';
type SplitMode = 'FULL' | 'EQUAL' | 'CUSTOM';

interface BillItem {
  name: string;
  qty: number;
  unitPrice: number;
}

const MOCK_BILL: BillItem[] = [
  { name: 'Paneer Tikka',  qty: 1, unitPrice: 280 },
  { name: 'Butter Chicken',qty: 2, unitPrice: 420 },
  { name: 'Garlic Naan',  qty: 4, unitPrice:  70 },
  { name: 'Mango Lassi',  qty: 2, unitPrice: 120 },
];

const PM_ICON: Record<PaymentMethod, LucideIcon> = {
  CASH: Banknote,
  CARD: CreditCard,
  UPI:  Smartphone,
};

export default function BillingPage() {
  const [split, setSplit]     = useState<SplitMode>('FULL');
  const [splits, setSplits]   = useState(2);
  const [method, setMethod]   = useState<PaymentMethod>('CASH');
  const [settled, setSettled] = useState(false);
  const [cash, setCash]       = useState('');

  const sub   = MOCK_BILL.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const gst   = sub * 0.05;
  const svc   = sub * 0.05;
  const total = sub + gst + svc;
  const perHead = total / splits;
  const cashNum  = parseFloat(cash) || 0;
  const change   = cashNum - total;

  function handleSettle() {
    if (method === 'CASH' && cashNum < total) return;
    setSettled(true);
  }

  if (settled) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 animate-slide-up">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center shadow-glow-success">
          <Check size={40} className="text-emerald-400" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Payment Successful</h2>
          <p className="text-slate-400 mt-1">Invoice #INV-2024-0087 generated</p>
          <p className="text-money text-3xl font-bold text-emerald-400 mt-3">₹{total.toFixed(2)}</p>
        </div>
        <div className="flex gap-3">
          <button id="btn-print-invoice" className="btn-ghost border border-white/10">
            <Printer size={14} /> Print Invoice
          </button>
          <button id="btn-new-bill" onClick={() => setSettled(false)} className="btn-primary">
            New Bill
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full">
      {/* ── Bill details ── */}
      <div className="flex-1 card p-5 flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <Receipt size={16} className="text-brand-400" />
          <h2 className="font-semibold text-white">Bill — Table T04</h2>
          <span className="badge-busy ml-auto">KOT-0042</span>
        </div>

        {/* Line items */}
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
          <div className="grid grid-cols-[1fr_3rem_4rem_5rem] gap-2 text-xs text-slate-500 pb-2 border-b border-white/5 font-medium">
            <span>Item</span><span className="text-center">Qty</span>
            <span className="text-right">Rate</span><span className="text-right">Amount</span>
          </div>
          {MOCK_BILL.map((item, i) => (
            <div key={i} className="grid grid-cols-[1fr_3rem_4rem_5rem] gap-2 text-sm items-center py-1.5 border-b border-white/5 last:border-0">
              <span className="text-slate-200">{item.name}</span>
              <span className="text-center text-slate-400">{item.qty}</span>
              <span className="text-right text-money text-slate-400">₹{item.unitPrice}</span>
              <span className="text-right text-money text-white font-medium">₹{(item.unitPrice * item.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-1.5 border-t border-white/5 pt-3">
          {[
            { label: 'Subtotal', value: sub },
            { label: 'GST (5%)', value: gst },
            { label: 'Service Charge (5%)', value: svc },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-xs text-slate-400">
              <span>{label}</span>
              <span className="text-money">₹{value.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between font-semibold text-white border-t border-white/5 pt-2">
            <span>Total</span>
            <span className="text-money text-lg">₹{total.toFixed(2)}</span>
          </div>
          {split !== 'FULL' && (
            <div className="flex justify-between text-xs text-brand-400 mt-1">
              <span>Per head ({splits} guests)</span>
              <span className="text-money font-semibold">₹{perHead.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Payment panel ── */}
      <div className="w-72 xl:w-80 flex flex-col gap-3 shrink-0">
        {/* Split mode */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <SplitSquareHorizontal size={15} className="text-brand-400" />
            Split Bill
          </div>
          <div className="flex gap-1.5">
            {(['FULL', 'EQUAL', 'CUSTOM'] as const).map(m => (
              <button
                key={m}
                id={`btn-split-${m.toLowerCase()}`}
                onClick={() => setSplit(m)}
                className={`btn-sm flex-1 ${split === m ? 'btn-primary' : 'btn-ghost border border-white/10'}`}
              >
                {m === 'FULL' ? 'Full' : m === 'EQUAL' ? 'Equal' : 'Custom'}
              </button>
            ))}
          </div>
          {split === 'EQUAL' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Guests</span>
              <div className="flex items-center gap-2 ml-auto">
                <button id="btn-dec-guests" onClick={() => setSplits(s => Math.max(2, s - 1))} className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center text-sm">−</button>
                <span className="text-money text-sm w-5 text-center text-white">{splits}</span>
                <button id="btn-inc-guests" onClick={() => setSplits(s => Math.min(12, s + 1))} className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center text-sm">+</button>
              </div>
            </div>
          )}
        </div>

        {/* Payment method */}
        <div className="card p-4 space-y-3">
          <p className="text-sm font-medium text-white">Payment Method</p>
          <div className="grid grid-cols-3 gap-2">
            {(['CASH', 'CARD', 'UPI'] as PaymentMethod[]).map(m => {
              const Icon = PM_ICON[m];
              return (
                <button
                  key={m}
                  id={`btn-pm-${m.toLowerCase()}`}
                  onClick={() => setMethod(m)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${method === m ? 'bg-brand-500/15 border-brand-500/40 text-brand-400' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'}`}
                >
                  <Icon size={18} />
                  <span className="text-xs font-medium">{m}</span>
                </button>
              );
            })}
          </div>

          {/* Cash change calculator */}
          {method === 'CASH' && (
            <div className="space-y-2">
              <div className="space-y-1">
                <label htmlFor="cash-received" className="text-xs text-slate-400">Cash received</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                  <input
                    id="cash-received"
                    type="number"
                    className="input pl-7 text-money"
                    placeholder="0.00"
                    value={cash}
                    onChange={e => setCash(e.target.value)}
                    min={total}
                    step="0.01"
                  />
                </div>
              </div>
              {cashNum > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Change</span>
                  <span className={`text-money font-semibold ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ₹{change.toFixed(2)}
                  </span>
                </div>
              )}
              {/* Quick amounts */}
              <div className="grid grid-cols-3 gap-1">
                {[500, 1000, 2000].map(amt => (
                  <button key={amt} id={`btn-cash-${amt}`} onClick={() => setCash(String(amt))} className="btn-ghost btn-sm border border-white/10 text-money">
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settle */}
        <button
          id="btn-settle-bill"
          onClick={handleSettle}
          disabled={method === 'CASH' && (cashNum < total || !cash)}
          className="btn-success btn-lg w-full mt-auto"
        >
          <Check size={16} /> Settle ₹{total.toFixed(2)}
        </button>
      </div>
    </div>
  );
}
