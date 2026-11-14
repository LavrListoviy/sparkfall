# Пиксельная графика второй итерации

Оба изображения созданы встроенным ImageGen 14 ноября 2026 года и скопированы в проект. CLI, платные внешние API и ручная обработка изображений не использовались. Старые иллюстрации не удалялись и не заменялись.

## Атлас персонажей

Файл: `public/assets/pixel/characters.png`.

PNG **887 × 1774**, RGBA, настоящая прозрачность: в пустых областях альфа равна нулю. Визуально проверены все восемь целых силуэтов, отсутствие текста, раздельные ячейки и согласованный стиль.

Атлас содержит **2 столбца × 4 строки**. Из-за фактического размера ячейка равна 443,5 × 443,5 пикселя; использовать нормализованные UV, не целочисленную нарезку. Для стандартного `TextureLoader` Three.js: повтор `(0.5, 0.25)`, смещение `(column * 0.5, 0.75 - row * 0.25)`. Фильтр ближайшего соседа; при необходимости отключить mipmaps, чтобы маленькие спрайты не размывались. Обычный персонаж ориентирован влево, герой — вправо.

| Индекс | Строка | Столбец | Персонаж |
| --- | --- | --- | --- |
| 0 | 0 | 0 | Инженер-алхимик, синий плащ, янтарный шарф, кристаллическая перчатка |
| 1 | 0 | 1 | Печной автомат, оранжевая топка |
| 2 | 1 | 0 | Латунный дозорный, голубой визор |
| 3 | 1 | 1 | Споровый сборщик, грибная шляпа и зелёный мешок спор |
| 4 | 2 | 0 | Панцирный хранитель, бронзовый щит |
| 5 | 2 | 1 | Рунный тюремщик, фиолетовые руны и цепь |
| 6 | 3 | 0 | Сорванный алхимик, фиолетовый капюшон, зелёная колба |
| 7 | 3 | 1 | Сердце котельной, круглый реактор с голубым кристаллом |

Это один статический вид каждого персонажа, не покадровая анимация. Замахи, рывки, отдача и попадания реализуются движением спрайтов и эффектами сцены. Персонажи почти целиком заполняют ячейки; нижняя линия опоры расположена примерно на 94–98% высоты ячейки. Для точного размещения стоп учитывать прозрачные поля.

### Запрос генерации

```text
Use case: stylized-concept. Asset type: production-ready transparent character sprite atlas for an original magic-punk fantasy pixel-art roguelite. Create ONE tall PNG sprite sheet, exactly TWO COLUMNS and FOUR ROWS, eight equal square cells, 1024x2048 canvas if possible. Each cell is 512x512. Each character must be completely contained in its cell, centered horizontally, standing on a baseline about 80% down the cell, generous transparent padding on all sides. NO grid lines, NO labels, NO text, NO ground, NO shadows, NO background. Actual alpha transparency. Use sharp chunky genuine pixel art, as if each character were hand-drawn on a 48x48 pixel grid then nearest-neighbor enlarged, consistent blocky pixel size and limited 20-color palette, crisp stepped silhouettes, dark purple outline, readable game sprites rather than detailed painterly illustrations. Warm bronze, cool cyan, forest green and violet accents. Full-body three-quarter side view battle stances. Row-major EXACT CONTENT: row1 col1 HERO human engineer-alchemist facing RIGHT, brass goggles, blue coat, amber scarf, boots, big cyan crystal gauntlet and small backpack; row1 col2 FURNACE stocky brass golem facing LEFT, orange glowing round furnace core, thick fists; row2 col1 SENTINEL slim brass guard facing LEFT with angular cyan visor and arm cannon; row2 col2 COLLECTOR moss-green mushroom salvage mutant facing LEFT with copper scraps and green spore sack; row3 col1 GUARDIAN heavily armored bronze construct facing LEFT with a broad shield-shaped torso and teal face slit; row3 col2 JAILER dark violet armored rune knight facing LEFT wielding a short hanging violet chain; row4 col1 ALCHEMIST rogue wizard facing LEFT, purple hood, green potion held in a brass glove, tattered coat; row4 col2 BOSS enormous squat circular brass reactor heart facing LEFT with cyan central crystal and amber vents, short mechanical legs. All eight unique original designs, no characters from existing games. Important: all objects aligned to this precise 2-by-4 rectangular cell grid, separate silhouettes never overlap neighboring cells. Single static pose each, no multi-frame sequences.
```

## Арена

Файл: `public/assets/pixel/arena.png`.

PNG **1536 × 1024**, RGB, 1 596 077 байт. Атлас персонажей — 1 780 424 байта. Вертикальная граница между столбцами атласа проверена по альфа-каналу: непрозрачных пикселей на ней нет ни в одной строке.

Пиксельная котельная без персонажей и интерфейса. Стена занимает верхние примерно 40%, остальная часть — свободный пол; фон подходит для размещения героя слева и врагов справа. Тёмный лиловый камень, латунь, янтарные лампы и голубые эфирные окна. Визуально проверены отсутствие текста, читаемая пустая игровая область и отсутствие случайных персонажей.

### Запрос генерации

```text
Use case: stylized-concept. Asset type: pixel-art 2D battle arena background for an original magic-punk fantasy roguelite. Generate a WIDE landscape background, 1536x1024 or landscape 3:2. Abandoned underground boiler hall: dark plum and mauve stone bricks, old bronze pipes climbing the wall, a few restrained cyan ether windows, warm small amber lanterns, brass floor trim and a few weeds at the extreme edges. Camera side-on with a slight top-down view onto a broad flat empty stone floor, like a classic SNES tactical RPG battle backdrop. Use actual crisp chunky pixel-art clusters as if designed on a 384x256 grid and enlarged with nearest-neighbor, limited palette, flat shaded blocks, sharp stepped edges, no painting strokes and no smooth gradients. Upper 38% shows the atmospheric back wall with an empty dark arch in the middle. Lower 62% is a continuous muted dusty mauve/ochre stone floor, low detail and uncluttered. The arena is empty because sprites will be added by the game: space for hero at upper-left floor and three enemies at upper-right floor; center and lower center must be very clear for a puzzle board overlay. Edges can contain a brass barrel, two pipes and small rocks, but no objects in the playable middle. Subdued dark environment so brightly colored character sprites and UI remain readable. NO characters, no monsters, no people, no letters, no text, no numbers, no borders, no UI, no boards, no game pieces, no shadows belonging to absent characters. Original environment, no reproduction of another game's art.
```

## Происхождение

Исходники генерации сохранены в локальном каталоге ImageGen (не входят в репозиторий):

- `exec-39b44be6-62b6-455b-8e3d-1c17d1e6cf0b.png` — атлас.
- `exec-d9ff827b-6ace-442a-9d2a-330b0c96db15.png` — арена.

Референс пользователя использован для общего направления и композиции, не как источник вырезанных ресурсов. Персонажи и окружение оригинальные, без копирования лягушки или конкретных врагов Die in the Dungeon.

