/* BOXXY v376 — shared lazy, sortable per-level history for player and Basement. */
(() => {
  'use strict';
  const date = ms => ms ? new Date(Number(ms)).toLocaleString('en-GB', { dateStyle:'medium', timeStyle:'short' }) : '—';
  const time = sec => sec == null ? '—' : `${Number(sec).toFixed(2)}s`;
  const el = (tag, label, className='') => {
    const node = document.createElement(tag);
    if (label != null) node.textContent = String(label);
    if (className) node.className = className;
    return node;
  };
  const sorts = [ ['attempt','Attempt #'],['date','Date'],['completed','Completed'],['time','Time'],['moves','Moves'],['pushes','Pushes'] ];
  function mount(root, urlFor, overview=null) {
    if (!root) return;
    const get = async query => {
      const response = await fetch(urlFor(query), {credentials:'same-origin'});
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Could not load attempt history.');
      return data;
    };
    const render = data => {
      root.replaceChildren();
      const levels = Array.isArray(data.levels) ? data.levels : [];
      root.appendChild(el('p','Run-by-run history starts with v376. Earlier aggregate attempt counts remain available separately.','history-note'));
      if (!levels.length) { root.appendChild(el('p','No recorded runs yet.')); return; }
      const packs = new Map();
      for (const level of levels) {
        const key = String(level.packId);
        if (!packs.has(key)) packs.set(key,[]);
        packs.get(key).push(level);
      }
      const packNodes = new Map();
      const levelNodes = new Map();
      const makeLevel = level => {
        const section = el('details',null,'history-level');
        const description = `${level.packId === 'daily-boxxy' ? 'Daily' : 'Level'} ${level.levelNumber || level.levelToken}${level.levelName ? ' · '+level.levelName : ''}`;
        section.appendChild(el('summary',`${description} · ${level.attempts} attempts · ${level.completions} completed`));
        const content = el('div',null,'history-table-wrap');
        const controls = el('div',null,'history-controls');
        const sort = el('select');
        for (const [value,label] of sorts) { const option=el('option',label); option.value=value; sort.appendChild(option); }
        sort.value='attempt';
        const direction=el('select');
        for (const [value,label] of [['desc','Descending'],['asc','Ascending']]) { const option=el('option',label); option.value=value; direction.appendChild(option); }
        controls.append(el('label','Sort by '),sort,direction);
        const table=el('table',null,'history-table');
        table.innerHTML='<thead><tr><th>Attempt</th><th>Started</th><th>Complete</th><th>Time</th><th>Moves</th><th>Pushes</th></tr></thead>';
        const body=el('tbody'); table.appendChild(body);
        const more=el('button','LOAD MORE'); more.type='button'; more.hidden=true;
        const status=el('p',null,'history-note');
        content.append(controls,table,more,status); section.appendChild(content);
        let loaded=false, offset=0;
        const fetchRows=async reset => {
          if (reset) { offset=0; body.replaceChildren(); }
          status.textContent='Loading…'; more.hidden=true;
          try {
            const result=await get({packId:level.packId,levelToken:level.levelToken,sort:sort.value,direction:direction.value,offset});
            for (const run of result.rows || []) {
              const tr=el('tr');
              if (run.assisted) tr.title='Assisted run';
              const cells=[run.attemptNumber,date(run.startedAt),run.completed ? 'Yes' : 'No',
                run.completed ? time(run.seconds) : '—',run.completed ? run.moves : '—',run.completed ? run.pushes : '—'];
              for (let i=0;i<cells.length;i++) {
                const td=el('td',cells[i]);
                if (run.completed && !run.assisted && (
                  (i===3 && level.bestTime != null && Number(run.seconds)===Number(level.bestTime)) ||
                  (i===4 && level.bestMoves != null && Number(run.moves)===Number(level.bestMoves))
                )) { td.className='history-best'; td.title=i===3 ? 'Best time' : 'Best moves'; }
                tr.appendChild(td);
              }
              body.appendChild(tr);
            }
            offset=result.nextOffset;
            more.hidden=offset==null;
            status.textContent=''; loaded=true;
          } catch (error) { status.textContent=error.message; }
        };
        section.addEventListener('toggle',()=> { if (section.open && !loaded) fetchRows(true); });
        sort.addEventListener('change',()=>fetchRows(true)); direction.addEventListener('change',()=>fetchRows(true));
        more.addEventListener('click',()=>fetchRows(false));
        levelNodes.set(`${level.packId}:${level.levelToken}`,section);
        return section;
      };
      const recent=el('section',null,'history-recent'); recent.appendChild(el('h4','10 MOST RECENT LEVELS'));
      for (const level of (data.recent || levels.slice(0,10))) {
        const button=el('button',`${level.packName || level.packId} · ${level.levelName || level.levelToken} · ${date(level.lastAt)}`);
        button.type='button';
        button.addEventListener('click',()=>{
          const pack=packNodes.get(level.packId), item=levelNodes.get(`${level.packId}:${level.levelToken}`);
          if (pack) pack.open=true;
          if (item) { item.open=true; item.scrollIntoView({block:'nearest',behavior:'smooth'}); }
        }); recent.appendChild(button);
      }
      root.appendChild(recent);
      for (const [packId,items] of packs) {
        const pack=el('details',null,'history-pack');
        pack.appendChild(el('summary',`${items[0].packName || packId} · ${items.length} levels`));
        items.sort((a,b)=>(Number(a.levelNumber)||0)-(Number(b.levelNumber)||0) || String(a.levelToken).localeCompare(String(b.levelToken)));
        for (const level of items) pack.appendChild(makeLevel(level));
        packNodes.set(packId,pack); root.appendChild(pack);
      }
    };
    if (overview) render(overview);
    else { root.replaceChildren(el('p','Loading history…')); get({}).then(render).catch(error=>root.replaceChildren(el('p',error.message))); }
  }
  window.BOXXYHistoryUI = Object.freeze({mount});
})();
