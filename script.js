let vegPriceData = {};
let menuData = {};
let seasonData = {};

window.onload = async function() {
    try {
        const [menuRes, priceRes, seasonRes] = await Promise.all([
            fetch('menu.json'),
            fetch('vegetable_data.json'),
            fetch('season.json')
        ]);

        menuData = await menuRes.json();
        vegPriceData = await priceRes.json();
        seasonData = await seasonRes.json();
        
        setupMenu(menuData.vegetable);
        renderSeasonal();
        
        console.log("資料同步成功");
    } catch (err) {
        console.error("資料載入失敗:", err);
        document.getElementById('month-label').innerHTML = "❌ 資料庫讀取失敗";
    }
};

function setupMenu(vegList) {
    const select = document.getElementById('vegSelect');
    select.innerHTML = '<option value="">請選擇蔬菜...</option>'; 
    vegList.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
}

function renderSeasonal() {
    const now = new Date();
    const monthStr = String(now.getMonth() + 1).padStart(2, '0'); // 用於 Key: "05"
    const monthNum = now.getMonth() + 1; // 用於顯示: 5
    const date = String(now.getDate()).padStart(2, '0');
    const todayKey = monthStr + date;

    const label = document.getElementById('month-label');
    const content = document.getElementById('seasonal-content');
    
    label.textContent = `🌟 今日 (${monthNum}月) 推薦產季蔬菜：`;
    content.innerHTML = ""; 

    const currentSeasonList = seasonData[monthStr];

    if (currentSeasonList) {
        currentSeasonList.forEach(vegName => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'seasonal-item';
            
            // 建立 Google 搜尋食譜的連結
            const searchQuery = encodeURIComponent(`${vegName} 食譜`);
            const searchUrl = `https://www.google.com/search?q=${searchQuery}`;

            let priceInfo = "<br><span style='font-size:0.8em; color:gray;'>(無行情)</span>";
            
            if (vegPriceData[todayKey]) {
                const priceMatch = vegPriceData[todayKey].find(v => v.name === vegName);
                if (priceMatch) {
                    priceInfo = `
                        <div style="font-size: 0.85em; margin-top: 4px; color: #555;">
                            ${priceMatch.min}~${priceMatch.max} 元<br>
                            均價：<span style="color: #e67e22; font-weight: bold;">${priceMatch.avg}</span>
                        </div>
                    `;
                }
            }
            

            // 修改這裡：將名稱包裝成可點擊的連結，並加上 target="_blank" 開啟新分頁
            itemDiv.innerHTML = `
                <a href="${searchUrl}" target="_blank" class="seasonal-link">
                   <strong class="veg-name">${vegName}</strong>
                ${priceInfo}
                </a>
            `;
            content.appendChild(itemDiv);


            // itemDiv.innerHTML = `<strong>${vegName}</strong>${priceInfo}`;
            // content.appendChild(itemDiv);
        });
    }
}

function queryPrice() {
    const resDiv = document.getElementById('result');
    const selectedVeg = document.getElementById('vegSelect').value;
    
    if (!selectedVeg) {
        resDiv.style.display = 'none';
        return;
    }

    const now = new Date();
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const todayKey = monthStr + date;

    resDiv.style.display = 'block';

    if (vegPriceData[todayKey]) {
        const item = vegPriceData[todayKey].find(v => v.name === selectedVeg);
        if (item) {
            // --- 新增：定義食譜搜尋連結 ---
            const searchQuery = encodeURIComponent(`${item.name} 食譜`);
            const searchUrl = `https://www.google.com/search?q=${searchQuery}`;

            resDiv.innerHTML = `
                <div class="result-card">
                    <strong>今日日期：${todayKey}</strong><br>
                    蔬菜名稱：${item.name}<br>
                    參考價格：${item.min} ~ ${item.max} 元<br>
                    平均價格：<span style="color:red; font-weight:bold;">${item.avg}</span> 元
                    
                    <a href="${searchUrl}" target="_blank" class="recipe-btn">
                        🍳 查看 ${item.name} 食譜
                    </a>
                </div>
            `;
        } else {
            resDiv.innerHTML = `今日查無「${selectedVeg}」行情。`;
        }
    } else {
        resDiv.innerHTML = `查無今日資料 (${todayKey})。`;
    }
}