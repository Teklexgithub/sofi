import { forwardRef } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import PrintLayout, { printTableStyle, printTdStyle } from './PrintLayout';

interface LedgerEntry {
  id: string;
  employee_name?: string;
  entry_type_display?: string;
  amount: number;
  description?: string;
  is_settled?: boolean;
  created_at?: string;
}

interface Employee {
  full_name?: string;
  job_role_display?: string;
}

interface AdvanceVoucherProps {
  entry: LedgerEntry;
  employee?: Employee;
}

const fmt = (v: number) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AdvanceVoucher = forwardRef<HTMLDivElement, AdvanceVoucherProps>(
  ({ entry, employee }, ref) => {
    const { t } = useTranslation('print');
    const employeeName = employee?.full_name || entry.employee_name || 'N/A';

    return (
      <PrintLayout
        ref={ref}
        title={t('advanceVoucher.title')}
        subtitle={employeeName}
        documentId={`#LDG-${entry.id.substring(0, 8).toUpperCase()}`}
        signatures={{ left: t('advanceVoucher.employeeAcknowledgment'), right: t('advanceVoucher.issuedBy') }}
      >
        <table style={printTableStyle}>
          <tbody>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>{t('common:fields.employee')}</td>
              <td style={printTdStyle}>{employeeName}</td>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>{t('common:fields.role')}</td>
              <td style={printTdStyle}>{employee?.job_role_display || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('advanceVoucher.transactionType')}</td>
              <td style={printTdStyle}>{entry.entry_type_display || 'N/A'}</td>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('common:fields.date')}</td>
              <td style={printTdStyle}>{dayjs(entry.created_at || undefined).format('YYYY-MM-DD HH:mm')}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 800, fontSize: '14px', background: '#fff1f0' }}>{t('common:fields.amount')}</td>
              <td style={{ ...printTdStyle, fontWeight: 800, fontSize: '14px', background: '#fff1f0' }} colSpan={3}>{fmt(entry.amount)} {t('common:units.etb')}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('common:fields.status')}</td>
              <td style={printTdStyle} colSpan={3}>{entry.is_settled ? t('advanceVoucher.settledOnPayroll') : t('advanceVoucher.outstandingLiability')}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontWeight: 700, fontSize: '13px', color: '#714B67', margin: '16px 0 6px 0' }}>{t('advanceVoucher.reasonNarrative')}</div>
        <div style={{ fontSize: '12px', color: '#555', border: '1px solid #ddd', padding: '8px', borderRadius: '4px' }}>
          {entry.description || t('advanceVoucher.noDescription')}
        </div>
      </PrintLayout>
    );
  }
);

AdvanceVoucher.displayName = 'AdvanceVoucher';

export default AdvanceVoucher;
