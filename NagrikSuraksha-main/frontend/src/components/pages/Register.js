import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  FormControl,
  InputLabel,
  OutlinedInput,
  Grid,
  Divider
} from '@mui/material';
import {
  PersonAdd,
  Person,
  Phone,
  CalendarToday,
  Security,
  CheckCircle
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { format, subYears, addYears } from 'date-fns';

// Import custom hooks and services
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';

const Register = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);

  // React Hook Form
  const { 
    register, 
    handleSubmit, 
    control,
    formState: { errors }, 
    watch,
    reset 
  } = useForm({
    defaultValues: {
      name: '',
      phoneNumber: '',
      dob: null
    }
  });

  // Watch form values for validation
  const watchedFields = watch();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Calculate age limits
  const today = new Date();
  const minDate = subYears(today, 120); // 120 years ago
  const maxDate = subYears(today, 13);  // 13 years ago (minimum age)

  // Handle form submission
  const handleRegisterSubmit = async (data) => {
    try {
      setLoading(true);
      setError('');

      // Format date of birth
      const formattedDOB = format(data.dob, 'yyyy-MM-dd');

      const registrationData = {
        name: data.name.trim(),
        phoneNumber: data.phoneNumber.trim(),
        dob: formattedDOB
      };

      console.log('Registering user:', registrationData);

      const response = await authService.register(registrationData);
      
      if (response.success) {
        setSuccess(true);
        setRegisteredUser(response.user);
        
        toast.success('Registration successful! You can now login with your phone number.');
        
        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              phoneNumber: data.phoneNumber,
              message: 'Registration successful! Please login with your phone number.' 
            }
          });
        }, 3000);
      } else {
        setError(response.message || 'Registration failed');
        toast.error(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle reset form
  const handleReset = () => {
    reset();
    setError('');
    setSuccess(false);
    setRegisteredUser(null);
  };

  // If registration successful, show success message
  if (success && registeredUser) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: '80vh'
          }}
        >
          <Paper elevation={3} sx={{ padding: 4, width: '100%', borderRadius: 2 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography component="h1" variant="h4" color="success.main" gutterBottom>
                Registration Successful!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Your account has been created successfully.
              </Typography>
            </Box>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Account Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Name:</strong> {registeredUser.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Phone:</strong> {registeredUser.phoneNumber}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Date of Birth:</strong> {format(new Date(registeredUser.dob), 'MMMM dd, yyyy')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Registered:</strong> {format(new Date(registeredUser.registeredAt), 'MMMM dd, yyyy HH:mm')}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Your RSA encryption keys have been generated and stored securely. 
                You can now login using your phone number and OTP verification.
              </Typography>
            </Alert>

            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/login')}
              sx={{ mb: 2 }}
            >
              Go to Login
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={handleReset}
            >
              Register Another Account
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: '80vh'
          }}
        >
          <Paper elevation={3} sx={{ padding: 4, width: '100%', borderRadius: 2 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <PersonAdd sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
              <Typography component="h1" variant="h4" color="primary.main">
                Register
              </Typography>
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Create your account to access emergency response features. 
              Your information will be encrypted and stored securely.
            </Typography>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Card>
              <CardContent>
                <form onSubmit={handleSubmit(handleRegisterSubmit)}>
                  {/* Name Field */}
                  <TextField
                    fullWidth
                    id="name"
                    label="Full Name"
                    type="text"
                    placeholder="Enter your full name"
                    {...register('name', {
                      required: 'Full name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters long'
                      },
                      maxLength: {
                        value: 50,
                        message: 'Name must be less than 50 characters'
                      },
                      pattern: {
                        value: /^[a-zA-Z\s'-]+$/,
                        message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
                      }
                    })}
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person />
                        </InputAdornment>
                      )
                    }}
                    sx={{ mb: 3 }}
                    disabled={loading}
                  />

                  {/* Phone Number Field */}
                  <TextField
                    fullWidth
                    id="phoneNumber"
                    label="Phone Number"
                    type="tel"
                    placeholder="+1234567890"
                    {...register('phoneNumber', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^[\+]?[1-9][\d]{9,14}$/,
                        message: 'Please enter a valid phone number'
                      }
                    })}
                    error={!!errors.phoneNumber}
                    helperText={errors.phoneNumber?.message || 'Include country code (e.g., +1234567890)'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone />
                        </InputAdornment>
                      )
                    }}
                    sx={{ mb: 3 }}
                    disabled={loading}
                  />

                  {/* Date of Birth Field */}
                  <Controller
                    name="dob"
                    control={control}
                    rules={{
                      required: 'Date of birth is required',
                      validate: (value) => {
                        if (!value) return 'Date of birth is required';
                        
                        const selectedDate = new Date(value);
                        const today = new Date();
                        
                        if (selectedDate > maxDate) {
                          return 'You must be at least 13 years old';
                        }
                        
                        if (selectedDate < minDate) {
                          return 'Please enter a valid date of birth';
                        }
                        
                        if (selectedDate > today) {
                          return 'Date of birth cannot be in the future';
                        }
                        
                        return true;
                      }
                    }}
                    render={({ field }) => (
                      <DatePicker
                        label="Date of Birth"
                        value={field.value}
                        onChange={field.onChange}
                        maxDate={maxDate}
                        minDate={minDate}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            error={!!errors.dob}
                            helperText={errors.dob?.message || 'You must be at least 13 years old'}
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <InputAdornment position="start">
                                  <CalendarToday />
                                </InputAdornment>
                              )
                            }}
                            sx={{ mb: 3 }}
                            disabled={loading}
                          />
                        )}
                        disabled={loading}
                      />
                    )}
                  />

                  <Divider sx={{ my: 3 }} />

                  {/* Security Information */}
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Security sx={{ mr: 1 }} />
                      <Typography variant="subtitle2">
                        Security Features
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      • RSA encryption keys will be automatically generated for your account<br/>
                      • Your data will be encrypted and stored securely<br/>
                      • Two-factor authentication via SMS OTP<br/>
                      • Secure emergency communication protocols
                    </Typography>
                  </Alert>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <PersonAdd />}
                    disabled={loading}
                    sx={{ mb: 2 }}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>

                  {/* Reset Button */}
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleReset}
                    disabled={loading}
                  >
                    Reset Form
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Login Link */}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2">
                Already have an account?{' '}
                <Link
                  to="/login"
                  style={{
                    color: '#1976d2',
                    textDecoration: 'none',
                    fontWeight: 500
                  }}
                >
                  Login here
                </Link>
              </Typography>
            </Box>

            {/* Development Info */}
            {process.env.NODE_ENV === 'development' && (
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>Development Mode:</strong> Registration will create RSA keys and store user data locally.
                  In production, all data will be encrypted and stored in a secure database.
                </Typography>
              </Alert>
            )}
          </Paper>
        </Box>
      </Container>
    </LocalizationProvider>
  );
};

export default Register;