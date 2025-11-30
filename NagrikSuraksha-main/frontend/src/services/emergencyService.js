import api from './authService';

export const emergencyService = {
  async createEmergency(emergencyData) {
    try {
      const response = await api.post('/emergency', emergencyData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create emergency');
    }
  },

  async getEmergencies() {
    try {
      const response = await api.get('/emergency');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get emergencies');
    }
  },

  async updateEmergency(id, updateData) {
    try {
      const response = await api.put(`/emergency/${id}`, updateData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update emergency');
    }
  },

  async deleteEmergency(id) {
    try {
      const response = await api.delete(`/emergency/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete emergency');
    }
  },

  async sendSOS(location) {
    try {
      const response = await api.post('/emergency/sos', { location });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to send SOS');
    }
  }
};