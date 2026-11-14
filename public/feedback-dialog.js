import { feedbackPayload, createFeedbackSender } from './feedback.js';
import { FEEDBACK_ENDPOINT } from './feedback-config.js';
import { runReport } from './report.js';
import { escape } from './views.js';

/** The draft stays in memory on failure; replay attachment is opt-in on every new feedback. */
export function feedbackDialog({showModal,getRun}) {
  const send=createFeedbackSender({endpoint:FEEDBACK_ENDPOINT});
  const empty=()=>({kind:'impression',message:'',email:'',attachReport:false,honey:''});
  let draft=empty(),pending=false,error='';
  function show(){
    const run=getRun();
    showModal(`<p class="modal-kicker">ПОЛЕВОЙ ДНЕВНИК</p><h2>Как прошла экспедиция?</h2><form id="feedback-form"><fieldset ${pending?'disabled':''}><label>О чём отзыв<select name="kind"><option value="impression" ${draft.kind==='impression'?'selected':''}>Впечатление</option><option value="bug" ${draft.kind==='bug'?'selected':''}>Ошибка</option><option value="idea" ${draft.kind==='idea'?'selected':''}>Идея</option></select></label><label>Что понравилось или мешало играть<textarea name="message" rows="5" minlength="10" maxlength="4000" required placeholder="Например: на телефоне было трудно заметить намерение врага…">${escape(draft.message)}</textarea></label><label>Email для ответа <small>необязательно</small><input name="email" type="email" maxlength="254" autocomplete="email" value="${escape(draft.email)}" placeholder="Можно оставить пустым"></label><label class="feedback-honey" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>${run?`<label class="feedback-attachment"><input name="attachReport" type="checkbox" ${draft.attachReport?'checked':''}> Приложить отчёт о текущем забеге</label><details class="feedback-preview"><summary>Что войдёт в отчёт</summary><p>Версия, seed, стартовый набор, открытые чертежи, сборка, результат и последовательность решений. Только при включённом флажке выше.</p><pre>${escape(JSON.stringify(runReport(run),null,2))}</pre></details>`:''}<p class="feedback-privacy">Текст, указанный email и выбранный отчёт будут переданы автору игры через <a href="https://formsubmit.co/privacy.pdf" target="_blank" rel="noopener noreferrer">FormSubmit</a>. Отправка происходит только по кнопке ниже.</p>${!FEEDBACK_ENDPOINT?'<p class="feedback-status">Почтовая форма ещё подключается. Пока можно сохранить отчёт через кнопку внизу игры.</p>':''}<button class="primary-button" type="submit" ${!FEEDBACK_ENDPOINT?'disabled':''}>${pending?'Отправляем…':'Отправить отзыв'}</button></fieldset><p class="feedback-status" role="status">${escape(error)}</p></form>`);
    const form=document.querySelector('#feedback-form');
    const readDraft=()=>{const data=new FormData(form);return {kind:data.get('kind'),message:data.get('message'),email:data.get('email'),attachReport:data.get('attachReport')==='on',honey:data.get('website')};};
    form.addEventListener('input',()=>{if(!pending)draft=readDraft();});
    form.onsubmit=async event=>{
      event.preventDefault();if(pending)return;
      draft=readDraft();
      let payload;
      try{payload=feedbackPayload(draft,getRun());}catch(problem){error=problem.message;form.querySelector('[role="status"]').textContent=error;return;}
      pending=true;error='';form.querySelector('fieldset').disabled=true;
      form.querySelector('[role="status"]').textContent='Отправляем отзыв…';
      try{
        await send(payload);draft=empty();pending=false;
        if(document.querySelector('#modal').open&&document.querySelector('#feedback-form'))showModal('<p class="modal-kicker">ОБРАТНАЯ СВЯЗЬ</p><h2>Спасибо за отзыв.</h2><p>Почтовый сервис принял сообщение. Если оставлен email, автор сможет ответить на него.</p>');
      }catch(problem){pending=false;error=problem.message;if(document.querySelector('#modal').open&&document.querySelector('#feedback-form'))show();}
    };
  }
  return show;
}
