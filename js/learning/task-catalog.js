/**
 * TaskCatalogApp: Додаток «Навчальні завдання» для EduOS
 * Відображає каталог тематичних практичних робіт 5-11 класів, фільтри та прогрес учня.
 */
import { BaseApp } from '../apps/base-app.js';
import { taskEngine } from './task-engine.js';
import { progressManager } from './progress.js';
import { profileManager } from '../core/profiles.js';
import { dialogs } from '../core/dialogs.js';

export class TaskCatalogApp extends BaseApp {
  constructor(win, params) {
    super(win, params);
    this.packages = [];
    this.selectedGrade = 'all';
  }

  async init() {
    this.renderLayout();
    await this.loadCatalog();
    this.setTitle('Каталог навчальних практичних робіт');
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="task-catalog-layout">
        <!-- Фільтри -->
        <div class="catalog-filters-bar">
          <label>Фільтр за класом:</label>
          <div class="grade-filter-buttons">
            <button class="grade-btn active" data-grade="all">Всі класи</button>
            <button class="grade-btn" data-grade="5">5 клас</button>
            <button class="grade-btn" data-grade="6">6 клас</button>
            <button class="grade-btn" data-grade="7">7 клас</button>
            <button class="grade-btn" data-grade="8">8 клас</button>
            <button class="grade-btn" data-grade="9">9 клас</button>
          </div>
        </div>

        <!-- Сітка практичних робіт -->
        <div class="catalog-cards-grid" id="catalog-cards-grid">
          <div class="catalog-loading">Завантаження практичних робіт...</div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelectorAll('.grade-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.grade-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedGrade = btn.dataset.grade;
        this.renderCards();
      });
    });
  }

  async loadCatalog() {
    try {
      const res = await fetch('tasks/catalog.json');
      const data = await res.json();
      this.packages = data.packages || [];
      await this.renderCards();
    } catch (e) {
      console.error('Failed to load catalog.json:', e);
      const grid = this.container.querySelector('#catalog-cards-grid');
      if (grid) grid.innerHTML = `<div class="catalog-error">Помилка завантаження каталогу робіт.</div>`;
    }
  }

  async renderCards() {
    const grid = this.container.querySelector('#catalog-cards-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const profile = profileManager.currentProfile;
    const progressList = profile ? await progressManager.getProfileAll(profile.profileId) : [];
    const progressMap = new Map(progressList.map((p) => [p.packageId, p]));

    const filtered = this.selectedGrade === 'all'
      ? this.packages
      : this.packages.filter((p) => String(p.grade) === this.selectedGrade);

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="catalog-empty">Практичних робіт для обраного класу не знайдено.</div>`;
      return;
    }

    filtered.forEach((pkg) => {
      const prog = progressMap.get(pkg.id);
      const isCompleted = !!prog;

      const card = document.createElement('div');
      card.className = `catalog-card ${isCompleted ? 'completed' : ''}`;

      card.innerHTML = `
        <div class="card-header">
          <span class="card-grade-badge">${pkg.grade} КЛАС</span>
          <span class="card-status-badge ${isCompleted ? 'status-done' : ''}">${isCompleted ? '✓ Виконано' : 'Не пройдено'}</span>
        </div>
        <h3 class="card-title">${pkg.title}</h3>
        <p class="card-topic">Тема: ${pkg.topic}</p>
        <p class="card-desc">${pkg.description}</p>
        <div class="card-meta">
          <span>Кількість завдань: ${pkg.tasksCount}</span>
          <span>Макс. бал: ${pkg.maxScore}</span>
          ${isCompleted ? `<span>Оцінка: <strong>${prog.grade12} балів</strong></span>` : ''}
        </div>
        <button class="card-start-btn" id="btn-start-${pkg.id}">
          ${isCompleted ? 'Пройти повторно' : 'Почати роботу ▶'}
        </button>
      `;

      card.querySelector(`#btn-start-${pkg.id}`).addEventListener('click', async () => {
        try {
          const res = await fetch(pkg.file);
          const pkgData = await res.json();
          await taskEngine.startPackage(pkgData);

          // Згортаємо вікно каталогу для зручності
          import('../core/window-manager.js').then(({ windowManager }) => {
            windowManager.minimizeWindow(this.win.id);
          });
        } catch (err) {
          await dialogs.alert(`Помилка відкриття пакета завдань: ${err.message}`, { icon: 'error', title: 'Практичні роботи' });
        }
      });

      grid.appendChild(card);
    });
  }
}
