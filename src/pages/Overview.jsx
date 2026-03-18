import KpiRow from '../components/KpiRow';
import { useDashboard } from '../context/DashboardContext';

export default function Overview() {
  const { data, loading } = useDashboard();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  const bySource = data.sales?.bySource || [];
  const byProduct = data.sales?.byProduct || [];

  // Group products by category
  const productsByCategory = {};
  (byProduct || []).forEach((product) => {
    const category = product.category || 'Uncategorized';
    if (!productsByCategory[category]) {
      productsByCategory[category] = [];
    }
    productsByCategory[category].push(product);
  });

  return (
    <div className="space-y-6">
      <KpiRow />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Sales by Source</h3>
        {bySource.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Source</th>
                  <th className="text-right py-3 px-3 font-semibold text-slate-700">Revenue</th>
                  <th className="text-right py-3 px-3 font-semibold text-slate-700">Units</th>
                  <th className="text-right py-3 px-3 font-semibold text-slate-700">Orders</th>
                </tr>
              </thead>
              <tbody>
                {bySource.map((source, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-3 font-medium text-slate-900">{source.name}</td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      ${(source.revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {(source.units || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {(source.orders || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500">No data available</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Product Breakdown</h3>
        {Object.keys(productsByCategory).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Product</th>
                  <th className="text-right py-3 px-3 font-semibold text-slate-700">Revenue</th>
                  <th className="text-right py-3 px-3 font-semibold text-slate-700">Units</th>
                  <th className="text-right py-3 px-3 font-semibold text-slate-700">Orders</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(productsByCategory).map(([category, products]) => (
                  <tbody key={category}>
                    <tr className="bg-blue-50">
                      <td colSpan="4" className="py-2 px-3">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                          {category}
                        </p>
                      </td>
                    </tr>
                    {products.map((product, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-3 text-slate-900">{product.name}</td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          ${(product.revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          {(product.units || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          {(product.orders || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500">No data available</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Weekly Notes</h3>
        <p className="text-slate-600 text-sm">
          Meeting notes, Slack activity, and discussion topics are compiled by the weekly scheduled
          task and will appear here.
        </p>
      </div>
    </div>
  );
}