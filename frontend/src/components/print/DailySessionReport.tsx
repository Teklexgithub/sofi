import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import PrintLayout, { printTableStyle, printThStyle, printTdStyle } from './PrintLayout';

interface Session {
  id?: string;
  branch_name?: string;
  trading_date: string;
  cash_handed_to_admin: number;
  cash_retained_for_change: number;
  total_sales: number;
  total_expenses: number;
  total_new_credit: number;
  total_credit_recovered: number;
  products_sold?: any[];
  expenses_logged?: any[];
  digital_balances?: any[];
  credits_issued?: any[];
  credit_payments?: any[];
  manual_deposits?: any[];
}

interface DailySessionReportProps {
  session: Session;
}

const fmt = (v: number) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '18px' }}>
    <div style={{ fontWeight: 700, fontSize: '13px', color: '#714B67', marginBottom: '6px' }}>{title}</div>
    {children}
  </div>
);

const Empty = () => {
  const { t } = useTranslation('print');
  return <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', marginBottom: '10px' }}>{t('dailySessionReport.noneRecorded')}</div>;
};

const DailySessionReport = forwardRef<HTMLDivElement, DailySessionReportProps>(
  ({ session }, ref) => {
    const { t } = useTranslation('print');
    const etb = t('common:units.etb');
    return (
      <PrintLayout
        ref={ref}
        title={t('dailySessionReport.title')}
        subtitle={`${session.branch_name || 'N/A'} — ${session.trading_date}`}
        documentId={session.id ? `#SESS-${session.id.substring(0, 8).toUpperCase()}` : undefined}
        signatures={{ left: t('dailySessionReport.branchAdminHandover'), right: t('dailySessionReport.receivedByAdminCourier') }}
      >
        <table style={{ ...printTableStyle, marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>{t('dailySessionReport.grossSales')}</td>
              <td style={printTdStyle}>{fmt(session.total_sales)} {etb}</td>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>{t('dailySessionReport.totalExpenses')}</td>
              <td style={printTdStyle}>{fmt(session.total_expenses)} {etb}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('dailySessionReport.newCreditIssued')}</td>
              <td style={printTdStyle}>{fmt(session.total_new_credit)} {etb}</td>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('dailySessionReport.creditRecovered')}</td>
              <td style={printTdStyle}>{fmt(session.total_credit_recovered)} {etb}</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('dailySessionReport.cashHandedToAdmin')}</td>
              <td style={printTdStyle}>{fmt(session.cash_handed_to_admin)} {etb}</td>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>{t('dailySessionReport.cashRetainedForChange')}</td>
              <td style={printTdStyle}>{fmt(session.cash_retained_for_change)} {etb}</td>
            </tr>
          </tbody>
        </table>

        <Section title={t('dailySessionReport.section1Title')}>
          {session.products_sold?.length ? (
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printThStyle}>{t('common:fields.product')}</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>{t('dailySessionReport.open')}</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>{t('dailySessionReport.close')}</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>{t('dailySessionReport.sold')}</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>{t('common:fields.price')}</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>{t('shared.subtotal')}</th>
                </tr>
              </thead>
              <tbody>
                {session.products_sold.map((p: any, i: number) => (
                  <tr key={p.id || i}>
                    <td style={printTdStyle}>{p.product_name}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{p.opening}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{p.closing}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{p.sold}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(p.price_at_sale)}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(Number(p.sold) * Number(p.price_at_sale))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty />}
        </Section>

        <Section title={t('dailySessionReport.section2Title')}>
          {session.expenses_logged?.length ? (
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printThStyle}>{t('common:fields.reason')}</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>{t('common:fields.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {session.expenses_logged.map((e: any, i: number) => (
                  <tr key={i}>
                    <td style={printTdStyle}>{e.reason}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(e.amount)} {etb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty />}
        </Section>

        <Section title={t('dailySessionReport.section3Title')}>
          {session.digital_balances?.length ? (
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printThStyle}>{t('dailySessionReport.account')}</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>{t('dailySessionReport.closingBalance')}</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>{t('dailySessionReport.revenueDelta')}</th>
                </tr>
              </thead>
              <tbody>
                {session.digital_balances.map((d: any, i: number) => (
                  <tr key={d.id || i}>
                    <td style={printTdStyle}>{d.account_name}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(d.closing_balance)} {etb}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{d.revenue_delta >= 0 ? '+' : ''}{fmt(d.revenue_delta)} {etb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty />}
        </Section>

        <Section title={t('dailySessionReport.section4Title')}>
          {session.credits_issued?.length ? (
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printThStyle}>{t('common:fields.customer')}</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>{t('common:fields.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {session.credits_issued.map((c: any, i: number) => (
                  <tr key={c.id || i}>
                    <td style={printTdStyle}>{c.customer_name || 'Unknown'}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(c.amount)} {etb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty />}
        </Section>

        <Section title={t('dailySessionReport.section5Title')}>
          {session.credit_payments?.length ? (
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printThStyle}>{t('common:fields.customer')}</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>{t('dailySessionReport.amountRecovered')}</th>
                </tr>
              </thead>
              <tbody>
                {session.credit_payments.map((c: any, i: number) => (
                  <tr key={i}>
                    <td style={printTdStyle}>{c.customer_name || c.customer || 'Unknown'}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(c.amount_paid ?? c.amount)} {etb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty />}
        </Section>

        <Section title={t('dailySessionReport.section6Title')}>
          {session.manual_deposits?.length ? (
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printThStyle}>{t('dailySessionReport.bank')}</th>
                  <th style={printThStyle}>{t('dailySessionReport.accountHolder')}</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>{t('common:fields.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {session.manual_deposits.map((m: any, i: number) => (
                  <tr key={m.id || i}>
                    <td style={printTdStyle}>{m.bank_name || 'N/A'}</td>
                    <td style={printTdStyle}>{m.account_name || 'N/A'}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(m.amount)} {etb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty />}
        </Section>
      </PrintLayout>
    );
  }
);

DailySessionReport.displayName = 'DailySessionReport';

export default DailySessionReport;
