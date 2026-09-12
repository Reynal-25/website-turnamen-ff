const PLACEMENT={1:12,2:9,3:8,4:7,5:6,6:5,7:4,8:3,9:2,10:1,11:0,12:0};
const GROUPS=["A","B","C"];
const STORAGE="ff_championship_18_v3";

let state=JSON.parse(localStorage.getItem(STORAGE)||"null");
if(!state){
  state={teams:Array.from({length:18},(_,i)=>({id:i+1,name:"Team "+String.fromCharCode(65+i),players:["Player 1","Player 2","Player 3","Player 4"],reserves:["Cadangan 1","Cadangan 2"],coach:"Pelatih 1",logo:""})),
  groups:{A:[],B:[],C:[]},matchdays:[]};
  state.teams.forEach((t,i)=>state.groups[GROUPS[Math.floor(i/6)]].push(t.id));
  persist();
}
function persist(){localStorage.setItem(STORAGE,JSON.stringify(state))}
state.teams.forEach(t=>{if(!Array.isArray(t.reserves))t.reserves=["Cadangan 1","Cadangan 2"];if(typeof t.coach!=="string")t.coach="Pelatih 1";});persist()
function team(id){return state.teams.find(t=>t.id===Number(id))}
function groupOf(id){return GROUPS.find(g=>state.groups[g].includes(Number(id)))||"-"}
function pairFor(md){const d=((md-1)%3)+1;return d===1?["A","B"]:d===2?["B","C"]:["A","C"]}
function weekOf(md){return Math.ceil(md/3)}
function dayOf(md){return ((md-1)%3)+1}
function teamsForMD(md){const p=pairFor(md);return [...state.groups[p[0]],...state.groups[p[1]]].map(team)}
function totalGamesSaved(){return state.matchdays.reduce((s,m)=>s+m.games.filter(g=>g.saved).length,0)}

