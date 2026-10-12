/**
 * CertificateGenerator: Генерація персонального PDF-сертифіката учня для EduOS
 * Створює A4 альбомний сертифікат з декоративною рамкою, логотипом та повною підтримкою кирилиці.
 */
export class CertificateGenerator {
  static async generateCertificate(data = {}) {
    const {
      studentName = 'Учень',
      gradeClass = '6-А',
      topicTitle = 'Практична робота з інформатики',
      earnedPoints = 12,
      maxPoints = 12,
      percentage = 100,
      grade12 = 12,
      date = new Date().toLocaleDateString('uk-UA')
    } = data;

    // Створюємо High-DPI Canvas для ідеальної векторно-растрової кирилиці
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1131; // A4 Landscape (1.414 ratio)
    const ctx = canvas.getContext('2d');

    // 1. Фон
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Декоративна подвійна рамка
    ctx.strokeStyle = '#0078d4';
    ctx.lineWidth = 14;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    ctx.strokeStyle = '#ffb900';
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

    // 3. Заголовок
    ctx.fillStyle = '#004578';
    ctx.font = 'bold 34px "Segoe UI", Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('НАВЧАЛЬНА ПЛАТФОРМА «EduOS»', canvas.width / 2, 130);

    ctx.fillStyle = '#107c41';
    ctx.font = '600 24px "Segoe UI", Inter, sans-serif';
    ctx.fillText('ІНТЕРАКТИВНЕ СЕРЕДОВИЩЕ ОПЕРАЦІЙНОЇ СИСТЕМИ', canvas.width / 2, 175);

    // 4. Головний напис
    ctx.fillStyle = '#201f1e';
    ctx.font = 'bold 72px "Segoe UI", Inter, sans-serif';
    ctx.fillText('С Е Р Т И Ф І К А Т', canvas.width / 2, 290);

    ctx.fillStyle = '#605e5c';
    ctx.font = '26px "Segoe UI", Inter, sans-serif';
    ctx.fillText('Цим підтверджується, що учень / учениця', canvas.width / 2, 360);

    // 5. Ім'я учня
    ctx.fillStyle = '#0078d4';
    ctx.font = 'bold 56px "Segoe UI", Inter, sans-serif';
    ctx.fillText(studentName, canvas.width / 2, 450);

    ctx.fillStyle = '#323130';
    ctx.font = 'bold 30px "Segoe UI", Inter, sans-serif';
    ctx.fillText(`Клас: ${gradeClass}`, canvas.width / 2, 510);

    ctx.fillStyle = '#605e5c';
    ctx.font = '26px "Segoe UI", Inter, sans-serif';
    ctx.fillText('успішно виконав(-ла) практичну роботу за темою:', canvas.width / 2, 580);

    // 6. Тема
    ctx.fillStyle = '#201f1e';
    ctx.font = 'bold 38px "Segoe UI", Inter, sans-serif';
    ctx.fillText(`«${topicTitle}»`, canvas.width / 2, 650);

    // 7. Результати та бали
    const boxY = 740;
    ctx.fillStyle = '#f3f9fd';
    ctx.fillRect(canvas.width / 2 - 400, boxY, 800, 140);
    ctx.strokeStyle = '#0078d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width / 2 - 400, boxY, 800, 140);

    ctx.fillStyle = '#0078d4';
    ctx.font = 'bold 28px "Segoe UI", Inter, sans-serif';
    ctx.fillText(`Набрано балів: ${earnedPoints} з ${maxPoints}   |   Успішність: ${percentage}%`, canvas.width / 2, boxY + 55);

    ctx.fillStyle = '#107c41';
    ctx.font = 'bold 34px "Segoe UI", Inter, sans-serif';
    ctx.fillText(`Оцінка за 12-бальною шкалою: ${grade12} БАЛІВ`, canvas.width / 2, boxY + 105);

    // 8. Підпис та печатка
    const bottomY = 990;
    ctx.fillStyle = '#605e5c';
    ctx.font = '22px "Segoe UI", Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Дата видачі: ${date}`, 140, bottomY);
    ctx.fillText('Сертифікат видано локальною системою EduOS v2.0', 140, bottomY + 32);

    // Гербова печатка
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#0078d4';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(canvas.width - 240, bottomY, 55, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#0078d4';
    ctx.font = 'bold 16px "Segoe UI", Inter, sans-serif';
    ctx.fillText('EduOS ONLINE', canvas.width - 240, bottomY - 10);
    ctx.fillText('★ ПЕРЕВІРЕНО ★', canvas.width - 240, bottomY + 12);

    const imgDataUrl = canvas.toDataURL('image/png', 1.0);

    // Відображення модального вікна сертифіката
    this.showCertificateModal(imgDataUrl, studentName, topicTitle);
  }

  static showCertificateModal(imgDataUrl, studentName, topicTitle) {
    const modal = document.createElement('div');
    modal.className = 'edu-modal-overlay';
    modal.innerHTML = `
      <div class="certificate-modal-box">
        <div class="cert-modal-header">
          <h3>🎓 Ваш персональний сертифікат</h3>
          <button class="cert-modal-close">✖</button>
        </div>
        <div class="cert-preview-wrapper">
          <img src="${imgDataUrl}" alt="Сертифікат" class="cert-preview-img" />
        </div>
        <div class="cert-modal-footer">
          <button class="cert-btn-download" id="cert-download-btn">📥 Завантажити PDF / PNG</button>
          <button class="cert-btn-print" id="cert-print-btn">🖨️ Роздрукувати</button>
          <button class="cert-btn-close-bottom">Закрити</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    modal.querySelector('.cert-modal-close').addEventListener('click', closeModal);
    modal.querySelector('.cert-btn-close-bottom').addEventListener('click', closeModal);

    // Завантаження PDF або PNG
    modal.querySelector('#cert-download-btn').addEventListener('click', () => {
      if (window.jspdf && window.jspdf.jsPDF) {
        try {
          const doc = new window.jspdf.jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
          });
          doc.addImage(imgDataUrl, 'PNG', 0, 0, 297, 210);
          doc.save(`Сертифікат_${studentName.replace(/\s+/g, '_')}.pdf`);
          return;
        } catch (e) {
          console.warn('jsPDF export error, falling back to PNG image:', e);
        }
      }

      // Завантаження у форматі PNG
      const a = document.createElement('a');
      a.href = imgDataUrl;
      a.download = `Сертифікат_${studentName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    // Друк
    modal.querySelector('#cert-print-btn').addEventListener('click', () => {
      const win = window.open('');
      win.document.write(`<img src="${imgDataUrl}" style="width:100%;height:auto;" onload="window.print();window.close();"/>`);
      win.document.close();
    });
  }
}
