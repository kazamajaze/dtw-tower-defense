/* DTW music player: spinning CD in the corner.
   - Hub button (center of the disc): play / pause.
   - Clicking the disc itself: opens the playlist with search.
   - Admin accounts can upload a track with a cover image and delete tracks. */
(()=>{'use strict';
const LS_VOL='dtw_music_volume',LS_LAST='dtw_music_last';
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const fmtTime=t=>{if(!isFinite(t)||t<0)t=0;const m=Math.floor(t/60),s=Math.floor(t%60);return m+':'+String(s).padStart(2,'0')};

const ICON_PLAY='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>';
const ICON_PAUSE='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>';
const ICON_PREV='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6v12M18 6.8v10.4a.8.8 0 0 1-1.25.66L9.6 12.66a.8.8 0 0 1 0-1.32l7.15-5.2A.8.8 0 0 1 18 6.8z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_NEXT='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 6v12M6 6.8v10.4a.8.8 0 0 0 1.25.66l7.15-5.2a.8.8 0 0 0 0-1.32L7.25 6.14A.8.8 0 0 0 6 6.8z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_VOL='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M17.8 6.6a7.4 7.4 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

const css=`
#cd-player{position:fixed;z-index:35;right:calc(max(18px,env(safe-area-inset-right,0px)));bottom:calc(max(18px,env(safe-area-inset-bottom,0px)));font-family:var(--f-body,system-ui,sans-serif);color:var(--text,#ece5d3)}
.cd-disc{--sz:84px;position:relative;width:var(--sz);height:var(--sz);border-radius:50%;cursor:pointer;border:0;padding:0;background:none;display:block;filter:drop-shadow(0 10px 22px #000b)}
.cd-disc:focus-visible{outline:2px solid var(--gold2,#f2d488);outline-offset:4px}
.cd-spin{position:absolute;inset:0;border-radius:50%;animation:cdSpin 6s linear infinite;animation-play-state:paused;overflow:hidden;
 background:conic-gradient(from 0deg,#c9d3d6,#e9e2f2,#bfe6e0,#f1e6c4,#d6c9ee,#c2e2ef,#efd8d0,#c9d3d6)}
#cd-player.playing .cd-spin{animation-play-state:running}
.cd-cover{position:absolute;inset:0;border-radius:50%;background-size:cover;background-position:center}
.cd-sheen{position:absolute;inset:0;border-radius:50%;pointer-events:none;
 background:conic-gradient(from 30deg,#fff0 0 8%,#ffffff55 12%,#fff0 18% 48%,#ffffff40 54%,#fff0 60% 100%),
 radial-gradient(circle,#0000 0 31%,#ffffff22 31.5%,#0000 33%,#0000 97%,#ffffff55 98%,#0000 100%);mix-blend-mode:screen}
.cd-ring{position:absolute;inset:0;border-radius:50%;pointer-events:none;box-shadow:inset 0 0 0 1.5px #ffffff30,inset 0 0 0 4px #0000004d}
.cd-hole{position:absolute;left:50%;top:50%;width:38%;height:38%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#0c0f12 0 30%,#d9dfe2 31% 38%,#a9b2b6 39% 100%);box-shadow:0 0 0 1px #0006,inset 0 1px 2px #fff6}
.cd-hub{position:absolute;left:50%;top:50%;width:34px;height:34px;transform:translate(-50%,-50%);border-radius:50%;border:1px solid #f6dc9a;padding:0;display:grid;place-items:center;
 background:linear-gradient(180deg,var(--gold2,#f2d488),var(--gold,#d8a94e));color:var(--goldink,#2a1d07);cursor:pointer;box-shadow:0 2px 8px #0008,0 1px 0 #fff6 inset;z-index:2}
.cd-hub:hover{filter:brightness(1.08);background:linear-gradient(180deg,#f8dea0,#e2b65d)}
.cd-hub svg{width:17px;height:17px}
.cd-label{position:absolute;right:calc(100% + 10px);top:50%;transform:translateY(-50%);white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis;font-size:12px;padding:6px 10px;border-radius:999px;background:#12171bee;border:1px solid var(--line2,#3b4850);color:var(--text,#ece5d3);pointer-events:none;opacity:0;transition:opacity .2s}
#cd-player.playing:not(.open) .cd-label,#cd-player:hover:not(.open) .cd-label{opacity:1}
@keyframes cdSpin{to{transform:rotate(360deg)}}

.cd-panel{position:absolute;right:0;bottom:calc(100% + 12px);width:min(370px,calc(100vw - 32px));max-height:min(620px,calc(100vh - 140px));display:flex;flex-direction:column;
 background:linear-gradient(180deg,#1b2228,#13181c);border:1px solid var(--line2,#3b4850);border-radius:16px;box-shadow:0 26px 70px #000c;overflow:hidden;transform-origin:bottom right;animation:cdPanelIn .18s ease-out}
.cd-panel[hidden]{display:none!important}
@keyframes cdPanelIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
.cd-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 14px 0}
.cd-head h3{margin:0;font-family:var(--f-display,Georgia,serif);font-size:18px;letter-spacing:.01em;text-transform:none;color:var(--text,#ece5d3)}
.cd-x{width:30px;height:30px;padding:0;border-radius:50%;background:transparent;border-color:transparent;color:var(--muted,#98a19a);font-size:16px}
.cd-now{display:grid;grid-template-columns:56px minmax(0,1fr);gap:12px;align-items:center;padding:12px 14px}
.cd-now-art{width:56px;height:56px;border-radius:10px;background:#20292f center/cover no-repeat;border:1px solid var(--line2,#3b4850);display:grid;place-items:center;font-size:22px;color:var(--faint,#6d7670)}
.cd-now b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14.5px}
.cd-now span{display:block;color:var(--muted,#98a19a);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cd-seek{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:0 14px;font-size:11px;color:var(--muted,#98a19a);font-variant-numeric:tabular-nums}
.cd-ctrl{display:flex;align-items:center;gap:6px;padding:8px 14px 12px}
.cd-ctrl button{width:36px;height:36px;padding:0;display:grid;place-items:center;border-radius:50%}
.cd-ctrl button svg{width:17px;height:17px}
.cd-ctrl .cd-main{width:42px;height:42px;background:linear-gradient(180deg,var(--gold2,#f2d488),var(--gold,#d8a94e));border:1px solid #f6dc9a;color:var(--goldink,#2a1d07)}
.cd-vol{margin-left:auto;display:flex;align-items:center;gap:6px;color:var(--muted,#98a19a)}
.cd-vol svg{width:17px;height:17px;flex-shrink:0}
#cd-player input[type=range]{accent-color:var(--gold,#d8a94e);width:100%;min-width:0;height:18px;margin:0}
.cd-vol input[type=range]{width:84px}
.cd-search{padding:0 14px 10px;border-bottom:1px solid var(--line,#2c363d)}
.cd-search input{width:100%;background:#0d1114;color:var(--text,#ece5d3);border:1px solid var(--line2,#3b4850);border-radius:10px;padding:9px 12px 9px 34px;font:inherit;font-size:13.5px;
 background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='6.5' fill='none' stroke='%2398a19a' stroke-width='2'/%3E%3Cpath d='m16 16 4 4' stroke='%2398a19a' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-size:16px;background-position:11px center}
.cd-search input:focus{outline:none;border-color:var(--gold,#d8a94e)}
.cd-scroll{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain}
.cd-list{list-style:none;margin:0;padding:6px;min-height:60px}
.cd-item{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 8px;border-radius:10px;cursor:pointer;border:1px solid transparent}
.cd-item:hover{background:#ffffff08}
.cd-item:focus-visible{outline:2px solid var(--gold2,#f2d488);outline-offset:-2px}
.cd-item.current{background:#d8a94e14;border-color:#d8a94e40}
.cd-thumb{width:40px;height:40px;border-radius:8px;background:#20292f center/cover no-repeat;display:grid;place-items:center;color:var(--faint,#6d7670);font-size:16px;position:relative;overflow:hidden}
.cd-item.current .cd-thumb::after{content:"";position:absolute;inset:0;background:#0008 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='5' y='9' width='3' height='9' rx='1' fill='%23f2d488'/%3E%3Crect x='10.5' y='5' width='3' height='13' rx='1' fill='%23f2d488'/%3E%3Crect x='16' y='11' width='3' height='7' rx='1' fill='%23f2d488'/%3E%3C/svg%3E") center/20px no-repeat}
.cd-item b{display:block;font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cd-item.current b{color:var(--gold2,#f2d488)}
.cd-item span{display:block;font-size:12px;color:var(--muted,#98a19a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cd-del{padding:4px 9px;font-size:11.5px;border-radius:7px;background:transparent;border-color:#7b3a33;color:#ffa79c}
.cd-del.arm{background:#5a2420;color:#fff}
.cd-empty{padding:22px 14px;text-align:center;color:var(--muted,#98a19a);font-size:13px}
.cd-admin{position:relative;border-top:1px solid var(--line,#2c363d);padding:10px 14px 14px;background:#0f1417}
.cd-admin summary{cursor:pointer;font-weight:600;font-size:13px;color:var(--gold2,#f2d488);list-style:none;display:flex;align-items:center;gap:6px}
.cd-admin summary::-webkit-details-marker{display:none}
.cd-admin summary::before{content:"+";display:inline-grid;place-items:center;width:18px;height:18px;border-radius:5px;border:1px solid var(--gold,#d8a94e);font-size:13px;line-height:1}
.cd-admin[open] summary::before{content:"−"}
.cd-form{display:grid;gap:9px;margin-top:10px}
.cd-form .two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cd-form label{display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--muted,#98a19a);font-weight:500;min-width:0}
.cd-form input[type=text]{background:#0d1114;color:var(--text,#ece5d3);border:1px solid var(--line2,#3b4850);border-radius:8px;padding:8px 10px;font:inherit;font-size:13px;min-width:0}
.cd-form input[type=file]{font-size:12px;color:var(--muted,#98a19a);min-width:0;width:100%}
.cd-form input[type=file]::file-selector-button{font:inherit;font-size:12px;border:1px solid var(--line2,#3b4850);background:#232c33;color:var(--text,#ece5d3);border-radius:7px;padding:5px 9px;margin-right:8px;cursor:pointer}
.cd-preview{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted,#98a19a)}
.cd-preview i{width:34px;height:34px;border-radius:7px;background:#20292f center/cover no-repeat;flex-shrink:0;border:1px solid var(--line2,#3b4850)}
.cd-msg{font-size:12.5px;min-height:1.2em;color:var(--muted,#98a19a)}
.cd-msg[data-tone=ok]{color:#9becd0}.cd-msg[data-tone=err]{color:#ffa79c}
body .toast{bottom:calc(max(18px,env(safe-area-inset-bottom,0px)) + 100px)}
@media(max-width:650px){.cd-disc{--sz:66px}.cd-hub{width:28px;height:28px}.cd-hub svg{width:14px;height:14px}.cd-label{display:none}.cd-panel{max-height:calc(100vh - 120px)}body .toast{bottom:calc(max(14px,env(safe-area-inset-bottom,0px)) + 80px)}}
@media(prefers-reduced-motion:reduce){.cd-spin{animation:none}.cd-panel{animation:none}}
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

const root=document.createElement('div');root.id='cd-player';
root.innerHTML=`
<div class="cd-panel" id="cd-panel" role="dialog" aria-label="Danh sách nhạc" hidden>
 <div class="cd-head"><h3>Nhạc nền</h3><button class="cd-x" type="button" id="cd-close" aria-label="Đóng danh sách nhạc">✕</button></div>
 <div class="cd-now"><div class="cd-now-art" id="cd-now-art">♪</div><div style="min-width:0"><b id="cd-now-title">Chưa chọn bài</b><span id="cd-now-artist">Bấm một bài trong danh sách để nghe</span></div></div>
 <div class="cd-seek"><span id="cd-cur">0:00</span><input id="cd-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Tua bài hát"><span id="cd-dur">0:00</span></div>
 <div class="cd-ctrl">
  <button type="button" id="cd-prev" aria-label="Bài trước">${ICON_PREV}</button>
  <button type="button" id="cd-main" class="cd-main" aria-label="Phát">${ICON_PLAY}</button>
  <button type="button" id="cd-next" aria-label="Bài tiếp">${ICON_NEXT}</button>
  <label class="cd-vol" for="cd-volume">${ICON_VOL}<input id="cd-volume" type="range" min="0" max="100" value="60" aria-label="Âm lượng"></label>
 </div>
 <div class="cd-search"><input id="cd-search" type="search" placeholder="Tìm bài hát hoặc ca sĩ…" autocomplete="off" aria-label="Tìm nhạc"></div>
 <div class="cd-scroll">
 <ul class="cd-list" id="cd-list" aria-label="Danh sách bài hát"></ul>
 <details class="cd-admin" id="cd-admin" hidden>
  <summary>Thêm nhạc mới</summary>
  <form class="cd-form" id="cd-form" novalidate>
   <div class="two"><label for="cd-title">Tên bài<input id="cd-title" type="text" maxlength="120" placeholder="Để trống = tên file"></label><label for="cd-artist">Ca sĩ / nguồn<input id="cd-artist" type="text" maxlength="120" placeholder="Tuỳ chọn"></label></div>
   <label for="cd-file">File nhạc (mp3, wav, ogg, m4a · tối đa 20 MB)<input id="cd-file" type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"></label>
   <label for="cd-cover">Hình minh hoạ (tuỳ chọn)<input id="cd-cover" type="file" accept="image/*"></label>
   <div class="cd-preview" id="cd-preview" hidden><i id="cd-preview-img"></i><span>Ảnh này sẽ in lên đĩa CD</span></div>
   <button type="submit" class="primary" id="cd-upload">Tải lên</button>
   <div class="cd-msg" id="cd-msg" role="status" aria-live="polite"></div>
  </form>
 </details>
 </div>
</div>
<button class="cd-disc" id="cd-disc" type="button" aria-label="Mở danh sách nhạc" aria-controls="cd-panel" aria-expanded="false">
 <span class="cd-spin"><span class="cd-cover" id="cd-cover-img"></span><span class="cd-sheen"></span><span class="cd-ring"></span><span class="cd-hole"></span></span>
</button>
<button class="cd-hub" id="cd-hub" type="button" aria-label="Phát nhạc">${ICON_PLAY}</button>
<div class="cd-label" id="cd-label" aria-hidden="true">Nhạc nền</div>`;
document.body.appendChild(root);
const disc=root.querySelector('#cd-disc'),hub=root.querySelector('#cd-hub');

const $=s=>root.querySelector(s);
const panel=$('#cd-panel'),list=$('#cd-list'),search=$('#cd-search'),label=$('#cd-label'),coverImg=$('#cd-cover-img');
const nowArt=$('#cd-now-art'),nowTitle=$('#cd-now-title'),nowArtist=$('#cd-now-artist'),mainBtn=$('#cd-main'),seek=$('#cd-seek'),cur=$('#cd-cur'),dur=$('#cd-dur'),vol=$('#cd-volume');
const adminBox=$('#cd-admin'),form=$('#cd-form'),msg=$('#cd-msg'),fileIn=$('#cd-file'),coverIn=$('#cd-cover'),preview=$('#cd-preview'),previewImg=$('#cd-preview-img'),uploadBtn=$('#cd-upload');

const audio=new Audio();audio.preload='metadata';
let tracks=[],index=-1,isAdmin=false,loaded=false,seeking=false,armedDelete=null;
const v=Number(lsGet(LS_VOL));audio.volume=isFinite(v)&&lsGet(LS_VOL)!==null?Math.min(1,Math.max(0,v)):.6;vol.value=Math.round(audio.volume*100);

function setMsg(t,tone=''){msg.textContent=t;msg.dataset.tone=tone}
function current(){return tracks[index]||null}
function setPlayingUI(){const p=!audio.paused&&!!audio.src;root.classList.toggle('playing',p);
 hub.innerHTML=p?ICON_PAUSE:ICON_PLAY;hub.setAttribute('aria-label',p?'Tạm dừng nhạc':'Phát nhạc');
 mainBtn.innerHTML=p?ICON_PAUSE:ICON_PLAY;mainBtn.setAttribute('aria-label',p?'Tạm dừng':'Phát')}
function setNow(){const t=current();
 const art=t?.coverUrl?`url("${t.coverUrl.replace(/"/g,'%22')}")`:'';
 coverImg.style.backgroundImage=art;nowArt.style.backgroundImage=art;nowArt.textContent=art?'':'♪';
 nowTitle.textContent=t?t.title:'Chưa chọn bài';nowArtist.textContent=t?(t.artist||'Không rõ ca sĩ'):(tracks.length?'Bấm một bài trong danh sách để nghe':'Danh sách đang trống');
 label.textContent=t?('♪ '+t.title):'Nhạc nền';renderList()}
