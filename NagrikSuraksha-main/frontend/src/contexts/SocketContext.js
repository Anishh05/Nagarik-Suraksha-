import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000', {
      autoConnect: false
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const connectSocket = (token) => {
    if (socket && token) {
      socket.auth = { token };
      socket.connect();
    }
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
    }
  };

  const sendSOS = (sosData) => {
    return new Promise((resolve, reject) => {
      if (socket && isConnected) {
        socket.emit('emergency:sos', sosData, (response) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'Failed to send SOS'));
          }
        });
      } else {
        reject(new Error('Socket not connected'));
      }
    });
  };

  const sendLocation = (locationData) => {
    return new Promise((resolve, reject) => {
      if (socket && isConnected) {
        socket.emit('location:update', locationData, (response) => {
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'Failed to send location'));
          }
        });
      } else {
        reject(new Error('Socket not connected'));
      }
    });
  };

  const value = {
    socket,
    isConnected,
    connectSocket,
    disconnectSocket,
    sendSOS,
    sendLocation
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};