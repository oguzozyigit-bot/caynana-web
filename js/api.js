import { BASE_DOMAIN } from "./config.js";

export function authHeaders(){
  const t = localStorage.getItem("google_id_token") || "";
  return t ? { "Authorization": "Bearer " + t } : {};
}

export async function apiPOST(endpoint, body){
  const res = await fetch(`${BASE_DOMAIN}${endpoint}`, {
    method:"POST",
    headers:{ "Content-Type":"application/json", ...authHeaders() },
    body: JSON.stringify(body)
  });
  return res;
}

export async function apiGET(endpoint){
  const res = await fetch(`${BASE_DOMAIN}${endpoint}`, {
    headers:{ ...authHeaders() }
  });
  return await res.json();
}