function renderList(){const q=norm(search.value.trim());
 const rows=tracks.map((t,i)=>({t,i})).filter(({t})=>!q||norm(t.title+' '+(t.artist||'')).includes(q));
 if(!loaded){list.innerHTML='<li class="cd-empty">Đang tải danh sách nhạc…</li>';return}
 if(!tracks.length){list.innerHTML=`<li class="cd-empty">${isAdmin?'Chưa có bài nào. Thêm bài đầu tiên ở mục "Thêm nhạc mới" bên dưới.':'Chưa có bài nhạc nào.'}</li>`;return}
 if(!rows.length){list.innerHTML=`<li class="cd-empty">Không tìm thấy bài nào khớp "${esc(search.value.trim())}".</li>`;return}
 list.innerHTML=rows.map(({t,i})=>`<li class="cd-item${i===index?' current':''}" data-i="${i}" tabindex="0" role="button" aria-label="Phát ${esc(t.title)}">
  <span class="cd-thumb"${t.coverUrl?` style="background-image:url('${esc(t.coverUrl)}')"`:''}>${t.coverUrl?'':'♪'}</span>
  <span style="min-width:0"><b>${esc(t.title)}</b><span>${esc(t.artist||'Không rõ ca sĩ')}</span></span>
  ${isAdmin?`<button type="button" class="cd-del${armedDelete===t.id?' arm':''}" data-del="${i}">${armedDelete===t.id?'Xoá?':'Xoá'}</button>`:''}</li>`).join('')}

