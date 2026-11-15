import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { glossaryGroups, glossaryTerms } from '../public/i18n/glossary-data.js';
import { contentTables, contentMessages } from '../public/i18n/content-messages.js';

/** Keep the reference document and the in-game dictionary on the same definitions and content names. */
export function glossaryMarkdown(){
  const cell=value=>value.replaceAll('|','\\|').replaceAll('\n',' ');
  const lines=['# Глоссарий Искропада / Sparkfall','',
    'Стандарт терминов RU/EN для текущих правил. Определения совпадают со справкой игры. Правила вординга и локализации: [LOCALIZATION.md](LOCALIZATION.md).','',
    'Документ формируется командой `npm run glossary` из `public/i18n/glossary-data.js` и каталогов контента. Определения исправлять в источнике, затем обновлять этот файл. Проверка синхронизации входит в `npm test`.',''];
  for(const group of glossaryGroups){
    lines.push(`## ${group.ru}`,'','| ID | Русский | Английский | Определение | Определение EN |','| --- | --- | --- | --- | --- |');
    for(const term of glossaryTerms.filter(term=>term.group===group.id))lines.push(`| \`${term.id}\` | ${cell(term.name.ru)} | ${cell(term.name.en)} | ${cell(term.description.ru)} | ${cell(term.description.en)} |`);
    lines.push('');
  }
  lines.push('## Мир','', '| Русский | Английский |','| --- | --- |','| Искропад | Sparkfall |','| Нижний город | Lower City |','| Инженер-алхимик | Alchemical Engineer |','| Эфир | Aether |','| Котельная | Boiler House |','');
  for(const [kind,title] of [['artifact','Артефакты'],['enemy','Противники'],['loadout','Стартовые наборы'],['event','События'],['achievement','Достижения']]){
    lines.push(`## ${title}`,'','| ID | Русский | Английский |','| --- | --- | --- |');
    for(const id of Object.keys(contentTables[kind])){const names=contentMessages[`${kind}.${id}.name`];lines.push(`| \`${id}\` | ${names.ru} | ${names.en} |`);}
    lines.push('');
  }
  lines.push('## Эталонные описания','');
  for(const id of ['thermal','coil','grounding','tempestHeart']){
    const name=contentMessages[`artifact.${id}.name`],description=contentMessages[`artifact.${id}.text`];
    lines.push(`### ${name.ru} / ${name.en}`,'',`**RU:** ${description.ru}`,'',`**EN:** ${description.en}`,'');
  }
  lines.push('## Важные границы','',
    '- «Матрица» остаётся художественным названием устройства; инструкции используют «поле».',
    '- Статистика `maxCascade` исторически включает первую волну. Интерфейс показывает число волн; значения сохранений не меняются.',
    '- Текущая глубина и прогноз следующего метеорита различаются: перед ударом глубина увеличивается. При глубине 3 следующий базовый удар равен 6.',
    '- Названия артефактов в справке, наградах и журнале едины. «Стеклянный усилитель» и «заземлитель» не используются вместо названий предметов.',
    '- В игровых кнопках — «экспедиция / expedition». «Забег / run» допустим в техническом обсуждении.',
    '- Технические идентификаторы, ключ генерации и диагностический JSON не переводятся.','');
  return lines.join('\n');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const path=new URL('../docs/GLOSSARY.md',import.meta.url),expected=glossaryMarkdown();
  if(process.argv.includes('--check')){
    if(await readFile(path,'utf8')!==expected)throw new Error('Glossary is out of date. Run npm run glossary.');
    console.log('Glossary is synchronized.');
  }else{await writeFile(path,expected);console.log('Updated docs/GLOSSARY.md.');}
}
