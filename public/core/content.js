import { ARTIFACT_CATALOG } from './artifact-catalog.js';
const attack = (amount, name) => ({kind:'attack', amount, name});
const hazard = (kind, amount, name) => ({kind, amount, name});
export const GLYPH_RULES = {base:100,max:200};
export const ENEMIES = {
  furnace: {name:'Печной автомат', tag:'Конструкт', hp:110, art:'furnace-automaton', flavor:'Огонь в его груди не гаснет сто лет. Холод немного исправит ситуацию.', resists:{fire:.5,ice:1.5}, intents:[attack(7,'Удар поршнем'),attack(10,'Раскалённый кулак'),attack(14,'Тяжёлый удар')]},
  sentinel: {name:'Латунный дозорный', tag:'Страж', hp:90, art:'furnace-automaton', flavor:'Сначала наводит орудие. Потом задаёт вопросы. Обычно уже некому.', resists:{ice:.5,steel:1.5}, intents:[attack(5,'Залп'),hazard('charge',0,'Заряжает орудие'),attack(16,'Пробивной выстрел')]},
  collector: {name:'Споровый сборщик', tag:'Мутант', hp:100, art:'spore-collector', flavor:'Город забыл его имя. Грибы оказались внимательнее.', resists:{poison:.5,fire:1.5}, intents:[attack(6,'Плеть спор'),attack(9,'Обвал мицелия'),attack(7,'Кислый выброс')]},
  guardian: {name:'Панцирный хранитель', tag:'Конструкт', hp:130, art:'furnace-automaton', flavor:'Латунь выдержит клинок. Но яд найдёт дорогу к живому сердцу.', resists:{steel:.5,poison:1.5}, intents:[attack(7,'Таран'),attack(12,'Дробящий удар'),attack(8,'Обратный ход')]},
  jailer: {name:'Рунный тюремщик', tag:'Элита', hp:185, art:'rune-jailer', flavor:'Его цепи держат сам эфир. Собери скованные фишки, чтобы разорвать печать.', resists:{ice:1.5}, intents:[hazard('locks',3,'Сковывает 3 клетки'),attack(10,'Удар цепью'),attack(15,'Приговор')]},
  alchemist: {name:'Сорванный алхимик', tag:'Элита', hp:180, art:'spore-collector', flavor:'Эксперимент удался. Правда, никто не договаривался, что именно считать успехом.', resists:{poison:.5,fire:1.5}, intents:[hazard('unstable',3,'Заражает 3 клетки'),attack(14,'Едкий выброс'),attack(9,'Осколки колбы')]},
  heart: {name:'Сердце котельной', tag:'Босс', hp:320, art:'boiler-heart', flavor:'Оно питало нижний город. Теперь город питает его.', resists:{fire:.5,ice:1.5}, intents:[attack(9,'Гул реактора'),attack(12,'Эфирный выброс'),attack(15,'Перегрузка')], second:[attack(12,'Разрыв контура'),hazard('unstable',2,'Нестабильный эфир'),attack(17,'Последний импульс')]},
};
export const ARTIFACTS = ARTIFACT_CATALOG.items;
export const LOADOUTS = {
  coil:{name:'Каскадный инженер',subtitle:'Цепные реакции',artifact:'coil',cost:0},
  thermal:{name:'Термотехник',subtitle:'Холод → огонь',artifact:'thermal',cost:6,glyphBonus:{fire:25,ice:25}},
  needle:{name:'Токсиколог',subtitle:'Клинки + яд',artifact:'needle',cost:6,glyphBonus:{steel:25,poison:25}},
};
export const ACHIEVEMENTS = {
  first_blood:{name:'Первый демонтаж',text:'Победи в первом бою.'},
  chain_reaction:{name:'Цепная реакция',text:'Запусти 3 волны совпадений за одно действие.'},
  venom:{name:'Отложенный результат',text:'Победи противника уроном яда.'},
  spectrum:{name:'Полный спектр',text:'Собери 4 типа фишек за действие.'},
  elite:{name:'Нарушитель протокола',text:'Победи элитного противника.'},
  boss:{name:'Тишина в котельной',text:'Останови Сердце котельной.'},
};
export const EVENTS = {
  experiment:{name:'Незавершённый опыт',text:'На столе дрожит колба с живым эфиром. Запись на полях обещает открытие. Подпись автора обрывается.',icon:'poison',choices:[{id:'study',name:'Завершить опыт',text:'−8 здоровья · +4 искры · шторм ближе на 1',hp:-8,embers:4,time:1},{id:'leave',name:'Не трогать',text:'Уйти без последствий'}]},
  workshop:{name:'Слепой мастер',text:'Мастер на ощупь перебирает шестерни. Он может залатать твой контур — или научить чему-то полезному.',icon:'compass',choices:[{id:'repair',name:'Починить контур',text:'+12 здоровья · шторм ближе на 2',heal:12,time:2},{id:'learn',name:'Разобрать чертёж',text:'+3 искры · шторм ближе на 1',embers:3,time:1}]},
  fountain:{name:'Эфирный источник',text:'Между мостовыми плитами светится чистый эфир. Можно восстановить силы. Можно не ждать, пока его найдёт шторм.',icon:'heal',choices:[{id:'drink',name:'Восстановить силы',text:'+16 здоровья · шторм ближе на 2',heal:16,time:2},{id:'hurry',name:'Поспешить',text:'+1 расстояния от шторма',gap:1}]},
  rest:{name:'Тихая мастерская',text:'Здесь ещё держится защитный контур. До котельной совсем близко. Реши, что сейчас нужнее: здоровье или время.',icon:'heal',choices:[{id:'rest',name:'Перевести дух',text:'+20 здоровья · шторм ближе на 2',heal:20,time:2},{id:'hurry',name:'Не задерживаться',text:'+1 расстояния от шторма',gap:1}]},
  ashCaravan:{name:'Караван в пепле',text:'Обломки повозки держатся на последних рунах. Среди пепла ещё вращается привод. Метки караванщиков ведут к краю фронта.',icon:'storm',choices:[{id:'salvage',name:'Снять привод',text:'−6 здоровья · шторм ближе на 1 · Форсированный привод',hp:-6,time:1,artifact:'overclock'},{id:'markers',name:'Уйти по меткам',text:'+2 расстояния от шторма',gap:2}]},
  groundTower:{name:'Заземляющая башня',text:'Молнии заперты в медной решётке. Можно включить маяк и найти путь к фронту — или собрать энергию, пока буря не поглотила башню.',icon:'storm',choices:[{id:'beacon',name:'Запустить маяк',text:'−6 здоровья · +3 расстояния от шторма',hp:-6,gap:3},{id:'condensate',name:'Собрать конденсат',text:'+4 искры · шторм ближе на 2',embers:4,time:2}]},

};
