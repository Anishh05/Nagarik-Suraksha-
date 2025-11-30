import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

/**
 * ProtectedRoute Component
 * 
 * Protects routes that require authentication.
 * Optionally can require admin privileges.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if authorized
 * @param {boolean} props.adminOnly - Whether this route requires admin privileges
 * @param {string} props.redirectTo - Where to redirect if not authorized (default: /login)
 */
const ProtectedRoute = ({ 
  children, 
  adminOnly = false, 
  redirectTo = '/login' 
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner />;
  }

  // If not authenticated, redirect to login with return path
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // If admin route but user is not admin, redirect to dashboard
  if (adminOnly && user?.role !== 'admin') {
    return (
      <Navigate 
        to="/dashboard" 
        state={{ 
          error: 'Access denied. Admin privileges required.' 
        }} 
        replace 
      />
    );
  }

  // If user is not verified, they can only access certain routes
  if (!user?.isVerified && location.pathname !== '/dashboard') {
    return (
      <Navigate 
        to="/dashboard" 
        state={{ 
          warning: 'Please verify your account to access all features.' 
        }} 
        replace 
      />
    );
  }

  // User is authenticated and authorized
  return children;
};

export default ProtectedRoute;