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
import { employeeService } from '../../services/employeeService';
import { AdvanceRegistration } from './AdvanceRegistration';
import { AdvanceHistory } from './AdvanceHistory';
import { PayslipExecution } from './PayslipExecution';
import { PayslipHistory } from './PayslipHistory';
import { api } from '../../contexts/AuthContext'; 
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const EmployeeHub: React.FC = () => {
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
      message.error("Failed to load corporate database initialization records.");
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
      message.success("New employee profile generated successfully.");
      form.resetFields();
      navigate('/employees');
    } catch (err) {
      message.error("Failed to save employee profile. Verify constraints.");
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
      message.success("Employee profile updated successfully.");
      setIsEditMode(false);
      loadInitialConfiguration(); // Refresh details with new data sheet
    } catch (err) {
      message.error("Failed to update employee details. Verify form fields.");
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.job_role_display?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const DocumentLink: React.FC<{ url: string | null; label: string }> = ({ url, label }) => {
    if (!url) return <Text type="secondary">Not Provided</Text>;
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
                placeholder="Search Employees by Name or Position..."
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
                New Employee
              </Button>
            </div>

            <Divider style={{ margin: '12px 0 24px 0' }} />

            {filteredEmployees.length === 0 ? (
              <Empty description="No employee profiles found matching your query parameters." />
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
                            <span><PhoneOutlined /> {emp.phone_number || 'N/A'}</span>
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
                  <InfoCircleOutlined /> {isEditMode ? "Modify Employee Particulars" : "Employee Corporate Master Sheet"}
                </Title>
              </Space>
              
              {/* Toggle controls to dynamically switch modes */}
              {!isEditMode ? (
                <Button type="primary" icon={<EditOutlined />} onClick={() => setIsEditMode(true)} style={{ backgroundColor: '#714B67', borderColor: '#714B67' }}>
                  Edit Profile
                </Button>
              ) : (
                <Button icon={<CloseOutlined />} onClick={() => setIsEditMode(false)}>
                  Cancel Edit
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
                    <Descriptions title="Employment Particulars" bordered column={1} size="small">
                      <Descriptions.Item label={<span><IdcardOutlined /> Job Position Role</span>}><Text strong style={{ color: '#714B67' }}>{selectedEmp.job_role_display}</Text></Descriptions.Item>
                      <Descriptions.Item label={<span><EnvironmentOutlined /> Station Assignment</span>}>{selectedEmp.branch_name}</Descriptions.Item>
                      <Descriptions.Item label={<span><DollarOutlined /> Base Net Compensation</span>}>{Number(selectedEmp.monthly_salary).toLocaleString()} ETB / Month</Descriptions.Item>
                      <Descriptions.Item label={<span><CalendarOutlined /> Job Entry Execution Date</span>}>{dayjs(selectedEmp.job_start_date).format('MMMM DD, YYYY')}</Descriptions.Item>
                      <Descriptions.Item label={<span><PhoneOutlined /> Primary Contact</span>}>{selectedEmp.phone_number || 'Not provided'}</Descriptions.Item>
                      <Descriptions.Item label="Family Home Address">{selectedEmp.family_address}</Descriptions.Item>
                    </Descriptions>
                  </Col>
                </Row>

                <Row gutter={[24, 24]}>
                  <Col xs={24} md={12}>
                    <Card title={<span><SafetyOutlined style={{ color: '#714B67' }} /> Legal Verification Documents</span>} size="small" type="inner">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary">Employee ID Photo / Card:</Text>
                          <DocumentLink url={selectedEmp.employee_id_document} label="View ID Document" />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary">Signed Service Contract File:</Text>
                          <DocumentLink url={selectedEmp.signed_contract_document} label="View Contract PDF" />
                        </div>
                      </Space>
                    </Card>
                  </Col>

                  <Col xs={24} md={12}>
                    <Card title={<span><ContainerOutlined style={{ color: '#714B67' }} /> Emergency Contact & Guarantor Backup</span>} size="small" type="inner">
                      <Descriptions column={1} size="small" layout="horizontal">
                        <Descriptions.Item label="Guarantor Legal Name">{selectedEmp.emergency_contact_name || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Guarantor Contact Phone">{selectedEmp.emergency_contact_phone || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Guarantor ID File Document">
                          <DocumentLink url={selectedEmp.emergency_contact_id_document} label="View Guarantor ID" />
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
                      <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>1. Personal Profile Identity</Title>
                      <Form.Item name="full_name" label="Full Legal Name" rules={[{ required: true, message: 'Input legal name' }]}>
                        <Input size="large" />
                      </Form.Item>
                      <Form.Item name="phone_number" label="Primary Phone Number">
                        <Input size="large" />
                      </Form.Item>
                      <Form.Item name="family_address" label="Residential Family Address" rules={[{ required: true }]}>
                        <Input.TextArea rows={3} />
                      </Form.Item>
                      <Form.Item name="status" label="Employment Operations Status" rules={[{ required: true }]}>
                        <Select size="large">
                          <Select.Option value="ACTIVE">Active Deployment</Select.Option>
                          <Select.Option value="TERMINATED">Inactive / Suspended</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>2. Organizational Operations Setup</Title>
                      <Form.Item name="branch" label="Assigned Operations Base Branch" rules={[{ required: true }]}>
                        <Select size="large">
                          {branches.map(b => (
                            <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Form.Item name="job_role" label="Staff Job Role Designation" rules={[{ required: true }]}>
                        <Select size="large">
                          <Select.Option value="SALES">Sales Person</Select.Option>
                          <Select.Option value="CASHIER">Cashier</Select.Option>
                          <Select.Option value="DELIVERY">Delivery Driver</Select.Option>
                          <Select.Option value="CLEANER">Cleaner</Select.Option>
                          <Select.Option value="BRANCH_ADMIN">Branch Admin</Select.Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="monthly_salary" label="Gross Monthly Contract Salary (ETB)" rules={[{ required: true }]}>
                        <Input type="number" size="large" />
                      </Form.Item>
                      <Form.Item name="job_start_date" label="Official Job Execution Start Date">
                        <DatePicker size="large" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Divider style={{ margin: '16px 0' }} />

                  <Row gutter={24}>
                    <Col xs={24} md={12}>
                      <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>3. Legal Documentation Files (Leave blank to keep existing files)</Title>
                      <Form.Item name="employee_id_document" label="Update Employee Identification File">
                        <Upload beforeUpload={() => false} maxCount={1} listType="picture"><Button size="large" icon={<UploadOutlined />}>Select New Photo</Button></Upload>
                      </Form.Item>
                      <Form.Item name="signed_contract_document" label="Update Signed Employment Contract PDF">
                        <Upload beforeUpload={() => false} maxCount={1}><Button size="large" icon={<UploadOutlined />}>Select New Contract</Button></Upload>
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>4. Emergency Guarantor Backstop Info</Title>
                      <Form.Item name="emergency_contact_name" label="Guarantor Emergency Contact Full Name">
                        <Input size="large" />
                      </Form.Item>
                      <Form.Item name="emergency_contact_phone" label="Guarantor Emergency Contact Phone Number">
                        <Input size="large" />
                      </Form.Item>
                      <Form.Item name="emergency_contact_id_document" label="Update Guarantor Legal Identification card File">
                        <Upload beforeUpload={() => false} maxCount={1}><Button size="large" icon={<UploadOutlined />}>Select New ID File</Button></Upload>
                      </Form.Item>
                    </Col>
                  </Row>

                  <div style={{ marginTop: '24px', textAlign: 'right', paddingBottom: '12px' }}>
                    <Space size="middle">
                      <Button size="large" onClick={() => setIsEditMode(false)}>Cancel</Button>
                      <Button type="primary" size="large" htmlType="submit" icon={<SaveOutlined />} loading={loading} style={{ backgroundColor: '#714B67', borderColor: '#714B67' }}>
                        Save Changes
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
              <Title level={3} style={{ margin: 0, color: '#714B67' }}><IdcardOutlined /> Onboard New Corporate Employee</Title>
            </div>
            
            <Divider style={{ margin: '12px 0 24px 0' }} />

            <div style={{
              paddingRight: '12px',
              marginBottom: '16px'
            }}>
            <Form form={form} layout="vertical" onFinish={handleCreateEmployee} requiredMark={false} initialValues={{ job_start_date: dayjs(), status: 'ACTIVE' }}>
                <Row gutter={24}>
                <Col xs={24} md={12}>
                    <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>1. Personal Profile Identity</Title>
                    <Form.Item name="full_name" label="Full Legal Name" rules={[{ required: true, message: 'Input legal name' }]}>
                      <Input size="large" placeholder="First Father Grandfather Name" />
                    </Form.Item>
                    <Form.Item name="phone_number" label="Primary Phone Number">
                      <Input size="large" placeholder="+2519..." />
                    </Form.Item>
                    <Form.Item name="family_address" label="Residential Family Address" rules={[{ required: true, message: 'Input residential details' }]}>
                      <Input.TextArea rows={3} placeholder="Subcity, Wereda, House Number..." />
                    </Form.Item>
                    <Form.Item name="status" label="Onboarding Status State Parameters" rules={[{ required: true }]}>
                      <Select size="large">
                        <Select.Option value="ACTIVE">Active Deployment</Select.Option>
                        <Select.Option value="TERMINATED">Inactive / Suspended</Select.Option>
                      </Select>
                    </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                    <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>2. Organizational Operations Setup</Title>
                    <Form.Item name="branch" label="Assigned Base Operations Location Branch" rules={[{ required: true, message: 'Select base branch' }]}>
                      <Select size="large" placeholder="Select Targeted Physical Branch">
                        {branches.map(b => (
                          <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="job_role" label="Staff Job Role Designation" rules={[{ required: true, message: 'Select role' }]}>
                      <Select size="large" placeholder="Select Structural Position">
                        <Select.Option value="SALES">Sales Person</Select.Option>
                        <Select.Option value="CASHIER">Cashier</Select.Option>
                        <Select.Option value="DELIVERY">Delivery Driver</Select.Option>
                        <Select.Option value="CLEANER">Cleaner</Select.Option>
                        <Select.Option value="BRANCH_ADMIN">Branch Admin</Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item name="monthly_salary" label="Structural Gross Monthly Salary (ETB)" rules={[{ required: true, message: 'Input base compensation' }]}>
                      <Input type="number" size="large" placeholder="Base Monthly Net Earnings Contract Rate" />
                    </Form.Item>
                    <Form.Item name="job_start_date" label="Official Job Execution Start Date">
                      <DatePicker size="large" style={{ width: '100%' }} />
                    </Form.Item>
                </Col>
                </Row>

                <Divider style={{ margin: '16px 0' }} />

                <Row gutter={24}>
                <Col xs={24} md={12}>
                    <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>3. Legal Documentation Files Attachment</Title>
                    <Form.Item name="employee_id_document" label="Employee Identification Document Snapshot File">
                      <Upload beforeUpload={() => false} maxCount={1} listType="picture"><Button size="large" icon={<UploadOutlined />}>Select Photo / File</Button></Upload>
                    </Form.Item>
                    <Form.Item name="signed_contract_document" label="Signed Employment Contract Document Asset (PDF/Image)">
                      <Upload beforeUpload={() => false} maxCount={1}><Button size="large" icon={<UploadOutlined />}>Select Contract Document</Button></Upload>
                    </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                    <Title level={5} style={{ color: '#714B67', marginBottom: '16px' }}>4. Emergency Guarantor Backstop Info</Title>
                    <Form.Item name="emergency_contact_name" label="Guarantor Emergency Contact Full Name">
                      <Input size="large" placeholder="Guarantor Full Legal Name" />
                    </Form.Item>
                    <Form.Item name="emergency_contact_phone" label="Guarantor Emergency Contact Phone Number">
                      <Input size="large" placeholder="+2519..." />
                    </Form.Item>
                    <Form.Item name="emergency_contact_id_document" label="Guarantor Legal Identification Card File Attachment">
                      <Upload beforeUpload={() => false} maxCount={1}><Button size="large" icon={<UploadOutlined />}>Select Guarantor ID File</Button></Upload>
                    </Form.Item>
                </Col>
                </Row>

                <div style={{ marginTop: '24px', textAlign: 'right', paddingBottom: '12px' }}>
                <Space size="middle">
                    <Button size="large" onClick={() => navigate('/employees')}>Cancel</Button>
                    <Button type="primary" size="large" htmlType="submit" icon={<SaveOutlined />} loading={loading} style={{ backgroundColor: '#714B67', borderColor: '#714B67' }}>
                      Commit & Register Employee
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