# Глоссарий Искропада / Sparkfall

Стандарт терминов RU/EN для текущих правил. Определения совпадают со справкой игры. Правила вординга и локализации: [LOCALIZATION.md](LOCALIZATION.md).

Документ формируется командой `npm run glossary` из `public/i18n/glossary-data.js` и каталогов контента. Определения исправлять в источнике, затем обновлять этот файл. Проверка синхронизации входит в `npm test`.

## Поле и время

| ID | Русский | Английский | Определение | Определение EN |
| --- | --- | --- | --- | --- |
| `board` | Поле | Board | Игровая сетка 7 × 7. Меняй соседние фишки и собирай линии одного типа. | A 7 × 7 grid. Swap adjacent tiles to form lines of the same type. |
| `cell` | Клетка | Cell | Позиция на поле. Цепи, кратеры и нестабильность относятся к клеткам. | A position on the board. Chains, craters and instability belong to cells. |
| `tile` | Фишка | Tile | Объект одного из пяти типов в клетке: клинок, огонь, холод, яд или зелье. | An object occupying a cell: a Blade, Fire, Frost, Poison or Potion tile. |
| `swap` | Обмен | Swap | Перестановка двух соседних фишек по горизонтали или вертикали. Неуспешный обмен не расходует действие. | Exchange two adjacent tiles horizontally or vertically. An invalid swap costs no action. |
| `line` | Линия | Line | Не менее трёх одинаковых фишек подряд по горизонтали или вертикали. | At least three tiles of the same type in a horizontal or vertical row. |
| `match` | Группа фишек | Match | Соединённые совпадения одного типа. Пересечения считаются один раз; несоединённые группы разрешаются отдельно. | Connected matching lines of the same type. Intersections count once; separate matches resolve independently. |
| `matchWave` | Волна совпадений | Match wave | Все группы одного шага разрешения поля, до очередного падения фишек. Первоначальные совпадения — первая волна. | All matches resolved in one step, before tiles fall again. The initial matches are wave one. |
| `cascade` | Каскад | Cascade | Дополнительные совпадения после падения фишек. Создают следующую волну, не расходуя нового действия. | Additional matches caused by falling tiles. They create the next match wave without costing another action. |
| `action` | Действие | Action | Один успешный обмен со всеми вызванными им волнами и эффектами. Смена цели, подсказка и недопустимый обмен бесплатны. | One successful swap, including all resulting match waves and effects. Changing targets, hints and invalid swaps are free. |
| `round` | Раунд | Round | Действия героя, ответ противников и обновление шторма. Обычно у героя два действия; Форсированный привод даёт три. Завершившийся бой прерывает оставшиеся этапы. | The hero’s actions, the enemy response, then the storm update. Usually two hero actions; Overdrive grants three. Ending the battle cancels remaining stages. |
| `endRound` | Завершить раунд | End round | Отказаться от оставшихся действий. Противники выполнят свои намерения, затем шторм приблизится, если бой продолжается. | Forfeit all remaining actions. Enemies carry out their intents, then the storm advances if the battle continues. |
| `target` | Цель | Target | Выбранный противник. После его гибели следующие эффекты выбирают первого живого противника слева. | The selected enemy. If it dies, subsequent targeted effects choose the first living enemy from the left. |
| `intent` | Намерение | Intent | Следующее действие противника; может быть атакой или воздействием на поле. | The enemy’s next action: an attack or another effect, such as altering the board. |

## Фишки, урон и статусы

