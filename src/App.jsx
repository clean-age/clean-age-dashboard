import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import DashboardProvider, { useDashboard } from './context/DashboardContext';
import Overview from './pages/Overview';
import Inventory from './pages/Inventory';
import Purchasing from './pages/Purchasing';

function Header() {
  const { refresh, days, setDays, lastRefreshed } = useDashboard();
  const location = useLocation();

  const tabs = [
    { name: 'Weekly Overview', path: '/' },
    { name: 'Inventory', path: '/inventory' },
    { name: 'Purchasing', path: '/purchasing' },
  ];

  const handleRefresh = () => {
    refresh();
  };

  const formatLastRefreshed = () => {
    if (!lastRefreshed) return '';
    const date = new Date(lastRefreshed);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${date.toLocaleDateString()} ${hours}:${minutes}`;
  };

  return (
    <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header row with logo and action button */}
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            {/* CA Logo */}
            <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold text-sm">CA</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Clean Age</h1>
              <p className="text-slate-400 text-xs -mt-1">Operations Dashboard</p>
            </div>
          </div>

          <a
            href="https://script.google.com/macros/s/AKfycbyIBBo9Q20FnIdulRRNx6fHE10ESAgMPiZUCQgGYjk6bcCDZbLq7neVhW0DelZmuss9Hg/exec"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Action Board
          </a>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center justify-between py-4 border-t border-slate-800">
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <a
                  key={tab.path}
                  href={`#${tab.path}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {tab.name}
                </a>
              );
            })}
          </div>

          {/* Toolbar: Period selector and refresh */}
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-2 bg-slate-800 text-white text-sm rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
            <button
              onClick={handleRefresh}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={18} />
            </button>
            {lastRefreshed && (
              <span className="text-xs text-slate-500">Last: {formatLastRefreshed()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/purchasing" element={<Purchasing />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <DashboardProvider>
        <AppContent />
      </DashboardProvider>
    </Router>
  );
}