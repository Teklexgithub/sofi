import React, { useEffect, useState } from 'react';
import { Table, Typography, Card, Tag, Space, Button, Input, message } from 'antd';
import {
  DatabaseOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  BlockOutlined,
  HistoryOutlined,
  EditOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';



const { Title, Text } = Typography;

const StoreStock: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation('inventory');

  const fetchStoreStock = async () => {
    setLoading(true);
    try {
      const res = await inventoryService.getStoreStock();
      setData(res.data);
    } catch (e) {
      message.error(t('storeStock.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchStoreStock(); 
  }, []);

  // --- NESTED TABLE: Shows bulk products (Packs) inside that Branch Store ---
  const expandedRowRender = (record: any) => {
    const subColumns = [
      {
        title: t('storeStock.columns.productName'),
        dataIndex: 'product_name',
        key: 'name',
        render: (text: string) => <Text strong>{text}</Text>
      },
      {
        title: t('common:fields.category'),
        dataIndex: 'category_display',
        key: 'category',
        render: (cat: string) => <Tag>{cat}</Tag>
      },
      {
        title: t('storeStock.columns.currentInventory'),
        dataIndex: 'quantity_in_packs',
        key: 'qty',
        render: (q: number) => (
          <Tag color={q > 10 ? 'blue' : 'orange'} style={{ fontWeight: 'bold' }}>
            {t('storeStock.columns.fullPacks', { count: q })}
          </Tag>
        )
      },
      {
        title: t('storeStock.columns.lastActivity'),
        dataIndex: 'last_updated',
        key: 'updated',
        render: (date: string) => dayjs(date).format('MMM DD, HH:mm')
      },

      {
        title: t('common:fields.action'),
        key: 'adjust',
        render: (record: any) => (
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation(); // Prevent row collapse
              navigate(`/inventory/stock/store/${record.id}`);
            }}
          >
            {t('storeStock.viewAndAdjust')}
          </Button>
        )
      }
    ];

    // Filter items belonging to this specific branch
    const branchItems = data.filter(item => item.branch_name === record.branch_name);

    return (
      <Table 
        columns={subColumns} 
        dataSource={branchItems} 
        pagination={false} 
        size="small" 
        rowKey="id"
        style={{ margin: '10px 0', border: '1px solid #e8e8e8', borderRadius: '8px' }}
      />
    );
  };

  // --- MAIN TABLE COLUMNS: The Branch Summary ---
  const mainColumns = [
    {
      title: t('storeStock.columns.warehouseLocation'),
      dataIndex: 'branch_name',
      key: 'branch',
      render: (name: string) => (
        <Space>
          <EnvironmentOutlined style={{ color: '#714B67' }} />
          <Text strong style={{ fontSize: '16px' }}>{t('storeStock.columns.warehouseSuffix', { name })}</Text>
        </Space>
      )
    },
    {
      title: t('storeStock.columns.totalCategories'),
      dataIndex: 'item_count',
      key: 'count',
      render: (count: number) => <Tag color="purple">{t('storeStock.columns.productTypes', { count })}</Tag>
    },
    {
      title: t('common:fields.action'),
      key: 'action',
      render: () => <Button type="link" icon={<EyeOutlined />} style={{ color: '#714B67' }}>{t('storeStock.manageItems')}</Button>
    }
  ];

  // Grouping logic: Create one row per Branch
  const groupedData = Object.values(data.reduce((acc: any, item: any) => {
    const groupKey = item.branch_name;
    
    if (!acc[groupKey]) {
      acc[groupKey] = {
        key: groupKey,
        branch_name: item.branch_name,
        item_count: 0
      };
    }
    acc[groupKey].item_count += 1;
    return acc;
  }, {}));

  const filteredData = (groupedData as any[]).filter(row =>
    row.branch_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            <DatabaseOutlined style={{ color: '#714B67' }} /> {t('storeStock.title')}
          </Title>
          <Text type="secondary">
            {t('storeStock.subtitle')}
          </Text>
        </div>
        <Space>
          <Input
            placeholder={t('storeStock.searchPlaceholder')}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: '220px' }}
          />
          <Button icon={<HistoryOutlined />} onClick={() => fetchStoreStock()}>{t('storeStock.refreshLevels')}</Button>
        </Space>
      </div>

      <Card
        styles={{ body: { padding: 0 } }}
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          background: isDark ? '#1f1f1f' : '#fff'
        }}
      >
        <Table
          columns={mainColumns}
          expandable={{
            expandedRowRender,
            expandRowByClick: true,
          }}
          dataSource={filteredData}
          loading={loading}
          rowKey="key"
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <div style={{ marginTop: 20, display: 'flex', gap: '10px', alignItems: 'center' }}>
        <BlockOutlined style={{ color: '#888' }} />
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {t('storeStock.footerPrefix')} <b>{t('storeStock.footerBold')}</b> {t('storeStock.footerSuffix')}
        </Text>
      </div>
    </div>
  );
};

export default StoreStock;