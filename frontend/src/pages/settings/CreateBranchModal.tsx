import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, message, Row, Col } from 'antd';
import { settingsService } from '../../services/settingsService';
import type { Branch } from '../../types/settings';

interface CreateBranchProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: Branch | null;
}

const CreateBranchModal: React.FC<CreateBranchProps> = ({ visible, onCancel, onSuccess, initialValues }) => {
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
        message.success('Branch updated successfully');
      } else {
        await settingsService.createBranch(values);
        message.success('New branch added to Sofia ERP');
      }
      onSuccess();
    } catch (error) {
      message.error('Failed to save branch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={initialValues?.id ? "Edit Branch" : "Create New Branch"}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText="Save"
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }} // Updated to Sofia Purple
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Branch Name" rules={[{ required: true, message: 'Please enter branch name' }]}>
          <Input placeholder="e.g. Bole Branch" />
        </Form.Item>
        
        <Form.Item name="location" label="Physical Location">
          <Input placeholder="e.g. Addis Ababa, Near Edna Mall" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="phone_no" label="Primary Phone">
              <Input placeholder="e.g. +251 11..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone_no_second" label="Secondary Phone">
              <Input placeholder="e.g. +251 91..." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default CreateBranchModal;