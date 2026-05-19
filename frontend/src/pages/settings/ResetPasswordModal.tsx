import React, { useState } from 'react';
import { Modal, Form, Input, message, Alert } from 'antd';
import { settingsService } from '../../services/settingsService';

interface ResetProps {
  visible: boolean;
  userId: string;
  userEmail: string;
  onCancel: () => void;
}

const ResetPasswordModal: React.FC<ResetProps> = ({ visible, userId, userEmail, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
        // We send 'values.password' because the backend looks for the key "password"
        await settingsService.resetUserPassword(userId, values.password);
        message.success("Password updated successfully");
        onCancel();
    } catch (e) {
        message.error("Update failed. Check if you are an Admin.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal
      title="Admin Password Override"
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="Apply New Password"
      okButtonProps={{ danger: true }}
    >
      <Alert 
        message="Security Warning"
        description="You are manually overriding this user's password. They will be logged out of other sessions."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <p>Target User: <strong>{userEmail}</strong></p>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="password" label="New Secure Password" rules={[{ required: true, min: 8 }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item 
          name="confirm" 
          label="Confirm Password" 
          dependencies={['password']}
          rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error('Passwords match error'));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ResetPasswordModal;