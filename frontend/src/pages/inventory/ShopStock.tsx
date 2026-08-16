import React, { useEffect, useState } from 'react';
import { Table, Typography, Card, Tag, Space, Button, Input, message } from 'antd';
import {
  CalendarOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  ShopOutlined, // Fixed missing import
  ThunderboltOutlined,
  DatabaseOutlined,
  EditOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventoryService';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';


const { Title, Text } = Typography;

const ShopStock: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation('inventory');

  const fetchStock = async () => {
    setLoading(true);
    try {
      const res = await inventoryService.getShopStock();
      setData(res.data);
    } catch (e) {
      message.error(t('shopStock.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchStock(); 
  }, []);

  // --- NESTED TABLE: Shows products delivered for a specific Branch/Date combo ---
  const expandedRowRender = (record: any) => {
    const subColumns = [
      {
        title: t('shopStock.columns.productName'),
        dataIndex: 'product_name',
        key: 'name',
        render: (text: string) => <Text strong>{text}</Text>
      },
      {
        title: t('shopStock.columns.source'),
        dataIndex: 'destination',
        key: 'source',
        render: (dest: string) => (
          <Tag
            icon={dest === 'SHOP' ? <ThunderboltOutlined /> : <DatabaseOutlined />}
            color={dest === 'SHOP' ? 'cyan' : 'blue'}
          >
            {dest === 'SHOP' ? t('shopStock.directDelivery') : t('shopStock.storeRefill')}
          </Tag>
        )
      },
      {
        title: t('shopStock.columns.currentQuantity'),
        dataIndex: 'quantity_in_pieces',
        key: 'qty',
        render: (q: number) => <Tag color={q > 0 ? 'green' : 'red'}>{t('shopStock.columns.pieces', { count: q })}</Tag>
      },

      {
        title: t('common:fields.action'),
        key: 'adjust',
        render: (record: any) => (
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/inventory/stock/shop/${record.id}`);
            }}
          >
            {t('shopStock.viewAndAdjust')}
          </Button>
        )
      }
    ];

    // Filter the flat data to find items matching this row's Branch and Date
    const branchItems = data.filter(item => 
      item.branch_name === record.branch_name && 
      dayjs(item.last_updated).format('YYYY-MM-DD') === record.date
    );

    return (
      <Table 
        columns={subColumns} 
        dataSource={branchItems} 
        pagination={false} 
        size="small" 
        rowKey="id"
        style={{ margin: '10px 0', border: '1px solid #f0f0f0', borderRadius: '8px' }}
      />
    );
  };

  // --- MAIN TABLE COLUMNS: The "Date + Branch" Summary ---
  const mainColumns = [
    {
      title: t('shopStock.columns.arrivalDate'),
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => (
        <Space><CalendarOutlined style={{ color: '#714B67' }} /> <Text strong>{date}</Text></Space>
      )
    },
    {
      title: t('common:fields.branch'),
      dataIndex: 'branch_name',
      key: 'branch',
      render: (name: string) => (
        <Tag icon={<EnvironmentOutlined />} color="purple" style={{ padding: '2px 10px' }}>{name}</Tag>
      )
    },
    {
      title: t('shopStock.columns.productCount'),
      dataIndex: 'item_count',
      key: 'count',
      render: (count: number) => <Text type="secondary">{t('shopStock.columns.productsInBatch', { count })}</Text>
    },
    {
      title: t('shopStock.columns.details'),
      key: 'action',
      render: () => <Button type="link" icon={<EyeOutlined />} style={{ color: '#714B67' }}>{t('shopStock.expandToView')}</Button>
    }
  ];

  // Logic to transform flat product data into Grouped "Date + Branch" rows
  const groupedData = Object.values(data.reduce((acc: any, item: any) => {
    // We group by day only (ignoring time) and branch
    const dateStr = dayjs(item.last_updated).format('YYYY-MM-DD');
    const groupKey = `${dateStr}-${item.branch_name}`;
    
    if (!acc[groupKey]) {
      acc[groupKey] = {
        key: groupKey,
        date: dateStr,
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            <ShopOutlined style={{ color: '#714B67' }} /> {t('shopStock.title')}
          </Title>
          <Text type="secondary">
            {t('shopStock.subtitle')}
          </Text>
        </div>
        <Input
          placeholder={t('shopStock.searchPlaceholder')}
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          allowClear
          style={{ width: '260px' }}
        />
      </div>

      <Card
        styles={{ body: { padding: 0 } }}
        style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
      >
        <Table
          columns={mainColumns}
          expandable={{
            expandedRowRender,
            expandRowByClick: true, // Easier for novices: just click the row!
          }}
          dataSource={filteredData}
          loading={loading}
          rowKey="key"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
};

export default ShopStock;