| ID | Русский | Английский | Определение | Определение EN |
| --- | --- | --- | --- | --- |
| `steel` | Клинок | Blade | Фишка, наносящая 3 физического урона до модификаторов. Физический урон учитывает сопротивление цели. | A tile dealing 3 physical damage before modifiers. Physical damage is affected by the target’s resistance. |
| `fire` | Огонь | Fire | Фишка и тип урона: 4 огненного урона за фишку до модификаторов. | A tile dealing 4 Fire damage before modifiers. Fire is also its damage type. |
| `ice` | Холод | Frost | Фишка, наносящая 2 урона холодом до модификаторов. Группа холода добавляет 1 заряд озноба, если цель выжила. | A tile dealing 2 Frost damage before modifiers. A Frost match adds 1 Chill stack if the target survives. |
| `poison` | Яд | Poison | Фишка добавляет 2 заряда яда до модификаторов. Яд наносит урон перед действием противника, а не при сборе фишек. | A tile adding 2 Poison stacks before modifiers. Poison deals damage before the enemy acts, not when the tiles are matched. |
| `heal` | Зелье | Potion | Фишка восстанавливает 2 здоровья до модификаторов, если лечение разрешено. Не отдельный расходуемый предмет. | A tile restoring 2 health before modifiers when healing is allowed. Not a separate consumable item. |
| `health` | Здоровье | Health | Текущее и максимальное здоровье героя или противника. При нулевом здоровье герой проигрывает, а противник выбывает из боя. | The hero’s or enemy’s current and maximum health. At zero health, the hero loses or the enemy is defeated. |
| `healing` | Лечение | Healing | Восстановление здоровья с помощью зелий, артефактов или событий. Здоровье не может превысить максимум. | Restoring health through Potions, artifacts or events. Health cannot exceed its maximum. |
| `overheal` | Избыточное лечение | Overhealing | Часть разрешённого лечения сверх недостающего здоровья. Заблокированное лечение не создаёт избытка. | The part of allowed healing exceeding missing health. Blocked healing creates no excess. |
| `chill` | Озноб | Chill | Ослабляет следующую атаку на 20% за заряд, максимум 40%. После атаки снимается целиком; неатакующее действие сохраняет статус. | Reduces the next attack’s damage by 20% per stack, up to 40%. Attacking removes all Chill; non-attack actions preserve it. |
| `stack` | Заряд | Stack | Единица яда или озноба. | One unit of Poison or Chill. |
| `poisonTick` | Урон ядом | Poison damage | Перед действием противника яд наносит ему урон по числу зарядов с учётом сопротивления. Затем снимается один заряд. Если этот урон убивает противника, тот не действует. | Before an enemy acts, Poison deals damage equal to its stacks, modified by resistance. Then one stack is removed. An enemy killed by Poison does not act. |
| `resistance` | Сопротивление | Resistance | Уменьшает соответствующий урон. Сейчас множитель ×0,5. Сопротивление яду уменьшает его урон, но не число наложенных зарядов. | Reduces damage of the matching type, currently by ×0.5. Poison resistance reduces Poison damage, not the stacks applied. |
| `weakness` | Уязвимость | Weakness | Увеличивает соответствующий урон. Сейчас множитель ×1,5. | Increases damage of the matching type, currently by ×1.5. |
| `stormShield` | Метеоритный щит | Meteor shield | Поглощает урон метеорита, расходуясь при попадании. Не поглощает атаки противников и не предотвращает кратер. | Absorbs meteor damage and is consumed on impact. Does not block enemy attacks or prevent craters. |
| `lockedCell` | Скованная клетка | Chained cell | Фишку нельзя обменять, но можно включить в группу обменом других фишек. | Its tile cannot be swapped, but can be matched by moving other tiles. |
| `unstableCell` | Нестабильная клетка | Unstable cell | При сборе наносит герою 2 базового урона до эффекта своей группы. Модификаторы входящего урона сохраняются. | Deals 2 base damage to the hero when matched, before its match resolves. Incoming damage modifiers still apply. |
| `crater` | Кратер | Crater | Временно отключённая клетка; прерывает линии и падение фишек. Срок — два раунда после появления, максимум три кратера. | A temporarily disabled cell that interrupts lines and falling tiles. Lasts two rounds after creation; at most three craters can coexist. |
| `destroyedCell` | Разрушенная клетка | Destroyed cell | Навсегда недоступная клетка текущего боя после смены фазы босса. Не кратер, не восстанавливается очищением. | A cell permanently disabled for the current battle by the boss’s phase change. It is not a crater and cannot be restored by clearing hazards. |

## Шторм и маршрут

| ID | Русский | Английский | Определение | Определение EN |
| --- | --- | --- | --- | --- |
| `storm` | Шторм | Storm | Пошаговая угроза, преследующая героя. Ожидание в реальном времени её не двигает. | A turn-based threat pursuing the hero. Real-world waiting does not advance it. |
| `stormFront` | Фронт шторма | Storm front | Граница между областью впереди шторма и областью внутри него. | The boundary between the area ahead of the storm and the area inside it. |
| `stormLead` | Отрыв от шторма | Storm lead | Расстояние впереди фронта шторма. Каждый полный раунд сокращает его на 1, если бой не закончился раньше. При потере всего отрыва герой оказывается в шторме. | Distance ahead of the storm front. Each full round reduces it by 1 unless the battle ends first. Losing all lead puts the hero inside the storm. |
| `stormDepth` | Глубина шторма | Storm depth | Положение внутри шторма. Когда фронт настигает героя, глубина равна 1. Дальнейшее приближение фронта увеличивает глубину, удаление от него помогает выбраться. | Position inside the storm. Depth starts at 1 when the front reaches the hero. Further advances increase depth; gaining distance helps you escape. |
| `distanceChange` | Сдвиг от шторма | Distance gained | Изменение позиции в сторону выхода из шторма или увеличения отрыва. Карта показывает результат перехода. Прибавка расстояния не всегда означает выход из шторма. | A change in position toward the storm’s exit or farther ahead of it. The map shows the travel result. Gaining distance does not always mean escaping. |
| `meteor` | Метеорит | Meteor | Удар шторма по герою и отмеченной клетке. Базовый урон 4 / 6 / 8 при глубине 1–3 / 4–6 / 7+. Глубина не ограничена. | A storm strike against the hero and the marked cell. Base damage is 4/6/8 at depth 1–3/4–6/7+. Depth has no limit. |
| `node` | Узел | Node | Точка маршрута с боем, событием или привалом. | A location on the route containing a battle, event or rest. |
| `travel` | Переход | Travel | Перемещение к следующему узлу с заранее показанным изменением позиции относительно шторма. | Movement to the next node, with the resulting storm position shown in advance. |
| `event` | Событие | Event | Встреча с явными вариантами выбора и последствиями. | An encounter with explicit choices and consequences. |
| `rest` | Привал | Rest | Узел восстановления или экономии времени перед боссом. | A node before the boss where you can recover health or save time. |
| `elite` | Элитный противник | Elite enemy | Усиленный противник с особой механикой. | A stronger enemy with a special mechanic. |
| `boss` | Босс | Boss | Сердце котельной, завершающее экспедицию. | The Boiler Heart, the final enemy of the expedition. |

