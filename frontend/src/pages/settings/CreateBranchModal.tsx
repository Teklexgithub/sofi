import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, message, Row, Col } from 'antd';
import { useTranslation } from 'react-i18next';
import { settingsService } from '../../services/settingsService';
import type { Branch } from '../../types/settings';

interface CreateBranchProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: Branch | null;
}

const CreateBranchModal: React.FC<CreateBranchProps> = ({ visible, onCancel, onSuccess, initialValues }) => {
  const { t } = useTranslation('settings');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      form.setFieldsValue(initialValues || { name: '', location: '', phone_no: '', phone_no_second: '' });
    }
  }, [visible, initialValues, form]);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      if (initialValues?.id) {
        await settingsService.updateBranch(initialValues.id, values);
        message.success(t('createBranchModal.updateSuccess'));
      } else {
        await settingsService.createBranch(values);
        message.success(t('createBranchModal.createSuccess'));
      }
      onSuccess();
    } catch (error) {
      message.error(t('createBranchModal.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={initialValues?.id ? t('createBranchModal.editTitle') : t('createBranchModal.createTitle')}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText={t('common:actions.save')}
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }} // Updated to Sofia Purple
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label={t('branches.columns.name')} rules={[{ required: true, message: t('createBranchModal.nameRequired') }]}>
          <Input placeholder={t('createBranchModal.namePlaceholder')} />
        </Form.Item>

        <Form.Item name="location" label={t('common:fields.location')}>
          <Input placeholder={t('createBranchModal.locationPlaceholder')} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="phone_no" label={t('branchDetail.primaryPhoneLabel')}>
              <Input placeholder={t('createBranchModal.primaryPhonePlaceholder')} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone_no_second" label={t('branchDetail.secondaryPhoneLabel')}>
              <Input placeholder={t('createBranchModal.secondaryPhonePlaceholder')} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default CreateBranchModal;