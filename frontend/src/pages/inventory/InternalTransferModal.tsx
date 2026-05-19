import React, { useState, useEffect } from 'react';
import { Modal, Form, InputNumber, Select, message, Statistic, Row, Col, Input } from 'antd';
import { inventoryService } from '../../services/inventoryService';
import { settingsService } from '../../services/settingsService'; // To fetch branches
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

interface TransferModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  branchId: string; // The active branch from your layout
}

const InternalTransferModal: React.FC<TransferModalProps> = ({ visible, onCancel, onSuccess, branchId }) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (visible) {
      inventoryService.getProducts().then(res => setProducts(res.data));
      
      // Admin sees all branches; Staff is locked to their own
      if (isAdmin) {
        settingsService.getBranches().then(res => setBranches(res.data));
      }
      
      form.setFieldsValue({ 
        branch: branchId, 
        timestamp: dayjs() 
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
      message.success('Refill completed: Store to Shop');
      form.resetFields();
      setSelectedProduct(null);
      onSuccess();
    } catch (e) {
      message.error('Transfer failed. Ensure enough stock is available in the Store.');
    } finally {
      setLoading(false);
    }
  };

  const packsMoved = Form.useWatch('packs_moved', form) || 0;

  return (
    <Modal 
      title="Store to Shop Refill" 
      open={visible} 
      onOk={() => form.submit()} 
      onCancel={onCancel}
      confirmLoading={loading}
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        
        {/* Branch Selection Logic */}
        {isAdmin ? (
          <Form.Item name="branch" label="Branch" rules={[{ required: true }]}>
            <Select placeholder="Select Branch">
              {branches.map(b => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
            </Select>
          </Form.Item>
        ) : (
          <Form.Item name="branch" hidden><Input /></Form.Item>
        )}

        <Form.Item name="product" label="Product" rules={[{ required: true }]}>
          <Select placeholder="Select Product" onChange={(val) => setSelectedProduct(products.find(p => p.id === val))}>
            {products.map(p => (
              <Select.Option key={p.id} value={p.id}>
                {p.name} (1 Pack = {p.pieces_per_pack} pieces)
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="packs_moved" label="Packs to Move" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0.1} step={1} />
            </Form.Item>
          </Col>
          <Col span={12}>
             <div style={{ padding: '24px', background: '#f9f9f9', borderRadius: '8px', textAlign: 'center' }}>
                <Statistic 
                  title="Total Pieces Added" 
                  value={selectedProduct ? packsMoved * selectedProduct.pieces_per_pack : 0} 
                  valueStyle={{ color: '#714B67', fontWeight: 'bold' }}
                />
             </div>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default InternalTransferModal;