import { v7 as uuidv7 } from 'uuid';

import { prisma } from '../lib/prisma.js';
import { emitToProfile } from '../lib/socket.js';
import { getNotificationPreferences } from '../modules/profiles/profiles.service.js';

/**
 *
 * @param profileId
 * @param type
 * @param title
 * @param message
 * @param linkUrl
 */
export async function sendNotification(profileId, type, title, message, linkUrl = null) {
  const prefs = await getNotificationPreferences(profileId);
  if (!prefs[type]) return null;

  const notification = await prisma.notification.create({
    data: {
      id: uuidv7(),
      profileId,
      type,
      title,
      message,
      linkUrl
    }
  });

  emitToProfile(profileId, 'notification', { type, title, message, linkUrl });
  
  return notification;
}
