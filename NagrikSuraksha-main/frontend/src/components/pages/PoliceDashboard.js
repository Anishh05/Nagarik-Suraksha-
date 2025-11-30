import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Badge,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  LocalPolice,
  Warning,
  Report,
  LocationOn,
  Phone,
  Person,
  Schedule,
  Emergency,
  CheckCircle,
  Cancel,
  Refresh,
  Logout,
  Dashboard as DashboardIcon,
  Visibility,
  Assignment,
  NotificationImportant,
  Map,
  AttachFile
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { adminService } from '../../services/adminService';

const PoliceDashboard = () => {
  const navigate = useNavigate();
  
  const [admin, setAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sosRequests, setSosRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [selectedSos, setSelectedSos] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [sosDialog, setSosDialog] = useState(false);
  const [complaintDialog, setComplaintDialog] = useState(false);
  const [resolvedSOS, setResolvedSOS] = useState([]);
  const [resolvedComplaints, setResolvedComplaints] = useState([]);
  const [resolutionDialog, setResolutionDialog] = useState(false);
  const [resolutionType, setResolutionType] = useState(''); // 'sos' or 'complaint'
  const [itemToResolve, setItemToResolve] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Load initial data
  useEffect(() => {
    loadAdminData();
    loadSosRequests();
    loadComplaints();
    loadResolvedData();
  }, []);

  const loadAdminData = async () => {
    try {
      const response = await adminService.getCurrentAdmin();
      if (response.success) {
        setAdmin(response.admin);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Session expired. Please login again.');
      handleLogout();
    }
  };

  const loadSosRequests = async () => {
    try {
      const response = await adminService.getEmergencySOS();
      if (response.success) {
        // Convert emergency SOS data to match expected format and filter out resolved ones
        const formattedSosRequests = response.emergencySOS
          .filter(sos => sos.status !== 'resolved') // Only show active SOS alerts
          .map(sos => ({
            id: sos.username,
            userId: sos.username,
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
        setSosRequests(formattedSosRequests);
        console.log('Emergency SOS requests loaded:', formattedSosRequests);
      }
    } catch (error) {
      console.error('Error loading emergency SOS requests:', error);
      toast.error('Failed to load emergency SOS requests');
    }
  };

  const loadComplaints = async () => {
    try {
      const response = await adminService.getComplaints();
      if (response.success) {
        // Filter out resolved complaints - only show active ones
        const activeComplaints = response.complaints.filter(complaint => 
          complaint.status !== 'resolved'
        );
        setComplaints(activeComplaints);
      }
    } catch (error) {
      console.error('Error loading complaints:', error);
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  const loadResolvedData = async () => {
    try {
      // Load resolved SOS history
      const sosHistoryResponse = await adminService.getEmergencySOSHistory();
      if (sosHistoryResponse.success) {
        setResolvedSOS(sosHistoryResponse.history || []);
      }

      // Load resolved complaints
      const resolvedComplaintsResponse = await adminService.getResolvedComplaints();
      if (resolvedComplaintsResponse.success) {
        setResolvedComplaints(resolvedComplaintsResponse.complaints || []);
      }
    } catch (error) {
      console.error('Error loading resolved data:', error);
      // Don't show error toast for resolved data as it's not critical
    }
  };

  const handleLogout = () => {
    adminService.policeLogout();
    navigate('/police-login');
  };

  const handleRefresh = () => {
    setLoading(true);
    loadSosRequests();
    loadComplaints();
    loadResolvedData();
  };

  const handleSosView = (sos) => {
    setSelectedSos(sos);
    setSosDialog(true);
  };

  const handleComplaintView = (complaint) => {
    setSelectedComplaint(complaint);
    setComplaintDialog(true);
  };

  const handleResolvedSosView = (resolvedSos) => {
    // Format resolved SOS data to match the expected format for the dialog
    const formattedSos = {
      id: resolvedSos.username,
      userId: resolvedSos.username,
      userName: resolvedSos.userName,
      userPhone: resolvedSos.userPhone,
      message: resolvedSos.message,
      urgency: resolvedSos.urgency || 'critical',
      timestamp: resolvedSos.createdAt,
      location: {
        latitude: resolvedSos.latitude,
        longitude: resolvedSos.longitude,
        address: resolvedSos.address,
        accuracy: resolvedSos.accuracy
      },
      status: 'resolved',
      updatedAt: resolvedSos.resolvedAt
    };
    setSelectedSos(formattedSos);
    setSosDialog(true);
  };

  const handleSosResolve = (sos) => {
    setItemToResolve(sos);
    setResolutionType('sos');
    setResolutionNotes('');
    setResolutionDialog(true);
  };

  const handleComplaintResolve = (complaint) => {
    setItemToResolve(complaint);
    setResolutionType('complaint');
    setResolutionNotes('');
    setResolutionDialog(true);
  };

  const confirmResolution = async () => {
    try {
      setLoading(true);
      
      if (resolutionType === 'sos') {
        await adminService.resolveEmergencySOS(
          itemToResolve.userId, 
          resolutionNotes || 'Emergency resolved by police officer'
        );
        toast.success('Emergency SOS resolved successfully');
        setSosDialog(false);
        setSelectedSos(null);
        await loadSosRequests();
      } else if (resolutionType === 'complaint') {
        await adminService.resolveComplaint(
          itemToResolve.id,
          resolutionNotes || 'Complaint resolved by police officer',
          resolutionNotes || 'Issue has been addressed and resolved'
        );
        toast.success('Complaint resolved successfully');
        setComplaintDialog(false);
        setSelectedComplaint(null);
        await loadComplaints();
      }
      
      await loadResolvedData(); // Refresh resolved list
      setResolutionDialog(false);
      setItemToResolve(null);
      setResolutionNotes('');
      
    } catch (error) {
      console.error('Error resolving case:', error);
      toast.error(error.message || 'Failed to resolve case');
    } finally {
      setLoading(false);
    }
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'error';
      case 'pending': return 'warning';
      case 'in-progress': return 'info';
      case 'resolved': return 'success';
      default: return 'default';
    }
  };

  const formatTimeAgo = (timestamp) => {
    // Handle invalid or missing timestamps
    if (!timestamp) return 'Unknown time';
    
    const date = new Date(timestamp);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    
    try {
      return format(date, 'MMM dd, HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error, 'timestamp:', timestamp);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Police Emergency Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome, {admin?.name} ({admin?.rank})
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<Logout />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                  <Warning />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="error.main">
                    {sosRequests.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active SOS Alerts
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Report />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {complaints.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Complaints
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <DashboardIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="primary.main">
                    {sosRequests.length + complaints.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Cases
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography variant="h4" color="success.main">
                    {resolvedSOS.length + resolvedComplaints.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Resolved Cases
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            icon={<Warning />} 
            label={`SOS Alerts (${sosRequests.length})`}
            sx={{ flexDirection: 'row', gap: 1 }}
          />
          <Tab 
            icon={<Report />} 
            label={`Complaints (${complaints.length})`}
            sx={{ flexDirection: 'row', gap: 1 }}
          />
          <Tab 
            icon={<CheckCircle />} 
            label={`Resolved Cases (${resolvedSOS.length + resolvedComplaints.length})`}
            sx={{ flexDirection: 'row', gap: 1 }}
          />
        </Tabs>
      </Paper>

      {/* SOS Requests Tab */}
      {activeTab === 0 && (
        <Card>
          <CardHeader 
            title="Emergency SOS Requests"
            subheader="Urgent alerts from citizens requiring immediate attention"
          />
          <CardContent>
            {sosRequests.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Citizen</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Urgency</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sosRequests.map((sos) => (
                      <TableRow key={sos.id}>
                        <TableCell>
                          <Typography variant="body2">
                            {formatTimeAgo(sos.timestamp)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {sos.userName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {sos.userId}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {sos.message}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {sos.location ? (
                            <Chip
                              icon={<LocationOn />}
                              label={`${sos.location.latitude.toFixed(4)}, ${sos.location.longitude.toFixed(4)}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No location
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={sos.urgency}
                            color={getUrgencyColor(sos.urgency)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={sos.status}
                            color={getStatusColor(sos.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => handleSosView(sos)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                No SOS requests found.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Complaints Tab */}
      {activeTab === 1 && (
        <Card>
          <CardHeader 
            title="Citizen Complaints"
            subheader="Filed complaints requiring police attention"
          />
          <CardContent>
            {complaints.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Citizen</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Urgency</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {complaints.map((complaint) => (
                      <TableRow key={complaint.id}>
                        <TableCell>
                          <Typography variant="body2">
                            {formatTimeAgo(complaint.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {complaint.userName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {complaint.userId}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={complaint.category}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {complaint.subject}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                            {complaint.location || 'Not specified'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={complaint.urgency}
                            color={getUrgencyColor(complaint.urgency)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={complaint.status}
                            color={getStatusColor(complaint.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => handleComplaintView(complaint)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                No complaints found.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resolved Cases Tab */}
      {activeTab === 2 && (
        <Card>
          <CardHeader
            title="Resolved Cases"
            subheader={`${resolvedSOS.length + resolvedComplaints.length} resolved cases`}
            action={
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={loading}
              >
                Refresh
              </Button>
            }
          />
          <CardContent>
            {/* Resolved SOS Section */}
            {resolvedSOS.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom color="primary">
                  Resolved Emergency SOS ({resolvedSOS.length})
                </Typography>
                <TableContainer component={Paper} sx={{ mb: 3 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Phone</TableCell>
                        <TableCell>Message</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Resolved At</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {resolvedSOS.map((sos, index) => (
                        <TableRow key={index}>
                          <TableCell>{sos.userName}</TableCell>
                          <TableCell>{sos.userPhone}</TableCell>
                          <TableCell>{sos.message}</TableCell>
                          <TableCell>
                            {sos.address || `${sos.latitude}, ${sos.longitude}`}
                          </TableCell>
                          <TableCell>
                            {sos.resolvedAt ? format(new Date(sos.resolvedAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Chip label="Resolved" color="success" size="small" />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              startIcon={<Visibility />}
                              onClick={() => handleResolvedSosView(sos)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* Resolved Complaints Section */}
            {resolvedComplaints.length > 0 && (
              <>
                <Typography variant="h6" gutterBottom color="primary">
                  Resolved Complaints ({resolvedComplaints.length})
                </Typography>
                <TableContainer component={Paper} sx={{ mb: 3 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Phone</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Subject</TableCell>
                        <TableCell>Urgency</TableCell>
                        <TableCell>Resolved At</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {resolvedComplaints.map((complaint) => (
                        <TableRow key={complaint.id}>
                          <TableCell>{complaint.userName}</TableCell>
                          <TableCell>{complaint.userId}</TableCell>
                          <TableCell>{complaint.category}</TableCell>
                          <TableCell>{complaint.subject}</TableCell>
                          <TableCell>
                            <Chip
                              label={complaint.urgency}
                              color={getUrgencyColor(complaint.urgency)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {complaint.resolvedAt ? format(new Date(complaint.resolvedAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Chip label="Resolved" color="success" size="small" />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              startIcon={<Visibility />}
                              onClick={() => handleComplaintView(complaint)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* No resolved cases message */}
            {resolvedSOS.length === 0 && resolvedComplaints.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No resolved cases found. Cases will appear here once they are marked as resolved.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* SOS Detail Dialog */}
      <Dialog open={sosDialog} onClose={() => setSosDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Warning sx={{ mr: 1, color: 'error.main' }} />
            Emergency SOS Alert Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSos && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Citizen Information</Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Name:</strong> {selectedSos.userName}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Phone:</strong> {selectedSos.userId}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Time:</strong> {selectedSos.timestamp ? format(new Date(selectedSos.timestamp), 'PPpp') : 'Unknown time'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Alert Details</Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Urgency:</strong> 
                  <Chip 
                    label={selectedSos.urgency} 
                    color={getUrgencyColor(selectedSos.urgency)}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Status:</strong> 
                  <Chip 
                    label={selectedSos.status} 
                    color={getStatusColor(selectedSos.status)}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Emergency Message</Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body1">
                    {selectedSos.message}
                  </Typography>
                </Paper>
              </Grid>
              {selectedSos.location && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Location</Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2">
                      <strong>Latitude:</strong> {selectedSos.location.latitude}<br/>
                      <strong>Longitude:</strong> {selectedSos.location.longitude}<br/>
                      <strong>Accuracy:</strong> ±{selectedSos.location.accuracy}m
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Map />}
                      sx={{ mt: 1 }}
                      href={`https://maps.google.com/?q=${selectedSos.location.latitude},${selectedSos.location.longitude}`}
                      target="_blank"
                    >
                      Open in Maps
                    </Button>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSosDialog(false)}>Close</Button>
          {selectedSos && selectedSos.status !== 'resolved' && (
            <>
              <Button variant="contained" color="primary">
                Assign to Officer
              </Button>
              <Button 
                variant="contained" 
                color="success"
                onClick={() => handleSosResolve(selectedSos)}
                disabled={loading}
              >
                Mark Resolved
              </Button>
            </>
          )}
          {selectedSos && selectedSos.status === 'resolved' && (
            <Chip 
              label="Case Resolved" 
              color="success" 
              icon={<CheckCircle />}
              sx={{ ml: 2 }}
            />
          )}
        </DialogActions>
      </Dialog>

      {/* Complaint Detail Dialog */}
      <Dialog open={complaintDialog} onClose={() => setComplaintDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Report sx={{ mr: 1, color: 'primary.main' }} />
            Complaint Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedComplaint && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Citizen Information</Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Name:</strong> {selectedComplaint.userName}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Phone:</strong> {selectedComplaint.userId}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Time:</strong> {selectedComplaint.createdAt ? format(new Date(selectedComplaint.createdAt), 'PPpp') : 'Unknown time'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Complaint Details</Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Category:</strong> {selectedComplaint.category}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Urgency:</strong> 
                  <Chip 
                    label={selectedComplaint.urgency} 
                    color={getUrgencyColor(selectedComplaint.urgency)}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Status:</strong> 
                  <Chip 
                    label={selectedComplaint.status} 
                    color={getStatusColor(selectedComplaint.status)}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Subject</Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedComplaint.subject}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Description</Typography>
                <Paper sx={{ 
                  p: 2, 
                  bgcolor: 'grey.50',
                  maxHeight: '200px',
                  overflow: 'auto',
                  border: '1px solid',
                  borderColor: 'grey.300'
                }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedComplaint.description}
                  </Typography>
                </Paper>
              </Grid>
              {selectedComplaint.location && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Location</Typography>
                  <Typography variant="body2">
                    {selectedComplaint.location}
                  </Typography>
                </Grid>
              )}
              {/* Show Resolution Notes for resolved complaints */}
              {selectedComplaint.status === 'resolved' && selectedComplaint.responseNotes && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom color="success.main">
                    Resolution Notes
                  </Typography>
                  <Paper sx={{ 
                    p: 2, 
                    bgcolor: 'success.50',
                    border: '1px solid',
                    borderColor: 'success.200'
                  }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedComplaint.responseNotes}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              {selectedComplaint.files && selectedComplaint.files.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Attachments</Typography>
                  <List>
                    {selectedComplaint.files.map((file, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <AttachFile />
                        </ListItemIcon>
                        <ListItemText 
                          primary={file.name}
                          secondary={`${file.type} - ${(file.size / 1024).toFixed(1)} KB`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComplaintDialog(false)}>Close</Button>
          {selectedComplaint && selectedComplaint.status !== 'resolved' && (
            <>
              <Button variant="contained" color="primary">
                Assign to Officer
              </Button>
              <Button 
                variant="contained" 
                color="success"
                onClick={() => handleComplaintResolve(selectedComplaint)}
                disabled={loading}
              >
                Mark Resolved
              </Button>
            </>
          )}
          {selectedComplaint && selectedComplaint.status === 'resolved' && (
            <Chip 
              label="Case Resolved" 
              color="success" 
              icon={<CheckCircle />}
              sx={{ ml: 2 }}
            />
          )}
        </DialogActions>
      </Dialog>

      {/* Resolution Confirmation Dialog */}
      <Dialog open={resolutionDialog} onClose={() => setResolutionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
            Confirm Resolution
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to mark this {resolutionType === 'sos' ? 'emergency SOS alert' : 'complaint'} as resolved?
          </Typography>
          
          {itemToResolve && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                {resolutionType === 'sos' ? 'Emergency Details:' : 'Complaint Details:'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>User:</strong> {itemToResolve.userName || itemToResolve.userId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>{resolutionType === 'sos' ? 'Message:' : 'Subject:'}</strong> {itemToResolve.message || itemToResolve.subject}
              </Typography>
              {/* Show location for both SOS and complaints */}
              {(itemToResolve.location || (resolutionType === 'sos' && itemToResolve.location)) && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Location:</strong> {
                    resolutionType === 'sos' 
                      ? (itemToResolve.location?.address || `${itemToResolve.location?.latitude}, ${itemToResolve.location?.longitude}`)
                      : itemToResolve.location
                  }
                </Typography>
              )}
            </Box>
          )}

          <TextField
            label="Resolution Notes (Optional)"
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Enter any additional notes about how this case was resolved..."
            sx={{ mt: 3 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolutionDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="success"
            onClick={confirmResolution}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {loading ? 'Resolving...' : 'Confirm Resolution'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PoliceDashboard;