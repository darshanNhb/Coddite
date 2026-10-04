import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSocket } from '../../api/socket';
import { useAuth } from '../../contexts/AuthContext';

export function LiveNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const socket = getSocket();
    
    const handleNotification = (data) => {
      toast(data.message, {
        icon: '🔔',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [user]);

  return null; // Renders nothing, just listens
}
