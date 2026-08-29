import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Divider, Input, Button, Space, Tag, Popconfirm, message } from 'antd';
import { WarningOutlined, PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { salesService } from '../../services/salesService';
import type { PoorProductReport } from '../../services/salesService';
import { inventoryService } from '../../services/inventoryService';
import PoorProductReportFormModal from './PoorProductReportFormModal';

const { Title, Text } = Typography;

const PoorProductReports: React.FC = () => {
  const { t } = useTranslation('inventory');
  const [reports, setReports] = useState<PoorProductReport[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingReport, setEditingReport] = useState<PoorProductReport | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await salesService.getPoorProductReports();
      setReports(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      message.error(t('poorProductReports.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [prodRes, branchRes] = await Promise.all([
        inventoryService.getProducts(),
        inventoryService.getBranches()
      ]);
      setProducts(Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data.results || []));
      setBranches(Array.isArray(branchRes.data) ? branchRes.data : (branchRes.data.results || []));
    } catch (e) {
      message.error(t('poorProductReports.loadFailed'));
    }
  };

  useEffect(() => { loadReports(); loadLookups(); }, []);

  const openCreate = () => {
    setEditingReport(null);
    setModalVisible(true);
  };

  const openEdit = (report: PoorProductReport) => {
    setEditingReport(report);
    setModalVisible(true);
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingReport(null);
    loadReports();
  };

  const handleDelete = async (report: PoorProductReport) => {
    try {
      await salesService.deletePoorProductReport(report.id);
      message.success(t('poorProductReports.deleteSuccess'));
      loadReports();
    } catch (e: any) {
      message.error(e.response?.data?.error || t('poorProductReports.deleteFailed'));
    }
  };

  const filteredReports = reports.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      (r.product_name || '').toLowerCase().includes(q) ||
      (r.vendor_name || '').toLowerCase().includes(q) ||
      (r.branch_name || '').toLowerCase().includes(q)
    );
  });

  const columns = [
    { title: t('poorProductReports.columns.reportDate'), dataIndex: 'report_date', key: 'report_date', render: (d: string) => dayjs(d).format('YYYY-MM-DD') },
    { title: t('common:fields.product'), dataIndex: 'product_name', key: 'product_name' },
    { title: t('poorProductReports.columns.vendor'), dataIndex: 'vendor_name', key: 'vendor_name' },
    { title: t('common:fields.branch'), dataIndex: 'branch_name', key: 'branch_name' },
    { title: t('common:fields.quantity'), dataIndex: 'quantity', key: 'quantity', align: 'right' as const },
    {
      title: t('poorProductReports.columns.buyingPrice'),
      dataIndex: 'buying_price_unit',
      key: 'buying_price_unit',
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
      title: t('common:fields.status'),
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (statusVal: string, rec: PoorProductReport) => (
        <Space size="small">
          <Tag color={statusVal === 'DEDUCT' ? 'red' : 'default'}>
            {t(`poorProductReports.statusOptions.${statusVal}`)}
          </Tag>
          {rec.is_settled && (
            <Tag icon={<LockOutlined />} color="blue">{t('poorProductReports.settledTag')}</Tag>
          )}
        </Space>
      )
    },
    {
      title: t('common:fields.actions'),
      key: 'actions',
      align: 'center' as const,
      render: (_: any, rec: PoorProductReport) => (
        rec.is_settled ? (
          <Text type="secondary" style={{ fontSize: '12px' }}>{t('poorProductReports.lockedNote')}</Text>
        ) : (
          <Space size="small">
            <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(rec)} />
            <Popconfirm
              title={t('poorProductReports.deleteConfirm.title')}
              description={t('poorProductReports.deleteConfirm.desc')}
              onConfirm={() => handleDelete(rec)}
              okText={t('common:actions.delete')}
              cancelText={t('common:actions.cancel')}
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        )
      )
    }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Card bordered={false} style={{ borderRadius: '15px', boxShadow: '0 12px 40px rgba(0,0,0,0.04)' }}>
        <Title level={2} style={{ color: '#714B67', marginBottom: 4 }}>
          <WarningOutlined /> {t('poorProductReports.title')}
        </Title>
        <Text type="secondary">{t('poorProductReports.subtitle')}</Text>
        <Divider style={{ margin: '15px 0 25px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <Input
            placeholder={t('poorProductReports.searchPlaceholder')}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: '320px' }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            style={{ background: '#714B67', border: 'none' }}
          >
            {t('poorProductReports.registerBtn')}
          </Button>
        </div>

        <Table
          dataSource={filteredReports}
          columns={columns}
          rowKey="id"
          loading={loading}
          bordered
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <PoorProductReportFormModal
        visible={modalVisible}
        onCancel={() => { setModalVisible(false); setEditingReport(null); }}
        onSuccess={handleModalSuccess}
        initialValues={editingReport}
        products={products}
        branches={branches}
      />
    </div>
  );
};

export default PoorProductReports;
