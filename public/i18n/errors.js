import { t } from './index.js';

// Legacy rule/save APIs retain their messages; translation belongs to the presentation boundary.
const legacyKeys={
  'Хранилище браузера недоступно':'storage.unavailable',
  'Повреждённая структура сохранения':'storage.corrupt',
  'Сохранение другой версии. Можно выгрузить его и начать новый профиль.':'storage.incompatible',
  'Сердце бури запрещает лечение вне шторма':'choice.heart',
  'Шторм блокирует лечение':'choice.storm',
  'Этот артефакт уже есть':'choice.owned',
  'Недостаточно здоровья':'choice.health',
};
export function errorText(message){return legacyKeys[message]?t(legacyKeys[message]):message==='storage.unavailable'?t(message):String(message??'');}
