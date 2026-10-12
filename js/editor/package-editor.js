/**
 * PackageEditorApp: Візуальний конструктор навчальних завдань для вчителя
 * Дозволяє створювати нові практичні роботи, налаштовувати початковий стан VFS,
 * формувати декларативні правила валідації та експортувати валідні JSON-пакети.
 */
import { BaseApp } from '../apps/base-app.js';
import { taskEngine } from '../learning/task-engine.js';

export class PackageEditorApp extends BaseApp {
  constructor(win, params) {
    super(win, params);
    this.packageData = {
      id: 'custom-practice-' + Date.now().toString(36),
      title: 'Нова практична робота',
      topic: 'Файлові операції',
      grade: '6',
      difficulty: 'standard',
      mode: 'learning',
      maxScore: 12,
      description: 'Опис практичної роботи для учнів.',
      initialState: {
        clearDiskD: false,
        nodes: []
      },
      tasks: []
    };
  }

  async init() {
    this.renderLayout();
    this.setTitle('Конструктор навчальних завдань');
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="package-editor-layout">
        <!-- Тулбар дій -->
        <div class="pe-toolbar">
          <button class="pe-btn" id="pe-btn-add-task">➕ Додати завдання</button>
          <div class="pe-separator"></div>
          <button class="pe-btn" id="pe-btn-test">▶ Протестувати роботу</button>
          <button class="pe-btn" id="pe-btn-export">💾 Експортувати в JSON</button>
          <button class="pe-btn" id="pe-btn-import">📂 Імпортувати JSON</button>
          <input type="file" id="pe-file-import" accept=".json" style="display:none;" />
        </div>

        <div class="pe-body">
          <!-- Метадані пакета -->
          <div class="pe-meta-card">
            <h3>Загальні параметри практичної роботи</h3>
            <div class="pe-form-grid">
              <div class="pe-field">
                <label>Назва роботи:</label>
                <input type="text" id="pe-meta-title" value="${this.packageData.title}" />
              </div>
              <div class="pe-field">
                <label>Тема уроку:</label>
                <input type="text" id="pe-meta-topic" value="${this.packageData.topic}" />
              </div>
              <div class="pe-field">
                <label>Клас:</label>
                <select id="pe-meta-grade">
                  <option value="5">5 клас</option>
                  <option value="6" selected>6 клас</option>
                  <option value="7">7 клас</option>
                  <option value="8">8 клас</option>
                  <option value="9">9 клас</option>
                  <option value="10">10 клас</option>
                  <option value="11">11 клас</option>
                </select>
              </div>
              <div class="pe-field">
                <label>Максимальний бал:</label>
                <input type="number" id="pe-meta-maxscore" value="${this.packageData.maxScore}" />
              </div>
              <div class="pe-field pe-full-width">
                <label>Опис для учня:</label>
                <textarea id="pe-meta-desc" rows="2">${this.packageData.description}</textarea>
              </div>
            </div>
          </div>

          <!-- Список завдань -->
          <div class="pe-tasks-section">
            <div class="pe-tasks-header">
              <h3>Список завдань (<span id="pe-tasks-count">0</span>)</h3>
            </div>
            <div class="pe-tasks-list" id="pe-tasks-list"></div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.renderTasksList();
  }

  bindEvents() {
    this.container.querySelector('#pe-btn-add-task').addEventListener('click', () => this.addTask());
    this.container.querySelector('#pe-btn-test').addEventListener('click', () => this.testPackage());
    this.container.querySelector('#pe-btn-export').addEventListener('click', () => this.exportPackage());

    const importInput = this.container.querySelector('#pe-file-import');
    this.container.querySelector('#pe-btn-import').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (e) => this.handleImport(e));

