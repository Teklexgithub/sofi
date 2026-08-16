import { forwardRef } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation('print');
    const employeeName = employee?.full_name || payslip.employee_name || 'N/A';
    const branchName = employee?.branch_name || payslip.branch_name || 'N/A';
    const etb = t('common:units.etb');

    return (
      <PrintLayout
        ref={ref}
        title={t('payslip.title')}
        subtitle={employeeName}
        documentId={`#PAY-${payslip.id.substring(0, 8).toUpperCase()}`}
        signatures={{ left: t('payslip.employeeSignature'), right: t('payslip.issuedBy') }}
      >
        <table style={{ ...printTableStyle, marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>{t('common:fields.employee')}</td>
              <td style={printTdStyle}>{employeeName}</td>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>{t('common:fields.role')}</td>
              <td style={printTdStyle}>{employee?.job_role_display || 'N/A'}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('common:fields.branch')}</td>
              <td style={printTdStyle}>{branchName}</td>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('payslip.runDate')}</td>
              <td style={printTdStyle}>{dayjs(payslip.executed_at || undefined).format('YYYY-MM-DD HH:mm')}</td>
            </tr>
            {calc && (
              <tr>
                <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('payslip.payPeriod')}</td>
                <td style={printTdStyle} colSpan={3}>
                  {t('payslip.payPeriodRange', {
                    start: calc.calculation_start_date,
                    end: calc.calculation_end_date,
                    days: calc.days_calculated,
                  })}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ fontWeight: 700, fontSize: '13px', color: '#714B67', marginBottom: '6px' }}>{t('payslip.earningsAndDeductions')}</div>
        <table style={{ ...printTableStyle, width: '70%', marginBottom: '20px' }}>
          <tbody>
            {calc && (
              <tr>
                <td style={printTdStyle}>{t('payslip.monthlySalaryRate')}</td>
                <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(calc.monthly_salary_rate)} {etb}</td>
              </tr>
            )}
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('payslip.accruedGrossSalary')}</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 700 }}>+ {fmt(payslip.base_salary_snapshot)} {etb}</td>
            </tr>
            {calc ? (
              <>
                <tr>
                  <td style={printTdStyle}>{t('payslip.advanceDeductions')}</td>
                  <td style={{ ...printTdStyle, textAlign: 'right' }}>- {fmt(calc.advance_deductions)} {etb}</td>
                </tr>
                <tr>
                  <td style={printTdStyle}>{t('payslip.shortageDeductions')}</td>
                  <td style={{ ...printTdStyle, textAlign: 'right' }}>- {fmt(calc.shortage_deductions)} {etb}</td>
                </tr>
              </>
            ) : null}
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('payslip.totalDeductions')}</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 700 }}>- {fmt(payslip.total_deductions_applied)} {etb}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 800, fontSize: '14px', background: '#f6ffed' }}>{t('payslip.finalNetCashPayout')}</td>
              <td style={{ ...printTdStyle, textAlign: 'right', fontWeight: 800, fontSize: '14px', color: '#389e0d', background: '#f6ffed' }}>
                {fmt(payslip.final_net_cash_payout)} {etb}
              </td>
            </tr>
          </tbody>
        </table>

        {payslip.notes && (
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#714B67', marginBottom: '6px' }}>{t('payslip.auditRemarks')}</div>
            <div style={{ fontSize: '12px', color: '#555', border: '1px solid #ddd', padding: '8px', borderRadius: '4px' }}>{payslip.notes}</div>
          </div>
        )}
      </PrintLayout>
    );
  }
);

PayslipDocument.displayName = 'PayslipDocument';

export default PayslipDocument;
