import React, { useState } from 'react';
import { Modal, Form, Input, message, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { settingsService } from '../../services/settingsService';

interface ResetProps {
  visible: boolean;
  userId: string;
  userEmail: string;
  onCancel: () => void;
}

const ResetPasswordModal: React.FC<ResetProps> = ({ visible, userId, userEmail, onCancel }) => {
  const { t } = useTranslation('settings');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
        // We send 'values.password' because the backend looks for the key "password"
        await settingsService.resetUserPassword(userId, values.password);
        message.success(t('resetPasswordModal.success'));
        onCancel();
    } catch (e) {
        message.error(t('resetPasswordModal.failure'));
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal
      title={t('resetPasswordModal.title')}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={loading}
      okText={t('resetPasswordModal.okText')}
      okButtonProps={{ danger: true }}
    >
      <Alert
        message={t('resetPasswordModal.warningTitle')}
        description={t('resetPasswordModal.warningDesc')}
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <p>{t('resetPasswordModal.targetUserLabel')}: <strong>{userEmail}</strong></p>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="password" label={t('resetPasswordModal.newPasswordLabel')} rules={[{ required: true, min: 8 }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="confirm"
          label={t('common:fields.confirmPassword')}
          dependencies={['password']}
          rules={[
            { required: true },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error(t('createUserModal.passwordMismatch')));
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