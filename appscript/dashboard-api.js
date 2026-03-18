/**
 * Clean Age Weekly Dashboard — Data API
 *
 * Deploy as: Web App → Execute as: Me → Access: Anyone
 *
 * Endpoints (via ?action= parameter):
 *   ?action=sales&days=7          → Sales by source, product, WoW comparison
 *   ?action=inventory             → CA Cincy + FBA + DC inventory
 *   ?action=pos                   → Open purchase orders
 *   ?action=production            → Upcoming production runs
 *   ?action=all                   → Everything (default)
 *
 * Optional: &key=clean-age-team-meeting-2026 (for basic auth if desired)
 *
 * Data Sources:
 *   - Sales: BigQuery (cleanage-ops-shipstation.appsheets.appsheet_order_item)
 *   - CA Cincy Inventory: Google Sheet (ProductInventoryMaster tab)
 *   - DC Inventory: Google Sheet (dc_inventory Total tab)
 *   - FBA Inventory: BigQuery (appsheets.fba_inventory_tracking)
 *   - Open POs: Google Sheet (openPOs tab)
 *   - Production: Google Sheet (purchasingPlan tab)
 */

// ===== CONFIGURATION =====
const CONFIG = {
  BQ_PROJECT: 'cleanage-ops-shipstation',
  PROD_SHEET_ID: '1yL7dHRBMzR5-Rf1VsSv-FYRdv6TpNTEgoyj2JlPHE6s',
  DC_SHEET_ID: '1LT4xgIJEI3qYIsS4W3Giyb50wzU3QoSMQszeJzxJAkI',
  AUTH_KEY: 'clean-age-team-meeting-2026'
};

