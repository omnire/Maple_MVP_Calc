/**
 * 메부자 (MAPLE OMNI MVP V18 FINAL) - 완벽 수정본
 * [수정 완료] 브라우저 콘솔 NaN(Not a Number) 경고 해결을 위한 자동 복구(백신) 코드 추가
 */

let simData = JSON.parse(localStorage.getItem('mapleSimData')) || [];
let inventoryData = JSON.parse(localStorage.getItem('mapleInventoryData')) || []; 
let recordData = JSON.parse(localStorage.getItem('mapleRecordData')) || [];
let monthlyCharges = JSON.parse(localStorage.getItem('mapleMonthlyCharges')) || {};

const BASE_PRESETS = [
    { id: "base_royal", name: "메이플 로얄 스타일", amount: 45, cash: 99000 },
    { id: "base_wonder", name: "위습의 원더베리", amount: 11, cash: 54000 },
    { id: "base_pkarma", name: "플래티넘 카르마의 가위 (마일30%)", amount: 1, cash: 4130 }
];

let customPresets = JSON.parse(localStorage.getItem('mapleCustomPresets')) || [];

window.onload = function() {
    // 💉 [백신 코드] 과거의 꼬인 데이터(NaN)를 자동으로 고쳐주는 방어 로직
    simData.forEach(d => { d.amount = parseNum(d.amount)||1; d.cash = parseNum(d.cash)||0; });
    inventoryData.forEach(d => { d.amount = parseNum(d.amount)||1; d.setCount = parseNum(d.setCount)||1; d.cash = parseNum(d.cash)||0; });
    recordData.forEach(d => { d.amount = parseNum(d.amount)||1; d.meso = parseNum(d.meso)||0; d.cash = parseNum(d.cash)||0; });
    
    // 치료된 데이터를 다시 캐시에 덮어씌웁니다.
    localStorage.setItem('mapleSimData', JSON.stringify(simData));
    localStorage.setItem('mapleInventoryData', JSON.stringify(inventoryData));
    localStorage.setItem('mapleRecordData', JSON.stringify(recordData));

    document.getElementById('serverSelect').value = localStorage.getItem('mapleServer') || '엘리시움';
    document.getElementById('marketPrice').value = localStorage.getItem('mapleMarketPrice') || 1600;
    
    if(localStorage.getItem('mapleExistingMeso')) {
        document.getElementById('existingMeso').value = parseNum(localStorage.getItem('mapleExistingMeso')).toLocaleString();
    }
    
    const currentMonth = new Date().toISOString().substring(0, 7);
    document.getElementById('monthFilter').value = currentMonth;
    document.getElementById('invDate').value = new Date().toISOString().substring(0, 10);

    renderPresets(); 
    renderSimTable();
    renderInventoryTable();
    renderRecordTable();
    updateStats(); 
};

function resetAllData() {
    if (confirm("⚠️ 경고: 모든 시뮬레이션, 재고, 판매 기록이 완전히 삭제됩니다.")) {
        if (confirm("정말로 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.")) {
            localStorage.clear(); 
            alert("모든 데이터가 초기화되었습니다.");
            location.reload(); 
        }
    }
}

// ================= [🌟 유틸리티 기능] =================
function parseNum(val) {
    if (val === undefined || val === null || val === '') return 0;
    return parseFloat(val.toString().replace(/,/g, '')) || 0;
}
function removeComma(input) { input.value = input.value.replace(/,/g, ''); }
function formatComma(input) { if(input.value) input.value = parseNum(input.value).toLocaleString(); }
function saveServer() { localStorage.setItem('mapleServer', document.getElementById('serverSelect').value); }
function calculateAll() { localStorage.setItem('mapleMarketPrice', document.getElementById('marketPrice').value); renderSimTable(); renderInventoryTable(); renderRecordTable(); updateStats(); }

// ================= [🌟 프리셋 기능] =================
function getAllPresets() { return [...BASE_PRESETS, ...customPresets]; }

