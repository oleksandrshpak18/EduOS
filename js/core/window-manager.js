/**
 * WindowManager: Керування вікнами операційної системи EduOS
 * Відповідає за створення вікон, фокус, Z-Index, перетягування (Drag), зміну розміру (Resize),
 * згортання (Minimize), розгортання (Maximize) та безпеку меж екрана (Boundary Clamping).
 */
import { eventBus } from './event-bus.js';

class WindowManager {
  constructor() {
    this.windows = new Map(); // id -> WindowInstance
    this.activeWindowId = null;
    this.baseZIndex = 100;
    this.topZIndex = 100;
    this.container = null;
  }

  init(containerElement) {
    this.container = containerElement || document.getElementById('windows-container');

    // Обробка зміни розміру вікна браузера для збереження вікон у видимій зоні
    window.addEventListener('resize', () => {
      this.windows.forEach((win) => {
        this.clampWindowToBounds(win);
      });
    });
  }

  createWindow(options = {}) {
    const id = 'win_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    const title = options.title || 'Нове вікно';
    const icon = options.icon || 'window';
    const width = Math.min(options.width || 760, window.innerWidth - 40);
    const height = Math.min(options.height || 500, window.innerHeight - 90);

    // Розрахунок початкової позиції з каскадним зміщенням
    const offset = (this.windows.size % 8) * 28;
    const x = Math.max(20, Math.min(60 + offset, window.innerWidth - width - 20));
    const y = Math.max(20, Math.min(50 + offset, window.innerHeight - height - 60));

    const winInstance = {
      id,
      appId: options.appId || 'app',
      title,
      icon,
      x,
      y,
      width,
      height,
      minWidth: options.minWidth || 360,
      minHeight: options.minHeight || 260,
      isMinimized: false,
      isMaximized: false,
      isModal: options.isModal || false,
      zIndex: ++this.topZIndex,
      prevBounds: null,
      domElement: null,
      contentElement: null,
      appInstance: null,
      params: options.params || {}
    };

    // Створюємо DOM-елемент вікна
    const winEl = this.buildWindowDOM(winInstance);
    winInstance.domElement = winEl;
    winInstance.contentElement = winEl.querySelector('.window-body');

    this.container.appendChild(winEl);
    this.windows.set(id, winInstance);

    this.setupWindowInteractions(winInstance);
    this.focusWindow(id);

    eventBus.emit('window:created', winInstance);
    return winInstance;
  }

  buildWindowDOM(win) {
    const el = document.createElement('div');
    el.className = 'edu-window acrylic-window';
    el.id = win.id;
    el.style.left = `${win.x}px`;
    el.style.top = `${win.y}px`;
    el.style.width = `${win.width}px`;
    el.style.height = `${win.height}px`;
    el.style.zIndex = win.zIndex;

    el.innerHTML = `
      <div class="window-titlebar">
        <div class="window-title-group">
          <span class="window-icon-badge" data-icon="${win.icon}"></span>
          <span class="window-title-text">${win.title}</span>
        </div>
        <div class="window-controls">
          <button class="win-btn win-btn-minimize" title="Згорнути" aria-label="Згорнути">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor" stroke-width="1.2"/></svg>
          </button>
          <button class="win-btn win-btn-maximize" title="Розгорнути" aria-label="Розгорнути">
            <svg class="icon-max" width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
            <svg class="icon-restore" width="10" height="10" viewBox="0 0 10 10" style="display:none;"><path d="M3 1h6v6H7M1 3h6v6H1z" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
          </button>
          <button class="win-btn win-btn-close" title="Закрити" aria-label="Закрити">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.2"/></svg>
          </button>
        </div>
      </div>
      <div class="window-body"></div>
      <div class="window-resize-handle handle-n"></div>
      <div class="window-resize-handle handle-s"></div>
      <div class="window-resize-handle handle-e"></div>
      <div class="window-resize-handle handle-w"></div>
      <div class="window-resize-handle handle-ne"></div>
      <div class="window-resize-handle handle-nw"></div>
      <div class="window-resize-handle handle-se"></div>
      <div class="window-resize-handle handle-sw"></div>
    `;

    return el;
  }

