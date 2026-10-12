/**
 * ProgressManager: Збереження та облік прогресу практичних робіт учня в IndexedDB
 */
import { storage } from '../core/storage.js';

class ProgressManager {
  async saveProgress(profileId, packageId, data) {
    const id = `${profileId}_${packageId}`;
    const record = {
      id,
      profileId,
      packageId,
      ...data,
      updatedAt: Date.now()
    };
    await storage.put('learning_progress', record);
    return record;
  }

  async getProgress(profileId, packageId) {
    const id = `${profileId}_${packageId}`;
    return await storage.get('learning_progress', id);
  }

  async getProfileAll(profileId) {
    return await storage.getByIndex('learning_progress', 'by_profile', profileId);
  }
}

export const progressManager = new ProgressManager();
