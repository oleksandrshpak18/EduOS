/**
 * Validators: Декларативний рушій перевірки навчальних завдань EduOS
 * Виконує перевірку стану VFS, атрибутів та журналу дій учня без використання eval().
 */
import { vfs } from '../core/filesystem.js';
import { auditLogger } from '../core/audit-log.js';

export class TaskValidators {
  static async validate(rule) {
    if (!rule || !rule.type) {
      return { success: true, message: 'Правило перевірки відсутнє' };
    }

    const { type, params = {} } = rule;

    switch (type) {
      case 'directory_exists': {
        const node = vfs.resolvePath(params.path);
        if (node && (node.type === 'directory' || node.type === 'drive')) {
          return { success: true, message: `Папку знайдено: ${params.path}` };
        }
        return { success: false, message: `Папку не знайдено за шляхом: ${params.path}` };
      }

      case 'file_exists': {
        const node = vfs.resolvePath(params.path);
        if (!node || node.type !== 'file') {
          return { success: false, message: `Файл не знайдено за шляхом: ${params.path}` };
        }
        if (params.matchContent && params.expectedContent) {
          const content = String(node.content || '').trim();
          const expected = String(params.expectedContent).trim();
          if (content !== expected) {
            return { success: false, message: `Вміст файлу не збігається з очікуваним.` };
          }
        }
        return { success: true, message: `Файл знайдено: ${params.path}` };
      }

      case 'node_not_exists': {
        const node = vfs.resolvePath(params.path);
        if (!node) {
          return { success: true, message: `Об'єкт успішно видалено` };
        }
        return { success: false, message: `Об'єкт все ще існує: ${params.path}` };
      }

      case 'recycle_bin_contains': {
        let trash = null;
        for (const n of vfs.nodes.values()) {
          if (n.type === 'drive' && n.metadata && n.metadata.isRecycleBin) {
            trash = n;
            break;
          }
        }
        if (!trash) return { success: false, message: 'Кошик не знайдено' };
        const items = vfs.listChildren(trash.id);
        const found = items.find((i) => i.name.toLowerCase() === params.name.toLowerCase());
        if (found) {
          return { success: true, message: `Файл знайдено в Кошику` };
        }
        return { success: false, message: `Файл "${params.name}" не знайдено в Кошику` };
      }

      case 'attribute_check': {
        const node = vfs.resolvePath(params.path);
        if (!node) return { success: false, message: `Файл не знайдено: ${params.path}` };
        const attrName = params.attribute;
        const expected = params.expectedValue;
        if (node.attributes && node.attributes[attrName] === expected) {
          return { success: true, message: `Атрибут "${attrName}" встановлено вірно` };
        }
        return { success: false, message: `Атрибут "${attrName}" не встановлено як очікувалось` };
      }

      case 'archive_contains_file': {
        const node = vfs.resolvePath(params.archivePath);
        if (!node) return { success: false, message: `Архів не знайдено: ${params.archivePath}` };

        // Перевірка через симульовані метадані або вміст
        const entries = (node.metadata && node.metadata.simulatedEntries) || [];
        const hasFile = entries.some((e) => e.name.toLowerCase().includes(params.fileName.toLowerCase())) ||
                        String(node.content || '').toLowerCase().includes(params.fileName.toLowerCase());
        if (hasFile) {
          return { success: true, message: `Файл "${params.fileName}" присутній в архіві` };
        }
        return { success: false, message: `Файл "${params.fileName}" не знайдено всередині архіву` };
      }

      case 'command_executed': {
        const hasCmd = auditLogger.hasAction('terminal_command', (details) => {
          const cmdMatch = Array.isArray(params.command)
            ? params.command.includes(details.command)
            : details.command === params.command;
          if (!cmdMatch) return false;
          if (params.target) {
            return details.full && details.full.toLowerCase().includes(params.target.toLowerCase());
          }
          return true;
        });
        if (hasCmd) {
          return { success: true, message: 'Команду успішно виконано в терміналі' };
        }
        return { success: false, message: 'Очікувану команду ще не було виконано в терміналі' };
      }

      case 'setting_changed': {
        const hasSetting = auditLogger.hasAction('setting_changed', (details) => {
          return details.category === params.category;
        });
        if (hasSetting) {
          return { success: true, message: 'Налаштування змінено успішно' };
        }
        return { success: false, message: 'Параметри оформлення ще не було змінено' };
      }

      case 'app_opened': {
        const hasApp = auditLogger.hasAction('app_opened', (details) => {
          return details.appId === params.appId;
        });
        if (hasApp) {
          return { success: true, message: 'Програму було успішно відкрито' };
        }
        return { success: false, message: 'Необхідну програму ще не відкрито' };
      }

      default:
        return { success: true, message: 'Перевірку пройдено' };
    }
  }
}
