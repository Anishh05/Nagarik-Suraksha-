import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import page components
import Login from './components/pages/Login';
import Register from './components/pages/Register';
import Dashboard from './components/pages/Dashboard';
import Admin from './components/pages/Admin';
import PoliceLogin from './components/pages/PoliceLogin';
import PoliceDashboard from './components/pages/PoliceDashboard';

// Import utility components
import ProtectedRoute from './components/common/ProtectedRoute';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';

// Import context providers
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { LocationProvider } from './contexts/LocationContext';

// Import custom hooks
import { useAuth } from './hooks/useAuth';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
      contrastText: '#ffffff'
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f'
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00'
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c'
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff'
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 16px'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8
          }
        }
      }
    }
  }
});

/**
 * App Layout Component
 * Provides the main layout structure with navigation and content area
 */
function AppLayout({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="app-layout">
      {user && <Navbar />}
      <main className="main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
}

/**
 * Main App Component
 * Sets up routing, theme, and global providers
 */
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <SocketProvider>
            <LocationProvider>
              <Router>
                <AppLayout>
                  <Routes>
                    {/* Public Routes */}
                    <Route 
                      path="/login" 
                      element={<Login />} 
                    />
                    <Route 
                      path="/register" 
                      element={<Register />} 
                    />

                    {/* Police Routes */}
                    <Route 
                      path="/police-login" 
                      element={<PoliceLogin />} 
                    />
                    <Route 
                      path="/police-dashboard" 
                      element={<PoliceDashboard />} 
                    />

                    {/* Protected Routes */}
                    <Route 
                      path="/dashboard" 
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      } 
                    />
                    
                    <Route 
                      path="/admin" 
                      element={
                        <ProtectedRoute adminOnly={true}>
                          <Admin />
                        </ProtectedRoute>
                      } 
                    />

                    {/* Default Routes */}
                    <Route 
                      path="/" 
                      element={<Navigate to="/dashboard" replace />} 
                    />
                    
                    {/* 404 Route */}
                    <Route 
                      path="*" 
                      element={
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          height: '100vh',
                          textAlign: 'center'
                        }}>
                          <h1>404 - Page Not Found</h1>
                          <p>The page you're looking for doesn't exist.</p>
                          <button 
                            onClick={() => window.history.back()}
                            style={{
                              padding: '10px 20px',
                              backgroundColor: '#1976d2',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              marginTop: '20px'
                            }}
                          >
                            Go Back
                          </button>
                        </div>
                      } 
                    />
                  </Routes>
                </AppLayout>
              </Router>

              {/* Global Toast Notifications */}
              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
              />
            </LocationProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;