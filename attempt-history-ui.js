/* BOXXY v377 — shared grouped, lazy, sortable player and Basement history. */
(() => {
  'use strict';
  const date = ms => ms ? new Date(Number(ms)).toLocaleString('en-GB', { dateStyle:'medium',timeStyle:'short' }) : '—';
  const time = sec => sec == null ? '—' : `${Number(sec).toFixed(2)}s`;
  const el = (tag,label,className='') => {
    const node=document.createElement(tag);
    if (label != null) node.textContent=String(label);
    if (className) node.className=className;
    return node;
  };
  const sorts = [['attempt','Attempt #'],['date','Date'],['completed','Completed'],['time','Time'],['moves','Moves'],['pushes','Pushes']];
  const ACCENTS = Object.freeze({red:'#db3b27',black:'#171719',green:'#2f8f5b',blue:'#20539a',yellow:'#e5b32a',purple:'#8e44ad',orange:'#f47a20',teal:'#00a6b2'});
  const PACK_ACCENTS = Object.freeze({
    'boxxy-original-puzzle-pack-of-50-levels':'red',microban:'black',jigsaw:'teal',
    'alphabet-soup':'black','starry-night':'yellow',exponentially:'purple','daily-boxxy':'blue'
  });
  function colour(packId) {
    // In the public game prefer the actual pack metadata; Basement uses the
    // same established accents when the gameplay pack scripts are not loaded.
    const pack=window.BOXXY_LEVEL_PACKS?.find?.(entry=>entry.id===packId);
    const accent=String(pack?.accent||PACK_ACCENTS[packId]||'black').toLowerCase();
    return {background:ACCENTS[accent]||ACCENTS.black,foreground:accent==='yellow'?'#171719':'#ffffff'};
  }
  function tint(node,packId) {
    const {background,foreground}=colour(packId);
    node.style.setProperty('--history-pack-accent',background);
    node.style.setProperty('--history-pack-ink',foreground);
    return node;
  }
  function mount(root,urlFor,overview=null) {
    if (!root) return;
    const get=async query=>{
      const response=await fetch(urlFor(query),{credentials:'same-origin'});
      const data=await response.json();
      if (!response.ok||!data.ok) throw new Error(data.error||'Could not load attempt history.');
      return data;
    };
    const render=data=>{
      root.replaceChildren();
      const levels=Array.isArray(data.levels)?data.levels:[];
      root.appendChild(el('p','Individual runs are available from v376. Older saved bests and undetailed attempt counts appear in their corresponding levels. Before v377, an opening without a move could also be counted.','history-note'));
      if (!levels.length) {root.appendChild(el('p','No recorded attempts or earlier progress yet.'));return;}
      const packs=new Map(),packNodes=new Map(),levelNodes=new Map();
      for (const level of levels) {
        const key=String(level.packId);
        if (!packs.has(key)) packs.set(key,[]);
        packs.get(key).push(level);
      }
      const makeLevel=level=>{
        const section=el('details',null,'history-level');
        const name=`${level.packId==='daily-boxxy'?'Daily':'Level'} ${level.levelNumber||level.levelToken}${level.levelName?' · '+level.levelName:''}`;
        const count=Number(level.attempts)||0;
        const old=Number(level.legacyAttempts)||0;
        const summary=el('summary',`${name} · ${count} recorded attempt${count===1?'':'s'}${old?` (${old} without individual detail)`:''}`);
        section.appendChild(summary);
        const content=el('div',null,'history-table-wrap');
        const controls=el('div',null,'history-controls');
        const sort=el('select');
        for (const [value,label] of sorts) {const option=el('option',label);option.value=value;sort.appendChild(option);}
        sort.value='attempt';
        const direction=el('select');
        for (const [value,label] of [['desc','Descending'],['asc','Ascending']]) {
          const option=el('option',label);option.value=value;direction.appendChild(option);
        }
        controls.append(el('label','Sort by '),sort,direction);
        const legacy=el('div',null,'history-legacy');
        const table=el('table',null,'history-table');
        table.innerHTML='<thead><tr><th>Attempt</th><th>Started</th><th>Complete</th><th>Time</th><th>Moves</th><th>Pushes</th></tr></thead>';
        const body=el('tbody');table.appendChild(body);
        const more=el('button','LOAD MORE');more.type='button';more.hidden=true;
        const status=el('p',null,'history-note');
        content.append(controls,legacy,table,more,status);section.appendChild(content);
        let loaded=false,offset=0,legacyDisplayed=false;
        const showLegacy=older=>{
          if (legacyDisplayed) return;
          legacyDisplayed=true;
          if (!older) return;
          const undetailed=Number(older.undetailedCount)||0;
          const anyBest=older.bestTime!=null||older.bestMoves!=null||older.bestPushes!=null;
          if (!undetailed&&!anyBest&&!older.previousCompletion) return;
          const title=el('strong','EARLIER / SAVED RECORDS');
          const countText=undetailed?`${undetailed} attempt${undetailed===1?'':'s'} without individual results. Earlier counting may include opening a level without moving.`
            :'Saved historical results may overlap the detailed runs below.';
          const desc=el('p',countText);
          legacy.append(title,desc);
          if (anyBest) {
            const saved=el('p',`Saved bests (possibly from different runs): Time ${time(older.bestTime)} · Moves ${older.bestMoves??'—'} · Pushes ${older.bestPushes??'—'}`);
            saved.className='history-saved-bests';legacy.append(saved);
          } else if (older.previousCompletion) legacy.appendChild(el('p','A previous completion is recorded; individual performance figures may be unavailable.'));
          if (older.lastAt) legacy.appendChild(el('p',`Last recorded: ${date(older.lastAt)}`));
        };
        const fetchRows=async reset=>{
          if (reset) {offset=0;body.replaceChildren();}
          status.textContent='Loading…';more.hidden=true;
          try {
            const result=await get({packId:level.packId,levelToken:level.levelToken,sort:sort.value,direction:direction.value,offset});
            showLegacy(result.legacy);
            for (const run of result.rows||[]) {
              const tr=el('tr');
              if (run.assisted) tr.title='Assisted run; excluded from unassisted bests';
              if (!run.completed) tr.classList.add('history-incomplete');
              const values=[run.attemptNumber,date(run.startedAt),run.completed?'Yes':'No',time(run.seconds),run.moves,run.pushes];
              values.forEach((value,i)=>{
                const td=el('td',value==null?'—':value);
                if (value==null || (i===3 && run.seconds==null)) td.classList.add('history-missing');
                if (run.completed&&!run.assisted&&(
                  (i===3&&level.bestTime!=null&&run.seconds!=null&&Number(run.seconds)===Number(level.bestTime))||
                  (i===4&&level.bestMoves!=null&&run.moves!=null&&Number(run.moves)===Number(level.bestMoves))
                )) {td.classList.add('history-best');td.title=i===3?'Best time':'Best moves';}
                tr.appendChild(td);
              });body.appendChild(tr);
            }
            offset=result.nextOffset;more.hidden=offset==null;
            status.textContent=body.children.length?'':'No individual runs available for this level.';
            loaded=true;
          } catch(error) {status.textContent=error.message;}
        };
        section.addEventListener('toggle',()=>{if(section.open&&!loaded) fetchRows(true);});
        sort.addEventListener('change',()=>fetchRows(true));
        direction.addEventListener('change',()=>fetchRows(true));
        more.addEventListener('click',()=>fetchRows(false));
        levelNodes.set(`${level.packId}:${level.levelToken}`,section);
        return section;
      };
      // Both player and Basement have the same collapsed recent-level drawer.
      const recent=el('details',null,'history-recent');
      recent.appendChild(el('summary','10 MOST RECENT LEVELS'));
      const recentContent=el('div',null,'history-recent-items');
      for (const level of (data.recent||levels.slice(0,10))) {
        const button=tint(el('button',`${level.packName||level.packId} · ${level.levelName||level.levelToken} · ${date(level.lastAt)}`),level.packId);
        button.type='button';
        button.addEventListener('click',()=>{
          const pack=packNodes.get(level.packId),item=levelNodes.get(`${level.packId}:${level.levelToken}`);
          if(pack)pack.open=true;
          if(item){item.open=true;item.scrollIntoView?.({block:'nearest',behavior:'smooth'});}
        });recentContent.appendChild(button);
      }
      if (!recentContent.children.length) recentContent.appendChild(el('p','No dated level activity available yet.','history-note'));
      recent.appendChild(recentContent);root.appendChild(recent);
      for (const [packId,items] of packs) {
        const pack=tint(el('details',null,'history-pack'),packId);
        const name=items[0].packName||packId;
        pack.appendChild(el('summary',`${name} · ${items.length} level${items.length===1?'':'s'}`));
        items.sort((a,b)=>(Number(a.levelNumber)||0)-(Number(b.levelNumber)||0)||String(a.levelToken).localeCompare(String(b.levelToken)));
        for(const level of items)pack.appendChild(makeLevel(level));
        packNodes.set(packId,pack);root.appendChild(pack);
      }
    };
    if (overview) render(overview);
    else {root.replaceChildren(el('p','Loading history…'));get({}).then(render).catch(error=>root.replaceChildren(el('p',error.message)));}
  }
  window.BOXXYHistoryUI=Object.freeze({mount});
})();