async function load(keepId){const api=window.DTWCloud?.music;if(!api){return}
 try{tracks=await api.list();loaded=true;
  const want=keepId||current()?.id||lsGet(LS_LAST);const k=tracks.findIndex(t=>t.id===want);
  if(k>=0){index=k}else if(index>=tracks.length){index=-1}
  if(index>=0&&!audio.src&&tracks[index])audio.src=tracks[index].audioUrl;
  setNow()}
 catch(e){loaded=true;list.innerHTML='<li class="cd-empty">Không tải được danh sách nhạc. Kiểm tra mạng rồi mở lại.</li>'}}

async function playIndex(i){if(!tracks.length)return;index=(i+tracks.length)%tracks.length;const t=tracks[index];lsSet(LS_LAST,t.id);
 if(audio.src!==t.audioUrl){audio.src=t.audioUrl;audio.currentTime=0}setNow();
 try{await audio.play()}catch(e){if(e?.name!=='AbortError'){nowArtist.textContent='Không phát được bài này. Thử bài khác.'}}setPlayingUI()}
async function toggle(){if(!audio.src){if(!loaded)await load();if(!tracks.length){openPanel();return}return playIndex(index>=0?index:0)}
 if(audio.paused){try{await audio.play()}catch(e){}}else audio.pause();setPlayingUI()}

