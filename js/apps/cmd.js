/**
 * CmdApp: Командний рядок Windows (CMD) для EduOS
 * Емулює синтаксис та поведінку Windows консолі над віртуальною файловою системою.
 */
import { BaseApp } from './base-app.js';
import { vfs } from '../core/filesystem.js';
import { auditLogger } from '../core/audit-log.js';

export class CmdApp extends BaseApp {
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
      <div class="cmd-terminal-layout">
        <div class="cmd-terminal-output" id="cmd-output"></div>
        <div class="cmd-terminal-input-row">
          <span class="cmd-prompt-label" id="cmd-prompt-label">${this.cwd}&gt;</span>
          <input type="text" class="cmd-terminal-input" id="cmd-input" autocomplete="off" spellcheck="false" />
        </div>
      </div>
    `;

    this.outputEl = this.container.querySelector('#cmd-output');
    this.inputEl = this.container.querySelector('#cmd-input');
    this.promptEl = this.container.querySelector('#cmd-prompt-label');

    this.bindEvents();
    this.inputEl.focus();
    this.setTitle('Командний рядок (CMD)');
  }

  printHeader() {
    this.println('Microsoft Windows [Версія 10.0.22621.1]');
    this.println('(c) Корпорація Майкрософт. Усі права захищено.\nЕмуляція середовища EduOS v2.0.\nВведіть "help" для списку команд.\n');
  }

  println(text = '', className = '') {
    const line = document.createElement('div');
    line.className = `cmd-line ${className}`;
    line.textContent = text;
    this.outputEl.appendChild(line);
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  bindEvents() {
    this.container.addEventListener('click', () => {
      this.inputEl.focus();
    });

    this.inputEl.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const cmdText = this.inputEl.value.trim();
        this.println(`${this.cwd}> ${this.inputEl.value}`);
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

    // Записуємо команду в аудит для валідатора навчальних завдань
    await auditLogger.log('terminal_command', { terminal: 'cmd', command: cmd, args, full: rawCommand, cwd: this.cwd });

    switch (cmd) {
      case 'cls':
        this.outputEl.innerHTML = '';
        break;

      case 'help':
        this.println('Список підтримуваних команд:');
        this.println('  dir [шлях]      - Відображає файли та папки в поточному каталозі');
        this.println('  cd [шлях]       - Змінює поточний робочий каталог (наприклад: cd D:\\)');
        this.println('  mkdir [назва]   - Створює новий каталог (також: md)');
        this.println('  rmdir [назва]   - Видаляє вказаний каталог (також: rd)');
        this.println('  copy [звідки] [куди] - Копіює файл');
        this.println('  move [звідки] [куди] - Переміщує файл');
        this.println('  del [файл]      - Видаляє файл у Кошик');
        this.println('  ren [старе] [нове] - Перейменовує файл або папку');
        this.println('  type [файл]     - Виводить вміст текстового файлу на екран');
        this.println('  tree            - Відображає деревоподібну структуру каталогів');
        this.println('  cls             - Очищує екран командного рядка');
        this.println('  exit            - Закриває вікно термінала');
        break;

      case 'cd':
        if (args.length === 0) {
          this.println(this.cwd);
        } else {
          let target = args[0];
          // Обробка зміни диска (наприклад: D: або d:\)
          if (/^[a-zA-Z]:$/.test(target)) target += '\\';

          const resolved = vfs.resolvePath(target, this.cwd);
          if (resolved && (resolved.type === 'directory' || resolved.type === 'drive')) {
            this.cwd = vfs.getNodePath(resolved.id);
            this.promptEl.textContent = `${this.cwd}>`;
          } else {
            this.println(`Системі не вдається знайти вказаний шлях: ${target}`);
          }
        }
        break;

      case 'dir':
        await this.cmdDir(args);
        break;

      case 'mkdir':
      case 'md':
        if (args.length === 0) {
          this.println('Синтаксична помилка: вкажіть назву каталогу.');
        } else {
          try {
            await vfs.createDirectory(this.cwd, args[0]);
            this.println(`Папку "${args[0]}" успішно створено.`);
          } catch (e) {
            this.println(e.message);
          }
        }
        break;

      case 'rmdir':
      case 'rd':
        if (args.length === 0) {
          this.println('Синтаксична помилка: вкажіть назву каталогу.');
        } else {
          try {
            const target = vfs.resolvePath(args[0], this.cwd);
            if (!target) throw new Error('Каталог не знайдено');
            await vfs.deleteNode(target.id, false);
            this.println(`Каталог "${args[0]}" видалено.`);
          } catch (e) {
            this.println(e.message);
          }
        }
        break;

      case 'copy':
        if (args.length < 2) {
          this.println('Синтаксис: copy <джерело> <призначення>');
        } else {
          try {
            const src = vfs.resolvePath(args[0], this.cwd);
            const dest = vfs.resolvePath(args[1], this.cwd);
            if (!src) throw new Error(`Не знайдено файл джерела: ${args[0]}`);
            if (!dest) throw new Error(`Не знайдено цільову папку: ${args[1]}`);
            await vfs.copyNode(src.id, dest.id);
            this.println('        1 файл(ів) скопійовано.');
          } catch (e) {
            this.println(e.message);
          }
        }
        break;

      case 'move':
        if (args.length < 2) {
          this.println('Синтаксис: move <джерело> <призначення>');
        } else {
          try {
            const src = vfs.resolvePath(args[0], this.cwd);
            const dest = vfs.resolvePath(args[1], this.cwd);
            if (!src) throw new Error(`Не знайдено вихідний файл: ${args[0]}`);
            if (!dest) throw new Error(`Не знайдено цільову папку: ${args[1]}`);
            await vfs.moveNode(src.id, dest.id);
            this.println('        1 файл(ів) переміщено.');
          } catch (e) {
            this.println(e.message);
          }
        }
        break;

      case 'del':
        if (args.length === 0) {
          this.println('Синтаксис: del <файл>');
        } else {
          try {
            const target = vfs.resolvePath(args[0], this.cwd);
            if (!target) throw new Error(`Файл не знайдено: ${args[0]}`);
            await vfs.deleteNode(target.id, false);
            this.println(`Файл "${args[0]}" переміщено в Кошик.`);
          } catch (e) {
            this.println(e.message);
          }
        }
        break;

      case 'ren':
        if (args.length < 2) {
          this.println('Синтаксис: ren <старе_ім\'я> <нове_ім\'я>');
        } else {
          try {
            const target = vfs.resolvePath(args[0], this.cwd);
            if (!target) throw new Error(`Об'єкт не знайдено: ${args[0]}`);
            await vfs.renameNode(target.id, args[1]);
            this.println(`Об'єкт перейменовано на "${args[1]}".`);
          } catch (e) {
            this.println(e.message);
          }
        }
        break;

      case 'type':
        if (args.length === 0) {
          this.println('Синтаксис: type <файл>');
        } else {
          try {
            const target = vfs.resolvePath(args[0], this.cwd);
            if (!target || target.type !== 'file') throw new Error(`Файл не знайдено: ${args[0]}`);
            const text = await vfs.readFile(target.id);
            this.println(typeof text === 'string' ? text : '[Бінарний вміст]');
          } catch (e) {
            this.println(e.message);
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
        this.println(`"${cmd}" не розпізнано як внутрішню або зовнішню команду,`);
        this.println('виконувану програму чи пакетний файл.');
        break;
    }
  }

  async cmdDir(args) {
    const targetPath = args.length > 0 && !args[0].startsWith('/') ? args[0] : this.cwd;
    const node = vfs.resolvePath(targetPath, this.cwd);
    if (!node) {
      this.println(`Каталог не знайдено: ${targetPath}`);
      return;
    }

    const children = vfs.listChildren(node.id);
    this.println(` Вміст папки ${vfs.getNodePath(node.id)}\n`);

    let fileCount = 0;
    let dirCount = 0;
    let totalBytes = 0;

    children.forEach((c) => {
      const date = new Date(c.updatedAt).toLocaleDateString('uk-UA') + '  ' + new Date(c.updatedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      if (c.type === 'directory' || c.type === 'drive') {
        dirCount++;
        this.println(`${date}    <DIR>          ${c.name}`);
      } else {
        fileCount++;
        totalBytes += c.size || 0;
        const sizeStr = String(c.size || 0).padStart(14, ' ');
        this.println(`${date} ${sizeStr} ${c.name}`);
      }
    });

    this.println(`               ${fileCount} файлів    ${totalBytes} байтів`);
    this.println(`               ${dirCount} папок     124 500 000 байтів вільно`);
  }

  cmdTree() {
    const curr = vfs.resolvePath(this.cwd);
    if (!curr) return;
    this.println(`Структура папок для тома ${curr.name}`);

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
