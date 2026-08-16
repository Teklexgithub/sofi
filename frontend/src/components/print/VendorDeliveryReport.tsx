import { forwardRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation('print');
    const etb = t('common:units.etb');
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
        title={t('deliveryReport.title')}
        subtitle={t('deliveryReport.subtitle', { vendor: vendorName, dateFrom, dateTo })}
      >
        {Array.from(grouped.entries()).map(([branchName, branchRows]) => {
          const branchTotal = branchRows.reduce((sum, r) => sum + Number(r.calculated_row_subtotal || 0), 0);
          return (
            <div key={branchName} style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#714B67', marginBottom: '6px' }}>{branchName}</div>
              <table style={printTableStyle}>
                <thead>
                  <tr>
                    <th style={printThStyle}>{t('common:fields.date')}</th>
                    <th style={printThStyle}>{t('common:fields.product')}</th>
                    <th style={{ ...printThStyle, textAlign: 'right' }}>{t('common:units.packs')}</th>
                    <th style={{ ...printThStyle, textAlign: 'right' }}>{t('common:units.pieces')}</th>
                    <th style={{ ...printThStyle, textAlign: 'right' }}>{t('shared.unitPrice')}</th>
                    <th style={{ ...printThStyle, textAlign: 'right' }}>{t('shared.subtotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {branchRows.map((row) => (
                    <tr key={row.id}>
                      <td style={printTdStyle}>{dayjs(row.date_received).format('YYYY-MM-DD')}</td>
                      <td style={printTdStyle}>{row.product_name}</td>
                      <td style={{ ...printTdStyle, textAlign: 'right' }}>{row.packs_received}</td>
                      <td style={{ ...printTdStyle, textAlign: 'right' }}>{row.calculated_pieces_count}</td>
                      <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(row.buying_price_unit)} {etb}</td>
                      <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(row.calculated_row_subtotal)} {etb}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...printTdStyle, fontWeight: 700 }} colSpan={5}>{t('deliveryReport.branchSubtotal')}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 700 }}>{fmt(branchTotal)} {etb}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div style={{ fontSize: '12px', color: '#999', fontStyle: 'italic', marginBottom: '16px' }}>
            {t('deliveryReport.noDeliveries')}
          </div>
        )}

        <table style={{ ...printTableStyle, width: '60%', marginLeft: 'auto' }}>
          <tbody>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('deliveryReport.grandTotalPacks')}</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 700 }}>{fmt(grandPacks)}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 800, fontSize: '14px', background: '#f6ffed' }}>{t('deliveryReport.grandTotalCost')}</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 800, fontSize: '14px', color: '#389e0d', background: '#f6ffed' }}>
                {fmt(grandTotal)} {etb}
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
