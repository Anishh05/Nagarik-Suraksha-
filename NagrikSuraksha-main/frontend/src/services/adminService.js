import api from './authService';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const adminService = {
  // Police Admin Authentication
  async policeLogin(username, password) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/admin/login`, {
        username,
        password
      });

      if (response.data.success) {
        localStorage.setItem('adminToken', response.data.token);
        localStorage.setItem('adminData', JSON.stringify(response.data.admin));
        
        // Setup axios interceptor for admin requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        return response.data;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Police login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  },

  async getCurrentAdmin() {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No admin token found');
      
      const response = await axios.get(`${API_BASE_URL}/auth/admin/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Get current admin error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get admin info');
    }
  },

  async getComplaints() {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No admin token found');
      
      const response = await axios.get(`${API_BASE_URL}/auth/admin/complaints`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Get complaints error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get complaints');
    }
  },

  async submitComplaint(complaintData) {
    try {
      // Use user token instead of admin token for complaint submission
      const userToken = localStorage.getItem('token');
      if (!userToken) {
        throw new Error('User not authenticated. Please login first.');
      }
      
      const response = await axios.post(`${API_BASE_URL}/auth/admin/complaints`, complaintData, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Submit complaint error:', error);
      throw new Error(error.response?.data?.message || 'Failed to submit complaint');
    }
  },

  async submitSosRequest(sosData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/admin/sos-requests`, sosData);
      return response.data;
    } catch (error) {
      console.error('Submit SOS request error:', error);
      throw new Error(error.response?.data?.message || 'Failed to submit SOS request');
    }
  },

  async getEmergencySOS() {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No admin token found');
      
      const response = await axios.get(`${API_BASE_URL}/auth/admin/emergency-sos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Get emergency SOS error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get emergency SOS alerts');
    }
  },

  async updateSOSStatus(username, status) {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No admin token found');
      
      const response = await axios.put(`${API_BASE_URL}/auth/admin/emergency-sos/${username}/status`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Update SOS status error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update SOS status');
    }
  },

  async resolveEmergencySOS(username, resolution) {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No admin token found');
      
      const response = await axios.put(`${API_BASE_URL}/auth/admin/emergency-sos/${username}/resolve`, 
        { resolution },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Resolve emergency SOS error:', error);
      throw new Error(error.response?.data?.message || 'Failed to resolve emergency SOS');
    }
  },

  async resolveComplaint(complaintId, resolution, notes) {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No admin token found');
      
      const response = await axios.post(`${API_BASE_URL}/auth/admin/complaints/${complaintId}/resolve`, 
        { resolution, notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Resolve complaint error:', error);
      throw new Error(error.response?.data?.message || 'Failed to resolve complaint');
    }
  },

  async getEmergencySOSHistory(limit = 50) {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No admin token found');
      
      const response = await axios.get(`${API_BASE_URL}/auth/admin/emergency-sos/history?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Get emergency SOS history error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get emergency SOS history');
    }
  },

  async getResolvedComplaints() {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No admin token found');
      
      // Get all complaints and filter resolved ones
      const response = await axios.get(`${API_BASE_URL}/auth/admin/complaints`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const resolvedComplaints = response.data.complaints.filter(complaint => 
          complaint.status === 'resolved'
        );
        return {
          success: true,
          complaints: resolvedComplaints
        };
      }
      return response.data;
    } catch (error) {
      console.error('Get resolved complaints error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get resolved complaints');
    }
  },

  policeLogout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    delete axios.defaults.headers.common['Authorization'];
  },

  isPoliceAuthenticated() {
    return !!localStorage.getItem('adminToken');
  },

  getAdminData() {
    const adminData = localStorage.getItem('adminData');
    return adminData ? JSON.parse(adminData) : null;
  },

  // Existing admin functions
  async getAllUsers() {
    try {
      const response = await api.get('/admin/users');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get users');
    }
  },

  async updateUser(userId, updateData) {
    try {
      const response = await api.put(`/admin/users/${userId}`, updateData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update user');
    }
  },

  async deleteUser(userId) {
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete user');
    }
  },

  async getAllEmergencies() {
    try {
      const response = await api.get('/admin/emergencies');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get emergencies');
    }
  },

  async getSystemStats() {
    try {
      const response = await api.get('/admin/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get system stats');
    }
  },

  async promoteUserToAdmin(userId) {
    try {
      const response = await api.put(`/admin/users/${userId}/promote`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to promote user');
    }
  }
};