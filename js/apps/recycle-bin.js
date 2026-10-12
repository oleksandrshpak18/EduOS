/**
 * RecycleBinApp: Додаток «Кошик» для EduOS
 * Дозволяє переглядати видалені об'єкти, відновлювати їх у початкове розташування
 * або очищати кошик повністю.
 */
import { BaseApp } from './base-app.js';
import { vfs } from '../core/filesystem.js';
import { eventBus } from '../core/event-bus.js';

export class RecycleBinApp extends BaseApp {
  constructor(win, params) {
    super(win, params);
    this.selectedId = null;
  }

  async init() {
    this.renderLayout();
    this.renderItems();

    const unsub = eventBus.on('vfs:change', () => this.renderItems());
    this.unsubscribers.push(unsub);
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="recycle-bin-layout">
        <div class="recycle-bin-toolbar">
          <button class="rb-btn" id="rb-btn-empty">
            <span>🧹</span> Очистити кошик
          </button>
          <button class="rb-btn" id="rb-btn-restore" disabled>
            <span>↩️</span> Відновити елемент
          </button>
          <button class="rb-btn" id="rb-btn-delete" disabled>
            <span>❌</span> Видалити назавжди
          </button>
        </div>

        <div class="recycle-bin-table-wrapper">
          <table class="recycle-bin-table">
            <thead>
              <tr>
                <th>Ім'я</th>
                <th>Початкове розташування</th>
                <th>Дата видалення</th>
                <th>Розмір</th>
              </tr>
            </thead>
            <tbody id="rb-table-body"></tbody>
          </table>
        </div>

        <div class="recycle-bin-statusbar">
          <span id="rb-status-text">Кошик порожній</span>
        </div>
      </div>
    `;

    this.bindEvents();
    this.setTitle('Кошик');
  }

  bindEvents() {
    const btnEmpty = this.container.querySelector('#rb-btn-empty');
    const btnRestore = this.container.querySelector('#rb-btn-restore');
    const btnDelete = this.container.querySelector('#rb-btn-delete');

    btnEmpty.addEventListener('click', async () => {
      if (confirm('Очистити Кошик? Усі видалені файли буде знищено назавжди.')) {
        await vfs.emptyTrash();
      }
    });

    btnRestore.addEventListener('click', async () => {
      if (this.selectedId) {
        try {
          await vfs.restoreFromTrash(this.selectedId);
          this.selectedId = null;
          this.updateButtons();
        } catch (e) {
          alert(e.message);
        }
      }
    });

    btnDelete.addEventListener('click', async () => {
      if (this.selectedId) {
        if (confirm('Остаточно видалити цей файл?')) {
          await vfs.deleteNode(this.selectedId, true);
          this.selectedId = null;
          this.updateButtons();
        }
      }
    });
  }

  updateButtons() {
    const btnRestore = this.container.querySelector('#rb-btn-restore');
    const btnDelete = this.container.querySelector('#rb-btn-delete');
    btnRestore.disabled = !this.selectedId;
    btnDelete.disabled = !this.selectedId;
  }

  renderItems() {
    const tbody = this.container.querySelector('#rb-table-body');
    const statusText = this.container.querySelector('#rb-status-text');
    if (!tbody) return;

    let trash = null;
    for (const n of vfs.nodes.values()) {
      if (n.type === 'drive' && n.metadata && n.metadata.isRecycleBin) {
        trash = n;
        break;
      }
    }

    if (!trash) {
      tbody.innerHTML = '<tr><td colspan="4">Кошик недоступний</td></tr>';
      return;
    }

    const items = vfs.listChildren(trash.id);
    tbody.innerHTML = '';

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="rb-empty-msg">Кошик порожній</td></tr>';
      statusText.textContent = '0 об\'єктів у Кошику';
      this.selectedId = null;
      this.updateButtons();
      return;
    }

    statusText.textContent = `Об'єктів у Кошику: ${items.length}`;

    items.forEach((item) => {
      const tr = document.createElement('tr');
      tr.className = `rb-row ${this.selectedId === item.id ? 'selected' : ''}`;
      tr.dataset.id = item.id;

      const origPath = (item.metadata && item.metadata.originalPath) || 'Невідомо';
      const deletedDate = item.metadata && item.metadata.deletedAt
        ? new Date(item.metadata.deletedAt).toLocaleString('uk-UA')
        : 'Щойно';
      const sizeStr = `${Math.ceil((item.size || 0) / 1024)} КБ`;

      tr.innerHTML = `
        <td>${item.type === 'directory' ? '📁' : '📄'} ${item.name}</td>
        <td>${origPath}</td>
        <td>${deletedDate}</td>
        <td>${sizeStr}</td>
      `;

      tr.addEventListener('click', () => {
        tbody.querySelectorAll('.rb-row').forEach((r) => r.classList.remove('selected'));
        tr.classList.add('selected');
        this.selectedId = item.id;
        this.updateButtons();
      });

      tbody.appendChild(tr);
    });
  }
}
