/**
 * BrowserApp: Навчальний віртуальний браузер для EduOS
 * Надає доступ до офлайн-порталу школи, електронного довідника з інформатики
 * та симулятора завантаження файлів у VFS.
 */
import { BaseApp } from './base-app.js';
import { vfs } from '../core/filesystem.js';
import { dialogs } from '../core/dialogs.js';

export class BrowserApp extends BaseApp {
  constructor(win, params) {
    super(win, params);
    this.currentUrl = params.url || 'edu://portal';
    this.history = [this.currentUrl];
    this.historyIndex = 0;
  }

  async init() {
    this.renderLayout();
    this.navigate(this.currentUrl, false);
    this.setTitle('Браузер — Навчальний портал');
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="browser-layout">
        <!-- Вкладки -->
        <div class="browser-tabs-bar">
          <div class="browser-tab active" data-url="edu://portal">
            <span>🏫</span> Шкільний портал
          </div>
          <div class="browser-tab" data-url="edu://wiki">
            <span>📚</span> Вікі-довідник
          </div>
          <div class="browser-tab" data-url="edu://downloads">
            <span>⬇️</span> Центр завантажень
          </div>
        </div>

        <!-- Навігаційний тулбар -->
        <div class="browser-nav-bar">
          <button class="b-btn btn-back" disabled>◀</button>
          <button class="b-btn btn-fwd" disabled>▶</button>
          <button class="b-btn btn-reload">🔄</button>
          <div class="browser-url-input-box">
            <span class="url-lock">🔒</span>
            <input type="text" class="browser-url-input" id="b-url-input" value="edu://portal" />
          </div>
        </div>

        <!-- Робоча область сторінки -->
        <div class="browser-viewport" id="b-viewport"></div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const urlInput = this.container.querySelector('#b-url-input');
    const btnBack = this.container.querySelector('.btn-back');
    const btnFwd = this.container.querySelector('.btn-fwd');
    const btnReload = this.container.querySelector('.btn-reload');

    // Клік по вкладках
    this.container.querySelectorAll('.browser-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.container.querySelectorAll('.browser-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.navigate(tab.dataset.url);
      });
    });

    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.navigate(urlInput.value.trim());
      }
    });

    btnBack.addEventListener('click', () => {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.navigate(this.history[this.historyIndex], false);
      }
    });

    btnFwd.addEventListener('click', () => {
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.navigate(this.history[this.historyIndex], false);
      }
    });

    btnReload.addEventListener('click', () => {
      this.navigate(this.currentUrl, false);
    });
  }

  navigate(url, record = true) {
    this.currentUrl = url;
    if (record) {
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push(url);
      this.historyIndex = this.history.length - 1;
    }

    const urlInput = this.container.querySelector('#b-url-input');
    if (urlInput) urlInput.value = url;

    const btnBack = this.container.querySelector('.btn-back');
    const btnFwd = this.container.querySelector('.btn-fwd');
    if (btnBack) btnBack.disabled = this.historyIndex <= 0;
    if (btnFwd) btnFwd.disabled = this.historyIndex >= this.history.length - 1;

    const viewport = this.container.querySelector('#b-viewport');
    if (!viewport) return;

    if (url === 'edu://portal') {
      this.renderPortalPage(viewport);
    } else if (url === 'edu://wiki') {
      this.renderWikiPage(viewport);
    } else if (url === 'edu://downloads') {
      this.renderDownloadsPage(viewport);
    } else {
      viewport.innerHTML = `<div class="b-page-error"><h3>404: Сторінку не знайдено</h3><p>Доступні локальні ресурси: edu://portal, edu://wiki, edu://downloads</p></div>`;
    }
  }

  renderPortalPage(container) {
    container.innerHTML = `
      <div class="webpage-container">
        <header class="web-hero">
          <h1>🏫 Інтранет-портал «Школа Майбутнього»</h1>
          <p>Освітнє середовище учнів 5-11 класів для практичних занять з інформатики</p>
        </header>

        <section class="web-grid">
          <div class="web-card">
            <h3>📖 Практичні завдання</h3>
            <p>Виконуйте завдання на віртуальному робочому столі та отримуйте персональні сертифікати.</p>
          </div>
          <div class="web-card">
            <h3>💾 Віртуальне сховище</h3>
            <p>Зберігайте файли на дисках C: та D:, створюйте власні архіви та папки.</p>
          </div>
          <div class="web-card">
            <h3>⚡ Термінал та команди</h3>
            <p>Опановуйте консольні команди Windows (CMD) та Linux (Bash) безпосередньо в браузері.</p>
          </div>
        </section>
      </div>
    `;
  }

  renderWikiPage(container) {
    container.innerHTML = `
      <div class="webpage-container wiki-article">
        <h2>📚 Електронний довідник з інформатики</h2>
        <article>
          <h3>1. Що таке файлова система?</h3>
          <p>Файлова система — це порядок і правила зберігання та організації каталогів і файлів на накопичувачі інформації.</p>
          <h3>2. Основні операції з файлами</h3>
          <ul>
            <li><strong>Копіювання (Ctrl+C / Ctrl+V):</strong> створення точної копії файлу в іншому каталозі.</li>
            <li><strong>Переміщення (Ctrl+X / Ctrl+V):</strong> перенесення об'єкта зі старого місця в нове.</li>
            <li><strong>Видалення:</strong> переміщення об'єкта до Кошика з можливістю подальшого відновлення.</li>
          </ul>
          <h3>3. Архівація даних</h3>
          <p>Архівація — це об'єднання кількох файлів в один стиснутий архівний файл (наприклад, формат ZIP) для зменшення обсягу та спрощення передачі.</p>
        </article>
      </div>
    `;
  }

  renderDownloadsPage(container) {
    container.innerHTML = `
      <div class="webpage-container">
        <h2>⬇️ Центр завантажень навчальних матеріалів</h2>
        <p>Завантажуйте демонстраційні файли безпосередньо у віртуальну папку <code>C:\\Користувачі\\Учень\\Завантаження</code>.</p>

        <div class="dl-item-row">
          <div>
            <strong>Довідник_алгоритмів.txt</strong>
            <p class="dl-desc">Текстовий конспект для уроку інформатики (1.2 КБ)</p>
          </div>
          <button class="dl-btn" data-filename="Довідник_алгоритмів.txt" data-content="Алгоритм — це чітка послідовність дій для досягнення поставленої мети.">Завантажити</button>
        </div>

        <div class="dl-item-row">
          <div>
            <strong>Тестова_таблиця.csv</strong>
            <p class="dl-desc">Навчальні табличні дані для аналізу (0.8 КБ)</p>
          </div>
          <button class="dl-btn" data-filename="Тестова_таблиця.csv" data-content="№,Учень,Клас,Бал\n1,Петренко,6-А,12\n2,Сидоренко,6-А,11">Завантажити</button>
        </div>
      </div>
    `;

    container.querySelectorAll('.dl-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.filename;
        const text = btn.dataset.content;
        const dlFolder = vfs.resolvePath('C:\\Користувачі\\Учень\\Завантаження');

        if (dlFolder) {
          try {
            await vfs.createFile(dlFolder.id, name, text);
            await dialogs.alert(
              `Файл «${name}» успішно завантажено у папку:\nC:\\Користувачі\\Учень\\Завантаження`,
              { icon: 'success', title: 'Завантаження завершено' }
            );
          } catch (e) {
            await dialogs.alert(e.message, { icon: 'error', title: 'Помилка завантаження' });
          }
        }
      });
    });
  }
}
