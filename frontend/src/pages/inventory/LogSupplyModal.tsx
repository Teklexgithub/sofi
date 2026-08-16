import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Button, Space, DatePicker, message, Divider, Card, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, ShopOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';
import { settingsService } from '../../services/settingsService';
import { useAuth } from '../../contexts/AuthContext'; // Import Auth
import dayjs from 'dayjs';

const { Text } = Typography;

// UPDATED: Added branchId to props
interface LogSupplyProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  branchId: string; 
}

const LogSupplyModal: React.FC<LogSupplyProps> = ({ visible, onCancel, onSuccess, branchId }) => {
  const [form] = Form.useForm();
  const { user } = useAuth(); // Access logged in user
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const { t } = useTranslation('inventory');

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (visible) {
      // 1. Load Data
      inventoryService.getProducts().then(res => setProducts(res.data));
      
      // 2. Only fetch all branches if the user is an Admin
      if (isAdmin) {
        settingsService.getBranches().then(res => setBranches(res.data));
      }
      
      // 3. AUTO-LOCK Logic:
      // Set the branch from the prop (which is the user's branch for managers)
      form.setFieldsValue({ 
        branch: branchId,
        date_received: dayjs(),
        items: [{}] 
      });
    }
  }, [visible, form, branchId, isAdmin]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        branch: values.branch,
        date_received: values.date_received.toISOString(),
        items: values.items
      };
      
      // Ensure your service has the bulk create method
      await inventoryService.bulkCreateSupplyLog(payload);
      message.success(t('logSupplyModal.successMessage', { count: values.items.length }));
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      const msg = error.response?.data?.error || t('logSupplyModal.failedDefault');
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={<span><DatabaseOutlined style={{color: '#714B67'}} /> {t('logSupplyModal.title')}</span>}
      open={visible}
      onCancel={() => { form.resetFields(); onCancel(); }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={900}
      okText={t('logSupplyModal.saveAll')}
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Space size="large" style={{ width: '97%', background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>

          {/* BRANCH LOCK UI */}
          {isAdmin ? (
            <Form.Item
              name="branch"
              label={t('logSupplyModal.receivingBranch')}
              rules={[{ required: true }]}
              style={{ minWidth: 250, marginBottom: 0 }}
            >
              <Select placeholder={t('logSupplyModal.selectBranch')}>
                {branches.map(b => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
              </Select>
            </Form.Item>
          ) : (
            <div style={{ minWidth: 250 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>{t('logSupplyModal.receivingBranch')}</Text>
              <div style={{ fontWeight: 'bold', color: '#714B67', padding: '4px 0' }}>
                 {t('logSupplyModal.yourAssignedBranch')}
              </div>
              {/* Hidden field so the value is still submitted in the form */}
              <Form.Item name="branch" hidden><Select /></Form.Item>
            </div>
          )}

          <Form.Item name="date_received" label={t('logSupplyModal.dateTimeReceived')} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Space>

        <Divider>{t('logSupplyModal.deliveryItems')}</Divider>

        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Card 
                  key={key} 
                  size="small" 
                  style={{ marginBottom: 12, background: '#f9f9f9', border: '1px solid #e8e8e8' }}
                  bodyStyle={{ padding: '12px' }}
                >
                  <Space align="start" size="middle">
                    <Form.Item
                      {...restField}
                      name={[name, 'product']}
                      label={t('common:fields.product')}
                      rules={[{ required: true, message: t('logSupplyModal.missingProduct') }]}
                      style={{ width: 350, marginBottom: 0 }}
                    >
                      <Select
                        showSearch
                        placeholder={t('logSupplyModal.searchProduct')}
                        optionFilterProp="children"
                      >
                        {products.map(p => (
                          <Select.Option key={p.id} value={p.id}>
                            <Space>
                              {p.destination === 'SHOP' ? <ShopOutlined style={{color: '#13c2c2'}}/> : <DatabaseOutlined style={{color: '#1890ff'}}/>}
                              {p.name} <Text type="secondary" style={{fontSize: '11px'}}>[{p.vendor_name || t('logSupplyModal.noVendor')}]</Text>
                            </Space>
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'packs_received']}
                      label={t('logSupplyModal.qtyPacks')}
                      rules={[{ required: true, message: t('logSupplyModal.missingQty') }]}
                      style={{ width: 120, marginBottom: 0 }}
                    >
                      <InputNumber min={0.1} placeholder="0.0" style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'manager_notes']}
                      label={t('common:fields.notes')}
                      style={{ width: 200, marginBottom: 0 }}
                    >
                      <Select placeholder={t('logSupplyModal.optionalNote')} allowClear>
                        <Select.Option value="Fresh Stock">{t('logSupplyModal.freshStock')}</Select.Option>
                        <Select.Option value="Replenish">{t('logSupplyModal.replenish')}</Select.Option>
                      </Select>
                    </Form.Item>

                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />} 
                      onClick={() => remove(name)} 
                      style={{ marginTop: 30 }}
                      disabled={fields.length === 1} // Prevent deleting the last row
                    />
                  </Space>
                </Card>
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
                style={{ marginTop: 8, height: '40px' }}
              >
                {t('logSupplyModal.addAnother')}
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

export default LogSupplyModal;