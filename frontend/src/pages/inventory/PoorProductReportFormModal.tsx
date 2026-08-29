import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, InputNumber, DatePicker, message } from 'antd';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { salesService } from '../../services/salesService';
import type { PoorProductReport } from '../../services/salesService';

interface PoorProductReportFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: PoorProductReport | null;
  products: any[];
  branches: any[];
}

const PoorProductReportFormModal: React.FC<PoorProductReportFormModalProps> = ({
  visible, onCancel, onSuccess, initialValues, products, branches
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation('inventory');

  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue({
          product: initialValues.product,
          branch: initialValues.branch,
          quantity: initialValues.quantity,
          report_date: dayjs(initialValues.report_date),
          status: initialValues.status
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ report_date: dayjs(), status: 'NOT_DEDUCT' });
      }
    }
  }, [visible, initialValues, form]);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        product: values.product,
        branch: values.branch,
        quantity: values.quantity,
        report_date: values.report_date.format('YYYY-MM-DD'),
        status: values.status
      };
      if (initialValues?.id) {
        await salesService.updatePoorProductReport(initialValues.id, payload);
        message.success(t('poorProductReports.modal.updateSuccess'));
      } else {
        await salesService.createPoorProductReport(payload);
        message.success(t('poorProductReports.modal.createSuccess'));
      }
      onSuccess();
    } catch (error: any) {
      const msg = error.response?.data?.error;
      message.error(msg || (initialValues?.id ? t('poorProductReports.modal.updateFailed') : t('poorProductReports.modal.createFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={initialValues?.id ? t('poorProductReports.modal.editTitle') : t('poorProductReports.modal.createTitle')}
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
          rules={[{ required: true, message: t('poorProductReports.modal.productRequired') }]}
        >
          <Select showSearch optionFilterProp="children" placeholder={t('poorProductReports.modal.productPlaceholder')}>
            {products.map((p) => (
              <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="branch"
          label={t('common:fields.branch')}
          rules={[{ required: true, message: t('poorProductReports.modal.branchRequired') }]}
        >
          <Select showSearch optionFilterProp="children" placeholder={t('poorProductReports.modal.branchPlaceholder')}>
            {branches.map((b) => (
              <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="quantity"
          label={t('common:fields.quantity')}
          rules={[{ required: true, message: t('poorProductReports.modal.quantityRequired') }]}
        >
          <InputNumber style={{ width: '100%' }} min={0.01} />
        </Form.Item>

        <Form.Item
          name="report_date"
          label={t('poorProductReports.modal.reportDateLabel')}
          rules={[{ required: true, message: t('poorProductReports.modal.reportDateRequired') }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="status"
          label={t('common:fields.status')}
          rules={[{ required: true }]}
        >
          <Select>
            <Select.Option value="NOT_DEDUCT">{t('poorProductReports.statusOptions.NOT_DEDUCT')}</Select.Option>
            <Select.Option value="DEDUCT">{t('poorProductReports.statusOptions.DEDUCT')}</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PoorProductReportFormModal;
