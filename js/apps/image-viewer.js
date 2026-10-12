/**
 * ImageViewerApp: Переглядач зображень для EduOS
 */
import { BaseApp } from './base-app.js';
import { vfs } from '../core/filesystem.js';

export class ImageViewerApp extends BaseApp {
  constructor(win, params) {
    super(win, params);
    this.fileId = params.fileId || null;
    this.zoom = 1;
    this.rotation = 0;
  }

  async init() {
    this.renderLayout();
    if (this.fileId) {
      await this.loadImage(this.fileId);
    }
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="image-viewer-layout">
        <div class="image-viewer-toolbar">
          <button class="iv-btn" id="iv-btn-zoom-in">🔍+ Збільшити</button>
          <button class="iv-btn" id="iv-btn-zoom-out">🔍- Зменшити</button>
          <button class="iv-btn" id="iv-btn-zoom-reset">100%</button>
          <button class="iv-btn" id="iv-btn-rotate">🔄 Повернути</button>
          <span class="iv-zoom-label" id="iv-zoom-label">100%</span>
        </div>
        <div class="image-viewer-stage">
          <img id="iv-img" src="" alt="Зображення" style="display:none;" />
          <div id="iv-placeholder" class="iv-placeholder">Зображення не завантажено</div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.setTitle('Переглядач зображень');
  }

  bindEvents() {
    const img = this.container.querySelector('#iv-img');
    const zoomLabel = this.container.querySelector('#iv-zoom-label');

    const updateTransform = () => {
      img.style.transform = `scale(${this.zoom}) rotate(${this.rotation}deg)`;
      zoomLabel.textContent = `${Math.round(this.zoom * 100)}%`;
    };

    this.container.querySelector('#iv-btn-zoom-in').addEventListener('click', () => {
      this.zoom = Math.min(4, this.zoom + 0.25);
      updateTransform();
    });

    this.container.querySelector('#iv-btn-zoom-out').addEventListener('click', () => {
      this.zoom = Math.max(0.25, this.zoom - 0.25);
      updateTransform();
    });

    this.container.querySelector('#iv-btn-zoom-reset').addEventListener('click', () => {
      this.zoom = 1;
      this.rotation = 0;
      updateTransform();
    });

    this.container.querySelector('#iv-btn-rotate').addEventListener('click', () => {
      this.rotation = (this.rotation + 90) % 360;
      updateTransform();
    });
  }

  async loadImage(fileId) {
    const node = vfs.getNode(fileId);
    if (!node || !node.content) return;

    this.setTitle(`Переглядач зображень — ${node.name}`);
    const img = this.container.querySelector('#iv-img');
    const placeholder = this.container.querySelector('#iv-placeholder');

    img.src = node.content;
    img.style.display = 'block';
    placeholder.style.display = 'none';
  }
}
