import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { salesService } from '../../services/salesService';
import type { VIPCustomer } from '../../services/salesService';

interface VipCustomerFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (customer: VIPCustomer) => void;
  initialValues?: VIPCustomer | null;
  initialName?: string;
}

const VipCustomerFormModal: React.FC<VipCustomerFormModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  initialValues,
  initialName
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation('sales');

  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
        if (initialName) {
          form.setFieldsValue({ full_name: initialName });
        }
      }
    }
  }, [visible, initialValues, initialName, form]);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      let result: VIPCustomer;
      if (initialValues?.id) {
        const res = await salesService.updateVipCustomer(initialValues.id, values);
        result = res.data;
        message.success(t('vipCustomerModal.updateSuccess'));
      } else {
        const res = await salesService.createVipCustomer(values);
        result = res.data;
        message.success(t('vipCustomerModal.createSuccess'));
      }
      onSuccess(result);
    } catch (error) {
      message.error(initialValues?.id ? t('vipCustomerModal.updateFailed') : t('vipCustomerModal.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={initialValues?.id ? t('vipCustomerModal.editTitle') : t('vipCustomerModal.createTitle')}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText={t('common:actions.save')}
      cancelText={t('common:actions.cancel')}
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="full_name" label={t('vipCustomerModal.fullNameLabel')}>
          <Input placeholder={t('vipCustomerModal.fullNamePlaceholder')} />
        </Form.Item>

        <Form.Item name="phone_number" label={t('common:fields.phoneNumber')}>
          <Input placeholder={t('vipCustomerModal.phonePlaceholder')} />
        </Form.Item>

        <Form.Item name="address" label={t('vipCustomerModal.addressLabel')}>
          <Input placeholder={t('vipCustomerModal.addressPlaceholder')} />
        </Form.Item>

        <Form.Item name="preferred_payment_frequency" label={t('vipCustomerModal.frequencyLabel')}>
          <Select placeholder={t('vipCustomerModal.frequencyPlaceholder')} allowClear>
            <Select.Option value="WEEKLY">{t('vipCustomerModal.frequencyOptions.WEEKLY')}</Select.Option>
            <Select.Option value="MONTHLY">{t('vipCustomerModal.frequencyOptions.MONTHLY')}</Select.Option>
            <Select.Option value="CUSTOM">{t('vipCustomerModal.frequencyOptions.CUSTOM')}</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default VipCustomerFormModal;
