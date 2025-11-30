import React from 'react';
import { Box, Typography, Container, Link } from '@mui/material';
import { Warning } from '@mui/icons-material';

/**
 * Footer Component
 * 
 * Displays footer information for the application
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: 'grey.100',
        borderTop: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          {/* Logo and Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="primary" />
            <Typography variant="h6" color="primary">
              Emergency Response System
            </Typography>
          </Box>

          {/* Copyright and Links */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              gap: { xs: 1, sm: 3 },
              textAlign: 'center'
            }}
          >
            <Typography variant="body2" color="text.secondary">
              © {currentYear} Emergency Response System. All rights reserved.
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Link
                href="#"
                variant="body2"
                color="text.secondary"
                underline="hover"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                variant="body2"
                color="text.secondary"
                underline="hover"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                variant="body2"
                color="text.secondary"
                underline="hover"
              >
                Support
              </Link>
            </Box>
          </Box>
        </Box>

        {/* Emergency Notice */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            🚨 In case of immediate emergency, please call your local emergency services (911, 112, etc.)
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;