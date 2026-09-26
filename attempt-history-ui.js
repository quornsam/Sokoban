/* BOXXY v378 — concise, ordered, pack-coloured player and Basement history. */
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
  // Consistent names in player and Basement history, regardless of the longer
  // pack labels saved by older clients. These are display labels only.
  const PACK_LABELS = Object.freeze({
    'daily-boxxy':'Daily Boxxy',
    'boxxy-original-puzzle-pack-of-50-levels':'BOXXY Originals',
    microban:'Microban', jigsaw:'The Jigsaw', 'alphabet-soup':'Alphabet Soup',
    'starry-night':'Starry Night', exponentially:'Exponentially'
  });
  const TOP_PACKS = ['daily-boxxy','boxxy-original-puzzle-pack-of-50-levels','microban'];
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
  const labelFor = level => PACK_LABELS[level.packId] || level.packName || level.packId;
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  function dailyNumber(level) {
    const known=Number(level.levelNumber);
    if (Number.isSafeInteger(known)&&known>0) return known;
    const token=String(level.levelToken||'');
    if (!validDate(token)) return null;
    // Prefer the actual published catalogue when available. Historic Dailys
    // prior to v376 have a date but do not carry a sequence number.
    for (const schedule of (window.BOXXY_DAILY_SCHEDULES||[])) {
      const puzzle=schedule?.puzzles?.find?.(p=>p.date===token);
      if (Number(puzzle?.sequence)>0) return Number(puzzle.sequence);
    }
    // The prepared archive has consecutive releases beginning 30 August 2026.
    // Restrict the date fallback to 2026's existing published archive rather
    // than speculating about the numbering of future or missing releases.
    const start=Date.parse('2026-08-30T00:00:00Z');
    const day=Date.parse(token+'T00:00:00Z');
    const current=Date.now();
    if (Number.isFinite(day)&&day>=start&&day<=Math.min(current,Date.parse('2026-10-31T23:59:59Z')))
      return Math.floor((day-start)/86400000)+1;
    return null;
  }
  function numberFor(level) {
    if(level.packId==='daily-boxxy') return dailyNumber(level);
    const number=Number(level.levelNumber)||Number(level.levelToken);
    return Number.isSafeInteger(number)&&number>0?number:null;
  }
  function actualLevelName(level) {
    const candidate=String(level.levelName||'').trim();
    if(!candidate) return '';
    const pack=labelFor(level);
    // Microban's actual source levels all have the generic name "Microban
    // Series"; this is not a separate level title.
    if ([pack,level.packName,'Microban Series'].some(value=>
      String(value||'').trim().toLowerCase()===candidate.toLowerCase())) return '';
    if(level.packId==='daily-boxxy'&&validDate(candidate)) return '';
    const number=numberFor(level);
    if(number&&new RegExp('^level\\s*#?\\s*0*'+number+'$','i').test(candidate)) return '';
    return candidate;
  }
  function shortLevel(level) {
    const number=numberFor(level);
    return level.packId==='daily-boxxy'
      ? (number?`#${number}`:validDate(level.levelToken)?level.levelToken:`#${level.levelToken}`)
      : (number?`Level ${number}`:`Level ${level.levelToken}`);
  }
  function levelLabel(level) {
    const name=actualLevelName(level);
    return `${shortLevel(level)}${name?' · '+name:''}`;
  }
  function recentLabel(level) {
    return `${labelFor(level)} · ${levelLabel(level)} · ${date(level.lastAt)}`;
  }
  function orderedPacks(packs) {
    return [...packs].sort(([a],[b])=>{
      const ai=TOP_PACKS.indexOf(a),bi=TOP_PACKS.indexOf(b);
      return (ai<0?TOP_PACKS.length:ai)-(bi<0?TOP_PACKS.length:bi);
    });
  }
  function appendCell(tr,value,{missing=false,best=false,title=''}={}) {
    const td=el('td',value==null?'—':value);
    if(missing||value==null) td.classList.add('history-missing');
    if(best) {td.classList.add('history-best');td.title=title;}
    tr.appendChild(td);
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
      if (!levels.length) {root.appendChild(el('p','No recorded attempts or earlier progress yet.'));return;}
      const packs=new Map(),packNodes=new Map(),levelNodes=new Map();
      for (const level of levels) {
        const key=String(level.packId);
        if (!packs.has(key)) packs.set(key,[]);
        packs.get(key).push(level);
      }
      const makeLevel=level=>{
        const section=el('details',null,'history-level');
        const count=Number(level.attempts)||0;
        const countLabel=count>0?`${count} attempt${count===1?'':'s'}`
          :(level.previousCompletion||level.bestTime!=null||level.bestMoves!=null?'Saved result':'0 attempts');
        const summary=el('summary',`${levelLabel(level)} · ${countLabel}`);
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
        const table=el('table',null,'history-table');
        table.innerHTML='<thead><tr><th>Attempt</th><th>Date</th><th>Complete</th><th>Time</th><th>Moves</th><th>Pushes</th></tr></thead>';
        const olderBody=el('tbody',null,'history-earlier-body');
        const body=el('tbody');table.append(olderBody,body);
        const more=el('button','LOAD MORE');more.type='button';more.hidden=true;
        const status=el('p',null,'history-note');
        content.append(controls,table,more,status);section.appendChild(content);
        let loaded=false,offset=0,legacyDisplayed=false;
        const showLegacy=older=>{
          if (legacyDisplayed) return;
          legacyDisplayed=true;
          if (!older) return;
          const undetailed=Number(older.undetailedCount)||0;
          const anyBest=older.bestTime!=null||older.bestMoves!=null||older.bestPushes!=null;
          if (!undetailed&&!anyBest&&!older.previousCompletion) return;
          // One consolidated saved record, not a fabricated individual run.
          // The level heading already contains the complete attempt total.
          const tr=el('tr',null,'history-earlier-row');
          tr.title='Earlier saved record';
          appendCell(tr,anyBest?'Saved best':'Earlier',{});
          appendCell(tr,older.lastAt?date(older.lastAt):null);
          appendCell(tr,older.previousCompletion?'Yes':null);
          for (const [metric,index] of [['bestTime',3],['bestMoves',4],['bestPushes',5]]) {
            const value=older[metric];
            const best=index===3 ? level.bestTime : index===4 ? level.bestMoves : null;
            appendCell(tr,value==null?null:index===3?time(value):value,{
              best:index!==5&&value!=null&&best!=null&&Number(value)===Number(best),
              title:index===3?'Best time':'Best moves'
            });
          }
          olderBody.appendChild(tr);
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
              const values=[run.attemptNumber,run.startedAt?date(run.startedAt):null,
                run.completed?'Yes':'No',run.seconds==null?null:time(run.seconds),run.moves,run.pushes];
              values.forEach((value,i)=>appendCell(tr,value,{
                best:run.completed&&!run.assisted&&(
                  (i===3&&level.bestTime!=null&&run.seconds!=null&&Number(run.seconds)===Number(level.bestTime))||
                  (i===4&&level.bestMoves!=null&&run.moves!=null&&Number(run.moves)===Number(level.bestMoves))
                ),title:i===3?'Best time':'Best moves'
              }));body.appendChild(tr);
            }
            offset=result.nextOffset;more.hidden=offset==null;
            status.textContent=body.children.length||olderBody.children.length?'':'No results yet.';
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
        const button=tint(el('button',recentLabel(level)),level.packId);
        button.type='button';
        button.addEventListener('click',()=>{
          const pack=packNodes.get(level.packId),item=levelNodes.get(`${level.packId}:${level.levelToken}`);
          if(pack)pack.open=true;
          if(item){item.open=true;item.scrollIntoView?.({block:'nearest',behavior:'smooth'});}
        });recentContent.appendChild(button);
      }
      if (!recentContent.children.length) recentContent.appendChild(el('p','No dated level activity available yet.','history-note'));
      recent.appendChild(recentContent);root.appendChild(recent);
      for (const [packId,items] of orderedPacks(packs)) {
        const pack=tint(el('details',null,'history-pack'),packId);
        const name=labelFor(items[0]);
        pack.appendChild(el('summary',`${name} · ${items.length} level${items.length===1?'':'s'}`));
        items.sort((a,b)=>(numberFor(a)||0)-(numberFor(b)||0)||String(a.levelToken).localeCompare(String(b.levelToken)));
        for(const level of items)pack.appendChild(makeLevel(level));
        packNodes.set(packId,pack);root.appendChild(pack);
      }
    };
    if (overview) render(overview);
    else {root.replaceChildren(el('p','Loading history…'));get({}).then(render).catch(error=>root.replaceChildren(el('p',error.message)));}
  }
  window.BOXXYHistoryUI=Object.freeze({mount});
})();
