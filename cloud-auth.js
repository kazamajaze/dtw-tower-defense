(()=>{'use strict';
const SUPABASE_URL='https://dzmdcbsxbwwnsetxsaxm.supabase.co';
const SUPABASE_KEY='sb_publishable_bjhthEmh7gLh5rrrrK3hvw_K3yrUaJ1';
const status=document.querySelector('#auth-status');
const emailInput=document.querySelector('#auth-email');
const passwordInput=document.querySelector('#auth-password');
const registerBtn=document.querySelector('#auth-register');
const loginBtn=document.querySelector('#auth-login');
const logoutBtn=document.querySelector('#auth-logout');
if(!window.supabase||!status||!emailInput||!passwordInput||!registerBtn||!loginBtn)return;
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
function message(text,ok=false){status.textContent=text;status.style.color=ok?'#67e8b0':'#ff9ab0'}
function showSession(session){const signedIn=!!session;logoutBtn.hidden=!signedIn;registerBtn.hidden=signedIn;loginBtn.hidden=signedIn;emailInput.hidden=signedIn;passwordInput.hidden=signedIn;message(signedIn?'Đã đăng nhập: '+(session.user.email||'tài khoản'):'Chưa đăng nhập',signedIn)}
registerBtn.addEventListener('click',async()=>{const email=emailInput.value.trim(),password=passwordInput.value;if(!email||!password){message('Nhập email và mật khẩu trước nhé.');return}if(password.length<6){message('Mật khẩu cần ít nhất 6 ký tự.');return}registerBtn.disabled=true;message('Đang tạo tài khoản...');try{const {data,error}=await client.auth.signUp({email,password});if(error)throw error;if(data.session){showSession(data.session);message('Đăng ký thành công và đã đăng nhập.',true)}else{message('Đã gửi yêu cầu đăng ký. Hãy kiểm tra email để xác nhận tài khoản.',true)}}catch(e){message('Đăng ký thất bại: '+(e.message||'lỗi không xác định'))}finally{registerBtn.disabled=false}});
loginBtn.addEventListener('click',async()=>{const email=emailInput.value.trim(),password=passwordInput.value;if(!email||!password){message('Nhập email và mật khẩu trước nhé.');return}loginBtn.disabled=true;message('Đang đăng nhập...');try{const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;showSession(data.session);message('Đăng nhập thành công.',true)}catch(e){message('Đăng nhập thất bại: '+(e.message||'lỗi không xác định'))}finally{loginBtn.disabled=false}});
logoutBtn.addEventListener('click',async()=>{logoutBtn.disabled=true;try{const {error}=await client.auth.signOut();if(error)throw error;showSession(null);message('Đã đăng xuất.',true)}catch(e){message('Đăng xuất thất bại: '+(e.message||'lỗi không xác định'))}finally{logoutBtn.disabled=false}});
client.auth.getSession().then(({data})=>showSession(data.session));
client.auth.onAuthStateChange((_event,session)=>showSession(session));
})();