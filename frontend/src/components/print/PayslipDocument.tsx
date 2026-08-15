import { forwardRef } from 'react';
import dayjs from 'dayjs';
import PrintLayout, { printTableStyle, printTdStyle } from './PrintLayout';

interface PayslipCalc {
  calculation_start_date: string;
  calculation_end_date: string;
  days_calculated: number;
  monthly_salary_rate: number;
  base_salary: number;
  advance_deductions: number;
  shortage_deductions: number;
}

interface Payslip {
  id: string;
  employee_name?: string;
  branch_name?: string;
  base_salary_snapshot: number;
  total_deductions_applied: number;
  final_net_cash_payout: number;
  notes?: string;
  executed_at?: string;
}

interface Employee {
  full_name?: string;
  job_role_display?: string;
  branch_name?: string;
}

interface PayslipDocumentProps {
  payslip: Payslip;
  calc?: PayslipCalc;
  employee?: Employee;
}

const fmt = (v: number) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PayslipDocument = forwardRef<HTMLDivElement, PayslipDocumentProps>(
  ({ payslip, calc, employee }, ref) => {
    const employeeName = employee?.full_name || payslip.employee_name || 'N/A';
    const branchName = employee?.branch_name || payslip.branch_name || 'N/A';

    return (
      <PrintLayout
        ref={ref}
        title="Employee Payslip"
        subtitle={employeeName}
        documentId={`#PAY-${payslip.id.substring(0, 8).toUpperCase()}`}
        signatures={{ left: 'Employee Signature', right: 'Issued By' }}
      >
        <table style={{ ...printTableStyle, marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>Employee</td>
              <td style={printTdStyle}>{employeeName}</td>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>Role</td>
              <td style={printTdStyle}>{employee?.job_role_display || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Branch</td>
              <td style={printTdStyle}>{branchName}</td>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Run Date</td>
              <td style={printTdStyle}>{dayjs(payslip.executed_at || undefined).format('YYYY-MM-DD HH:mm')}</td>
            </tr>
            {calc && (
              <tr>
                <td style={{ ...printTdStyle, fontWeight: 700 }}>Pay Period</td>
                <td style={printTdStyle} colSpan={3}>
                  {calc.calculation_start_date} to {calc.calculation_end_date} ({calc.days_calculated} days)
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ fontWeight: 700, fontSize: '13px', color: '#714B67', marginBottom: '6px' }}>Earnings & Deductions</div>
        <table style={{ ...printTableStyle, width: '70%', marginBottom: '20px' }}>
          <tbody>
            {calc && (
              <tr>
                <td style={printTdStyle}>Monthly Salary Rate</td>
                <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(calc.monthly_salary_rate)} ETB</td>
              </tr>
            )}
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Accrued Gross Salary</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 700 }}>+ {fmt(payslip.base_salary_snapshot)} ETB</td>
            </tr>
            {calc ? (
              <>
                <tr>
                  <td style={printTdStyle}>Advance / Fine Deductions</td>
                  <td style={{ ...printTdStyle, textAlign: 'right' }}>- {fmt(calc.advance_deductions)} ETB</td>
                </tr>
                <tr>
                  <td style={printTdStyle}>Cash Shortage Deductions</td>
                  <td style={{ ...printTdStyle, textAlign: 'right' }}>- {fmt(calc.shortage_deductions)} ETB</td>
                </tr>
              </>
            ) : null}
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Total Deductions</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 700 }}>- {fmt(payslip.total_deductions_applied)} ETB</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 800, fontSize: '14px', background: '#f6ffed' }}>Final Net Cash Payout</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 800, fontSize: '14px', color: '#389e0d', background: '#f6ffed' }}>
                {fmt(payslip.final_net_cash_payout)} ETB
              </td>
            </tr>
          </tbody>
        </table>

        {payslip.notes && (
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#714B67', marginBottom: '6px' }}>Audit Remarks</div>
            <div style={{ fontSize: '12px', color: '#555', border: '1px solid #ddd', padding: '8px', borderRadius: '4px' }}>{payslip.notes}</div>
          </div>
        )}
      </PrintLayout>
    );
  }
);

PayslipDocument.displayName = 'PayslipDocument';

export default PayslipDocument;
