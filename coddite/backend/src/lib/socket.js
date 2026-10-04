import { Server } from 'socket.io';

import { verifyAccessToken } from '../utils/jwt.js';

import { logger } from './logger.js';
import { prisma } from './prisma.js';

let io;

/**
 *
 * @param server
 */
export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    }
  });

  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) return next(new Error('Authentication error'));
      
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map(c => {
          const [k, v] = c.trim().split('=');
          return [k, decodeURIComponent(v)];
        })
      );
      
      const token = cookies['accessToken'];
      if (!token) return next(new Error('Authentication error'));

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: { profile: true }
      });

      if (!user) return next(new Error('Authentication error'));

      socket.user = user;
      socket.profile = user.profile;
      
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (Profile: ${socket.profile.id})`);
    
    // Join a room specifically for this user to receive direct notifications
    socket.join(`profile_${socket.profile.id}`);

    // Join rooms for post live updates
    socket.on('join_post', (postId) => {
      socket.join(`post_${postId}`);
    });

    socket.on('leave_post', (postId) => {
      socket.leave(`post_${postId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 *
 */
export function getIO() {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
}

/**
 *
 * @param profileId
 * @param event
 * @param data
 */
export function emitToProfile(profileId, event, data) {
  if (io) {
    io.to(`profile_${profileId}`).emit(event, data);
  }
}

/**
 *
 * @param postId
 * @param event
 * @param data
 */
export function emitToPost(postId, event, data) {
  if (io) {
    io.to(`post_${postId}`).emit(event, data);
  }
}
