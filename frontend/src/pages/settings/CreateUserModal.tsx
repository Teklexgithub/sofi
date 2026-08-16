import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Divider } from 'antd';
import { useTranslation } from 'react-i18next';
import { settingsService } from '../../services/settingsService';
import type { Branch, UserAccount } from '../../types/settings';

interface CreateUserProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: UserAccount | null;
}

const CreateUserModal: React.FC<CreateUserProps> = ({ visible, onCancel, onSuccess, initialValues }) => {
  const { t } = useTranslation('settings');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  const isEditing = !!initialValues?.id;

  // Sync form values when modal becomes visible or initialValues change
  useEffect(() => {
    if (visible) {
      // Fetch branches
      settingsService.getBranches().then(res => setBranches(res.data));
      
      if (initialValues) {
        form.setFieldsValue({
          ...initialValues,
          branches: initialValues.branches,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ role: 'BRANCH_ADMIN' });
      }
    }
  }, [visible, initialValues, form]);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const { confirm_password, ...payload } = values;
      if (isEditing) {
        await settingsService.updateUser(initialValues.id, payload);
        message.success(t('createUserModal.updateSuccess'));
      } else {
        await settingsService.createUser(payload);
        message.success(t('createUserModal.createSuccess'));
      }
      onSuccess();
    } catch (error) {
      message.error(isEditing ? t('createUserModal.updateFailed') : t('createUserModal.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEditing ? t('createUserModal.editTitle') : t('createUserModal.createTitle')}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={submitting}
      destroyOnClose={true} // CRITICAL: Fixes the first-click empty form issue
      okText={isEditing ? t('common:actions.update') : t('userList.createButton')}
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        preserve={false}
        initialValues={initialValues || { role: 'BRANCH_ADMIN' }} // Provide direct initialValues to the form
      >
        <Form.Item
          name="email"
          label={t('common:fields.email')}
          rules={[{ required: true, type: 'email', message: t('common:login.emailInvalid') }]}
        >
          <Input placeholder="email@sofiaerp.com" disabled={isEditing} />
        </Form.Item>

        <Form.Item name="role" label={t('common:fields.role')} rules={[{ required: true }]}>
          <Select placeholder={t('createUserModal.rolePlaceholder')}>
            <Select.Option value="ADMIN">{t('common:roles.ADMIN')}</Select.Option>
            <Select.Option value="BRANCH_ADMIN">{t('common:roles.BRANCH_ADMIN')}</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="branches" label={t('common:fields.branches')}>
          <Select mode="multiple" placeholder={t('createUserModal.branchPlaceholder')} allowClear showSearch optionFilterProp="children">
            {branches.map(b => (
              <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        {!isEditing && (
          <>
            <Divider>{t('createUserModal.securityDivider')}</Divider>
            <Form.Item
              name="password"
              label={t('common:fields.password')}
              rules={[{ required: true, min: 8, message: t('createUserModal.passwordMinLength') }]}
            >
              <Input.Password placeholder={t('createUserModal.passwordPlaceholder')} />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label={t('common:fields.confirmPassword')}
              dependencies={['password']}
              rules={[
                { required: true, message: t('createUserModal.confirmPasswordRequired') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('createUserModal.passwordMismatch')));
                  },
                }),
              ]}
            >
              <Input.Password placeholder={t('createUserModal.confirmPasswordPlaceholder')} />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default CreateUserModal;