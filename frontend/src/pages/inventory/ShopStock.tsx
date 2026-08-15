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
import { inventoryService } from '../../services/inventoryService';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';


const { Title, Text } = Typography;

const ShopStock: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const fetchStock = async () => {
    setLoading(true);
    try {
      const res = await inventoryService.getShopStock();
      setData(res.data);
    } catch (e) {
      message.error("Failed to load inventory groups");
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
        title: 'Product Name', 
        dataIndex: 'product_name', 
        key: 'name',
        render: (text: string) => <Text strong>{text}</Text>
      },
      { 
        title: 'Source', 
        dataIndex: 'destination', 
        key: 'source',
        render: (dest: string) => (
          <Tag 
            icon={dest === 'SHOP' ? <ThunderboltOutlined /> : <DatabaseOutlined />} 
            color={dest === 'SHOP' ? 'cyan' : 'blue'}
          >
            {dest === 'SHOP' ? 'Direct Delivery' : 'Store Refill'}
          </Tag>
        ) 
      },
      { 
        title: 'Current Quantity', 
        dataIndex: 'quantity_in_pieces', 
        key: 'qty',
        render: (q: number) => <Tag color={q > 0 ? 'green' : 'red'}>{q} Pieces</Tag> 
      },

      {
        title: 'Action',
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
            View & Adjust
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
      title: 'Arrival Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => (
        <Space><CalendarOutlined style={{ color: '#714B67' }} /> <Text strong>{date}</Text></Space>
      )
    },
    {
      title: 'Branch Name',
      dataIndex: 'branch_name',
      key: 'branch',
      render: (name: string) => (
        <Tag icon={<EnvironmentOutlined />} color="purple" style={{ padding: '2px 10px' }}>{name}</Tag>
      )
    },
    {
      title: 'Product Count',
      dataIndex: 'item_count',
      key: 'count',
      render: (count: number) => <Text type="secondary">{count} Products in this batch</Text>
    },
    {
      title: 'Details',
      key: 'action',
      render: () => <Button type="link" icon={<EyeOutlined />} style={{ color: '#714B67' }}>Expand to View</Button>
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
            <ShopOutlined style={{ color: '#714B67' }} /> Daily Shop Inventory
          </Title>
          <Text type="secondary">
            Everything currently in the shop floor, organized by arrival date and location.
          </Text>
        </div>
        <Input
          placeholder="Search by branch..."
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