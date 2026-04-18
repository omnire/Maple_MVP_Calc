/**
 * MAPLE OMNI MVP V18 FINAL - 무결점 계산 스크립트
 * [핵심] 목록에 없는 커스텀 아이템 추가 시에도 차액/손익/개당손익 완벽 계산 적용
 * [핵심] 충전 금액 대비 메소 환전량, 잔액 소수점 오차 없는 완전 일치 로직
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
    document.getElementById('serverSelect').value = localStorage.getItem('mapleServer') || '엘리시움';
    document.getElementById('marketPrice').value = localStorage.getItem('mapleMarketPrice') || 1600;
    
    const currentMonth = new Date().toISOString().substring(0, 7);
    document.getElementById('monthFilter').value = currentMonth;
    document.getElementById('invDate').value = new Date().toISOString().substring(0, 10);

    renderPresets(); 
    renderSimTable();
    renderInventoryTable();
    renderRecordTable();
    updateStats(); 
};

// ================= [🌟 유틸리티 함수 (오류 방지 핵심)] =================
// 숫자 변환 시 null이나 빈칸이 들어와도 절대 에러가 나지 않도록 철벽 방어
function parseNum(val) {
    if (val === undefined || val === null || val === '') return 0;
    return parseFloat(val.toString().replace(/,/g, '')) || 0;
}
function removeComma(input) { input.value = input.value.replace(/,/g, ''); }
function formatComma(input) { if(input.value) input.value = parseNum(input.value).toLocaleString(); }
function saveServer() { localStorage.setItem('mapleServer', document.getElementById('serverSelect').value); }
function calculateAll() { localStorage.setItem('mapleMarketPrice', document.getElementById('marketPrice').value); renderSimTable(); renderInventoryTable(); renderRecordTable(); updateStats(); }

// ================= [🌟 프리셋 기능 로직] =================
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
        return;
    }
    const data = getAllPresets().find(p => p.id === selectedValue);
    if(data) {
        document.getElementById(nameId).value = data.name; document.getElementById(amountId).value = data.amount; document.getElementById(cashId).value = data.cash.toLocaleString();
    }
}

// ================= [🌟 대시보드 수학적 일치 로직] =================
function saveCharge() {
    const month = document.getElementById('monthFilter').value || new Date().toISOString().substring(0, 7);
    const chargeInput = document.getElementById('chargeAmount');
    
    let val = parseNum(chargeInput.value);
    monthlyCharges[month] = val;
    localStorage.setItem('mapleMonthlyCharges', JSON.stringify(monthlyCharges));
    localStorage.setItem('mapleChargeAmount', val);
    
    chargeInput.value = val.toLocaleString();
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
    
    // 계산 오차를 없애기 위한 1억 메소 단위 계산식
    const unit = mPrice / 100000000;
    const targetMeso = Math.floor(currentCharge / unit);
    
    let totalUsedCash = 0, totalExchangedMeso = 0, totalReturnCash = 0;
    let soldCash = 0; 

    getFilteredRecords().forEach(item => {
        totalUsedCash += item.cash; 
        soldCash += item.cash;      
        totalExchangedMeso += item.meso;
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

    document.getElementById('targetMeso').innerText = targetMeso.toLocaleString();
    document.getElementById('totalUsedCash').innerText = totalUsedCash.toLocaleString();
    document.getElementById('remainCash').innerText = remainCash.toLocaleString();
    document.getElementById('totalExchangedMeso').innerText = totalExchangedMeso.toLocaleString();
    
    // 목표 메소를 초과하여 달성했을 때의 처리
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

function changeFilter() { renderRecordTable(); renderInventoryTable(); updateStats(); }
function getFilteredRecords() {
    const monthVal = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : '';
    return recordData.filter(item => monthVal ? item.date.startsWith(monthVal) : true);
}

// ================= [1. 시뮬레이션 탭 (계산 정확도 보강)] =================
function addSimItem() {
    const category = document.getElementById('simCategory').value;
    const amount = parseNum(document.getElementById('simAmount').value);
    const cash = parseNum(document.getElementById('simCash').value);
    if(!category || amount <= 0 || cash <= 0) return alert("품목명, 개수, 캐시가를 정확히 입력하세요.");

    simData.push({ id: Date.now(), category, amount, cash, yesterdayMeso: 0, todayMeso: 0 });
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
        refreshSimRow(row, item); 
    }
}

function renderSimTable() {
    const container = document.getElementById('sim-container');
    if(!container) return;
    container.innerHTML = '';
    const groups = simData.reduce((acc, item) => { (acc[item.category] = acc[item.category] || []).push(item); return acc; }, {});

    for (const cat in groups) {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `<div class="category-title">${cat}</div><table><thead><tr><th>구성</th><th>캐시가</th><th>어제 옥션</th><th>오늘 옥션</th><th>차액</th><th>총 손익</th><th>개당 손익</th><th>관리</th></tr></thead><tbody></tbody></table>`;
        const tbody = div.querySelector('tbody');
        groups[cat].forEach(item => {
            const row = document.createElement('tr');
            row.id = `sim-row-${item.id}`;
            tbody.appendChild(row);
            refreshSimRow(row, item);
        });
        container.appendChild(div);
    }
}

function refreshSimRow(row, item) {
    const mPrice = parseNum(document.getElementById('marketPrice').value) || 1600;
    const unit = mPrice / 100000000;
    const diff = item.todayMeso - item.yesterdayMeso;
    
    // 수수료 3% 제외 후 환전 계산
    const returnCash = Math.floor(item.todayMeso * 0.97 * unit);
    const profit = returnCash - item.cash;
    
    // 개당 손익을 무조건 정확하게 계산하여 표기 (1개든 여러 개든 동일)
    const perProfit = item.amount > 0 ? Math.floor(profit / item.amount).toLocaleString() + "원" : "0원";
    
    const pClass = profit < 0 ? 'profit-minus' : 'profit-plus';
    const dClass = diff < 0 ? 'profit-minus' : 'profit-plus';

    row.innerHTML = `
        <td>${item.amount}개</td><td>${item.cash.toLocaleString()}</td>
        <td><input type="text" class="inline-input" value="${item.yesterdayMeso ? item.yesterdayMeso.toLocaleString() : ''}" onfocus="removeComma(this)" onblur="formatComma(this); updateSimPrice(${item.id}, 'yesterdayMeso', this.value)"></td>
        <td><input type="text" class="inline-input" value="${item.todayMeso ? item.todayMeso.toLocaleString() : ''}" onfocus="removeComma(this)" onblur="formatComma(this); updateSimPrice(${item.id}, 'todayMeso', this.value)"></td>
        <td style="font-size:11px;" class="${dClass}">${diff ? diff.toLocaleString() : '-'}</td>
        <td class="${pClass}">${profit ? profit.toLocaleString() : '0'}</td>
        <td style="font-size:12px;">${perProfit}</td>
        <td><button class="del-btn" onclick="delSimItem(${item.id})">✕ 삭제</button></td>
    `;
}
function delSimItem(id) { simData = simData.filter(d => d.id !== id); localStorage.setItem('mapleSimData', JSON.stringify(simData)); renderSimTable(); }

// ================= [2. 구매/재고 관리] =================
function addInvItem() {
    const buyDate = document.getElementById('invDate').value;
    const name = document.getElementById('invCategory').value;
    const amount = parseNum(document.getElementById('invAmount').value);
    const cash = parseNum(document.getElementById('invCash').value);

    if(!name || amount <= 0 || cash <= 0) return alert("구매 정보를 정확히 입력하세요.");

    inventoryData.push({ id: Date.now(), buyDate, name, amount, cash });
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
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.buyDate}</td>
            <td><strong>${item.name}</strong> (${item.amount}개)</td>
            <td>${item.cash.toLocaleString()}</td>
            <td><input type="text" id="inv-meso-${item.id}" class="inline-input" style="border: 1px solid #ccc; background: white;" placeholder="실제 판매된 메소" onfocus="removeComma(this)" onblur="formatComma(this)"></td>
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
    const mesoVal = parseNum(document.getElementById(`inv-meso-${id}`).value);
    if (mesoVal <= 0) return alert("실제 옥션에서 팔린 메소 가격을 입력한 뒤 눌러주세요!");

    recordData.push({ id: Date.now(), date: new Date().toISOString().substring(0, 10), name: item.name, amount: item.amount, meso: mesoVal, cash: item.cash });
    inventoryData = inventoryData.filter(d => d.id !== id);

    localStorage.setItem('mapleInventoryData', JSON.stringify(inventoryData));
    localStorage.setItem('mapleRecordData', JSON.stringify(recordData));
    
    renderInventoryTable(); renderRecordTable(); updateStats();
}

function delInventoryItem(id) { if(confirm("이 구매를 취소할까요? 지출에서 차감됩니다.")) { inventoryData = inventoryData.filter(d => d.id !== id); localStorage.setItem('mapleInventoryData', JSON.stringify(inventoryData)); renderInventoryTable(); updateStats(); } }

// ================= [3. 판매 기록장 (계산 정확도 보강)] =================
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
        
        // 개당 손익 완벽 계산 적용
        const perProfit = item.amount > 0 ? Math.floor(profit / item.amount).toLocaleString() + "원" : "0원";

        const row = document.createElement('tr');
        row.dataset.id = item.id;
        row.innerHTML = `
            <td>${item.date}</td>
            <td><strong>${item.name}</strong> (${item.amount}개)</td>
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
    
    const row = document.querySelector(`tr[data-id="${id}"]`);
    row.innerHTML = `
        <td><input type="date" id="edit-date-${id}" value="${item.date}" class="edit-input"></td>
        <td>
            <input type="text" id="edit-name-${id}" value="${item.name}" class="edit-input" style="margin-bottom:4px;" placeholder="품목명">
            <div style="display:flex; align-items:center; gap:4px;">
                <input type="number" id="edit-amount-${id}" value="${item.amount || 1}" class="edit-input" style="width:60px" placeholder="개수"><span style="font-size:12px;">개</span>
            </div>
        </td>
        <td><input type="text" id="edit-meso-${id}" value="${item.meso.toLocaleString()}" class="edit-input" style="text-align:right;" onfocus="removeComma(this)" onblur="formatComma(this)"></td>
        <td><input type="text" id="edit-cash-${id}" value="${item.cash.toLocaleString()}" class="edit-input" style="text-align:right;" onfocus="removeComma(this)" onblur="formatComma(this)"></td>
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
    item.amount = parseNum(document.getElementById(`edit-amount-${id}`).value) || 1;
    item.meso = parseNum(document.getElementById(`edit-meso-${id}`).value);
    item.cash = parseNum(document.getElementById(`edit-cash-${id}`).value);
    localStorage.setItem('mapleRecordData', JSON.stringify(recordData));
    renderRecordTable(); updateStats();
}

function delRecordItem(id) { recordData = recordData.filter(d => d.id !== id); localStorage.setItem('mapleRecordData', JSON.stringify(recordData)); renderRecordTable(); updateStats(); }

// ================= [기타 공통 함수 및 백업] =================
function switchTab(tabId, event) { document.querySelectorAll('.page-content').forEach(el => el.style.display = 'none'); document.getElementById(tabId).style.display = 'block'; document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); event.currentTarget.classList.add('active'); }

function exportData() {
    const dataToSave = { customPresets, simData, inventoryData, recordData, settings: { server: localStorage.getItem('mapleServer'), marketPrice: localStorage.getItem('mapleMarketPrice'), monthlyCharges: localStorage.getItem('mapleMonthlyCharges') } };
    const blob = new Blob([JSON.stringify(dataToSave)], {type: "application/json"}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `MVP_Backup_${new Date().toISOString().substring(0,10)}.json`; a.click();
}
function importData(event) {
    const file = event.target.files[0]; if(!file) return; const reader = new FileReader();
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
            }
            alert("복구 완료!"); location.reload(); 
        } catch(err) { alert("잘못된 파일입니다."); }
    }; reader.readAsText(file);
}