    // Синхронізація метаданих
    this.container.querySelector('#pe-meta-title').addEventListener('input', (e) => {
      this.packageData.title = e.target.value;
    });
    this.container.querySelector('#pe-meta-topic').addEventListener('input', (e) => {
      this.packageData.topic = e.target.value;
    });
    this.container.querySelector('#pe-meta-grade').addEventListener('change', (e) => {
      this.packageData.grade = e.target.value;
    });
    this.container.querySelector('#pe-meta-maxscore').addEventListener('input', (e) => {
      this.packageData.maxScore = parseInt(e.target.value, 10) || 12;
    });
    this.container.querySelector('#pe-meta-desc').addEventListener('input', (e) => {
      this.packageData.description = e.target.value;
    });
  }

  addTask() {
    const nextOrder = this.packageData.tasks.length + 1;
    const newTask = {
      id: 'task-' + nextOrder + '-' + Date.now().toString(36),
      order: nextOrder,
      title: `Завдання ${nextOrder}: Нова дія`,
      instruction: 'Введіть інструкцію для учня...',
      points: 3,
      hint: 'Підказка до виконання...',
      hintPenalty: 0.5,
      validator: {
        type: 'file_exists',
        params: {
          path: 'D:\\Практичні роботи\\Результат.txt'
        }
      }
    };

    this.packageData.tasks.push(newTask);
    this.renderTasksList();
  }

  renderTasksList() {
    const listEl = this.container.querySelector('#pe-tasks-list');
    const countEl = this.container.querySelector('#pe-tasks-count');
    if (!listEl) return;

    countEl.textContent = this.packageData.tasks.length;
    listEl.innerHTML = '';

    if (this.packageData.tasks.length === 0) {
      listEl.innerHTML = `<div class="pe-no-tasks">Завдань ще немає. Натисніть «Додати завдання».</div>`;
      return;
    }

    this.packageData.tasks.forEach((task, index) => {
      const card = document.createElement('div');
      card.className = 'pe-task-card';

      card.innerHTML = `
        <div class="pe-task-card-header">
          <strong>#${index + 1}</strong>
          <input type="text" class="pe-task-title-input" value="${task.title}" placeholder="Назва завдання" />
          <button class="pe-btn-delete-task" title="Видалити завдання">🗑️</button>
        </div>
        <div class="pe-task-card-body">
          <div class="pe-field pe-full-width">
            <label>Текст інструкції:</label>
            <textarea class="pe-task-instruction-input" rows="2">${task.instruction}</textarea>
          </div>
          <div class="pe-form-row">
            <div class="pe-field">
              <label>Бали:</label>
              <input type="number" class="pe-task-points-input" value="${task.points}" />
            </div>
            <div class="pe-field">
              <label>Тип перевірки:</label>
              <select class="pe-task-validator-type">
                <option value="file_exists" ${task.validator.type === 'file_exists' ? 'selected' : ''}>Існування файлу (file_exists)</option>
                <option value="directory_exists" ${task.validator.type === 'directory_exists' ? 'selected' : ''}>Існування папки (directory_exists)</option>
                <option value="recycle_bin_contains" ${task.validator.type === 'recycle_bin_contains' ? 'selected' : ''}>Файл у Кошику (recycle_bin_contains)</option>
                <option value="attribute_check" ${task.validator.type === 'attribute_check' ? 'selected' : ''}>Перевірка атрибутів (attribute_check)</option>
                <option value="command_executed" ${task.validator.type === 'command_executed' ? 'selected' : ''}>Команда термінала (command_executed)</option>
              </select>
            </div>
          </div>
          <div class="pe-field pe-full-width">
            <label>Шлях або ціль для перевірки:</label>
            <input type="text" class="pe-task-validator-param" value="${task.validator.params.path || task.validator.params.name || ''}" placeholder="D:\\Папка\\Файл.txt" />
          </div>
          <div class="pe-field pe-full-width">
            <label>Текст підказки:</label>
            <input type="text" class="pe-task-hint-input" value="${task.hint}" />
          </div>
        </div>
      `;

      // Біндинг полів
      card.querySelector('.pe-task-title-input').addEventListener('input', (e) => {
        task.title = e.target.value;
      });
      card.querySelector('.pe-task-instruction-input').addEventListener('input', (e) => {
        task.instruction = e.target.value;
      });
      card.querySelector('.pe-task-points-input').addEventListener('input', (e) => {
        task.points = parseFloat(e.target.value) || 2;
      });
      card.querySelector('.pe-task-hint-input').addEventListener('input', (e) => {
        task.hint = e.target.value;
      });
      card.querySelector('.pe-task-validator-type').addEventListener('change', (e) => {
        task.validator.type = e.target.value;
      });
      card.querySelector('.pe-task-validator-param').addEventListener('input', (e) => {
        if (task.validator.type === 'recycle_bin_contains') {
          task.validator.params.name = e.target.value;
        } else {
          task.validator.params.path = e.target.value;
        }
      });
      card.querySelector('.pe-btn-delete-task').addEventListener('click', () => {
        this.packageData.tasks.splice(index, 1);
        this.renderTasksList();
      });

      listEl.appendChild(card);
    });
  }

  testPackage() {
    if (this.packageData.tasks.length === 0) {
      alert('Будь ласка, додайте хоча б одне завдання для тестування.');
      return;
    }
    taskEngine.startPackage(this.packageData);
  }

  exportPackage() {
    const jsonStr = JSON.stringify(this.packageData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.packageData.id || 'practice_pack'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  handleImport(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        this.packageData = parsed;
        this.renderLayout();
        alert(`Пакет «${this.packageData.title}» успішно імпортовано!`);
      } catch (err) {
        alert('Помилка імпорту: некоректний JSON-файл.');
      }
    };
    reader.readAsText(file);
  }
}
