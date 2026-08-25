import { Request, Response } from 'express';
import { getSocketService } from '../services/socket.service';

export const broadcastNotification = async (req: Request, res: Response) => {
  try {
    const { title, message, type, audience } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const notification = {
      id: Math.random().toString(36).substring(7),
      title,
      message,
      type: type || 'info',
      createdAt: new Date(),
      isRead: false
    };

    const socketService = getSocketService();
    
    // Broadcast based on audience
    if (audience === 'admins') {
      socketService.broadcastNotification(notification, 'admin');
      socketService.broadcastNotification(notification, 'superadmin');
    } else if (audience === 'moderators') {
      socketService.broadcastNotification(notification, 'moderator');
    } else {
      socketService.broadcastNotification(notification);
    }

    return res.status(200).json({ success: true, message: 'Notification broadcasted successfully', notification });
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    return res.status(500).json({ success: false, message: 'Failed to broadcast notification' });
  }
};
