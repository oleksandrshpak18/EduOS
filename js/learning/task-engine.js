/**
 * TaskEngine: Інтерактивний рушій та віджет проходження практичної роботи
 * Забезпечує покрокове виконання завдань, підказки, валідацію, обчислення балів
 * та запуск генератора сертифіката.
 */
import { TaskValidators } from './validators.js';
import { ScoringEngine } from './scoring.js';
import { CertificateGenerator } from './certificate.js';
import { progressManager } from './progress.js';
import { profileManager } from '../core/profiles.js';
import { vfs } from '../core/filesystem.js';
import { dialogs } from '../core/dialogs.js';

class TaskEngine {
  constructor() {
    this.currentPackage = null;
    this.currentTaskIndex = 0;
    this.scoring = null;
    this.widgetEl = null;
    this.isCollapsed = false;
    this.hintUsedForCurrent = false;
  }

  init() {
    this.createWidgetDOM();
  }

  createWidgetDOM() {
    if (this.widgetEl) return;

    this.widgetEl = document.createElement('div');
    this.widgetEl.id = 'task-engine-widget';
    this.widgetEl.className = 'task-widget acrylic-panel';
    this.widgetEl.style.display = 'none';

    this.widgetEl.innerHTML = `
      <div class="task-widget-header">
        <div class="task-widget-title-group">
          <span class="task-badge">Практична робота</span>
          <span class="task-package-name" id="tw-pkg-name">Завдання</span>
        </div>
        <div class="task-widget-controls">
          <button class="tw-btn-collapse" id="tw-btn-collapse" title="Згорнути панель">_</button>
          <button class="tw-btn-close" id="tw-btn-close" title="Завершити роботу">✕</button>
        </div>
      </div>

      <div class="task-widget-body" id="tw-body">
        <div class="task-progress-indicator">
          <div class="task-step-counter" id="tw-step-counter">Крок 1 з 5</div>
          <div class="task-score-counter" id="tw-score-counter">Бали: 0 / 12</div>
        </div>

        <div class="task-instruction-box">
          <h4 id="tw-task-title">Заголовок завдання</h4>
          <p id="tw-task-instruction">Інструкція до завдання...</p>
        </div>

        <div class="task-hint-box" id="tw-hint-box" style="display:none;">
          <strong>💡 Підказка:</strong>
          <span id="tw-hint-text"></span>
        </div>

        <div class="task-feedback-message" id="tw-feedback" style="display:none;"></div>

        <div class="task-widget-actions">
          <button class="tw-action-btn tw-btn-hint" id="tw-btn-hint">💡 Підказка (-0.5 б)</button>
          <button class="tw-action-btn tw-btn-check" id="tw-btn-check">✓ Перевірити</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.widgetEl);
    this.bindEvents();
  }

  bindEvents() {
    const btnCollapse = this.widgetEl.querySelector('#tw-btn-collapse');
    const btnClose = this.widgetEl.querySelector('#tw-btn-close');
    const btnHint = this.widgetEl.querySelector('#tw-btn-hint');
    const btnCheck = this.widgetEl.querySelector('#tw-btn-check');

    btnCollapse.addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed;
      this.widgetEl.classList.toggle('collapsed', this.isCollapsed);
    });

    btnClose.addEventListener('click', async () => {
      const confirmed = await dialogs.confirm(
        'Ви дійсно бажаєте завершити проходження цієї практичної роботи?',
        { title: 'Завершення роботи', confirmText: 'Завершити', cancelText: 'Продовжити', danger: true }
      );
      if (confirmed) {
        this.stopTask();
      }
    });

    btnHint.addEventListener('click', () => {
      const currentTask = this.getCurrentTask();
      if (!currentTask) return;
      const hintBox = this.widgetEl.querySelector('#tw-hint-box');
      const hintText = this.widgetEl.querySelector('#tw-hint-text');

      hintText.textContent = currentTask.hint || 'Використовуйте інструкцію до завдання.';
      hintBox.style.display = 'block';
      this.hintUsedForCurrent = true;
    });

    btnCheck.addEventListener('click', () => this.checkCurrentTask());
  }

  async startPackage(pkgData) {
    this.currentPackage = pkgData;
    this.currentTaskIndex = 0;
    this.hintUsedForCurrent = false;
    this.scoring = new ScoringEngine(pkgData.maxScore || 12, pkgData.mode || 'learning');

    // Налаштовуємо початковий стан VFS, якщо він визначений у пакеті
    if (pkgData.initialState) {
      await this.applyInitialState(pkgData.initialState);
    }

    this.widgetEl.style.display = 'flex';
    this.widgetEl.classList.remove('collapsed');
    this.renderCurrentTask();
  }

  async applyInitialState(initialState) {
    const profileId = profileManager.currentProfile ? profileManager.currentProfile.profileId : 'default';

    if (initialState.clearDiskD) {
      await vfs.formatDisk('D:');
    }

    if (initialState.nodes && Array.isArray(initialState.nodes)) {
      for (const n of initialState.nodes) {
        try {
          const parts = n.path.split('\\');
          const fileName = parts.pop();
          const parentPath = parts.join('\\');
          const parent = vfs.resolvePath(parentPath);
          if (parent) {
            await vfs.createFile(parent.id, fileName, n.content || '', n.attributes || {});
          }
        } catch (e) {
          console.warn('Initial node create error:', e);
        }
      }
    }
  }

  getCurrentTask() {
    if (!this.currentPackage || !this.currentPackage.tasks) return null;
    return this.currentPackage.tasks[this.currentTaskIndex] || null;
  }

  renderCurrentTask() {
    const task = this.getCurrentTask();
    if (!task) {
      this.finishPackage();
      return;
    }

    this.hintUsedForCurrent = false;
    this.widgetEl.querySelector('#tw-pkg-name').textContent = this.currentPackage.title;
    this.widgetEl.querySelector('#tw-step-counter').textContent = `Крок ${this.currentTaskIndex + 1} з ${this.currentPackage.tasks.length}`;
    this.widgetEl.querySelector('#tw-score-counter').textContent = `Бали: ${this.scoring.getTotalEarned()} / ${this.currentPackage.maxScore}`;

    this.widgetEl.querySelector('#tw-task-title').textContent = task.title;
    this.widgetEl.querySelector('#tw-task-instruction').textContent = task.instruction;

    // Скидаємо підказку та повідомлення
    this.widgetEl.querySelector('#tw-hint-box').style.display = 'none';
    const feedback = this.widgetEl.querySelector('#tw-feedback');
    feedback.style.display = 'none';
    feedback.className = 'task-feedback-message';
  }

  async checkCurrentTask() {
    const task = this.getCurrentTask();
    if (!task) return;

    const feedback = this.widgetEl.querySelector('#tw-feedback');
    const result = await TaskValidators.validate(task.validator);

    if (result.success) {
      feedback.style.display = 'block';
      feedback.className = 'task-feedback-message success';
      feedback.textContent = `✓ Відмінно! ${result.message}`;

      const earned = this.scoring.recordTaskSuccess(
        task.id,
        task.points || 2,
        task.hintPenalty || 0.5,
        this.hintUsedForCurrent
      );

      setTimeout(() => {
        this.currentTaskIndex++;
        this.renderCurrentTask();
      }, 1200);
    } else {
      feedback.style.display = 'block';
      feedback.className = 'task-feedback-message error';
      feedback.textContent = `✗ Поки що не виконано: ${result.message}`;
      this.scoring.recordFailedAttempt(task.id);
    }
  }

  async finishPackage() {
    const totalScore = this.scoring.getTotalEarned();
    const percentage = this.scoring.getPercentage();
    const grade12 = this.scoring.getGrade12();
    const profile = profileManager.currentProfile;

    // Зберігаємо прогрес у базу
    if (profile) {
      await progressManager.saveProgress(profile.profileId, this.currentPackage.id, {
        score: totalScore,
        maxScore: this.currentPackage.maxScore,
        percentage,
        grade12,
        completedAt: Date.now()
      });
    }

    const body = this.widgetEl.querySelector('#tw-body');
    body.innerHTML = `
      <div class="task-completed-celebration">
        <div class="celeb-icon">🏆</div>
        <h3>Практичну роботу завершено!</h3>
        <p class="celeb-score">Ваш результат: <strong>${totalScore}</strong> з ${this.currentPackage.maxScore} балів (${percentage}%)</p>
        <p class="celeb-grade">Оцінка за 12-бальною системою: <strong>${grade12}</strong> балів</p>
        <button class="celeb-cert-btn" id="tw-btn-get-cert">🎓 Отримати PDF-сертифікат</button>
      </div>
    `;

    body.querySelector('#tw-btn-get-cert').addEventListener('click', () => {
      CertificateGenerator.generateCertificate({
        studentName: profile ? `${profile.lastName} ${profile.firstName}` : 'Петренко Андрій',
        gradeClass: profile ? profile.gradeClass : '6-А',
        topicTitle: this.currentPackage.title,
        earnedPoints: totalScore,
        maxPoints: this.currentPackage.maxScore,
        percentage,
        grade12
      });
    });
  }

  stopTask() {
    this.currentPackage = null;
    this.currentTaskIndex = 0;
    this.widgetEl.style.display = 'none';
  }
}

export const taskEngine = new TaskEngine();
