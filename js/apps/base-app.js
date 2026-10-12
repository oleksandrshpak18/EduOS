/**
 * BaseApp: Базовий клас для всіх вбудованих додатків EduOS
 * Визначає стандартизований життєвий цикл програми всередині вікна.
 */
export class BaseApp {
  constructor(windowInstance, params = {}) {
    this.win = windowInstance;
    this.params = params;
    this.container = windowInstance ? windowInstance.contentElement : null;
    this.unsubscribers = [];
  }

  async init() {
    // Перевизначається у нащадках
  }

  destroy() {
    // Очищення підписок на події та таймерів
    this.unsubscribers.forEach((unsub) => {
      if (typeof unsub === 'function') unsub();
    });
    this.unsubscribers = [];
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  setTitle(newTitle) {
    if (this.win) {
      import('../core/window-manager.js').then(({ windowManager }) => {
        windowManager.setTitle(this.win.id, newTitle);
      });
    }
  }
}