function renderAll(){
  renderTeams();renderGroups();renderSchedule();renderMatchSelect();renderMatchInput();renderStandings();renderTop5();renderHistory();renderGrandFinal();renderStats();
}
function renderStats(){
  const standings=calcStandings();
  document.getElementById("statTeams").textContent=state.teams.length;
  document.getElementById("statMd").textContent=`${state.matchdays.filter(m=>m.games.some(g=>g.saved)).length}/12`;
  document.getElementById("statGames").textContent=`${totalGamesSaved()}/72`;
  document.getElementById("statLeader").textContent=standings[0]?.team.name||"-";
}
function renderTeams(){
  document.getElementById("teamsGrid").innerHTML=state.teams.map(t=>`
  <div class="card team-card">
    <div class="team-head"><img class="logo" src="${t.logo||'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 rx=%2212%22 fill=%22%231a202a%22/%3E%3C/svg%3E'}">
      <div><h3>${escapeHtml(t.name)}</h3><small>Tim ${t.id} • Grup ${groupOf(t.id)}</small></div></div>
    <div class="field"><label>NAMA TIM</label><input value="${escapeAttr(t.name)}" onchange="updateTeam(${t.id},'name',this.value)"></div>
    <h4 class="subheading">Pemain Utama</h4>
    <div class="player-list">${t.players.map((p,i)=>`<div class="field"><label>PEMAIN ${i+1}</label><input value="${escapeAttr(p)}" onchange="updatePlayer(${t.id},${i},this.value)"></div>`).join("")}</div>
    <h4 class="subheading">Pemain Cadangan</h4>
    <div class="player-list">${t.reserves.map((p,i)=>`<div class="field"><label>CADANGAN ${i+1}</label><input value="${escapeAttr(p)}" onchange="updateReserve(${t.id},${i},this.value)"></div>`).join("")}</div>
    <div class="field"><label>PELATIH</label><input value="${escapeAttr(t.coach)}" onchange="updateCoach(${t.id},this.value)"></div>
    <label class="logo-upload">LOGO <input type="file" accept="image/*" onchange="uploadLogo(${t.id},this)"></label>
  </div>`).join("");
}
function updateTeam(id,k,v){team(id)[k]=v;persist();renderAll()}
function updatePlayer(id,i,v){team(id).players[i]=v;persist();renderAll()}
function updateReserve(id,i,v){team(id).reserves[i]=v;persist();renderAll()}
function updateCoach(id,v){team(id).coach=v;persist();renderAll()}
function uploadLogo(id,input){
  const f=input.files[0]; if(!f)return;
  const r=new FileReader();r.onload=e=>{team(id).logo=e.target.result;persist();renderAll()};r.readAsDataURL(f);
}
function renderGroups(){
  document.getElementById("groupsGrid").innerHTML=GROUPS.map(g=>`
    <div class="group"><h3>GRUP ${g} <small>(${state.groups[g].length}/6)</small></h3>
    ${state.teams.map(t=>`<div class="group-row"><span>${escapeHtml(t.name)}</span>
      <select data-team="${t.id}" data-group="${g}" onchange="changeGroup(${t.id},this.value)">
        <option value="">Pilih</option>${GROUPS.map(x=>`<option value="${x}" ${groupOf(t.id)===x?"selected":""}>${x}</option>`).join("")}
      </select></div>`).filter((_,i)=>true).join("")}
    </div>`).join("");
}
function changeGroup(id,g){
  GROUPS.forEach(x=>state.groups[x]=state.groups[x].filter(v=>v!==Number(id)));
  if(g)state.groups[g].push(Number(id));
  persist();renderGroups();renderSchedule();renderMatchSelect();renderMatchInput();
}
function saveGroups(){
  const ok=GROUPS.every(g=>state.groups[g].length===6);
  const el=document.getElementById("groupMessage");
  el.innerHTML=ok?`<p class="muted">✅ Pembagian grup valid: masing-masing 6 tim.</p>`:`<p style="color:#ff6b6b">⚠️ Setiap grup harus berisi tepat 6 tim.</p>`;
  if(ok){persist();renderAll()}
}
function renderSchedule(){
  document.getElementById("scheduleGrid").innerHTML=Array.from({length:4},(_,w)=>`
    <div class="schedule-card"><h3>Minggu ${w+1}</h3><div class="days">
      ${[1,2,3].map(d=>{let md=w*3+d,p=pairFor(md),ts=teamsForMD(md);return `<div class="day"><b>Hari ${d} • Matchday ${md}</b><br>Grup ${p[0]} + ${p[1]} <small>${ts.map(t=>escapeHtml(t.name)).join(" • ")}</small></div>`}).join("")}
    </div></div>`).join("");
}
function renderMatchSelect(){
  const s=document.getElementById("matchdaySelect");
  s.innerHTML=Array.from({length:12},(_,i)=>{let md=i+1,p=pairFor(md);return `<option value="${md}">Matchday ${md} — Minggu ${weekOf(md)}, Hari ${dayOf(md)} (${p.join(" + ")})</option>`}).join("");
}
function renderMatchInput(){
  const md=Number(document.getElementById("matchdaySelect").value||1), ts=teamsForMD(md), p=pairFor(md);
  document.getElementById("mdInfo").innerHTML=`Minggu ${weekOf(md)} • Hari ${dayOf(md)} • Grup ${p[0]} + ${p[1]} • <b>${ts.length} tim</b> • <b>6 game</b>`;
  let old=state.matchdays.find(m=>m.id===md);
  if(!old){old={id:md,games:Array.from({length:6},(_,i)=>({game:i+1,saved:false,results:{}}))};}
  document.getElementById("matchInput").innerHTML=Array.from({length:6},(_,gi)=>{
    const game=old.games[gi];
    return `<div class="game-block"><div class="game-title"><h3>Game ${gi+1}</h3><span class="muted">${game.saved?"Tersimpan":"Belum diisi"}</span></div>
    <table class="result-table"><thead><tr><th>Posisi</th><th>Tim</th><th>Kill</th><th>Poin Placement</th><th>Total Game</th></tr></thead>
    <tbody>${ts.map((t,i)=>{const r=game.results[t.id]||{};return `<tr><td><input class="result-input" type="number" min="1" max="12" data-md="${md}" data-game="${gi}" data-team="${t.id}" data-field="placement" value="${r.placement||""}"></td><td>${escapeHtml(t.name)}</td><td><input class="result-input" type="number" min="0" data-md="${md}" data-game="${gi}" data-team="${t.id}" data-field="kills" value="${r.kills??""}"></td><td>${r.placement?PLACEMENT[r.placement]??0:"-"}</td><td>${r.placement?((PLACEMENT[r.placement]??0)+(Number(r.kills)||0)):"-"}</td></tr>`}).join("")}</tbody></table></div>`
  }).join("")+`<button class="save-md" onclick="saveMatchday(${md})">💾 Simpan Matchday ${md}</button>`;
  renderMatchdayStandings(md);
}
function saveMatchday(md){
  const ts=teamsForMD(md);
  const games=[];
  for(let gi=0;gi<6;gi++){
    const results={};let positions=[];
    ts.forEach(t=>{
      const p=document.querySelector(`[data-md="${md}"][data-game="${gi}"][data-team="${t.id}"][data-field="placement"]`);
      const k=document.querySelector(`[data-md="${md}"][data-game="${gi}"][data-team="${t.id}"][data-field="kills"]`);
      const placement=Number(p?.value||0),kills=Math.max(0,Number(k?.value||0));
      if(placement)positions.push(placement);
      results[t.id]={placement,kills};
    });
    const valid=positions.length===12 && new Set(positions).size===12 && Math.min(...positions)===1 && Math.max(...positions)===12;
    if(!valid){alert(`Game ${gi+1}: posisi harus diisi lengkap dari 1 sampai 12 tanpa duplikat.`);return}
    games.push({game:gi+1,saved:true,results});
  }
  const idx=state.matchdays.findIndex(m=>m.id===md);
  const obj={id:md,games};
  if(idx>=0)state.matchdays[idx]=obj;else state.matchdays.push(obj);
  state.matchdays.sort((a,b)=>a.id-b.id);persist();renderAll();alert(`Matchday ${md} berhasil disimpan. 6 game telah dihitung.`);
}
function calcStandings(){
  return state.teams.map(t=>{
    let games=0,booyah=0,kills=0,placement=0;
    state.matchdays.forEach(m=>m.games.forEach(g=>{
      if(!g.saved)return; const r=g.results[t.id];if(!r)return;
      games++;kills+=Number(r.kills)||0;placement+=PLACEMENT[r.placement]||0;if(Number(r.placement)===1)booyah++;
    }));
    return {team:t,games,booyah,kills,placement,total:kills+placement};
  }).sort((a,b)=>b.total-a.total||b.booyah-a.booyah||b.kills-a.kills||b.placement-a.placement);
}
function renderStandings(){
  document.getElementById("standingsBody").innerHTML=calcStandings().map((x,i)=>`<tr><td class="${i<12?'rank-top':''}">${i+1}</td><td><b>${escapeHtml(x.team.name)}</b></td><td>${groupOf(x.team.id)}</td><td>${x.games}</td><td>${x.booyah}</td><td>${x.kills}</td><td>${x.placement}</td><td>${x.total}</td></tr>`).join("");
}
function renderTop5(){
  document.getElementById("top5").innerHTML=calcStandings().slice(0,5).map((x,i)=>`<div class="card top-card"><b>#${i+1}</b><img class="logo" src="${x.team.logo||'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 rx=%2212%22 fill=%22%231a202a%22/%3E%3C/svg%3E'}"><div><b>${escapeHtml(x.team.name)}</b><small class="muted"> • ${x.games} game</small></div><span class="points">${x.total}</span></div>`).join("");
}
function calcMatchdayStandings(md){
  const ts=teamsForMD(md),m=state.matchdays.find(x=>x.id===md);
  return ts.map(t=>{let games=0,booyah=0,kills=0,placement=0;
    (m?.games||[]).forEach(g=>{if(!g.saved)return;const r=g.results[t.id];if(!r)return;
      games++;kills+=Number(r.kills)||0;placement+=PLACEMENT[r.placement]||0;if(Number(r.placement)===1)booyah++;});
    return {team:t,games,booyah,kills,placement,total:kills+placement};
  }).sort((a,b)=>b.total-a.total||b.booyah-a.booyah||b.kills-a.kills||b.placement-a.placement);
}
function renderMatchdayStandings(md){
  const m=state.matchdays.find(x=>x.id===md),savedGames=m?m.games.filter(g=>g.saved).length:0,host=document.getElementById("matchdayStanding");
  if(!host)return;
  if(savedGames===0){host.innerHTML=`<div class="not-ready">Belum ada hasil tersimpan untuk Matchday ${md}.</div>`;return;}
  const rows=calcMatchdayStandings(md);
  host.innerHTML=`<div class="section-title"><div><h3>Klasemen Matchday ${md}</h3><p class="muted">Klasemen khusus ${savedGames}/6 game pada matchday ini.</p></div></div>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>Tim</th><th>Grup</th><th>Game</th><th>Booyah</th><th>Kill</th><th>Placement</th><th>Total</th></tr></thead>
  <tbody>${rows.map((x,i)=>`<tr><td class="${i<3?'rank-top':''}">${i+1}</td><td><b>${escapeHtml(x.team.name)}</b></td><td>${groupOf(x.team.id)}</td><td>${x.games}</td><td>${x.booyah}</td><td>${x.kills}</td><td>${x.placement}</td><td>${x.total}</td></tr>`).join("")}</tbody></table></div>`;
}

