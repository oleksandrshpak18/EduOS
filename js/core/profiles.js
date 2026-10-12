/**
 * ProfileManager: Керування локальними профілями учнів
 * Дозволяє зберігати незалежні робочі столи, файлові системи та прогрес для різних учнів.
 */
import { storage } from './storage.js';
import { eventBus } from './event-bus.js';

class ProfileManager {
  constructor() {
    this.currentProfile = null;
    this.defaultSettings = {
      theme: 'dark',
      wallpaper: 'assets/wallpapers/default_fluent.jpg',
      iconSize: 'medium',
      volume: 80
    };
  }

  generateProfileId(lastName, firstName, gradeClass) {
    const clean = (s) => (s || '').trim().toLowerCase().replace(/[^a-z0-9а-яіїєґ]/gi, '_');
    return `${clean(lastName)}_${clean(firstName)}_${clean(gradeClass)}`;
  }

  async login(lastName, firstName, gradeClass) {
    const lName = (lastName || '').trim();
    const fName = (firstName || '').trim();
    const gClass = (gradeClass || '').trim();

    if (!lName || !fName || !gClass) {
      throw new Error('Будь ласка, заповніть усі поля: Прізвище, Ім\'я та Клас.');
    }

    if (lName.length > 50 || fName.length > 50 || gClass.length > 20) {
      throw new Error('Перевищено максимальну довжину символів у полях профілю.');
    }

    const profileId = this.generateProfileId(lName, fName, gClass);
    let profile = await storage.get('profiles', profileId);

    const now = Date.now();
    if (!profile) {
      profile = {
        profileId,
        lastName: lName,
        firstName: fName,
        gradeClass: gClass,
        displayName: `${lName} ${fName} (${gClass})`,
        createdAt: now,
        lastLoginAt: now,
        settings: { ...this.defaultSettings }
      };
      await storage.put('profiles', profile);
    } else {
      profile.lastLoginAt = now;
      await storage.put('profiles', profile);
    }

    this.currentProfile = profile;
    localStorage.setItem('eduos_last_profile_id', profileId);
    eventBus.emit('profile:login', this.currentProfile);
    return profile;
  }

  logout() {
    const prev = this.currentProfile;
    this.currentProfile = null;
    localStorage.removeItem('eduos_last_profile_id');
    eventBus.emit('profile:logout', prev);
  }

  async updateSettings(partialSettings) {
    if (!this.currentProfile) return;
    this.currentProfile.settings = {
      ...this.currentProfile.settings,
      ...partialSettings
    };
    await storage.put('profiles', this.currentProfile);
    eventBus.emit('settings:updated', this.currentProfile.settings);
  }

  async listProfiles() {
    return await storage.getAll('profiles');
  }

  async deleteProfile(profileId) {
    if (this.currentProfile && this.currentProfile.profileId === profileId) {
      this.logout();
    }
    await storage.delete('profiles', profileId);

    // Видаляємо всі вузли файлової системи цього профілю
    const nodes = await storage.getByIndex('vfs_nodes', 'by_profile', profileId);
    const nodeKeys = nodes.map((n) => n.id);
    await storage.deleteBulk('vfs_nodes', nodeKeys);

    eventBus.emit('profile:deleted', profileId);
  }

  async getLastProfile() {
    const lastId = localStorage.getItem('eduos_last_profile_id');
    if (lastId) {
      return await storage.get('profiles', lastId);
    }
    return null;
  }
}

export const profileManager = new ProfileManager();
