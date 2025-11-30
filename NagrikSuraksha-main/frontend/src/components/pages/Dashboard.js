import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Box,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Badge,
  Fab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  LinearProgress,
  Tabs,
  Tab,
  CardHeader,
  Avatar,
  Stack,
  Autocomplete
} from '@mui/material';
import {
  Warning,
  LocationOn,
  Person,
  Phone,
  Security,
  Notifications,
  History,
  Send,
  CheckCircle,
  Cancel,
  MyLocation,
  Refresh,
  ReportProblem,
  Report,
  CameraAlt,
  VideoFile,
  AttachFile,
  Image,
  Description,
  Analytics,
  TrendingUp,
  BarChart,
  PieChart,
  Assignment,
  LocalPolice,
  LocalHospital,
  FireTruck,
  Shield,
  Visibility,
  Delete,
  Close,
  Assessment,
  PhotoCamera,
  Videocam,
  InsertDriveFile,
  CloudUpload
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

// Import custom hooks and services
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useLocation } from '../../hooks/useLocation';
import { emergencyService } from '../../services/emergencyService';
import { adminService } from '../../services/adminService';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { socket, isConnected, sendSOS, sendLocation, connectSocket } = useSocket();
  const { location, getLocation, isGettingLocation, locationError } = useLocation();

  // Component states
  const [sosDialog, setSosDialog] = useState(false);
  const [locationDialog, setLocationDialog] = useState(false);
  const [sosMessage, setSosMessage] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('high');
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [recentLocations, setRecentLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    connectedClients: 0,
    totalSOSToday: 0,
    lastLocationUpdate: null
  });

  // New feature states
  const [activeTab, setActiveTab] = useState(0);
  const [complaintDialog, setComplaintDialog] = useState(false);
  const [fileViewerDialog, setFileViewerDialog] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressInputValue, setAddressInputValue] = useState('');
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [complaintData, setComplaintData] = useState({
    category: '',
    subject: '',
    description: '',
    urgency: 'medium',
    location: '',
    images: [],
    videos: [],
    documents: []
  });
  const [crimeTrends, setCrimeTrends] = useState({
    todayIncidents: 42,
    weeklyChange: -15,
    categories: [
      { name: 'Theft', count: 15, change: -5 },
      { name: 'Vandalism', count: 8, change: +2 },
      { name: 'Assault', count: 6, change: -3 },
      { name: 'Fraud', count: 13, change: +1 }
    ],
    recentNews: []
  });

  // Auto-get location on component mount and update backend
  useEffect(() => {
    const hasRequestedLocation = sessionStorage.getItem('locationRequested');
    
    if (!hasRequestedLocation) {
      sessionStorage.setItem('locationRequested', 'true');
      getLocation();
    }
  }, [getLocation]);

  // Update backend when location changes (only once)
  useEffect(() => {
    if (location && user) {
      const lastLocationUpdate = sessionStorage.getItem('lastLocationUpdate');
      const currentLocationKey = `${location.latitude}_${location.longitude}`;
      
      // Only update if this is a new location
      if (lastLocationUpdate !== currentLocationKey) {
        const updateLocationInBackend = async () => {
          try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000'}/api/auth/update-location`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address || `${location.latitude}, ${location.longitude}`
              })
            });

            if (response.ok) {
              console.log('Location updated in backend successfully');
              sessionStorage.setItem('lastLocationUpdate', currentLocationKey);
              // Only show toast once when location is first obtained
              if (!lastLocationUpdate) {
                toast.success('Location access granted and saved');
              }
            } else {
              console.error('Failed to update location in backend');
            }
          } catch (error) {
            console.error('Error updating location in backend:', error);
          }
        };

        updateLocationInBackend();
      }
    }
  }, [location, user]);

  // Connect socket when user is authenticated
  useEffect(() => {
    if (user && connectSocket) {
      const token = localStorage.getItem('token');
      if (token) {
        console.log('Connecting socket with auth token...');
        connectSocket(token);
      }
    }
  }, [user, connectSocket]);

  // Socket event listeners
  useEffect(() => {
    if (socket) {
      // Listen for SOS alerts from other users
      socket.on('sos_received', (data) => {
        console.log('SOS alert received:', data);
        setRecentAlerts(prev => [data, ...prev.slice(0, 4)]); // Keep latest 5
        toast.error(`🚨 SOS Alert: ${data.message}`, {
          position: 'top-center',
          autoClose: 10000
        });
      });

      // Listen for location updates from other users
      socket.on('location_received', (data) => {
        console.log('Location update received:', data);
        setRecentLocations(prev => [data, ...prev.slice(0, 4)]); // Keep latest 5
        toast.info(`📍 Location Update: ${data.message}`, {
          autoClose: 5000
        });
      });

      // Listen for status updates
      socket.on('status', (data) => {
        setStats(prev => ({
          ...prev,
          connectedClients: data.connectedClients
        }));
      });

      // Listen for confirmations
      socket.on('sos_sent', (data) => {
        if (data.success) {
          toast.success('SOS alert sent successfully!');
          setSosDialog(false);
          setSosMessage('');
        }
      });

      socket.on('location_sent', (data) => {
        if (data.success) {
          toast.success('Location shared successfully!');
          setLocationDialog(false);
          setLocationMessage('');
          setStats(prev => ({
            ...prev,
            lastLocationUpdate: new Date().toISOString()
          }));
        }
      });

      return () => {
        socket.off('sos_received');
        socket.off('location_received');
        socket.off('status');
        socket.off('sos_sent');
        socket.off('location_sent');
      };
    }
  }, [socket]);

  // Request server status
  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('get_status');
    }
  }, [socket, isConnected]);

  // Handle emergency SOS
  const handleEmergencySOS = async () => {
    try {
      setLoading(true);
      
      // Check if location is available
      if (!location) {
        toast.error('Location is required for SOS. Please enable location access and try again.');
        try {
          await getLocation();
          if (!location) {
            setLoading(false);
            return;
          }
        } catch (error) {
          toast.error('Unable to get location. Please enable location access in your browser settings.');
          setLoading(false);
          return;
        }
      }

      const sosData = {
        userId: user?.phoneNumber,
        userName: user?.name,
        userPhone: user?.phoneNumber,
        message: sosMessage || 'EMERGENCY SOS - Immediate assistance required!',
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          address: location.address || `Lat: ${location.latitude}, Lng: ${location.longitude}`
        },
        urgency: 'critical',
        timestamp: new Date().toISOString()
      };

      // Submit to police admin system
      await adminService.submitSosRequest(sosData);
      
      // Also send via WebSocket for real-time notifications
      if (socket && isConnected) {
        socket.emit('sos_alert', sosData);
      }
      
      toast.success('🚨 Emergency SOS sent to police with your location!');
      setSosDialog(false);
      setSosMessage('');
      
      // Update local stats
      setStats(prev => ({
        ...prev,
        totalSOSToday: prev.totalSOSToday + 1
      }));

    } catch (error) {
      console.error('Emergency SOS error:', error);
      toast.error('Failed to send SOS alert. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle location sharing
  const handleShareLocation = async () => {
    try {
      setLoading(true);

      if (!location) {
        toast.warning('Please enable location access first.');
        await getLocation();
        return;
      }

      const locationData = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        message: locationMessage || 'Current location update',
        userId: user?.phoneNumber,
        userName: user?.name
      };

      await sendLocation(locationData);

    } catch (error) {
      console.error('Location sharing error:', error);
      toast.error('Failed to share location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick emergency SOS (bypass dialog)
  const handleQuickSOS = async () => {
    try {
      setLoading(true);
      
      const sosData = {
        message: 'EMERGENCY - Immediate assistance required!',
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        } : null,
        urgency: 'critical',
        userId: user?.phoneNumber,
        userName: user?.name
      };

      await sendSOS(sosData);
      toast.success('Emergency SOS sent!');
      
    } catch (error) {
      console.error('Quick SOS error:', error);
      toast.error('Failed to send emergency SOS!');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (type, files) => {
    const fileArray = Array.from(files).map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));

    setComplaintData(prev => ({
      ...prev,
      [type]: [...prev[type], ...fileArray]
    }));
  };

  const removeFile = (type, index) => {
    setComplaintData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  // Debounce function for address search
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const searchAddresses = async (query) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setLoadingAddresses(true);
    try {
      // Using Nominatim API (free OpenStreetMap geocoding service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Police-Portal-App'
          }
        }
      );
      const data = await response.json();
      
      const suggestions = data.map(item => ({
        id: item.place_id,
        label: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        address: item.display_name
      }));
      
      setAddressSuggestions(suggestions);
    } catch (error) {
      console.error('Error searching addresses:', error);
      setAddressSuggestions([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Debounced search function
  const debouncedSearchAddresses = debounce(searchAddresses, 500);

  // Function to get address from coordinates (reverse geocoding)
  const getAddressFromCoordinates = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=en`,
        {
          headers: {
            'User-Agent': 'Police-Portal-App'
          }
        }
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    } catch (error) {
      console.error('Error getting address from coordinates:', error);
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
  };

  // Auto-populate location field when GPS location is available
  useEffect(() => {
    const autoPopulateLocation = async () => {
      if (location && location.latitude && location.longitude && !complaintData.location) {
        try {
          const address = await getAddressFromCoordinates(location.latitude, location.longitude);
          setComplaintData(prev => ({ ...prev, location: address }));
          setAddressInputValue(address);
        } catch (error) {
          // Fallback to coordinates if address lookup fails
          const fallbackAddress = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
          setComplaintData(prev => ({ ...prev, location: fallbackAddress }));
          setAddressInputValue(fallbackAddress);
        }
      }
    };

    autoPopulateLocation();
  }, [location, complaintData.location]);

  // Initialize addressInputValue with complaintData.location
  useEffect(() => {
    setAddressInputValue(complaintData.location);
  }, [complaintData.location]);

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return format(date, 'MMM dd, HH:mm');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Police Emergency Portal
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.name}. Your safety is our priority.
        </Typography>
      </Box>

      {/* Connection Status */}
      <Alert 
        severity={isConnected ? 'success' : 'warning'} 
        sx={{ mb: 3 }}
        icon={isConnected ? <CheckCircle /> : <Warning />}
      >
        <Typography variant="body2">
          <strong>Connection Status:</strong> {isConnected ? 'Connected to Emergency Services' : 'Disconnected'} 
          {location && (
            ` • Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
          )}
        </Typography>
      </Alert>

      {/* Main Navigation Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<Report />} 
            label="File Complaint" 
            sx={{ flexDirection: 'row', gap: 1 }}
          />
          <Tab 
            icon={<Warning />} 
            label="Emergency SOS" 
            sx={{ flexDirection: 'row', gap: 1 }}
          />
          <Tab 
            icon={<Analytics />} 
            label="Crime Trends" 
            sx={{ flexDirection: 'row', gap: 1 }}
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* File Complaint Section */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                avatar={<Avatar sx={{ bgcolor: 'primary.main' }}><Report /></Avatar>}
                title="File a Complaint"
                subheader="Report incidents to police with supporting evidence"
              />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Complaint Category</InputLabel>
                      <Select
                        value={complaintData.category}
                        onChange={(e) => setComplaintData(prev => ({ ...prev, category: e.target.value }))}
                        label="Complaint Category"
                      >
                        <MenuItem value="theft">Theft</MenuItem>
                        <MenuItem value="assault">Assault</MenuItem>
                        <MenuItem value="vandalism">Vandalism</MenuItem>
                        <MenuItem value="fraud">Fraud</MenuItem>
                        <MenuItem value="harassment">Harassment</MenuItem>
                        <MenuItem value="traffic">Traffic Violation</MenuItem>
                        <MenuItem value="noise">Noise Complaint</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Urgency Level</InputLabel>
                      <Select
                        value={complaintData.urgency}
                        onChange={(e) => setComplaintData(prev => ({ ...prev, urgency: e.target.value }))}
                        label="Urgency Level"
                      >
                        <MenuItem value="low">Low - Non-urgent</MenuItem>
                        <MenuItem value="medium">Medium - Standard</MenuItem>
                        <MenuItem value="high">High - Urgent</MenuItem>
                        <MenuItem value="critical">Critical - Emergency</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Subject"
                      placeholder="Brief description of the incident"
                      value={complaintData.subject}
                      onChange={(e) => setComplaintData(prev => ({ ...prev, subject: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Detailed Description"
                      placeholder="Provide detailed information about the incident..."
                      value={complaintData.description}
                      onChange={(e) => setComplaintData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                      <Autocomplete
                        fullWidth
                        freeSolo
                        options={addressSuggestions}
                        loading={loadingAddresses}
                        value={selectedAddress}
                        inputValue={addressInputValue}
                        getOptionLabel={(option) => {
                          if (typeof option === 'string') return option;
                          if (option && option.label) return option.label;
                          return '';
                        }}
                        isOptionEqualToValue={(option, value) => {
                          if (!option || !value) return false;
                          return option.id === value.id;
                        }}
                        onInputChange={(event, newInputValue, reason) => {
                          setAddressInputValue(newInputValue);
                          if (reason === 'input') {
                            debouncedSearchAddresses(newInputValue);
                          }
                        }}
                        onChange={(event, newValue, reason) => {
                          if (reason === 'selectOption' && newValue && typeof newValue === 'object') {
                            setSelectedAddress(newValue);
                            setComplaintData(prev => ({ ...prev, location: newValue.address }));
                            setAddressInputValue(newValue.address);
                          } else if (reason === 'clear') {
                            setSelectedAddress(null);
                            setComplaintData(prev => ({ ...prev, location: '' }));
                            setAddressInputValue('');
                          }
                        }}
                        onBlur={() => {
                          // Update complaint data with current input value when user clicks outside
                          setComplaintData(prev => ({ ...prev, location: addressInputValue }));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Location"
                            placeholder="Search for address or enter manually..."
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {loadingAddresses && <CircularProgress size={20} sx={{ mr: 1 }} />}
                                  {params.InputProps.endAdornment}
                                </Box>
                              ),
                            }}
                          />
                        )}
                        renderOption={(props, option) => (
                          <Box component="li" {...props} key={option.id}>
                            <LocationOn sx={{ mr: 2, color: 'primary.main', flexShrink: 0 }} />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }} noWrap>
                                {option.label.split(',')[0]}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {option.label.split(',').slice(1).join(',').trim()}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                        noOptionsText="Type to search for addresses..."
                        loadingText="Searching addresses..."
                      />
                      <IconButton 
                        onClick={async () => {
                          await getLocation();
                          if (location && location.latitude && location.longitude) {
                            try {
                              const address = await getAddressFromCoordinates(location.latitude, location.longitude);
                              setComplaintData(prev => ({ ...prev, location: address }));
                              setAddressInputValue(address);
                              setSelectedAddress(null);
                            } catch (error) {
                              const fallbackAddress = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
                              setComplaintData(prev => ({ ...prev, location: fallbackAddress }));
                              setAddressInputValue(fallbackAddress);
                              setSelectedAddress(null);
                            }
                          }
                        }}
                        disabled={isGettingLocation}
                        sx={{ mb: 0.5 }}
                        title="Use current location"
                      >
                        {isGettingLocation ? <CircularProgress size={20} /> : <MyLocation />}
                      </IconButton>
                    </Box>
                  </Grid>
                  
                  {/* File Upload Section */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Supporting Evidence
                    </Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<PhotoCamera />}
                        endIcon={complaintData.images.length > 0 ? <Badge badgeContent={complaintData.images.length} color="success"><AttachFile /></Badge> : null}
                        component="label"
                        color={complaintData.images.length > 0 ? "success" : "primary"}
                      >
                        Add Photos {complaintData.images.length > 0 && `(${complaintData.images.length})`}
                        <input
                          type="file"
                          hidden
                          multiple
                          accept="image/*"
                          onChange={(e) => handleFileUpload('images', e.target.files)}
                        />
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Videocam />}
                        endIcon={complaintData.videos.length > 0 ? <Badge badgeContent={complaintData.videos.length} color="success"><AttachFile /></Badge> : null}
                        component="label"
                        color={complaintData.videos.length > 0 ? "success" : "primary"}
                      >
                        Add Videos {complaintData.videos.length > 0 && `(${complaintData.videos.length})`}
                        <input
                          type="file"
                          hidden
                          multiple
                          accept="video/*"
                          onChange={(e) => handleFileUpload('videos', e.target.files)}
                        />
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<InsertDriveFile />}
                        endIcon={complaintData.documents.length > 0 ? <Badge badgeContent={complaintData.documents.length} color="success"><AttachFile /></Badge> : null}
                        component="label"
                        color={complaintData.documents.length > 0 ? "success" : "primary"}
                      >
                        Add Documents {complaintData.documents.length > 0 && `(${complaintData.documents.length})`}
                        <input
                          type="file"
                          hidden
                          multiple
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={(e) => handleFileUpload('documents', e.target.files)}
                        />
                      </Button>
                    </Stack>
                    
                    {/* Enhanced file upload status */}
                    {(complaintData.images.length > 0 || complaintData.videos.length > 0 || complaintData.documents.length > 0) && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircle fontSize="small" />
                            <Typography variant="body2">
                              <strong>{complaintData.images.length + complaintData.videos.length + complaintData.documents.length} files uploaded successfully</strong>
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => setFileViewerDialog(true)}
                            sx={{ ml: 2 }}
                          >
                            View Files
                          </Button>
                        </Box>
                        <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          {complaintData.images.length > 0 && (
                            <Chip 
                              icon={<PhotoCamera />} 
                              label={`${complaintData.images.length} Photo${complaintData.images.length > 1 ? 's' : ''}`} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          )}
                          {complaintData.videos.length > 0 && (
                            <Chip 
                              icon={<Videocam />} 
                              label={`${complaintData.videos.length} Video${complaintData.videos.length > 1 ? 's' : ''}`} 
                              size="small" 
                              color="secondary" 
                              variant="outlined"
                            />
                          )}
                          {complaintData.documents.length > 0 && (
                            <Chip 
                              icon={<InsertDriveFile />} 
                              label={`${complaintData.documents.length} Document${complaintData.documents.length > 1 ? 's' : ''}`} 
                              size="small" 
                              color="default" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Alert>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Send />}
                  onClick={() => setComplaintDialog(true)}
                  disabled={!complaintData.category || !complaintData.subject || !complaintData.description}
                >
                  Submit Complaint
                </Button>
                <Button
                  onClick={() => setComplaintData({
                    category: '', subject: '', description: '', urgency: 'medium',
                    location: '', images: [], videos: [], documents: []
                  })}
                >
                  Clear Form
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          {/* Emergency SOS Section */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardHeader
                avatar={<Avatar sx={{ bgcolor: 'error.main' }}><Warning /></Avatar>}
                title="Emergency SOS"
                subheader="Send immediate alert to police with your location"
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Emergency SOS</strong> will instantly send your name, phone number, and current location to the nearest police station.
                  </Typography>
                </Alert>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Your Information</Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Name:</strong> {user?.name}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Phone:</strong> {user?.phoneNumber}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Location:</strong> {location ? 
                      `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 
                      'Getting location...'
                    }
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Emergency Message (Optional)"
                  placeholder="Describe your emergency situation..."
                  value={sosMessage}
                  onChange={(e) => setSosMessage(e.target.value)}
                  sx={{ mb: 3 }}
                />
              </CardContent>
              <CardActions sx={{ p: 2 }}>
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  fullWidth
                  startIcon={<Warning />}
                  onClick={handleEmergencySOS}
                  disabled={loading || !location}
                  sx={{ py: 2 }}
                >
                  {loading ? 'SENDING SOS...' : !location ? 'GETTING LOCATION...' : 'SEND EMERGENCY SOS'}
                </Button>
                {!location && (
                  <Typography variant="caption" color="warning.main" sx={{ mt: 1, textAlign: 'center', display: 'block', width: '100%' }}>
                    ⚠️ Location is required for emergency SOS. Please enable location access.
                  </Typography>
                )}
                {location && (
                  <Typography variant="caption" color="success.main" sx={{ mt: 1, textAlign: 'center', display: 'block', width: '100%' }}>
                    ✅ Location ready - SOS will include your current position
                  </Typography>
                )}
              </CardActions>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader
                title="Quick Actions"
                subheader="Emergency hotlines"
              />
              <CardContent>
                <Stack spacing={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<LocalPolice />}
                    href="tel:100"
                    fullWidth
                    size="large"
                    sx={{ py: 1.5 }}
                  >
                    Call Police (100)
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<LocalHospital />}
                    href="tel:101"
                    fullWidth
                    size="large"
                    sx={{ py: 1.5 }}
                  >
                    Call Ambulance (101)
                  </Button>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<FireTruck />}
                    href="tel:102"
                    fullWidth
                    size="large"
                    sx={{ py: 1.5 }}
                  >
                    Call Fire Brigade (102)
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          {/* Crime Trends Section */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader
                avatar={<Avatar sx={{ bgcolor: 'info.main' }}><BarChart /></Avatar>}
                title="Today's Statistics"
              />
              <CardContent>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography variant="h3" color="primary.main">
                    {crimeTrends.todayIncidents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Incidents Today
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp color={crimeTrends.weeklyChange < 0 ? 'success' : 'error'} />
                  <Typography 
                    variant="body2" 
                    color={crimeTrends.weeklyChange < 0 ? 'success.main' : 'error.main'}
                    sx={{ ml: 1 }}
                  >
                    {Math.abs(crimeTrends.weeklyChange)}% {crimeTrends.weeklyChange < 0 ? 'decrease' : 'increase'} from last week
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardHeader
                title="Crime Categories"
                subheader="Breakdown by incident type"
              />
              <CardContent>
                <List>
                  {crimeTrends.categories.map((category, index) => (
                    <React.Fragment key={category.name}>
                      <ListItem>
                        <ListItemIcon>
                          <PieChart color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={category.name}
                          secondary={`${category.count} incidents`}
                        />
                        <Chip
                          label={`${category.change > 0 ? '+' : ''}${category.change}`}
                          color={category.change < 0 ? 'success' : 'error'}
                          size="small"
                        />
                      </ListItem>
                      {index < crimeTrends.categories.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardHeader
                title="Crime Trends Report"
                subheader="Analysis and insights for your area"
              />
              <CardContent>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    Crime data is updated daily. Reports are based on incidents within a 5-mile radius of your location.
                  </Typography>
                </Alert>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.dark' }}>
                      <Typography variant="h6" gutterBottom>
                        Safety Improvements
                      </Typography>
                      <Typography variant="body2">
                        • Theft incidents down 15% this month<br/>
                        • New patrol routes implemented<br/>
                        • Community watch program active
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: 'warning.light', color: 'warning.dark' }}>
                      <Typography variant="h6" gutterBottom>
                        Areas of Concern
                      </Typography>
                      <Typography variant="body2">
                        • Increased vandalism reports<br/>
                        • Late-night incidents near parks<br/>
                        • Fraud attempts via online platforms
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Complaint Confirmation Dialog */}
      <Dialog open={complaintDialog} onClose={() => setComplaintDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Report sx={{ mr: 1, color: 'primary.main' }} />
            Confirm Complaint Submission
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Your complaint will be forwarded to the appropriate police department.
          </Alert>
          <Typography variant="body2" gutterBottom>
            <strong>Category:</strong> {complaintData.category}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Subject:</strong> {complaintData.subject}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Urgency:</strong> {complaintData.urgency}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Attachments:</strong> {complaintData.images.length + complaintData.videos.length + complaintData.documents.length} files
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComplaintDialog(false)}>Cancel</Button>
          <Button 
            onClick={async () => {
              try {
                const complaintSubmission = {
                  userId: user?.id,
                  userName: user?.name,
                  userPhone: user?.phoneNumber,
                  category: complaintData.category,
                  subject: complaintData.subject,
                  description: complaintData.description,
                  location: complaintData.location,
                  urgency: complaintData.urgency,
                  files: complaintData.images.concat(complaintData.videos, complaintData.documents)
                };

                console.log('Submitting complaint:', complaintSubmission);
                console.log('User object:', user);

                await adminService.submitComplaint(complaintSubmission);
                toast.success('Complaint submitted successfully to police!');
                setComplaintDialog(false);
                setComplaintData({
                  category: '', subject: '', description: '', urgency: 'medium',
                  location: '', images: [], videos: [], documents: []
                });
              } catch (error) {
                console.error('Error submitting complaint:', error);
                toast.error('Failed to submit complaint. Please try again.');
              }
            }} 
            variant="contained"
            startIcon={<Send />}
          >
            Submit Complaint
          </Button>
        </DialogActions>
      </Dialog>

      {/* SOS Dialog */}
      <Dialog open={sosDialog} onClose={() => setSosDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Warning sx={{ mr: 1, color: 'error.main' }} />
            Send Emergency Alert
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will send an emergency alert with your location to the police.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Emergency Details"
            placeholder="Describe your emergency situation..."
            value={sosMessage}
            onChange={(e) => setSosMessage(e.target.value)}
            margin="normal"
          />
          {location && (
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Your Location:</strong>
              </Typography>
              <Typography variant="body2">
                Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSosDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleEmergencySOS} 
            variant="contained"
            color="error"
            disabled={loading || !location}
            startIcon={loading ? <CircularProgress size={20} /> : <Send />}
          >
            {loading ? 'Sending...' : 'Send SOS'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={locationDialog} onClose={() => setLocationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LocationOn sx={{ mr: 1, color: 'primary.main' }} />
            Share Location
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Your current location will be shared with other connected users.
          </Alert>
          
          <TextField
            fullWidth
            label="Message (Optional)"
            placeholder="Add a message with your location..."
            value={locationMessage}
            onChange={(e) => setLocationMessage(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          {location && (
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Current Location:</strong>
              </Typography>
              <Typography variant="body2">
                Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
              </Typography>
              <Typography variant="body2">
                Accuracy: ±{location.accuracy}m
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocationDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleShareLocation} 
            variant="contained"
            disabled={loading || !location}
            startIcon={loading ? <CircularProgress size={20} /> : <Send />}
          >
            {loading ? 'Sharing...' : 'Share Location'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Viewer Dialog */}
      <Dialog open={fileViewerDialog} onClose={() => setFileViewerDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            Uploaded Files ({complaintData.images.length + complaintData.videos.length + complaintData.documents.length})
          </Typography>
          <IconButton onClick={() => setFileViewerDialog(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {/* Images Section */}
          {complaintData.images.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhotoCamera color="primary" />
                Photos ({complaintData.images.length})
              </Typography>
              <Grid container spacing={2}>
                {complaintData.images.map((file, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card>
                      <Box sx={{ position: 'relative', height: 150, overflow: 'hidden' }}>
                        <img
                          src={URL.createObjectURL(file.file)}
                          alt={file.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                        <IconButton
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' }
                          }}
                          size="small"
                          onClick={() => removeFile('images', index)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                      <CardContent sx={{ p: 1 }}>
                        <Typography variant="caption" display="block" noWrap>
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Videos Section */}
          {complaintData.videos.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Videocam color="secondary" />
                Videos ({complaintData.videos.length})
              </Typography>
              <Grid container spacing={2}>
                {complaintData.videos.map((file, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card>
                      <Box sx={{ position: 'relative', height: 150, overflow: 'hidden', bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <video
                          src={URL.createObjectURL(file.file)}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          controls
                        />
                        <IconButton
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'error.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'error.dark' }
                          }}
                          size="small"
                          onClick={() => removeFile('videos', index)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                      <CardContent sx={{ p: 1 }}>
                        <Typography variant="caption" display="block" noWrap>
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Documents Section */}
          {complaintData.documents.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InsertDriveFile />
                Documents ({complaintData.documents.length})
              </Typography>
              <List>
                {complaintData.documents.map((file, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      mb: 1
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => removeFile('documents', index)}
                      >
                        <Delete />
                      </IconButton>
                    }
                  >
                    <ListItemIcon>
                      <InsertDriveFile />
                    </ListItemIcon>
                    <ListItemText
                      primary={file.name}
                      secondary={`${file.type} • ${(file.size / 1024 / 1024).toFixed(2)} MB`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
          
          {(complaintData.images.length === 0 && complaintData.videos.length === 0 && complaintData.documents.length === 0) && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <AttachFile sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No files uploaded yet
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFileViewerDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;