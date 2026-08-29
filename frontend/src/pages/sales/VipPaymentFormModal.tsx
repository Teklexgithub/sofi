import React, { useEffect, useState } from 'react';
import { Modal, Form, InputNumber, DatePicker, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { salesService } from '../../services/salesService';
import type { VIPCustomer } from '../../services/salesService';

const { Text } = Typography;

interface VipPaymentFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  customer: VIPCustomer | null;
}

const VipPaymentFormModal: React.FC<VipPaymentFormModalProps> = ({ visible, onCancel, onSuccess, customer }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation('sales');

  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({ payment_date: dayjs() });
    }
  }, [visible, form]);

  const onFinish = async (values: any) => {
    if (!customer) return;
    setSubmitting(true);
    try {
      await salesService.createVipPayment({
        customer: customer.id,
        amount: values.amount,
        payment_date: values.payment_date.format('YYYY-MM-DD')
      });
      message.success(t('vipPayments.paymentModal.recordSuccess'));
      onSuccess();
    } catch (error) {
      message.error(t('vipPayments.paymentModal.recordFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={t('vipPayments.paymentModal.title')}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText={t('vipPayments.paymentModal.submitBtn')}
      cancelText={t('common:actions.cancel')}
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }}
    >
      {customer && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {t('vipPayments.paymentModal.outstandingLine', {
            name: customer.full_name || t('vipOrders.unnamedCustomer'),
            amount: `${Number(customer.outstanding_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${t('common:units.etb')}`
          })}
        </Text>
      )}
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="amount"
          label={t('vipPayments.paymentModal.amountLabel')}
          rules={[{ required: true, message: t('vipPayments.paymentModal.amountRequired') }]}
        >
          <InputNumber style={{ width: '100%' }} min={0.01} precision={2} placeholder="0.00" />
        </Form.Item>

        <Form.Item
          name="payment_date"
          label={t('vipPayments.paymentModal.dateLabel')}
          rules={[{ required: true, message: t('vipPayments.paymentModal.dateRequired') }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default VipPaymentFormModal;
