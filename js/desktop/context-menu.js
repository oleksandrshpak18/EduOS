/**
 * ContextMenuService: Універсальне системне контекстне меню EduOS
 * Відображає кастомні меню при правому клацанні миші на робочому столі,
 * файлах, папках та панелі завдань.
 */
class ContextMenuService {
  constructor() {
    this.menuElement = null;
    this.isOpen = false;
  }

  init() {
    this.menuElement = document.createElement('div');
    this.menuElement.className = 'edu-context-menu acrylic-menu';
    this.menuElement.style.display = 'none';
    document.body.appendChild(this.menuElement);

    // Закриття меню при кліку в будь-якому місці
    window.addEventListener('mousedown', (e) => {
      if (!this.menuElement.contains(e.target)) {
        this.hide();
      }
    });

    // Закриття при натисканні Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });

    // Заборона стандартного контекстного меню браузера в межах системи
    window.addEventListener('contextmenu', (e) => {
      // Дозволяємо стандартне меню лише якщо затиснуто Shift (для налагодження)
      if (!e.shiftKey) {
        e.preventDefault();
      }
    });
  }

  show(items = [], x = 0, y = 0) {
    if (!items || items.length === 0) return;

    this.menuElement.innerHTML = '';
    const ul = document.createElement('ul');
    ul.className = 'context-menu-list';

    items.forEach((item) => {
      if (item.separator) {
        const sep = document.createElement('li');
        sep.className = 'context-menu-separator';
        ul.appendChild(sep);
        return;
      }

      const li = document.createElement('li');
      li.className = `context-menu-item ${item.disabled ? 'disabled' : ''}`;
      li.innerHTML = `
        <span class="context-item-icon">${item.iconHtml || ''}</span>
        <span class="context-item-label">${item.label}</span>
        ${item.shortcut ? `<span class="context-item-shortcut">${item.shortcut}</span>` : ''}
      `;

      if (!item.disabled) {
        li.addEventListener('click', (e) => {
          e.stopPropagation();
          this.hide();
          if (typeof item.action === 'function') {
            item.action();
          }
        });
      }

      ul.appendChild(li);
    });

    this.menuElement.appendChild(ul);
    this.menuElement.style.display = 'block';

    // Корекція положення, щоб меню не виходило за межі екрана
    const rect = this.menuElement.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let posX = x;
    let posY = y;

    if (posX + rect.width > winW) posX = winW - rect.width - 10;
    if (posY + rect.height > winH) posY = winH - rect.height - 10;
    if (posX < 0) posX = 10;
    if (posY < 0) posY = 10;

    this.menuElement.style.left = `${posX}px`;
    this.menuElement.style.top = `${posY}px`;
    this.isOpen = true;
  }

  hide() {
    if (this.isOpen) {
      this.menuElement.style.display = 'none';
      this.menuElement.innerHTML = '';
      this.isOpen = false;
    }
  }
}

export const contextMenu = new ContextMenuService();
