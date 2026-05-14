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
    content.innerHTML = ""; // 確保每次渲染前清空
    
    const currentSeasonList = seasonData[monthStr];

    if (currentSeasonList) {
        currentSeasonList.forEach(vegName => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'seasonal-item';
            
            const searchQuery = encodeURIComponent(`${vegName} 食譜`);
            const searchUrl = `https://www.google.com/search?q=${searchQuery}`;
            const imgSrc = `img/${vegName}.jpg`;

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
            
            itemDiv.innerHTML = `
                <a href="${searchUrl}" target="_blank" class="seasonal-link" style="width: 100%; box-sizing: border-box;">
                <div class="img-container">
                    <img src="${imgSrc}" alt="${vegName}" onerror="this.src='img/default.jpg'">
                </div>
                <div class="info-container">
                    <strong class="veg-name">${vegName}</strong>
                    ${priceInfo}
                </div>
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
            // 【修正點】：在這裡定義個別查詢所需的圖片路徑
            const imgSrc = `img/${item.name}.jpg`; 
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(item.name + ' 食譜')}`;
            
            resDiv.innerHTML = `
                <div class="result-card query-result-flex">
                    <div class="left-column">
                        <div class="img-container">
                            <img src="${imgSrc}" alt="${item.name}" onerror="this.src='img/default.jpg'">
                        </div>
                        <a href="${searchUrl}" target="_blank" class="recipe-btn">
                            🍳 查看食譜
                        </a>
                    </div>

                    <div class="info-container">
                        <strong>今日日期：${todayKey}</strong><br>
                        蔬菜名稱：<span class="veg-name-highlight">${item.name}</span><br>
                        參考價格：${item.min} ~ ${item.max} 元<br><br>
                        平均價格：<span style="color:red; font-weight:bold; font-size:1.2em;">${item.avg}</span> 元
                    </div>
                </div>
            `;
            chartContainer.style.display = 'block';
            renderChart(selectedVeg);
        } else {
            resDiv.innerHTML = `今日查無「${selectedVeg}」行情。`;
            chartContainer.style.display = 'none';
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
                borderWidth: 1.5,
                pointRadius: 0,
                pointHitRadius: 10,
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