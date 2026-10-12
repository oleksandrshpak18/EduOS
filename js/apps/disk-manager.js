/**
 * DiskManagerApp: Навчальна утиліта «Керування дисками» для EduOS
 * Дозволяє переглядати віртуальні диски, їхню місткість, форматувати навчальний диск D:.
 */
import { BaseApp } from './base-app.js';
import { vfs } from '../core/filesystem.js';
import { auditLogger } from '../core/audit-log.js';
import { dialogs } from '../core/dialogs.js';

export class DiskManagerApp extends BaseApp {
  constructor(win, params) {
    super(win, params);
  }

  async init() {
    this.renderLayout();
    this.setTitle('Керування дисками');
    await auditLogger.log('app_opened', { appId: 'disk-manager' });
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="disk-manager-layout">
        <div class="disk-manager-header">
          <h3>Томи віртуального накопичувача</h3>
          <p>Операції виконуються виключно над ізольованою файловою системою в браузері.</p>
        </div>

        <div class="disks-list" id="dm-disks-list"></div>

        <div class="disk-manager-footer">
          <button class="dm-btn" id="dm-btn-refresh">Оновити стан</button>
          <button class="dm-btn dm-btn-danger" id="dm-btn-format-d">Форматувати диск (D:)</button>
        </div>
      </div>
    `;

    this.renderDisks();
    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelector('#dm-btn-refresh').addEventListener('click', () => this.renderDisks());
    this.container.querySelector('#dm-btn-format-d').addEventListener('click', async () => {
      const confirmed = await dialogs.confirm(
        'УВАГА: Форматування повністю видалить усі файли та папки на диску D:!\nВи дійсно бажаєте продовжити?',
        { title: 'Форматування диска D:', danger: true, confirmText: 'Форматувати', cancelText: 'Скасувати' }
      );
      if (confirmed) {
        try {
          await vfs.formatDisk('D:');
          await dialogs.alert('Диск D: успішно відформатовано.', { icon: 'success', title: 'Керування дисками' });
          this.renderDisks();
        } catch (e) {
          await dialogs.alert(e.message, { icon: 'error', title: 'Помилка форматування' });
        }
      }
    });
  }

  renderDisks() {
    const listEl = this.container.querySelector('#dm-disks-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const driveC = vfs.resolvePath('C:\\');
    const driveD = vfs.resolvePath('D:\\');

    const drives = [
      { name: 'Локальний диск (C:)', letter: 'C:', totalGb: 120, usedMb: 340, node: driveC, canFormat: false },
      { name: 'Навчальний диск (D:)', letter: 'D:', totalGb: 80, usedMb: 120, node: driveD, canFormat: true }
    ];

    drives.forEach((d) => {
      let childCount = 0;
      if (d.node) {
        childCount = vfs.listChildren(d.node.id).length;
      }
      const pct = Math.min(100, Math.max(5, (d.usedMb / (d.totalGb * 1024)) * 100 * 20));

      const card = document.createElement('div');
      card.className = 'disk-card';
      card.innerHTML = `
        <div class="disk-card-icon">💽</div>
        <div class="disk-card-details">
          <div class="disk-card-title">${d.name} [Файлова система: EduFAT32]</div>
          <div class="disk-progress-bar">
            <div class="disk-progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="disk-card-sub">
            <span>Об'єктів: ${childCount}</span>
            <span>Місткість: ${d.totalGb} ГБ</span>
            <span>Стан: Справний (Основний розділ)</span>
          </div>
        </div>
      `;

      listEl.appendChild(card);
    });
  }
}