function renderPresets() {
    const allPresets = getAllPresets();
    const selects = ['simPreset', 'invPreset'];
    
    selects.forEach(id => {
        const sel = document.getElementById(id);
        if(!sel) return;
        sel.innerHTML = '<option value="">🌟 자주 쓰는 품목 (선택 시 자동입력)</option>';
        
        sel.innerHTML += '<optgroup label="[기본 품목]">';
        BASE_PRESETS.forEach(p => { sel.innerHTML += `<option value="${p.id}">${p.name} (${p.amount}개) - ${p.cash.toLocaleString()}원</option>`; });
        sel.innerHTML += '</optgroup>';

        if (customPresets.length > 0) {
            sel.innerHTML += '<optgroup label="[내가 추가한 품목]">';
            customPresets.forEach(p => { sel.innerHTML += `<option value="${p.id}">${p.name} (${p.amount}개) - ${p.cash.toLocaleString()}원</option>`; });
            sel.innerHTML += '</optgroup>';
        }
        sel.innerHTML += '<option value="custom">✏️ 직접 입력하기 (빈칸)</option>';
    });
}

function saveAsPreset(tabType) {
    let nameId = tabType === 'sim' ? 'simCategory' : 'invCategory';
    let amountId = tabType === 'sim' ? 'simAmount' : 'invAmount';
    let cashId = tabType === 'sim' ? 'simCash' : 'invCash';

    const name = document.getElementById(nameId).value;
    const amount = parseNum(document.getElementById(amountId).value);
    const cash = parseNum(document.getElementById(cashId).value);

    if(!name || amount <= 0 || cash <= 0) return alert("품목명, 개수, 캐시가를 모두 채운 후 [프리셋으로 저장]을 눌러주세요!");

    const newPreset = { id: 'custom_' + Date.now(), name, amount, cash };
    customPresets.push(newPreset);
    localStorage.setItem('mapleCustomPresets', JSON.stringify(customPresets));
    renderPresets();
    document.getElementById(tabType + 'Preset').value = newPreset.id;
    alert(`[${name}]이(가) 나만의 프리셋에 추가되었습니다!`);
}

function deletePreset(tabType) {
    const selId = document.getElementById(tabType + 'Preset').value;
    if(!selId || selId === 'custom') return alert("삭제할 프리셋을 드롭다운에서 선택해주세요.");
    if(selId.startsWith('base_')) return alert("기본 내장된 프리셋은 삭제할 수 없습니다.");
    
    if(confirm("이 프리셋을 삭제하시겠습니까?")) {
        customPresets = customPresets.filter(p => p.id !== selId);
        localStorage.setItem('mapleCustomPresets', JSON.stringify(customPresets));
        renderPresets();
        applyPreset(tabType);
    }
}

function applyPreset(tabType) {
    const selectedValue = document.getElementById(tabType + 'Preset').value;
    let nameId = tabType === 'sim' ? 'simCategory' : 'invCategory';
    let amountId = tabType === 'sim' ? 'simAmount' : 'invAmount';
    let cashId = tabType === 'sim' ? 'simCash' : 'invCash';

    if(!selectedValue || selectedValue === 'custom') {
        document.getElementById(nameId).value = ''; document.getElementById(amountId).value = ''; document.getElementById(cashId).value = '';
        if(tabType === 'inv') document.getElementById('invSetCount').value = '1';
        return;
    }
    const data = getAllPresets().find(p => p.id === selectedValue);
    if(data) {
        document.getElementById(nameId).value = data.name; document.getElementById(amountId).value = data.amount; document.getElementById(cashId).value = data.cash.toLocaleString();
        if(tabType === 'inv') document.getElementById('invSetCount').value = '1'; 
    }
}

// ================= [🌟 대시보드(통계) 계산 로직] =================
function saveExistingMeso() {
    const val = parseNum(document.getElementById('existingMeso').value);
    localStorage.setItem('mapleExistingMeso', val);
    updateStats(); 
}

function saveCharge() {
    const month = document.getElementById('monthFilter').value || new Date().toISOString().substring(0, 7);
    const chargeInput = document.getElementById('chargeAmount');
    
    let val = parseNum(chargeInput.value);
    monthlyCharges[month] = val;
    localStorage.setItem('mapleMonthlyCharges', JSON.stringify(monthlyCharges));
    localStorage.setItem('mapleChargeAmount', val);
    
    updateStats(); 
}

