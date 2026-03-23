import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, ConfigProvider, theme, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { login } from '../services/authService'; // Ensure this path is correct

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(false); // Add loading state for the button

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Call the login service with form values
      await login(values.email, values.password);
      
      message.success('Login successful! Redirecting...');
      
      // Delay redirect slightly so user can see success message
      setTimeout(() => {
        window.location.href = '/dashboard'; 
      }, 1000);
    } catch (error: any) {
      console.error('Login Error:', error);
      message.error(error.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { 
            colorPrimary: '#c5a059',
            colorBgContainer: isDark ? 'rgba(30, 30, 30, 0.7)' : 'rgba(255, 255, 255, 0.8)',
        },
      }}
    >
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'background 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: isDark ? '#0f0f0f' : '#e0e0e0',
        fontFamily: 'sans-serif'
      }}>
        
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '100px',
            width: '100%',
            maxWidth: '1000px',
            padding: '0 50px'
        }}>

          {/* LEFT SIDE: DESIGNER LAMP */}
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setIsDark(!isDark)}>
            <div style={{
              width: '180px',
              height: '110px',
              background: isDark ? '#fff' : '#bbb',
              borderRadius: '100px 100px 10px 10px',
              boxShadow: isDark ? '0 0 80px 20px rgba(255, 255, 255, 0.4)' : 'none',
              transition: 'all 0.5s ease',
              position: 'relative',
              zIndex: 2
            }} />
            <div style={{
              width: '8px',
              height: '150px',
              background: isDark ? '#444' : '#888',
              margin: '-5px auto 0',
              borderRadius: '4px'
            }} />
            <div style={{
              width: '100px',
              height: '8px',
              background: isDark ? '#444' : '#888',
              margin: '0 auto',
              borderRadius: '10px'
            }} />
            <div style={{
                position: 'absolute',
                right: '40px',
                top: '100px',
                width: '2px',
                height: '60px',
                background: isDark ? '#aaa' : '#666'
            }}>
                <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#c5a059',
                    margin: '58px 0 0 -5px'
                }} />
            </div>
          </div>

          {/* RIGHT SIDE: THE LOGIN CARD */}
          <Card style={{
            width: '380px',
            borderRadius: '30px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: isDark ? 'rgba(40, 40, 40, 0.6)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(25px)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            padding: '10px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <Title level={3} style={{ margin: 0 }}>Welcome</Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>Sign in to your account</Text>
            </div>

            <Form 
              layout="vertical" 
              size="large"
              onFinish={onFinish} // Connect the submit handler
            >
              <Form.Item 
                label={<Text style={{fontSize: '12px', opacity: 0.7}}>Email</Text>} 
                name="email"
                rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}
              >
                <Input 
                    prefix={<UserOutlined style={{ opacity: 0.5 }} />}
                    placeholder="you@example.com" 
                    style={{ borderRadius: '12px', background: 'rgba(0,0,0,0.05)' }} 
                />
              </Form.Item>

              <Form.Item 
                label={<Text style={{fontSize: '12px', opacity: 0.7}}>Password</Text>} 
                name="password"
                rules={[{ required: true, message: 'Please enter your password' }]}
              >
                <Input.Password 
                    prefix={<LockOutlined style={{ opacity: 0.5 }} />}
                    placeholder="••••••••" 
                    style={{ borderRadius: '12px', background: 'rgba(0,0,0,0.05)' }} 
                />
              </Form.Item>

              <Button 
                type="primary" 
                block 
                htmlType="submit" // Trigger onFinish
                loading={loading} // Show loading spinner
                style={{ 
                  height: '50px', 
                  borderRadius: '15px', 
                  marginTop: '10px',
                  background: 'linear-gradient(90deg, #c5a059 0%, #ecd299 100%)',
                  border: 'none',
                  color: '#000',
                  fontWeight: 'bold'
              }}>
                Sign In
              </Button>
            </Form>
          </Card>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default Login;