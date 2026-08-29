import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, InputNumber, DatePicker, message } from 'antd';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { salesService } from '../../services/salesService';
import type { VIPOrder } from '../../services/salesService';

interface VipOrderFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  order: VIPOrder | null;
  products: any[];
}

const VipOrderFormModal: React.FC<VipOrderFormModalProps> = ({ visible, onCancel, onSuccess, order, products }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation('sales');

  useEffect(() => {
    if (visible && order) {
      form.setFieldsValue({
        product: order.product,
        quantity: order.quantity,
        order_date: dayjs(order.order_date)
      });
    }
  }, [visible, order, form]);

  const onFinish = async (values: any) => {
    if (!order) return;
    setSubmitting(true);
    try {
      await salesService.updateVipOrder(order.id, {
        product: values.product,
        quantity: values.quantity,
        order_date: values.order_date.format('YYYY-MM-DD')
      });
      message.success(t('vipOrders.editModal.updateSuccess'));
      onSuccess();
    } catch (error) {
      message.error(t('vipOrders.editModal.updateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={t('vipOrders.editModal.title')}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText={t('common:actions.save')}
      cancelText={t('common:actions.cancel')}
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="product"
          label={t('common:fields.product')}
          rules={[{ required: true, message: t('vipOrders.form.productRequired') }]}
        >
          <Select showSearch optionFilterProp="children">
            {products.map((p) => (
              <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="quantity"
          label={t('common:fields.quantity')}
          rules={[{ required: true, message: t('vipOrders.form.quantityRequired') }]}
        >
          <InputNumber style={{ width: '100%' }} min={0.01} />
        </Form.Item>

        <Form.Item
          name="order_date"
          label={t('vipOrders.form.orderDateLabel')}
          rules={[{ required: true, message: t('vipOrders.form.orderDateRequired') }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default VipOrderFormModal;
