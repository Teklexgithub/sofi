import { forwardRef, useMemo } from 'react';
import dayjs from 'dayjs';
import PrintLayout, { printTableStyle, printThStyle, printTdStyle } from './PrintLayout';

interface DeliveryRow {
  id: string;
  date_received: string;
  branch_name: string;
  product_name: string;
  packs_received: number;
  calculated_pieces_count: number;
  buying_price_unit: number;
  calculated_row_subtotal: number;
}

interface VendorDeliveryReportProps {
  vendorName: string;
  dateFrom: string;
  dateTo: string;
  rows: DeliveryRow[];
}

const fmt = (v: number) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const VendorDeliveryReport = forwardRef<HTMLDivElement, VendorDeliveryReportProps>(
  ({ vendorName, dateFrom, dateTo, rows }, ref) => {
    const grouped = useMemo(() => {
      const byBranch = new Map<string, DeliveryRow[]>();
      [...rows]
        .sort((a, b) => (a.branch_name || '').localeCompare(b.branch_name || '') || a.date_received.localeCompare(b.date_received))
        .forEach((row) => {
          const key = row.branch_name || 'Unknown Branch';
          if (!byBranch.has(key)) byBranch.set(key, []);
          byBranch.get(key)!.push(row);
        });
      return byBranch;
    }, [rows]);

    const grandTotal = rows.reduce((sum, r) => sum + Number(r.calculated_row_subtotal || 0), 0);
    const grandPacks = rows.reduce((sum, r) => sum + Number(r.packs_received || 0), 0);

    return (
      <PrintLayout
        ref={ref}
        title="Vendor Delivery Report"
        subtitle={`${vendorName} — ${dateFrom} to ${dateTo}`}
      >
        {Array.from(grouped.entries()).map(([branchName, branchRows]) => {
          const branchTotal = branchRows.reduce((sum, r) => sum + Number(r.calculated_row_subtotal || 0), 0);
          return (
            <div key={branchName} style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#714B67', marginBottom: '6px' }}>{branchName}</div>
              <table style={printTableStyle}>
                <thead>
                  <tr>
                    <th style={printThStyle}>Date</th>
                    <th style={printThStyle}>Product</th>
                    <th style={{ ...printThStyle, textAlign: 'right' }}>Packs</th>
                    <th style={{ ...printThStyle, textAlign: 'right' }}>Pieces</th>
                    <th style={{ ...printThStyle, textAlign: 'right' }}>Unit Price</th>
                    <th style={{ ...printThStyle, textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {branchRows.map((row) => (
                    <tr key={row.id}>
                      <td style={printTdStyle}>{dayjs(row.date_received).format('YYYY-MM-DD')}</td>
                      <td style={printTdStyle}>{row.product_name}</td>
                      <td style={{ ...printTdStyle, textAlign: 'right' }}>{row.packs_received}</td>
                      <td style={{ ...printTdStyle, textAlign: 'right' }}>{row.calculated_pieces_count}</td>
                      <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(row.buying_price_unit)} ETB</td>
                      <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(row.calculated_row_subtotal)} ETB</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...printTdStyle, fontWeight: 700 }} colSpan={5}>Branch Subtotal</td>
                    <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 700 }}>{fmt(branchTotal)} ETB</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div style={{ fontSize: '12px', color: '#999', fontStyle: 'italic', marginBottom: '16px' }}>
            No deliveries found for this vendor in the selected date range.
          </div>
        )}

        <table style={{ ...printTableStyle, width: '60%', marginLeft: 'auto' }}>
          <tbody>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Grand Total Packs</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 700 }}>{fmt(grandPacks)}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 800, fontSize: '14px', background: '#f6ffed' }}>Grand Total Cost</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 800, fontSize: '14px', color: '#389e0d', background: '#f6ffed' }}>
                {fmt(grandTotal)} ETB
              </td>
            </tr>
          </tbody>
        </table>
      </PrintLayout>
    );
  }
);

VendorDeliveryReport.displayName = 'VendorDeliveryReport';

export default VendorDeliveryReport;
