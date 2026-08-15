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
import { salesService } from '../../services/salesService';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

const DigitalAccountSetup: React.FC = () => {
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
          message="Security Restriction Active" 
          description="Access Denied: Admin level security clearance is required to interact with system wallet configuration matrices." 
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
      message.error("Data Sync Exception: Master account profiles could not be loaded.");
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
        message.success(`Wallet profile updated successfully!`);
        setEditingAccountId(null);
      } else {
        // Run standard generation path
        await salesService.createDigitalAccount(payload);
        message.success(`Wallet profile for "${values.name}" registered successfully!`);
      }
      
      form.resetFields();
      loadSystemContextData();
    } catch (err) {
      message.error("Submission Denied: Verify fields are valid and the account name identifier is distinct.");
    } finally {
      setLoading(false);
    }
  };

  const executeProfilePurge = async (id: string) => {
    setLoading(true);
    try {
      await salesService.deleteDigitalAccount(id);
      message.success("Account profile successfully removed from system registries.");
      // Safeguard: If the item currently being edited is deleted, close edit mode
      if (editingAccountId === id) {
        cancelEditingMode();
      }
      loadSystemContextData();
    } catch (err) {
      message.error("Action Blocked: Cannot delete accounts containing active daily statement dependencies.");
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
          <BankOutlined /> Master Digital Accounts Registry
        </Title>
        <Text type="secondary">
          Configure and edit branch-linked wallet nodes (CBE, Telebirr, Awash) to initialize automatic delta revenue tracking workflows.
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
                message="Modifying Wallet Profile" 
                description="You are currently updating an existing configurations context. Changes will alter calculations on subsequent submissions."
                type="warning" 
                showIcon
              />
            </div>
          )}
          
          <Row gutter={20} align="bottom">
            <Col span={6}>
              <Form.Item 
                name="branch" 
                label={<Text strong style={{ color: '#555' }}><EnvironmentOutlined /> Target Branch Node</Text>}
                rules={[{ required: true, message: 'Please select a deployment location branch' }]}
              >
                <Select placeholder="Deploy to location..." size="large" style={{ width: '100%' }}>
                  {branches.map(b => (
                    <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item 
                name="name" 
                label={<Text strong style={{ color: '#555' }}>Unique Wallet/Account Name Identifier</Text>}
                rules={[{ required: true, message: 'Please enter a name identifier descriptor' }]}
              >
                <Input placeholder="e.g. CBE Main (0911...) or Telebirr Shop" size="large" />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item 
                name="initial_balance" 
                label={<Text strong style={{ color: '#555' }}>Initial Balance (ETB)</Text>}
                initialValue={0}
                rules={[{ required: true, message: 'Please enter starting balance' }]}
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
                    {editingAccountId ? 'Update Wallet' : 'Register Wallet'}
                  </Button>
                  
                  {editingAccountId && (
                    <Button 
                      icon={<CloseOutlined />} 
                      size="large" 
                      block 
                      danger
                      onClick={cancelEditingMode}
                    >
                      Cancel Edit
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
            placeholder="Search by branch or account name..."
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
          locale={{ emptyText: <Empty description="No configured digital accounts found." /> }}
          columns={[
            { 
              title: 'Assigned Physical Branch Hub', 
              dataIndex: 'branch_name', 
              key: 'branch_name',
              render: (txt, rec) => (
                <Text strong style={{ color: '#714B67' }}>
                  <SafetyCertificateOutlined style={{ marginRight: 8 }} />
                  {txt || rec.branch || 'Global'}
                </Text>
              )
            },
            { 
              title: 'System Account Reference Descriptor Name', 
              dataIndex: 'name', 
              key: 'name',
              render: (t) => <Text style={{ fontSize: '15px' }}>{t}</Text>
            },
            {
              title: 'Seeded Initial Balance',
              dataIndex: 'initial_balance',
              key: 'initial_balance',
              render: (val) => <Text code>{Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</Text>
            },
            { 
              title: 'Management Actions', 
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
                    title="Purge Profile Entry"
                    description="Are you sure you want to permanently remove this configuration profile? This action cannot be reversed."
                    onConfirm={() => executeProfilePurge(rec.id)}
                    okText="Purge"
                    cancelText="Abort"
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