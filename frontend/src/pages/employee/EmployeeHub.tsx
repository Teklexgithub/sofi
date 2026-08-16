import React, { useState, useEffect } from 'react';
import {
  Card, Button, Input, Row, Col, Avatar, Tag, Form, Select,
  Typography, Divider, Space, message, Empty, DatePicker, Upload, Descriptions
} from 'antd';
import {
  UserOutlined, SearchOutlined, PlusOutlined, ArrowLeftOutlined,
  PhoneOutlined, EnvironmentOutlined, SaveOutlined, IdcardOutlined,
  UploadOutlined, FilePdfOutlined, ContainerOutlined, SafetyOutlined,
  CalendarOutlined, DollarOutlined, InfoCircleOutlined, EditOutlined, CloseOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { employeeService } from '../../services/employeeService';
import { AdvanceRegistration } from './AdvanceRegistration';
import { AdvanceHistory } from './AdvanceHistory';
import { PayslipExecution } from './PayslipExecution';
import { PayslipHistory } from './PayslipHistory';
import { api } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const EmployeeHub: React.FC = () => {
  const { t } = useTranslation('employee');
  const location = useLocation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm(); // 🌟 ADDED: Independent form instance for tracking edits safely

  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'directory';
  const targetEmployeeId = queryParams.get('id');
  
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]); 
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🌟 ADDED: UI Toggle Switch Mode Tracking State
  const [isEditMode, setIsEditMode] = useState(false);

  const loadInitialConfiguration = async () => {
    setLoading(true);
    try {
      const branchRes = await api.get('inventory/branches/');
      setBranches(Array.isArray(branchRes.data) ? branchRes.data : []);

      const res = await employeeService.getProfiles();
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setEmployees(data);
      
      if (targetEmployeeId) {
        const found = data.find((e: any) => e.id === targetEmployeeId);
        if (found) {
          setSelectedEmp(found);
          // 🌟 Pre-populate edit form with current values
          editForm.setFieldsValue({
            ...found,
            job_start_date: found.job_start_date ? dayjs(found.job_start_date) : null
          });
        }
      }
    } catch (err) {
      message.error(t('hub.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialConfiguration();
    // Reset edit mode when tab changing
    if (activeTab !== 'view_detail') {
      setIsEditMode(false);
    }
  }, [activeTab, targetEmployeeId]);

  const handleCreateEmployee = async (values: any) => {
    setLoading(true);
    const formData = new FormData();

    formData.append('full_name', values.full_name);
    formData.append('phone_number', values.phone_number || '');
    formData.append('family_address', values.family_address);
    formData.append('branch', values.branch); 
    formData.append('job_role', values.job_role);
    formData.append('monthly_salary', values.monthly_salary);
    formData.append('status', values.status || 'ACTIVE');
    formData.append('job_start_date', values.job_start_date ? values.job_start_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
    formData.append('emergency_contact_name', values.emergency_contact_name || '');
    formData.append('emergency_contact_phone', values.emergency_contact_phone || '');

    if (values.employee_id_document?.file) formData.append('employee_id_document', values.employee_id_document.file);
    if (values.signed_contract_document?.file) formData.append('signed_contract_document', values.signed_contract_document.file);
    if (values.emergency_contact_id_document?.file) formData.append('emergency_contact_id_document', values.emergency_contact_id_document.file);

    try {
      await employeeService.createProfile(formData);
      message.success(t('hub.messages.createSuccess'));
      form.resetFields();
      navigate('/employees');
    } catch (err) {
      message.error(t('hub.messages.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 🌟 ADDED: Handlers to process inline edits via HTTP PATCH updates
  const handleUpdateEmployee = async (values: any) => {
    if (!selectedEmp?.id) return;
    setLoading(true);
    const formData = new FormData();

    formData.append('full_name', values.full_name);
    formData.append('phone_number', values.phone_number || '');
    formData.append('family_address', values.family_address);
    formData.append('branch', values.branch); 
    formData.append('job_role', values.job_role);
    formData.append('monthly_salary', values.monthly_salary);
    formData.append('status', values.status);
    formData.append('job_start_date', values.job_start_date ? values.job_start_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
    formData.append('emergency_contact_name', values.emergency_contact_name || '');
    formData.append('emergency_contact_phone', values.emergency_contact_phone || '');

    // Append new files only if selected by user
    if (values.employee_id_document?.file) formData.append('employee_id_document', values.employee_id_document.file);
    if (values.signed_contract_document?.file) formData.append('signed_contract_document', values.signed_contract_document.file);
    if (values.emergency_contact_id_document?.file) formData.append('emergency_contact_id_document', values.emergency_contact_id_document.file);

    try {
      await employeeService.updateProfile(selectedEmp.id, formData);
      message.success(t('hub.messages.updateSuccess'));
      setIsEditMode(false);
      loadInitialConfiguration(); // Refresh details with new data sheet
    } catch (err) {
      message.error(t('hub.messages.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.job_role_display?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const DocumentLink: React.FC<{ url: string | null; label: string }> = ({ url, label }) => {
    if (!url) return <Text type="secondary">{t('hub.detail.notProvided')}</Text>;
    return (
      <Button type="link" icon={<FilePdfOutlined />} href={url} target="_blank" style={{ padding: 0, height: 'auto' }}>
        {label}
      </Button>
    );
  };

  return (
    <div style={{ padding: '8px 0', maxWidth: '1400px', margin: '0 auto' }}>
      <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.03)' }}>
        
        {/* VIEW MODULE 1: ODOO DIRECTORY KANBAN GRID */}
        {activeTab === 'directory' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <Input
                size="large"
                placeholder={t('hub.directory.searchPlaceholder')}
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                style={{ maxWidth: '400px', borderRadius: '6px' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                allowClear
              />
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                style={{ backgroundColor: '#714B67', borderColor: '#714B67', borderRadius: '6px' }}
                onClick={() => navigate('/employees?tab=create_employee')}
              >
                {t('hub.directory.newEmployee')}
              </Button>
            </div>

            <Divider style={{ margin: '12px 0 24px 0' }} />

            {filteredEmployees.length === 0 ? (
              <Empty description={t('hub.directory.emptyState')} />
            ) : (
              <Row gutter={[16, 16]}>
                {filteredEmployees.map(emp => (
                  <Col xs={24} sm={12} md={8} lg={6} key={emp.id}>
                    <Card 
                      hoverable 
                      style={{ borderRadius: '8px', border: '1px solid #f0f0f0' }}
                      bodyStyle={{ padding: '16px' }}
                      onClick={() => navigate(`/employees?tab=view_detail&id=${emp.id}`)}
                    >
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <Avatar shape="square" size={64} src={emp.employee_id_document || undefined} icon={<UserOutlined />} style={{ backgroundColor: '#f5f5f5', color: '#714B67', borderRadius: '6px', flexShrink: 0 }} />
                        <div style={{ overflow: 'hidden', width: '100%' }}>
                          <Title level={5} ellipsis style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{emp.full_name}</Title>
                          <div style={{ marginBottom: '6px' }}>
                            <Tag color={emp.status === 'ACTIVE' ? 'success' : 'error'} style={{ fontSize: '10px' }}>{emp.status_display}</Tag>
                            <Tag color="purple" style={{ margin: 0, fontSize: '11px' }}>{emp.job_role_display}</Tag>
                          </div>
                          <Space direction="vertical" size={2} style={{ display: 'flex', fontSize: '12px', color: '#8c8c8c' }}>
                            <span><PhoneOutlined /> {emp.phone_number || t('hub.detail.notAvailable')}</span>
                            <span><EnvironmentOutlined /> {emp.branch_name}</span>
                          </Space>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        )}

        {/* 🌟 VIEW MODULE 2: DUAL DETAIL / INLINE EDIT EMPLOYEE PROFILE PAGE */}
        {activeTab === 'view_detail' && selectedEmp && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <Space size="middle">
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/employees')} />
                <Title level={3} style={{ margin: 0, color: '#714B67' }}>
                  <InfoCircleOutlined /> {isEditMode ? t('hub.detail.editTitle') : t('hub.detail.viewTitle')}
                </Title>
              </Space>

              {/* Toggle controls to dynamically switch modes */}
              {!isEditMode ? (
                <Button type="primary" icon={<EditOutlined />} onClick={() => setIsEditMode(true)} style={{ backgroundColor: '#714B67', borderColor: '#714B67' }}>
                  {t('hub.detail.editProfile')}
                </Button>
              ) : (
                <Button icon={<CloseOutlined />} onClick={() => setIsEditMode(false)}>
                  {t('hub.detail.cancelEdit')}
                </Button>
              )}
            </div>

            <Divider style={{ margin: '12px 0 24px 0' }} />

            {!isEditMode ? (
              // --- MODE A: STANDARD READ-ONLY VIEW PARAMS ---
              <div>
                <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                  <Col xs={24} md={6} style={{ textAlign: 'center' }}>
                    <Avatar shape="square" size={160} src={selectedEmp.employee_id_document || undefined} icon={<UserOutlined />} style={{ backgroundColor: '#f5f5f5', color: '#714B67', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                    <Title level={4} style={{ marginTop: '16px', marginBottom: '4px' }}>{selectedEmp.full_name}</Title>
                    <Tag color={selectedEmp.status === 'ACTIVE' ? 'success' : 'error'} style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}>{selectedEmp.status_display}</Tag>
                  </Col>

                  <Col xs={24} md={12}>
                    <Descriptions title={t('hub.detail.employmentParticulars')} bordered column={1} size="small">
                      <Descriptions.Item label={<span><IdcardOutlined /> {t('hub.detail.jobPositionRole')}</span>}><Text strong style={{ color: '#714B67' }}>{selectedEmp.job_role_display}</Text></Descriptions.Item>
                      <Descriptions.Item label={<span><EnvironmentOutlined /> {t('hub.detail.stationAssignment')}</span>}>{selectedEmp.branch_name}</Descriptions.Item>
                      <Descriptions.Item label={<span><DollarOutlined /> {t('hub.detail.baseCompensation')}</span>}>{Number(selectedEmp.monthly_salary).toLocaleString()} {t('common:units.etb')} {t('hub.detail.perMonth')}</Descriptions.Item>
                      <Descriptions.Item label={<span><CalendarOutlined /> {t('hub.detail.jobEntryDate')}</span>}>{dayjs(selectedEmp.job_start_date).format('MMMM DD, YYYY')}</Descriptions.Item>
                      <Descriptions.Item label={<span><PhoneOutlined /> {t('hub.detail.primaryContact')}</span>}>{selectedEmp.phone_number || t('hub.detail.notProvided')}</Descriptions.Item>
                      <Descriptions.Item label={t('hub.detail.familyHomeAddress')}>{selectedEmp.family_address}</Descriptions.Item>
                    </Descriptions>
                  </Col>
                </Row>

                <Row gutter={[24, 24]}>
                  <Col xs={24} md={12}>
                    <Card title={<span><SafetyOutlined style={{ color: '#714B67' }} /> {t('hub.detail.legalDocuments')}</span>} size="small" type="inner">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary">{t('hub.detail.employeeIdPhoto')}</Text>
                          <DocumentLink url={selectedEmp.employee_id_document} label={t('hub.detail.viewIdDocument')} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary">{t('hub.detail.signedContractFile')}</Text>
                          <DocumentLink url={selectedEmp.signed_contract_document} label={t('hub.detail.viewContractPdf')} />
                        </div>
                      </Space>
                    </Card>
                  </Col>

                  <Col xs={24} md={12}>
                    <Card title={<span><ContainerOutlined style={{ color: '#714B67' }} /> {t('hub.detail.emergencyContact')}</span>} size="small" type="inner">
                      <Descriptions column={1} size="small" layout="horizontal">
                        <Descriptions.Item label={t('hub.detail.guarantorName')}>{selectedEmp.emergency_contact_name || t('hub.detail.notAvailable')}</Descriptions.Item>
                        <Descriptions.Item label={t('hub.detail.guarantorPhone')}>{selectedEmp.emergency_contact_phone || t('hub.detail.notAvailable')}</Descriptions.Item>
                        <Descriptions.Item label={t('hub.detail.guarantorIdFile')}>
                          <DocumentLink url={selectedEmp.emergency_contact_id_document} label={t('hub.detail.viewGuarantorId')} />
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>
                  </Col>
                </Row>
              </div>
            ) : (
              // --- MODE B: DYNAMIC INTERACTIVE EDIT FORM WORKSPACE ---
              <div style={{ paddingRight: '12px' }}>
                <Form form={editForm} layout="vertical" onFinish={handleUpdateEmployee} requiredMark={false}>
                  <Row gutter={24}>
                    <Col xs={24} md={12}>
                      <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>{t('hub.sections.personalProfile')}</Title>
                      <Form.Item name="full_name" label={t('hub.editForm.fullName')} rules={[{ required: true, message: t('hub.editForm.fullNameRequired') }]}>
                        <Input size="large" />
                      </Form.Item>
                      <Form.Item name="phone_number" label={t('hub.editForm.phoneNumber')}>
                        <Input size="large" />
                      </Form.Item>
                      <Form.Item name="family_address" label={t('hub.editForm.familyAddress')} rules={[{ required: true }]}>
                        <Input.TextArea rows={3} />
                      </Form.Item>
                      <Form.Item name="status" label={t('hub.editForm.statusLabel')} rules={[{ required: true }]}>
                        <Select size="large">
                          <Select.Option value="ACTIVE">{t('hub.editForm.statusActive')}</Select.Option>
                          <Select.Option value="TERMINATED">{t('hub.editForm.statusInactive')}</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>{t('hub.sections.organizationalSetup')}</Title>
                      <Form.Item name="branch" label={t('hub.editForm.branch')} rules={[{ required: true }]}>
                        <Select size="large">
                          {branches.map(b => (
                            <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Form.Item name="job_role" label={t('hub.editForm.jobRole')} rules={[{ required: true }]}>
                        <Select size="large">
                          <Select.Option value="SALES">{t('jobRoles.SALES')}</Select.Option>
                          <Select.Option value="CASHIER">{t('jobRoles.CASHIER')}</Select.Option>
                          <Select.Option value="DELIVERY">{t('jobRoles.DELIVERY')}</Select.Option>
                          <Select.Option value="CLEANER">{t('jobRoles.CLEANER')}</Select.Option>
                          <Select.Option value="BRANCH_ADMIN">{t('jobRoles.BRANCH_ADMIN')}</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="monthly_salary" label={t('hub.editForm.monthlySalary')} rules={[{ required: true }]}>
                        <Input type="number" size="large" />
                      </Form.Item>
                      <Form.Item name="job_start_date" label={t('hub.editForm.jobStartDate')}>
                        <DatePicker size="large" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider style={{ margin: '16px 0' }} />

                  <Row gutter={24}>
                    <Col xs={24} md={12}>
                      <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>{t('hub.editForm.sectionDocsNote')}</Title>
                      <Form.Item name="employee_id_document" label={t('hub.editForm.employeeIdDoc')}>
                        <Upload beforeUpload={() => false} maxCount={1} listType="picture"><Button size="large" icon={<UploadOutlined />}>{t('hub.editForm.selectNewPhoto')}</Button></Upload>
                      </Form.Item>
                      <Form.Item name="signed_contract_document" label={t('hub.editForm.signedContract')}>
                        <Upload beforeUpload={() => false} maxCount={1}><Button size="large" icon={<UploadOutlined />}>{t('hub.editForm.selectNewContract')}</Button></Upload>
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>{t('hub.sections.emergencyGuarantor')}</Title>
                      <Form.Item name="emergency_contact_name" label={t('hub.editForm.emergencyName')}>
                        <Input size="large" />
                      </Form.Item>
                      <Form.Item name="emergency_contact_phone" label={t('hub.editForm.emergencyPhone')}>
                        <Input size="large" />
                      </Form.Item>
                      <Form.Item name="emergency_contact_id_document" label={t('hub.editForm.emergencyIdDoc')}>
                        <Upload beforeUpload={() => false} maxCount={1}><Button size="large" icon={<UploadOutlined />}>{t('hub.editForm.selectNewIdFile')}</Button></Upload>
                      </Form.Item>
                    </Col>
                  </Row>

                  <div style={{ marginTop: '24px', textAlign: 'right', paddingBottom: '12px' }}>
                    <Space size="middle">
                      <Button size="large" onClick={() => setIsEditMode(false)}>{t('hub.editForm.cancel')}</Button>
                      <Button type="primary" size="large" htmlType="submit" icon={<SaveOutlined />} loading={loading} style={{ backgroundColor: '#714B67', borderColor: '#714B67' }}>
                        {t('hub.editForm.saveChanges')}
                      </Button>
                    </Space>
                  </div>
                </Form>
              </div>
            )}
          </div>
        )}

        {/* VIEW MODULE 3: DEDICATED FULL-PAGE CREATION FORM WITH SCROLLBAR */}
        {activeTab === 'create_employee' && (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/employees')} />
              <Title level={3} style={{ margin: 0, color: '#714B67' }}><IdcardOutlined /> {t('hub.createForm.title')}</Title>
            </div>

            <Divider style={{ margin: '12px 0 24px 0' }} />

            <div style={{
              paddingRight: '12px',
              marginBottom: '16px'
            }}>
            <Form form={form} layout="vertical" onFinish={handleCreateEmployee} requiredMark={false} initialValues={{ job_start_date: dayjs(), status: 'ACTIVE' }}>
                <Row gutter={24}>
                <Col xs={24} md={12}>
                    <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>{t('hub.sections.personalProfile')}</Title>
                    <Form.Item name="full_name" label={t('hub.createForm.fullName')} rules={[{ required: true, message: t('hub.createForm.fullNameRequired') }]}>
                      <Input size="large" placeholder={t('hub.createForm.fullNamePlaceholder')} />
                    </Form.Item>
                    <Form.Item name="phone_number" label={t('hub.createForm.phoneNumber')}>
                      <Input size="large" placeholder={t('hub.createForm.phonePlaceholder')} />
                    </Form.Item>
                    <Form.Item name="family_address" label={t('hub.createForm.familyAddress')} rules={[{ required: true, message: t('hub.createForm.familyAddressRequired') }]}>
                      <Input.TextArea rows={3} placeholder={t('hub.createForm.familyAddressPlaceholder')} />
                    </Form.Item>
                    <Form.Item name="status" label={t('hub.createForm.statusLabel')} rules={[{ required: true }]}>
                      <Select size="large">
                        <Select.Option value="ACTIVE">{t('hub.createForm.statusActive')}</Select.Option>
                        <Select.Option value="TERMINATED">{t('hub.createForm.statusInactive')}</Select.Option>
                      </Select>
                    </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                    <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>{t('hub.sections.organizationalSetup')}</Title>
                    <Form.Item name="branch" label={t('hub.createForm.branch')} rules={[{ required: true, message: t('hub.createForm.branchRequired') }]}>
                      <Select size="large" placeholder={t('hub.createForm.branchPlaceholder')}>
                        {branches.map(b => (
                          <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="job_role" label={t('hub.createForm.jobRole')} rules={[{ required: true, message: t('hub.createForm.jobRoleRequired') }]}>
                      <Select size="large" placeholder={t('hub.createForm.jobRolePlaceholder')}>
                        <Select.Option value="SALES">{t('jobRoles.SALES')}</Select.Option>
                        <Select.Option value="CASHIER">{t('jobRoles.CASHIER')}</Select.Option>
                        <Select.Option value="DELIVERY">{t('jobRoles.DELIVERY')}</Select.Option>
                        <Select.Option value="CLEANER">{t('jobRoles.CLEANER')}</Select.Option>
                        <Select.Option value="BRANCH_ADMIN">{t('jobRoles.BRANCH_ADMIN')}</Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item name="monthly_salary" label={t('hub.createForm.monthlySalary')} rules={[{ required: true, message: t('hub.createForm.monthlySalaryRequired') }]}>
                      <Input type="number" size="large" placeholder={t('hub.createForm.monthlySalaryPlaceholder')} />
                    </Form.Item>
                    <Form.Item name="job_start_date" label={t('hub.createForm.jobStartDate')}>
                      <DatePicker size="large" style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
                </Row>

                <Divider style={{ margin: '16px 0' }} />

                <Row gutter={24}>
                <Col xs={24} md={12}>
                    <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>{t('hub.createForm.sectionDocs')}</Title>
                    <Form.Item name="employee_id_document" label={t('hub.createForm.employeeIdDoc')}>
                      <Upload beforeUpload={() => false} maxCount={1} listType="picture"><Button size="large" icon={<UploadOutlined />}>{t('hub.createForm.selectPhoto')}</Button></Upload>
                    </Form.Item>
                    <Form.Item name="signed_contract_document" label={t('hub.createForm.signedContract')}>
                      <Upload beforeUpload={() => false} maxCount={1}><Button size="large" icon={<UploadOutlined />}>{t('hub.createForm.selectContract')}</Button></Upload>
                    </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                    <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>{t('hub.sections.emergencyGuarantor')}</Title>
                    <Form.Item name="emergency_contact_name" label={t('hub.createForm.emergencyName')}>
                      <Input size="large" placeholder={t('hub.createForm.emergencyNamePlaceholder')} />
                    </Form.Item>
                    <Form.Item name="emergency_contact_phone" label={t('hub.createForm.emergencyPhone')}>
                      <Input size="large" placeholder={t('hub.createForm.emergencyPhonePlaceholder')} />
                    </Form.Item>
                    <Form.Item name="emergency_contact_id_document" label={t('hub.createForm.emergencyIdDoc')}>
                      <Upload beforeUpload={() => false} maxCount={1}><Button size="large" icon={<UploadOutlined />}>{t('hub.createForm.selectIdFile')}</Button></Upload>
                    </Form.Item>
                </Col>
                </Row>

                <div style={{ marginTop: '24px', textAlign: 'right', paddingBottom: '12px' }}>
                <Space size="middle">
                    <Button size="large" onClick={() => navigate('/employees')}>{t('hub.createForm.cancel')}</Button>
                    <Button type="primary" size="large" htmlType="submit" icon={<SaveOutlined />} loading={loading} style={{ backgroundColor: '#714B67', borderColor: '#714B67' }}>
                      {t('hub.createForm.submit')}
                    </Button>
                </Space>
                </div>
            </Form>
            </div>
        </div>
        )}

        {/* Dynamic sub-view parameters route layouts mapping nodes */}
        {/* 🌟 TAB 2: CLEAN DEDICATED CALL EXTENSIONS */}
        {activeTab === 'advance_reg' && <AdvanceRegistration employees={employees} />}
        {activeTab === 'advance_history' && <AdvanceHistory />}

        {/* TAB 3: PAYROLL PLUGINS WORKSPACE GOES HERE */}
        {activeTab === 'payslip_run' && <PayslipExecution employees={employees} />}
        {activeTab === 'payslip_history' && <PayslipHistory />}

      </Card>
    </div>
  );
};

export default EmployeeHub;