import { t } from './i18n/index.js';
import { feedbackPayload, createFeedbackSender, feedbackErrorMessage } from './feedback.js';
import { FEEDBACK_ENDPOINT } from './feedback-config.js';
import { runReport } from './report.js';
import { escape } from './views.js';

/** The draft stays in memory on failure; replay attachment is opt-in on every new feedback. */
export function feedbackDialog({showModal,getRun}) {
  const send=createFeedbackSender({endpoint:FEEDBACK_ENDPOINT});
  const empty=()=>({kind:'impression',message:'',email:'',attachReport:false,honey:''});
  let draft=empty(),pending=false,error=null,step=0;
  function show(){
    const run=getRun();
    const messageFields=`<label>${t('feedback.category')}<select name="kind">${['impression','bug','idea'].map(kind=>`<option value="${kind}" ${draft.kind===kind?'selected':''}>${t(`feedback.${kind}`)}</option>`).join('')}</select></label><label>${t('feedback.message')}<textarea name="message" rows="5" minlength="10" maxlength="4000" required placeholder="${t('feedback.placeholder')}">${escape(draft.message)}</textarea></label><button class="primary-button" type="submit">${t('menu.feedbackNext')} →</button>`;
    const deliveryFields=`<label>${t('feedback.email')}<small>${t('feedback.optional')}</small><input name="email" type="email" maxlength="254" autocomplete="email" value="${escape(draft.email)}" placeholder="${t('feedback.emailPlaceholder')}"></label>${run?`<label class="feedback-attachment"><input name="attachReport" type="checkbox" ${draft.attachReport?'checked':''}>${t('feedback.attach')}</label><button class="text-button" id="feedback-preview" type="button">${t('feedback.preview')}</button>`:''}<p class="feedback-privacy">${t('feedback.privacy')} <a href="https://formsubmit.co/privacy.pdf" target="_blank" rel="noopener noreferrer">${t('feedback.privacyLink')}</a></p>${!FEEDBACK_ENDPOINT?`<p class="feedback-status">${t('feedback.notReady')}</p>`:''}<div class="modal-actions"><button class="secondary-button" id="feedback-back" type="button">← ${t('menu.feedbackBack')}</button><button class="primary-button" type="submit" ${!FEEDBACK_ENDPOINT?'disabled':''}>${pending?t('feedback.pending'):t('feedback.send')}</button></div>`;
    showModal(`<p class="modal-kicker">${t('feedback.diary')} · ${step+1} / 2</p><h2>${t(step?'menu.feedbackDetails':'feedback.title')}</h2><form id="feedback-form"><fieldset ${pending?'disabled':''}>${step?deliveryFields:messageFields}<label class="feedback-honey" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off" value="${escape(draft.honey)}"></label></fieldset><p class="feedback-status" role="status">${escape(feedbackErrorMessage(error))}</p></form>`);
    const form=document.querySelector('#feedback-form');
    const readDraft=()=>{
      const data=new FormData(form);
      return {...draft,...(step?{email:data.get('email'),attachReport:data.get('attachReport')==='on'}:{kind:data.get('kind'),message:data.get('message')}),honey:data.get('website')};
    };
    form.addEventListener('input',()=>{if(!pending)draft=readDraft();});
    if(step){
      form.querySelector('#feedback-back').onclick=()=>{draft=readDraft();step=0;error=null;show();};
      const preview=form.querySelector('#feedback-preview');
      if(preview)preview.onclick=()=>{
        draft=readDraft();
        showModal(`<h2>${t('report.title')}</h2><p>${t('feedback.reportContent')}</p><pre class="feedback-preview-data">${escape(JSON.stringify(runReport(run),null,2))}</pre><button class="secondary-button" id="feedback-return">← ${t('menu.feedbackReturn')}</button>`);
        document.querySelector('#feedback-return').onclick=show;
      };
    }
    form.onsubmit=async event=>{
      event.preventDefault();if(pending)return;
      draft=readDraft();
      if(step===0){
        try{feedbackPayload({...draft,email:'',attachReport:false},null);step=1;error=null;show();}
        catch(problem){error=problem;form.querySelector('[role="status"]').textContent=feedbackErrorMessage(error);}
        return;
      }
      let payload;
      try{payload=feedbackPayload(draft,getRun());}catch(problem){error=problem;form.querySelector('[role="status"]').textContent=feedbackErrorMessage(error);return;}
      pending=true;error=null;form.querySelector('fieldset').disabled=true;
      form.querySelector('[role="status"]').textContent=t('feedback.sending');
      try{
        await send(payload);draft=empty();pending=false;step=0;
        if(document.querySelector('#modal').open&&document.querySelector('#feedback-form'))showModal(`<p class="modal-kicker">${t('feedback.kicker')}</p><h2>${t('feedback.thanks')}</h2><p>${t('feedback.accepted')}</p>`);
      }catch(problem){pending=false;error=problem;if(document.querySelector('#modal').open&&document.querySelector('#feedback-form'))show();}
    };
  }
  return show;
}
