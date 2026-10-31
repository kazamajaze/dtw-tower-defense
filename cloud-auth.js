(()=>{'use strict';
const SUPABASE_URL='https://dzmdcbsxbwwnsetxsaxm.supabase.co';
const SUPABASE_KEY='sb_publishable_bjhthEmh7gLh5rrrrK3hvw_K3yrUaJ1';
const $=s=>document.querySelector(s);
const status=$('#auth-status'),emailInput=$('#auth-email'),passwordInput=$('#auth-password'),registerBtn=$('#auth-register'),loginBtn=$('#auth-login'),logoutBtn=$('#auth-logout');
const forgotBtn=$('#auth-forgot'),authForm=$('#auth-form'),signedBox=$('#auth-signed'),signedEmail=$('#auth-signed-email'),recoverBox=$('#auth-recover'),newPassInput=$('#auth-newpass'),setPassBtn=$('#auth-setpass'),showPass=$('#auth-showpass');
const modal=$('#account-modal'),accountBtn=$('#account-btn'),accountLabel=$('#account-label'),closeBtn=$('#account-close');
if(!status||!emailInput||!passwordInput||!registerBtn||!loginBtn||!logoutBtn||!authForm||!signedBox)return;
let recovering=false;
function openModal(){if(!modal)return;modal.hidden=false;setTimeout(()=>{(authForm.hidden?(recoverBox&&!recoverBox.hidden?newPassInput:logoutBtn):emailInput)?.focus()},30)}
function closeModal(){if(modal&&!recovering)modal.hidden=true}
window.DTWAccount={open:openModal,close:closeModal};
accountBtn?.addEventListener('click',openModal);closeBtn?.addEventListener('click',closeModal);
modal?.addEventListener('click',e=>{if(e.target===modal)closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal&&!modal.hidden)closeModal()});
showPass?.addEventListener('change',()=>{passwordInput.type=showPass.checked?'text':'password'});
function shortName(email){const n=String(email||'').split('@')[0];return n.length>14?n.slice(0,13)+'…':n||'Tài khoản'}
function viErr(e){const raw=String(e?.message||e||'');const code=String(e?.code||e?.error_code||'');const t=raw.toLowerCase();
 if(code==='invalid_credentials'||t.includes('invalid login credentials'))return'Sai email hoặc mật khẩu.';
 if(code==='email_not_confirmed'||t.includes('email not confirmed'))return'Email chưa được xác nhận. Hãy mở thư xác nhận trong hộp thư (kể cả mục Spam).';
 if(code==='user_already_exists'||t.includes('already registered'))return'Email này đã có tài khoản. Hãy bấm Đăng nhập.';
 if(code==='over_email_send_rate_limit'||t.includes('email rate limit'))return'Hệ thống đang gửi quá nhiều email. Hãy thử lại sau khoảng 1 giờ.';
 if(t.includes('for security purposes')){const s=raw.match(/(\d+)\s*sec/);return'Vui lòng đợi '+(s?s[1]+' giây':'một lát')+' rồi thử lại.'}
 if(code==='weak_password'||t.includes('password should be'))return'Mật khẩu quá yếu. Dùng ít nhất 6 ký tự.';
 if(t.includes('unable to validate email')||t.includes('invalid format')||code==='email_address_invalid')return'Email không hợp lệ.';
 if(t.includes('failed to fetch')||t.includes('network'))return'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
 if(t.includes('same_password')||t.includes('should be different'))return'Mật khẩu mới phải khác mật khẩu cũ.';
 return raw||'Có lỗi xảy ra, hãy thử lại.'}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
const redirectTo=location.origin+location.pathname;
if(!window.supabase){message('Không tải được thư viện đăng nhập. Hãy tải lại trang hoặc thử mạng khác.');registerBtn.disabled=true;loginBtn.disabled=true;if(forgotBtn)forgotBtn.disabled=true;window.DTWCloud={getRole:()=>'player',getUser:()=>null,save(){},sync(){}};return;}
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const MIGRATION_KEY='dtwtd_cloud_migrated_v1';
let currentUser=null,saveTimer=null,lastPayload=null,syncingUserId=null,syncedUserId=null,readyUserId=null,currentRole='player';
function setRole(user){currentRole=user?.app_metadata?.role==='admin'?'admin':'player';window.dispatchEvent(new CustomEvent('dtw-role-change',{detail:{role:currentRole,email:user?.email||''}}));}
async function loadSharedContent(){if(!currentUser)return;try{const {data,error}=await client.from('game_content').select('content').eq('id','main').maybeSingle();if(error)throw error;if(data?.content)window.dispatchEvent(new CustomEvent('dtw-shared-content-load',{detail:data.content}));}catch(e){message('Không tải được nội dung chung: '+(e.message||'kiểm tra quyền truy cập'));}}
async function publishSharedContent(content){if(currentRole!=='admin'||!currentUser)throw new Error('Chỉ Admin đã đăng nhập mới được phát hành.');const {error}=await client.from('game_content').upsert({id:'main',content,updated_by:currentUser.id,updated_at:new Date().toISOString()},{onConflict:'id'});if(error)throw error;return true;}
function message(text,ok=false){status.textContent=text;status.dataset.tone=ok?'ok':(text?'err':'');}
function info(text){status.textContent=text;status.dataset.tone='info'}
function showSession(session){const signedIn=!!session,nextUser=session?.user||null;if(currentUser?.id!==nextUser?.id){clearTimeout(saveTimer);lastPayload=null;readyUserId=null;syncedUserId=null}currentUser=nextUser;setRole(nextUser);
 const email=nextUser?.email||'';
 authForm.hidden=signedIn;signedBox.hidden=!signedIn;
 if(signedEmail)signedEmail.textContent=email;
 if(accountBtn){accountBtn.classList.toggle('signed',signedIn);accountLabel.textContent=signedIn?shortName(email):'Đăng nhập';accountBtn.title=signedIn?email:'Đăng nhập để lưu tiến trình lên tài khoản'}
 document.body.dataset.auth=signedIn?'in':'out';
 if(signedIn){message('',true);syncFromCloud();loadSharedContent()}else if(!recovering){message('')}}
async function syncFromCloud(){
 const user=currentUser;if(!user||syncingUserId===user.id||syncedUserId===user.id)return;
 syncingUserId=user.id;
 try{
  const {data,error}=await client.from('player_saves').select('id,user_id,save_data,updated_at').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  if(currentUser?.id!==user.id)return;
  if(data?.save_data&&typeof data.save_data==='object'){
   lastPayload=data.save_data;
   window.dispatchEvent(new CustomEvent('dtw-cloud-load',{detail:{data:data.save_data,updated_at:data.updated_at||null}}));
   message('Đã tải tiến trình của tài khoản.',true);
  }else{
   let migratedFor='';try{migratedFor=localStorage.getItem(MIGRATION_KEY)||''}catch(e){}
   if(migratedFor){
    window.dispatchEvent(new CustomEvent('dtw-cloud-reset-player'));
    await new Promise(resolve=>setTimeout(resolve,30));
   }
   window.dispatchEvent(new CustomEvent('dtw-cloud-request-local'));
   await new Promise(resolve=>setTimeout(resolve,80));
   if(currentUser?.id!==user.id)return;
   if(lastPayload)await writeSave(lastPayload,user.id);
   try{localStorage.setItem(MIGRATION_KEY,user.id)}catch(e){}
   message(migratedFor?'Đã tạo dữ liệu riêng mới cho tài khoản này.':'Đã chuyển tiến trình trên thiết bị vào tài khoản đầu tiên.',true);
  }
  syncedUserId=user.id;readyUserId=user.id;window.dispatchEvent(new CustomEvent('dtw-cloud-synced'));
 }catch(e){message('Chưa đồng bộ được dữ liệu: '+(e.message||'hãy kiểm tra quyền lưu'))}
 finally{if(syncingUserId===user.id)syncingUserId=null}
}
async function writeSave(payload,userId=currentUser?.id){
 if(!userId||!payload||currentUser?.id!==userId)return;
 const {error}=await client.from('player_saves').upsert({user_id:userId,save_data:payload,updated_at:new Date().toISOString()},{onConflict:'user_id'});
 if(error)throw error;
}
async function flushSave(){
 const userId=currentUser?.id,payload=lastPayload;if(!userId||readyUserId!==userId||!payload)return;
 try{await writeSave(payload,userId);message('Đã lưu tiến trình lên tài khoản.',true)}
 catch(e){message('Lưu trực tuyến chưa thành công: '+(e.message||'hãy thử lại'))}
}
async function listInbox(){if(!currentUser)throw new Error('Please sign in first.');const {data,error}=await client.from('inbox_messages').select('id,title,body,created_at,reward_character_id,inbox_message_claims(user_id)').eq('recipient_id',currentUser.id).order('created_at',{ascending:false});if(error)throw error;return (data||[]).map(m=>({...m,claimed:(m.inbox_message_claims||[]).some(c=>c.user_id===currentUser.id)}))}
async function sendBroadcastMail(title,body,characterId=null){if(currentRole!=='admin'||!currentUser)throw new Error('Admin only.');if(!title.trim()||!body.trim())throw new Error('Enter a title and message.');if(characterId){const {data:published,error:contentError}=await client.from('game_content').select('content').eq('id','main').maybeSingle();if(contentError)throw contentError;const publishedCharacters=published?.content?.characters;if(!Array.isArray(publishedCharacters)||!publishedCharacters.some(c=>String(c.id)===String(characterId)))throw new Error('Publish this character in shared game content before sending it as a gift.');}const {error}=await client.rpc('send_broadcast_mail',{p_title:title.trim(),p_body:body.trim(),p_character_id:characterId});if(error)throw error;return true}
async function claimInboxCharacter(messageId){if(!currentUser)throw new Error('Please sign in first.');const {data,error}=await client.rpc('claim_inbox_character',{p_message_id:messageId});if(error)throw error;return data}
async function redeemCode(code){if(!currentUser)throw new Error('Please sign in first.');const {data,error}=await client.rpc('redeem_game_code',{p_code:String(code||'').trim().toUpperCase()});if(error)throw error;return data}
async function createRedeemCode(code,rewardShards,maxUses){if(currentRole!=='admin'||!currentUser)throw new Error('Admin only.');const normalized=String(code||'').trim().toUpperCase();if(!normalized)throw new Error('Enter a code.');if(!Number.isInteger(rewardShards)||rewardShards<1||!Number.isInteger(maxUses)||maxUses<1)throw new Error('Reward and usage limit must be positive whole numbers.');const {error}=await client.from('redeem_codes').insert({code:normalized,reward_shards:rewardShards,max_uses:maxUses,created_by:currentUser.id});if(error)throw error;return true}
window.DTWCloud={getRole:()=>currentRole,publishSharedContent,listInbox,sendBroadcastMail,claimInboxCharacter,redeemCode,createRedeemCode,save(payload){const userId=currentUser?.id;if(!userId||(!readyUserId&&!syncingUserId))return;lastPayload=payload;if(readyUserId!==userId)return;clearTimeout(saveTimer);saveTimer=setTimeout(flushSave,900)},sync:syncFromCloud,getUser:()=>currentUser};
window.addEventListener('dtw-cloud-save',e=>window.DTWCloud.save(e.detail));
const MUSIC_BUCKET='music';
function musicUrl(path){return path?client.storage.from(MUSIC_BUCKET).getPublicUrl(path).data.publicUrl:null}
function extOf(file,fallback){const m=/\.([a-z0-9]{1,5})$/i.exec(file?.name||'');return (m?m[1]:fallback).toLowerCase()}
function uid(){return (crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2))}
window.DTWCloud.music={
 async list(){const {data,error}=await client.from('music_tracks').select('id,title,artist,audio_path,cover_path,sort_order,created_at').order('sort_order',{ascending:true}).order('created_at',{ascending:true});if(error)throw error;return (data||[]).map(t=>({...t,audioUrl:musicUrl(t.audio_path),coverUrl:musicUrl(t.cover_path)}))},
 async upload({audio,cover,title,artist},onStep){if(currentRole!=='admin'||!currentUser)throw new Error('Chỉ Admin mới được thêm nhạc.');if(!audio)throw new Error('Chọn file nhạc trước nhé.');if(!/^audio\//.test(audio.type||'')&&!/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(audio.name))throw new Error('File nhạc không hợp lệ (dùng mp3, wav, ogg, m4a…).');if(audio.size>20*1024*1024)throw new Error('File nhạc tối đa 20 MB.');if(cover&&!/^image\//.test(cover.type||''))throw new Error('Ảnh minh hoạ phải là file ảnh.');if(cover&&cover.size>20*1024*1024)throw new Error('Ảnh tối đa 20 MB.');
  const id=uid(),audioPath='tracks/'+id+'.'+extOf(audio,'mp3');let coverPath=null;const uploaded=[];
  try{onStep?.('Đang tải nhạc lên…');{const {error}=await client.storage.from(MUSIC_BUCKET).upload(audioPath,audio,{contentType:audio.type||'audio/mpeg',upsert:false});if(error)throw error;uploaded.push(audioPath)}
   if(cover){onStep?.('Đang tải ảnh lên…');coverPath='covers/'+id+'.'+extOf(cover,'jpg');const {error}=await client.storage.from(MUSIC_BUCKET).upload(coverPath,cover,{contentType:cover.type,upsert:false});if(error)throw error;uploaded.push(coverPath)}
   onStep?.('Đang lưu bài hát…');const name=String(title||'').trim()||audio.name.replace(/\.[^.]+$/,'');const {error}=await client.from('music_tracks').insert({title:name.slice(0,120),artist:String(artist||'').trim().slice(0,120)||null,audio_path:audioPath,cover_path:coverPath,sort_order:Date.now()%2147483647});if(error)throw error;return true}
  catch(e){if(uploaded.length)await client.storage.from(MUSIC_BUCKET).remove(uploaded).catch(()=>{});throw e}},
 async remove(track){if(currentRole!=='admin'||!currentUser)throw new Error('Chỉ Admin mới được xoá nhạc.');const {error}=await client.from('music_tracks').delete().eq('id',track.id);if(error)throw error;const paths=[track.audio_path,track.cover_path].filter(Boolean);if(paths.length)await client.storage.from(MUSIC_BUCKET).remove(paths).catch(()=>{});return true}
};
window.dispatchEvent(new CustomEvent('dtw-music-ready'));
window.DTWCloud.uploadImage=async(blob,folder='misc')=>{if(currentRole!=='admin'||!currentUser)throw new Error('Chỉ Admin mới tải ảnh lên server.');const type=blob.type||'image/webp';const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[type]||'webp';const path=String(folder).replace(/[^a-z0-9_-]/gi,'')+'/'+uid()+'.'+ext;const {error}=await client.storage.from('game-assets').upload(path,blob,{contentType:type,upsert:false,cacheControl:'31536000'});if(error)throw error;return client.storage.from('game-assets').getPublicUrl(path).data.publicUrl};

function readForm(needPass=true){const email=emailInput.value.trim(),password=passwordInput.value;if(!email){message('Nhập email trước nhé.');emailInput.focus();return null}if(!validEmail(email)){message('Email không hợp lệ.');emailInput.focus();return null}if(needPass&&!password){message('Nhập mật khẩu trước nhé.');passwordInput.focus();return null}return{email,password}}
function busy(btn,on,label){btn.disabled=on;if(on){btn.dataset.label=btn.textContent;btn.textContent=label}else if(btn.dataset.label){btn.textContent=btn.dataset.label}}
async function doLogin(){const f=readForm();if(!f)return;busy(loginBtn,true,'Đang vào…');info('Đang đăng nhập…');try{const {data,error}=await client.auth.signInWithPassword(f);if(error)throw error;passwordInput.value='';showSession(data.session);message('Đăng nhập thành công.',true);setTimeout(closeModal,600)}catch(e){message(viErr(e))}finally{busy(loginBtn,false)}}
async function doRegister(){const f=readForm();if(!f)return;if(f.password.length<6){message('Mật khẩu cần ít nhất 6 ký tự.');return}busy(registerBtn,true,'Đang tạo…');info('Đang tạo tài khoản…');try{const {data,error}=await client.auth.signUp({...f,options:{emailRedirectTo:redirectTo}});if(error)throw error;if(data.user&&Array.isArray(data.user.identities)&&data.user.identities.length===0){message('Email này đã có tài khoản. Hãy bấm Đăng nhập.');return}if(data.session){passwordInput.value='';showSession(data.session);message('Đăng ký thành công. Chào mừng đến Tam Giới!',true);setTimeout(closeModal,800)}else{message('Đã tạo tài khoản. Mở email xác nhận (xem cả mục Spam) rồi quay lại đăng nhập.',true)}}catch(e){message(viErr(e))}finally{busy(registerBtn,false)}}
async function doForgot(){const f=readForm(false);if(!f)return;busy(forgotBtn,true,'Đang gửi…');try{const {error}=await client.auth.resetPasswordForEmail(f.email,{redirectTo});if(error)throw error;message('Đã gửi link đặt lại mật khẩu tới '+f.email+'. Mở link đó trên máy này.',true)}catch(e){message(viErr(e))}finally{busy(forgotBtn,false)}}
async function doSetPass(){const p=newPassInput?.value||'';if(p.length<6){message('Mật khẩu mới cần ít nhất 6 ký tự.');return}busy(setPassBtn,true,'Đang lưu…');try{const {error}=await client.auth.updateUser({password:p});if(error)throw error;newPassInput.value='';recovering=false;if(recoverBox)recoverBox.hidden=true;message('Đã đổi mật khẩu. Bạn đang đăng nhập.',true);try{history.replaceState(null,'',redirectTo)}catch(e){}}catch(e){message(viErr(e))}finally{busy(setPassBtn,false)}}
loginBtn.addEventListener('click',doLogin);registerBtn.addEventListener('click',doRegister);forgotBtn?.addEventListener('click',doForgot);setPassBtn?.addEventListener('click',doSetPass);
authForm.addEventListener('submit',e=>{e.preventDefault();doLogin()});
newPassInput?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();doSetPass()}});
logoutBtn.addEventListener('click',async()=>{logoutBtn.disabled=true;try{const {error}=await client.auth.signOut();if(error&&!/session/i.test(error.message||''))throw error;showSession(null);message('Đã đăng xuất.',true)}catch(e){showSession(null);message('Đã đăng xuất trên máy này.',true)}finally{logoutBtn.disabled=false}});
client.auth.onAuthStateChange((event,session)=>{
 if(event==='PASSWORD_RECOVERY'){recovering=true;showSession(session);if(recoverBox)recoverBox.hidden=false;openModal();message('Nhập mật khẩu mới cho tài khoản.',true);return}
 if(event==='SIGNED_OUT'){currentUser=null;syncedUserId=null;readyUserId=null;lastPayload=null;clearTimeout(saveTimer);window.dispatchEvent(new CustomEvent('dtw-cloud-reset-player'))}
 if(event==='TOKEN_REFRESHED'&&currentUser?.id===session?.user?.id)return;
 showSession(session)});
client.auth.getSession().then(({data,error})=>{if(error)message(viErr(error));showSession(data?.session||null)});
const hashErr=new URLSearchParams(location.hash.slice(1)).get('error_description');if(hashErr){openModal();message(/expired|invalid/i.test(hashErr)?'Link trong email đã hết hạn hoặc đã dùng. Hãy gửi lại.':hashErr)}
})();