## Экспедиция и мастерская

| ID | Русский | Английский | Определение | Определение EN |
| --- | --- | --- | --- | --- |
| `run` | Экспедиция | Expedition | Одна попытка пройти маршрут и победить босса. Здоровье и артефакты сохраняются между узлами текущей экспедиции. | One attempt to follow the route and defeat the boss. Health and artifacts carry over between its nodes. |
| `loadout` | Стартовый набор | Starting loadout | Начальный артефакт и склонность класса, определяющие первые возможности сборки. В новых экспедициях Термотехник чаще получает огонь и холод, Токсиколог — клинки и яд; у Каскадного инженера частоты равны. Все наборы предназначены для инженера-алхимика. | The starting artifact and class affinity that shape your initial build. In new expeditions, the Thermotechnician gets more Fire and Frost, the Toxicologist gets more Blades and Poison, and the Cascade Engineer keeps equal frequencies. Every loadout equips the Alchemical Engineer. |
| `build` | Сборка | Build | Набор артефактов текущей экспедиции. | The artifacts collected during the current expedition. |
| `artifact` | Артефакт | Artifact | Предмет с эффектом на текущую экспедицию. Сочетания артефактов определяют сборку героя. | An item whose effect lasts for the current expedition. Artifact combinations define your build. |
| `rareArtifact` | Редкий артефакт | Rare artifact | Артефакт из особой награды за элиту, бой с которой начат и закончен внутри шторма. | An artifact offered for defeating an elite when the battle both began and ended inside the storm. |
| `reward` | Награда | Reward | Выбор одного артефакта из предложения. Перезагрузка не меняет предложение. | Choose one artifact from an offer. Reloading does not reroll it. |
| `workshop` | Мастерская | Workshop | Постоянный профиль и открытия между экспедициями. | The persistent profile and unlocks between expeditions. |
| `blueprint` | Чертёж | Blueprint | Открывает доступ к артефакту в будущих наградах; не выдаёт его немедленно в текущую сборку. | Makes an artifact available in future rewards. Does not immediately add it to the current build. |
| `spark` | Искра | Spark | Валюта мастерской. Открывает новые чертежи и стартовые наборы между экспедициями. | Workshop currency. Unlocks blueprints and starting loadouts between expeditions. |
| `achievement` | Достижение | Achievement | Однократная цель профиля с наградой в одну искру. | A one-time profile objective awarding one spark. |
| `combatLog` | Журнал боя | Combat log | Читаемая запись эффектов боя. | A readable record of battle effects. |
| `runReport` | Отчёт об экспедиции | Expedition report | Файл с ключом генерации и решениями, принятыми в экспедиции. Его можно приложить к отзыву, чтобы помочь воспроизвести проблему. | A file containing the seed and decisions from your expedition. Attach it to feedback to help reproduce a problem. |
| `seed` | Ключ генерации | Seed | Текст, определяющий случайную последовательность. Один ключ и одинаковые решения воспроизводят экспедицию в одной версии правил. | Text determining the random sequence. The same seed and decisions reproduce an expedition within the same rules version. |

## Мир

| Русский | Английский |
| --- | --- |
| Искропад | Sparkfall |
| Нижний город | Lower City |
| Инженер-алхимик | Alchemical Engineer |
| Эфир | Aether |
| Котельная | Boiler House |

## Артефакты

