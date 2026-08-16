import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, message, Empty, Divider } from 'antd';
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';
import type { Vendor, Product } from '../../types/inventory';

interface CreateProductProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  initialValues?: Product | null;
}

const CreateProductModal: React.FC<CreateProductProps> = ({ 
  visible, 
  onCancel, 
  onSuccess, 
  initialValues 
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const { t } = useTranslation('inventory');

  const isEditing = !!initialValues?.id;

  useEffect(() => {
    if (visible) {
      // 1. Fetch vendors
      inventoryService.getVendors().then(res => {
        setVendors(Array.isArray(res.data) ? res.data : []);
      }).catch(() => setVendors([]));

      // 2. Sync Form Data
      if (initialValues) {
        // We use a zero-timeout to ensure the form instance is ready in the DOM
        setTimeout(() => {
          form.setFieldsValue({
            ...initialValues,
            // CRITICAL: Extract ID if vendor is an object, otherwise the Select remains empty
            vendor: typeof initialValues.vendor === 'object' 
              ? (initialValues.vendor as any)?.id 
              : initialValues.vendor
          });
        }, 0);
      } else {
        form.resetFields();
        form.setFieldsValue({ pieces_per_pack: 1, destination: 'STORE' });
      }
    }
  }, [visible, initialValues, form]);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      if (isEditing && initialValues?.id) {
        await inventoryService.updateProduct(initialValues.id, values);
        message.success(t('createProductModal.updateSuccess'));
      } else {
        await inventoryService.createProduct(values);
        message.success(t('createProductModal.createSuccess'));
      }
      onSuccess();
    } catch (error) {
      message.error(t('createProductModal.operationFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEditing ? t('createProductModal.editTitle') : t('createProductModal.createTitle')}
      open={visible}
      onOk={() => form.submit()}
      onCancel={onCancel}
      confirmLoading={submitting}
      destroyOnClose={true}
      okText={isEditing ? t('createProductModal.updateButton') : t('createProductModal.saveButton')}
      okButtonProps={{ style: { background: '#714B67', border: 'none' } }}
      // Ensure modal is fresh on every open
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        preserve={false}
      >
        <Form.Item name="name" label={t('createProductModal.nameLabel')} rules={[{ required: true, message: t('createProductModal.nameRequired') }]}>
          <Input placeholder={t('createProductModal.namePlaceholder')} />
        </Form.Item>

        <Form.Item name="category" label={t('common:fields.category')} rules={[{ required: true }]}>
          <Select placeholder={t('createProductModal.categoryPlaceholder')}>
            <Select.Option value="KHAT">{t('createProductModal.categories.khat')}</Select.Option>
            <Select.Option value="DRINK">{t('createProductModal.categories.drink')}</Select.Option>
            <Select.Option value="WATER">{t('createProductModal.categories.water')}</Select.Option>
            <Select.Option value="NUTS">{t('createProductModal.categories.nuts')}</Select.Option>
            <Select.Option value="CIGARETTE">{t('createProductModal.categories.cigarette')}</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="destination"
          label={t('createProductModal.destinationLabel')}
          rules={[{ required: true }]}
          extra={t('createProductModal.destinationExtra')}
        >
          <Select>
            <Select.Option value="STORE">{t('createProductModal.destinationStore')}</Select.Option>
            <Select.Option value="SHOP">{t('createProductModal.destinationShop')}</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="vendor" label={t('createProductModal.vendorLabel')}>
          <Select
            placeholder={t('createProductModal.vendorPlaceholder')}
            showSearch
            allowClear
            optionFilterProp="children"
          >
            {vendors.map(v => (
              <Select.Option key={v.id} value={v.id}>{v.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Divider style={{ margin: '12px 0' }}>{t('createProductModal.pricingDivider')}</Divider>

        <Form.Item name="pieces_per_pack" label={t('createProductModal.piecesPerPackLabel')} rules={[{ required: true }]}>
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="buying_price_per_piece" label={t('createProductModal.buyingPriceLabel')} rules={[{ required: true }]}>
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix={t('common:units.etb')} />
        </Form.Item>

        <Form.Item name="selling_price_per_piece" label={t('createProductModal.sellingPriceLabel')} rules={[{ required: true }]}>
          <InputNumber min={0} step={0.01} style={{ width: '100%' }} prefix={t('common:units.etb')} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateProductModal;