import { t, getLanguage } from './index.js';

/** Translate explicit static labels only; never rewrite arbitrary DOM or user-authored content. */
export function localizeDocument(root=document){
  root.documentElement.lang=getLanguage();
  root.title=t('shell.title');
  root.querySelector('meta[name="description"]')?.setAttribute('content',t('shell.description'));
  root.querySelectorAll('[data-i18n]').forEach(element=>{element.textContent=t(element.dataset.i18n);});
  root.querySelectorAll('[data-i18n-aria-label]').forEach(element=>{element.setAttribute('aria-label',t(element.dataset.i18nAriaLabel));});
}
