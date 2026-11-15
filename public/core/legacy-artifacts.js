// Frozen 0.6.0 definitions for saves and reports without a catalog snapshot.
export const LEGACY_ARTIFACTS = {
  "steelMagnet": {
    "name": "Стальной магнит",
    "icon": "steel",
    "color": "steel",
    "cost": 0,
    "introduced": 4,
    "glyphBonus": {
      "steel": 50
    },
    "text": "Клинки выпадают чаще: +50 к их весу выпадения. Базовый вес — 100, предел с учётом класса и артефактов — 200. Доли остальных глифов уменьшаются.",
    "en": {
      "name": "Steel Magnet",
      "text": "Blades appear more often: +50 to their spawn weight. Base weight: 100; cap including class and artifacts: 200. Other glyphs become proportionally less frequent."
    },
    "rarity": "normal",
    "enabled": true,
    "base": null,
    "rules": []
  },
  "emberResonator": {
    "name": "Угольный резонатор",
    "icon": "fire",
    "color": "fire",
    "cost": 0,
    "introduced": 4,
    "glyphBonus": {
      "fire": 50
    },
    "text": "Огонь выпадает чаще: +50 к его весу выпадения. Базовый вес — 100, предел с учётом класса и артефактов — 200. Доли остальных глифов уменьшаются.",
    "en": {
      "name": "Ember Resonator",
      "text": "Fire appears more often: +50 to its spawn weight. Base weight: 100; cap including class and artifacts: 200. Other glyphs become proportionally less frequent."
    },
    "rarity": "normal",
    "enabled": true,
    "base": null,
    "rules": []
  },
  "frostResonator": {
    "name": "Криогенный резонатор",
    "icon": "ice",
    "color": "ice",
    "cost": 0,
    "introduced": 4,
    "glyphBonus": {
      "ice": 50
    },
    "text": "Холод выпадает чаще: +50 к его весу выпадения. Базовый вес — 100, предел с учётом класса и артефактов — 200. Доли остальных глифов уменьшаются.",
    "en": {
      "name": "Cryogenic Resonator",
      "text": "Frost appears more often: +50 to its spawn weight. Base weight: 100; cap including class and artifacts: 200. Other glyphs become proportionally less frequent."
    },
    "rarity": "normal",
    "enabled": true,
    "base": null,
    "rules": []
  },
  "sporeLure": {
    "name": "Споровая приманка",
    "icon": "poison",
    "color": "poison",
    "cost": 0,
    "introduced": 4,
    "glyphBonus": {
      "poison": 50
    },
    "text": "Яд выпадает чаще: +50 к его весу выпадения. Базовый вес — 100, предел с учётом класса и артефактов — 200. Доли остальных глифов уменьшаются.",
    "en": {
      "name": "Spore Lure",
      "text": "Poison appears more often: +50 to its spawn weight. Base weight: 100; cap including class and artifacts: 200. Other glyphs become proportionally less frequent."
    },
    "rarity": "normal",
    "enabled": true,
    "base": null,
    "rules": []
  },
  "still": {
    "name": "Перегонный куб",
    "icon": "heal",
    "color": "heal",
    "cost": 0,
    "introduced": 4,
    "glyphBonus": {
      "heal": 50
    },
    "text": "Зелья выпадают чаще: +50 к их весу выпадения. Базовый вес — 100, предел с учётом класса и артефактов — 200. Доли остальных глифов уменьшаются.",
    "en": {
      "name": "Distillation Still",
      "text": "Potions appear more often: +50 to their spawn weight. Base weight: 100; cap including class and artifacts: 200. Other glyphs become proportionally less frequent."
    },
    "rarity": "normal",
    "enabled": true,
    "base": null,
    "rules": []
  },
  "thermal": {
    "name": "Термопара",
    "icon": "fire",
    "color": "fire",
    "text": "Один раз за действие: первая группа огня, попавшая по цели с ознобом, наносит ×1,5 урона и снимает весь озноб.",
    "cost": 0,
    "en": {
      "name": "Thermocouple",
      "text": "Once per action, the first Fire match to hit a target with Chill deals ×1.5 damage and removes all Chill."
    },
    "rarity": "normal",
    "introduced": 0,
    "enabled": true,
    "base": "thermal",
    "glyphBonus": {},
    "rules": []
  },
  "ash": {
    "name": "Пепельная линза",
    "icon": "fire",
    "color": "fire",
    "text": "Каждая группа огня из 4+ фишек задевает первого другого живого противника: 50% базового урона группы с учётом его сопротивления огню.",
    "cost": 0,
    "en": {
      "name": "Ashen Lens",
      "text": "Each Fire match of 4+ tiles also hits the first other living enemy for 50% of the match’s base damage, modified by that enemy’s Fire resistance."
    },
    "rarity": "normal",
    "introduced": 0,
    "enabled": true,
    "base": "ash",
    "glyphBonus": {},
    "rules": []
  },
  "frost": {
    "name": "Инеевый маховик",
    "icon": "ice",
    "color": "ice",
    "text": "Первая группа холода за действие добавляет 1 дополнительный заряд озноба, если цель выжила. Максимум — 2 заряда.",
    "cost": 0,
    "en": {
      "name": "Frostwheel",
      "text": "The first Frost match per action adds 1 extra Chill stack if the target survives. Maximum: 2 stacks."
    },
    "rarity": "normal",
    "introduced": 0,
    "enabled": true,
    "base": "frost",
    "glyphBonus": {},
    "rules": []
  },
  "needle": {
    "name": "Игольчатый клинок",
    "icon": "steel",
    "color": "poison",
    "text": "Каждая группа клинков из 4+ фишек добавляет 2 заряда яда, если цель выжила.",
    "cost": 0,
    "en": {
      "name": "Needleblade",
      "text": "Each Blade match of 4+ tiles adds 2 Poison stacks if the target survives."
    },
    "rarity": "normal",
    "introduced": 0,
    "enabled": true,
    "base": "needle",
    "glyphBonus": {},
    "rules": []
  },
  "green": {
    "name": "Зелёная реторта",
    "icon": "heal",
    "color": "poison",
    "text": "Первая группа зелий за действие добавляет цели 2 заряда яда. Работает даже при заблокированном лечении.",
    "cost": 0,
    "en": {
      "name": "Green Retort",
      "text": "The first Potion match per action adds 2 Poison stacks to the target. Works even when healing is blocked."
    },
    "rarity": "normal",
    "introduced": 0,
    "enabled": true,
    "base": "green",
    "glyphBonus": {},
    "rules": []
  },
  "coil": {
    "name": "Каскадная катушка",
    "icon": "storm",
    "color": "ice",
    "text": "Один раз за действие: при первой дополнительной волне наносит цели 3 физического урона.",
    "cost": 0,
    "en": {
      "name": "Cascade Coil",
      "text": "Once per action, the first additional match wave deals 3 physical damage to the target."
    },
    "rarity": "normal",
    "introduced": 0,
    "enabled": true,
    "base": "coil",
    "glyphBonus": {},
    "rules": []
  },
  "spore": {
    "name": "Споровый конденсатор",
    "icon": "poison",
    "color": "poison",
    "text": "После гибели противника от яда половина оставшихся зарядов переходит к первому живому противнику с округлением вниз. Потраченный заряд снимается до переноса.",
    "cost": 3,
    "en": {
      "name": "Spore Condenser",
      "text": "When Poison damage defeats an enemy, half its remaining Poison stacks transfer to the first living enemy, rounded down. The spent stack is removed before the transfer."
    },
    "rarity": "normal",
    "introduced": 0,
    "enabled": true,
    "base": "spore",
    "glyphBonus": {},
    "rules": []
  },
  "glove": {
    "name": "Перчатка механика",
    "icon": "compass",
    "color": "steel",
    "text": "После действия с группой из 4+ фишек очищает одну соседнюю клетку от кратера, цепи или нестабильности. Разрушенные клетки не восстанавливает.",
    "cost": 3,
    "en": {
      "name": "Mechanic’s Glove",
      "text": "After an action containing a match of 4+ tiles, clears one adjacent cell of a crater, chains or instability. Does not restore destroyed cells."
    },
    "rarity": "normal",
    "introduced": 0,
    "enabled": true,
    "base": "glove",
    "glyphBonus": {},
    "rules": []
  },
  "glass": {
    "name": "Стеклянный реактор",
    "icon": "storm",
    "color": "fire",
    "text": "Базовые эффекты групп огня, холода и яда из 4+ фишек сильнее на 25%. Весь входящий урон выше на 20%.",
    "cost": 4,
    "en": {
      "name": "Glass Reactor",
      "text": "Fire, Frost and Poison matches of 4+ tiles have 25% stronger base effects. All incoming damage increases by 20%."
    },
    "rarity": "normal",
    "introduced": 0,
    "enabled": true,
    "base": "glass",
    "glyphBonus": {},
    "rules": []
  },
  "ampoule": {
    "name": "Ампула избытка",
    "icon": "heal",
    "color": "heal",
    "text": "Один раз за действие: первое избыточное лечение от зелий наносит половину избытка как физический урон с округлением вниз. Заблокированное лечение не создаёт избытка.",
    "cost": 4,
    "en": {
      "name": "Overflow Ampoule",
      "text": "Once per action, the first overhealing from a Potion match deals half the excess as physical damage, rounded down. Blocked healing creates no excess."
    },
    "rarity": "normal",
    "introduced": 0,
    "enabled": true,
    "base": "ampoule",
    "glyphBonus": {},
    "rules": []
  },
  "overclock": {
    "name": "Форсированный привод",
    "icon": "storm",
    "color": "ice",
    "cost": 0,
    "introduced": 3,
    "text": "Три действия за раунд. Каждый переход даёт на 1 меньше расстояния от шторма; переход по штормовому пути может увеличить глубину на 1.",
    "en": {
      "name": "Overdrive",
      "text": "Three actions per round. Each transition grants 1 less distance from the storm; a storm-path transition can take you 1 step deeper."
    },
    "rarity": "normal",
    "enabled": true,
    "base": "overclock",
    "glyphBonus": {},
    "rules": []
  },
  "stormweave": {
    "name": "Грозовая перевязь",
    "icon": "heal",
    "color": "heal",
    "cost": 0,
    "introduced": 3,
    "rarity": "rare",
    "text": "Внутри шторма первая группа из 4+ фишек за действие восстанавливает 4 здоровья. Любой тип фишек, даже зелья; обычный запрет лечения не мешает.",
    "en": {
      "name": "Stormweave Sash",
      "text": "Inside the storm, your first match of 4+ tiles per action restores 4 health. Works with any tile type, even Potions, despite the normal healing block."
    },
    "enabled": true,
    "base": "stormweave",
    "glyphBonus": {},
    "rules": []
  },
  "tempestHeart": {
    "name": "Сердце бури",
    "icon": "heart",
    "color": "heal",
    "cost": 0,
    "introduced": 3,
    "rarity": "rare",
    "text": "Запрещает всё лечение вне шторма. Внутри шторма зелья и лечебные события снова восстанавливают здоровье.",
    "en": {
      "name": "Tempest Heart",
      "text": "Blocks all healing outside the storm. Inside the storm, Potions and healing events can restore health again."
    },
    "enabled": true,
    "base": "tempestHeart",
    "glyphBonus": {},
    "rules": []
  },
  "grounding": {
    "name": "Заземляющая катушка",
    "icon": "steel",
    "color": "ice",
    "cost": 0,
    "introduced": 3,
    "rarity": "rare",
    "text": "Каждая группа из 4+ фишек заряжает метеоритный щит до 4. Не складывается выше 4. Не защищает от атак противников и появления кратера.",
    "en": {
      "name": "Grounding Coil",
      "text": "Each match of 4+ tiles recharges your Meteor shield to 4. Cannot stack above 4. Does not block enemy attacks or prevent craters."
    },
    "enabled": true,
    "base": "grounding",
    "glyphBonus": {},
    "rules": []
  },
  "stormlens": {
    "name": "Линза эпицентра",
    "icon": "fire",
    "color": "fire",
    "cost": 0,
    "introduced": 3,
    "rarity": "rare",
    "text": "Внутри шторма первая группа из 4+ фишек за действие дополнительно наносит 4/8/12 физического урона на глубине 1–3/4–6/7+.",
    "en": {
      "name": "Storm’s Eye Lens",
      "text": "Inside the storm, your first match of 4+ tiles per action also deals 4/8/12 physical damage at depth 1–3/4–6/7+."
    },
    "enabled": true,
    "base": "stormlens",
    "glyphBonus": {},
    "rules": []
  },
  "stormcompass": {
    "name": "Компас обратного ветра",
    "icon": "compass",
    "color": "poison",
    "cost": 0,
    "introduced": 3,
    "rarity": "rare",
    "text": "Переход, начатый внутри шторма, даёт ещё +2 расстояния к выходу. Складывается со штрафом Форсированного привода.",
    "en": {
      "name": "Backwind Compass",
      "text": "A transition started inside the storm grants +2 extra distance toward the exit. Combines with the Overdrive penalty."
    },
    "enabled": true,
    "base": "stormcompass",
    "glyphBonus": {},
    "rules": []
  }
};