// ===== MAIN HANDLER =====
function doGet(e) {
  const action = (e.parameter.action || 'all').toLowerCase();

  try {
    let result = {};
    const timestamp = new Date().toISOString();

    if (action === 'all' || action === 'sales') {
      const days = parseInt(e.parameter.days || '7');
      result.sales = getSalesData(days);
    }

    if (action === 'all' || action === 'inventory') {
      result.caCincy = getCaCincyInventory();
      result.fba = getFbaInventory();
      result.dcInventory = getDcInventory();
    }

    if (action === 'all' || action === 'pos') {
      result.openPOs = getOpenPOs();
    }

    if (action === 'all' || action === 'production') {
      result.production = getProductionSchedule();
    }

    result.timestamp = timestamp;
    result.success = true;

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Allow POST for CORS preflight compatibility
function doPost(e) {
  return doGet(e);
}

// ===== SALES DATA (BigQuery) =====
function getSalesData(days) {
  // Query 1: By source
  const bySourceSQL = `
    SELECT source,
           COUNT(DISTINCT order_id) AS orders,
           SUM(quantity) AS units,
           ROUND(SUM(subtotal), 2) AS revenue
    FROM \`${CONFIG.BQ_PROJECT}.appsheets.appsheet_order_item\`
    WHERE order_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
      AND status != 'cancelled'
    GROUP BY source
    ORDER BY revenue DESC`;

  // Query 2: WoW comparison
  const wowSQL = `
    WITH this_period AS (
      SELECT ROUND(SUM(subtotal), 2) AS revenue, SUM(quantity) AS units, COUNT(DISTINCT order_id) AS orders
      FROM \`${CONFIG.BQ_PROJECT}.appsheets.appsheet_order_item\`
      WHERE order_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY) AND status != 'cancelled'
    ),
    last_period AS (
      SELECT ROUND(SUM(subtotal), 2) AS revenue, SUM(quantity) AS units, COUNT(DISTINCT order_id) AS orders
      FROM \`${CONFIG.BQ_PROJECT}.appsheets.appsheet_order_item\`
      WHERE order_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days * 2} DAY)
        AND order_date < DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY) AND status != 'cancelled'
    )
    SELECT this_period.revenue AS this_revenue, last_period.revenue AS last_revenue,
           ROUND((this_period.revenue - last_period.revenue) / NULLIF(last_period.revenue, 0) * 100, 1) AS revenue_pct,
           this_period.units AS this_units, last_period.units AS last_units,
           this_period.orders AS this_orders, last_period.orders AS last_orders
    FROM this_period, last_period`;

  // Query 3: By product
  const byProductSQL = `
    SELECT category,
           COALESCE(parent_product,
             CASE WHEN description LIKE '%3pk Deo%' THEN 'Variety 3-Pack (Deo)'
                  WHEN description LIKE '%3pk%Spray%' OR description LIKE '%3pk Body Spray%' THEN 'Variety 3-Pack (Spray)'
                  ELSE 'Unknown' END) AS product,
           SUM(quantity) AS units,
           ROUND(SUM(subtotal), 2) AS revenue,
           COUNT(DISTINCT order_id) AS orders
    FROM \`${CONFIG.BQ_PROJECT}.appsheets.appsheet_order_item\`
    WHERE order_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY) AND status != 'cancelled'
    GROUP BY category, product
    ORDER BY category, revenue DESC`;

  // Query 4: Walmart summary (order count + DC count)
  const walmartSQL = `
    SELECT source, COUNT(DISTINCT order_id) AS orders, COUNT(DISTINCT customer) AS dc_count
    FROM \`${CONFIG.BQ_PROJECT}.appsheets.appsheet_order_item\`
    WHERE order_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)
      AND source IN ('Walmart', 'KeHE', 'UNFI') AND status != 'cancelled'
    GROUP BY source`;

  // Query 5: Open/awaiting orders
  const openOrdersSQL = `
    SELECT source, status, COUNT(DISTINCT order_id) AS order_count, SUM(quantity) AS units, ROUND(SUM(subtotal), 2) AS revenue
    FROM \`${CONFIG.BQ_PROJECT}.appsheets.appsheet_order_item\`
    WHERE status IN ('awaiting_shipment', 'on_hold', 'awaiting_payment')
    GROUP BY source, status ORDER BY source, status`;

  return {
    bySource: runBQQuery(bySourceSQL),
    wow: runBQQuery(wowSQL),
    byProduct: runBQQuery(byProductSQL),
    wholesale: runBQQuery(walmartSQL),
    openOrders: runBQQuery(openOrdersSQL),
    days: days
  };
}

// ===== CA CINCY INVENTORY (Google Sheet) =====
function getCaCincyInventory() {
  const ss = SpreadsheetApp.openById(CONFIG.PROD_SHEET_ID);
  const sheet = ss.getSheetByName('ProductInventoryMaster');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Find column indices
  const colIdx = {};
  headers.forEach((h, i) => colIdx[h] = i);

  const items = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const compLevel = row[colIdx['Component Level']] || '';
    const parentProd = row[colIdx['Parent Product']] || '';
    if (compLevel !== 'Finished Good' || !parentProd) continue;
    items.push({
      product: parentProd,
      plcat: row[colIdx['PLCat']] || '',
      qoh: parseFloat(row[colIdx['Units QoH']] || 0),
      oo: parseFloat(row[colIdx['Units OO']] || 0)
    });
  }

  // Aggregate by parent product (multiple rows per product)
  const agg = {};
  items.forEach(item => {
    if (!agg[item.product]) {
      agg[item.product] = { product: item.product, plcat: item.plcat, qoh: 0, oo: 0 };
    }
    agg[item.product].qoh += item.qoh;
    agg[item.product].oo += item.oo;
  });
  return Object.values(agg);
}

// ===== FBA INVENTORY (BigQuery) =====
function getFbaInventory() {
  const sql = `
    SELECT COALESCE(parent_product, 'Unmapped') AS product, category,
           SUM(qoh) AS qoh, SUM(inbound) AS inbound, SUM(total_quantity) AS total
    FROM \`${CONFIG.BQ_PROJECT}.appsheets.fba_inventory_tracking\`
    WHERE parent_product IS NOT NULL
    GROUP BY parent_product, category
    ORDER BY category, parent_product`;
  return runBQQuery(sql);
}

// ===== DC INVENTORY (Google Sheet) =====
function getDcInventory() {
  const ss = SpreadsheetApp.openById(CONFIG.DC_SHEET_ID);
  const sheet = ss.getSheetByName('Total');
  const data = sheet.getDataRange().getValues();

  // Skip header rows (row 1 = display headers, row 2 = API headers)
  // Data starts at row 3 (index 2)
  const items = [];
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const dist = row[1]; // Column B
    const dc = row[2];   // Column C
    const cat = row[3];  // Column D
    const prod = row[4]; // Column E
    const oh = parseFloat(row[7] || 0);  // Column H
    const oo = parseFloat(row[8] || 0);  // Column I

    if (!dist || !prod) continue;

    // Skip deprecated 57g SKUs with 0 inventory
    if (prod.includes('57g') && oh === 0 && oo === 0) continue;

    // Skip display items with 0
    if (cat === 'Display' && oh === 0 && oo === 0) continue;

    items.push({ distributor: dist, dc: dc, category: cat, product: prod, oh: oh, oo: oo });
  }
  return items;
}

