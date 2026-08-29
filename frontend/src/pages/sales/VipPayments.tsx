import React, { useEffect, useMemo, useState } from 'react';
import { Card, Table, Typography, Divider, Input, Button, Tabs, Empty, message } from 'antd';
import { WalletOutlined, SearchOutlined, DollarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { salesService } from '../../services/salesService';
import type { VIPCustomer, VIPOrder, VIPPayment } from '../../services/salesService';
import VipPaymentFormModal from './VipPaymentFormModal';

const { Title, Text } = Typography;

const VipPayments: React.FC = () => {
  const { t } = useTranslation('sales');
  const [customers, setCustomers] = useState<VIPCustomer[]>([]);
  const [orders, setOrders] = useState<VIPOrder[]>([]);
  const [payments, setPayments] = useState<VIPPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<VIPCustomer | null>(null);

  const frequencyLabel = (freq: string) =>
    freq ? t(`vipCustomerModal.frequencyOptions.${freq}`) : '—';

  const loadData = async () => {
    setLoading(true);
    try {
      const [custRes, orderRes, paymentRes] = await Promise.all([
        salesService.getVipCustomers(),
        salesService.getVipOrders(),
        salesService.getVipPayments()
      ]);
      setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
      setOrders(Array.isArray(orderRes.data) ? orderRes.data : []);
      setPayments(Array.isArray(paymentRes.data) ? paymentRes.data : []);
    } catch (e) {
      message.error(t('vipPayments.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const ordersByCustomer = useMemo(() => {
    const map: Record<string, VIPOrder[]> = {};
    orders.forEach((o) => {
      if (!map[o.customer]) map[o.customer] = [];
      map[o.customer].push(o);
    });
    return map;
  }, [orders]);

  const paymentsByCustomer = useMemo(() => {
    const map: Record<string, VIPPayment[]> = {};
    payments.forEach((p) => {
      if (!map[p.customer]) map[p.customer] = [];
      map[p.customer].push(p);
    });
    return map;
  }, [payments]);

  const openPaymentModal = (customer: VIPCustomer) => {
    setSelectedCustomer(customer);
    setPaymentModalVisible(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentModalVisible(false);
    setSelectedCustomer(null);
    loadData();
  };

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (c.full_name || '').toLowerCase().includes(q) || (c.phone_number || '').toLowerCase().includes(q);
  });

  const columns = [
    { title: t('common:fields.customer'), dataIndex: 'full_name', key: 'full_name', render: (v: string) => <Text strong>{v || t('vipOrders.unnamedCustomer')}</Text> },
    { title: t('common:fields.phoneNumber'), dataIndex: 'phone_number', key: 'phone_number' },
    { title: t('vipCustomerModal.frequencyLabel'), dataIndex: 'preferred_payment_frequency', key: 'frequency', render: frequencyLabel },
    {
      title: t('vipOrders.customerColumns.outstanding'),
      dataIndex: 'outstanding_balance',
      key: 'outstanding_balance',
      align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ color: v > 0 ? '#f5222d' : v < 0 ? '#1890ff' : '#52c41a' }}>
          {Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('common:units.etb')}
        </Text>
      )
    },
    {
      title: t('common:fields.actions'),
      key: 'actions',
      align: 'center' as const,
      render: (_: any, rec: VIPCustomer) => (
        <Button
          type="primary"
          icon={<DollarOutlined />}
          onClick={() => openPaymentModal(rec)}
          style={{ background: '#714B67', border: 'none' }}
        >
          {t('vipPayments.recordPaymentBtn')}
        </Button>
      )
    }
  ];

  const expandedRowRender = (record: VIPCustomer) => {
    const customerOrders = ordersByCustomer[record.id] || [];
    const customerPayments = paymentsByCustomer[record.id] || [];

    return (
      <Tabs
        size="small"
        items={[
          {
            key: 'orders',
            label: t('vipPayments.ordersTab'),
            children: customerOrders.length === 0
              ? <Empty description={t('common:messages.noData')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              : (
                <Table
                  dataSource={customerOrders}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  columns={[
                    { title: t('common:fields.date'), dataIndex: 'order_date', key: 'order_date', render: (d: string) => dayjs(d).format('YYYY-MM-DD') },
                    { title: t('common:fields.product'), dataIndex: 'product_name', key: 'product_name' },
                    { title: t('common:fields.quantity'), dataIndex: 'quantity', key: 'quantity', align: 'right' as const },
                    {
                      title: t('common:fields.total'),
                      dataIndex: 'total_amount',
                      key: 'total_amount',
                      align: 'right' as const,
                      render: (v: number) => `${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${t('common:units.etb')}`
                    }
                  ]}
                />
              )
          },
          {
            key: 'payments',
            label: t('vipPayments.paymentsTab'),
            children: customerPayments.length === 0
              ? <Empty description={t('common:messages.noData')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              : (
                <Table
                  dataSource={customerPayments}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  columns={[
                    { title: t('vipPayments.paymentModal.dateLabel'), dataIndex: 'payment_date', key: 'payment_date', render: (d: string) => dayjs(d).format('YYYY-MM-DD') },
                    {
                      title: t('vipPayments.paymentModal.amountLabel'),
                      dataIndex: 'amount',
                      key: 'amount',
                      align: 'right' as const,
                      render: (v: number) => <Text strong style={{ color: '#52c41a' }}>{Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('common:units.etb')}</Text>
                    }
                  ]}
                />
              )
          }
        ]}
      />
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Card bordered={false} style={{ borderRadius: '15px', boxShadow: '0 12px 40px rgba(0,0,0,0.04)' }}>
        <Title level={2} style={{ color: '#714B67', marginBottom: 4 }}>
          <WalletOutlined /> {t('vipPayments.title')}
        </Title>
        <Text type="secondary">{t('vipPayments.subtitle')}</Text>
        <Divider style={{ margin: '15px 0 25px 0' }} />

        <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
          <Input
            size="large"
            placeholder={t('vipPayments.searchPlaceholder')}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchQuery}
            allowClear
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Table
          dataSource={filteredCustomers}
          columns={columns}
          rowKey="id"
          loading={loading}
          bordered
          scroll={{ x: 'max-content' }}
          expandable={{ expandedRowRender }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <VipPaymentFormModal
        visible={paymentModalVisible}
        onCancel={() => { setPaymentModalVisible(false); setSelectedCustomer(null); }}
        onSuccess={handlePaymentSuccess}
        customer={selectedCustomer}
      />
    </div>
  );
};

export default VipPayments;
