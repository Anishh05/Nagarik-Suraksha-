import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Avatar,
  Divider,
  Badge,
  Chip
} from '@mui/material';
import {
  AccountCircle,
  Logout,
  Dashboard,
  AdminPanelSettings,
  Warning,
  Settings,
  Notifications,
  Security
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';

/**
 * Navigation Bar Component
 * 
 * Provides navigation and user menu for authenticated users
 */
const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNavigation = (path) => {
    navigate(path);
    handleClose();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
    handleClose();
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Emergency Dashboard';
      case '/admin':
        return 'Police Admin Panel';
      default:
        return 'Emergency Response System';
    }
  };

  const isCurrentPath = (path) => location.pathname === path;

  return (
    <AppBar position="static" elevation={2}>
      <Toolbar>
        {/* Logo/Title */}
        <Warning sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {getPageTitle()}
        </Typography>

        {/* Connection Status */}
        <Chip
          label={isConnected ? 'Online' : 'Offline'}
          color={isConnected ? 'success' : 'error'}
          size="small"
          sx={{ mr: 2, color: 'white' }}
        />

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
          {user?.role !== 'admin' && (
            <Button
              color="inherit"
              startIcon={<Dashboard />}
              onClick={() => navigate('/dashboard')}
              variant={isCurrentPath('/dashboard') ? 'outlined' : 'text'}
              sx={{ 
                borderColor: isCurrentPath('/dashboard') ? 'white' : 'transparent',
                color: 'white'
              }}
            >
              Dashboard
            </Button>
          )}
          
          {user?.role === 'admin' && (
            <>
              <Button
                color="inherit"
                startIcon={<Dashboard />}
                onClick={() => navigate('/dashboard')}
                variant={isCurrentPath('/dashboard') ? 'outlined' : 'text'}
                sx={{ 
                  borderColor: isCurrentPath('/dashboard') ? 'white' : 'transparent',
                  color: 'white'
                }}
              >
                Dashboard
              </Button>
              <Button
                color="inherit"
                startIcon={<AdminPanelSettings />}
                onClick={() => navigate('/admin')}
                variant={isCurrentPath('/admin') ? 'outlined' : 'text'}
                sx={{ 
                  borderColor: isCurrentPath('/admin') ? 'white' : 'transparent',
                  color: 'white'
                }}
              >
                Admin
              </Button>
            </>
          )}
        </Box>

        {/* User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* User Info */}
          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: 'white' }}>
              {user?.name}
            </Typography>
            {user?.role === 'admin' && (
              <Chip
                label="Admin"
                size="small"
                color="secondary"
                sx={{ height: 20, fontSize: '0.75rem' }}
              />
            )}
          </Box>

          {/* Profile Menu */}
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <Badge
              color="success"
              variant="dot"
              invisible={!user?.isVerified}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
            </Badge>
          </IconButton>

          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={open}
            onClose={handleClose}
          >
            {/* User Info in Menu */}
            <MenuItem disabled>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1 }}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main', mb: 1 }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {user?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.phoneNumber}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  {user?.isVerified && (
                    <Chip
                      label="Verified"
                      size="small"
                      color="success"
                      icon={<Security />}
                    />
                  )}
                  {user?.role === 'admin' && (
                    <Chip
                      label="Admin"
                      size="small"
                      color="primary"
                      icon={<AdminPanelSettings />}
                    />
                  )}
                </Box>
              </Box>
            </MenuItem>

            <Divider />

            {/* Navigation Items */}
            <MenuItem onClick={() => handleNavigation('/dashboard')}>
              <Dashboard sx={{ mr: 2 }} />
              Dashboard
            </MenuItem>

            {user?.role === 'admin' && (
              <MenuItem onClick={() => handleNavigation('/admin')}>
                <AdminPanelSettings sx={{ mr: 2 }} />
                Admin Panel
              </MenuItem>
            )}

            <Divider />

            {/* Settings */}
            <MenuItem onClick={handleClose}>
              <Settings sx={{ mr: 2 }} />
              Settings
            </MenuItem>

            <MenuItem onClick={handleClose}>
              <Notifications sx={{ mr: 2 }} />
              Notifications
            </MenuItem>

            <Divider />

            {/* Logout */}
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <Logout sx={{ mr: 2 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;