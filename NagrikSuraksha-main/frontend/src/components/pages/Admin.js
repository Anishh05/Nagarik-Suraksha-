import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Box,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  FormControl,
  InputLabel,
  Select,
  InputAdornment
} from '@mui/material';
import {
  AdminPanelSettings,
  Person,
  Warning,
  LocationOn,
  MoreVert,
  Refresh,
  Search,
  Delete,
  Edit,
  Block,
  CheckCircle,
  People,
  Security,
  Analytics,
  Notifications,
  Phone,
  Schedule,
  Map,
  FilterList
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

// Import custom hooks and services
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { adminService } from '../../services/adminService';

const Admin = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  // Check police authentication
  const [isPoliceAuthenticated, setIsPoliceAuthenticated] = useState(false);
  const [policeData, setPoliceData] = useState(null);

  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const [locationUpdates, setLocationUpdates] = useState([]);
  const [serverStats, setServerStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Dialogs
  const [userDialog, setUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);

  // Real-time data
  const [realtimeAlerts, setRealtimeAlerts] = useState([]);
  const [realtimeLocations, setRealtimeLocations] = useState([]);

  // Load initial data
  useEffect(() => {
    checkPoliceAuth();
  }, []);

  // Check police authentication
  const checkPoliceAuth = async () => {
    try {
      if (adminService.isPoliceAuthenticated()) {
        const adminData = adminService.getAdminData();
        setPoliceData(adminData);
        setIsPoliceAuthenticated(true);
        
        // Load police-specific data
        loadUsers();
        loadEmergencyAlerts();
        loadLocationUpdates();
        loadServerStats();
      } else {
        console.log('Police authentication required for Admin panel');
        setIsPoliceAuthenticated(false);
      }
    } catch (error) {
      console.error('Police auth check failed:', error);
      setIsPoliceAuthenticated(false);
    }
  };

  // Load initial data
  useEffect(() => {
    loadUsers();
    loadEmergencyAlerts();
    loadLocationUpdates();
    loadServerStats();
  }, []);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('sos_received', (data) => {
        console.log('Admin: SOS received:', data);
        setRealtimeAlerts(prev => [data, ...prev.slice(0, 9)]);
        setEmergencyAlerts(prev => [data, ...prev]);
        toast.error(`🚨 NEW SOS: ${data.message}`, {
          position: 'top-center',
          autoClose: 15000
        });
      });

      socket.on('location_received', (data) => {
        console.log('Admin: Location received:', data);
        setRealtimeLocations(prev => [data, ...prev.slice(0, 9)]);
        setLocationUpdates(prev => [data, ...prev]);
      });

      socket.on('status', (data) => {
        setServerStats(prev => ({
          ...prev,
          connectedClients: data.connectedClients,
          serverUptime: data.serverUptime
        }));
      });

      return () => {
        socket.off('sos_received');
        socket.off('location_received');
        socket.off('status');
      };
    }
  }, [socket]);

  // Request server status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (socket && isConnected) {
        socket.emit('get_status');
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [socket, isConnected]);

  // Load users
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers();
      if (response.success) {
        setUsers(response.users || []);
      }
    } catch (error) {
      console.error('Load users error:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Load emergency alerts
  const loadEmergencyAlerts = async () => {
    try {
      console.log('Loading emergency alerts...');
      
      // Check if police is authenticated
      if (!adminService.isPoliceAuthenticated()) {
        console.error('Police authentication required to load emergency alerts');
        setEmergencyAlerts([]);
        return;
      }

      const response = await adminService.getEmergencySOS();
      console.log('Emergency SOS API response:', response);
      
      if (response.success) {
        // Convert the emergency SOS data to match the expected format
        const formattedAlerts = response.emergencySOS.map(sos => ({
          id: sos.username, // Use username as unique ID
          clientId: sos.username,
          userName: sos.userName,
          userPhone: sos.userPhone,
          message: sos.message,
          urgency: sos.urgency || 'critical',
          timestamp: sos.createdAt,
          location: { 
            latitude: sos.latitude, 
            longitude: sos.longitude,
            address: sos.address 
          },
          status: sos.status,
          accuracy: sos.accuracy,
          updatedAt: sos.updatedAt
        }));
        
        console.log('Formatted emergency alerts:', formattedAlerts);
        setEmergencyAlerts(formattedAlerts);
      } else {
        console.error('Failed to load emergency SOS:', response.message);
        setEmergencyAlerts([]);
      }
    } catch (error) {
      console.error('Load emergency alerts error:', error);
      // Show user-friendly error
      toast.error('Failed to load emergency alerts. Please check if you are logged in as police.');
      
      // Fallback to empty array
      setEmergencyAlerts([]);
    }
  };

  // Handle SOS status updates
  const handleSOSStatusUpdate = async (username, newStatus) => {
    try {
      const response = await adminService.updateSOSStatus(username, newStatus);
      if (response.success) {
        // Refresh the emergency alerts list
        await loadEmergencyAlerts();
        console.log(`SOS status updated to ${newStatus} for ${username}`);
      }
    } catch (error) {
      console.error('Update SOS status error:', error);
    }
  };

  // Handle SOS resolution
  const handleSOSResolve = async (username, resolution = 'Resolved by police') => {
    try {
      const response = await adminService.resolveEmergencySOS(username, resolution);
      if (response.success) {
        // Refresh the emergency alerts list
        await loadEmergencyAlerts();
        console.log(`Emergency SOS resolved for ${username}`);
      }
    } catch (error) {
      console.error('Resolve SOS error:', error);
    }
  };

  // Load location updates
  const loadLocationUpdates = async () => {
    try {
      // Mock data for demonstration
      const mockLocations = [
        {
          id: 1,
          clientId: 'user123',
          latitude: 40.7580,
          longitude: -73.9855,
          accuracy: 10,
          message: 'Regular check-in',
          timestamp: new Date().toISOString()
        }
      ];
      setLocationUpdates(mockLocations);
    } catch (error) {
      console.error('Load locations error:', error);
    }
  };

  // Load server statistics
  const loadServerStats = async () => {
    try {
      const response = await adminService.getStats();
      if (response.success) {
        setServerStats(response.stats);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  // Handle user actions
  const handleUserAction = (action, user) => {
    setSelectedUser(user);
    switch (action) {
      case 'edit':
        setUserDialog(true);
        break;
      case 'delete':
        setDeleteDialog(true);
        break;
      case 'block':
        handleBlockUser(user);
        break;
      default:
        break;
    }
    setMenuAnchor(null);
  };

  const handleBlockUser = async (user) => {
    try {
      // Mock block functionality
      toast.success(`User ${user.username} has been blocked`);
      loadUsers();
    } catch (error) {
      toast.error('Failed to block user');
    }
  };

  const handleDeleteUser = async () => {
    try {
      const response = await adminService.deleteUser(selectedUser.id);
      if (response.success) {
        toast.success('User deleted successfully');
        loadUsers();
      }
    } catch (error) {
      toast.error('Failed to delete user');
    } finally {
      setDeleteDialog(false);
      setSelectedUser(null);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.role === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Format uptime
  const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return format(date, 'MMM dd, HH:mm');
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Police Authentication Check */}
      {!isPoliceAuthenticated ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Paper sx={{ p: 4, maxWidth: 500, mx: 'auto' }}>
            <AdminPanelSettings sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Police Authentication Required
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              You must be logged in as a police officer to access the Admin Dashboard.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              onClick={() => window.location.href = '/police-login'}
              startIcon={<Security />}
            >
              Police Login
            </Button>
          </Paper>
        </Box>
      ) : (
        <>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AdminPanelSettings sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h4" gutterBottom>
                Police Admin Dashboard
              </Typography>
              {policeData && (
                <Chip 
                  label={`Officer: ${policeData.name || policeData.username}`}
                  color="primary"
                  sx={{ ml: 2 }}
                />
              )}
            </Box>
            <Typography variant="body1" color="text.secondary">
              Monitor emergency alerts, manage users, and oversee system operations.
            </Typography>
          </Box>

          {/* Connection Status */}
          <Alert 
            severity={isConnected ? 'success' : 'error'} 
            sx={{ mb: 3 }}
            icon={isConnected ? <CheckCircle /> : <Warning />}
          >
            <Typography variant="body2">
              <strong>System Status:</strong> {isConnected ? 'Online' : 'Offline'}
              {isConnected && serverStats.connectedClients && (
                ` • ${serverStats.connectedClients} users connected • Uptime: ${formatUptime(serverStats.serverUptime)}`
              )}
            </Typography>
          </Alert>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <People sx={{ color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{serverStats.totalUsers || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Users</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Warning sx={{ color: 'error.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{realtimeAlerts.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Active Alerts</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircle sx={{ color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{serverStats.verifiedUsers || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">Verified Users</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocationOn sx={{ color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{realtimeLocations.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Location Updates</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Real-time Alerts" icon={<Warning />} />
          <Tab label="Users Management" icon={<People />} />
          <Tab label="Location Tracking" icon={<LocationOn />} />
          <Tab label="System Analytics" icon={<Analytics />} />
        </Tabs>

        {/* Real-time Alerts Tab */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Emergency Alerts</Typography>
              <Button
                startIcon={<Refresh />}
                onClick={loadEmergencyAlerts}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>

            <Grid container spacing={3}>
              {/* Recent SOS Alerts */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      <Badge badgeContent={realtimeAlerts.length} color="error">
                        Recent SOS Alerts
                      </Badge>
                    </Typography>
                    
                    {realtimeAlerts.length > 0 ? (
                      <List>
                        {realtimeAlerts.map((alert, index) => (
                          <React.Fragment key={index}>
                            <ListItem>
                              <ListItemIcon>
                                <Warning color="error" />
                              </ListItemIcon>
                              <ListItemText
                                primary={alert.message}
                                secondary={
                                  <Box>
                                    <Typography variant="body2">
                                      {formatTimeAgo(alert.timestamp)} • 
                                      <Chip 
                                        label={alert.urgency} 
                                        size="small" 
                                        color={getUrgencyColor(alert.urgency)}
                                        sx={{ ml: 1 }}
                                      />
                                    </Typography>
                                    {alert.location && (
                                      <Typography variant="body2" color="text.secondary">
                                        📍 {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                              />
                            </ListItem>
                            {index < realtimeAlerts.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No recent SOS alerts
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Emergency SOS Alerts */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        🚨 Emergency SOS Alerts
                      </Typography>
                      <Button 
                        variant="outlined" 
                        startIcon={<Refresh />}
                        onClick={loadEmergencyAlerts}
                        size="small"
                      >
                        Refresh
                      </Button>
                    </Box>
                    
                    {emergencyAlerts.length > 0 ? (
                      <Grid container spacing={2}>
                        {emergencyAlerts.map((alert) => (
                          <Grid item xs={12} md={6} lg={4} key={alert.id}>
                            <Card 
                              variant="outlined" 
                              sx={{ 
                                borderColor: alert.status === 'active' ? 'error.main' : 'success.main',
                                backgroundColor: alert.status === 'active' ? 'error.light' : 'background.paper'
                              }}
                            >
                              <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                  <Chip 
                                    label={alert.status.toUpperCase()} 
                                    size="small" 
                                    color={alert.status === 'active' ? 'error' : 'success'}
                                  />
                                  <Chip 
                                    label={alert.urgency || 'critical'} 
                                    size="small" 
                                    variant="outlined"
                                  />
                                </Box>
                                
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                  {alert.userName || alert.clientId}
                                </Typography>
                                
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  📞 {alert.userPhone || 'No phone provided'}
                                </Typography>
                                
                                <Typography variant="body2" gutterBottom>
                                  {alert.message}
                                </Typography>
                                
                                {alert.location && (
                                  <Typography variant="body2" color="text.secondary" gutterBottom>
                                    📍 {alert.location.address || `${alert.location.latitude}, ${alert.location.longitude}`}
                                  </Typography>
                                )}
                                
                                <Typography variant="caption" color="text.secondary">
                                  {formatTimeAgo(alert.timestamp)}
                                </Typography>
                                
                                {alert.status === 'active' && (
                                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Button 
                                      size="small" 
                                      variant="contained" 
                                      color="warning"
                                      onClick={() => handleSOSStatusUpdate(alert.id, 'responding')}
                                    >
                                      Respond
                                    </Button>
                                    <Button 
                                      size="small" 
                                      variant="contained" 
                                      color="success"
                                      onClick={() => handleSOSResolve(alert.id)}
                                    >
                                      Resolve
                                    </Button>
                                  </Box>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Warning sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Emergency SOS Alerts
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          All clear! No active emergency situations at this time.
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Emergency History */}
        {activeTab === 0 && (
          <Box sx={{ p: 3, pt: 0 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      📊 Emergency Response Statistics
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4" color="error.main">
                            {emergencyAlerts.filter(a => a.status === 'active').length}
                          </Typography>
                          <Typography variant="body2">Active</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4" color="warning.main">
                            {emergencyAlerts.filter(a => a.status === 'responding').length}
                          </Typography>
                          <Typography variant="body2">Responding</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4" color="success.main">
                            {emergencyAlerts.filter(a => a.status === 'resolved').length}
                          </Typography>
                          <Typography variant="body2">Resolved</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4" color="primary.main">
                            {emergencyAlerts.length}
                          </Typography>
                          <Typography variant="body2">Total</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Users Management Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            {/* Search and Filter */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
                sx={{ flexGrow: 1 }}
              />
              
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Filter</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Filter"
                >
                  <MenuItem value="all">All Users</MenuItem>
                  <MenuItem value="user">Users</MenuItem>
                  <MenuItem value="admin">Admins</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                startIcon={<Refresh />}
                onClick={loadUsers}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>

            {/* Users Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Registered</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Person sx={{ mr: 1, color: 'text.secondary' }} />
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {user.username}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ID: {user.id}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{user.email}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={user.role} 
                            size="small"
                            color={user.role === 'admin' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label="Active" 
                            size="small"
                            color="success"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(), 'MMM dd, yyyy')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={(e) => setMenuAnchor(e.currentTarget)}
                          >
                            <MoreVert />
                          </IconButton>
                          <Menu
                            anchorEl={menuAnchor}
                            open={Boolean(menuAnchor)}
                            onClose={() => setMenuAnchor(null)}
                          >
                            <MenuItem onClick={() => handleUserAction('edit', user)}>
                              <Edit sx={{ mr: 1 }} /> Edit
                            </MenuItem>
                            <MenuItem onClick={() => handleUserAction('block', user)}>
                              <Block sx={{ mr: 1 }} /> Block
                            </MenuItem>
                            <MenuItem onClick={() => handleUserAction('delete', user)}>
                              <Delete sx={{ mr: 1 }} /> Delete
                            </MenuItem>
                          </Menu>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredUsers.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </Box>
        )}

        {/* Location Tracking Tab */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Real-time Location Updates
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recent Location Shares
                    </Typography>
                    
                    {realtimeLocations.length > 0 ? (
                      <List>
                        {realtimeLocations.map((location, index) => (
                          <React.Fragment key={index}>
                            <ListItem>
                              <ListItemIcon>
                                <LocationOn color="primary" />
                              </ListItemIcon>
                              <ListItemText
                                primary={location.message || 'Location update'}
                                secondary={
                                  <Box>
                                    <Typography variant="body2">
                                      {formatTimeAgo(location.timestamp)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      📍 {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                                      {location.accuracy && ` (±${location.accuracy}m)`}
                                    </Typography>
                                    {location.userName && (
                                      <Typography variant="body2" color="text.secondary">
                                        👤 {location.userName}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                              />
                            </ListItem>
                            {index < realtimeLocations.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No recent location updates
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* System Analytics Tab */}
        {activeTab === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Statistics
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Server Status
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Uptime:</strong> {formatUptime(serverStats.serverUptime)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Connected Users:</strong> {serverStats.connectedClients || 0}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Total Users:</strong> {serverStats.totalUsers || 0}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Verified Users:</strong> {serverStats.verifiedUsers || 0}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recent Activity
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • {realtimeAlerts.length} SOS alerts today<br/>
                      • {realtimeLocations.length} location updates<br/>
                      • {serverStats.connectedClients || 0} active connections<br/>
                      • System running smoothly
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{selectedUser?.username}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
        </>
      )}
    </Container>
  );
};

export default Admin;