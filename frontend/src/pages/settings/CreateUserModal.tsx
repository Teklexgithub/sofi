import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Divider } from 'antd';
import { settingsService } from '../../services/settingsService';
import type { Branch, UserAccount } from '../../types/settings';

interface CreateUserProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: UserAccount | null;
}

const CreateUserModal: React.FC<CreateUserProps> = ({ visible, onCancel, onSuccess, initialValues }) => {
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
        message.success('User updated successfully');
      } else {
        await settingsService.createUser(payload);
        message.success('User created successfully');
      }
      onSuccess();
    } catch (error) {
      message.error(isEditing ? 'Failed to update user' : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEditing ? "Edit User Account" : "Create New User"}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={submitting}
      destroyOnClose={true} // CRITICAL: Fixes the first-click empty form issue
      okText={isEditing ? "Update" : "Create User"}
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
          label="Email Address" 
          rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}
        >
          <Input placeholder="email@sofiaerp.com" disabled={isEditing} />
        </Form.Item>

        <Form.Item name="role" label="System Role" rules={[{ required: true }]}>
          <Select placeholder="Select Role">
            <Select.Option value="ADMIN">Admin/Owner</Select.Option>
            <Select.Option value="BRANCH_ADMIN">Branch Admin</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="branches" label="Assigned Branches">
          <Select mode="multiple" placeholder="Select Branch(es)" allowClear showSearch optionFilterProp="children">
            {branches.map(b => (
              <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        {!isEditing && (
          <>
            <Divider>Security Credentials</Divider>
            <Form.Item 
              name="password" 
              label="Password" 
              rules={[{ required: true, min: 8, message: 'Password must be at least 8 characters' }]}
            >
              <Input.Password placeholder="Set user password" />
            </Form.Item>

            <Form.Item 
              name="confirm_password" 
              label="Confirm Password" 
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm the password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The two passwords do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Repeat password" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default CreateUserModal;