function renderHistory(){
  const list=document.getElementById("historyList");
  const saved=[...state.matchdays].sort((a,b)=>b.id-a.id);
  list.innerHTML=saved.length?saved.map(m=>{
    const p=pairFor(m.id),games=m.games.filter(g=>g.saved).length;
    return `<details class="history-card"><summary>Matchday ${m.id} — Minggu ${weekOf(m.id)}, Hari ${dayOf(m.id)} — Grup ${p.join(" + ")} — ${games}/6 game</summary><div class="mini">${m.games.filter(g=>g.saved).map(g=>`Game ${g.game}: ${teamsForMD(m.id).map(t=>{let r=g.results[t.id];return `${escapeHtml(t.name)} ${r.kills}K/${r.placement}P`}).join(" | ")}`).join("<br>")}</div></details>`
  }).join(""):`<div class="not-ready">Belum ada hasil matchday yang tersimpan.</div>`;
}
function renderGrandFinal(){
  const s=calcStandings(),complete=totalGamesSaved()===72;
  document.getElementById("grandFinalList").innerHTML=`<div class="not-ready" style="margin-bottom:15px">${complete?"✅ Regular season selesai. 12 tim teratas lolos.":"⏳ Regular season belum selesai. Daftar di bawah adalah proyeksi 12 besar sementara."}</div>
  <div class="grand-list">${s.slice(0,12).map((x,i)=>`<div class="final-item qualified"><span>#${i+1} ${escapeHtml(x.team.name)}</span><b>${x.total} poin</b></div>`).join("")}</div>`;
}
function exportCSV(){
  const rows=[["Rank","Tim","Grup","Game","Booyah","Kill","Placement Point","Total Point"],...calcStandings().map((x,i)=>[i+1,x.team.name,groupOf(x.team.id),x.games,x.booyah,x.kills,x.placement,x.total])];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download="klasemen_ff_championship.csv";a.click();
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escapeAttr(s){return escapeHtml(s)}
renderAll();