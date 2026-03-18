import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { useDashboard } from '../context/DashboardContext';

export default function Purchasing() {
  const { data, loading } = useDashboard();
  const [expandedPO, setExpandedPO] = useState(null);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const openPOs = data.openPOs || [];

  // Group by PO number and sort by ready date
  const posByNumber = {};
  openPOs.forEach((po) => {
    const poNumber = po.orderId || 'Unknown';
    if (!posByNumber[poNumber]) {
      posByNumber[poNumber] = [];
    }
    posByNumber[poNumber].push(po);
  });

  const sortedPOs = Object.entries(posByNumber).sort((a, b) => {
    const dateA = new Date(a[1][0]?.readyDate || '9999-12-31');
    const dateB = new Date(b[1][0]?.readyDate || '9999-12-31');
    return dateA - dateB;
  });

  return (
    <div className="space-y-4">
      {sortedPOs.map(([poNumber, items]) => {
        const firstItem = items[0];
        const totalAmount = items.reduce((sum, item) => {
          const qty = item.qty || 0;
          const unitPrice = item.unitPrice || 0;
          return sum + qty * unitPrice;
        }, 0);

        const readyDate = firstItem?.readyDate ? new Date(firstItem.readyDate).toLocaleDateString() : 'TBD';
        const isExpanded = expandedPO === poNumber;

        return (
          <div
            key={poNumber}
            className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            <button
              onClick={() => setExpandedPO(isExpanded ? null : poNumber)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex-1 text-left space-y-2">
                <div className="flex items-center gap-3">
                  <StatusBadge status={firstItem?.status || 'Unknown'} size="sm" />
                  <span className="font-semibold text-slate-900">PO #{poNumber}</span>
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>
                    <span className="font-medium">Supplier:</span> {firstItem?.supplier || 'Unknown'}
                  </p>
                  <p>
                    <span className="font-medium">Category:</span> {firstItem?.category || 'Unknown'}
                  </p>
                  <div className="flex gap-6">
                    <span>
                      <span className="font-medium">Ready Date:</span> {readyDate}
                    </span>
                    <span>
                      <span className="font-medium">Items:</span> {items.length}
                    </span>
                    <span>
                      <span className="font-medium">Total:</span> ${totalAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronDown
                className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ml-4 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                size={20}
              />
            </button>

            {isExpanded && (
              <div className="border-t border-slate-200 px-6 py-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-3 font-semibold text-slate-700">
                          Description
                        </th>
                        <th className="text-right py-3 px-3 font-semibold text-slate-700">Qty</th>
                        <th className="text-left py-3 px-3 font-semibold text-slate-700">UOM</th>
                        <th className="text-right py-3 px-3 font-semibold text-slate-700">Unit Price</th>
                        <th className="text-right py-3 px-3 font-semibold text-slate-700">Subtotal</th>
                        <th className="text-left py-3 px-3 font-semibold text-slate-700">Ready Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const subtotal = (item.qty || 0) * (item.unitPrice || 0);
                        const rDate = item.readyDate
                          ? new Date(item.readyDate).toLocaleDateString()
                          : 'TBD';
                        return (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-3 text-slate-900">{item.description || 'N/A'}</td>
                            <td className="py-3 px-3 text-right text-slate-600">
                              {(item.qty || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-slate-600">{item.uom || 'Unit'}</td>
                            <td className="py-3 px-3 text-right text-slate-600">
                              ${(item.unitPrice || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-900">
                              ${subtotal.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-slate-600">{rDate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {sortedPOs.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-slate-500">No open purchase orders</p>
        </div>
      )}
    </div>
  );
}