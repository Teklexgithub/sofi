import React, { useEffect, useState } from 'react';
import { Modal, Form, InputNumber, Input, message, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';

interface AdjustModalProps {
  visible: boolean;
  type: 'store' | 'shop'; 
  initialData: any;
  onCancel: () => void;
  onSuccess: () => void;
}

const AdjustStoreStockModal: React.FC<AdjustModalProps> = ({ 
  visible, type, initialData, onCancel, onSuccess 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation('inventory');

  useEffect(() => {
    if (visible && initialData) {
      form.setFieldsValue({
        adjustment_value: type === 'store' ? initialData.quantity_in_packs : initialData.quantity_in_pieces,
        reason: '' // Clear reason on open
      });
    }
  }, [visible, initialData, type, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Use the custom adjustment actions we created in the ViewSet
      if (type === 'store') {
        await inventoryService.adjustStoreStock(initialData.id, values.adjustment_value);
      } else {
        await inventoryService.adjustShopStock(initialData.id, values.adjustment_value);
      }
      
      message.success(t('adjustStockModal.adjustSuccess', { name: initialData.product_name }));
      onSuccess();
    } catch (e: any) {
      // Catch specific error messages from the backend (like "Permission Denied")
      const errorMsg = e.response?.data?.error || t('adjustStockModal.updateFailed');
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const unitLabel = type === 'store' ? t('common:units.packs') : t('common:units.pieces');

  return (
    <Modal
      title={t('adjustStockModal.title', { name: initialData?.product_name })}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={loading}
      okText={t('adjustStockModal.applyCorrection')}
      okButtonProps={{ danger: true }}
      destroyOnClose
    >
      <Alert
        message={t('adjustStockModal.alertTitle')}
        description={t('adjustStockModal.alertDesc', { unit: unitLabel })}
        type="error" // Changed to error color (Red) to signal high importance
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
            name="adjustment_value"
            label={t('adjustStockModal.newCountLabel', { unit: unitLabel })}
            rules={[{ required: true }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            step={type === 'store' ? 0.1 : 1} // Decimals for packs, whole numbers for pieces
          />
        </Form.Item>
        <Form.Item
            name="reason"
            label={t('adjustStockModal.reasonLabel')}
            rules={[{ required: true, message: t('adjustStockModal.reasonRequired') }]}
        >
          <Input.TextArea placeholder={t('adjustStockModal.reasonPlaceholder')} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AdjustStoreStockModal;