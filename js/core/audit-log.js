/**
 * AuditLogger: Журнал аудиту дій учня у віртуальній операційній системі
 * Фіксує системні дії для перевірки виконання практичних завдань (наприклад: чи файл був саме скопійований).
 */
import { storage } from './storage.js';
import { profileManager } from './profiles.js';

class AuditLogger {
  constructor() {
    this.inMemoryLog = [];
  }

  async log(action, details = {}) {
    const profileId = profileManager.currentProfile ? profileManager.currentProfile.profileId : 'guest';
    const entry = {
      profileId,
      action,
      details,
      timestamp: Date.now()
    };

    this.inMemoryLog.push(entry);
    if (this.inMemoryLog.length > 500) {
      this.inMemoryLog.shift();
    }

    try {
      await storage.put('audit_logs', entry);
    } catch (e) {
      console.warn('[AuditLogger] Could not persist log entry:', e);
    }

    return entry;
  }

  hasAction(actionType, filterFn = null) {
    return this.inMemoryLog.some((entry) => {
      if (entry.action !== actionType) return false;
      if (filterFn && typeof filterFn === 'function') {
        return filterFn(entry.details);
      }
      return true;
    });
  }

  getRecentLogs(limit = 50) {
    return this.inMemoryLog.slice(-limit);
  }

  clear() {
    this.inMemoryLog = [];
  }
}

export const auditLogger = new AuditLogger();
