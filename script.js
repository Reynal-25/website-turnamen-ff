const DEFAULT_PLACEMENT={1:12,2:9,3:8,4:7,5:6,6:5,7:4,8:3,9:2,10:1,11:0,12:0};
const GROUPS=["A","B","C"];
const STORAGE="ff_championship_18_v4";
const OLD_STORAGE="ff_championship_18_v3";

const DEFAULT_SETTINGS={
  name:"FF CHAMPIONSHIP",
  logo:"",
  gamesPerDay:6,
  weeks:4,
  daysPerWeek:3,
  scoring:{placement:{...DEFAULT_PLACEMENT},kill:1},
  playin:{enabled:false,teams:6,games:6,qualifiers:2,selected:[]},
  regular:{direct:10,playinFrom:11,playinTo:16,groupMode:"two",selectionTwo:{direct:10,playinFrom:11,playinTo:16},selectionOne:{direct:10,playinFrom:11,playinTo:16}},
  grandFinal:{teams:12,games:6}
};

let state=loadState();
let standingsView="recap"; // recap = posisi + total kill, points = placement + kill + total poin
let playerKillStage="regular";

function defaultTeam(id){
  return {id,name:"Team "+String.fromCharCode(64+id),players:["Player 1","Player 2","Player 3","Player 4"],reserves:["Cadangan 1","Cadangan 2"],coach:"Pelatih 1",logo:"",tag:"T"+id,flag:"🇮🇩",playerFlags:["🇮🇩","🇮🇩","🇮🇩","🇮🇩"],reserveFlags:["🇮🇩","🇮🇩"]};
}
function makeInitialState(){
  const teams=Array.from({length:18},(_,i)=>defaultTeam(i+1));
  const groups={A:[],B:[],C:[]};
  teams.forEach((t,i)=>groups[GROUPS[Math.floor(i/6)]].push(t.id));
  return {settings:structuredClone(DEFAULT_SETTINGS),teams,groups,matchdays:[],playinResults:null};
}
function loadState(){
  let s=null;
  try{s=JSON.parse(localStorage.getItem(STORAGE)||"null")}catch(e){}
  if(!s){
    try{s=JSON.parse(localStorage.getItem(OLD_STORAGE)||"null")}catch(e){}
  }
  if(!s)return makeInitialState();

  s.settings={...structuredClone(DEFAULT_SETTINGS),...(s.settings||{})};
  // Sistem poin dikunci agar tidak lagi diedit dari Editor.
  s.settings.scoring=structuredClone(DEFAULT_SETTINGS.scoring);
  s.settings.playin={...structuredClone(DEFAULT_SETTINGS.playin),...(s.settings.playin||{})};
  s.settings.grandFinal={...structuredClone(DEFAULT_SETTINGS.grandFinal),...(s.settings.grandFinal||{})};
  s.settings.regular={...structuredClone(DEFAULT_SETTINGS.regular),...(s.settings.regular||{})};
  if(!["one","two"].includes(s.settings.regular.groupMode))s.settings.regular.groupMode="two";
  const legacySel={direct:Number(s.settings.regular.direct)||0,playinFrom:Number(s.settings.regular.playinFrom)||1,playinTo:Number(s.settings.regular.playinTo)||0};
  s.settings.regular.selectionTwo={...legacySel,...(s.settings.regular.selectionTwo||{})};
  s.settings.regular.selectionOne={...legacySel,...(s.settings.regular.selectionOne||{})};
  s.settings.regular.direct=s.settings.regular.groupMode==="one"?s.settings.regular.selectionOne.direct:s.settings.regular.selectionTwo.direct;
  s.settings.regular.playinFrom=s.settings.regular.groupMode==="one"?s.settings.regular.selectionOne.playinFrom:s.settings.regular.selectionTwo.playinFrom;
  s.settings.regular.playinTo=s.settings.regular.groupMode==="one"?s.settings.regular.selectionOne.playinTo:s.settings.regular.selectionTwo.playinTo;
  if(!Array.isArray(s.teams))s.teams=[];
  s.teams.forEach((t,i)=>{
    t.id=Number(t.id)||i+1;
    if(!Array.isArray(t.players))t.players=["Player 1","Player 2","Player 3","Player 4"];
    while(t.players.length<4)t.players.push("Player "+(t.players.length+1));
    if(!Array.isArray(t.reserves))t.reserves=["Cadangan 1","Cadangan 2"];
    while(t.reserves.length<2)t.reserves.push("Cadangan "+(t.reserves.length+1));
    if(typeof t.coach!=="string")t.coach="Pelatih 1";
    if(typeof t.logo!=="string")t.logo="";
    if(typeof t.name!=="string")t.name="Team "+t.id;
    if(typeof t.tag!=="string")t.tag="T"+t.id;
    if(typeof t.flag!=="string")t.flag="🇮🇩";
    if(!Array.isArray(t.playerFlags))t.playerFlags=["🇮🇩","🇮🇩","🇮🇩","🇮🇩"];
    while(t.playerFlags.length<4)t.playerFlags.push("🇮🇩");
    if(!Array.isArray(t.reserveFlags))t.reserveFlags=["🇮🇩","🇮🇩"];
    while(t.reserveFlags.length<2)t.reserveFlags.push("🇮🇩");
  });
  s.groups=s.groups||{A:[],B:[],C:[]};
  GROUPS.forEach(g=>s.groups[g]=Array.isArray(s.groups[g])?s.groups[g].map(Number).filter(id=>s.teams.some(t=>t.id===id)):[]);
  const assigned=new Set(GROUPS.flatMap(g=>s.groups[g]));
  s.teams.forEach(t=>{if(!assigned.has(t.id)){const g=GROUPS.reduce((a,b)=>s.groups[a].length<=s.groups[b].length?a:b);s.groups[g].push(t.id)}});
  s.matchdays=Array.isArray(s.matchdays)?s.matchdays:[];
  s.playinResults=s.playinResults||null;
  s.grandFinalResults=s.grandFinalResults||null;
  persistState(s);
  return s;
}
function persist(){persistState(state)}
function persistState(s){localStorage.setItem(STORAGE,JSON.stringify(s))}
function team(id){return state.teams.find(t=>t.id===Number(id))}
function groupOf(id){return GROUPS.find(g=>state.groups[g].includes(Number(id)))||"-"}
function pairFor(md){const d=((md-1)%3)+1;if(state.settings.regular.groupMode==="one")return [GROUPS[(d-1)%GROUPS.length]];return d===1?["A","B"]:d===2?["B","C"]:["A","C"]}
function weekOf(md){return Math.ceil(md/3)}
function dayOf(md){return ((md-1)%3)+1}
function totalMatchdays(){return state.settings.weeks*state.settings.daysPerWeek}
function totalRegularGames(){return totalMatchdays()*state.settings.gamesPerDay}
function teamsForMD(md){const p=pairFor(md);return [...new Set(p.flatMap(g=>state.groups[g]||[]))].map(team).filter(Boolean)}
function getMatchday(md){
  let m=state.matchdays.find(x=>x.id===md);
  if(!m){m={id:md,games:[]};state.matchdays.push(m)}
  if(!Array.isArray(m.games))m.games=[];
  while(m.games.length<state.settings.gamesPerDay)m.games.push({game:m.games.length+1,saved:false,results:{}});
  m.games.forEach((g,i)=>{g.game=i+1;if(!g.results)g.results={};if(typeof g.saved!=="boolean")g.saved=false});
  return m;
}
function placementPoints(pos){return Number(state.settings.scoring?.placement?.[Number(pos)]??0)||0}
function killPoints(kills){return (Number(kills)||0)*(Number(state.settings.scoring?.kill)||0)}
function placementMax(){return Math.max(state.teams.length,12)}
function totalGamesSaved(){return state.matchdays.reduce((s,m)=>s+(m.games||[]).filter(g=>g.saved).length,0)}
function savedMatchdays(){return state.matchdays.filter(m=>(m.games||[]).some(g=>g.saved)).length}
function placeholderLogo(label="TEAM"){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="18" fill="#1a202a"/><text x="50" y="56" text-anchor="middle" fill="#8e99a8" font-size="22" font-family="Arial">${String(label).slice(0,4)}</text></svg>`;
  return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(svg);
}
function logoSrc(t){return t?.logo||placeholderLogo(t?.name||"TEAM")}
function roster(t){return [...(t?.players||[]),...(t?.reserves||[])].map((name,i)=>({name,flag:i<4?(t.playerFlags?.[i]||"🇮🇩"):(t.reserveFlags?.[i-4]||"🇮🇩"),index:i,type:i<4?"utama":"cadangan"}))}
function playerOptions(t,selected){return `<option value="">Pilih pemain</option>`+roster(t).map((p,i)=>`<option value="${i}" ${String(selected)===String(i)?"selected":""}>${p.flag} ${escapeHtml(t?.tag||"")} • ${escapeHtml(p.name)}</option>`).join("")}
function refreshPlayerDropdowns(md,gi,teamId){const t=team(teamId),g=getMatchday(md).games[gi],lineup=g.lineups?.[teamId]||[];[0,1,2,3].forEach(slot=>{const sel=document.querySelector(`[data-md="${md}"][data-game="${gi}"][data-team="${teamId}"][data-slot="${slot}"][data-field="player"]`);if(!sel)return;const used=lineup.map((x,i)=>i!==slot?String(x?.player):null).filter(Boolean);const cur=sel.value;[...sel.options].forEach(o=>{if(o.value)o.disabled=used.includes(o.value)&&o.value!==cur})})}
function disableDuplicateDropdowns(){document.querySelectorAll('.player-select').forEach(sel=>{const teamId=sel.dataset.team||sel.dataset.pt||sel.dataset.ft;const container=sel.closest('.player-slots');if(!container)return;const current=sel.value;const used=[...container.querySelectorAll('.player-select')].map(x=>x.value).filter(v=>v&&v!==current);[...sel.options].forEach(o=>{if(o.value)o.disabled=used.includes(o.value)&&o.value!==current})})}
function updatePlayerDropdown(md,gi,teamId,slot,val){const g=getMatchday(md).games[gi];if(g.saved)return;g.lineups=g.lineups||{};g.lineups[teamId]=g.lineups[teamId]||[0,1,2,3].map(()=>({player:null,kills:0}));g.lineups[teamId][slot].player=val===""?null:Number(val);persist();refreshPlayerDropdowns(md,gi,teamId);}
function updatePlayerKill(md,gi,teamId,slot,val){const g=getMatchday(md).games[gi];if(g.saved)return;g.lineups=g.lineups||{};g.lineups[teamId]=g.lineups[teamId]||[0,1,2,3].map(()=>({player:null,kills:0}));g.lineups[teamId][slot].kills=Math.max(0,Number(val)||0);persist();const el=document.getElementById(`team-kill-${md}-${gi}-${teamId}`);if(el)el.textContent=g.lineups[teamId].reduce((a,x)=>a+(Number(x.kills)||0),0);}
function totalLineupKills(g,teamId){return savedLineup(g,teamId).reduce((a,x)=>a+(Number(x.kills)||0),0)}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escapeAttr(s){return escapeHtml(s)}

function renderAll(){
  renderIdentity();renderSettings();renderTeams();renderGroups();renderSchedule();renderMatchSelect();renderMatchInput();
  renderScoring();renderStandings();renderTop5();renderAllMatchdayStandings();renderHistory();renderPlayIn();renderGrandFinal();renderPlayerStats();routePage();
}
function renderIdentity(){
  const n=state.settings.name||"FF CHAMPIONSHIP";
  document.title=n+" - Tournament Manager";
  document.getElementById("brandTitle").innerHTML=`<span>🔥</span> ${escapeHtml(n)}`;
  document.getElementById("heroTitle").innerHTML=escapeHtml(n).replace(/ /g," ").replace(/(.{0,25})$/,"<span></span>");
  const titleEl=document.getElementById("heroTitle");
  const words=n.split(" ");
  if(words.length>1){const last=escapeHtml(words.pop());titleEl.innerHTML=escapeHtml(words.join(" "))+" <span>"+last+"</span>"}else titleEl.innerHTML=`<span>${escapeHtml(n)}</span>`;
  const logo=document.getElementById("tournamentLogo");
  if(state.settings.logo){logo.src=state.settings.logo;logo.style.display="block"}else logo.style.display="none";
  document.getElementById("footerName").textContent=n;
  document.getElementById("formatSummary").textContent=`${state.teams.length} tim • Grup A ${state.groups.A.length} • Grup B ${state.groups.B.length} • Grup C ${state.groups.C.length} • ${state.settings.weeks} minggu • ${state.settings.daysPerWeek} hari/minggu • ${state.settings.gamesPerDay} game/hari`;
}
function renderStats(){
  const s=calcStandings();
  document.getElementById("statTeams").textContent=state.teams.length;
  document.getElementById("statMd").textContent=`${savedMatchdays()}/${totalMatchdays()}`;
  document.getElementById("statGames").textContent=`${totalGamesSaved()}/${totalRegularGames()}`;
  document.getElementById("statLeader").textContent=s[0]?.team.name||"-";
}
function renderScoring(){const host=document.getElementById("scoreSystem");if(!host)return;const max=Math.max(12,state.teams.length);host.innerHTML=`<div class="score-table"><div><b>Posisi</b>${Array.from({length:max},(_,i)=>`<b>${i+1}</b>`).join("")}</div><div><span>Placement Point</span>${Array.from({length:max},(_,i)=>`<b>${placementPoints(i+1)}</b>`).join("")}</div></div><p class="muted">Kill = ${Number(state.settings.scoring.kill)||0} poin. Semua tahap memakai sistem poin ini.</p>`;}
function renderSettings(){
  const n=state.teams.length;
  document.getElementById("settingsName").value=state.settings.name||"";
  document.getElementById("settingsGamesPerDay").value=state.settings.gamesPerDay;
  document.getElementById("settingsWeeks").value=state.settings.weeks;
  document.getElementById("settingsDaysPerWeek").value=state.settings.daysPerWeek;
  const gm=document.getElementById("regularGroupMode"); if(gm)gm.value=state.settings.regular.groupMode||"two";
  const selTwo=state.settings.regular.selectionTwo||{direct:state.settings.regular.direct,playinFrom:state.settings.regular.playinFrom,playinTo:state.settings.regular.playinTo};
  const selOne=state.settings.regular.selectionOne||{direct:state.settings.regular.direct,playinFrom:state.settings.regular.playinFrom,playinTo:state.settings.regular.playinTo};
  document.getElementById("regularTwoDirect").value=Math.min(selTwo.direct,n);
  document.getElementById("regularTwoPlayinFrom").value=Math.min(selTwo.playinFrom,n+1);
  document.getElementById("regularTwoPlayinTo").value=Math.min(selTwo.playinTo,n);
  document.getElementById("regularOneDirect").value=Math.min(selOne.direct,n);
  document.getElementById("regularOnePlayinFrom").value=Math.min(selOne.playinFrom,n+1);
  document.getElementById("regularOnePlayinTo").value=Math.min(selOne.playinTo,n);
  document.getElementById("playinEnabled").checked=!!state.settings.playin.enabled;
  document.getElementById("playinGames").value=state.settings.playin.games;
  document.getElementById("playinQualifiers").value=Math.min(state.settings.playin.qualifiers,n);
  document.getElementById("grandFinalGames").value=state.settings.grandFinal.games;
  const activeSel=state.settings.regular.groupMode==="one"?(state.settings.regular.selectionOne||state.settings.regular):(state.settings.regular.selectionTwo||state.settings.regular);
  const direct=Math.min(Number(activeSel.direct)||0,n);
  const from=Math.max(direct+1,Math.min(Number(activeSel.playinFrom)||1,n+1));
  const to=Math.max(from-1,Math.min(Number(activeSel.playinTo)||0,n));
  const piEnabled=!!state.settings.playin.enabled;
  const piTeams=piEnabled?Math.max(0,to>=from?to-from+1:0):0;
  const q=piEnabled?Math.min(state.settings.playin.qualifiers,piTeams):0;
  const gf=Math.min(n,direct+q);
  const preview=document.getElementById("settingsLogoPreview");if(state.settings.logo){preview.src=state.settings.logo;preview.style.display="block"}else preview.style.display="none";
  document.getElementById("settingsInfo").innerHTML=`<span>${totalMatchdays()} matchday</span><span>${totalRegularGames()} game regular season</span><span>${n} tim</span><span>${direct} langsung GF</span><span>${piEnabled?piTeams+" tim Play-In":"Tanpa Play-In"}</span><span>${Math.max(0,n-direct-piTeams)} tereliminasi</span>`;
  document.getElementById("grandFinalFormat").innerHTML=`<span>${direct} langsung</span><span>${q} dari Play-In</span><span>${gf} tim Grand Final</span><span>${state.settings.grandFinal.games} game</span>`;
}
function uploadTournamentLogo(input){
  const f=input.files?.[0];if(!f)return;
  const r=new FileReader();r.onload=e=>{state.settings.logo=e.target.result;persist();renderAll()};r.readAsDataURL(f);
}
function saveTournamentSettings(){
  const n=state.teams.length;
  state.settings.name=document.getElementById("settingsName").value.trim()||"FF CHAMPIONSHIP";
  state.settings.gamesPerDay=Math.max(1,Math.min(20,Number(document.getElementById("settingsGamesPerDay").value)||6));
  state.settings.weeks=Math.max(1,Math.min(20,Number(document.getElementById("settingsWeeks").value)||4));
  state.settings.daysPerWeek=Math.max(1,Math.min(7,Number(document.getElementById("settingsDaysPerWeek").value)||3));
  state.settings.regular.groupMode=document.getElementById("regularGroupMode")?.value==="one"?"one":"two";
  const two={
    direct:Math.max(0,Math.min(n,Number(document.getElementById("regularTwoDirect").value)||0)),
    playinFrom:Math.max(1,Math.min(n+1,Number(document.getElementById("regularTwoPlayinFrom").value)||1)),
    playinTo:Math.max(0,Math.min(n,Number(document.getElementById("regularTwoPlayinTo").value)||0))
  };
  two.playinFrom=Math.max(two.direct+1,two.playinFrom); two.playinTo=Math.max(0,two.playinTo);
  if(two.playinTo<two.playinFrom-1)two.playinTo=Math.max(0,two.playinFrom-1);
  const one={
    direct:Math.max(0,Math.min(n,Number(document.getElementById("regularOneDirect").value)||0)),
    playinFrom:Math.max(1,Math.min(n+1,Number(document.getElementById("regularOnePlayinFrom").value)||1)),
    playinTo:Math.max(0,Math.min(n,Number(document.getElementById("regularOnePlayinTo").value)||0))
  };
  one.playinFrom=Math.max(one.direct+1,one.playinFrom); one.playinTo=Math.max(0,one.playinTo);
  if(one.playinTo<one.playinFrom-1)one.playinTo=Math.max(0,one.playinFrom-1);
  state.settings.regular.selectionTwo=two;
  state.settings.regular.selectionOne=one;
  const activeSel=state.settings.regular.groupMode==="one"?one:two;
  state.settings.regular.direct=activeSel.direct;
  state.settings.regular.playinFrom=activeSel.playinFrom;
  state.settings.regular.playinTo=activeSel.playinTo;
  state.settings.scoring=structuredClone(DEFAULT_SETTINGS.scoring);
  state.settings.playin.enabled=document.getElementById("playinEnabled").checked;
  const piCount=state.settings.playin.enabled&&activeSel.playinTo>=activeSel.playinFrom?activeSel.playinTo-activeSel.playinFrom+1:0;
  state.settings.playin.teams=piCount;
  state.settings.playin.games=Math.max(1,Math.min(20,Number(document.getElementById("playinGames").value)||6));
  state.settings.playin.qualifiers=Math.max(0,Math.min(piCount,Number(document.getElementById("playinQualifiers").value)||0));
  state.settings.grandFinal.teams=Math.min(n,activeSel.direct+state.settings.playin.qualifiers);
  state.settings.grandFinal.games=Math.max(1,Math.min(20,Number(document.getElementById("grandFinalGames").value)||6));
  state.settings.playin.selected=[];
  persist();renderAll();alert("Pengaturan turnamen berhasil diterapkan.");
}


function renderTeams(){
  document.getElementById("teamsGrid").innerHTML=state.teams.map(t=>`
  <div class="card team-card">
    <div class="team-head"><img class="logo" src="${logoSrc(t)}" alt="Logo ${escapeAttr(t.name)}">
      <div><h3>${escapeHtml(t.name)}</h3><small>Tim ID ${t.id} • Grup ${groupOf(t.id)}</small></div></div>
    <div class="field"><label>NAMA TIM</label><input value="${escapeAttr(t.name)}" onchange="updateTeam(${t.id},this.value)"></div><div class="player-list"><div class="field"><label>TAG TIM</label><input value="${escapeAttr(t.tag)}" onchange="updateTeamField(${t.id},'tag',this.value)"></div><div class="field"><label>BENDERA TIM</label><input value="${escapeAttr(t.flag)}" maxlength="4" onchange="updateTeamField(${t.id},'flag',this.value)"></div></div>
    <h4 class="subheading">Pemain Utama</h4>
    <div class="player-list">${t.players.map((p,i)=>`<div class="field"><label>PEMAIN ${i+1}</label><input value="${escapeAttr(p)}" onchange="updatePlayer(${t.id},${i},this.value)"><input value="${escapeAttr(t.playerFlags[i])}" maxlength="4" title="Bendera pemain" onchange="updatePlayerFlag(${t.id},${i},this.value)"></div>`).join("")}</div>
    <h4 class="subheading">Pemain Cadangan</h4>
    <div class="player-list">${t.reserves.map((p,i)=>`<div class="field"><label>CADANGAN ${i+1}</label><input value="${escapeAttr(p)}" onchange="updateReserve(${t.id},${i},this.value)"><input value="${escapeAttr(t.reserveFlags[i])}" maxlength="4" title="Bendera pemain" onchange="updateReserveFlag(${t.id},${i},this.value)"></div>`).join("")}</div>
    <div class="field"><label>PELATIH</label><input value="${escapeAttr(t.coach)}" onchange="updateCoach(${t.id},this.value)"></div>
    <label class="logo-upload">GANTI LOGO <input type="file" accept="image/*" onchange="uploadLogo(${t.id},this)"></label>
    <button class="delete-team" onclick="deleteTeam(${t.id})">🗑 Hapus Tim</button>
  </div>`).join("");
}
function updateTeam(id,v){const t=team(id);if(!t)return;t.name=v.trim()||`Team ${id}`;persist();renderAll()}
function updateTeamField(id,key,v){const t=team(id);if(t){t[key]=v;persist();renderAll()}}
function updatePlayerFlag(id,i,v){const t=team(id);if(t){t.playerFlags[i]=v||"🇮🇩";persist();renderAll()}}
function updateReserveFlag(id,i,v){const t=team(id);if(t){t.reserveFlags[i]=v||"🇮🇩";persist();renderAll()}}
function updatePlayer(id,i,v){team(id).players[i]=v;persist();renderAll()}
function updateReserve(id,i,v){team(id).reserves[i]=v;persist();renderAll()}
function updateCoach(id,v){team(id).coach=v;persist();renderAll()}
function uploadLogo(id,input){
  const f=input.files?.[0];if(!f)return;
  const r=new FileReader();r.onload=e=>{const t=team(id);if(t)t.logo=e.target.result;persist();renderAll()};r.readAsDataURL(f);
}
function addTeam(){
  const maxId=state.teams.reduce((m,t)=>Math.max(m,t.id),0);
  const t=defaultTeam(maxId+1);
  t.name="Team "+(maxId+1);
  state.teams.push(t);
  const g=GROUPS.reduce((a,b)=>state.groups[a].length<=state.groups[b].length?a:b);
  state.groups[g].push(t.id);
  persist();renderAll();
  document.getElementById("teams").scrollIntoView({behavior:"smooth"});
}
function deleteTeam(id){
  if(state.teams.length<=2){alert("Minimal harus ada 2 tim.");return}
  const t=team(id);if(!t)return;
  if(!confirm(`Hapus ${t.name}? Data hasil yang terkait tim ini juga akan dihapus.`))return;
  state.teams=state.teams.filter(x=>x.id!==Number(id));
  GROUPS.forEach(g=>state.groups[g]=state.groups[g].filter(x=>x!==Number(id)));
  state.matchdays.forEach(m=>(m.games||[]).forEach(g=>{delete g.results[id]}));
  state.settings.playin.selected=(state.settings.playin.selected||[]).filter(x=>x!==Number(id));
  if(state.playinResults?.games)state.playinResults.games.forEach(g=>delete g.results[id]);
  persist();renderAll();
}

function renderGroups(){
  const counts=GROUPS.map(g=>state.groups[g].length);
  document.getElementById("groupsGrid").innerHTML=GROUPS.map((g,gi)=>{
    const ids=state.groups[g]||[];
    return `<div class="group"><div class="group-title-row"><h3>GRUP ${g} <small>(${ids.length})</small></h3><label class="group-count">Jumlah <input type="number" min="0" max="${state.teams.length}" value="${ids.length}" onchange="resizeGroup('${g}',this.value)"></label></div>
    ${ids.map((id,i)=>{const t=team(id);return t?`<div class="group-row"><img src="${logoSrc(t)}" alt=""><select onchange="changeGroupSlot('${g}',${i},this.value)"><option value="">Pilih tim</option>${state.teams.map(x=>`<option value="${x.id}" ${x.id===id?'selected':''}>${escapeHtml(x.name)}</option>`).join("")}</select></div>`:""}).join("")}
    </div>`;
  }).join("");
  disableGroupDuplicates();
}
function resizeGroup(g,value){
  const target=Math.max(0,Math.min(state.teams.length,Number(value)||0));
  while(state.groups[g].length<target){
    const available=state.teams.find(t=>!GROUPS.some(x=>state.groups[x].includes(t.id)));
    if(!available)break; state.groups[g].push(available.id);
  }
  while(state.groups[g].length>target)state.groups[g].pop();
  persist();renderGroups();renderSchedule();renderMatchSelect();renderMatchInput();renderStats();
}
function changeGroupSlot(g,index,id){
  id=Number(id); if(!id)return;
  const current=state.groups[g][index];
  let sourceGroup=null,sourceIndex=-1;
  GROUPS.forEach(x=>{const j=state.groups[x].indexOf(id);if(j>=0){sourceGroup=x;sourceIndex=j;}});
  if(sourceGroup===g&&sourceIndex!==index){alert("Tim itu sudah ada di grup ini.");renderGroups();return;}
  if(sourceGroup&&sourceGroup!==g){
    state.groups[g][index]=id;
    state.groups[sourceGroup][sourceIndex]=current;
  }else{
    state.groups[g][index]=id;
    GROUPS.forEach(x=>{if(x!==g)state.groups[x]=state.groups[x].filter(v=>v!==id)});
  }
  persist();renderGroups();renderSchedule();renderMatchSelect();renderMatchInput();renderStats();
}
function disableGroupDuplicates(){
  document.querySelectorAll('#groupsGrid .group').forEach(box=>{const selects=[...box.querySelectorAll('select')];selects.forEach(sel=>{const cur=sel.value;const used=selects.map(x=>x.value).filter(v=>v&&v!==cur);[...sel.options].forEach(o=>{if(o.value)o.disabled=used.includes(o.value)&&o.value!==cur})})});
}
function changeGroup(id,g){
  if(g&&!GROUPS.includes(g))return;
  GROUPS.forEach(x=>state.groups[x]=state.groups[x].filter(v=>v!==Number(id)));
  if(g)state.groups[g].push(Number(id));
  persist();renderGroups();renderSchedule();renderMatchSelect();renderMatchInput();renderStats();
}
function resetAllResults(){
  if(!confirm("Reset SEMUA hasil Regular Season, Play-In, dan Grand Final? Data tim, pengaturan, dan pembagian grup tidak akan dihapus."))return;
  state.matchdays=[];
  state.playinResults=null;
  state.grandFinalResults=null;
  persist();
  renderAll();
  alert("Semua hasil berhasil di-reset.");
}
function resetGroups(){
  if(!confirm("Kosongkan semua pembagian Grup A, B, dan C? Data tim dan hasil pertandingan tidak akan dihapus."))return;
  GROUPS.forEach(g=>state.groups[g]=[]);
  persist();
  renderAll();
  alert("Pembagian grup berhasil di-reset. Semua grup sekarang kosong.");
}
function saveGroups(){
  const total=state.teams.length,sum=GROUPS.reduce((s,g)=>s+state.groups[g].length,0),unique=new Set(GROUPS.flatMap(g=>state.groups[g]));
  const ok=sum===total&&unique.size===total&&GROUPS.every(g=>state.groups[g].length>0);
  const el=document.getElementById("groupMessage");
  el.innerHTML=ok?`<p class="muted">✅ Pembagian grup tersimpan. ${total} tim terbagi ke Grup A, B, dan C.</p>`:`<p style="color:#ff6b6b">⚠️ Jumlah slot grup harus sama dengan ${total} tim dan setiap tim hanya boleh berada di satu grup.</p>`;
  if(ok){persist();renderAll()}
}

function renderSchedule(){
  const fmt=document.getElementById("scheduleFormat");
  fmt.innerHTML=`<span>${totalMatchdays()} matchday</span><span>${state.settings.gamesPerDay} game/hari</span><span>${totalRegularGames()} game regular season</span><span>${state.settings.regular.groupMode==="one"?"Mode: 1 grup per matchday (A → B → C)":"Mode: 2 grup per matchday (A+B → B+C → A+C)"}</span>`;
  document.getElementById("scheduleGrid").innerHTML=Array.from({length:state.settings.weeks},(_,w)=>`
    <div class="schedule-card"><h3>Minggu ${w+1}</h3><div class="days">
      ${Array.from({length:state.settings.daysPerWeek},(_,d)=>{let md=w*state.settings.daysPerWeek+d+1,p=pairFor(md),ts=teamsForMD(md);return `<div class="day"><b>Hari ${d+1} • Matchday ${md}</b><br>Grup ${p[0]} + ${p[1]} <small>${ts.map(t=>escapeHtml(t.name)).join(" • ")}</small><small>${state.settings.gamesPerDay} game</small></div>`}).join("")}
    </div></div>`).join("");
}
function renderMatchSelect(){
  const s=document.getElementById("matchdaySelect");
  const old=Number(s.value)||1;
  s.innerHTML=Array.from({length:totalMatchdays()},(_,i)=>{let md=i+1,p=pairFor(md);return `<option value="${md}">Matchday ${md} — Minggu ${weekOf(md)}, Hari ${dayOf(md)} (${p.join(" + ")})</option>`}).join("");
  s.value=Math.min(old,totalMatchdays());
}
function savedLineup(g,teamId){return g?.lineups?.[teamId]||g?.results?.[teamId]?.lineup||[0,1,2,3].map(()=>({player:null,kills:0}));}
function renderMatchInput(){
  const md=Number(document.getElementById("matchdaySelect").value||1),ts=teamsForMD(md),p=pairFor(md),m=getMatchday(md);
  document.getElementById("mdInfo").innerHTML=`Minggu ${weekOf(md)} • Hari ${dayOf(md)} • ${p.length===1?`Grup ${p[0]}`:`Grup ${p[0]} + ${p[1]}`} • <b>${ts.length} tim</b> • <b>${state.settings.gamesPerDay} game</b>`;
  const tabs=Array.from({length:state.settings.gamesPerDay},(_,gi)=>`<button type="button" class="game-tab ${gi===0?'active':''}" onclick="showInputGame(${gi})">Game ${gi+1}</button>`).join("");
  const panels=Array.from({length:state.settings.gamesPerDay},(_,gi)=>{
    const game=m.games[gi]||{game:gi+1,saved:false,results:{},lineups:{}};
    return `<div class="game-panel ${gi===0?'active':''}" data-input-game="${gi}">
      <div class="game-title"><div><h3>Game ${gi+1}</h3><span class="muted">${game.saved?"Tersimpan":"Belum diisi"}</span></div></div>
      <div class="match-team-grid">
      ${ts.map(t=>{const r=game.results[t.id]||{};return `<div class="match-team-card">
        <div class="match-team-head"><div class="team-cell"><img class="mini-logo" src="${logoSrc(t)}"><div><b>${escapeHtml(t.name)}</b><small class="small-note">${escapeHtml(t.tag||"")} ${t.flag||"🇮🇩"}</small></div></div></div>
        <div class="match-team-fields"><div><label>POSISI</label><input class="result-input placement-input" type="number" min="1" max="${Math.max(12,ts.length)}" data-md="${md}" data-game="${gi}" data-team="${t.id}" data-field="placement" value="${r.placement||""}" ${game.saved?"disabled":""}></div><div><label>TOTAL KILL</label><div class="team-kill-big" id="team-kill-${md}-${gi}-${t.id}">${totalLineupKills(game,t.id)}</div></div></div>
        <div class="player-slots-big">${[0,1,2,3].map(slot=>{const q=savedLineup(game,t.id)[slot]||{};return `<div class="player-slot-big"><select class="result-input player-select player-select-big" data-md="${md}" data-game="${gi}" data-team="${t.id}" data-slot="${slot}" data-field="player" onchange="updatePlayerDropdown(${md},${gi},${t.id},${slot},this.value)">${playerOptions(t,q.player??"")}</select><input class="result-input player-kill-big" type="number" min="0" placeholder="Kill" data-md="${md}" data-game="${gi}" data-team="${t.id}" data-slot="${slot}" data-field="playerkill" value="${q.kills??""}" ${game.saved?"disabled":""} oninput="updatePlayerKill(${md},${gi},${t.id},${slot},this.value)"></div>`}).join("")}</div>
        <div class="match-team-points"><span>Placement: <b>${r.placement?placementPoints(r.placement):"-"}</b></span><span>Total Game: <b>${r.placement?(placementPoints(r.placement)+killPoints(totalLineupKills(game,t.id))):"-"}</b></span></div>
      </div>`}).join("")}
      </div>
    </div>`;
  }).join("");
  document.getElementById("matchInput").innerHTML=`<div class="game-tabs" role="tablist">${tabs}</div>${panels}<button class="save-md" onclick="saveMatchday(${md})">💾 Simpan Matchday ${md}</button>`;
  renderMatchdayStandings(md);disableDuplicateDropdowns();
}
function showInputGame(index){
  document.querySelectorAll('.game-tab').forEach((b,i)=>b.classList.toggle('active',i===index));
  document.querySelectorAll('.game-panel').forEach((p,i)=>p.classList.toggle('active',i===index));
  disableDuplicateDropdowns();
}

function saveMatchday(md){
  const ts=teamsForMD(md),games=[];
  for(let gi=0;gi<state.settings.gamesPerDay;gi++){
    const results={},positions=[];
    ts.forEach(t=>{
      const p=document.querySelector(`[data-md="${md}"][data-game="${gi}"][data-team="${t.id}"][data-field="placement"]`);
      const placement=Number(p?.value||0);if(placement)positions.push(placement);
      const lineup=[0,1,2,3].map(slot=>{const pl=document.querySelector(`[data-md="${md}"][data-game="${gi}"][data-team="${t.id}"][data-slot="${slot}"][data-field="player"]`);const k=document.querySelector(`[data-md="${md}"][data-game="${gi}"][data-team="${t.id}"][data-slot="${slot}"][data-field="playerkill"]`);return {player:pl?.value===""?null:Number(pl?.value),kills:Math.max(0,Number(k?.value||0))};});
      results[t.id]={placement,kills:lineup.reduce((a,x)=>a+x.kills,0),lineup};
    });
    const required=ts.length,validLineups=Object.values(results).every(v=>v.lineup.length===4&&v.lineup.every(x=>x.player!==null)&&new Set(v.lineup.map(x=>String(x.player))).size===4);
    const valid=positions.length===required&&new Set(positions).size===required&&Math.min(...positions)===1&&Math.max(...positions)===required&&validLineups;
    if(!valid){alert(`Game ${gi+1}: posisi harus lengkap 1-${required} tanpa duplikat dan 4 pemain unik harus dipilih untuk setiap tim.`);return}
    games.push({game:gi+1,saved:true,results});
  }
  const idx=state.matchdays.findIndex(m=>m.id===md),obj={id:md,games};
  if(idx>=0)state.matchdays[idx]=obj;else state.matchdays.push(obj);
  state.matchdays.sort((a,b)=>a.id-b.id);persist();renderAll();alert(`Matchday ${md} berhasil disimpan.`);
}

function calcStandings(){
  return state.teams.map(t=>{
    let games=0,booyah=0,kills=0,placement=0;
    state.matchdays.forEach(m=>(m.games||[]).forEach(g=>{
      if(!g.saved)return;const r=g.results?.[t.id];if(!r)return;
      games++;kills+=Number(r.kills)||0;placement+=placementPoints(r.placement);if(Number(r.placement)===1)booyah++;
    }));
    return {team:t,games,booyah,kills,placement,total:killPoints(kills)+placement};
  }).sort((a,b)=>b.total-a.total||b.booyah-a.booyah||b.kills-a.kills||b.placement-a.placement);
}
function teamCell(t){return `<div class="stand-team"><img src="${logoSrc(t)}"><b>${escapeHtml(t.name)}</b></div>`}
function groupStandings(group){
  const ids=state.groups[group]||[];
  const all=calcStandings();
  return all.filter(x=>ids.includes(x.team.id));
}
function qualificationStatus(teamId){
  const q=regularQualification();
  if(q.directTeams.some(x=>x.team.id===teamId)) return '🏆 Grand Final';
  if(q.playin.some(x=>x.team.id===teamId)) return '🎟️ Play-In';
  return '❌ Tereliminasi';
}
function playinQualificationStatus(teamId){
  const q=state.settings.playin.qualifiers||0;
  const rows=playinRows();
  if(!rows.length || !rows.some(x=>x.games>0)) return '⏳ Menunggu hasil';
  const idx=rows.findIndex(x=>x.team.id===teamId);
  return idx>=0 && idx<q ? '🏆 Grand Final' : '❌ Tereliminasi';
}
function groupStandingTable(group){
  const rows=groupStandings(group);
  return `<div class="card group-standing-card"><h3>Overall Klasemen Grup ${group}</h3><div class="table-wrap"><table><thead><tr><th>#</th><th>Tim</th><th>Game</th><th>Booyah</th><th>Kill</th><th>Placement</th><th>Total</th><th>Status</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td>${i+1}</td><td>${teamCell(x.team)}</td><td>${x.games}</td><td>${x.booyah}</td><td>${x.kills}</td><td>${x.placement}</td><td>${x.total}</td><td>${qualificationStatus(x.team.id)}</td></tr>`).join("")}</tbody></table></div></div>`;
}
function showStandingsMode(mode){
  const overall=document.getElementById('overallStandingsView'),groups=document.getElementById('groupStandingsView');
  if(!overall||!groups)return;
  const oneGroupMode=state.settings.regular.groupMode==='one';
  const allowGroups=oneGroupMode || Math.max(...GROUPS.map(g=>(state.groups[g]||[]).length),0)>12;

  // Saat 1 grup/matchday, Overall benar-benar disembunyikan agar tidak
  // menjadi sumber ranking/seleksi yang tercampur antar grup.
  if(oneGroupMode && mode==='overall') mode=GROUPS.find(g=>(state.groups[g]||[]).length>0)||'A';
  if(mode!=='overall'&&!allowGroups)mode='overall';
  overall.style.display=mode==='overall'?'block':'none';
  groups.style.display=mode==='overall'?'none':'block';
  groups.innerHTML=mode==='overall'?'':GROUPS.includes(mode)?groupStandingTable(mode):'';
  document.querySelectorAll('.group-tab').forEach(b=>b.style.display=allowGroups?'inline-block':'none');
  const overallTab=document.querySelector('.standings-tabs button[onclick="showStandingsMode(\'overall\')"]');
  if(overallTab)overallTab.style.display=oneGroupMode?'none':'inline-block';
}
function renderGroupStandings(){showStandingsMode(state.settings.regular.groupMode==="one"?"A":"overall");}

function collectPlayerStats(stage='all',teamFilter='all'){
  const out=[];
  state.teams.filter(t=>teamFilter==='all'||String(t.id)===String(teamFilter)).forEach(t=>{
    roster(t).forEach((p,idx)=>out.push({team:t,index:idx,name:p.name,flag:p.flag,type:p.type,games:0,kills:0}));
  });
  const addGames=(games,teamFilterFn=()=>true)=>{
    (games||[]).forEach(g=>{if(!g.saved)return;Object.entries(g.lineups||{}).forEach(([tid,lu])=>{
      const t=team(tid);if(!t||!teamFilterFn(t))return;
      (savedLineup(g,t.id)||[]).forEach(x=>{if(x?.player===null||x?.player===undefined)return;const row=out.find(r=>r.team.id===t.id&&r.index===Number(x.player));if(row){row.games++;row.kills+=Number(x.kills)||0;}});
    });});
  };
  if(stage==='all'||stage==='regular') state.matchdays.forEach(m=>addGames(m.games));
  if(stage==='all'||stage==='playin') addGames(state.playinResults?.games||[]);
  if(stage==='all'||stage==='grandfinal') addGames(state.grandFinalResults?.games||[]);
  return out.sort((a,b)=>b.kills-a.kills||b.games-a.games||a.team.name.localeCompare(b.team.name)||a.index-b.index);
}
function playerStatsTable(rows){
  return `<div class="table-wrap"><table><thead><tr><th>#</th><th>Pemain</th><th>Tim</th><th>Status</th><th>Total Kill</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td>${i+1}</td><td><b>${x.flag} ${escapeHtml(x.name)}</b></td><td><b>${escapeHtml(x.team.tag||'')} • ${escapeHtml(x.team.name)}</b></td><td>${x.type==='utama'?'Utama':'Cadangan'}</td><td><b>${x.kills}</b></td></tr>`).join('')}</tbody></table></div>`;
}
function showPlayerKillStage(stage){
  playerKillStage=['regular','playin','grandfinal'].includes(stage)?stage:'regular';
  document.querySelectorAll('.player-stage-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.stage===playerKillStage));
  renderPlayerStats();
}
function renderPlayerStats(){
  const teamSel=document.getElementById('playerStatsTeam'),host=document.getElementById('playerStatsList');
  if(!teamSel||!host)return;
  const old=teamSel.value||'all';
  teamSel.innerHTML='<option value="all">Semua Tim</option>'+state.teams.map(t=>`<option value="${t.id}">${escapeHtml(t.tag||'')} • ${escapeHtml(t.name)}</option>`).join('');
  teamSel.value=state.teams.some(t=>String(t.id)===old)?old:'all';
  const filter=teamSel.value||'all';
  const labels={regular:['Regular Season','Total kill yang didapat pemain selama Regular Season.'],playin:['Play-In','Total kill yang didapat pemain selama Play-In.'],grandfinal:['Grand Final','Total kill yang didapat pemain selama Grand Final.']};
  const [title,desc]=labels[playerKillStage];
  const rows=collectPlayerStats(playerKillStage,filter);
  host.innerHTML=`<div class="card player-kill-card"><h3>${title}</h3><p class="muted">${desc}</p>${playerStatsTable(rows)}</div>`;
}

function renderStandings(){
  document.getElementById("standingsBody").innerHTML=calcStandings().map((x,i)=>`<tr><td class="${i<12?'rank-top':''}">${i+1}</td><td>${teamCell(x.team)}</td><td>${groupOf(x.team.id)}</td><td>${x.games}</td><td>${x.booyah}</td><td>${x.kills}</td><td>${x.placement}</td><td>${x.total}</td><td>${qualificationStatus(x.team.id)}</td></tr>`).join("");
  const el=document.getElementById("qualificationSummary");if(!el)return;
  const q=regularQualification();
  const direct=q.directTeams.length,pi=q.playin.length,elim=q.eliminated.length;
  const source=state.settings.regular.groupMode==="one"?`Seleksi: posisi di masing-masing klasemen grup (tidak dicampur).`:`Seleksi: klasemen Overall (2 grup/matchday).`;
  el.innerHTML=`<span>🏆 ${direct} langsung Grand Final</span><span>🎟️ ${pi} tim Play-In</span><span>❌ ${elim} tereliminasi</span><span>📌 ${source}</span>`;
  showStandingsMode(state.settings.regular.groupMode==="one"?"A":"overall");
}
function renderTop5(){
  document.getElementById("top5").innerHTML=calcStandings().slice(0,5).map((x,i)=>`<div class="card top-card"><b>#${i+1}</b><img class="logo" src="${logoSrc(x.team)}"><div><b>${escapeHtml(x.team.name)}</b><small class="muted"> • ${x.games} game</small></div><span class="points">${x.total}</span></div>`).join("");
}
function calcMatchdayStandings(md){
  const ts=teamsForMD(md),m=state.matchdays.find(x=>x.id===md);
  return ts.map(t=>{let games=0,booyah=0,kills=0,placement=0;
    (m?.games||[]).forEach(g=>{if(!g.saved)return;const r=g.results?.[t.id];if(!r)return;games++;kills+=Number(r.kills)||0;placement+=placementPoints(r.placement);if(Number(r.placement)===1)booyah++;});
    return {team:t,games,booyah,kills,placement,total:killPoints(kills)+placement};
  }).sort((a,b)=>b.total-a.total||b.booyah-a.booyah||b.kills-a.kills||b.placement-a.placement);
}
function standingsModeSwitch(stage='matchday'){
  const label=stage==='matchday'?'Tampilan klasemen matchday':stage==='playin'?'Tampilan klasemen Play-In':'Tampilan klasemen Grand Final';
  return `<div class="standings-view-switch"><span>${label}</span><button class="secondary ${standingsView==='recap'?'active':''}" onclick="setStandingsView('recap')">Rekap Match</button><button class="secondary ${standingsView==='points'?'active':''}" onclick="setStandingsView('points')">Poin Match</button></div>`;
}
function setStandingsView(mode){
  standingsView=mode==='points'?'points':'recap';
  renderAllMatchdayStandings();
  renderMatchdayStandings(Number(document.getElementById('matchdaySelect')?.value||1));
  renderPlayIn();
  renderGrandFinal();
}
function standingTable(rows,stage='matchday'){
  const statusHeader=stage==='playin'?'<th>Status</th>':'';
  const body=rows.map((x,i)=>`<tr><td class="${i<3?'rank-top':''}">${i+1}</td><td>${teamCell(x.team)}</td><td>${x.games}</td><td>${x.booyah}</td><td>${x.kills}</td><td>${x.placement}</td><td><b>${x.total}</b></td>${stage==='playin'?`<td>${playinQualificationStatus(x.team.id)}</td>`:''}</tr>`).join('');
  return `<div class="table-wrap"><table><thead><tr><th>#</th><th>Tim</th><th>Game</th><th>Booyah</th><th>Kill</th><th>Placement</th><th>Total</th>${statusHeader}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function matchdayStandingTable(rows,md){
  md=Number(md||document.getElementById('matchdaySelect')?.value||1);
  const m=state.matchdays.find(x=>x.id===md);
  const games=(m?.games||[]).filter(g=>g.saved).sort((a,b)=>a.game-b.game);
  const teamRows=[...rows].sort((a,b)=>b.total-a.total||b.booyah-a.booyah||b.kills-a.kills||b.placement-a.placement);
  const gameHeads=games.map(g=>`<th colspan="2" class="game-head"><div>✓ Game ${g.game}</div><small>${escapeHtml(g.date||'')}</small></th>`).join('');
  const gameSub=games.map(()=>'<th>🏆 P</th><th>☠ K</th>').join('');
  const body=teamRows.map((x,i)=>{
    const cells=games.map(g=>{
      const r=g.results?.[x.team.id]||{};
      return `<td class="placement-cell">${r.placement?placementLabel(r.placement):'—'}</td><td>${Number(r.kills)||0}</td>`;
    }).join('');
    return `<tr><td class="sticky-rank ${i<3?'rank-top':''}">${i+1}</td><td class="sticky-team">${teamCell(x.team)}</td><td class="sticky-total"><b>${x.total}</b></td>${cells}</tr>`;
  }).join('');
  return `<div class="matchday-table-wrap"><table class="matchday-table"><thead><tr><th rowspan="2" class="sticky-rank"># Rank</th><th rowspan="2" class="sticky-team">👥 Participant</th><th rowspan="2" class="sticky-total">⭐ Total Points</th>${gameHeads}</tr><tr>${gameSub}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function placementLabel(p){const n=Number(p);if(!n)return '—';const suffix=n===1?'st':n===2?'nd':n===3?'rd':'th';return `${n}${suffix}`;}
function renderMatchdayStandings(md){
  const host=document.getElementById("matchdayStanding"),m=state.matchdays.find(x=>x.id===md),saved=m?(m.games||[]).filter(g=>g.saved).length:0;
  host.innerHTML=saved?`<div class="md-standing"><h3>Klasemen Matchday ${md}</h3><p class="small-note">${saved}/${state.settings.gamesPerDay} game tersimpan.</p>${matchdayStandingTable(calcMatchdayStandings(md),md)}</div>`:`<div class="not-ready">Belum ada hasil tersimpan untuk Matchday ${md}.</div>`;
}
function renderAllMatchdayStandings(){
  const host=document.getElementById("allMatchdayStandings");
  const cards=[];
  for(let md=1;md<=totalMatchdays();md++){
    const m=state.matchdays.find(x=>x.id===md),saved=m?(m.games||[]).filter(g=>g.saved).length:0,p=pairFor(md);
    cards.push(`<details class="history-card"><summary>Matchday ${md} — Minggu ${weekOf(md)}, Hari ${dayOf(md)} — Grup ${p.join(" + ")} — ${saved}/${state.settings.gamesPerDay} game</summary>${saved?matchdayStandingTable(calcMatchdayStandings(md),md):`<div class="not-ready">Belum ada hasil untuk matchday ini.</div>`}</details>`);
  }
  host.innerHTML=cards.join("");
}

function renderHistory(){
  const list=document.getElementById("historyList");
  const saved=[...state.matchdays].filter(m=>(m.games||[]).some(g=>g.saved)).sort((a,b)=>b.id-a.id);
  list.innerHTML=saved.length?saved.map(m=>{
    const p=pairFor(m.id),games=m.games.filter(g=>g.saved).length;
    return `<details class="history-card"><summary>Matchday ${m.id} — Minggu ${weekOf(m.id)}, Hari ${dayOf(m.id)} — Grup ${p.join(" + ")} — ${games}/${state.settings.gamesPerDay} game</summary><div class="mini">${m.games.filter(g=>g.saved).map(g=>`Game ${g.game}: ${teamsForMD(m.id).map(t=>{let r=g.results?.[t.id];return `${escapeHtml(t.name)} ${r?.kills||0}K/${r?.placement||0}P`}).join(" | ")}`).join("<br>")}</div></details>`
  }).join(""):`<div class="not-ready">Belum ada hasil matchday yang tersimpan.</div>`;
}

function groupQualificationOrder(){
  // Mode 1 grup/matchday: setiap grup berdiri sendiri.
  // Tidak ada lagi penggabungan/rotasi posisi A+B+C.
  const lists=GROUPS.map(g=>({group:g,rows:groupStandings(g)}));
  const max=Math.max(0,...lists.map(x=>x.rows.length));
  const ordered=[];
  for(let rank=0;rank<max;rank++){
    lists.forEach(x=>{if(x.rows[rank])ordered.push(x.rows[rank]);});
  }
  return ordered;
}
function qualificationOrder(){
  const hasGroups=GROUPS.some(g=>(state.groups[g]||[]).length>0);
  return hasGroups?groupQualificationOrder():calcStandings();
}
function regularQualification(){
  const useGroupSelection=state.settings.regular.groupMode==="one";
  const sel=useGroupSelection
    ? (state.settings.regular.selectionOne||state.settings.regular)
    : (state.settings.regular.selectionTwo||state.settings.regular);
  const piEnabled=!!state.settings.playin.enabled;

  if(useGroupSelection){
    // Seleksi benar-benar per grup: posisi tim hanya dibandingkan dengan tim
    // dalam grupnya sendiri. Contoh: direct=4 berarti posisi 1-4 di SETIAP grup.
    const directTeams=[],playin=[],eliminated=[],groups={};
    GROUPS.forEach(g=>{
      const rows=groupStandings(g);
      const n=rows.length;
      const direct=Math.min(Math.max(0,Number(sel.direct)||0),n);
      const from=Math.max(direct+1,Math.min(Number(sel.playinFrom)||1,n+1));
      const to=Math.max(0,Math.min(Number(sel.playinTo)||0,n));
      const directRows=rows.slice(0,direct);
      const piRows=piEnabled&&to>=from?rows.slice(from-1,to):[];
      const eliminatedRows=rows.slice(piEnabled?Math.max(direct,to):direct);
      directTeams.push(...directRows);
      playin.push(...piRows);
      eliminated.push(...eliminatedRows);
      groups[g]={rows,direct:directRows,playin:piRows,eliminated:eliminatedRows};
    });
    return {sorted:[],directTeams,playin,eliminated,groups,selectionMode:"one"};
  }

  const sorted=calcStandings();
  const n=state.teams.length;
  const direct=Math.min(Math.max(0,Number(sel.direct)||0),n);
  const from=Math.max(direct+1,Math.min(Number(sel.playinFrom)||1,n+1));
  const to=Math.max(0,Math.min(Number(sel.playinTo)||0,n));
  const pi=piEnabled&&to>=from?sorted.slice(from-1,to):[];
  const directTeams=sorted.slice(0,direct);
  const eliminated=sorted.slice(piEnabled?Math.max(direct,to):direct);
  return {sorted,directTeams,playin:pi,eliminated,groups:null,selectionMode:"two"};
}
function playinParticipants(){return regularQualification().playin.map(x=>x.team)}
function playinGameLineup(g,teamId){
  const base=[0,1,2,3].map(()=>({player:null,kills:0}));
  const lu=g?.lineups?.[teamId]||g?.results?.[teamId]?.lineup||base;
  while(lu.length<4)lu.push({player:null,kills:0});
  return lu.slice(0,4);
}
function playinRows(){
  const teams=playinParticipants(),res=state.playinResults?.games||[];
  return teams.map(t=>{let games=0,kills=0,placement=0,booyah=0;res.forEach(g=>{if(!g.saved)return;const r=g.results?.[t.id];if(!r)return;games++;kills+=Number(r.kills)||0;placement+=placementPoints(r.placement);if(Number(r.placement)===1)booyah++});return {team:t,games,kills,placement,booyah,total:killPoints(kills)+placement};}).sort((a,b)=>b.total-a.total||b.booyah-a.booyah||b.kills-a.kills||b.placement-a.placement);
}
function renderPlayIn(){
  const panel=document.getElementById("playinPanel");
  const regularComplete=totalGamesSaved()===totalRegularGames();
  if(!regularComplete){panel.innerHTML=`<div class="not-ready">🔒 Play-In terkunci. Selesaikan semua ${totalRegularGames()} game Regular Season terlebih dahulu.</div>`;return;}
  if(!state.settings.playin.enabled){panel.innerHTML=`<div class="not-ready">Play-In dinonaktifkan di Editor.</div>`;return;}
  const participants=playinParticipants(),games=state.settings.playin.games,stored=state.playinResults?.games||[];
  if(participants.length===0){panel.innerHTML=`<div class="not-ready">Tidak ada tim di zona Play-In. Atur rentang posisi di Editor.</div>`;return;}
  const inputHtml=Array.from({length:games},(_,gi)=>{
    const g=stored[gi]||{game:gi+1,saved:false,results:{},lineups:{}};
    return `<div class="game-block playin-result"><div class="game-title"><h3>Play-In Game ${gi+1}</h3><span class="muted">${g.saved?"Tersimpan":"Belum diisi"}</span></div><table class="result-table"><thead><tr><th>Posisi</th><th>Tim</th><th>Pemain</th><th>Kill</th><th>Total Kill Tim</th><th>Placement</th><th>Total</th></tr></thead><tbody>${participants.map(t=>{const r=g.results?.[t.id]||{},lu=savedLineup(g,t.id);return `<tr><td><input class="result-input" type="number" min="1" max="${participants.length}" data-pg="${gi}" data-pt="${t.id}" data-pfield="placement" value="${r.placement||""}" ${g.saved?"disabled":""}></td><td><div class="team-cell"><img class="mini-logo" src="${logoSrc(t)}"><div><b>${escapeHtml(t.name)}</b><small class="small-note">${escapeHtml(t.tag||"")} ${t.flag||"🇮🇩"}</small></div></div></td><td><div class="player-slots">${[0,1,2,3].map(slot=>{const q=lu[slot]||{};return `<div class="player-slot"><select class="result-input player-select" data-pg="${gi}" data-pt="${t.id}" data-pslot="${slot}" data-pfield="player" onchange="updatePlayInPlayer(${gi},${t.id},${slot},this.value)">${playerOptions(t,q.player??"")}</select><input class="result-input" type="number" min="0" placeholder="Kill" data-pg="${gi}" data-pt="${t.id}" data-pslot="${slot}" data-pfield="playerkill" value="${q.kills??""}" ${g.saved?"disabled":""} oninput="updatePlayInPlayerKill(${gi},${t.id},${slot},this.value)"></div>`}).join("")}</div></td><td id="pi-team-kill-${gi}-${t.id}">${lu.reduce((a,x)=>a+(Number(x.kills)||0),0)}</td><td>${r.placement?placementPoints(r.placement):"-"}</td><td>${r.placement?(placementPoints(r.placement)+killPoints(lu.reduce((a,x)=>a+(Number(x.kills)||0),0))):"-"}</td></tr>`}).join("")}</tbody></table></div>`;
  }).join("")+`<button onclick="savePlayIn()">💾 Simpan Hasil Play-In</button>`;
  const rows=playinRows();
  panel.innerHTML=`<div class="playin-grid"><div class="card"><h3>Peserta Play-In</h3><p class="muted">Otomatis dari posisi ${state.settings.regular.playinFrom}–${state.settings.regular.playinTo} Regular Season.</p><div class="playin-team-list">${participants.map((t,i)=>`<div class="check-team"><b>#${state.settings.regular.playinFrom+i}</b><img src="${logoSrc(t)}"><span>${escapeHtml(t.name)}</span></div>`).join("")}</div></div><div class="card"><h3>Format</h3><p class="muted">${participants.length} tim • ${games} game • ${state.settings.playin.qualifiers} tim lolos.</p><p class="small-note">Tidak ada pemilihan manual peserta.</p></div></div><div style="margin-top:20px">${inputHtml}</div>${rows.length&&rows.some(x=>x.games>0)?`<div class="md-standing"><h3>Klasemen Play-In</h3>${standingsModeSwitch('playin')}${standingTable(rows,"playin")}</div>`:""}`;
  disableDuplicateDropdowns();
}
function updatePlayInPlayer(gi,teamId,slot,val){const games=state.playinResults?.games||[];const g=games[gi]||{game:gi+1,saved:false,results:{},lineups:{}};if(g.saved)return;state.playinResults=state.playinResults||{games};state.playinResults.games[gi]=g;g.lineups=g.lineups||{};g.lineups[teamId]=g.lineups[teamId]||[0,1,2,3].map(()=>({player:null,kills:0}));g.lineups[teamId][slot].player=val===""?null:Number(val);persist();renderPlayIn();}
function updatePlayInPlayerKill(gi,teamId,slot,val){const games=state.playinResults?.games||[];const g=games[gi]||{game:gi+1,saved:false,results:{},lineups:{}};if(g.saved)return;state.playinResults=state.playinResults||{games};state.playinResults.games[gi]=g;g.lineups=g.lineups||{};g.lineups[teamId]=g.lineups[teamId]||[0,1,2,3].map(()=>({player:null,kills:0}));g.lineups[teamId][slot].kills=Math.max(0,Number(val)||0);persist();const el=document.getElementById(`pi-team-kill-${gi}-${teamId}`);if(el)el.textContent=g.lineups[teamId].reduce((a,x)=>a+(Number(x.kills)||0),0);}
function savePlayIn(){
  const ts=playinParticipants(),games=[];if(ts.length!==state.settings.playin.teams){alert("Jumlah peserta Play-In belum sesuai.");return}
  for(let gi=0;gi<state.settings.playin.games;gi++){const results={},positions=[];ts.forEach(t=>{const p=document.querySelector(`[data-pg="${gi}"][data-pt="${t.id}"][data-pfield="placement"]`);const placement=Number(p?.value||0);if(placement)positions.push(placement);const lineup=[0,1,2,3].map(slot=>{const pl=document.querySelector(`[data-pg="${gi}"][data-pt="${t.id}"][data-pslot="${slot}"][data-pfield="player"]`);const k=document.querySelector(`[data-pg="${gi}"][data-pt="${t.id}"][data-pslot="${slot}"][data-pfield="playerkill"]`);return {player:pl?.value===""?null:Number(pl?.value),kills:Math.max(0,Number(k?.value||0))};});results[t.id]={placement,kills:lineup.reduce((a,x)=>a+x.kills,0),lineup};});const n=ts.length,validLineups=Object.values(results).every(v=>v.lineup.every(x=>x.player!==null)&&new Set(v.lineup.map(x=>String(x.player))).size===4),valid=positions.length===n&&new Set(positions).size===n&&Math.min(...positions)===1&&Math.max(...positions)===n&&validLineups;if(!valid){alert(`Play-In Game ${gi+1}: posisi 1-${n} harus lengkap dan 4 pemain unik wajib dipilih setiap tim.`);return}games.push({game:gi+1,saved:true,results});}
  state.playinResults={games};persist();renderAll();alert("Hasil Play-In berhasil disimpan.");
}
function grandFinalTeams(){
  const q=regularQualification();
  const pi=q.playin.slice(0,Math.min(state.settings.playin.qualifiers,q.playin.length));
  return [...q.directTeams.map(x=>({...x,source:"Regular Season"})),...pi.map(x=>({...x,source:"Play-In"}))];
}
function grandFinalRows(){const teams=grandFinalTeams(),res=state.grandFinalResults?.games||[];return teams.map(t=>{let games=0,kills=0,placement=0,booyah=0;res.forEach(g=>{if(!g.saved)return;const r=g.results?.[t.team.id];if(!r)return;games++;kills+=Number(r.kills)||0;placement+=placementPoints(r.placement);if(Number(r.placement)===1)booyah++});return {...t,games,kills,placement,booyah,total:killPoints(kills)+placement};}).sort((a,b)=>b.total-a.total||b.booyah-a.booyah||b.kills-a.kills||b.placement-a.placement);}
function renderGrandFinal(){
  const regularComplete=totalGamesSaved()===totalRegularGames();
  const piComplete=!state.settings.playin.enabled || (state.playinResults?.games||[]).filter(g=>g.saved).length===state.settings.playin.games;
  if(!regularComplete || !piComplete){document.getElementById("grandFinalDescription").textContent="Tahap ini terkunci sampai Regular Season selesai";document.getElementById("grandFinalList").innerHTML=`<div class="not-ready">🔒 Grand Final terkunci. ${!regularComplete?"Selesaikan Regular Season terlebih dahulu.":"Selesaikan seluruh Play-In terlebih dahulu."}</div>`;return;}
  const teams=grandFinalTeams(),slots=grandFinalTeams().length,pi=state.settings.playin;let description=`${teams.length}/${slots} tim masuk Grand Final`;if(pi.enabled)description+=` • ${Math.max(0,slots-Math.min(pi.qualifiers,slots))} langsung + ${Math.min(pi.qualifiers,slots)} dari Play-In`;
  document.getElementById("grandFinalDescription").textContent=description;
  let inputHtml="";
  if(teams.length===0) inputHtml=`<div class="not-ready">Belum ada tim yang lolos ke Grand Final.</div>`;
  else{const games=state.settings.grandFinal.games,stored=state.grandFinalResults?.games||[];inputHtml=Array.from({length:games},(_,gi)=>{const g=stored[gi]||{game:gi+1,saved:false,results:{},lineups:{}};return `<div class="game-block playin-result"><div class="game-title"><h3>Grand Final Game ${gi+1}</h3><span class="muted">${g.saved?"Tersimpan":"Belum diisi"}</span></div><table class="result-table"><thead><tr><th>Posisi</th><th>Tim</th><th>Pemain</th><th>Kill</th><th>Total Kill Tim</th><th>Placement</th><th>Total</th></tr></thead><tbody>${teams.map(x=>{const t=x.team,r=g.results?.[t.id]||{},lu=savedLineup(g,t.id);return `<tr><td><input class="result-input" type="number" min="1" max="${teams.length}" data-fg="${gi}" data-ft="${t.id}" data-ffield="placement" value="${r.placement||""}" ${g.saved?"disabled":""}></td><td><div class="team-cell"><img class="mini-logo" src="${logoSrc(t)}"><div><b>${escapeHtml(t.name)}</b><small class="small-note">${escapeHtml(t.tag||"")} ${t.flag||"🇮🇩"} • ${x.source}</small></div></div></td><td><div class="player-slots">${[0,1,2,3].map(slot=>{const q=lu[slot]||{};return `<div class="player-slot"><select class="result-input player-select" data-fg="${gi}" data-ft="${t.id}" data-fslot="${slot}" data-ffield="player" onchange="updateFinalPlayer(${gi},${t.id},${slot},this.value)">${playerOptions(t,q.player??"")}</select><input class="result-input" type="number" min="0" placeholder="Kill" data-fg="${gi}" data-ft="${t.id}" data-fslot="${slot}" data-ffield="playerkill" value="${q.kills??""}" ${g.saved?"disabled":""} oninput="updateFinalPlayerKill(${gi},${t.id},${slot},this.value)"></div>`}).join("")}</div></td><td id="fg-team-kill-${gi}-${t.id}">${lu.reduce((a,z)=>a+(Number(z.kills)||0),0)}</td><td>${r.placement?placementPoints(r.placement):"-"}</td><td>${r.placement?(placementPoints(r.placement)+killPoints(lu.reduce((a,z)=>a+(Number(z.kills)||0),0))):"-"}</td></tr>`}).join("")}</tbody></table></div>`}).join("")+`<button onclick="saveGrandFinal()">💾 Simpan Hasil Grand Final</button>`;}
  const rows=grandFinalRows();document.getElementById("grandFinalList").innerHTML=`<div class="not-ready" style="margin-bottom:15px">${regularComplete?"✅ Regular season selesai.":`⏳ Regular season ${totalGamesSaved()}/${totalRegularGames()} game selesai.`}</div>${inputHtml}${rows.length&&rows.some(x=>x.games>0)?`<div class="md-standing"><h3>Klasemen Grand Final</h3>${standingsModeSwitch('grandfinal')}${standingTable(rows)}</div>`:""}`;
  disableDuplicateDropdowns();
}
function updateFinalPlayer(gi,teamId,slot,val){const games=state.grandFinalResults?.games||[];const g=games[gi]||{game:gi+1,saved:false,results:{},lineups:{}};if(g.saved)return;state.grandFinalResults=state.grandFinalResults||{games};state.grandFinalResults.games[gi]=g;g.lineups=g.lineups||{};g.lineups[teamId]=g.lineups[teamId]||[0,1,2,3].map(()=>({player:null,kills:0}));g.lineups[teamId][slot].player=val===""?null:Number(val);persist();renderGrandFinal();}
function updateFinalPlayerKill(gi,teamId,slot,val){const games=state.grandFinalResults?.games||[];const g=games[gi]||{game:gi+1,saved:false,results:{},lineups:{}};if(g.saved)return;state.grandFinalResults=state.grandFinalResults||{games};state.grandFinalResults.games[gi]=g;g.lineups=g.lineups||{};g.lineups[teamId]=g.lineups[teamId]||[0,1,2,3].map(()=>({player:null,kills:0}));g.lineups[teamId][slot].kills=Math.max(0,Number(val)||0);persist();const el=document.getElementById(`fg-team-kill-${gi}-${teamId}`);if(el)el.textContent=g.lineups[teamId].reduce((a,x)=>a+(Number(x.kills)||0),0);}
function saveGrandFinal(){const teams=grandFinalTeams(),games=[];if(!teams.length){alert("Belum ada tim Grand Final.");return}for(let gi=0;gi<state.settings.grandFinal.games;gi++){const results={},positions=[];teams.forEach(x=>{const t=x.team,p=document.querySelector(`[data-fg="${gi}"][data-ft="${t.id}"][data-ffield="placement"]`);const placement=Number(p?.value||0);if(placement)positions.push(placement);const lineup=[0,1,2,3].map(slot=>{const pl=document.querySelector(`[data-fg="${gi}"][data-ft="${t.id}"][data-fslot="${slot}"][data-ffield="player"]`);const k=document.querySelector(`[data-fg="${gi}"][data-ft="${t.id}"][data-fslot="${slot}"][data-ffield="playerkill"]`);return {player:pl?.value===""?null:Number(pl?.value),kills:Math.max(0,Number(k?.value||0))};});results[t.id]={placement,kills:lineup.reduce((a,z)=>a+z.kills,0),lineup};});const n=teams.length,valid=positions.length===n&&new Set(positions).size===n&&Math.min(...positions)===1&&Math.max(...positions)===n&&Object.values(results).every(v=>v.lineup.every(x=>x.player!==null)&&new Set(v.lineup.map(x=>String(x.player))).size===4);if(!valid){alert(`Grand Final Game ${gi+1}: posisi 1-${n} harus lengkap dan 4 pemain unik wajib dipilih setiap tim.`);return}games.push({game:gi+1,saved:true,results});}state.grandFinalResults={games};persist();renderAll();alert("Hasil Grand Final berhasil disimpan.");}

function routePage(){
  const hash=(location.hash||'#dashboard').slice(1);
  const allowed=['dashboard','editor','teams','groups','schedule','input','standings','matchdayStandings','playerStats','playin','grandfinal'];
  const route=allowed.includes(hash)?hash:'dashboard';
  document.querySelectorAll('main > section.page').forEach(el=>el.style.display='none');
  if(route==='dashboard'){
    document.getElementById('dashboard')?.style.setProperty('display','block');
    document.getElementById('dashboardTop5')?.style.setProperty('display','block');
  }else{
    document.getElementById(route)?.style.setProperty('display','block');
  }
  document.querySelectorAll('.main-nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+route));
}
window.addEventListener('hashchange',routePage);

function exportCSV(){
  const rows=[["Rank","Tim","Grup","Game","Booyah","Kill","Placement Point","Total Point"],...calcStandings().map((x,i)=>[i+1,x.team.name,groupOf(x.team.id),x.games,x.booyah,x.kills,x.placement,x.total])];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download="klasemen_ff_championship.csv";a.click();
}
renderAll();