function updateStats() {
    const month = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : new Date().toISOString().substring(0, 7);
    const chargeInput = document.getElementById('chargeAmount');
    
    if (document.activeElement !== chargeInput) {
        let charge = monthlyCharges[month] !== undefined ? monthlyCharges[month] : (parseNum(localStorage.getItem('mapleChargeAmount')) || 1530000);
        chargeInput.value = charge.toLocaleString();
    }

    const currentCharge = parseNum(chargeInput.value);
    const mPrice = parseNum(document.getElementById('marketPrice').value) || 1600;
    
    const unit = mPrice / 100000000;
    const targetMeso = Math.floor(currentCharge / unit);
    
    let totalUsedCash = 0, totalExchangedMeso = 0, totalReturnCash = 0;
    let soldCash = 0; 

    getFilteredRecords().forEach(item => {
        totalUsedCash += item.cash; 
        soldCash += item.cash;      
        
        let actualMesoEarned = Math.floor(item.meso * 0.97);
        totalExchangedMeso += actualMesoEarned;
        
        totalReturnCash += Math.floor(item.meso * 0.97 * unit);
    });

    inventoryData.filter(item => item.buyDate.startsWith(month)).forEach(item => {
        totalUsedCash += item.cash; 
    });

    const remainCash = currentCharge - totalUsedCash;
    const remainMeso = targetMeso - totalExchangedMeso;
    
    const lossAmount = soldCash - totalReturnCash;
    const totalLossRate = soldCash > 0 ? (lossAmount / soldCash * 100).toFixed(2) : 0;

    const lossElement = document.getElementById('totalLossAmount');
    if (lossAmount > 0) {
        lossElement.innerText = "-" + lossAmount.toLocaleString() + "원";
        lossElement.style.color = "#f04452";
    } else if (lossAmount < 0) {
        lossElement.innerText = "+" + Math.abs(lossAmount).toLocaleString() + "원 (이득!)";
        lossElement.style.color = "#3182f6"; 
    } else {
        lossElement.innerText = "0원";
        lossElement.style.color = "var(--text-main)";
    }

    const existingMeso = parseNum(document.getElementById('existingMeso').value);
    const totalOwnedMeso = existingMeso + totalExchangedMeso;

    document.getElementById('targetMeso').innerText = targetMeso.toLocaleString();
    document.getElementById('totalUsedCash').innerText = totalUsedCash.toLocaleString();
    document.getElementById('remainCash').innerText = remainCash.toLocaleString();
    document.getElementById('totalExchangedMeso').innerText = totalExchangedMeso.toLocaleString();
    document.getElementById('totalOwnedMeso').innerText = totalOwnedMeso.toLocaleString();
    
    if (targetMeso <= 0 && totalExchangedMeso === 0) {
        document.getElementById('remainMeso').innerText = "0";
    } else {
        document.getElementById('remainMeso').innerText = remainMeso > 0 ? remainMeso.toLocaleString() : "목표 달성!";
    }

    document.getElementById('totalLossRate').innerText = totalLossRate;

    const percent = targetMeso > 0 ? Math.min((totalExchangedMeso / targetMeso) * 100, 100) : 0;
    const bar = document.getElementById('mesoProgressBar');
    if(bar) bar.style.width = percent + '%';
}

function changeFilter() { 
    renderSimTable(); 
    renderRecordTable(); 
    renderInventoryTable(); 
    updateStats(); 
}

function getFilteredRecords() {
    const monthVal = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : '';
    return recordData.filter(item => monthVal ? item.date.startsWith(monthVal) : true);
}

// ================= [1. 시뮬레이션 탭] =================
function addSimItem() {
    const category = document.getElementById('simCategory').value;
    const amount = parseNum(document.getElementById('simAmount').value);
    const cash = parseNum(document.getElementById('simCash').value);
    const month = document.getElementById('monthFilter').value || new Date().toISOString().substring(0, 7); 

    if(!category || amount <= 0 || cash <= 0) return alert("품목명, 개수, 캐시가를 정확히 입력하세요.");

    simData.push({ id: Date.now(), month: month, category, amount, cash, yesterdayMeso: 0, todayMeso: 0 });
    localStorage.setItem('mapleSimData', JSON.stringify(simData));
    
    document.getElementById('simPreset').value = ''; 
    applyPreset('sim');
    renderSimTable();
}

