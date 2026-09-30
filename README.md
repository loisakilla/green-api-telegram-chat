# GREEN-API Telegram Chat

Минималистичный веб-чат для отправки и получения текстовых сообщений в **Telegram** через сервис
[GREEN-API](https://green-api.com/telegram/). Внешний вид повторяет [web.telegram.org](https://web.telegram.org).

Тестовое задание на позицию «Фронтенд-разработчик React».

## Возможности

- Вход по параметрам инстанса GREEN-API: `idInstance`, `apiTokenInstance`, `apiUrl`
  (`apiUrl` подставляется автоматически по первым четырём цифрам `idInstance`, его можно поправить).
  При входе состояние инстанса проверяется методом `getStateInstance`.
- Создание чата по номеру телефона. Номер нормализуется (`8 999…` → `7999…`), затем методом
  [`CheckAccount`](https://green-api.com/telegram/docs/api/service/CheckAccount/) определяется `chatId` —
  так рекомендует документация Telegram-версии GREEN-API.
- Отправка текстовых сообщений методом
  [`SendMessage`](https://green-api.com/telegram/docs/api/sending/SendMessage/).
- Получение сообщений технологией
  [HTTP API](https://green-api.com/telegram/docs/api/receiving/technology-http-api/): бесконечный цикл
  `ReceiveNotification` → обработка → `DeleteNotification`.
- Ответ собеседника попадает в тот же чат: сопоставление идёт по `chatId`, а если чат был создан
  по номеру — по `senderPhoneNumber`. Сообщения от новых собеседников создают чат автоматически.
- Статусы сообщений как в Telegram: часы — отправляется, одна галочка — отправлено, две — прочитано,
  ошибка с кнопкой повтора. Статус прочтения приходит уведомлением `outgoingMessageStatus`. Счётчик непрочитанных,
  индикатор соединения, поиск по чатам.
- Адаптивная вёрстка (на телефоне — список и чат на отдельных экранах), светлая и тёмная тема
  по системной настройке.
- Чаты хранятся в `localStorage` отдельно для каждого инстанса, выход очищает данные.

Только текстовые сообщения — медиа, группы и статусы доставки намеренно не обрабатываются
(уведомления о них удаляются из очереди, чтобы не блокировать её).

## Стек

React 19, TypeScript, Vite, Vitest. Без UI-библиотек и стейт-менеджеров: состояние чатов — чистый
reducer (`src/state/chats.ts`), покрытый тестами.

## Подготовка инстанса GREEN-API

1. Зарегистрируйтесь в [личном кабинете](https://console.green-api.com), создайте инстанс
   **Telegram** и авторизуйте его (QR-код в приложении Telegram: Настройки → Устройства →
   Подключить устройство).
2. В настройках инстанса:
   - поле **webhookUrl должно быть пустым** — иначе HTTP API не отдаёт уведомления;
   - включите **получение входящих уведомлений** (`incomingWebhook`);
   - включите **уведомления о статусах отправленных сообщений** (`outgoingWebhook`) — без них
     не будет второй галочки «прочитано»;
   - по желанию включите `outgoingMessageWebhook` — тогда в чате появятся и сообщения,
     отправленные с телефона.
3. Скопируйте `idInstance`, `apiTokenInstance` и `apiUrl`.

## Локальный запуск

Нужен Node.js 22.12+.

```bash
npm install
npm run dev
```

Откройте http://localhost:5173, введите параметры инстанса, нажмите на карандаш, укажите номер
получателя и отправьте сообщение. Ответ из Telegram появится в чате через несколько секунд.

Прочие команды:

```bash
npm test          # юнит-тесты
npm run build     # production-сборка в dist/
npm run preview   # просмотр сборки
```

## Деплой

В репозитории есть workflow `.github/workflows/deploy.yml`: при пуше в `main` он прогоняет тесты,
собирает проект и публикует его на GitHub Pages. Нужно один раз включить
**Settings → Pages → Source: GitHub Actions**. Сборка использует относительные пути (`base: './'`),
поэтому работает на любом подпути.

## Структура

```
src/
  api/greenApi.ts            клиент GREEN-API (getStateInstance, checkAccount, sendMessage,
                             receiveNotification, deleteNotification)
  hooks/useNotificationPolling.ts   цикл получения уведомлений
  lib/notifications.ts       разбор входящих уведомлений
  lib/phone.ts               нормализация и форматирование номеров
  lib/storage.ts             localStorage
  state/chats.ts             reducer чатов и сообщений
  components/                LoginScreen, Messenger, Sidebar, NewChatPanel, ChatView
```

## Безопасность

`apiTokenInstance` хранится в `localStorage` браузера и отправляется напрямую в GREEN-API — это
приемлемо для прототипа, которым пользуется владелец инстанса. Для продакшена запросы стоит
проксировать через бэкенд, чтобы токен не попадал на клиент.
