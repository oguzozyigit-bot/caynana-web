/* js/cards.js - HTML KART ÜRETİCİSİ */
import { PLACEHOLDER_IMG } from './config.js';

// Diyet Kartı
export function getDietCardHTML(bmi) {
    return `
    <div class="info-card">
        <div class="info-header"><i class="fa-solid fa-carrot"></i> Caynana Diyet Menüsü</div>
        <b>Sabah:</b> 1 Haşlanmış Yumurta, 2 Ceviz, Bol Yeşillik.<br>
        <b>Öğle:</b> Izgara Köfte (3 adet), Ayran.<br>
        <b>Akşam:</b> Zeytinyağlı Pırasa, Yoğurt.<br><br>
        <i>Endeksin: ${bmi}. Ona göre ye!</i>
    </div>`;
}

// Astro Kartı
export function getAstroCardHTML(sign, dateString) {
    return `
    <div class="astro-card">
        <div class="astro-date"><i class="fa-regular fa-calendar"></i> ${dateString}</div>
        <div class="astro-sign">⭐ ${sign} Burcu</div>
        <div class="astro-text">
            <b>Genel:</b> Bugün enerjin yüksek. Kimseye kulak asma.<br><br>
            <b>Aşk:</b> Kalbin pır pır edebilir.<br><br>
            <b>İş:</b> Harcamalara dikkat.
        </div>
        <div class="astro-badge">Şanslı Renk: Mor</div>
    </div>`;
}

// Ürün Kartı
export function getProductCardHTML(p) {
    return `
    <div class="product-card">
        <div class="pc-source">Trendyol</div>
        <div class="pc-img-wrap"><img src="${p.image || PLACEHOLDER_IMG}" class="pc-img" onerror="this.src='${PLACEHOLDER_IMG}'"></div>
        <div class="pc-content">
            <div class="pc-title">${p.title}</div>
            <div class="pc-info-row"><i class="fa-solid fa-circle-check"></i> ${p.reason || 'İncele'}</div>
            <div class="pc-bottom-row">
                <div class="pc-price">${p.price}</div>
                <a href="${p.url}" target="_blank" class="pc-btn-mini">Git</a>
            </div>
        </div>
    </div>`;
}
