import CollapsibleSection from '../components/CollapsibleSection';
import { useDashboard } from '../context/DashboardContext';

function stripSizeSuffix(productName) {
  if (!productName) return '';
  return productName.replace(/\s*[-\/]\s*\d+[A-Za-z]*\s*$/, '').trim();
}

function matchProducts(caCincyProduct, fbaList) {
  const baseName = stripSizeSuffix(caCincyProduct);
  return fbaList.filter((fba) => stripSizeSuffix(fba.product) === baseName);
}

function getNextRuns(product, productionList) {
  return productionList.filter((p) => p.itemDescription === product);
}

export default function Inventory() {
  const { data, loading } = useDashboard();

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const caCincy = data.caCincy || [];
  const fba = data.fba || [];
  const production = data.production || [];
  const dcInventory = data.dcInventory || [];

  // Group CA Cincy by product and then by category
  const caCincyByCategory = {};
  caCincy.forEach((item) => {
    const category = item.plcat || 'Uncategorized';
    if (!caCincyByCategory[category]) {
      caCincyByCategory[category] = {};
    }
    const productKey = item.product || 'Unknown';
    if (!caCincyByCategory[category][productKey]) {
      caCincyByCategory[category][productKey] = {
        product: productKey,
        oh: 0,
      };
    }
    caCincyByCategory[category][productKey].oh += item.oh || 0;
  });

  // Group DC inventory by distributor and DC
  const dcByDistributor = {};
  dcInventory.forEach((item) => {
    const distributor = item.distributor || 'Unknown';
    const dc = item.dc || 'Unknown';
    if (!dcByDistributor[distributor]) {
      dcByDistributor[distributor] = {};
    }
    if (!dcByDistributor[distributor][dc]) {
      dcByDistributor[distributor][dc] = [];
    }
    dcByDistributor[distributor][dc].push(item);
  });

  return (
    <div className="space-y-6">
      <CollapsibleSection title="CA Cincy + FBA + Production" defaultOpen={true}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-3 font-semibold text-slate-700">Product</th>
                <th className="text-right py-3 px-3 font-semibold text-slate-700">CA Cincy OH</th>
                <th className="text-right py-3 px-3 font-semibold text-slate-700">FBA QoH</th>
                <th className="text-right py-3 px-3 font-semibold text-slate-700">FBA Inbound</th>
                <th className="text-left py-3 px-3 font-semibold text-slate-700">Next Run</th>
                <th className="text-left py-3 px-3 font-semibold text-slate-700">Following Run</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(caCincyByCategory).map(([category, products]) => (
                <tbody key={category}>
                  <tr className="bg-blue-50">
                    <td colSpan="6" className="py-2 px-3">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                        {category}
                      </p>
                    </td>
                  </tr>
                  {Object.values(products).map((product, idx) => {
                    const matchingFBA = matchProducts(product.product, fba);
                    const totalFBAQoH = matchingFBA.reduce((sum, f) => sum + (f.qoh || 0), 0);
                    const totalFBAInbound = matchingFBA.reduce((sum, f) => sum + (f.inbound || 0), 0);
                    const nextRuns = getNextRuns(product.product, production);
                    const nextRun = nextRuns[0];
                    const followingRun = nextRuns[1];

                    const ohClass = product.oh <= 0 ? 'text-red-600 font-medium' : 'text-slate-600';
                    const fbaClass = totalFBAQoH <= 5 ? 'text-amber-600 font-medium' : 'text-slate-600';

                    return (
                      <tr
                        key={idx}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-3 text-slate-900">{product.product}</td>
                        <td className={`py-3 px-3 text-right ${ohClass}`}>
                          {product.oh.toLocaleString()}
                        </td>
                        <td className={`py-3 px-3 text-right ${fbaClass}`}>
                          {totalFBAQoH.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600">
                          {totalFBAInbound.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-600">
                          {nextRun
                            ? `${new Date(nextRun.date).toLocaleDateString()} (${nextRun.qty} units)`
                            : '-'}
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-600">
                          {followingRun
                            ? `${new Date(followingRun.date).toLocaleDateString()} (${followingRun.qty} units)`
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="KeHE DC Inventory" defaultOpen={false}>
        {dcByDistributor['KeHE'] ? (
          <div className="space-y-4">
            {Object.entries(dcByDistributor['KeHE']).map(([dcName, items]) => {
              const dcByCategory = {};
              items.forEach((item) => {
                const category = item.category || 'Uncategorized';
                if (!dcByCategory[category]) {
                  dcByCategory[category] = [];
                }
                dcByCategory[category].push(item);
              });

              const dcTotal = items.reduce((sum, item) => sum + (item.oh || 0) + (item.oo || 0), 0);

              return (
                <div key={dcName} className="border border-slate-200 rounded-lg">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <p className="font-semibold text-slate-900">
                      {dcName} - Total: {dcTotal.toLocaleString()}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 font-semibold text-slate-700">Product</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700">OH</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700">OO</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(dcByCategory).map(([category, products]) => (
                          <tbody key={category}>
                            <tr className="bg-blue-50">
                              <td colSpan="4" className="py-1.5 px-3">
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
                                <td className="py-2 px-3 text-slate-900 text-xs">{product.product}</td>
                                <td className="py-2 px-3 text-right text-slate-600 text-xs">
                                  {(product.oh || 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-600 text-xs">
                                  {(product.oo || 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-slate-900 text-xs">
                                  {((product.oh || 0) + (product.oo || 0)).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-500">No KeHE inventory data available</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="UNFI DC Inventory" defaultOpen={false}>
        {dcByDistributor['UNFI'] ? (
          <div className="space-y-4">
            {Object.entries(dcByDistributor['UNFI']).map(([dcName, items]) => {
              const dcByCategory = {};
              items.forEach((item) => {
                const category = item.category || 'Uncategorized';
                if (!dcByCategory[category]) {
                  dcByCategory[category] = [];
                }
                dcByCategory[category].push(item);
              });

              const dcTotal = items.reduce((sum, item) => sum + (item.oh || 0) + (item.oo || 0), 0);

              return (
                <div key={dcName} className="border border-slate-200 rounded-lg">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <p className="font-semibold text-slate-900">
                      {dcName} - Total: {dcTotal.toLocaleString()}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 font-semibold text-slate-700">Product</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700">OH</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700">OO</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(dcByCategory).map(([category, products]) => (
                          <tbody key={category}>
                            <tr className="bg-blue-50">
                              <td colSpan="4" className="py-1.5 px-3">
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
                                <td className="py-2 px-3 text-slate-900 text-xs">{product.product}</td>
                                <td className="py-2 px-3 text-right text-slate-600 text-xs">
                                  {(product.oh || 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-600 text-xs">
                                  {(product.oo || 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-slate-900 text-xs">
                                  {((product.oh || 0) + (product.oo || 0)).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-500">No UNFI inventory data available</p>
        )}
      </CollapsibleSection>
    </div>
  );
}