import { GOOGLE_CLIENT_ID, STORAGE_KEY, BASE_DOMAIN } from "./config.js";

export function initAuth() {
  if (!window.google) return;
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (res) => handleGoogleResponse(res),
    auto_select: false
  });
}

function handleGoogleResponse(res){
  const token = res.credential;
  if(token){
    localStorage.setItem("google_id_token", token);
    const payload = JSON.parse(atob(token.split('.')[1]));
    const user = {
      id: payload.email,
      email: payload.email,
      name: payload.name,
      avatar: payload.picture,
      terms_accepted_at: null // Sunucudan kontrol edilmeli
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    window.location.reload(); // En temizi
  }
}

export async function handleLogin(provider) {
  if(provider === "google"){
    google.accounts.id.prompt(); 
  } else {
    alert("Apple yakında.");
  }
}

export async function acceptTerms() {
  const user = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if(user){
    user.termsAccepted = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    // Backend update isteği buraya eklenebilir
    return true;
  }
  return false;
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("google_id_token");
  location.reload();
}