function updateSimPrice(id, type, value) {
    const item = simData.find(d => d.id === id);
    if(item) {
        item[type] = parseNum(value); 
        localStorage.setItem('mapleSimData', JSON.stringify(simData));
        
        const row = document.querySelector(`#sim-row-${id}`);
        const mPrice = parseNum(document.getElementById('marketPrice').value) || 1600;
        const unit = mPrice / 100000000;
        
        const activeMeso = item.todayMeso > 0 ? item.todayMeso : (item.yesterdayMeso || 0);
        const returnCash = Math.floor(activeMeso * 0.97 * unit);
        const profit = returnCash - item.cash;
        const perProfit = item.amount > 0 ? Math.floor(profit / item.amount).toLocaleString() + "원" : "0원";
        
        const diff = (item.todayMeso && item.yesterdayMeso) ? (item.todayMeso - item.yesterdayMeso) : 0;
        const diffCell = row.querySelector('.diff-cell');
        if (diffCell) {
            if (diff > 0) { diffCell.innerText = "+" + diff.toLocaleString(); diffCell.className = 'diff-cell profit-plus'; }
            else if (diff < 0) { diffCell.innerText = diff.toLocaleString(); diffCell.className = 'diff-cell profit-minus'; }
            else { diffCell.innerText = "-"; diffCell.className = 'diff-cell'; }
        }
        
        const pClass = profit < 0 ? 'profit-minus' : 'profit-plus';
        row.querySelector('.profit-cell').innerText = profit.toLocaleString();
        row.querySelector('.profit-cell').className = 'profit-cell ' + pClass;
        row.querySelector('.per-profit-cell').innerText = perProfit;
        row.querySelector('.per-profit-cell').className = 'per-profit-cell ' + pClass;
    }
}

function renderSimTable() {
    const container = document.getElementById('sim-container');
    if(!container) return; // 안전장치 추가
    container.innerHTML = '';
    
    const currentMonth = document.getElementById('monthFilter').value;
    const filteredSims = simData.filter(item => item.month === currentMonth);

    // 개수(amount)가 적은 순서대로 정렬
    filteredSims.sort((a, b) => a.amount - b.amount);

    const groups = filteredSims.reduce((acc, item) => { 
        (acc[item.category] = acc[item.category] || []).push(item); 
        return acc; 
    }, {});

    for (const cat in groups) {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `<div class="category-title">${cat}</div><table><thead><tr><th>구성</th><th>캐시가</th><th>어제 옥션</th><th>오늘 옥션</th><th>차액</th><th>총 손익</th><th>개당 손익</th><th>관리</th></tr></thead><tbody></tbody></table>`;
        const tbody = div.querySelector('tbody');
        groups[cat].forEach(item => {
            const row = document.createElement('tr');
            row.id = `sim-row-${item.id}`;
            tbody.appendChild(row);
            refreshSimRow(row, item); // 이 함수는 아래에서 따로 정의합니다.
        });
        container.appendChild(div);
    }
}

function refreshSimRow(row, item) {
    const mPrice = parseNum(document.getElementById('marketPrice').value) || 1600;
    const unit = mPrice / 100000000;
    const activeMeso = item.todayMeso > 0 ? item.todayMeso : (item.yesterdayMeso || 0);
    const returnCash = Math.floor(activeMeso * 0.97 * unit); // 수수료 3% 적용
    const profit = returnCash - item.cash;
    const perProfit = item.amount > 0 ? Math.floor(profit / item.amount).toLocaleString() + "원" : "0원";
    const pClass = profit < 0 ? 'profit-minus' : 'profit-plus';
    
    const diff = (item.todayMeso && item.yesterdayMeso) ? (item.todayMeso - item.yesterdayMeso) : 0;
    let diffStr = "-"; 
    let dClass = "";
    if (diff > 0) { diffStr = "+" + diff.toLocaleString(); dClass = 'profit-plus'; }
    else if (diff < 0) { diffStr = diff.toLocaleString(); dClass = 'profit-minus'; }

    // [중요] <td> 내부 구조를 단순화하여 CSS가 잘 먹히도록 수정
    row.innerHTML = `
        <td>${item.amount}개</td>
        <td>${item.cash.toLocaleString()}</td>
        <td><input type="text" class="inline-input" value="${item.yesterdayMeso ? item.yesterdayMeso.toLocaleString() : ''}" 
            oninput="applyRealtimeComma(this); updateSimPrice(${item.id}, 'yesterdayMeso', this.value)"></td>
        <td><input type="text" class="inline-input" value="${item.todayMeso ? item.todayMeso.toLocaleString() : ''}" 
            oninput="applyRealtimeComma(this); updateSimPrice(${item.id}, 'todayMeso', this.value)"></td>
        <td class="diff-cell ${dClass}">${diffStr}</td>
        <td class="profit-cell ${pClass}">${profit.toLocaleString()}</td>
        <td class="per-profit-cell ${pClass}">${perProfit}</td>
        <td><button class="del-btn" onclick="delSimItem(${item.id})">✕</button></td>
    `;
}


