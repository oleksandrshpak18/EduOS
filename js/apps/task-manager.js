/**
 * TaskManagerApp: Диспетчер завдань EduOS
 * Дозволяє переглядати запущені процеси, завершувати їх та спостерігати
 * за модельними графіками завантаження CPU і оперативної пам'яті.
 */
import { BaseApp } from './base-app.js';
import { windowManager } from '../core/window-manager.js';
import { auditLogger } from '../core/audit-log.js';

export class TaskManagerApp extends BaseApp {
  constructor(win, params) {
    super(win, params);
    this.activeTab = 'processes';
    this.selectedWinId = null;
    this.perfInterval = null;
    this.cpuHistory = new Array(30).fill(15);
  }

  async init() {
    this.renderLayout();
    this.setTitle('Диспетчер завдань');
    await auditLogger.log('app_opened', { appId: 'task-manager' });
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="task-manager-layout">
        <div class="tm-tabs">
          <button class="tm-tab-btn active" data-tab="processes">Процеси</button>
          <button class="tm-tab-btn" data-tab="performance">Продуктивність</button>
        </div>

        <div class="tm-tab-content" id="tm-tab-content"></div>

        <div class="tm-footer">
          <button class="tm-btn-kill" id="tm-btn-kill" disabled>Зняти задачу</button>
        </div>
      </div>
    `;

    this.bindEvents();
    this.showProcessesTab();
  }

  bindEvents() {
    this.container.querySelectorAll('.tm-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.tm-tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = btn.dataset.tab;
        if (this.activeTab === 'processes') {
          if (this.perfInterval) clearInterval(this.perfInterval);
          this.showProcessesTab();
        } else {
          this.showPerformanceTab();
        }
      });
    });

    this.container.querySelector('#tm-btn-kill').addEventListener('click', () => {
      if (this.selectedWinId) {
        windowManager.closeWindow(this.selectedWinId);
        this.selectedWinId = null;
        this.showProcessesTab();
      }
    });
  }

  showProcessesTab() {
    const content = this.container.querySelector('#tm-tab-content');
    const btnKill = this.container.querySelector('#tm-btn-kill');
    btnKill.style.display = 'inline-block';
    btnKill.disabled = true;

    const windows = windowManager.getAllWindows();

    let html = `
      <table class="tm-table">
        <thead>
          <tr>
            <th>Назва процесу</th>
            <th>Стан</th>
            <th>ЦП (%)</th>
            <th>Пам'ять (МБ)</th>
          </tr>
        </thead>
        <tbody>
    `;

    windows.forEach((w) => {
      const cpu = (Math.random() * 3 + 0.5).toFixed(1);
      const mem = Math.round(24 + (w.title.length * 3));
      html += `
        <tr class="tm-row" data-win-id="${w.id}">
          <td>📱 ${w.title}</td>
          <td>${w.isMinimized ? 'Згорнуто' : 'Виконується'}</td>
          <td>${cpu}%</td>
          <td>${mem} МБ</td>
        </tr>
      `;
    });

    html += `
        <tr class="tm-row-system">
          <td>⚙️ EduOS Core Kernel</td>
          <td>Працює</td>
          <td>1.2%</td>
          <td>64 МБ</td>
        </tr>
      </tbody>
    </table>`;

    content.innerHTML = html;

    content.querySelectorAll('.tm-row').forEach((row) => {
      row.addEventListener('click', () => {
        content.querySelectorAll('.tm-row').forEach((r) => r.classList.remove('selected'));
        row.classList.add('selected');
        this.selectedWinId = row.dataset.winId;
        btnKill.disabled = false;
      });
    });
  }

  showPerformanceTab() {
    const content = this.container.querySelector('#tm-tab-content');
    const btnKill = this.container.querySelector('#tm-btn-kill');
    btnKill.style.display = 'none';

    content.innerHTML = `
      <div class="tm-perf-view">
        <div class="perf-metric-card">
          <h4>ЦП (Центральний процесор)</h4>
          <canvas id="perf-cpu-canvas" width="400" height="120"></canvas>
          <div class="perf-stats" id="perf-cpu-stat">Використання: 18%</div>
        </div>
        <div class="perf-metric-card">
          <h4>Пам'ять (RAM)</h4>
          <canvas id="perf-ram-canvas" width="400" height="120"></canvas>
          <div class="perf-stats">Використано: 2.1 ГБ / 8.0 ГБ</div>
        </div>
      </div>
    `;

    const canvas = content.querySelector('#perf-cpu-canvas');
    const ctx = canvas.getContext('2d');
    const statEl = content.querySelector('#perf-cpu-stat');

    const drawGraph = () => {
      const val = Math.round(10 + Math.random() * 25);
      this.cpuHistory.push(val);
      this.cpuHistory.shift();

      statEl.textContent = `Використання: ${val}% @ 3.20 GHz`;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0a2540';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Сітка
      ctx.strokeStyle = '#1e3d59';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Лінія графіка
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const step = canvas.width / (this.cpuHistory.length - 1);
      this.cpuHistory.forEach((v, i) => {
        const px = i * step;
        const py = canvas.height - (v / 100) * canvas.height;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    };

    drawGraph();
    this.perfInterval = setInterval(drawGraph, 1000);
  }

  destroy() {
    if (this.perfInterval) clearInterval(this.perfInterval);
    super.destroy();
  }
}
