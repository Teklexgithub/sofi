import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Form, Input, Button, Select, Space, 
  message, Typography, Divider, Popconfirm, Row, Col, Alert, Empty, InputNumber 
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, BankOutlined, EditOutlined,
  SafetyCertificateOutlined, EnvironmentOutlined, CloseOutlined, SaveOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { salesService } from '../../services/salesService';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

const DigitalAccountSetup: React.FC = () => {
  const { t } = useTranslation('sales');
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  // --- CORE UI DATA MATRIX ARRAYS ---
  const [accounts, setAccounts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // --- EDIT MODE SYSTEM STATES ---
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Guardrail Protection: Deny access directly if non-admin attempts runtime viewing
  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <Alert
          message={t('digitalAccountSetup.accessDenied.title')}
          description={t('digitalAccountSetup.accessDenied.desc')}
          type="error"
          showIcon
        />
      </div>
    );
  }

  // --- REFRESH CONTEXT POOLS ENGINE ---
  const loadSystemContextData = async () => {
    setLoading(true);
    try {
      // Pull system location branches safely
      const branchRes = await inventoryService.getBranches();
      const branchList = Array.isArray(branchRes.data) ? branchRes.data : (branchRes.data.results || []);
      setBranches(branchList);

      // Pull historical config profile registers globally
      const accRes = await salesService.getGlobalDigitalAccounts();
      setAccounts(Array.isArray(accRes.data) ? accRes.data : []);
    } catch (e) {
      message.error(t('digitalAccountSetup.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystemContextData();
  }, []);

  // --- EDIT TRIGGER MECHANISM ---
  const startEditingMode = (record: any) => {
    setEditingAccountId(record.id);
    form.setFieldsValue({
      name: record.name,
      branch: record.branch, // Bind the raw branch ID field directly to the dropdown value
      initial_balance: record.initial_balance ?? 0
    });
  };

  const cancelEditingMode = () => {
    setEditingAccountId(null);
    form.resetFields();
  };

  // --- TRANSACTIONAL MUTATION HANDLERS (CREATE / UPDATE) ---
  const onFormSubmitFinish = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        name: values.name.trim(),
        branch: values.branch,
        initial_balance: values.initial_balance ?? 0
      };
      
      if (editingAccountId) {
        // Run update path
        await salesService.updateDigitalAccount(editingAccountId, payload);
        message.success(t('digitalAccountSetup.messages.updateSuccess'));
        setEditingAccountId(null);
      } else {
        // Run standard generation path
        await salesService.createDigitalAccount(payload);
        message.success(t('digitalAccountSetup.messages.createSuccess', { name: values.name }));
      }

      form.resetFields();
      loadSystemContextData();
    } catch (err) {
      message.error(t('digitalAccountSetup.messages.submitFailed'));
    } finally {
      setLoading(false);
    }
  };

  const executeProfilePurge = async (id: string) => {
    setLoading(true);
    try {
      await salesService.deleteDigitalAccount(id);
      message.success(t('digitalAccountSetup.messages.deleteSuccess'));
      // Safeguard: If the item currently being edited is deleted, close edit mode
      if (editingAccountId === id) {
        cancelEditingMode();
      }
      loadSystemContextData();
    } catch (err) {
      message.error(t('digitalAccountSetup.messages.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      <Card 
        bordered={false} 
        style={{ borderRadius: '15px', boxShadow: '0 12px 40px rgba(113, 75, 103, 0.1)' }}
      >
        <Title level={2} style={{ color: '#714B67', marginBottom: 4 }}>
          <BankOutlined /> {t('digitalAccountSetup.title')}
        </Title>
        <Text type="secondary">
          {t('digitalAccountSetup.subtitle')}
        </Text>
        <Divider style={{ margin: '15px 0 25px 0' }} />

        {/* ACCOUNT GENERATOR / EDITOR CONTROL FORM CONTAINER */}
        <Form
          form={form}
          layout="vertical"
          onFinish={onFormSubmitFinish}
          style={{
            background: editingAccountId ? '#f9f6f8' : '#fcfcfc', // Subtly shift background color when editing
            padding: '25px',
            borderRadius: '12px',
            border: editingAccountId ? '1px dashed #714B67' : '1px solid #f0f0f0',
            marginBottom: '30px',
            transition: 'all 0.3s ease'
          }}
        >
          {editingAccountId && (
            <div style={{ marginBottom: '15px' }}>
              <Alert
                message={t('digitalAccountSetup.editAlert.title')}
                description={t('digitalAccountSetup.editAlert.desc')}
                type="warning"
                showIcon
              />
            </div>
          )}

          <Row gutter={20} align="bottom">
            <Col span={6}>
              <Form.Item
                name="branch"
                label={<Text strong style={{ color: '#555' }}><EnvironmentOutlined /> {t('digitalAccountSetup.form.branchLabel')}</Text>}
                rules={[{ required: true, message: t('digitalAccountSetup.form.branchRequired') }]}
              >
                <Select placeholder={t('digitalAccountSetup.form.branchPlaceholder')} size="large" style={{ width: '100%' }}>
                  {branches.map(b => (
                    <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item
                name="name"
                label={<Text strong style={{ color: '#555' }}>{t('digitalAccountSetup.form.nameLabel')}</Text>}
                rules={[{ required: true, message: t('digitalAccountSetup.form.nameRequired') }]}
              >
                <Input placeholder={t('digitalAccountSetup.form.namePlaceholder')} size="large" />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item
                name="initial_balance"
                label={<Text strong style={{ color: '#555' }}>{t('digitalAccountSetup.form.initialBalanceLabel', { unit: t('common:units.etb') })}</Text>}
                initialValue={0}
                rules={[{ required: true, message: t('digitalAccountSetup.form.balanceRequired') }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} size="large" placeholder="0.00" precision={2} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item>
                <Space style={{ width: '100%' }} direction="vertical">
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={editingAccountId ? <SaveOutlined /> : <PlusOutlined />}
                    size="large"
                    loading={loading}
                    block
                    style={{
                      background: editingAccountId ? '#52c41a' : '#714B67',
                      borderColor: editingAccountId ? '#52c41a' : '#714B67',
                      height: '40px',
                      fontWeight: 'bold'
                    }}
                  >
                    {editingAccountId ? t('digitalAccountSetup.form.updateBtn') : t('digitalAccountSetup.form.registerBtn')}
                  </Button>

                  {editingAccountId && (
                    <Button
                      icon={<CloseOutlined />}
                      size="large"
                      block
                      danger
                      onClick={cancelEditingMode}
                    >
                      {t('digitalAccountSetup.form.cancelEditBtn')}
                    </Button>
                  )}
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {/* DATA LEDGER TABLE RENDER */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <Input
            placeholder={t('digitalAccountSetup.searchPlaceholder')}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: '300px' }}
          />
        </div>
        <Table
          dataSource={accounts.filter(a => {
            const q = searchQuery.toLowerCase();
            return (a.branch_name || '').toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q);
          })}
          rowKey="id"
          loading={loading}
          bordered
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description={t('digitalAccountSetup.emptyText')} /> }}
          columns={[
            {
              title: t('digitalAccountSetup.columns.branch'),
              dataIndex: 'branch_name',
              key: 'branch_name',
              render: (txt, rec) => (
                <Text strong style={{ color: '#714B67' }}>
                  <SafetyCertificateOutlined style={{ marginRight: 8 }} />
                  {txt || rec.branch || t('digitalAccountSetup.globalFallback')}
                </Text>
              )
            },
            {
              title: t('digitalAccountSetup.columns.name'),
              dataIndex: 'name',
              key: 'name',
              render: (val) => <Text style={{ fontSize: '15px' }}>{val}</Text>
            },
            {
              title: t('digitalAccountSetup.columns.initialBalance'),
              dataIndex: 'initial_balance',
              key: 'initial_balance',
              render: (val) => <Text code>{Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} {t('common:units.etb')}</Text>
            },
            {
              title: t('digitalAccountSetup.columns.actions'),
              key: 'actions',
              width: 180,
              align: 'center',
              render: (_, rec) => (
                <Space size="middle">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    size="large"
                    style={{ color: '#1890ff' }}
                    onClick={() => startEditingMode(rec)}
                  />
                  <Popconfirm
                    title={t('digitalAccountSetup.deleteConfirm.title')}
                    description={t('digitalAccountSetup.deleteConfirm.desc')}
                    onConfirm={() => executeProfilePurge(rec.id)}
                    okText={t('digitalAccountSetup.deleteConfirm.okText')}
                    cancelText={t('digitalAccountSetup.deleteConfirm.cancelText')}
                    okButtonProps={{ danger: true }}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} size="large" />
                  </Popconfirm>
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default DigitalAccountSetup;