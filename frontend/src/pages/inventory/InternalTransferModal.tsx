import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, Select, message, Statistic, Row, Col, Typography, Divider } from 'antd';
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';
import { settingsService } from '../../services/settingsService';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Text } = Typography;

interface TransferModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  branchId: string; // Received from InternalTransfers.tsx
}

const InternalTransferModal: React.FC<TransferModalProps> = ({ visible, onCancel, onSuccess, branchId }) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation('inventory');

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (visible) {
      // Load products for everyone
      inventoryService.getProducts().then(res => setProducts(res.data));
      
      if (isAdmin) {
        // Admin needs to see all branches to choose one
        settingsService.getBranches().then(res => setBranches(res.data));
      }
      
      // AUTO-LOCK: Set the branch ID immediately
      // If Manager, branchId is their assigned ID. If Admin, it's empty string.
      form.setFieldsValue({ 
        branch: branchId,
      });
    }
  }, [visible, branchId, isAdmin, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        timestamp: dayjs().toISOString(),
        performed_by: user?.id
      };
      await inventoryService.transferStock(payload);
      message.success(t('internalTransferModal.successMessage'));
      form.resetFields();
      setSelectedProduct(null);
      onSuccess();
    } catch (e: any) {
      // Improved error reporting
      const errorMsg = e.response?.data?.error || t('internalTransferModal.failedDefault');
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const packsMoved = Form.useWatch('packs_moved', form) || 0;

  return (
    <Modal
      title={t('internalTransferModal.title')}
      open={visible}
      onOk={() => form.submit()}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      confirmLoading={loading}
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }}
      width={600}
      destroyOnClose // Ensures the form is fresh every time
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>

        {/* BRANCH SECTION */}
        {isAdmin ? (
          <Form.Item
            name="branch"
            label={t('internalTransferModal.targetBranch')}
            rules={[{ required: true, message: t('internalTransferModal.branchRequired') }]}
          >
            <Select placeholder={t('internalTransferModal.selectBranchPlaceholder')}>
              {branches.map(b => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
            </Select>
          </Form.Item>
        ) : (
          <div style={{ marginBottom: '20px', padding: '10px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '4px' }}>
             <Text strong>{t('internalTransferModal.refillingFor')} </Text>
             <Text type="secondary">{t('internalTransferModal.yourAssignedBranch')}</Text>
             {/* Hidden input keeps the branch ID in the form data for submission */}
             <Form.Item name="branch" hidden><Select /></Form.Item>
          </div>
        )}

        <Form.Item name="product" label={t('common:fields.product')} rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="children"
            placeholder={t('internalTransferModal.selectProductPlaceholder')}
            onChange={(val) => setSelectedProduct(products.find(p => p.id === val))}
          >
            {products.map(p => (
              <Select.Option key={p.id} value={p.id}>
                {p.name} <Text type="secondary" style={{ fontSize: '12px' }}>{t('internalTransferModal.packRatio', { count: p.pieces_per_pack })}</Text>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Divider />

        <Row gutter={24} align="middle">
          <Col span={12}>
            <Form.Item name="packs_moved" label={t('internalTransferModal.packsToMove')} rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0.1} step={1} placeholder={t('internalTransferModal.enterQuantity')} />
            </Form.Item>
          </Col>
          <Col span={12}>
             <div style={{ padding: '20px', background: '#f0f5ff', borderRadius: '8px', textAlign: 'center', border: '1px dashed #adc6ff' }}>
                <Statistic
                  title={t('internalTransferModal.totalPiecesToAdd')}
                  value={selectedProduct ? packsMoved * selectedProduct.pieces_per_pack : 0}
                  valueStyle={{ color: '#1d39c4', fontWeight: 'bold' }}
                />
             </div>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default InternalTransferModal;