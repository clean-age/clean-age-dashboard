import React, { createContext, useState, useCallback, useEffect } from 'react';
import { fetchDashboardData } from '../api';

export const DashboardContext = createContext();

function num(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function normalizeData(raw) {
  // Handle API response that may be wrapped in a `data` property
  const d = raw.data || raw;

  // Normalize wow: API returns array [{this_revenue, last_revenue, revenue_pct, ...}]
  // Components expect object {revenue, change, units, orders}
  const wowArr = d.sales?.wow;
  let wow = {};
  if (Array.isArray(wowArr) && wowArr.length > 0) {
    const w = wowArr[0];
    wow = {
      revenue: num(w.this_revenue),
      change: num(w.revenue_pct),
      units: num(w.this_units),
      orders: num(w.this_orders),
    };
  } else if (wowArr && !Array.isArray(wowArr)) {
    wow = wowArr;
  }

  // Normalize bySource: API items have `source`, components expect `name`
  const bySource = (d.sales?.bySource || []).map((s) => ({
    ...s,
    name: s.name || s.source,
    revenue: num(s.revenue),
    units: num(s.units),
    orders: num(s.orders),
  }));

  // Normalize byProduct: API items may use `product` instead of `name`
  const byProduct = (d.sales?.byProduct || []).map((p) => ({
    ...p,
    name: p.name || p.product,
    category: p.category || p.plcat || 'Uncategorized',
    revenue: num(p.revenue),
    units: num(p.units),
    orders: num(p.orders),
  }));

  // Normalize caCincy: API items have `qoh`, components use `oh`
  const caCincy = (d.caCincy || []).map((item) => ({
    ...item,
    oh: num(item.oh ?? item.qoh),
    oo: num(item.oo),
  }));

  // Normalize FBA
  const fba = (d.fba || []).map((item) => ({
    ...item,
    qoh: num(item.qoh),
    inbound: num(item.inbound),
  }));

  // Normalize openPOs: API has `quantity`, components use `qty`; parse numbers
  const openPOs = (d.openPOs || []).map((po) => ({
    ...po,
    qty: num(po.qty ?? po.quantity),
    unitPrice: num(po.unitPrice),
    subtotal: num(po.subtotal),
  }));

  // Normalize dcInventory
  const dcInventory = (d.dcInventory || []).map((item) => ({
    ...item,
    oh: num(item.oh),
    oo: num(item.oo),
  }));

  // Production
  const production = (d.production || []).map((item) => ({
    ...item,
    qty: num(item.qty),
  }));

  return {
    sales: { wow, bySource, byProduct },
    caCincy,
    fba,
    dcInventory,
    openPOs,
    production,
  };
}

export default function DashboardProvider({ children }) {
  const [data, setData] = useState({
    sales: { wow: {}, bySource: [], byProduct: [] },
    caCincy: [],
    fba: [],
    dcInventory: [],
    openPOs: [],
    production: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [days, setDays] = useState(7);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardData('all', days);
      setData(normalizeData(result));
      setLastRefreshed(new Date().toISOString());
    } catch (err) {
      setError(err.message);
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = {
    data,
    loading,
    error,
    lastRefreshed,
    days,
    refresh,
    setDays,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = React.useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
}