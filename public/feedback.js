import { t } from './i18n/index.js';
import { runReport } from './report.js';
import { RULES_VERSION } from './core/battle.js';

const categories=['impression','bug','idea'];

/** Keep translation data so a failed draft can be reopened in a different language. */
function feedbackError(key,parameters={}){
  return Object.assign(new Error(t(key,parameters)),{translation:{key,parameters}});
}
/** Resolve retained translation data at display time; keep native diagnostics intact. */
export function feedbackErrorMessage(error){
  return error?.translation?t(error.translation.key,error.translation.parameters):error?.message??'';
}

/** Build only the explicitly requested feedback fields, never attaching a run by default. */
export function feedbackPayload(input,run) {
  const message=String(input.message??'').trim(),email=String(input.email??'').trim();
  if(!categories.includes(input.kind))throw feedbackError('feedback.errorCategory');
  if(message.length<10||message.length>4000)throw feedbackError('feedback.errorLength');
  if(email&&(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw feedbackError('feedback.errorEmail');
  if(input.honey)throw feedbackError('feedback.errorVerification');
  const payload={_subject:`[Sparkfall Feedback] ${t(`feedback.${input.kind}`)} · ${RULES_VERSION}`,_template:'table',category:t(`feedback.${input.kind}`),version:RULES_VERSION,message};
  if(email)payload.email=email;
  if(input.attachReport===true&&run){
    const report=JSON.stringify(runReport(run));
    if(new TextEncoder().encode(report).length>100000)throw feedbackError('feedback.errorReport');
    payload.run_report=report;
  }
  return payload;
}

/** Provider acknowledgement is distinct from mailbox delivery; retry is always explicit. */
export function createFeedbackSender({endpoint,request=globalThis.fetch}={}) {
  let pending=false;
  return async payload=>{
    if(pending)throw feedbackError('feedback.errorPending');
    if(!/^https:\/\/formsubmit\.co\/ajax\/[a-f0-9]{32}$/i.test(endpoint??''))throw feedbackError('feedback.errorEndpoint');
    pending=true;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await request(endpoint,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload),signal:controller.signal});
      if(!response.ok)throw feedbackError('feedback.errorHttp',{status:response.status});
      const result=await response.json();
      if(result.success!==true&&result.success!=='true')throw feedbackError('feedback.errorAcknowledgement');
      return {accepted:true};
    }catch(error){
      if(error.name==='AbortError'||error instanceof TypeError)throw feedbackError('feedback.errorNetwork');
      throw error;
    }finally{clearTimeout(timer);pending=false;}
  };
}
