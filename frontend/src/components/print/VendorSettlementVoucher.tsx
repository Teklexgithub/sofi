import { forwardRef } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
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

interface DeductionLine {
  id: string;
  report_date: string;
  product_name: string;
  branch_name: string;
  quantity: number;
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
  itemized_deductions?: DeductionLine[];
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
    const { t } = useTranslation('print');
    const latestInstallment = settlement.installments?.[settlement.installments.length - 1];
    const etb = t('common:units.etb');

    const paymentStatusLabel = settlement.payment_status === 'FULL'
      ? t('common:status.fullyPaid')
      : settlement.payment_status === 'PARTIAL'
        ? t('common:status.partial')
        : t('common:status.unpaid');

    return (
      <PrintLayout
        ref={ref}
        title={t('vendorVoucher.title')}
        subtitle={settlement.vendor_name}
        documentId={`#SETL-${settlement.id.substring(0, 8).toUpperCase()}`}
        signatures={{ left: t('vendorVoucher.receivedByVendorAgent'), right: t('vendorVoucher.paidByAdmin') }}
      >
        <table style={{ ...printTableStyle, marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>{t('common:fields.vendor')}</td>
              <td style={printTdStyle}>{settlement.vendor_name}</td>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>{t('vendorVoucher.dateFinalized')}</td>
              <td style={printTdStyle}>{dayjs(settlement.created_at || undefined).format('YYYY-MM-DD HH:mm')}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('common:fields.contactPerson')}</td>
              <td style={printTdStyle}>{vendor?.contact_person || 'N/A'}</td>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('common:fields.phoneNumber')}</td>
              <td style={printTdStyle}>{vendor?.phone_no || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('vendorVoucher.bankAccount')}</td>
              <td style={printTdStyle} colSpan={3}>{vendor?.bank_account || 'N/A'}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontWeight: 700, fontSize: '13px', color: '#714B67', marginBottom: '6px' }}>{t('vendorVoucher.itemizedDeliveries')}</div>
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
            {(settlement.itemized_deliveries || []).map((line) => (
              <tr key={line.id}>
                <td style={printTdStyle}>{line.id === 'prior-debt-liability-node' ? '-' : dayjs(line.date_received).format('YYYY-MM-DD')}</td>
                <td style={printTdStyle}>{line.product_name}</td>
                <td style={{ ...printTdStyle, textAlign: 'right' }}>{line.packs_received ?? '-'}</td>
                <td style={{ ...printTdStyle, textAlign: 'right' }}>{line.calculated_pieces_count ?? '-'}</td>
                <td style={{ ...printTdStyle, textAlign: 'right' }}>{line.buying_price_unit ? `${fmt(line.buying_price_unit)} ${etb}` : '-'}</td>
                <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(line.calculated_row_subtotal)} {etb}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {(settlement.itemized_deductions || []).length > 0 && (
          <>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#d46b08', marginTop: '16px', marginBottom: '6px' }}>{t('vendorVoucher.itemizedDeductions')}</div>
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printThStyle}>{t('common:fields.date')}</th>
                  <th style={printThStyle}>{t('common:fields.product')}</th>
                  <th style={printThStyle}>{t('common:fields.branch')}</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>{t('common:fields.quantity')}</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>{t('shared.unitPrice')}</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>{t('shared.subtotal')}</th>
                </tr>
              </thead>
              <tbody>
                {(settlement.itemized_deductions || []).map((line) => (
                  <tr key={line.id}>
                    <td style={printTdStyle}>{dayjs(line.report_date).format('YYYY-MM-DD')}</td>
                    <td style={printTdStyle}>{line.product_name}</td>
                    <td style={printTdStyle}>{line.branch_name}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{line.quantity}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(line.buying_price_unit)} {etb}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 600, color: '#d46b08' }}>-{fmt(line.calculated_row_subtotal)} {etb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <table style={{ ...printTableStyle, width: '60%', marginLeft: 'auto' }}>
          <tbody>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('vendorVoucher.totalBatchCost')}</td>
              <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(settlement.total_batch_cost)} {etb}</td>
            </tr>
            {latestInstallment && (
              <>
                <tr>
                  <td style={printTdStyle}>{t('vendorVoucher.cashHandedOver')}</td>
                  <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(latestInstallment.amount_handed_over)} {etb}</td>
                </tr>
                <tr>
                  <td style={printTdStyle}>{t('vendorVoucher.advanceUsedFromPast')}</td>
                  <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(latestInstallment.advance_used_from_past)} {etb}</td>
                </tr>
                <tr>
                  <td style={printTdStyle}>{t('vendorVoucher.newAdvanceSurplus')}</td>
                  <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(latestInstallment.advance_amount_created)} {etb}</td>
                </tr>
              </>
            )}
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('vendorVoucher.amountPaidTotal')}</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 700 }}>{fmt(settlement.amount_paid_total)} {etb}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('vendorVoucher.remainingDebt')}</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 700 }}>{fmt(settlement.remaining_debt)} {etb}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('vendorVoucher.paymentStatus')}</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 700 }}>{paymentStatusLabel}</td>
            </tr>
          </tbody>
        </table>
      </PrintLayout>
    );
  }
);

VendorSettlementVoucher.displayName = 'VendorSettlementVoucher';

export default VendorSettlementVoucher;
