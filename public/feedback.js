import { runReport } from './report.js';
import { RULES_VERSION } from './core/battle.js';

const categories={impression:'Впечатление',bug:'Ошибка',idea:'Идея'};

/** Build only the explicitly requested feedback fields, never attaching a run by default. */
export function feedbackPayload(input,run) {
  const message=String(input.message??'').trim(),email=String(input.email??'').trim();
  if(!categories[input.kind])throw new Error('Выбери категорию отзыва.');
  if(message.length<10||message.length>4000)throw new Error('Напиши от 10 до 4000 символов.');
  if(email&&(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw new Error('Проверь email или оставь это поле пустым.');
  if(input.honey)throw new Error('Не удалось проверить форму. Обнови страницу и попробуй снова.');
  const payload={_subject:`[Sparkfall Feedback] ${categories[input.kind]} · ${RULES_VERSION}`,_template:'table',category:categories[input.kind],version:RULES_VERSION,message};
  if(email)payload.email=email;
  if(input.attachReport===true&&run){
    const report=JSON.stringify(runReport(run));
    if(new TextEncoder().encode(report).length>100000)throw new Error('Этот отчёт слишком большой для письма. Отправь отзыв без него и сохрани JSON отдельно.');
    payload.run_report=report;
  }
  return payload;
}

/** Provider acknowledgement is distinct from mailbox delivery; retry is always explicit. */
export function createFeedbackSender({endpoint,request=globalThis.fetch}={}) {
  let pending=false;
  return async payload=>{
    if(pending)throw new Error('Отзыв уже отправляется.');
    if(!/^https:\/\/formsubmit\.co\/ajax\/[a-f0-9]{32}$/i.test(endpoint??''))throw new Error('Почтовая форма ещё не настроена.');
    pending=true;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await request(endpoint,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload),signal:controller.signal});
      if(!response.ok)throw new Error(`Сервис не принял отзыв (HTTP ${response.status}). Текст сохранён, попробуй позже.`);
      const result=await response.json();
      if(result.success!==true&&result.success!=='true')throw new Error('Сервис не подтвердил отправку. Возможно, форма ещё не активирована. Текст сохранён.');
      return {accepted:true};
    }catch(error){
      if(error.name==='AbortError'||error instanceof TypeError)throw new Error('Нет подтверждения отправки. Текст сохранён, попробуй позже.');
      throw error;
    }finally{clearTimeout(timer);pending=false;}
  };
}
