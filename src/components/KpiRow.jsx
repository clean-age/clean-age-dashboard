import { DollarSign, TrendingUp, Package, ShoppingCart } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export default function KpiRow() {
  const { data } = useDashboard();

  const wow = data.sales?.wow || {};

  const kpis = [
    {
      title: 'Weekly Revenue',
      value: `$${(wow.revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'blue',
    },
    {
      title: 'WoW Change',
      value: `${(wow.change || 0).toFixed(1)}%`,
      change: wow.change || 0,
      icon: TrendingUp,
      color: 'blue',
    },
    {
      title: 'Total Units',
      value: (wow.units || 0).toLocaleString(),
      icon: Package,
      color: 'blue',
    },
    {
      title: 'Total Orders',
      value: (wow.orders || 0).toLocaleString(),
      icon: ShoppingCart,
      color: 'blue',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        const isPositive = kpi.change >= 0;
        const textColor =
          kpi.change !== undefined
            ? isPositive
              ? 'text-green-600'
              : 'text-red-600'
            : 'text-slate-600';

        return (
          <div
            key={index}
            className="kpi-card rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-600">{kpi.title}</h3>
              <Icon className="text-blue-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-2">{kpi.value}</p>
            {kpi.change !== undefined && (
              <p className={`text-sm font-medium ${textColor}`}>
                {isPositive ? '↑' : '↓'} {Math.abs(kpi.change).toFixed(1)}% from last week
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}