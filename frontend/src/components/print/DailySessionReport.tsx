import React, { forwardRef } from 'react';
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

const Empty = () => <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', marginBottom: '10px' }}>None recorded.</div>;

const DailySessionReport = forwardRef<HTMLDivElement, DailySessionReportProps>(
  ({ session }, ref) => {
    return (
      <PrintLayout
        ref={ref}
        title="Daily Session End-of-Day Report"
        subtitle={`${session.branch_name || 'N/A'} — ${session.trading_date}`}
        documentId={session.id ? `#SESS-${session.id.substring(0, 8).toUpperCase()}` : undefined}
        signatures={{ left: 'Branch Admin (Handover)', right: 'Received By (Admin / Courier)' }}
      >
        <table style={{ ...printTableStyle, marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>Gross Sales</td>
              <td style={printTdStyle}>{fmt(session.total_sales)} ETB</td>
              <td style={{ ...printTdStyle, fontWeight: 700, width: '25%' }}>Total Expenses</td>
              <td style={printTdStyle}>{fmt(session.total_expenses)} ETB</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>New Credit Issued</td>
              <td style={printTdStyle}>{fmt(session.total_new_credit)} ETB</td>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Credit Recovered</td>
              <td style={printTdStyle}>{fmt(session.total_credit_recovered)} ETB</td>
            </tr>
            <tr>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Cash Handed to Admin</td>
              <td style={printTdStyle}>{fmt(session.cash_handed_to_admin)} ETB</td>
              <td style={{ ...printTdStyle, fontWeight: 700 }}>Cash Retained for Change</td>
              <td style={printTdStyle}>{fmt(session.cash_retained_for_change)} ETB</td>
            </tr>
          </tbody>
        </table>

        <Section title="1. Stock Count">
          {session.products_sold?.length ? (
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printThStyle}>Product</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>Open</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>Close</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>Sold</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>Price</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>Subtotal</th>
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

        <Section title="2. Expenses">
          {session.expenses_logged?.length ? (
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printThStyle}>Reason</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {session.expenses_logged.map((e: any, i: number) => (
                  <tr key={i}>
                    <td style={printTdStyle}>{e.reason}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(e.amount)} ETB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty />}
        </Section>

        <Section title="3. Digital Account Balances">
          {session.digital_balances?.length ? (
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printThStyle}>Account</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>Closing Balance</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>Revenue Delta</th>
                </tr>
              </thead>
              <tbody>
                {session.digital_balances.map((d: any, i: number) => (
                  <tr key={d.id || i}>
                    <td style={printTdStyle}>{d.account_name}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(d.closing_balance)} ETB</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{d.revenue_delta >= 0 ? '+' : ''}{fmt(d.revenue_delta)} ETB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty />}
        </Section>

        <Section title="4. New Debts Issued">
          {session.credits_issued?.length ? (
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printThStyle}>Customer</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {session.credits_issued.map((c: any, i: number) => (
                  <tr key={c.id || i}>
                    <td style={printTdStyle}>{c.customer_name || 'Unknown'}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(c.amount)} ETB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty />}
        </Section>

        <Section title="5. Credit Recoveries">
          {session.credit_payments?.length ? (
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printThStyle}>Customer</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>Amount Recovered</th>
                </tr>
              </thead>
              <tbody>
                {session.credit_payments.map((c: any, i: number) => (
                  <tr key={i}>
                    <td style={printTdStyle}>{c.customer_name || c.customer || 'Unknown'}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(c.amount_paid ?? c.amount)} ETB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty />}
        </Section>

        <Section title="6. Manual Bank Deposits">
          {session.manual_deposits?.length ? (
            <table style={printTableStyle}>
              <thead>
                <tr>
                  <th style={printThStyle}>Bank</th>
                  <th style={printThStyle}>Account Holder</th>
                  <th style={{ ...printThStyle, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {session.manual_deposits.map((m: any, i: number) => (
                  <tr key={m.id || i}>
                    <td style={printTdStyle}>{m.bank_name || 'N/A'}</td>
                    <td style={printTdStyle}>{m.account_name || 'N/A'}</td>
                    <td style={{ ...printTdStyle, textAlign: 'right' }}>{fmt(m.amount)} ETB</td>
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
