import React, { useState, useEffect } from 'react';
import {
  Card, Table, Form, Input, Button, Select,
  Typography, Divider, Popconfirm, Row, Col, Alert, InputNumber, Radio, message
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, TransactionOutlined,
  FileTextOutlined, WalletOutlined, ArrowUpOutlined, ArrowDownOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { salesService } from '../../services/salesService';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const DigitalAccountAdjustments: React.FC = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [txType, setTxType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [searchQuery, setSearchQuery] = useState('');

  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <Alert message="Access Denied" description="Admin clearance required." type="error" showIcon />
      </div>
    );
  }

  const loadPageContextData = async () => {
    setLoading(true);
    try {
      const accRes = await salesService.getGlobalDigitalAccounts();
      setAccounts(Array.isArray(accRes.data) ? accRes.data : []);

      const adjRes = await salesService.getDigitalAdjustments();
      setAdjustments(Array.isArray(adjRes.data) ? adjRes.data : (adjRes.data.results || []));
    } catch (e) {
      message.error("Sync Failure: Could not download transactions history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPageContextData(); }, []);

  const handleTransactionSubmit = async (values: any) => {
    setLoading(true);
    try {
      const dynamicAmount = txType === 'DEBIT' ? -Math.abs(values.amount) : Math.abs(values.amount);
      
      const payload = {
        account: values.account,
        amount: dynamicAmount,
        reason: values.reason.trim()
      };

      await salesService.createDigitalAdjustment(payload);
      message.success("Ledger adjustment record committed successfully!");
      form.resetFields();
      loadPageContextData();
    } catch (err) {
      message.error("Transaction rejected by validation monitors.");
    } finally {
      setLoading(false);
    }
  };

  const removeAdjustmentRecord = async (id: string) => {
    setLoading(true);
    try {
      await salesService.deleteDigitalAdjustment(id);
      message.success("Transaction entry revoked.");
      loadPageContextData();
    } catch (e) {
      message.error("Action denied.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      <Card bordered={false} style={{ borderRadius: '15px', boxShadow: '0 12px 40px rgba(0,0,0,0.05)' }}>
        <Title level={2} style={{ color: '#714B67', marginBottom: 4 }}>
          <TransactionOutlined /> Corporate Accounts Adjustments Journal
        </Title>
        <Text type="secondary">
          Log manual banking transfers, injections, or direct vendor payments. These balances update cash-flow requirements on active daily workspaces.
        </Text>
        <Divider style={{ margin: '15px 0 25px 0' }} />

        <Form form={form} layout="vertical" onFinish={handleTransactionSubmit} style={{ background: '#fcfcfc', padding: '25px', borderRadius: '12px', border: '1px solid #f0f0f0', marginBottom: '30px' }}>
          <Row gutter={20} align="bottom">
            <Col span={6}>
              <Form.Item name="tx_mode" label={<Text strong style={{ color: '#555' }}>Action Context Type</Text>} initialValue="DEBIT">
                <Radio.Group 
                  buttonStyle="solid" // Fixed: Applied valid Ant Design type variant option literal
                  size="large" 
                  style={{ width: '100%' }} 
                  onChange={(e) => setTxType(e.target.value)}
                >
                  <Radio.Button value="DEBIT" style={{ width: '50%', textAlign: 'center' }}><ArrowDownOutlined style={{color:'#ff4d4f'}} /> Payout</Radio.Button>
                  <Radio.Button value="CREDIT" style={{ width: '50%', textAlign: 'center' }}><ArrowUpOutlined style={{color:'#52c41a'}} /> Injection</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="account" label={<Text strong style={{ color: '#555' }}>Target Master Account</Text>} rules={[{ required: true, message: 'Select wallet' }]}>
                <Select placeholder="Choose account channel..." size="large">
                  {accounts.map(acc => (
                    <Select.Option key={acc.id} value={acc.id}>{acc.name} ({acc.branch_name})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="amount" label={<Text strong style={{ color: '#555' }}>Transaction Amount</Text>} rules={[{ required: true, message: 'Input amount' }]}>
                <InputNumber style={{ width: '100%' }} min={0.01} precision={2} placeholder="0.00 ETB" size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="reason" label={<Text strong style={{ color: '#555' }}>Reference Reason Description Notes</Text>} rules={[{ required: true, message: 'Add voucher notes' }]}>
                <Input placeholder="e.g. Paid wholesale vendor for inventory" size="large" prefix={<FileTextOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Row justify="end" style={{ marginTop: 15 }}>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} size="large" loading={loading} style={{ background: '#714B67', borderColor: '#714B67', fontWeight: 'bold', padding: '0 30px' }}>
              Commit Journal Entry
            </Button>
          </Row>
        </Form>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <Input
            placeholder="Search by account, branch, or reason..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: '320px' }}
          />
        </div>
        <Table
          dataSource={adjustments.filter(a => {
            const q = searchQuery.toLowerCase();
            return (a.account_name || '').toLowerCase().includes(q) || (a.branch_name || '').toLowerCase().includes(q) || (a.reason || '').toLowerCase().includes(q);
          })}
          rowKey="id"
          loading={loading}
          bordered
          scroll={{ x: 'max-content' }}
          columns={[
          { title: 'Date Logged', dataIndex: 'logged_at', key: 'date', render: (d) => <Text style={{color:'#666'}}>{dayjs(d).format('YYYY-MM-DD HH:mm')}</Text> },
          { title: 'Source Branch Hub', dataIndex: 'branch_name', key: 'branch' },
          { title: 'Target Account Channel', dataIndex: 'account_name', key: 'acc', render: (t) => <Text strong style={{color:'#714B67'}}><WalletOutlined style={{marginRight:6}} />{t}</Text> },
          { title: 'Reference Voucher Notes Reason', dataIndex: 'reason', key: 'note' },
          { title: 'Transaction Flow Shift Value', dataIndex: 'amount', key: 'val', align: 'right', render: (v) => {
              const val = Number(v);
              return <Text strong style={{ color: val >= 0 ? '#52c41a' : '#f5222d' }}>{val >= 0 ? '+' : ''}{val.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</Text>;
            }
          },
          { title: 'Actions', key: 'action', align: 'center', width: 90, render: (_, rec) => (
              <Popconfirm title="Revoke adjustment line entry?" description="This deletes the adjustment transaction record context." onConfirm={() => removeAdjustmentRecord(rec.id)} okText="Delete" cancelText="Abort" okButtonProps={{ danger: true }}>
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )
          }
        ]} />
      </Card>
    </div>
  );
};

export default DigitalAccountAdjustments;