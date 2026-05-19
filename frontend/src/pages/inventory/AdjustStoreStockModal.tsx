import React, { useEffect } from 'react';
import { Modal, Form, InputNumber, Input, message, Alert } from 'antd';
import { inventoryService } from '../../services/inventoryService';

interface AdjustModalProps {
  visible: boolean;
  type: 'store' | 'shop'; // 'store' for packs, 'shop' for pieces
  initialData: any;
  onCancel: () => void;
  onSuccess: () => void;
}

const AdjustStoreStockModal: React.FC<AdjustModalProps> = ({ 
  visible, type, initialData, onCancel, onSuccess 
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && initialData) {
      form.setFieldsValue({
        adjustment_value: type === 'store' ? initialData.quantity_in_packs : initialData.quantity_in_pieces
      });
    }
  }, [visible, initialData, type, form]);

  const onFinish = async (values: any) => {
    try {
      if (type === 'store') {
        await inventoryService.updateStoreStock(initialData.id, {
          quantity_in_packs: values.adjustment_value
        });
      } else {
        await inventoryService.updateShopStock(initialData.id, {
          quantity_in_pieces: values.adjustment_value
        });
      }
      message.success('Stock adjusted successfully');
      onSuccess();
    } catch (e) {
      message.error('Failed to update stock');
    }
  };

  return (
    <Modal 
      title={`Manual Audit: ${initialData?.product_name}`} 
      open={visible} 
      onOk={() => form.submit()} 
      onCancel={onCancel}
      destroyOnClose
    >
      <Alert 
        message="Manual Correction" 
        description={`You are overriding the ${type === 'store' ? 'Packs' : 'Pieces'} count.`} 
        type="warning" 
        showIcon 
        style={{ marginBottom: 16 }}
      />
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="adjustment_value" label={`Correct ${type === 'store' ? 'Packs' : 'Pieces'}`} rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
          <Input.TextArea placeholder="Why is this being adjusted?" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AdjustStoreStockModal;