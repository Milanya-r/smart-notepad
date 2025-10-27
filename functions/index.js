const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

/**
 * HTTP-триггер для установки, обновления или удаления напоминания.
 * Принимает POST-запрос с данными от клиента.
 */
exports.setReminder = functions.https.onRequest(async (req, res) => {
  // Разрешаем CORS-запросы от любого источника
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    // Обрабатываем preflight-запрос для CORS
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const {
    noteId,
    token,
    noteTitle,
    noteContent,
    newReminder,
  } = req.body;

  if (!noteId || !token) {
    functions.logger.error("Validation failed: noteId or token is missing.", {body: req.body});
    res.status(400).send("Bad Request: Missing noteId or token.");
    return;
  }

  const reminderRef = db.collection("reminders").doc(noteId);

  try {
    if (newReminder && newReminder.nextDueDate) {
      // Если есть новое напоминание, создаем или обновляем запись в Firestore
      await reminderRef.set({
        token: token,
        title: noteTitle,
        content: noteContent,
        sendAt: newReminder.nextDueDate, // Время следующей отправки
        reminderData: newReminder, // Сохраняем все данные о напоминании
      });
      functions.logger.info(`Reminder set for note ${noteId} at ${new Date(newReminder.nextDueDate).toISOString()}`);
      res.status(200).send({message: "Reminder set successfully."});
    } else {
      // Если нового напоминания нет, значит, его нужно удалить
      await reminderRef.delete();
      functions.logger.info(`Reminder deleted for note ${noteId}`);
      res.status(200).send({message: "Reminder deleted successfully."});
    }
  } catch (error) {
    functions.logger.error("Error setting/deleting reminder for note " + noteId, error);
    res.status(500).send("Internal Server Error");
  }
});


/**
 * Функция, запускаемая по расписанию (каждую минуту),
 * для проверки и отправки PUSH-уведомлений.
 */
exports.sendNotifications = functions.pubsub.schedule("every 1 minutes").onRun(async (context) => {
  const now = Date.now();
  const query = db.collection("reminders").where("sendAt", "<=", now);

  const remindersSnapshot = await query.get();
  if (remindersSnapshot.empty) {
    functions.logger.log("No reminders to send.");
    return null;
  }

  const promises = [];
  remindersSnapshot.forEach((doc) => {
    const reminder = doc.data();

    // Отправляем PUSH-уведомление
    const message = {
      notification: {
        title: reminder.title,
        body: reminder.content,
      },
      token: reminder.token,
    };

    const sendPromise = admin.messaging().send(message)
        .then((response) => {
          functions.logger.info(`Successfully sent message for note ${doc.id}:`, response);
          // После успешной отправки решаем, что делать с напоминанием
          const nextDueDate = calculateNextDueDate(reminder.reminderData, now);

          if (nextDueDate) {
            // Если есть следующая дата, обновляем запись
            return doc.ref.update({sendAt: nextDueDate});
          } else {
            // Если это было последнее напоминание, удаляем запись
            return doc.ref.delete();
          }
        })
        .catch((error) => {
          functions.logger.error(`Error sending message for note ${doc.id}:`, error);
          // Если токен недействителен, удаляем напоминание, чтобы не пытаться отправить его снова
          if (error.code === "messaging/registration-token-not-registered") {
            return doc.ref.delete();
          }
          return null;
        });

    promises.push(sendPromise);
  });

  return Promise.all(promises);
});

/**
 * Вспомогательная функция для вычисления следующей даты напоминания.
 * Логика скопирована с клиентской части для консистентности.
 * @param {object} reminder - Объект напоминания.
 * @param {number} lastCheckTime - Время последней проверки.
 * @return {number|null} - Временная метка следующего напоминания или null.
 */
function calculateNextDueDate(reminder, lastCheckTime) {
  if (!reminder) return null;

  const sortedTimes = reminder.times
      .map((t) => {
        const [h, m] = t.split(":").map(Number);
        return {h, m};
      })
      .sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));

  const searchDate = new Date(lastCheckTime);
  searchDate.setHours(0, 0, 0, 0);

  const startDate = new Date(reminder.startDate);
  startDate.setHours(0, 0, 0, 0);

  // Ищем следующую подходящую дату в пределах 2 лет
  for (let i = 0; i < 730; i++) {
    if (searchDate.getTime() >= startDate.getTime()) {
      let isValidDay = false;
      switch (reminder.type) {
        case "daily":
          isValidDay = true;
          break;
        case "weekly":
          isValidDay = reminder.daysOfWeek?.includes(searchDate.getDay()) ?? false;
          break;
        case "monthly":
          isValidDay = searchDate.getDate() === new Date(reminder.startDate).getDate();
          break;
        case "single":
          // Для одноразовых напоминаний, мы уже отправили его,
          // поэтому больше не ищем.
          return null;
      }

      if (isValidDay) {
        for (const time of sortedTimes) {
          const dueDate = new Date(searchDate);
          dueDate.setHours(time.h, time.m, 0, 0);

          if (dueDate.getTime() > lastCheckTime) {
            if (reminder.endDate && dueDate.getTime() > new Date(reminder.endDate).getTime()) {
              return null;
            }
            return dueDate.getTime();
          }
        }
      }
    }
    searchDate.setDate(searchDate.getDate() + 1);
  }

  return null;
}
