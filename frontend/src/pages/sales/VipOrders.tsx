import React, { useEffect, useState } from 'react';
import {
  Card, Table, Form, Input, Button, Select, InputNumber, DatePicker,
  Typography, Divider, Row, Col, Space, Popconfirm, message
} from 'antd';
import {
  CrownOutlined, PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { salesService } from '../../services/salesService';
import type { VIPCustomer, VIPOrder } from '../../services/salesService';
import { inventoryService } from '../../services/inventoryService';
import VipCustomerFormModal from './VipCustomerFormModal';
import VipOrderFormModal from './VipOrderFormModal';

const { Title, Text } = Typography;

const CREATE_OPTION_VALUE = '__create__';

const VipOrders: React.FC = () => {
  const { t } = useTranslation('sales');
  const [orderForm] = Form.useForm();

  const [customers, setCustomers] = useState<VIPCustomer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<VIPOrder[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [customerSearch, setCustomerSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<VIPCustomer | null>(null);
  const [pendingCustomerName, setPendingCustomerName] = useState('');
  const [customerDropdownSearch, setCustomerDropdownSearch] = useState('');
  const [selectedProductPrice, setSelectedProductPrice] = useState<number | null>(null);

  const [orderEditModalVisible, setOrderEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState<VIPOrder | null>(null);

  const frequencyLabel = (freq: string) =>
    freq ? t(`vipCustomerModal.frequencyOptions.${freq}`) : '—';

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const res = await salesService.getVipCustomers();
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      message.error(t('vipOrders.messages.loadFailed'));
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await salesService.getVipOrders();
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      message.error(t('vipOrders.messages.loadFailed'));
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await inventoryService.getProducts();
      setProducts(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch (e) {
      message.error(t('vipOrders.messages.loadFailed'));
    }
  };

  useEffect(() => { loadCustomers(); loadOrders(); loadProducts(); }, []);

  const openCreateCustomer = () => {
    setEditingCustomer(null);
    setPendingCustomerName('');
    setCustomerModalVisible(true);
  };

  const openEditCustomer = (customer: VIPCustomer) => {
    setEditingCustomer(customer);
    setPendingCustomerName('');
    setCustomerModalVisible(true);
  };

  const handleCustomerModalSuccess = (customer: VIPCustomer) => {
    setCustomerModalVisible(false);
    loadCustomers();
    if (!editingCustomer) {
      orderForm.setFieldsValue({ customer: customer.id });
    }
  };

  const handleCustomerSelectChange = (value: string) => {
    if (value === CREATE_OPTION_VALUE) {
      orderForm.setFieldsValue({ customer: undefined });
      setPendingCustomerName(customerDropdownSearch.trim());
      setEditingCustomer(null);
      setCustomerModalVisible(true);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await salesService.deleteVipCustomer(customerId);
      message.success(t('vipOrders.messages.customerDeleteSuccess'));
      loadCustomers();
      loadOrders();
    } catch (e) {
      message.error(t('vipOrders.messages.customerDeleteFailed'));
    }
  };

  const handleProductChange = (productId: string) => {
    const p = products.find((prod) => prod.id === productId);
    setSelectedProductPrice(p ? Number(p.selling_price_per_piece) : null);
  };

  const handlePlaceOrder = async (values: any) => {
    setSubmitting(true);
    try {
      await salesService.createVipOrder({
        customer: values.customer,
        product: values.product,
        quantity: values.quantity,
        order_date: values.order_date.format('YYYY-MM-DD')
      });
      message.success(t('vipOrders.messages.orderSuccess'));
      orderForm.resetFields();
      orderForm.setFieldsValue({ order_date: dayjs() });
      setSelectedProductPrice(null);
      loadOrders();
      loadCustomers();
    } catch (e) {
      message.error(t('vipOrders.messages.orderFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditOrder = (order: VIPOrder) => {
    setEditingOrder(order);
    setOrderEditModalVisible(true);
  };

  const handleOrderEditSuccess = () => {
    setOrderEditModalVisible(false);
    setEditingOrder(null);
    loadOrders();
    loadCustomers();
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await salesService.deleteVipOrder(orderId);
      message.success(t('vipOrders.messages.orderDeleteSuccess'));
      loadOrders();
      loadCustomers();
    } catch (e) {
      message.error(t('vipOrders.messages.orderDeleteFailed'));
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return (c.full_name || '').toLowerCase().includes(q) || (c.phone_number || '').toLowerCase().includes(q);
  });

  const filteredOrders = orders.filter((o) => {
    const q = orderSearch.toLowerCase();
    return (o.customer_name || '').toLowerCase().includes(q) || (o.product_name || '').toLowerCase().includes(q);
  });

  const customerColumns = [
    { title: t('vipOrders.customerColumns.fullName'), dataIndex: 'full_name', key: 'full_name', render: (v: string) => <Text strong>{v || t('vipOrders.unnamedCustomer')}</Text> },
    { title: t('common:fields.phoneNumber'), dataIndex: 'phone_number', key: 'phone_number' },
    { title: t('vipCustomerModal.addressLabel'), dataIndex: 'address', key: 'address' },
    { title: t('vipCustomerModal.frequencyLabel'), dataIndex: 'preferred_payment_frequency', key: 'frequency', render: frequencyLabel },
    {
      title: t('vipOrders.customerColumns.outstanding'),
      dataIndex: 'outstanding_balance',
      key: 'outstanding_balance',
      align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ color: v > 0 ? '#f5222d' : '#52c41a' }}>
          {Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('common:units.etb')}
        </Text>
      )
    },
    { title: t('vipOrders.customerColumns.orderCount'), dataIndex: 'order_count', key: 'order_count', align: 'center' as const },
    {
      title: t('common:fields.actions'),
      key: 'actions',
      align: 'center' as const,
      render: (_: any, rec: VIPCustomer) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} onClick={() => openEditCustomer(rec)} />
          <Popconfirm
            title={t('vipOrders.deleteCustomerConfirm.title')}
            description={t('vipOrders.deleteCustomerConfirm.desc')}
            onConfirm={() => handleDeleteCustomer(rec.id)}
            okText={t('common:actions.delete')}
            cancelText={t('common:actions.cancel')}
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const orderColumns = [
    { title: t('common:fields.date'), dataIndex: 'order_date', key: 'order_date', render: (d: string) => dayjs(d).format('YYYY-MM-DD') },
    { title: t('common:fields.customer'), dataIndex: 'customer_name', key: 'customer_name', render: (v: string) => v || t('vipOrders.unnamedCustomer') },
    { title: t('common:fields.product'), dataIndex: 'product_name', key: 'product_name' },
    { title: t('common:fields.quantity'), dataIndex: 'quantity', key: 'quantity', align: 'right' as const },
    {
      title: t('vipOrders.historyColumns.unitPrice'),
      dataIndex: 'unit_price',
      key: 'unit_price',
      align: 'right' as const,
      render: (v: number) => `${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${t('common:units.etb')}`
    },
    {
      title: t('common:fields.total'),
      dataIndex: 'total_amount',
      key: 'total_amount',
      align: 'right' as const,
      render: (v: number) => <Text strong>{Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('common:units.etb')}</Text>
    },
    {
      title: t('common:fields.actions'),
      key: 'actions',
      align: 'center' as const,
      render: (_: any, rec: VIPOrder) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} onClick={() => openEditOrder(rec)} />
          <Popconfirm
            title={t('vipOrders.deleteOrderConfirm.title')}
            description={t('vipOrders.deleteOrderConfirm.desc')}
            onConfirm={() => handleDeleteOrder(rec.id)}
            okText={t('common:actions.delete')}
            cancelText={t('common:actions.cancel')}
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Card bordered={false} style={{ borderRadius: '15px', boxShadow: '0 12px 40px rgba(113, 75, 103, 0.1)', marginBottom: '24px' }}>
        <Title level={2} style={{ color: '#714B67', marginBottom: 4 }}>
          <CrownOutlined /> {t('vipOrders.title')}
        </Title>
        <Text type="secondary">{t('vipOrders.subtitle')}</Text>
        <Divider style={{ margin: '15px 0 25px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <Title level={4} style={{ margin: 0 }}>{t('vipOrders.customersSectionTitle')}</Title>
          <Space>
            <Input
              placeholder={t('vipOrders.customerSearchPlaceholder')}
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              allowClear
              style={{ width: '280px' }}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateCustomer}
              style={{ background: '#714B67', border: 'none' }}
            >
              {t('vipOrders.addCustomerBtn')}
            </Button>
          </Space>
        </div>

        <Table
          dataSource={filteredCustomers}
          columns={customerColumns}
          rowKey="id"
          loading={loadingCustomers}
          bordered
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 5 }}
        />
      </Card>

      <Card bordered={false} style={{ borderRadius: '15px', boxShadow: '0 12px 40px rgba(0,0,0,0.04)', marginBottom: '24px' }}>
        <Title level={4} style={{ color: '#714B67', marginBottom: 4 }}>
          <ShoppingCartOutlined /> {t('vipOrders.placeOrderTitle')}
        </Title>
        <Divider style={{ margin: '15px 0 25px 0' }} />

        <Form
          form={orderForm}
          layout="vertical"
          onFinish={handlePlaceOrder}
          initialValues={{ order_date: dayjs() }}
          style={{ background: '#fcfcfc', padding: '25px', borderRadius: '12px', border: '1px solid #f0f0f0' }}
        >
          <Row gutter={20} align="bottom">
            <Col span={7}>
              <Form.Item
                name="customer"
                label={<Text strong style={{ color: '#555' }}>{t('common:fields.customer')}</Text>}
                rules={[{ required: true, message: t('vipOrders.form.customerRequired') }]}
              >
                <Select
                  showSearch
                  size="large"
                  placeholder={t('vipOrders.form.customerPlaceholder')}
                  optionFilterProp="children"
                  onSearch={(val) => setCustomerDropdownSearch(val)}
                  onChange={handleCustomerSelectChange}
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {customers.map((c) => (
                    <Select.Option key={c.id} value={c.id}>{c.full_name || t('vipOrders.unnamedCustomer')}</Select.Option>
                  ))}
                  {customerDropdownSearch.trim() &&
                    !customers.some((c) => (c.full_name || '').toLowerCase() === customerDropdownSearch.trim().toLowerCase()) && (
                    <Select.Option key={CREATE_OPTION_VALUE} value={CREATE_OPTION_VALUE}>
                      <Text style={{ color: '#714B67' }}>
                        <PlusOutlined /> {t('vipOrders.form.createNewOption', { name: customerDropdownSearch.trim() })}
                      </Text>
                    </Select.Option>
                  )}
                </Select>
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item
                name="product"
                label={<Text strong style={{ color: '#555' }}>{t('common:fields.product')}</Text>}
                rules={[{ required: true, message: t('vipOrders.form.productRequired') }]}
              >
                <Select
                  showSearch
                  size="large"
                  placeholder={t('vipOrders.form.productPlaceholder')}
                  optionFilterProp="children"
                  onChange={handleProductChange}
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {products.map((p) => (
                    <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item
                name="quantity"
                label={<Text strong style={{ color: '#555' }}>{t('common:fields.quantity')}</Text>}
                rules={[{ required: true, message: t('vipOrders.form.quantityRequired') }]}
              >
                <InputNumber style={{ width: '100%' }} min={0.01} size="large" placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name="order_date"
                label={<Text strong style={{ color: '#555' }}>{t('vipOrders.form.orderDateLabel')}</Text>}
                rules={[{ required: true, message: t('vipOrders.form.orderDateRequired') }]}
              >
                <DatePicker style={{ width: '100%' }} size="large" />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />} size="large" loading={submitting} block style={{ background: '#714B67', borderColor: '#714B67', fontWeight: 'bold' }}>
                  {t('vipOrders.form.submitBtn')}
                </Button>
              </Form.Item>
            </Col>
          </Row>
          {selectedProductPrice !== null && (
            <Text type="secondary">
              {t('vipOrders.form.unitPricePreview', { price: `${selectedProductPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${t('common:units.etb')}` })}
            </Text>
          )}
        </Form>
      </Card>

      <Card bordered={false} style={{ borderRadius: '15px', boxShadow: '0 12px 40px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <Title level={4} style={{ margin: 0, color: '#714B67' }}>{t('vipOrders.historyTitle')}</Title>
          <Input
            placeholder={t('vipOrders.orderSearchPlaceholder')}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            allowClear
            style={{ width: '280px' }}
          />
        </div>
        <Table
          dataSource={filteredOrders}
          columns={orderColumns}
          rowKey="id"
          loading={loadingOrders}
          bordered
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <VipCustomerFormModal
        visible={customerModalVisible}
        onCancel={() => setCustomerModalVisible(false)}
        onSuccess={handleCustomerModalSuccess}
        initialValues={editingCustomer}
        initialName={pendingCustomerName}
      />

      <VipOrderFormModal
        visible={orderEditModalVisible}
        onCancel={() => { setOrderEditModalVisible(false); setEditingOrder(null); }}
        onSuccess={handleOrderEditSuccess}
        order={editingOrder}
        products={products}
      />
    </div>
  );
};

export default VipOrders;
