Файлы для GitHub Pages Mini App

1. Залей index.html, styles.css и app.js в корень репозитория.
2. Открой Settings -> Pages -> Deploy from a branch -> main / root.
3. Дождись URL GitHub Pages.
4. В app.js замени PASTE_YOUR_N8N_WEBHOOK_URL_HERE на production webhook URL из n8n.
5. Используй URL GitHub Pages в кнопке web app у Telegram-бота.

Архитектура:
Telegram Bot -> GitHub Pages Mini App -> n8n Webhook -> Google Sheets / Jira
