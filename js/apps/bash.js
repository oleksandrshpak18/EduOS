/**
 * BashApp: Термінал Linux (Bash) для EduOS
 * Емулює синтаксис та поведінку Linux shell над віртуальною файловою системою.
 */
import { BaseApp } from './base-app.js';
import { vfs } from '../core/filesystem.js';
import { auditLogger } from '../core/audit-log.js';

export class BashApp extends BaseApp {
  constructor(win, params) {
    super(win, params);
    this.cwd = 'C:\\Користувачі\\Учень';
    this.history = [];
    this.historyIndex = -1;
    this.outputEl = null;
    this.inputEl = null;
  }

  async init() {
    this.renderLayout();
    this.printHeader();
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="bash-terminal-layout">
        <div class="bash-terminal-output" id="bash-output"></div>
        <div class="bash-terminal-input-row">
          <span class="bash-prompt-label" id="bash-prompt-label">student@eduos:<span class="bash-path-color">~</span>$</span>
          <input type="text" class="bash-terminal-input" id="bash-input" autocomplete="off" spellcheck="false" />
        </div>
      </div>
    `;

    this.outputEl = this.container.querySelector('#bash-output');
    this.inputEl = this.container.querySelector('#bash-input');
    this.promptEl = this.container.querySelector('#bash-prompt-label');

    this.bindEvents();
    this.inputEl.focus();
    this.setTitle('Термінал Linux (Bash)');
  }

  printHeader() {
    this.println('EduOS Linux 5.15.0-generic (x86_64) - Навчальна оболонка Bash');
    this.println('Введіть "help" для перегляду списку доступних команд.\n');
  }

  println(text = '', className = '') {
    const line = document.createElement('div');
    line.className = `bash-line ${className}`;
    line.textContent = text;
    this.outputEl.appendChild(line);
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  getUnixPath(winPath) {
    let p = winPath.replace(/\\/g, '/');
    if (p.startsWith('C:/Користувачі/Учень')) {
      return p.replace('C:/Користувачі/Учень', '~');
    }
    return p;
  }

  bindEvents() {
    this.container.addEventListener('click', () => this.inputEl.focus());

    this.inputEl.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const cmdText = this.inputEl.value.trim();
        const displayPrompt = `student@eduos:${this.getUnixPath(this.cwd)}$`;
        this.println(`${displayPrompt} ${this.inputEl.value}`);
        this.inputEl.value = '';

        if (cmdText) {
          this.history.push(cmdText);
          this.historyIndex = this.history.length;
          await this.executeCommand(cmdText);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.inputEl.value = this.history[this.historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.inputEl.value = this.history[this.historyIndex];
        } else {
          this.historyIndex = this.history.length;
          this.inputEl.value = '';
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.handleTabAutocomplete();
      }
    });
  }

  handleTabAutocomplete() {
    const text = this.inputEl.value;
    const parts = text.split(' ');
    const lastWord = parts[parts.length - 1].toLowerCase();

    const currNode = vfs.resolvePath(this.cwd);
    if (!currNode) return;

    const children = vfs.listChildren(currNode.id);
    const match = children.find((c) => c.name.toLowerCase().startsWith(lastWord));
    if (match) {
      parts[parts.length - 1] = match.name.includes(' ') ? `"${match.name}"` : match.name;
      this.inputEl.value = parts.join(' ');
    }
  }

  async executeCommand(rawCommand) {
    const tokens = this.parseTokens(rawCommand);
    if (tokens.length === 0) return;

    const cmd = tokens[0].toLowerCase();
    const args = tokens.slice(1);

    await auditLogger.log('terminal_command', { terminal: 'bash', command: cmd, args, full: rawCommand, cwd: this.cwd });

    switch (cmd) {
      case 'clear':
        this.outputEl.innerHTML = '';
        break;

      case 'help':
        this.println('Доступні команди Bash:');
        this.println('  pwd             - Показати поточний каталог');
        this.println('  ls [-l] [-a]    - Список файлів і папок');
        this.println('  cd <шлях>       - Зміна каталогу (наприклад: cd D:/Інформатика)');
        this.println('  mkdir <назва>   - Створити каталог');
        this.println('  rmdir <назва>   - Видалити каталог');
        this.println('  cp <src> <dest> - Копіювати файл або папку');
        this.println('  mv <src> <dest> - Перемістити або перейменувати');
        this.println('  rm <файл>       - Видалити файл');
        this.println('  cat <файл>      - Вивести вміст файлу');
        this.println('  touch <файл>    - Створити порожній файл');
        this.println('  tree            - Деревоподібний список');
        this.println('  whoami          - Ім\'я поточного користувача');
        this.println('  clear           - Очистити термінал');
        this.println('  exit            - Закрити термінал');
        break;

      case 'pwd':
        this.println(this.getUnixPath(this.cwd));
        break;

      case 'whoami':
        this.println('student');
        break;

      case 'date':
        this.println(new Date().toString());
        break;

      case 'cd':
        if (args.length === 0 || args[0] === '~') {
          this.cwd = 'C:\\Користувачі\\Учень';
        } else {
          let target = args[0].replace('~', 'C:\\Користувачі\\Учень');
          if (target === '/') target = 'C:\\';
          const resolved = vfs.resolvePath(target, this.cwd);
          if (resolved && (resolved.type === 'directory' || resolved.type === 'drive')) {
            this.cwd = vfs.getNodePath(resolved.id);
          } else {
            this.println(`bash: cd: ${args[0]}: Немає такого каталогу`);
          }
        }
        this.promptEl.innerHTML = `student@eduos:<span class="bash-path-color">${this.getUnixPath(this.cwd)}</span>$`;
        break;

      case 'ls':
        await this.cmdLs(args);
        break;

      case 'mkdir':
        if (args.length === 0) {
          this.println('mkdir: пропущено операнд');
        } else {
          try {
            await vfs.createDirectory(this.cwd, args[0]);
          } catch (e) {
            this.println(`mkdir: помилка створення: ${e.message}`);
          }
        }
        break;

      case 'rmdir':
        if (args.length === 0) {
          this.println('rmdir: пропущено операнд');
        } else {
          try {
            const node = vfs.resolvePath(args[0], this.cwd);
            if (!node) throw new Error('Каталог не існує');
            await vfs.deleteNode(node.id, false);
          } catch (e) {
            this.println(`rmdir: ${e.message}`);
          }
        }
        break;

      case 'cp':
        if (args.length < 2) {
          this.println('cp: пропущено аргументи файлів');
        } else {
          try {
            const src = vfs.resolvePath(args[0], this.cwd);
            const dest = vfs.resolvePath(args[1], this.cwd);
            if (!src || !dest) throw new Error('Неправильний шлях');
            await vfs.copyNode(src.id, dest.id);
          } catch (e) {
            this.println(`cp: ${e.message}`);
          }
        }
        break;

      case 'mv':
        if (args.length < 2) {
          this.println('mv: пропущено операнд призначення');
        } else {
          try {
            const src = vfs.resolvePath(args[0], this.cwd);
            if (!src) throw new Error('Джерело не знайдено');

            // Якщо другий аргумент — це просто нове ім'я без шляху
            if (!args[1].includes('/') && !args[1].includes('\\')) {
              await vfs.renameNode(src.id, args[1]);
            } else {
              const dest = vfs.resolvePath(args[1], this.cwd);
              if (dest && (dest.type === 'directory' || dest.type === 'drive')) {
                await vfs.moveNode(src.id, dest.id);
              } else {
                await vfs.renameNode(src.id, args[1]);
              }
            }
          } catch (e) {
            this.println(`mv: ${e.message}`);
          }
        }
        break;

      case 'rm':
        if (args.length === 0) {
          this.println('rm: пропущено операнд');
        } else {
          const targetPath = args[args.length - 1];
          try {
            const target = vfs.resolvePath(targetPath, this.cwd);
            if (!target) throw new Error(`Неможливо знайти '${targetPath}'`);
            await vfs.deleteNode(target.id, false);
          } catch (e) {
            this.println(`rm: ${e.message}`);
          }
        }
        break;

      case 'cat':
        if (args.length === 0) {
          this.println('cat: вкажіть назву файлу');
        } else {
          try {
            const file = vfs.resolvePath(args[0], this.cwd);
            if (!file || file.type !== 'file') throw new Error(`Файл не знайдено: ${args[0]}`);
            const content = await vfs.readFile(file.id);
            this.println(typeof content === 'string' ? content : '[Binary]');
          } catch (e) {
            this.println(`cat: ${e.message}`);
          }
        }
        break;

      case 'touch':
        if (args.length === 0) {
          this.println('touch: пропущено файл');
        } else {
          try {
            await vfs.createFile(this.cwd, args[0], '');
          } catch (e) {
            this.println(`touch: ${e.message}`);
          }
        }
        break;

      case 'tree':
        this.cmdTree();
        break;

      case 'exit':
        import('../core/window-manager.js').then(({ windowManager }) => {
          windowManager.closeWindow(this.win.id);
        });
        break;

      default:
        this.println(`bash: ${cmd}: команду не знайдено`);
        break;
    }
  }

  async cmdLs(args) {
    const isLong = args.includes('-l') || args.includes('-la') || args.includes('-al');
    const isAll = args.includes('-a') || args.includes('-la') || args.includes('-al');

    const curr = vfs.resolvePath(this.cwd);
    if (!curr) return;

    const children = vfs.listChildren(curr.id, isAll);

    if (isLong) {
      this.println(`total ${children.length}`);
      children.forEach((c) => {
        const typeChar = c.type === 'directory' || c.type === 'drive' ? 'd' : '-';
        const perms = `${typeChar}rwxr-xr-x`;
        const size = String(c.size || 0).padStart(8, ' ');
        const date = new Date(c.updatedAt).toLocaleDateString('uk-UA');
        this.println(`${perms} 1 student student ${size} ${date} ${c.name}`);
      });
    } else {
      const names = children.map((c) => (c.type === 'directory' || c.type === 'drive' ? `${c.name}/` : c.name));
      this.println(names.join('  '));
    }
  }

  cmdTree() {
    const curr = vfs.resolvePath(this.cwd);
    if (!curr) return;

    this.println('.');
    const renderBranch = (nodeId, prefix = '') => {
      const children = vfs.listChildren(nodeId).filter((c) => c.type === 'directory');
      children.forEach((child, index) => {
        const isLast = index === children.length - 1;
        this.println(`${prefix}${isLast ? '└── ' : '├── '}${child.name}`);
        renderBranch(child.id, prefix + (isLast ? '    ' : '│   '));
      });
    };

    renderBranch(curr.id);
  }

  parseTokens(cmdStr) {
    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    const tokens = [];
    let match;
    while ((match = regex.exec(cmdStr)) !== null) {
      tokens.push(match[1] || match[2] || match[0]);
    }
    return tokens;
  }
}
