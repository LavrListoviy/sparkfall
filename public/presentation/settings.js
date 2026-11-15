const KEY='sparkfall.settings.v1';
/** Invalid and future settings cannot produce zero-duration or runaway animations. */
export function normalizeSettings(value={}) {
  return {speed:[.5,1,2].includes(value?.speed)?value.speed:1,reducedMotion:value?.reducedMotion===true,sound:value?.sound===true,language:value?.language==='en'?'en':'ru'};
}
/** Settings are independent from the run snapshot and its deterministic history. */
export function loadSettings(storage,defaults={}) {
  try {const raw=storage?.getItem(KEY);return normalizeSettings(raw?JSON.parse(raw):defaults);}
  catch {return normalizeSettings(defaults);}
}
export function persistSettings(storage,value) {
  try {storage.setItem(KEY,JSON.stringify(normalizeSettings(value)));return {ok:true};}
  catch(error){return {ok:false,error:error.message};}
}
