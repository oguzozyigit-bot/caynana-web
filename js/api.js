import { BASE_DOMAIN } from "./config.js";

const API_TOKEN_KEY = "caynana_api_token";

export function authHeaders(){
  const apiToken = (localStorage.getItem(API_TOKEN_KEY) || "").trim();
  const google = (localStorage.getItem("google_id_token") || "").trim();

  // Önce backend token, yoksa google token
  const t = apiToken || google;
  return t ? { "Authorization": "Bearer " + t } : {};
}

export async function apiPOST(endpoint, body){
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_DOMAIN}${endpoint.startsWith('/')?'':'/'}${endpoint}`;
  const res = await fetch(url, {
    method:"POST",
    headers:{ "Content-Type":"application/json", ...authHeaders() },
    body: JSON.stringify(body || {})
  });
  return res;
}

export async function apiGET(endpoint){
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_DOMAIN}${endpoint.startsWith('/')?'':'/'}${endpoint}`;
  const res = await fetch(url, { headers:{ ...authHeaders() } });

  // NOT: bazen 401/403 döner; json parse patlamasın
  const txt = await res.text().catch(()=> "");
  try { return JSON.parse(txt || "{}"); } catch { return {}; }
}
