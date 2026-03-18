import React, { createContext, useState, useCallback, useEffect } from 'react';
import { fetchDashboardData } from '../api';

export const DashboardContext = createContext();

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
      const result = await fetchDashboardData('getDashboard', days);
      setData(result);
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