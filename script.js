let vegPriceData = {};
let menuData = {};
let seasonData = {};
let myChart = null; 

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
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const monthNum = now.getMonth() + 1;
    const date = String(now.getDate()).padStart(2, '0');
    const todayKey = monthStr + date;
    const content = document.getElementById('seasonal-content');
    const label = document.getElementById('month-label');
    
    label.textContent = `🌟 今日 (${now.getMonth() + 1}月) 推薦產季蔬菜：`;
    const currentSeasonList = seasonData[monthStr];

    if (currentSeasonList) {
        currentSeasonList.forEach(vegName => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'seasonal-item';
            
            const searchQuery = encodeURIComponent(`${vegName} 食譜`);
            const searchUrl = `https://www.google.com/search?q=${searchQuery}`;

            let priceInfo = "<br><span style='font-size:0.8em; color:gray;'>(無行情)</span>";
            
            if (vegPriceData[todayKey]) {
                const priceMatch = vegPriceData[todayKey].find(v => v.name === vegName);
                if (priceMatch) {
                    // 這裡恢復你原本附圖中的漂亮排版
                    priceInfo = `
                        <div style="font-size: 0.85em; margin-top: 4px; color: #555;">
                            ${priceMatch.min}~${priceMatch.max} 元<br>
                            均價：<span style="color: #e67e22; font-weight: bold;">${priceMatch.avg}</span>
                        </div>
                    `;
                }
            }
            
            // 保持整塊卡片可點擊，並套用正確的 HTML 結構
            itemDiv.innerHTML = `
                <a href="${searchUrl}" target="_blank" class="seasonal-link">
                   <strong class="veg-name">${vegName}</strong>
                   ${priceInfo}
                </a>
            `;
            content.appendChild(itemDiv);
        });
    }
}

function queryPrice() {
    const resDiv = document.getElementById('result');
    const chartContainer = document.getElementById('chart-container');
    const selectedVeg = document.getElementById('vegSelect').value;
    
    if (!selectedVeg) {
        resDiv.style.display = 'none';
        chartContainer.style.display = 'none';
        if (myChart) myChart.destroy();
        return;
    }

    const now = new Date();
    const todayKey = String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    resDiv.style.display = 'block';

    if (vegPriceData[todayKey]) {
        const item = vegPriceData[todayKey].find(v => v.name === selectedVeg);
        if (item) {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(item.name + ' 食譜')}`;
            resDiv.innerHTML = `
                <div class="result-card">
                    <strong>今日日期：${todayKey}</strong><br>
                    蔬菜名稱：${item.name}<br>
                    參考價格：${item.min} ~ ${item.max} 元<br>
                    平均價格：<span style="color:red; font-weight:bold;">${item.avg}</span> 元
                    <a href="${searchUrl}" target="_blank" class="recipe-btn">🍳 查看食譜</a>
                </div>`;
            chartContainer.style.display = 'block';
            renderChart(selectedVeg);
        }
    }
}

function renderChart(vegName) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    const labels = Object.keys(vegPriceData).sort();
    const prices = labels.map(d => {
        const v = vegPriceData[d].find(x => x.name === vegName);
        return v ? v.avg : null;
    });

    if (myChart) myChart.destroy();

    const now = new Date();
    const todayKey = String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    const todayIndex = labels.indexOf(todayKey);

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${vegName} 趨勢`,
                data: prices,
                borderColor: '#2e7d32',
                borderWidth: 1.5,      // 數字越小線越細 (原本可能是 2 或 3)
                pointRadius: 0,        // 設為 0 即可取消上面的圈圈
                pointHitRadius: 10,    // 雖然看不到圈圈，但滑鼠靠近時還是能觸發提示框
                fill: false,
                spanGaps: true
            }]
        },
        options: {
            plugins: {
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { ticks: { callback: (v, i) => labels[i].endsWith('01') ? labels[i] : '' } }
            }
        },
        plugins: [{
            afterDraw: chart => {
                if (todayIndex === -1) return;
                const {ctx, chartArea: {top, bottom}, scales: {x}} = chart;
                const xPos = x.getPixelForValue(todayIndex);
                ctx.save();
                ctx.beginPath(); ctx.strokeStyle = 'red'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
                ctx.moveTo(xPos, top); ctx.lineTo(xPos, bottom); ctx.stroke();
                ctx.restore();
            }
        }]
    });
}