function openPanel(){panel.hidden=false;root.classList.add('open');disc.setAttribute('aria-expanded','true');if(!loaded)load();renderList();setTimeout(()=>search.focus({preventScroll:true}),40)}
function closePanel(){panel.hidden=true;root.classList.remove('open');disc.setAttribute('aria-expanded','false');armedDelete=null}

disc.addEventListener('click',()=>panel.hidden?openPanel():closePanel());
hub.addEventListener('click',e=>{e.stopPropagation();toggle()});
$('#cd-close').addEventListener('click',closePanel);
mainBtn.addEventListener('click',toggle);
$('#cd-prev').addEventListener('click',()=>{if(audio.currentTime>4){audio.currentTime=0}else playIndex(index-1)});
$('#cd-next').addEventListener('click',()=>playIndex(index+1));
vol.addEventListener('input',()=>{audio.volume=vol.value/100;lsSet(LS_VOL,String(audio.volume))});
search.addEventListener('input',renderList);
search.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=list.querySelector('.cd-item');if(first)playIndex(Number(first.dataset.i))}});
list.addEventListener('click',async e=>{const del=e.target.closest('[data-del]');
 if(del){e.stopPropagation();const t=tracks[Number(del.dataset.del)];if(!t)return;
  if(armedDelete!==t.id){armedDelete=t.id;renderList();setTimeout(()=>{if(armedDelete===t.id){armedDelete=null;renderList()}},3500);return}
  armedDelete=null;del.disabled=true;del.textContent='…';
  try{const wasCurrent=current()?.id===t.id;if(wasCurrent){audio.pause();audio.removeAttribute('src');audio.load();index=-1}await window.DTWCloud.music.remove(t);await load();setPlayingUI()}catch(err){setMsg('Không xoá được: '+(err.message||'thử lại'),'err');adminBox.open=true;renderList()}return}
 const row=e.target.closest('.cd-item');if(row){const i=Number(row.dataset.i);if(i===index&&audio.src&&!audio.paused){audio.pause();setPlayingUI()}else playIndex(i)}});
