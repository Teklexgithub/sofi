import React, { useEffect, useState } from 'react';
import { Table, Typography, Card, Tag, Space, Button, message } from 'antd';
import { 
  DatabaseOutlined, 
  EnvironmentOutlined,
  EyeOutlined,
  BlockOutlined,
  HistoryOutlined,
  EditOutlined
} from '@ant-design/icons';
import { inventoryService } from '../../services/inventoryService';
import { useTheme } from '../../contexts/ThemeContext';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';



const { Title, Text } = Typography;

const StoreStock: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const fetchStoreStock = async () => {
    setLoading(true);
    try {
      const res = await inventoryService.getStoreStock();
      setData(res.data);
    } catch (e) {
      message.error("Failed to load store inventory");
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
        title: 'Product Name', 
        dataIndex: 'product_name', 
        key: 'name',
        render: (text: string) => <Text strong>{text}</Text>
      },
      { 
        title: 'Category', 
        dataIndex: 'category_display', 
        key: 'category',
        render: (cat: string) => <Tag>{cat}</Tag>
      },
      { 
        title: 'Current Inventory', 
        dataIndex: 'quantity_in_packs', 
        key: 'qty',
        render: (q: number) => (
          <Tag color={q > 10 ? 'blue' : 'orange'} style={{ fontWeight: 'bold' }}>
            {q} Full Packs
          </Tag>
        ) 
      },
      {
        title: 'Last Activity',
        dataIndex: 'last_updated',
        key: 'updated',
        render: (date: string) => dayjs(date).format('MMM DD, HH:mm')
      },

      {
        title: 'Action',
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
            View & Adjust
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
      title: 'Warehouse Location',
      dataIndex: 'branch_name',
      key: 'branch',
      render: (name: string) => (
        <Space>
          <EnvironmentOutlined style={{ color: '#714B67' }} />
          <Text strong style={{ fontSize: '16px' }}>{name} Warehouse</Text>
        </Space>
      )
    },
    {
      title: 'Total Categories',
      dataIndex: 'item_count',
      key: 'count',
      render: (count: number) => <Tag color="purple">{count} Product Types</Tag>
    },
    {
      title: 'Action',
      key: 'action',
      render: () => <Button type="link" icon={<EyeOutlined />} style={{ color: '#714B67' }}>Manage Store Items</Button>
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

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            <DatabaseOutlined style={{ color: '#714B67' }} /> Store Inventory (Bulk)
          </Title>
          <Text type="secondary">
            Warehouse stock levels tracked in full packs and crates.
          </Text>
        </div>
        <Button icon={<HistoryOutlined />} onClick={() => fetchStoreStock()}>Refresh Levels</Button>
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
          dataSource={groupedData}
          loading={loading}
          rowKey="key"
          pagination={false}
        />
      </Card>

      <div style={{ marginTop: 20, display: 'flex', gap: '10px', alignItems: 'center' }}>
        <BlockOutlined style={{ color: '#888' }} />
        <Text type="secondary" style={{ fontSize: '12px' }}>
          Items in the Store are stored as bulk packaging and must be <b>Internal Transferred</b> to appear in Shop Stock.
        </Text>
      </div>
    </div>
  );
};

export default StoreStock;