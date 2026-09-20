import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingBag, Clock } from 'lucide-react';

const STATS = [
  { label: "Today's Revenue",   value: '₹48,320', change: '+12.4%', up: true,  icon: DollarSign },
  { label: 'Orders Today',      value: '87',       change: '+8.2%',  up: true,  icon: ShoppingBag },
  { label: 'Avg. Order Value',  value: '₹555',     change: '-3.1%',  up: false, icon: TrendingUp },
  { label: 'Avg. Table Time',   value: '38 min',   change: '-5.0%',  up: true,  icon: Clock },
  { label: 'Covers Served',     value: '214',      change: '+15.3%', up: true,  icon: Users },
  { label: 'Cancellations',     value: '3',        change: '-25.0%', up: true,  icon: TrendingDown },
];

const TOP_ITEMS = [
  { name: 'Butter Chicken', orders: 42, revenue: 17640 },
  { name: 'Garlic Naan',    orders: 89, revenue: 6230  },
  { name: 'Paneer Tikka',   orders: 31, revenue: 8680  },
  { name: 'Dal Makhani',    orders: 28, revenue: 7840  },
  { name: 'Mango Lassi',    orders: 54, revenue: 6480  },
];

const HOURLY = [
  { h: '10', sales: 2400 }, { h: '11', sales: 4800 }, { h: '12', sales: 8200 },
  { h: '13', sales: 9600 }, { h: '14', sales: 7400 }, { h: '15', sales: 5200 },
  { h: '16', sales: 3800 }, { h: '17', sales: 4600 }, { h: '18', sales: 7800 },
  { h: '19', sales: 12400 },{ h: '20', sales: 14200 },{ h: '21', sales: 9600 },
  { h: '22', sales: 6200 },
];

const MAX_SALES = Math.max(...HOURLY.map(h => h.sales));

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {STATS.map(({ label, value, change, up, icon: Icon }) => (
          <div key={label} className="card p-4 space-y-2 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">{label}</p>
              <div className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center">
                <Icon size={13} className="text-brand-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-white text-money">{value}</p>
            <div className={`flex items-center gap-1 text-xs font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
              {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {change} vs yesterday
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Hourly sales bar chart */}
        <div className="card p-5 lg:col-span-3">
          <h3 className="text-sm font-semibold text-white mb-4">Hourly Sales — Today</h3>
          <div className="flex items-end gap-1.5 h-36">
            {HOURLY.map(({ h, sales }) => {
              const pct = (sales / MAX_SALES) * 100;
              const isCurrent = h === '20';
              return (
                <div key={h} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className="w-full rounded-t-sm transition-all duration-300 group-hover:opacity-100"
                    style={{
                      height: `${pct}%`,
                      background: isCurrent
                        ? 'hsl(245,85%,60%)'
                        : 'hsl(245,85%,60%,0.35)',
                    }}
                  />
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-300">{h}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top items */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-4">Top Items Today</h3>
          <div className="space-y-3">
            {TOP_ITEMS.map((item, i) => {
              const pct = (item.revenue / TOP_ITEMS[0].revenue) * 100;
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{i + 1}. {item.name}</span>
                    <span className="text-money text-slate-400">{item.orders} orders</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Payment breakdown */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Payment Method Breakdown</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { method: 'Cash', amount: 18240, pct: 38, color: 'bg-emerald-500' },
            { method: 'Card', amount: 21440, pct: 44, color: 'bg-brand-500'  },
            { method: 'UPI',  amount:  8640, pct: 18, color: 'bg-purple-500' },
          ].map(({ method, amount, pct, color }) => (
            <div key={method} className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">{method}</span>
                <span className="text-money text-slate-300 font-medium">{pct}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-money text-sm font-semibold text-white">₹{amount.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