list.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('cd-item')){e.preventDefault();playIndex(Number(e.target.dataset.i))}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)closePanel()});
document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!root.contains(e.target))closePanel()});

audio.addEventListener('play',setPlayingUI);audio.addEventListener('pause',setPlayingUI);
audio.addEventListener('ended',()=>{if(tracks.length>0)playIndex(index+1)});
audio.addEventListener('loadedmetadata',()=>{dur.textContent=fmtTime(audio.duration)});
audio.addEventListener('timeupdate',()=>{cur.textContent=fmtTime(audio.currentTime);if(!seeking&&audio.duration)seek.value=Math.round(audio.currentTime/audio.duration*1000)});
audio.addEventListener('error',()=>{if(audio.src){nowArtist.textContent='Không phát được bài này. Thử bài khác.';setPlayingUI()}});
seek.addEventListener('input',()=>{seeking=true;if(audio.duration)cur.textContent=fmtTime(seek.value/1000*audio.duration)});
seek.addEventListener('change',()=>{if(audio.duration)audio.currentTime=seek.value/1000*audio.duration;seeking=false});

coverIn.addEventListener('change',()=>{const f=coverIn.files[0];if(f&&/^image\//.test(f.type)){const u=URL.createObjectURL(f);previewImg.style.backgroundImage=`url("${u}")`;preview.hidden=false}else{preview.hidden=true}});
fileIn.addEventListener('change',()=>{const f=fileIn.files[0];const title=$('#cd-title');if(f&&!title.value.trim())title.placeholder=f.name.replace(/\.[^.]+$/,'')});
form.addEventListener('submit',async e=>{e.preventDefault();const api=window.DTWCloud?.music;if(!api){setMsg('Chưa kết nối được máy chủ.','err');return}
 const audioFile=fileIn.files[0];if(!audioFile){setMsg('Chọn file nhạc trước nhé.','err');return}
 uploadBtn.disabled=true;setMsg('Đang chuẩn bị…');
 try{await api.upload({audio:audioFile,cover:coverIn.files[0]||null,title:$('#cd-title').value,artist:$('#cd-artist').value},t=>setMsg(t));
  setMsg('Đã thêm bài hát. Mọi người chơi đều nghe được.','ok');form.reset();preview.hidden=true;$('#cd-title').placeholder='Để trống = tên file';await load()}
 catch(err){const m=String(err?.message||'');setMsg(/row-level|policy|unauthor|403/i.test(m)?'Tài khoản này không có quyền Admin để thêm nhạc.':/payload too large|exceeded|maximum/i.test(m)?'File quá lớn (tối đa 20 MB).':/mime|not supported/i.test(m)?'Định dạng file không được hỗ trợ.':('Tải lên thất bại: '+(m||'thử lại')),'err')}
 finally{uploadBtn.disabled=false}});

window.addEventListener('dtw-role-change',e=>{isAdmin=e.detail?.role==='admin';adminBox.hidden=!isAdmin;if(!isAdmin)armedDelete=null;renderList()});
window.addEventListener('dtw-music-ready',()=>load());
if(window.DTWCloud?.music)load();
setTimeout(()=>{if(!window.DTWCloud?.music&&!loaded){loaded=true;list.innerHTML='<li class="cd-empty">Không kết nối được kho nhạc.</li>'}},8000);
isAdmin=window.DTWCloud?.getRole?.()==='admin';adminBox.hidden=!isAdmin;
setPlayingUI();
window.DTWMusic={open:openPanel,close:closePanel,toggle,reload:load};
})();
