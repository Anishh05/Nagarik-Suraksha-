import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Phone,
  Security,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

// Import custom hooks and services
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();

  // Form states
  const [activeStep, setActiveStep] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [remainingTime, setRemainingTime] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(3);

  // React Hook Form
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  // Steps for the login process
  const steps = ['Enter Phone Number', 'Verify OTP'];

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  // Timer for OTP expiry
  useEffect(() => {
    if (remainingTime > 0) {
      const timer = setTimeout(() => {
        setRemainingTime(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [remainingTime]);

  // Format remaining time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle phone number submission and OTP generation
  const handlePhoneSubmit = async (data) => {
    try {
      setLoading(true);
      setError('');

      const response = await authService.generateOTP(data.phoneNumber);
      
      if (response.success) {
        setPhoneNumber(data.phoneNumber);
        setOtpSent(true);
        setActiveStep(1);
        setRemainingTime(response.expiresIn * 60); // Convert minutes to seconds
        
        toast.success('OTP sent successfully!');
        
        // Show OTP in development mode (remove in production)
        if (response.developmentOnly?.otp) {
          toast.info(`Development OTP: ${response.developmentOnly.otp}`, {
            autoClose: 10000
          });
        }
      } else {
        setError(response.message || 'Failed to send OTP');
        toast.error(response.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Phone submission error:', error);
      setError(error.response?.data?.message || 'Failed to send OTP');
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification and login
  const handleOTPSubmit = async (data) => {
    try {
      setLoading(true);
      setError('');

      const response = await authService.login(phoneNumber, data.otp);
      
      if (response.success) {
        // Store token and user data
        await login(response.token, response.user);
        
        toast.success('Login successful!');
        
        // Redirect to intended page or dashboard
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setError(response.message || 'Invalid OTP');
        setRemainingAttempts(response.remainingAttempts || remainingAttempts - 1);
        toast.error(response.message || 'Invalid OTP');
        
        if (response.remainingAttempts === 0) {
          setActiveStep(0);
          setOtpSent(false);
          reset();
          toast.warning('Maximum attempts exceeded. Please request a new OTP.');
        }
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError(error.response?.data?.message || 'OTP verification failed');
      toast.error('OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await authService.generateOTP(phoneNumber);
      
      if (response.success) {
        setRemainingTime(response.expiresIn * 60);
        setRemainingAttempts(3);
        toast.success('New OTP sent successfully!');
        
        // Show OTP in development mode
        if (response.developmentOnly?.otp) {
          toast.info(`Development OTP: ${response.developmentOnly.otp}`, {
            autoClose: 10000
          });
        }
      } else {
        setError(response.message || 'Failed to resend OTP');
        toast.error(response.message || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError('Failed to resend OTP');
      toast.error('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Go back to phone number step
  const handleBack = () => {
    setActiveStep(0);
    setOtpSent(false);
    setError('');
    reset();
  };

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
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <LoginIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
            <Typography component="h1" variant="h4" color="primary.main">
              Login
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Step 1: Phone Number */}
          {activeStep === 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Enter Your Phone Number
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  We'll send you a verification code to confirm your identity.
                </Typography>

                <form onSubmit={handleSubmit(handlePhoneSubmit)}>
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
                    helperText={errors.phoneNumber?.message}
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

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                    disabled={loading}
                    sx={{ mb: 2 }}
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: OTP Verification */}
          {activeStep === 1 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Verify OTP
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Enter the 6-digit code sent to <strong>{phoneNumber}</strong>
                </Typography>
                
                {remainingTime > 0 && (
                  <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
                    Code expires in: {formatTime(remainingTime)}
                  </Typography>
                )}

                {remainingAttempts < 3 && (
                  <Typography variant="body2" color="error.main" sx={{ mb: 2 }}>
                    Remaining attempts: {remainingAttempts}
                  </Typography>
                )}

                <form onSubmit={handleSubmit(handleOTPSubmit)}>
                  <TextField
                    fullWidth
                    id="otp"
                    label="OTP Code"
                    type="text"
                    placeholder="123456"
                    inputProps={{ maxLength: 6, pattern: '[0-9]{6}' }}
                    {...register('otp', {
                      required: 'OTP is required',
                      pattern: {
                        value: /^\d{6}$/,
                        message: 'OTP must be 6 digits'
                      }
                    })}
                    error={!!errors.otp}
                    helperText={errors.otp?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Security />
                        </InputAdornment>
                      )
                    }}
                    sx={{ mb: 3 }}
                    disabled={loading}
                    autoFocus
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                    disabled={loading}
                    sx={{ mb: 2 }}
                  >
                    {loading ? 'Verifying...' : 'Verify & Login'}
                  </Button>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={handleBack}
                      disabled={loading}
                    >
                      Back
                    </Button>
                    
                    <Button
                      fullWidth
                      variant="text"
                      onClick={handleResendOTP}
                      disabled={loading || remainingTime > 0}
                    >
                      {remainingTime > 0 ? `Resend (${formatTime(remainingTime)})` : 'Resend OTP'}
                    </Button>
                  </Box>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Register Link */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2">
              Don't have an account?{' '}
              <Link
                to="/register"
                style={{
                  color: '#1976d2',
                  textDecoration: 'none',
                  fontWeight: 500
                }}
              >
                Register here
              </Link>
            </Typography>
          </Box>

          {/* Police Portal Link */}
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Law enforcement officer?{' '}
              <Link
                to="/police-login"
                style={{
                  color: '#dc004e',
                  textDecoration: 'none',
                  fontWeight: 500
                }}
              >
                Access Police Portal
              </Link>
            </Typography>
          </Box>

          {/* Development Info */}
          {process.env.NODE_ENV === 'development' && (
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Development Mode:</strong> OTP will be displayed in notifications for testing.
                In production, OTP will be sent via SMS.
              </Typography>
            </Alert>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;