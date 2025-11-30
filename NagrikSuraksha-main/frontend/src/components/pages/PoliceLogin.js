import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  LocalPolice,
  Visibility,
  VisibilityOff,
  Security,
  Badge
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminService } from '../../services/adminService';

const PoliceLogin = () => {
  const navigate = useNavigate();
  
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await adminService.policeLogin(credentials.username, credentials.password);
      
      if (response.success) {
        toast.success(`Welcome, ${response.admin.name}!`);
        navigate('/police-dashboard');
      }
    } catch (error) {
      console.error('Police login error:', error);
      setError(error.message || 'Login failed. Please check your credentials.');
      toast.error('Login failed!');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Card elevation={8} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              mb: 2 
            }}>
              <Badge sx={{ 
                fontSize: 48, 
                color: 'primary.main',
                mr: 1 
              }} />
              <LocalPolice sx={{ 
                fontSize: 48, 
                color: 'primary.main' 
              }} />
            </Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Police Portal
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Secure access for law enforcement officers
            </Typography>
          </Box>

          {/* Demo Credentials Info */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Demo Credentials:</strong>
            </Typography>
            <Typography variant="body2">
              <strong>Admin:</strong> police.admin / police123<br/>
              <strong>Officer:</strong> officer.john / officer123
            </Typography>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              name="username"
              label="Username"
              placeholder="Enter your police username"
              value={credentials.username}
              onChange={handleInputChange}
              disabled={loading}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Security color="action" />
                  </InputAdornment>
                )
              }}
            />

            <TextField
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={credentials.password}
              onChange={handleInputChange}
              disabled={loading}
              sx={{ mb: 3 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleTogglePassword}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !credentials.username || !credentials.password}
              startIcon={loading ? <CircularProgress size={20} /> : <LocalPolice />}
              sx={{ 
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Signing In...' : 'Sign In to Police Portal'}
            </Button>
          </Box>

          {/* Footer */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Authorized personnel only. All access is monitored and logged.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Back to User Portal */}
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/login')}
          disabled={loading}
        >
          Back to Citizen Portal
        </Button>
      </Box>
    </Container>
  );
};

export default PoliceLogin;