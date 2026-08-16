import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, message, Row, Col } from 'antd';
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';

interface CreateVendorProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: any;
}

const CreateVendorModal: React.FC<CreateVendorProps> = ({ 
  visible, 
  onCancel, 
  onSuccess, 
  initialValues 
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation('inventory');

  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
      }
    }
  }, [visible, initialValues, form]);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      if (initialValues?.id) {
        await inventoryService.updateVendor(initialValues.id, values);
        message.success(t('createVendorModal.updateSuccess'));
      } else {
        await inventoryService.createVendor(values);
        message.success(t('createVendorModal.createSuccess'));
      }
      onSuccess();
    } catch (error) {
      message.error(initialValues?.id ? t('createVendorModal.updateFailed') : t('createVendorModal.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={initialValues?.id ? t('createVendorModal.editTitle') : t('createVendorModal.createTitle')}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText={t('common:actions.save')}
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label={t('createVendorModal.nameLabel')} rules={[{ required: true, message: t('createVendorModal.nameRequired') }]}>
          <Input placeholder={t('createVendorModal.namePlaceholder')} />
        </Form.Item>

        <Form.Item name="contact_person" label={t('common:fields.contactPerson')}>
          <Input placeholder={t('createVendorModal.contactPlaceholder')} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="phone_no" label={t('common:fields.phoneNumber')}>
              <Input placeholder={t('createVendorModal.phonePlaceholder')} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="bank_account" label={t('createVendorModal.bankAccountLabel')}>
          <Input placeholder={t('createVendorModal.bankAccountPlaceholder')} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateVendorModal;