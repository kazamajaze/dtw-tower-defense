(()=>{'use strict';
const SUPABASE_URL='https://dzmdcbsxbwwnsetxsaxm.supabase.co';
const SUPABASE_KEY='sb_publishable_bjhthEmh7gLh5rrrrK3hvw_K3yrUaJ1';
const status=document.querySelector('#auth-status');
const emailInput=document.querySelector('#auth-email');
const passwordInput=document.querySelector('#auth-password');
const registerBtn=document.querySelector('#auth-register');
const loginBtn=document.querySelector('#auth-login');
const logoutBtn=document.querySelector('#auth-logout');
if(!window.supabase||!status||!emailInput||!passwordInput||!registerBtn||!loginBtn||!logoutBtn)return;
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const MIGRATION_KEY='dtwtd_cloud_migrated_v1';
let currentUser=null,saveTimer=null,lastPayload=null,syncingUserId=null,syncedUserId=null,readyUserId=null,currentRole='player';
function setRole(user){currentRole=user?.app_metadata?.role==='admin'?'admin':'player';window.dispatchEvent(new CustomEvent('dtw-role-change',{detail:{role:currentRole,email:user?.email||''}}));}
async function loadSharedContent(){if(!currentUser)return;try{const {data,error}=await client.from('game_content').select('content').eq('id','main').maybeSingle();if(error)throw error;if(data?.content)window.dispatchEvent(new CustomEvent('dtw-shared-content-load',{detail:data.content}));}catch(e){message('Không tải được nội dung chung: '+(e.message||'kiểm tra quyền truy cập'));}}
async function publishSharedContent(content){if(currentRole!=='admin'||!currentUser)throw new Error('Chỉ Admin đã đăng nhập mới được phát hành.');const {error}=await client.from('game_content').upsert({id:'main',content,updated_by:currentUser.id,updated_at:new Date().toISOString()},{onConflict:'id'});if(error)throw error;return true;}
function message(text,ok=false){status.textContent=text;status.style.color=ok?'#67e8b0':'#ff9ab0'}
function showSession(session){const signedIn=!!session,nextUser=session?.user||null;if(currentUser?.id!==nextUser?.id){clearTimeout(saveTimer);lastPayload=null;readyUserId=null;syncedUserId=null}currentUser=nextUser;setRole(nextUser);logoutBtn.hidden=!signedIn;registerBtn.hidden=signedIn;loginBtn.hidden=signedIn;emailInput.hidden=signedIn;passwordInput.hidden=signedIn;message(signedIn?'Đã đăng nhập: '+(session.user.email||'tài khoản'):'Chưa đăng nhập',signedIn);if(signedIn){syncFromCloud();loadSharedContent()}}
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
  syncedUserId=user.id;readyUserId=user.id;
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
async function sendBroadcastMail(title,body,characterId=null){if(currentRole!=='admin'||!currentUser)throw new Error('Admin only.');if(!title.trim()||!body.trim())throw new Error('Enter a title and message.');const {error}=await client.rpc('send_broadcast_mail',{p_title:title.trim(),p_body:body.trim(),p_character_id:characterId});if(error)throw error;return true}
async function claimInboxCharacter(messageId){if(!currentUser)throw new Error('Please sign in first.');const {data,error}=await client.rpc('claim_inbox_character',{p_message_id:messageId});if(error)throw error;return data}
async function redeemCode(code){if(!currentUser)throw new Error('Please sign in first.');const {data,error}=await client.rpc('redeem_game_code',{p_code:String(code||'').trim().toUpperCase()});if(error)throw error;return data}
async function createRedeemCode(code,rewardShards,maxUses){if(currentRole!=='admin'||!currentUser)throw new Error('Admin only.');const normalized=String(code||'').trim().toUpperCase();if(!normalized)throw new Error('Enter a code.');if(!Number.isInteger(rewardShards)||rewardShards<1||!Number.isInteger(maxUses)||maxUses<1)throw new Error('Reward and usage limit must be positive whole numbers.');const {error}=await client.from('redeem_codes').insert({code:normalized,reward_shards:rewardShards,max_uses:maxUses,created_by:currentUser.id});if(error)throw error;return true}
window.DTWCloud={getRole:()=>currentRole,publishSharedContent,listInbox,sendBroadcastMail,claimInboxCharacter,redeemCode,createRedeemCode,save(payload){const userId=currentUser?.id;if(!userId||(!readyUserId&&!syncingUserId))return;lastPayload=payload;if(readyUserId!==userId)return;clearTimeout(saveTimer);saveTimer=setTimeout(flushSave,900)},sync:syncFromCloud,getUser:()=>currentUser};
window.addEventListener('dtw-cloud-save',e=>window.DTWCloud.save(e.detail));
registerBtn.addEventListener('click',async()=>{const email=emailInput.value.trim(),password=passwordInput.value;if(!email||!password){message('Nhập email và mật khẩu trước nhé.');return}if(password.length<6){message('Mật khẩu cần ít nhất 6 ký tự.');return}registerBtn.disabled=true;message('Đang tạo tài khoản...');try{const {data,error}=await client.auth.signUp({email,password});if(error)throw error;if(data.session){showSession(data.session);message('Đăng ký thành công và đã đăng nhập.',true)}else{message('Đã gửi yêu cầu đăng ký. Hãy kiểm tra email để xác nhận tài khoản.',true)}}catch(e){message('Đăng ký thất bại: '+(e.message||'lỗi không xác định'))}finally{registerBtn.disabled=false}});
loginBtn.addEventListener('click',async()=>{const email=emailInput.value.trim(),password=passwordInput.value;if(!email||!password){message('Nhập email và mật khẩu trước nhé.');return}loginBtn.disabled=true;message('Đang đăng nhập...');try{const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;showSession(data.session);message('Đăng nhập thành công.',true)}catch(e){message('Đăng nhập thất bại: '+(e.message||'lỗi không xác định'))}finally{loginBtn.disabled=false}});
logoutBtn.addEventListener('click',async()=>{logoutBtn.disabled=true;try{const {error}=await client.auth.signOut();if(error)throw error;showSession(null);message('Đã đăng xuất.',true)}catch(e){message('Đăng xuất thất bại: '+(e.message||'lỗi không xác định'))}finally{logoutBtn.disabled=false}});
client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){currentUser=null;syncedUserId=null;readyUserId=null;lastPayload=null;clearTimeout(saveTimer);window.dispatchEvent(new CustomEvent('dtw-cloud-reset-player'))}showSession(session)});
client.auth.getSession().then(({data})=>showSession(data.session));
})();