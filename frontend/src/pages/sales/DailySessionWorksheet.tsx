import React, { useState, useEffect } from 'react';
import { 
  Table, InputNumber, Button, Card, Typography, DatePicker, 
  Select, Space, message, Divider, Tabs, Input, Row, Col, Empty, Alert, Badge 
} from 'antd';
import { 
  CalculatorOutlined, CheckCircleOutlined, ReloadOutlined, 
  WalletOutlined, ShoppingOutlined, UserAddOutlined, 
  PlusOutlined, DeleteOutlined, BankOutlined, DollarOutlined,
  EnvironmentOutlined, SafetyCertificateOutlined,
  AuditOutlined, MobileOutlined, UserOutlined, ContactsOutlined, SearchOutlined
} from '@ant-design/icons';
import { salesService } from '../../services/salesService';
import { inventoryService } from '../../services/inventoryService'; 
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// --- SCROLL CONTAINER FOR THE TABBED LISTS ---
const scrollBoxStyle: React.CSSProperties = {
  maxHeight: '380px', 
  overflowY: 'auto', 
  overflowX: 'hidden', 
  padding: '15px',
  background: '#ffffff',
  border: '1px solid #f0f0f0',
  borderRadius: '12px',
  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.03)',
  marginBottom: '10px'
};

