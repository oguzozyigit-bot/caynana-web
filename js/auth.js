import { AUTH_GOOGLE_URL, AUTH_LOGIN_URL, AUTH_REGISTER_URL, GOOGLE_CLIENT_ID } from "./config.js";
import { setToken, apiMe } from "./api.js";

export function bindAuthUI(onPlanChanged){
  const authModal = document.getElementById("authModal");
  const btnLoginTab = document.getElementById("btnLoginTab");
  const btnRegTab = document.getElementById("btnRegTab");
  const authSubmit = document.getElementById("authSubmit");
  const authClose = document.getElementById("authClose");
  const authLogout = document.getElementById("authLogout");
  const authStatus = document.getElementById("authStatus");

  let mode = "login";

  function setTab(m){
    mode = m;
    if(m==="login"){
      btnLoginTab.classList.add("tabActive"); btnRegTab.classList.remove("tabActive");
      authSubmit.textContent = "Giriş Yap";
    } else {
      btnRegTab.classList.add("tabActive"); btnLoginTab.classList.remove("tabActive");
      authSubmit.textContent = "Kayıt Ol";
    }
  }

  btnLoginTab.onclick = ()=> setTab("login");
  btnRegTab.onclick = ()=> setTab("register");
  authClose.onclick = ()=> authModal.style.display = "none";

  authSubmit.onclick = async ()=>{
    const email = (document.getElementById("authEmail").value || "").trim();
    const password = (document.getElementById("authPass").value || "").trim();
    authStatus.textContent = "İşlem yapıyorum…";

    const url = (mode==="register") ? AUTH_REGISTER_URL : AUTH_LOGIN_URL;

    try{
      const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ email, password }) });
      const j = await r.json();
      if(!r.ok) throw new Error(j.detail || "Hata");
      setToken(j.token);
      authStatus.textContent = "Bağlandı ✅";
      const me = await apiMe();
      onPlanChanged(me?.plan || "free");
      setTimeout(()=> authModal.style.display="none", 400);
    }catch(e){
      authStatus.textContent = "Hata: " + (e.message || "Bilinmeyen");
    }
  };

  authLogout.onclick = ()=>{
    setToken("");
    authStatus.textContent = "Çıkış yapıldı ❌";
    onPlanChanged("free");
  };

  // Google button init (retry)
  initGoogleButton((plan)=>{ onPlanChanged(plan); authStatus.textContent="Bağlandı ✅"; authModal.style.display="none"; });
}

export function openAuthModal(){
  document.getElementById("authModal").style.display = "flex";
}

function initGoogleButton(onDone){
  const el = document.getElementById("googleBtn");
  if(!el) return;

  const retry = (n=20)=>{
    if(!(window.google && google.accounts && google.accounts.id)){
      if(n>0) return setTimeout(()=>retry(n-1), 250);
      return;
    }

    el.innerHTML = "";
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (resp)=>{
        try{
          const r = await fetch(AUTH_GOOGLE_URL, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ id_token: resp.credential }) });
          const j = await r.json();
          if(!r.ok) throw new Error(j.detail || "Google giriş hatası");
          setToken(j.token);
          const me = await apiMe();
          onDone(me?.plan || "free");
        }catch(e){
          document.getElementById("authStatus").textContent = "Google Hata: " + (e.message || "");
        }
      }
    });

    google.accounts.id.renderButton(el, { theme:"outline", size:"large", width:320, text:"continue_with", shape:"pill" });
  };

  retry();
}