  setupWindowInteractions(win) {
    const el = win.domElement;
    const titlebar = el.querySelector('.window-titlebar');
    const btnMin = el.querySelector('.win-btn-minimize');
    const btnMax = el.querySelector('.win-btn-maximize');
    const btnClose = el.querySelector('.win-btn-close');

    // Клік для активації
    el.addEventListener('mousedown', () => {
      this.focusWindow(win.id);
    });

    // Згортання
    btnMin.addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimizeWindow(win.id);
    });

    // Розгортання / Відновлення
    btnMax.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMaximizeWindow(win.id);
    });

    // Подвійний клік на тайтлбар розгортає вікно
    titlebar.addEventListener('dblclick', (e) => {
      if (e.target.closest('.window-controls')) return;
      this.toggleMaximizeWindow(win.id);
    });

    // Закриття
    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeWindow(win.id);
    });

    // Перетягування (Drag)
    this.setupDraggable(win, titlebar);

    // Зміна розмірів (Resize)
    this.setupResizable(win);
  }

  setupDraggable(win, handle) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialWinX = 0, initialWinY = 0;

    const onMouseDown = (e) => {
      if (e.target.closest('.window-controls')) return;
      if (win.isMaximized) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialWinX = win.x;
      initialWinY = win.y;

      document.body.classList.add('user-is-dragging');
      win.domElement.classList.add('is-dragging');

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newX = initialWinX + dx;
      let newY = initialWinY + dy;

      // Обмеження: вікно не зникає вгору за екран або за панель завдань
      newY = Math.max(0, Math.min(newY, window.innerHeight - 80));
      newX = Math.max(-win.width + 100, Math.min(newX, window.innerWidth - 100));

      win.x = newX;
      win.y = newY;
      win.domElement.style.left = `${newX}px`;
      win.domElement.style.top = `${newY}px`;
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove('user-is-dragging');
      win.domElement.classList.remove('is-dragging');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    handle.addEventListener('mousedown', onMouseDown);
  }

  setupResizable(win) {
    const handles = win.domElement.querySelectorAll('.window-resize-handle');

    handles.forEach((handle) => {
      handle.addEventListener('mousedown', (e) => {
        if (win.isMaximized) return;
        e.stopPropagation();
        e.preventDefault();

        const direction = handle.className.replace('window-resize-handle handle-', '');
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = win.width;
        const startH = win.height;
        const startLeft = win.x;
        const startTop = win.y;

        win.domElement.classList.add('is-resizing');

        const onResizeMove = (moveEvt) => {
          const dx = moveEvt.clientX - startX;
          const dy = moveEvt.clientY - startY;

          let newW = startW;
          let newH = startH;
          let newX = startLeft;
          let newY = startTop;

          if (direction.includes('e')) newW = Math.max(win.minWidth, startW + dx);
          if (direction.includes('s')) newH = Math.max(win.minHeight, startH + dy);
          if (direction.includes('w')) {
            const proposedW = startW - dx;
            if (proposedW >= win.minWidth) {
              newW = proposedW;
              newX = startLeft + dx;
            }
          }
          if (direction.includes('n')) {
            const proposedH = startH - dy;
            if (proposedH >= win.minHeight && startTop + dy >= 0) {
              newH = proposedH;
              newY = startTop + dy;
            }
          }

          win.width = newW;
          win.height = newH;
          win.x = newX;
          win.y = newY;

          win.domElement.style.width = `${newW}px`;
          win.domElement.style.height = `${newH}px`;
          win.domElement.style.left = `${newX}px`;
          win.domElement.style.top = `${newY}px`;
        };

        const onResizeUp = () => {
          win.domElement.classList.remove('is-resizing');
          window.removeEventListener('mousemove', onResizeMove);
          window.removeEventListener('mouseup', onResizeUp);
        };

        window.addEventListener('mousemove', onResizeMove);
        window.addEventListener('mouseup', onResizeUp);
      });
    });
  }

  clampWindowToBounds(win) {
    if (win.isMaximized) return;
    const maxX = window.innerWidth - 60;
    const maxY = window.innerHeight - 90;

    if (win.x > maxX) win.x = Math.max(20, maxX);
    if (win.y > maxY) win.y = Math.max(10, maxY);
    if (win.y < 0) win.y = 0;

    win.domElement.style.left = `${win.x}px`;
    win.domElement.style.top = `${win.y}px`;
  }

  focusWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;

    if (this.activeWindowId !== id) {
      if (this.activeWindowId) {
        const prev = this.windows.get(this.activeWindowId);
        if (prev && prev.domElement) {
          prev.domElement.classList.remove('active-window');
        }
      }

      this.activeWindowId = id;
      win.zIndex = ++this.topZIndex;
      win.domElement.style.zIndex = win.zIndex;
      win.domElement.classList.add('active-window');

      // Якщо вікно було згорнуте, відновлюємо його
      if (win.isMinimized) {
        win.isMinimized = false;
        win.domElement.style.display = 'flex';
      }

      eventBus.emit('window:focused', win);
    }
  }

  minimizeWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;

    win.isMinimized = true;
    win.domElement.style.display = 'none';

    if (this.activeWindowId === id) {
      this.activeWindowId = null;
      // Шукаємо інше активне вікно на екрані
      let nextTop = null;
      for (const w of this.windows.values()) {
        if (!w.isMinimized) {
          if (!nextTop || w.zIndex > nextTop.zIndex) {
            nextTop = w;
          }
        }
      }
      if (nextTop) {
        this.focusWindow(nextTop.id);
      }
    }

    eventBus.emit('window:minimized', win);
  }

  toggleMaximizeWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;

    const iconMax = win.domElement.querySelector('.icon-max');
    const iconRestore = win.domElement.querySelector('.icon-restore');

    if (!win.isMaximized) {
      win.prevBounds = { x: win.x, y: win.y, width: win.width, height: win.height };
      win.isMaximized = true;
      win.domElement.classList.add('maximized');
      if (iconMax) iconMax.style.display = 'none';
      if (iconRestore) iconRestore.style.display = 'block';
    } else {
      win.isMaximized = false;
      win.domElement.classList.remove('maximized');
      if (win.prevBounds) {
        win.x = win.prevBounds.x;
        win.y = win.prevBounds.y;
        win.width = win.prevBounds.width;
        win.height = win.prevBounds.height;
        win.domElement.style.left = `${win.x}px`;
        win.domElement.style.top = `${win.y}px`;
        win.domElement.style.width = `${win.width}px`;
        win.domElement.style.height = `${win.height}px`;
      }
      if (iconMax) iconMax.style.display = 'block';
      if (iconRestore) iconRestore.style.display = 'none';
    }

    this.focusWindow(id);
    eventBus.emit('window:maximized_changed', win);
  }

  closeWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;

    // Виклик методу завершення роботи програми
    if (win.appInstance && typeof win.appInstance.destroy === 'function') {
      try {
        win.appInstance.destroy();
      } catch (e) {
        console.error(`Error in app destroy for ${win.appId}:`, e);
      }
    }

    if (win.domElement && win.domElement.parentNode) {
      win.domElement.parentNode.removeChild(win.domElement);
    }

    this.windows.delete(id);

    if (this.activeWindowId === id) {
      this.activeWindowId = null;
      let nextTop = null;
      for (const w of this.windows.values()) {
        if (!w.isMinimized && (!nextTop || w.zIndex > nextTop.zIndex)) {
          nextTop = w;
        }
      }
      if (nextTop) this.focusWindow(nextTop.id);
    }

    eventBus.emit('window:closed', { id, appId: win.appId });
  }

  setTitle(id, newTitle) {
    const win = this.windows.get(id);
    if (win) {
      win.title = newTitle;
      const titleText = win.domElement.querySelector('.window-title-text');
      if (titleText) titleText.textContent = newTitle;
      eventBus.emit('window:title_changed', win);
    }
  }

  getWindow(id) {
    return this.windows.get(id) || null;
  }

  getAllWindows() {
    return Array.from(this.windows.values());
  }
}

export const windowManager = new WindowManager();
