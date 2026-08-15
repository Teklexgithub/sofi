import { forwardRef } from 'react';
import dayjs from 'dayjs';
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
    const employeeName = employee?.full_name || entry.employee_name || 'N/A';

    return (
      <PrintLayout
        ref={ref}
        title="Staff Advance / Fine Voucher"
        subtitle={employeeName}
        documentId={`#LDG-${entry.id.substring(0, 8).toUpperCase()}`}
        signatures={{ left: 'Employee Acknowledgment', right: 'Issued By' }}
      >
        <table style={printTableStyle}>
          <tbody>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>Employee</td>
              <td style={printTdStyle}>{employeeName}</td>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>Role</td>
              <td style={printTdStyle}>{employee?.job_role_display || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Transaction Type</td>
              <td style={printTdStyle}>{entry.entry_type_display || 'N/A'}</td>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Date</td>
              <td style={printTdStyle}>{dayjs(entry.created_at || undefined).format('YYYY-MM-DD HH:mm')}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 800, fontSize: '14px', background: '#fff1f0' }}>Amount</td>
              <td style={{ ...printTdStyle, fontWeight: 800, fontSize: '14px', background: '#fff1f0' }} colSpan={3}>{fmt(entry.amount)} ETB</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Status</td>
              <td style={printTdStyle} colSpan={3}>{entry.is_settled ? 'Settled on Payroll Run' : 'Outstanding Liability'}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontWeight: 700, fontSize: '13px', color: '#714B67', margin: '16px 0 6px 0' }}>Reason / Narrative</div>
        <div style={{ fontSize: '12px', color: '#555', border: '1px solid #ddd', padding: '8px', borderRadius: '4px' }}>
          {entry.description || 'No description provided.'}
        </div>
      </PrintLayout>
    );
  }
);

AdvanceVoucher.displayName = 'AdvanceVoucher';

export default AdvanceVoucher;
