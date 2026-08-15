import { forwardRef } from 'react';
import dayjs from 'dayjs';
import PrintLayout, { printTableStyle, printThStyle, printTdStyle } from './PrintLayout';

interface DeliveryLine {
  id: string;
  date_received: string;
  product_name: string;
  packs_received: number;
  calculated_pieces_count: number;
  buying_price_unit: number;
  calculated_row_subtotal: number;
}

interface Installment {
  amount_handed_over: number;
  advance_amount_created: number;
  advance_used_from_past: number;
  paid_at: string;
}

interface Settlement {
  id: string;
  vendor_name: string;
  created_at?: string;
  total_batch_cost: number;
  amount_paid_total: number;
  remaining_debt: number;
  payment_status: string;
  itemized_deliveries: DeliveryLine[];
  installments: Installment[];
}

interface Vendor {
  contact_person?: string;
  phone_no?: string;
  bank_account?: string;
}

interface VendorSettlementVoucherProps {
  settlement: Settlement;
  vendor?: Vendor;
}

const fmt = (v: number) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const VendorSettlementVoucher = forwardRef<HTMLDivElement, VendorSettlementVoucherProps>(
  ({ settlement, vendor }, ref) => {
    const latestInstallment = settlement.installments?.[settlement.installments.length - 1];

    return (
      <PrintLayout
        ref={ref}
        title="Vendor Payment Voucher"
        subtitle={settlement.vendor_name}
        documentId={`#SETL-${settlement.id.substring(0, 8).toUpperCase()}`}
        signatures={{ left: 'Received By (Vendor / Agent)', right: 'Paid By (Admin)' }}
      >
        <table style={{ ...printTableStyle, marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>Vendor</td>
              <td style={printTdStyle}>{settlement.vendor_name}</td>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>Date Finalized</td>
              <td style={printTdStyle}>{dayjs(settlement.created_at || undefined).format('YYYY-MM-DD HH:mm')}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Contact Person</td>
              <td style={printTdStyle}>{vendor?.contact_person || 'N/A'}</td>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Phone</td>
              <td style={printTdStyle}>{vendor?.phone_no || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Bank Account</td>
              <td style={printTdStyle} colSpan={3}>{vendor?.bank_account || 'N/A'}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontWeight: 700, fontSize: '13px', color: '#714B67', marginBottom: '6px' }}>Itemized Deliveries Settled</div>
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
            {(settlement.itemized_deliveries || []).map((line) => (
              <tr key={line.id}>
                <td style={printTdStyle}>{line.id === 'prior-debt-liability-node' ? '-' : dayjs(line.date_received).format('YYYY-MM-DD')}</td>
                <td style={printTdStyle}>{line.product_name}</td>
                <td style={{ ...printTdStyle, textAlign: 'right' }}>{line.packs_received ?? '-'}</td>
                <td style={{ ...printTdStyle, textAlign: 'right' }}>{line.calculated_pieces_count ?? '-'}</td>
                <td style={{ ...printTdStyle, textAlign: 'right' }}>{line.buying_price_unit ? `${fmt(line.buying_price_unit)} ETB` : '-'}</td>
                <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(line.calculated_row_subtotal)} ETB</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table style={{ ...printTableStyle, width: '60%', marginLeft: 'auto' }}>
          <tbody>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Total Batch Cost</td>
              <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(settlement.total_batch_cost)} ETB</td>
            </tr>
            {latestInstallment && (
              <>
                <tr>
                  <td style={printTdStyle}>Cash Handed Over</td>
                  <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(latestInstallment.amount_handed_over)} ETB</td>
                </tr>
                <tr>
                  <td style={printTdStyle}>Advance Used From Past</td>
                  <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(latestInstallment.advance_used_from_past)} ETB</td>
                </tr>
                <tr>
                  <td style={printTdStyle}>New Advance Surplus Created</td>
                  <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(latestInstallment.advance_amount_created)} ETB</td>
                </tr>
              </>
            )}
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Amount Paid (Total)</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 700 }}>{fmt(settlement.amount_paid_total)} ETB</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Remaining Debt</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 700 }}>{fmt(settlement.remaining_debt)} ETB</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Payment Status</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 700 }}>{settlement.payment_status}</td>
            </tr>
          </tbody>
        </table>
      </PrintLayout>
    );
  }
);

VendorSettlementVoucher.displayName = 'VendorSettlementVoucher';

export default VendorSettlementVoucher;
