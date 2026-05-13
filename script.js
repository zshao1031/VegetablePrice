let vegPriceData = {};
let menuData = {};
let seasonData = {};
let myChart = null; // 用來儲存圖表物件

// 1. 初始化資料載入
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

// 2. 設定下拉選單
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

// 3. 渲染當季推薦區
function renderSeasonal() {
    const now = new Date();
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const monthNum = now.getMonth() + 1;
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

// 4. 執行個別查詢
function queryPrice() {
    const resDiv = document.getElementById('result');
    const chartContainer = document.getElementById('chart-container');
    const selectedVeg = document.getElementById('vegSelect').value;
    
    // 如果沒選蔬菜，隱藏結果與圖表
    if (!selectedVeg) {
        resDiv.style.display = 'none';
        if (chartContainer) chartContainer.style.display = 'none';
        if (myChart) myChart.destroy();
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
            const searchQuery = encodeURIComponent(`${item.name} 食譜`);
            const searchUrl = `https://www.google.com/search?q=${searchQuery}`;

            resDiv.innerHTML = `
                <div class="result-card">
                    <strong>今日日期：${todayKey}</strong><br>
                    蔬菜名稱：${item.name}<br>
                    參考價格：${item.min} ~ ${item.max} 元<br>
                    平均價格：<span style="color:red; font-weight:bold;">${item.avg}</span> 元
                    <a href="${searchUrl}" target="_blank" class="recipe-btn">🍳 查看 ${item.name} 食譜</a>
                </div>
            `;
            
            // 顯示圖表容器並繪圖
            if (chartContainer) {
                chartContainer.style.display = 'block';
                renderChart(selectedVeg);
            }
        } else {
            resDiv.innerHTML = `今日查無「${selectedVeg}」行情。`;
            if (chartContainer) chartContainer.style.display = 'none';
        }
    } else {
        resDiv.innerHTML = `查無今日資料 (${todayKey})。`;
        if (chartContainer) chartContainer.style.display = 'none';
    }
}

// 5. 繪製趨勢圖表
function renderChart(vegName) {
    const canvas = document.getElementById('priceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // 排序日期並提取該蔬菜數據
    const labels = Object.keys(vegPriceData).sort();
    const prices = labels.map(date => {
        const found = vegPriceData[date].find(v => v.name === vegName);
        return found ? found.avg : null;
    });

    // 取得今日索引
    const now = new Date();
    const todayKey = String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    const todayIndex = labels.indexOf(todayKey);

    // 銷毀舊圖表
    if (myChart) {
        myChart.destroy();
    }

    // 建立新圖表
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${vegName} 全年平均價格趨勢`,
                data: prices,
                borderColor: '#2e7d32',
                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                spanGaps: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    ticks: {
                        callback: function(val, index) {
                            // 只顯示每月1號標籤
                            return labels[index].endsWith('01') ? labels[index] : '';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        },
        plugins: [{
            id: 'todayLine',
            afterDraw: (chart) => {
                if (todayIndex !== -1) {
                    const {ctx, chartArea: {top, bottom}, scales: {x}} = chart;
                    const xPos = x.getPixelForValue(todayIndex);
                    ctx.save();
                    ctx.beginPath();
                    ctx.strokeStyle = 'red';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);
                    ctx.moveTo(xPos, top);
                    ctx.lineTo(xPos, bottom);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }]
    });
}