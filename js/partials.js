// js/partials.js (FINAL - NO DOM MOVE)
// Amaç: Artık menu/notif index.html içinde var.
// Bu dosya sadece hata üretmesin diye güvenli no-op.

export async function initPartials() {
  try {
    // Eskiden menuMount/notifMount taşıma vardı, kaldırıldı.
    return true;
  } catch (e) {
    console.warn("initPartials hata ama devam:", e);
    return false;
  }
}