// ===== OPEN POs (Google Sheet) =====
function getOpenPOs() {
  const ss = SpreadsheetApp.openById(CONFIG.PROD_SHEET_ID);
  const sheet = ss.getSheetByName('openPOs');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const items = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = (row[1] || '').toString();

    // Skip completed and cancelled
    if (status.toLowerCase().includes('completed') ||
      status.toLowerCase().includes('cancelled') ||
      status.toLowerCase().includes('received')) continue;
    if (!status) continue;

    items.push({
      orderDate: formatDate(row[0]),
      status: status,
      supplier: row[2] || '',
      orderId: row[3] || '',
      category: row[4] || '',
      productId: row[5] || '',
      description: row[6] || '',
      quantity: row[7] || '',
      uom: row[8] || '',
      unitPrice: row[9] || '',
      readyDate: formatDate(row[10]),
      dueDate: formatDate(row[11]),
      destination: row[12] || '',
      subtotal: row[13] || ''
    });
  }
  return items;
}

// ===== PRODUCTION SCHEDULE (Google Sheet) =====
function getProductionSchedule() {
  const ss = SpreadsheetApp.openById(CONFIG.PROD_SHEET_ID);
  const sheet = ss.getSheetByName('purchasingPlan');
  const data = sheet.getDataRange().getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const type = (row[4] || '').toString();
    if (type !== 'Production') continue;

    const readyDate = row[1];
    if (!readyDate) continue;

    // Parse date and check if future
    let d;
    if (readyDate instanceof Date) {
      d = readyDate;
    } else {
      d = new Date(readyDate);
    }
    if (isNaN(d.getTime()) || d < today) continue;

    items.push({
      readyDate: formatDate(readyDate),
      status: row[2] || '',
      po: row[3] || '',
      plcat: row[5] || '',
      supplier: row[6] || '',
      itemId: row[7] || '',
      description: row[8] || '',
      quantity: parseFloat(row[9] || 0)
    });
  }

  // Sort by ready date
  items.sort((a, b) => new Date(a.readyDate) - new Date(b.readyDate));
  return items;
}

// ===== HELPERS =====
function runBQQuery(sql) {
  const request = { query: sql, useLegacySql: false };
  const response = BigQuery.Jobs.query(request, CONFIG.BQ_PROJECT);
  if (!response.rows) return [];
  const fields = response.schema.fields.map(f => f.name);
  return response.rows.map(row => {
    const obj = {};
    row.f.forEach((cell, i) => {
      obj[fields[i]] = cell.v;
    });
    return obj;
  });
}

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return (val.getMonth() + 1) + '/' + val.getDate() + '/' + val.getFullYear();
  }
  return val.toString();
}
