/**
 * NetworkApp: Мережеве оточення для EduOS
 * Моделює локальну комп'ютерну мережу класу, спільні мережеві ресурси та утиліту ping.
 */
import { BaseApp } from './base-app.js';
import { vfs } from '../core/filesystem.js';

export class NetworkApp extends BaseApp {
  constructor(win, params) {
    super(win, params);
  }

  async init() {
    this.renderLayout();
    this.setTitle('Мережеве оточення');
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="network-layout">
        <div class="network-header">
          <h3>Локальна мережа комп'ютерного класу</h3>
          <p>Робоча група: <strong>SCHOOL-NET (192.168.1.0/24)</strong></p>
        </div>

        <div class="network-devices-grid">
          <div class="network-card" data-device="server">
            <div class="net-icon">🖥️</div>
            <div class="net-title">SERVER-SCHOOL</div>
            <div class="net-ip">192.168.1.1 (Шкільний сервер)</div>
            <button class="net-open-btn">Відкрити спільні файли</button>
          </div>

          <div class="network-card" data-device="pc01">
            <div class="net-icon">💻</div>
            <div class="net-title">LAB-PC-01</div>
            <div class="net-ip">192.168.1.101 (Комп'ютер 1)</div>
            <button class="net-open-btn">Спільні ресурси</button>
          </div>

          <div class="network-card" data-device="pc02">
            <div class="net-icon">💻</div>
            <div class="net-title">LAB-PC-02</div>
            <div class="net-ip">192.168.1.102 (Комп'ютер 2)</div>
            <button class="net-open-btn">Спільні ресурси</button>
          </div>
        </div>

        <!-- Ping утиліта -->
        <div class="network-ping-box">
          <h4>Діагностика з'єднання (Ping)</h4>
          <div class="ping-input-row">
            <input type="text" id="ping-target" value="192.168.1.1" placeholder="IP-адреса або ім'я вузла" />
            <button id="ping-run-btn">Перевірити зв'язок</button>
          </div>
          <div class="ping-output" id="ping-output">Натисніть «Перевірити зв'язок» для запуску діагностики.</div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelectorAll('.network-card').forEach((card) => {
      card.querySelector('.net-open-btn').addEventListener('click', () => {
        import('../core/event-bus.js').then(({ eventBus }) => {
          eventBus.emit('app:launch', { appId: 'explorer', params: { path: 'NET:\\' } });
        });
      });
    });

    const pingBtn = this.container.querySelector('#ping-run-btn');
    const pingOutput = this.container.querySelector('#ping-output');
    const pingTarget = this.container.querySelector('#ping-target');

    pingBtn.addEventListener('click', () => {
      const target = pingTarget.value.trim() || '192.168.1.1';
      pingOutput.textContent = `Обмін пакетами з ${target} за 32 байтами даних:\n`;

      let step = 1;
      const interval = setInterval(() => {
        const ms = Math.floor(Math.random() * 8) + 1;
        pingOutput.textContent += `Відповідь від ${target}: число байтів=32 час=${ms}мс TTL=64\n`;
        step++;
        if (step > 4) {
          clearInterval(interval);
          pingOutput.textContent += `\nСтатистика Ping для ${target}:\n    Пакетів: надіслано = 4, отримано = 4, втрачено = 0 (0% втрат).\nВузол доступний та готовий до роботи.`;
        }
      }, 350);
    });
  }
}
