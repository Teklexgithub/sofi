import React, { forwardRef } from 'react';

interface PrintLayoutProps {
  title: string;
  subtitle?: string;
  documentId?: string;
  children: React.ReactNode;
  signatures?: { left: string; right: string };
}

const PrintLayout = forwardRef<HTMLDivElement, PrintLayoutProps>(
  ({ title, subtitle, documentId, children, signatures }, ref) => {
    return (
      <div ref={ref} style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#222', padding: '8px', width: '100%', background: '#fff' }}>
        <style>{`
          @page { size: A4; margin: 16mm; }
        `}</style>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #714B67', paddingBottom: '12px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#714B67', letterSpacing: '1px' }}>SOFIA</div>
            <div style={{ fontSize: '11px', color: '#888' }}>Sofia ERP System</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '16px', fontWeight: 700 }}>{title}</div>
            {subtitle && <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{subtitle}</div>}
            {documentId && <div style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace', marginTop: '2px' }}>{documentId}</div>}
            <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px' }}>Printed: {new Date().toLocaleString()}</div>
          </div>
        </div>

        {children}

        {signatures && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px' }}>
            <div style={{ width: '40%', borderTop: '1px solid #333', textAlign: 'center', paddingTop: '6px', fontSize: '12px', color: '#444' }}>{signatures.left}</div>
            <div style={{ width: '40%', borderTop: '1px solid #333', textAlign: 'center', paddingTop: '6px', fontSize: '12px', color: '#444' }}>{signatures.right}</div>
          </div>
        )}
      </div>
    );
  }
);

PrintLayout.displayName = 'PrintLayout';

export default PrintLayout;

export const printTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '12px',
  marginBottom: '16px',
};

export const printThStyle: React.CSSProperties = {
  border: '1px solid #ccc',
  background: '#f5f0f4',
  padding: '6px 8px',
  textAlign: 'left',
  fontWeight: 700,
  color: '#444',
};

export const printTdStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: '6px 8px',
};
