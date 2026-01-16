// --- YENİ FERRARI KART YAPISI (YATAY & KOMPAKT) ---
function renderProducts(products) {
  const container = document.getElementById("chatContainer");

  products.slice(0, 5).forEach((p, index) => { // En fazla 5 ürün
    setTimeout(() => {
      const card = document.createElement("div");
      card.className = "product-card";
      // Animasyon CSS'te var (slideInRight)

      const img = p.image || "https://via.placeholder.com/150";
      const url = p.url || "#";
      const title = p.title || "Ürün";
      const price = p.price || "Fiyat Gör"; 
      const reason = p.reason || "Fiyatına göre iyi.";

      card.innerHTML = `
        <div class="pc-img-wrap">
          <img src="${img}" class="pc-img" onerror="this.src='https://via.placeholder.com/150'">
          <div class="pc-source-badge">Trendyol</div>
        </div>
        <div class="pc-content">
            <div class="pc-title">${escapeHtml(title)}</div>
            
            <div class="pc-reason-tag">
                <i class="fa-solid fa-comment-dots"></i> ${escapeHtml(reason)}
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:end;">
                <div class="pc-price">${escapeHtml(price)}</div>
                <a href="${url}" target="_blank" class="pc-btn-mini">
                    İncele <i class="fa-solid fa-chevron-right" style="font-size:9px;"></i>
                </a>
            </div>
        </div>
      `;

      // Kartı sarmala ve ekle
      const wrap = document.createElement("div");
      wrap.className = "msg-row bot";
      wrap.style.display = "block"; 
      wrap.appendChild(card);

      container.appendChild(wrap);
      container.scrollTo(0, container.scrollHeight);
    }, index * 400); // Daha hızlı akış (400ms)
  });
}