const DailySessionWorksheet: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'worksheet' | 'debts' | 'credits'>('worksheet');
  
  // --- MASTER DROPDOWN POOL STATES ---
  const [branches, setBranches] = useState<any[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<any[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
  
  // --- DEBTS SEARCH INPUT STATE ---
  const [debtLedgerSearchQuery, setDebtLedgerSearchQuery] = useState('');
  
  // Inline Creation Temp States
  const [newCustomerName, setNewCustomerName] = useState('');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  
  // --- CORE RUNTIME STATE ---
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(user?.branch || undefined);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [worksheetData, setWorksheetData] = useState<any[]>([]);
  
  // --- FORM DATA ARRAYS ---
  const [expenses, setExpenses] = useState<{reason: string, amount: number}[]>([]);
  const [creditsIssued, setCreditsIssued] = useState<{customer_id: string, amount: number}[]>([]);
  const [creditPayments, setCreditPayments] = useState<{customer_id: string, amount: number}[]>([]);
  const [digitalBalances, setDigitalBalances] = useState<{account_id: string, balance: number}[]>([]);
  const [manualDeposits, setManualDeposits] = useState<{amount: number, bank: string, account_name: string}[]>([]);

  // Physical Cash drawer allocations
  const [cashToAdmin, setCashToAdmin] = useState<number>(0);
  const [cashForChange, setCashForChange] = useState<number>(0);

  const isAdmin = user?.role === 'ADMIN';

  // --- 1. CORE DATA INITIALIZATION ---
  useEffect(() => {
    if (isAdmin) {
      inventoryService.getBranches()
        .then(res => {
          const branchData = Array.isArray(res.data) ? res.data : (res.data.results || []);
          setBranches(branchData);
        })
        .catch(() => message.error("Security Sync: Failed to load context branches."));
    }
  }, [isAdmin]);

  // Safe Context Populator with Runtime Crash Defenses
  useEffect(() => {
    if (!selectedBranch) return;

    setAvailableAccounts([]);
    setAvailableCustomers([]);

    // Fetch account wrappers safely
    salesService.getDigitalAccounts(selectedBranch)
      .then(res => {
        if (res && res.data) {
          setAvailableAccounts(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => console.warn("Digital profiles are empty for this branch."));

    // Fetch initial customer registry pool safely
    salesService.getCustomerCredits(selectedBranch, '', false)
      .then(res => {
        if (res && res.data) {
          setAvailableCustomers(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => console.warn("Customer database register is unpopulated."));

  }, [selectedBranch]);

  // Safer Search API hook to avoid breaking layout state engines
  const fetchCustomerPool = (searchString: string) => {
    if (!selectedBranch) return;
    salesService.getCustomerCredits(selectedBranch, searchString, false)
      .then(res => {
        if (res && res.data) {
          setAvailableCustomers(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => console.warn("Failed to complete remote string filter."));
  };

  // --- 2. INLINE CUSTOMER CREATION LOGIC ---
  const handleInlineCustomerCreate = async (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return message.warning("Please enter a valid name.");
    if (!selectedBranch) return message.error("Please lock a branch location first.");
    
    setCreatingCustomer(true);
    try {
      const response = await salesService.createCustomer({
        customer_name: newCustomerName.trim(),
        branch: selectedBranch,
        total_balance: 0
      });
      
      message.success(`Profile for "${newCustomerName}" registered successfully!`);
      
      const freshCustomer = response.data;
      setAvailableCustomers([...availableCustomers, freshCustomer]);
      setNewCustomerName('');
    } catch (err) {
      message.error("Failed to register new profile. Ensure name is unique.");
    } finally {
      setCreatingCustomer(false);
    }
  };

  // --- 3. WORKSHEET STAGING CONTROLLERS ---
  const loadWorksheet = async () => {
    if (!selectedBranch) return message.warning("Please select an active branch location.");
    setLoading(true);
    try {
      const res = await salesService.prepareWorksheet(selectedBranch, selectedDate.format('YYYY-MM-DD'));
      if (res && res.data) {
        setWorksheetData(res.data.map((item: any) => ({ ...item, closing_balance: null })));
        message.success("Worksheet compiled! Proceed through steps.");
      } else {
        throw new Error("Empty response array.");
      }
    } catch (e) {
      message.error("Sync Exception: Verify that inventory values exist for this target node.");
    } finally {
      setLoading(false);
    }
  };

  // --- COMPREHENSIVE LIVE POSITION CALCULATOR SYSTEM ---
  const calculateTotalSalesLive = (): number => {
    return worksheetData.reduce((runningSum, record) => {
      if (record.closing_balance === null || record.closing_balance === undefined) return runningSum;
      const piecesSold = record.opening_balance - record.closing_balance;
      const rowRevenue = piecesSold > 0 ? piecesSold * (record.unit_price || 0) : 0;
      return runningSum + rowRevenue;
    }, 0);
  };

  const calculateNetDrawerCashLive = (): number => {
    // 1. Base Revenue (+)
    const grossSalesRevenue = calculateTotalSalesLive();

    // 2. Tab 2 Expenses (-)
    const aggregatedExpensesOut = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);

    // 3. Tab 3 New Unpaid Debts Given Out (-)
    const aggregatedNewDebtsGiven = creditsIssued.reduce((sum, item) => sum + (item.amount || 0), 0);

    // 4. Tab 4 Credit Recovery Repayments Brought In (+)
    const aggregatedCreditRecovered = creditPayments.reduce((sum, item) => sum + (item.amount || 0), 0);

    // 5. Tab 5 Digital Channels REVENUE DELTA Shift Loop (-)
    const aggregatedDigitalHandoversDelta = digitalBalances.reduce((sum, item) => {
      // Find the historical master baseline values
      const matchedAccountMaster = availableAccounts.find(acc => acc.id === item.account_id);
      const yesterdayBaseBalance = matchedAccountMaster 
        ? (matchedAccountMaster.last_closing_balance ?? matchedAccountMaster.initial_balance ?? 0)
        : 0;
      
      // Calculate ONLY the delta shift (Today Balance - Yesterday Balance)
      const liveDeltaShift = item.balance ? (item.balance - yesterdayBaseBalance) : 0;
      
      // Accumulate the net shift difference
      return sum + liveDeltaShift;
    }, 0);

    const aggregatedManualSlips = manualDeposits.reduce((sum, item) => sum + (item.amount || 0), 0);

    // 6. Tab 5 Physical Cash Handed Over or Left Behind in Drawer (-)
    const physicalCashOut = cashToAdmin + cashForChange;

    // 7. Complete Mathematical Balance Reduction Execution
    return (
      grossSalesRevenue 
      - aggregatedExpensesOut 
      - aggregatedNewDebtsGiven 
      + aggregatedCreditRecovered 
      - aggregatedDigitalHandoversDelta // <-- FIXED: Subtracting only the 1,000.00 delta shift now!
      - aggregatedManualSlips
      - physicalCashOut
    );
  };
  const addExpense = () => setExpenses([{ reason: '', amount: 0 }, ...expenses]);
  const addCreditIssued = () => setCreditsIssued([{ customer_id: '', amount: 0 }, ...creditsIssued]);
  const addCreditPayment = () => setCreditPayments([{ customer_id: '', amount: 0 }, ...creditPayments]);
  const addDigital = () => setDigitalBalances([{ account_id: '', balance: 0 }, ...digitalBalances]);
  const addDeposit = () => setManualDeposits([{ amount: 0, bank: '', account_name: '' }, ...manualDeposits]);

  const removeExpense = (index: number) => setExpenses(expenses.filter((_, i) => i !== index));
  const removeCreditIssued = (index: number) => setCreditsIssued(creditsIssued.filter((_, i) => i !== index));
  const removeCreditPayment = (index: number) => setCreditPayments(creditPayments.filter((_, i) => i !== index));

  // --- FILTERED DEBT CUSTOMERS POOL ---
  const getFilteredDebtLedgerData = () => {
    if (!debtLedgerSearchQuery.trim()) return availableCustomers;
    return availableCustomers.filter(customer => 
      customer.customer_name?.toLowerCase().includes(debtLedgerSearchQuery.toLowerCase())
    );
  };

  // --- 4. DATA TRANSMISSION ---
  const submitAll = async () => {
    if (worksheetData.length === 0) return message.error("Action Aborted: No active session active.");
    if (worksheetData.some(item => item.closing_balance === null)) {
      return message.error("Validation Error: Please record current counts for all listed catalog items.");
    }

    setLoading(true);
    try {
      const payload = {
        branch: selectedBranch,
        trading_date: selectedDate.format('YYYY-MM-DD'),
        digital_balances: digitalBalances.filter(d => d.account_id !== ''),
        manual_deposits: manualDeposits.filter(m => m.amount > 0),
        physical_cash_handed_to_admin: cashToAdmin,
        cash_retained_for_change: cashForChange,
        products: worksheetData,
        expenses: expenses.filter(e => e.reason !== ''),
        credits: creditsIssued.filter(c => c.customer_id !== ''),
        credit_payments: creditPayments.filter(p => p.customer_id !== '') 
      };
      
      await salesService.submitDailySession(payload);
      message.success("Success: Daily Branch settlement submitted safely!");
      setTimeout(() => window.location.reload(), 1500); 
    } catch (e: any) {
      message.error("Transaction failed during live balancing routine.");
    } finally {
      setLoading(false);
    }
  };

  const netCashValue = calculateNetDrawerCashLive();
  const isNetNegative = netCashValue < 0;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ADVANCE SUB-NAVIGATION MENUS BOX */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <Button 
          type={activeSubView === 'worksheet' ? 'primary' : 'default'}
          onClick={() => setActiveSubView('worksheet')}
          icon={<CalculatorOutlined />}
          style={activeSubView === 'worksheet' ? { background: '#714B67', borderColor: '#714B67' } : {}}
        >
          Daily Worksheet Staging
        </Button>
        <Button 
          type={activeSubView === 'debts' ? 'primary' : 'default'}
          onClick={() => setActiveSubView('debts')}
          icon={<UserOutlined />}
          style={activeSubView === 'debts' ? { background: '#714B67', borderColor: '#714B67' } : {}}
        >
          Advance: Debts Ledger
        </Button>
        <Button 
          type={activeSubView === 'credits' ? 'primary' : 'default'}
          onClick={() => setActiveSubView('credits')}
          icon={<ContactsOutlined />}
          style={activeSubView === 'credits' ? { background: '#714B67', borderColor: '#714B67' } : {}}
        >
          Advance: Credits Balance
        </Button>
      </div>

      {/* VIEW RENDER CONDITIONS BLOCK */}
      {activeSubView === 'debts' && (
        <Card title="Advance Monitor: Historic Customer Debt Ledger">
          <Alert message="Displays active debtor tracking matrices matching outstanding operational balances across this physical retail hub cluster." type="info" showIcon style={{marginBottom: 20}} />
          
          {/* SEARCH COMPONENT FILTER FIELD FOR ADVANCE LEDGER TAB */}
          <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Search debtor profile by name..."
              allowClear
              size="large"
              value={debtLedgerSearchQuery}
              onChange={(e) => setDebtLedgerSearchQuery(e.target.value)}
            />
          </div>

          <Table 
            dataSource={getFilteredDebtLedgerData()} 
            rowKey="id"
            columns={[
              { title: 'Customer Name Account', dataIndex: 'customer_name', key: 'name', render: (t) => <Text strong>{t}</Text> },
              { title: 'Outstanding Debt Profile (ETB)', dataIndex: 'total_balance', key: 'balance', render: (v) => <Text type={v > 0 ? "danger" : "success"} code>{Number(v).toFixed(2)} ETB</Text> },
              { title: 'Last Audit Update Timestamp', dataIndex: 'last_updated', key: 'updated', render: (d) => dayjs(d).format('YYYY-MM-DD HH:mm') }
            ]}
          />
        </Card>
      )}

      {activeSubView === 'credits' && (
        <Card title="Advance Monitor: Credit Sales & Recovery Reports Tracking">
          <Alert message="Monthly aggregated data logs showing structural asset distribution tracking histories." type="success" showIcon style={{marginBottom: 20}} />
          <Empty description="No historic monthly logs detected for the current active quarter." />
        </Card>
      )}

      {activeSubView === 'worksheet' && (
        <Card bordered={false} style={{ borderRadius: '15px', boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}>
          {/* MASTER METRICS HEADER CONTROLLER PANEL */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '10px' }}>
            <Title level={2} style={{ color: '#714B67', margin: 0 }}><AuditOutlined /> Daily Branch Settlement</Title>
            
            <Space size="middle" style={{ flexWrap: 'wrap' }}>
              <div style={{ 
                background: '#fcfcfc', 
                border: '1px solid #e8e8e8',
                padding: '8px 18px', 
                borderRadius: '8px', 
                textAlign: 'right'
              }}>
                <Text style={{ color: '#888', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>Gross Sales Volume</Text>
                <Text style={{ color: '#444', fontSize: '16px', fontWeight: 'bold' }}>{calculateTotalSalesLive().toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB</Text>
              </div>

              <div style={{ 
                background: isNetNegative ? '#fff1f0' : '#f6ffed', 
                border: isNetNegative ? '1px solid #ffa39e' : '1px solid #b7eb8f',
                padding: '10px 24px', 
                borderRadius: '10px', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                textAlign: 'right',
                transition: 'all 0.3s ease'
              }}>
                <Text style={{ color: isNetNegative ? '#cf1322' : '#389e0d', fontSize: '12px', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Unallocated Cash Variance (Live)
                </Text>
                <Text style={{ color: isNetNegative ? '#cf1322' : '#389e0d', fontSize: '22px', fontWeight: 'bold' }}>
                  {netCashValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
                </Text>
              </div>
            </Space>
          </div>
          <Divider />
          
          {/* CONTROL STAGING BOX HEADER */}
          <div style={{ background: '#fcfcfc', border: '1px solid #f0f0f0', padding: '25px', borderRadius: '12px', marginBottom: 35 }}>
              <Row gutter={24} align="bottom">
                  <Col span={9}>
                      <Text strong style={{ fontSize: '13px', color: '#888' }}><EnvironmentOutlined /> Branch</Text>
                      {isAdmin ? (
                          <Select 
                            value={selectedBranch} 
                            style={{ width: '100%' }} 
                            size="large" 
                            placeholder="Select Target Location"
                            onChange={(val) => setSelectedBranch(val)}
                          >
                            {Array.isArray(branches) && branches.map(b => (
                              <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                            ))}
                          </Select>
                      ) : (
                          <div style={{ padding: '10px 15px', background: '#fff', border: '1px solid #d9d9d9', borderRadius: '8px', fontWeight: 'bold', color: '#714B67' }}>
                              <SafetyCertificateOutlined style={{ marginRight: 8 }} />
                              {(user as any)?.branch_name || 'Assigned Branch'}
                          </div>
                      )}
                  </Col>
                  <Col span={7}>
                      <Text strong style={{ fontSize: '13px', color: '#888' }}>Date</Text>
                      <DatePicker value={selectedDate} size="large" onChange={(d) => d && setSelectedDate(d)} style={{ width: '100%' }} />
                  </Col>
                  <Col span={8}>
                      <Button type="primary" icon={<ReloadOutlined />} onClick={loadWorksheet} loading={loading} size="large" block style={{ background: '#714B67', border: 'none', height: '44px' }}>
                          Generate Worksheet
                      </Button>
                  </Col>
              </Row>
          </div>

          <Tabs defaultActiveKey="1" type="card" size="large">
            {/* TAB 1: STOCK BALANCING */}
            <Tabs.TabPane tab={<span><ShoppingOutlined /> 1. Stock Count</span>} key="1">
              <div style={scrollBoxStyle}>
                  <Table 
                    dataSource={worksheetData} 
                    pagination={false} 
                    rowKey="product_id" 
                    bordered 
                    locale={{ emptyText: "Generate the active worksheet statement to list products." }}
                    columns={[
                      { title: 'Product catalog profile', dataIndex: 'product_name', render: (t) => <Text strong style={{ color: '#714B67' }}>{t}</Text> },
                      { title: 'A.M Balance (Open)', dataIndex: 'opening_balance', render: (v) => <Text code>{v} Pcs</Text> },
                      { title: 'P.M Count (Actual Items Left)', render: (_, rec) => (
                          <InputNumber min={0} max={rec.opening_balance} size="large" value={rec.closing_balance} style={{ width: '100%' }} onChange={(v) => {
                              const newData = [...worksheetData];
                              const idx = newData.findIndex(i => i.product_id === rec.product_id);
                              if (idx !== -1) {
                                newData[idx].closing_balance = v === null ? null : Number(v);
                                setWorksheetData(newData);
                              }
                          }} />
                      )},
                      { 
                        title: 'Pieces Sold (Live)', 
                        key: 'sold_live_delta', 
                        align: 'center', 
                        render: (_, rec) => {
                          if (rec.closing_balance === null || rec.closing_balance === undefined) {
                            return <Text type="secondary" italic>Awaiting input</Text>;
                          }
                          const liveDeltaSold = rec.opening_balance - rec.closing_balance;
                          if (liveDeltaSold < 0) {
                            return <Badge count="Overflow" status="error" />;
                          }
                          return (
                            <Space direction="vertical" size={0}>
                              <Text strong style={{ color: liveDeltaSold > 0 ? '#52c41a' : '#999', fontSize: '15px' }}>
                                {liveDeltaSold} Pcs
                              </Text>
                              {liveDeltaSold > 0 && (
                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                  +{(liveDeltaSold * (rec.unit_price || 0)).toFixed(2)} ETB
                                </Text>
                              )}
                            </Space>
                          );
                        }
                      }
                  ]}/>
              </div>
            </Tabs.TabPane>

            {/* TAB 2: OPERATIONAL EXPENSES */}
            <Tabs.TabPane tab={<span><WalletOutlined /> 2. Expenses</span>} key="2">
              <Button icon={<PlusOutlined />} onClick={addExpense} block size="large" style={{ marginBottom: 15 }}>Add Expense Line</Button>
              <div style={scrollBoxStyle}>
                  {expenses.length === 0 ? <Empty description="No expense rows allocated." /> : expenses.map((exp, idx) => (
                      <Row key={idx} gutter={15} style={{ marginBottom: 12 }}>
                          <Col span={14}><Input placeholder="Reason" size="large" value={exp.reason} onChange={e => {
                              const n = [...expenses]; n[idx].reason = e.target.value; setExpenses(n);
                          }}/></Col>
                          <Col span={8}><InputNumber placeholder="Amount" size="large" style={{width:'100%'}} value={exp.amount} onChange={v => {
                              const n = [...expenses]; n[idx].amount = v === null ? 0 : Number(v); setExpenses(n);
                          }}/></Col>
                          <Col span={2}><Button danger icon={<DeleteOutlined />} onClick={() => removeExpense(idx)}/></Col>
                      </Row>
                  ))}
              </div>
            </Tabs.TabPane>

            {/* TAB 3: NEW DEBTOR REGISTRATION */}
            <Tabs.TabPane tab={<span><UserAddOutlined /> 3. New Debts</span>} key="3">
              <Button icon={<PlusOutlined />} onClick={addCreditIssued} block size="large" style={{ marginBottom: 15 }}>Register Debt Invoice</Button>
              <div style={scrollBoxStyle}>
                  {creditsIssued.length === 0 ? <Empty description="No ledger allocations recorded." /> : creditsIssued.map((crd, idx) => (
                      <Row key={idx} gutter={15} style={{ marginBottom: 12 }}>
                          <Col span={14}>
                              <Select
                                  showSearch
                                  placeholder="Select or Create Customer profile"
                                  size="large"
                                  style={{ width: '100%' }}
                                  filterOption={false}
                                  onSearch={fetchCustomerPool}
                                  value={crd.customer_id || undefined}
                                  onChange={(val) => {
                                      const n = [...creditsIssued]; n[idx].customer_id = val; setCreditsIssued(n);
                                  }}
                                  dropdownRender={menu => (
                                    <div>
                                      {menu}
                                      <Divider style={{ margin: '4px 0' }} />
                                      <div style={{ display: 'flex', flexWrap: 'nowrap', padding: 8 }}>
                                        <Input 
                                          style={{ flex: 'auto' }} 
                                          size="middle"
                                          placeholder="Type New Customer Name..."
                                          value={newCustomerName}
                                          onChange={e => setNewCustomerName(e.target.value)}
                                        />
                                        <Button 
                                          type="link" 
                                          icon={<PlusOutlined />} 
                                          loading={creatingCustomer}
                                          onClick={handleInlineCustomerCreate}
                                        >
                                          Create
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                              >
                                  {Array.isArray(availableCustomers) && availableCustomers.map(c => (
                                    <Select.Option key={c.id} value={c.id}>{c.customer_name} (Bal: {Number(c.total_balance).toFixed(0)} ETB)</Select.Option>
                                  ))}
                              </Select>
                          </Col>
                          <Col span={8}><InputNumber placeholder="Amount" size="large" style={{width:'100%'}} value={crd.amount} onChange={v => {
                              const n = [...creditsIssued]; n[idx].amount = v === null ? 0 : Number(v); setCreditsIssued(n);
                          }}/></Col>
                          <Col span={2}><Button danger icon={<DeleteOutlined />} onClick={() => removeCreditIssued(idx)}/></Col>
                      </Row>
                  ))}
              </div>
            </Tabs.TabPane>

            {/* TAB 4: CREDIT RECOVERY REPAYMENTS */}
            <Tabs.TabPane tab={<span><DollarOutlined /> 4. Credit Recovery</span>} key="4">
              <Button icon={<PlusOutlined />} onClick={addCreditPayment} block size="large" style={{ marginBottom: 15, borderColor: '#52c41a', color: '#52c41a' }}>Record Debt Payment</Button>
              <div style={scrollBoxStyle}>
                  {creditPayments.length === 0 ? <Empty description="No collection profiles declared." /> : creditPayments.map((pay, idx) => (
                      <Row key={idx} gutter={15} style={{ marginBottom: 12 }}>
                          <Col span={14}>
                              <Select
                                  showSearch
                                  placeholder="Select profile paying back debt"
                                  size="large"
                                  style={{ width: '100%' }}
                                  filterOption={false}
                                  onSearch={fetchCustomerPool}
                                  value={pay.customer_id || undefined}
                                  onChange={(val) => {
                                      const n = [...creditPayments]; n[idx].customer_id = val; setCreditPayments(n);
                                  }}
                              >
                                  {Array.isArray(availableCustomers) && availableCustomers.map(c => (
                                    <Select.Option key={c.id} value={c.id}>{c.customer_name} (Owes: {Number(c.total_balance).toFixed(0)} ETB)</Select.Option>
                                  ))}
                              </Select>
                          </Col>
                          <Col span={8}><InputNumber placeholder="Amount Paid" size="large" style={{width:'100%'}} value={pay.amount} onChange={v => {
                              const n = [...creditPayments]; n[idx].amount = v === null ? 0 : Number(v); setCreditPayments(n);
                          }}/></Col>
                          <Col span={2}><Button danger icon={<DeleteOutlined />} onClick={() => removeCreditPayment(idx)}/></Col>
                      </Row>
                  ))}
              </div>
            </Tabs.TabPane>

            {/* TAB 5: FINANCIAL OVERALL HANDOVER MANAGEMENT */}
            <Tabs.TabPane tab={<span><BankOutlined /> 5. Final Handover</span>} key="5">
              <div style={scrollBoxStyle}>
                  <Row gutter={[20, 20]}>
                      {/* MULTIPLE WALLET HANDLES INLINE BOX */}
                      {/* MULTIPLE WALLET HANDLES INLINE BOX */}
                    <Col span={24}>
                        <Card title={<Space><MobileOutlined /> Digital (Bank/Telebirr) Balances Statement</Space>} headStyle={{ background: '#f0f5ff' }}>
                            <Button icon={<PlusOutlined />} onClick={addDigital} style={{ marginBottom: 15 }} block>Add Verified Account Balance Entry</Button>
                            {digitalBalances.map((d, idx) => {
                                // Find the master profile to retrieve the base target historical balance reference safely
                                const matchedAccountMaster = availableAccounts.find(acc => acc.id === d.account_id);
                                
                                // Fallback strategy: check for previous session closing balance, otherwise use the initialization seed
                                const yesterdayBaseBalance = matchedAccountMaster 
                                  ? (matchedAccountMaster.last_closing_balance ?? matchedAccountMaster.initial_balance ?? 0)
                                  : 0;

                                // Compute live delta tracking value
                                const liveWalletShiftDelta = d.balance ? (d.balance - yesterdayBaseBalance) : 0;

                                return (
                                    <Row key={idx} gutter={12} style={{ marginBottom: 12 }} align="middle">
                                        <Col span={9}>
                                            <Select 
                                                placeholder="Select Target App Wallet" 
                                                style={{ width: '100%' }} 
                                                size="large" 
                                                value={d.account_id || undefined}
                                                onChange={(val) => { 
                                                    const n = [...digitalBalances]; 
                                                    n[idx].account_id = val; 
                                                    setDigitalBalances(n); 
                                                }}
                                            >
                                                {Array.isArray(availableAccounts) && availableAccounts.map(acc => (
                                                  <Select.Option key={acc.id} value={acc.id}>{acc.name}</Select.Option>
                                                ))}
                                            </Select>
                                        </Col>
                                        <Col span={8}>
                                            <InputNumber 
                                              placeholder="Current Ending App Balance" 
                                              size="large" 
                                              style={{ width: '100%' }} 
                                              value={d.balance || undefined} 
                                              onChange={v => { 
                                                  const n = [...digitalBalances]; 
                                                  n[idx].balance = v === null ? 0 : Number(v); 
                                                  setDigitalBalances(n); 
                                              }}
                                            />
                                        </Col>
                                        
                                        {/* --- LIVE REVENUE SHIFT VISUAL FIELD --- */}
                                        <Col span={5} style={{ textAlign: 'center' }}>
                                            {d.account_id && d.balance ? (
                                              <Space direction="vertical" size={0}>
                                                <Text type="secondary" style={{ fontSize: '11px' }}>Yesterday Base: {yesterdayBaseBalance} ETB</Text>
                                                <Text strong style={{ 
                                                  color: liveWalletShiftDelta >= 0 ? '#52c41a' : '#f5222d',
                                                  fontSize: '14px' 
                                                }}>
                                                  {liveWalletShiftDelta >= 0 ? '+' : ''}{liveWalletShiftDelta.toFixed(2)} ETB
                                                </Text>
                                              </Space>
                                            ) : (
                                              <Text type="secondary" italic style={{ fontSize: '12px' }}>Awaiting input</Text>
                                            )}
                                        </Col>
                                        
                                        <Col span={2}>
                                            <Button danger icon={<DeleteOutlined />} size="large" onClick={() => setDigitalBalances(digitalBalances.filter((_, i) => i !== idx))}/>
                                        </Col>
                                    </Row>
                                );
                            })}
                        </Card>
                    </Col>

                      {/* PHYSICAL CASH REGISTERS DRAWER BLOCK WITH LIVE RECONCILIATION LISTENERS */}
                      <Col span={24}>
                          <Card title={<Space><WalletOutlined /> Liquid Physical Cash Registers Drawer</Space>} headStyle={{ background: '#f6ffed' }}>
                              <Row gutter={20}>
                                  <Col span={12}>
                                      <Text strong>Total Clean Handover Cash for Admin/Courier:</Text>
                                      <InputNumber 
                                        style={{width:'100%', marginTop: 8}} 
                                        size="large" 
                                        value={cashToAdmin || undefined} 
                                        onChange={v => setCashToAdmin(v === null ? 0 : Number(v))}
                                      />
                                  </Col>
                                  <Col span={12}>
                                      <Text strong>Float Retained in Register Drawer for Change:</Text>
                                      <InputNumber 
                                        style={{width:'100%', marginTop: 8}} 
                                        size="large" 
                                        value={cashForChange || undefined} 
                                        onChange={v => setCashForChange(v === null ? 0 : Number(v))}
                                      />
                                  </Col>
                              </Row>
                          </Card>
                      </Col>

                      {/* SLIP DEPOSIT REGISTERS */}
                      <Col span={24}>
                          <Card title={<Space><PlusOutlined /> Manual Physical Bank Deposits (Slips / Receipts)</Space>} headStyle={{ background: '#fff7e6' }}>
                              <Button icon={<PlusOutlined />} onClick={addDeposit} style={{ marginBottom: 15 }} block>Attach Manual Bank Deposit Slip Statement</Button>
                              {manualDeposits.map((m, idx) => (
                                  <Row key={idx} gutter={10} style={{ marginBottom: 10 }}>
                                      <Col span={6}><InputNumber placeholder="Slip Receipt Amount" size="large" style={{width:'100%'}} value={m.amount} onChange={v => { const n = [...manualDeposits]; n[idx].amount = v === null ? 0 : Number(v); setManualDeposits(n); }}/></Col>
                                      <Col span={8}><Input placeholder="Bank Name (e.g. CBE, Awash)" size="large" value={m.bank} onChange={e => { const n = [...manualDeposits]; n[idx].bank = e.target.value; setManualDeposits(n); }}/></Col>
                                      <Col span={8}><Input placeholder="Beneficiary Account Holder Name" size="large" value={m.account_name} onChange={e => { const n = [...manualDeposits]; n[idx].account_name = e.target.value; setManualDeposits(n); }}/></Col>
                                      <Col span={2}><Button danger icon={<DeleteOutlined />} size="large" onClick={() => setManualDeposits(manualDeposits.filter((_, i) => i !== idx))}/></Col>
                                  </Row>
                              ))}
                          </Card>
                      </Col>
                  </Row>
                                
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30, marginBottom: 10 }}>
                    <Button 
                      type="primary" 
                      size="large" 
                      icon={<CheckCircleOutlined />} 
                      style={{ 
                        height: '48px', 
                        padding: '0 32px', 
                        background: '#714B67', 
                        border: 'none', 
                        fontSize: '16px', 
                        borderRadius: '8px', 
                        fontWeight: 'bold',
                        boxShadow: '0 4px 10px rgba(113, 75, 103, 0.2)' 
                      }} 
                      onClick={submitAll} 
                      loading={loading}
                    >
                      FINALIZE SETTLEMENT & SYNC ALL DATA
                    </Button>
                  </div>
              
              </div>
            </Tabs.TabPane>
          </Tabs>
        </Card>
      )}
    </div>
  );
};

export default DailySessionWorksheet;