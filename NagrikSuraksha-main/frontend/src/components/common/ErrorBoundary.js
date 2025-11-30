import React from 'react';
import { Alert, Button, Container, Typography, Box } from '@mui/material';
import { Error, Refresh } from '@mui/icons-material';

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console and error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // You can also log the error to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    // Reset the error boundary and reload the page
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleReset = () => {
    // Reset the error boundary without reloading
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              py: 4
            }}
          >
            <Error sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            
            <Typography variant="h4" gutterBottom color="error.main">
              Oops! Something went wrong
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3 }} color="text.secondary">
              We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </Typography>

            <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
              <Typography variant="body2">
                <strong>Error:</strong> {this.state.error && this.state.error.toString()}
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleReload}
                color="primary"
              >
                Reload Page
              </Button>
              
              <Button
                variant="outlined"
                onClick={this.handleReset}
                color="primary"
              >
                Try Again
              </Button>
              
              <Button
                variant="text"
                onClick={() => window.history.back()}
                color="primary"
              >
                Go Back
              </Button>
            </Box>

            {/* Development Error Details */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <Box sx={{ mt: 4, width: '100%' }}>
                <Alert severity="warning" sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Development Error Details:
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      fontSize: '0.875rem',
                      overflow: 'auto',
                      maxHeight: '200px',
                      backgroundColor: 'grey.100',
                      padding: 1,
                      borderRadius: 1,
                      mt: 1
                    }}
                  >
                    {this.state.error && this.state.error.stack}
                    {this.state.errorInfo.componentStack}
                  </Box>
                </Alert>
              </Box>
            )}

            {/* Support Information */}
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                If this error persists, please contact support with the following information:
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                • Time: {new Date().toLocaleString()}<br/>
                • Page: {window.location.pathname}<br/>
                • User Agent: {navigator.userAgent.substring(0, 100)}...
              </Typography>
            </Box>
          </Box>
        </Container>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;