function delSimItem(id) { simData = simData.filter(d => d.id !== id); localStorage.setItem('mapleSimData', JSON.stringify(simData)); renderSimTable(); }

// ================= [2. 구매/재고 관리] =================
function addInvItem() {
    const buyDate = document.getElementById('invDate').value;
    const name = document.getElementById('invCategory').value;
    
    const setCount = parseNum(document.getElementById('invSetCount').value) || 1;
    const unitAmount = parseNum(document.getElementById('invAmount').value) || 1;
    const unitCash = parseNum(document.getElementById('invCash').value); 
    
    const totalAmount = unitAmount * setCount;
    const totalCash = unitCash * setCount; 

    if(!name || totalAmount <= 0 || unitCash <= 0) return alert("구매 정보를 정확히 입력하세요.");

    inventoryData.push({ 
        id: Date.now(), 
        buyDate, 
        name, 
        unitAmount: unitAmount, 
        setCount: setCount, 
        amount: totalAmount,
        cash: totalCash,
        unitCash: unitCash 
    });
    localStorage.setItem('mapleInventoryData', JSON.stringify(inventoryData));
    
    document.getElementById('invPreset').value = ''; 
    applyPreset('inv');
    renderInventoryTable(); updateStats(); 
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventory-list');
    if(!tbody) return;
    tbody.innerHTML = '';
    const month = document.getElementById('monthFilter').value;

    inventoryData.filter(item => item.buyDate.startsWith(month)).forEach(item => {
        const uAmt = item.unitAmount || 1;
        const sCnt = item.setCount !== undefined ? item.setCount : item.amount;
        const isBundle = uAmt > 1; 

        const displayName = isBundle 
            ? `<strong>${item.name}</strong><br><span style="font-size:12px; color:var(--text-sub);">${uAmt}개씩 ${sCnt}묶음</span>`
            : `<strong>${item.name}</strong><br><span style="font-size:12px; color:var(--text-sub);">${sCnt}개</span>`;

        const sellUnitLabel = isBundle ? "묶음 판매" : "개 판매";
        const placeholderTxt = isBundle ? "1묶음당 판매 메소" : "1개당 판매 메소";

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.buyDate}</td>
            <td>${displayName}</td>
            <td>${item.cash.toLocaleString()}</td>
            <td>
                <div style="display:flex; align-items:center; justify-content:center; gap:4px; margin-bottom:4px;">
                    <input type="number" id="inv-sell-amount-${item.id}" value="${sCnt}" class="edit-input" style="width:60px; text-align:center;">
                    <span style="font-size: 13px; font-weight: bold; color: var(--navy);">${sellUnitLabel}</span>
                </div>
                <input type="text" id="inv-meso-${item.id}" class="inline-input" style="border: 1px solid #ccc; background: white; width:100%;" placeholder="${placeholderTxt}" oninput="applyRealtimeComma(this)">
            </td>
            <td id="inv-profit-${item.id}" style="color:var(--text-sub); font-size:12px;">판매 완료 시 계산</td>
            <td>
                <div style="display:flex; flex-direction:column; gap:4px; align-items:center;">
                    <button class="action-btn sell-btn" style="padding: 6px; font-size:12px; min-height:auto; width:100%;" onclick="sellItem(${item.id})">✅ 판매 완료</button>
                    <button class="del-btn" onclick="delInventoryItem(${item.id})">취소(환불)</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function sellItem(id) {
    const item = inventoryData.find(d => d.id === id);
    if (!item) return;

    const unitMesoVal = parseNum(document.getElementById(`inv-meso-${id}`).value);
    const sellCount = parseNum(document.getElementById(`inv-sell-amount-${id}`).value); 

    const uAmt = item.unitAmount || 1;
    const sCnt = item.setCount !== undefined ? item.setCount : item.amount;
    const isBundle = uAmt > 1;

    if (sellCount <= 0 || sellCount > sCnt) return alert(`판매 수량을 확인해주세요! (1 ~ ${sCnt}까지만 가능합니다)`);
    if (unitMesoVal <= 0) return alert("실제 옥션에서 팔린 가격을 입력한 뒤 눌러주세요!");

    const totalMesoVal = unitMesoVal * sellCount;
    const soldCash = item.unitCash ? (item.unitCash * sellCount) : Math.round((item.cash / sCnt) * sellCount); 

    const recordName = isBundle ? `${item.name} (${uAmt}개 묶음)` : item.name;

    recordData.push({ 
        id: Date.now(), 
        date: new Date().toISOString().substring(0, 10), 
        name: recordName, 
        amount: sellCount, 
        meso: totalMesoVal, 
        cash: soldCash 
    });

    if (sellCount === sCnt) {
        inventoryData = inventoryData.filter(d => d.id !== id);
    } else {
        item.setCount -= sellCount;
        item.cash -= soldCash;
        item.amount = item.setCount * uAmt; 
    }

    localStorage.setItem('mapleInventoryData', JSON.stringify(inventoryData));
    localStorage.setItem('mapleRecordData', JSON.stringify(recordData));
    
    renderInventoryTable(); renderRecordTable(); updateStats();
}

function delInventoryItem(id) { if(confirm("이 구매를 취소할까요? 지출에서 차감됩니다.")) { inventoryData = inventoryData.filter(d => d.id !== id); localStorage.setItem('mapleInventoryData', JSON.stringify(inventoryData)); renderInventoryTable(); updateStats(); } }

// ================= [3. 판매 기록장] =================
function renderRecordTable() {
    const tbody = document.getElementById('record-list');
    if(!tbody) return;
    tbody.innerHTML = '';
    const mPrice = parseNum(document.getElementById('marketPrice').value) || 1600;
    const unit = mPrice / 100000000;
    
    let filteredData = getFilteredRecords();

    filteredData.sort((a, b) => { if(a.name < b.name) return -1; if(a.name > b.name) return 1; if(a.date < b.date) return -1; if(a.date > b.date) return 1; return 0; });

    filteredData.forEach(item => {
        const returnCash = Math.floor(item.meso * 0.97 * unit);
        const profit = returnCash - item.cash;
        const pClass = profit < 0 ? 'profit-minus' : 'profit-plus';
        const perProfit = item.amount > 0 ? Math.floor(profit / item.amount).toLocaleString() + "원" : "0원";

        const row = document.createElement('tr');
        row.dataset.id = item.id;
        row.innerHTML = `
            <td>${item.date}</td>
            <td><strong>${item.name}</strong> <span style="color:var(--text-sub); font-size:12px;">(${item.amount}건)</span></td>
            <td style="text-align:right; padding-right:15px;">${item.meso.toLocaleString()}</td>
            <td style="text-align:right; padding-right:15px;">${item.cash.toLocaleString()}</td>
            <td style="text-align:right; padding-right:15px;">${returnCash.toLocaleString()}</td>
            <td class="${pClass}" style="text-align:right; padding-right:15px;">${profit.toLocaleString()}</td>
            <td style="font-size:12px;">${perProfit}</td>
            <td>
                <div style="display:flex; gap:4px; flex-direction:column; justify-content:center;">
                    <button class="del-btn" style="background:var(--navy); color:white;" onclick="editRecord(${item.id})">수정</button>
                    <button class="del-btn" onclick="delRecordItem(${item.id})">삭제</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function editRecord(id) {
    const item = recordData.find(d => d.id === id);
    if(!item) return;
    
    const unitMeso = item.amount > 0 ? Math.floor(item.meso / item.amount) : item.meso;
    
    const row = document.querySelector(`tr[data-id="${id}"]`);
    row.innerHTML = `
        <td><input type="date" id="edit-date-${id}" value="${item.date}" class="edit-input"></td>
        <td>
            <input type="text" id="edit-name-${id}" value="${item.name}" class="edit-input" style="margin-bottom:4px;" placeholder="품목명">
            <div style="display:flex; align-items:center; gap:4px;">
                <input type="number" id="edit-amount-${id}" value="${item.amount || 1}" class="edit-input" style="width:60px" placeholder="판매 건수"><span style="font-size:12px;">건</span>
            </div>
        </td>
        <td><input type="text" id="edit-meso-${id}" value="${unitMeso.toLocaleString()}" class="edit-input" style="text-align:right;" placeholder="1건당 판매 메소" oninput="applyRealtimeComma(this)"></td>
        <td><input type="text" id="edit-cash-${id}" value="${item.cash.toLocaleString()}" class="edit-input" style="text-align:right;" placeholder="총 지출 캐시" oninput="applyRealtimeComma(this)"></td>
        <td colspan="2" style="color:var(--text-sub); font-size:12px; line-height:1.4;">저장 시<br>자동 계산됨</td>
        <td>-</td>
        <td>
            <div style="display:flex; flex-direction:column; gap:4px;">
                <button class="action-btn" style="padding: 6px; font-size:12px; min-height:auto;" onclick="saveEdit(${id})">💾 저장</button>
                <button class="del-btn" style="width:100%;" onclick="renderRecordTable()">취소</button>
            </div>
        </td>
    `;
}

function saveEdit(id) {
    const item = recordData.find(d => d.id === id);
    if(!item) return;
    item.date = document.getElementById(`edit-date-${id}`).value;
    item.name = document.getElementById(`edit-name-${id}`).value;
    
    const newAmount = parseNum(document.getElementById(`edit-amount-${id}`).value) || 1;
    item.amount = newAmount;
    
    const newUnitMeso = parseNum(document.getElementById(`edit-meso-${id}`).value);
    item.meso = newUnitMeso * newAmount;
    
    item.cash = parseNum(document.getElementById(`edit-cash-${id}`).value);
    
    localStorage.setItem('mapleRecordData', JSON.stringify(recordData));
    renderRecordTable(); updateStats();
}

function delRecordItem(id) { recordData = recordData.filter(d => d.id !== id); localStorage.setItem('mapleRecordData', JSON.stringify(recordData)); renderRecordTable(); updateStats(); }

// ================= [기타 공통 기능 및 백업/복구] =================
function switchTab(tabId, event) { document.querySelectorAll('.page-content').forEach(el => el.style.display = 'none'); document.getElementById(tabId).style.display = 'block'; document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); event.currentTarget.classList.add('active'); }

function exportData() {
    const dataToSave = { customPresets, simData, inventoryData, recordData, settings: { server: localStorage.getItem('mapleServer'), marketPrice: localStorage.getItem('mapleMarketPrice'), monthlyCharges: localStorage.getItem('mapleMonthlyCharges'), existingMeso: localStorage.getItem('mapleExistingMeso') } };
    const blob = new Blob([JSON.stringify(dataToSave)], {type: "application/json"}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `MVP_Backup_${new Date().toISOString().substring(0,10)}.json`; a.click();
}

function importData(event) {
    const file = event.target.files[0]; 
    if(!file) return; 
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if(data.customPresets) localStorage.setItem('mapleCustomPresets', JSON.stringify(data.customPresets));
            if(data.simData) localStorage.setItem('mapleSimData', JSON.stringify(data.simData));
            if(data.inventoryData) localStorage.setItem('mapleInventoryData', JSON.stringify(data.inventoryData));
            if(data.recordData) localStorage.setItem('mapleRecordData', JSON.stringify(data.recordData));
            if(data.settings) {
                if(data.settings.server) localStorage.setItem('mapleServer', data.settings.server);
                if(data.settings.marketPrice) localStorage.setItem('mapleMarketPrice', data.settings.marketPrice);
                if(data.settings.monthlyCharges) localStorage.setItem('mapleMonthlyCharges', JSON.stringify(data.settings.monthlyCharges));
                if(data.settings.existingMeso) localStorage.setItem('mapleExistingMeso', data.settings.existingMeso);
            }
            alert("💾 성공적으로 복구가 완료되었습니다!"); 
            location.reload(); 
        } catch(err) { 
            alert("❌ 잘못된 형식의 백업 파일입니다."); 
        }
    }; 
    reader.readAsText(file);
}

// 입력창 실시간 콤마(,) 찍어주는 기능
function applyRealtimeComma(obj) {
    let cursorPosition = obj.selectionStart;
    let oldLength = obj.value.length;

    let num = parseNum(obj.value);
    let newV = (num === 0 && obj.value === "") ? "" : num.toLocaleString();
    
    obj.value = newV;

    let newLength = obj.value.length;
    cursorPosition = cursorPosition + (newLength - oldLength);
    obj.setSelectionRange(cursorPosition, cursorPosition);
}