| ID | Русский | Английский |
| --- | --- | --- |
| `steelMagnet` | Стальной магнит | Steel Magnet |
| `emberResonator` | Угольный резонатор | Ember Resonator |
| `frostResonator` | Криогенный резонатор | Cryogenic Resonator |
| `sporeLure` | Споровая приманка | Spore Lure |
| `still` | Перегонный куб | Distillation Still |
| `thermal` | Термопара | Thermocouple |
| `ash` | Пепельная линза | Ashen Lens |
| `frost` | Инеевый маховик | Frostwheel |
| `needle` | Игольчатый клинок | Needleblade |
| `green` | Зелёная реторта | Green Retort |
| `coil` | Каскадная катушка | Cascade Coil |
| `spore` | Споровый конденсатор | Spore Condenser |
| `glove` | Перчатка механика | Mechanic’s Glove |
| `glass` | Стеклянный реактор | Glass Reactor |
| `ampoule` | Ампула избытка | Overflow Ampoule |
| `overclock` | Форсированный привод | Overdrive |
| `stormweave` | Грозовая перевязь | Stormweave Sash |
| `tempestHeart` | Сердце бури | Tempest Heart |
| `grounding` | Заземляющая катушка | Grounding Coil |
| `stormlens` | Линза эпицентра | Storm’s Eye Lens |
| `stormcompass` | Компас обратного ветра | Backwind Compass |

## Противники

| ID | Русский | Английский |
| --- | --- | --- |
| `furnace` | Печной автомат | Furnace Automaton |
| `sentinel` | Латунный дозорный | Brass Sentinel |
| `collector` | Споровый сборщик | Spore Collector |
| `guardian` | Панцирный хранитель | Armored Guardian |
| `jailer` | Рунный тюремщик | Rune Jailer |
| `alchemist` | Сорванный алхимик | Unhinged Alchemist |
| `heart` | Сердце котельной | Boiler Heart |

## Стартовые наборы

| ID | Русский | Английский |
| --- | --- | --- |
| `coil` | Каскадный инженер | Cascade Engineer |
| `thermal` | Термотехник | Thermal Engineer |
| `needle` | Токсиколог | Toxicologist |

## События

| ID | Русский | Английский |
| --- | --- | --- |
| `experiment` | Незавершённый опыт | Unfinished Experiment |
| `workshop` | Слепой мастер | Blind Artisan |
| `fountain` | Эфирный источник | Aether Spring |
| `rest` | Тихая мастерская | Quiet Workshop |
| `ashCaravan` | Караван в пепле | Ashen Caravan |
| `groundTower` | Заземляющая башня | Grounding Tower |

## Достижения

| ID | Русский | Английский |
| --- | --- | --- |
| `first_blood` | Первый демонтаж | First Dismantling |
| `chain_reaction` | Цепная реакция | Chain Reaction |
| `venom` | Отложенный результат | Delayed Reaction |
| `spectrum` | Полный спектр | Full Spectrum |
| `elite` | Нарушитель протокола | Protocol Breaker |
| `boss` | Тишина в котельной | Silence in the Boiler House |

## Эталонные описания

### Термопара / Thermocouple

**RU:** Один раз за действие: первая группа огня, попавшая по цели с ознобом, наносит ×1,5 урона и снимает весь озноб.

**EN:** Once per action, the first Fire match to hit a target with Chill deals ×1.5 damage and removes all Chill.

### Каскадная катушка / Cascade Coil

**RU:** Один раз за действие: при первой дополнительной волне наносит цели 3 физического урона.

**EN:** Once per action, the first additional match wave deals 3 physical damage to the target.

### Заземляющая катушка / Grounding Coil

**RU:** Каждая группа из 4+ фишек заряжает метеоритный щит до 4. Не складывается выше 4. Не защищает от атак противников и появления кратера.

**EN:** Each match of 4+ tiles recharges your Meteor shield to 4. Cannot stack above 4. Does not block enemy attacks or prevent craters.

### Сердце бури / Tempest Heart

**RU:** Запрещает всё лечение вне шторма. Внутри шторма зелья и лечебные события снова восстанавливают здоровье.

**EN:** Blocks all healing outside the storm. Inside the storm, Potions and healing events can restore health again.

## Важные границы

- «Матрица» остаётся художественным названием устройства; инструкции используют «поле».
- Статистика `maxCascade` исторически включает первую волну. Интерфейс показывает число волн; значения сохранений не меняются.
- Текущая глубина и прогноз следующего метеорита различаются: перед ударом глубина увеличивается. При глубине 3 следующий базовый удар равен 6.
- Названия артефактов в справке, наградах и журнале едины. «Стеклянный усилитель» и «заземлитель» не используются вместо названий предметов.
- В игровых кнопках — «экспедиция / expedition». «Забег / run» допустим в техническом обсуждении.
- Технические идентификаторы, ключ генерации и диагностический JSON не переводятся.
