import React from 'react';
import { Box, CircularProgress, Typography, Container } from '@mui/material';

/**
 * Loading Spinner Component
 * 
 * Displays a centered loading spinner with optional message
 * 
 * @param {Object} props
 * @param {string} props.message - Optional loading message
 * @param {string} props.size - Size of the spinner (default: 40)
 * @param {boolean} props.fullScreen - Whether to take full screen height
 */
const LoadingSpinner = ({ 
  message = 'Loading...', 
  size = 40, 
  fullScreen = true 
}) => {
  return (
    <Container>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: fullScreen ? '100vh' : '200px',
          gap: 2
        }}
      >
        <CircularProgress size={size} />
        {message && (
          <Typography variant="body1" color="text.secondary">
            {message}
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default LoadingSpinner;