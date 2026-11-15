/** Bind the glossary's select-only combobox. Navigation previews a choice; only confirmation commits it. */
export function bindCategoryPicker(root,onChange){
  const button=root.querySelector('[role="combobox"]'),list=root.querySelector('[role="listbox"]');
  const options=[...list.querySelectorAll('[role="option"]')],controller=new AbortController();
  const selected=options.findIndex(option=>option.getAttribute('aria-selected')==='true');
  let open=false,active=selected,search='',lastTyped=0;
  const listen=(target,type,handler)=>target.addEventListener(type,handler,{signal:controller.signal});
  function highlight(index){
    active=Math.max(0,Math.min(options.length-1,index));
    options.forEach((option,i)=>option.classList.toggle('is-active',i===active));
    button.setAttribute('aria-activedescendant',options[active].id);
  }
  function expand(value){
    open=value;root.dataset.open=String(open);button.setAttribute('aria-expanded',String(open));
    list.setAttribute('aria-hidden',String(!open));list.inert=!open;
    if(open)highlight(selected);
    else{button.removeAttribute('aria-activedescendant');search='';}
  }
  function choose(index){
    const value=options[index].dataset.category;
    expand(false);button.focus({preventScroll:true});
    if(index!==selected)onChange(value);
  }
  listen(button,'click',()=>expand(!open));
  listen(button,'keydown',event=>{
    const key=event.key;
    if(key==='Escape'){
      if(open){event.preventDefault();event.stopPropagation();expand(false);}
      return;
    }
    if(key==='Tab'){expand(false);return;}
    if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(key)){
      event.preventDefault();
      if(key==='Enter'||key===' '){if(open)choose(active);else expand(true);return;}
      const wasOpen=open;if(!open)expand(true);
      if(key==='Home')highlight(0);
      else if(key==='End')highlight(options.length-1);
      else if(wasOpen)highlight(active+(key==='ArrowDown'?1:-1));
      return;
    }
    if(key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
      event.preventDefault();if(!open)expand(true);
      const now=Date.now();search=now-lastTyped>700?key:search+key;lastTyped=now;
      const prefix=search.toLocaleLowerCase();
      const match=options.findIndex(option=>option.textContent.trim().toLocaleLowerCase().startsWith(prefix));
      if(match>=0)highlight(match);
    }
  });
  // Keep DOM focus on the combobox so Escape and arrows work after pointer navigation too.
  listen(list,'pointerdown',event=>event.preventDefault());
  listen(list,'pointermove',event=>{
    const option=event.target.closest('[role="option"]');
    if(open&&option&&event.pointerType==='mouse')highlight(options.indexOf(option));
  });
  listen(list,'click',event=>{
    const option=event.target.closest('[role="option"]');
    if(open&&option)choose(options.indexOf(option));
  });
  listen(root.ownerDocument,'pointerdown',event=>{if(open&&!root.contains(event.target))expand(false);});
  listen(root,'focusout',event=>{if(open&&!root.contains(event.relatedTarget))expand(false);});
  return ()=>controller.abort();
}
