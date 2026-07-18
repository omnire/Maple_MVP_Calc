/**
 * 메부자 (MAPLE OMNI MVP V18 FINAL) - 정밀 계산 및 가독성 수정본
 * [수정 완료] 1억당 시세 변경(1800원, 1900원 등) 시 경매장 수수료 3%가 차감되는 원리를 초보자도 알기 쉽게 주석 보강
 * [수정 완료] 초보자도 이해하기 쉬운 친절하고 상세한 설명 주석 추가
 */

// 브라우저의 저장소(localStorage)에서 기존 데이터를 불러옵니다. 데이터가 없으면 빈 배열([])을 기본값으로 사용합니다.
let simData = JSON.parse(localStorage.getItem('mapleSimData')) || [];
let inventoryData = JSON.parse(localStorage.getItem('mapleInventoryData')) || []; 
let recordData = JSON.parse(localStorage.getItem('mapleRecordData')) || [];
let monthlyCharges = JSON.parse(localStorage.getItem('mapleMonthlyCharges')) || {};

// 프로그램에 기본적으로 내장되어 있는 자주 쓰는 아이템 목록(프리셋)입니다.
const BASE_PRESETS = [
    { id: "base_royal", name: "메이플 로얄 스타일", amount: 45, cash: 99000 },
    { id: "base_wonder", name: "위습의 원더베리", amount: 11, cash: 54000 },
    { id: "base_pkarma", name: "플래티넘 카르마의 가위 (마일30%)", amount: 1, cash: 4130 }
];

// 사용자가 직접 만들어서 저장한 나만의 프리셋 목록을 불러옵니다.
let customPresets = JSON.parse(localStorage.getItem('mapleCustomPresets')) || [];

// 웹 페이지가 처음 로딩될 때 자동으로 실행되는 초기 설정 함수입니다.
window.onload = function() {
    // 💉 [백신 코드] 과거 프로그램 버전의 오류로 인해 캐시에 NaN(숫자가 아님) 데이터가 들어가 있다면 안전하게 숫자로 치유합니다.
    simData.forEach(d => { d.amount = parseNum(d.amount)||1; d.cash = parseNum(d.cash)||0; });
    inventoryData.forEach(d => { d.amount = parseNum(d.amount)||1; d.setCount = parseNum(d.setCount)||1; d.cash = parseNum(d.cash)||0; });
    recordData.forEach(d => { d.amount = parseNum(d.amount)||1; d.meso = parseNum(d.meso)||0; d.cash = parseNum(d.cash)||0; });
    
    // 치료가 완료된 깨끗한 데이터를 브라우저 저장소에 다시 안전하게 저장합니다.
    localStorage.setItem('mapleSimData', JSON.stringify(simData));
    localStorage.setItem('mapleInventoryData', JSON.stringify(inventoryData));
    localStorage.setItem('mapleRecordData', JSON.stringify(recordData));

    // 이전에 선택했던 서버와 메소 시세를 불러와 화면에 입력해 줍니다. 없으면 기본값인 '엘리시움'과 '1600'을 씁니다.
    document.getElementById('serverSelect').value = localStorage.getItem('mapleServer') || '엘리시움';
    document.getElementById('marketPrice').value = localStorage.getItem('mapleMarketPrice') || 1600;
    
    // 기존에 입력해 둔 보유 메소 잔액이 있다면 세팅해 줍니다.
    if(localStorage.getItem('mapleExistingMeso')) {
        document.getElementById('existingMeso').value = parseNum(localStorage.getItem('mapleExistingMeso')).toLocaleString();
    }
    
    // 달력 필터의 기본값을 오늘 날짜가 속한 '이번 달'로 설정합니다. (예: 2026-05)
    const currentMonth = new Date().toISOString().substring(0, 7);
    document.getElementById('monthFilter').value = currentMonth;
    document.getElementById('invDate').value = new Date().toISOString().substring(0, 10);

    // 저장소에서 데이터를 다 불러왔으니 화면에 표와 통계 그래프들을 예쁘게 그립니다.
    renderPresets(); 
    renderSimTable();
    renderInventoryTable();
    renderRecordTable();
    updateStats(); 
};

// [초기화 버튼] 사용자가 모든 데이터를 지우고 처음부터 다시 시작하고 싶을 때 실행되는 함수입니다.
function resetAllData() {
    if (confirm("⚠️ 경고: 모든 시뮬레이션, 재고, 판매 기록이 완전히 삭제됩니다.")) {
        if (confirm("정말로 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.")) {
            localStorage.clear(); 
            alert("모든 데이터가 초기화되었습니다.");
            location.reload(); // 페이지를 새로고침하여 초기 상태로 만듭니다.
        }
    }
}

// ================= [🌟 유틸리티 기능] =================
// 텍스트나 빈칸, 쉼표(,)가 섞인 문자열이 들어와도 컴퓨터가 계산할 수 있는 순수한 숫자로 변환해 주는 아주 고마운 함수입니다.
function parseNum(val) {
    if (val === undefined || val === null || val === '') return 0;
    return parseFloat(val.toString().replace(/,/g, '')) || 0;
}
function removeComma(input) { input.value = input.value.replace(/,/g, ''); }
function formatComma(input) { if(input.value) input.value = parseNum(input.value).toLocaleString(); }
function saveServer() { localStorage.setItem('mapleServer', document.getElementById('serverSelect').value); }

// 시세 등을 변경했을 때 호출되며, 모든 데이터와 대시보드 통계를 일제히 재계산하여 화면을 새로고침해 줍니다.
function calculateAll() { 
    localStorage.setItem('mapleMarketPrice', document.getElementById('marketPrice').value); 
    renderSimTable(); 
    renderInventoryTable(); 
    renderRecordTable(); 
    updateStats(); 
}

// ================= [🌟 프리셋 기능] =================
// 기본 프리셋과 사용자가 직접 등록한 나만의 프리셋을 하나로 합쳐서 가져오는 함수입니다.
function getAllPresets() { return [...BASE_PRESETS, ...customPresets]; }

// 화면의 드롭다운 선택창들에 프리셋 목록을 채워 넣어주는 함수입니다.
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

// 현재 입력창에 적힌 내용을 나만의 즐겨찾기(프리셋)로 등록해 주는 함수입니다.
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

// 나만의 프리셋 목록에서 원하지 않는 항목을 삭제하는 함수입니다.
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

// 프리셋 드롭다운에서 아이템을 선택하면 입력칸에 자동으로 개수와 금액을 채워주는 함수입니다.
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
// 사용자가 입력한 기존 보유 메소 금액을 브라우저에 실시간 저장하고 통계를 업데이트합니다.
function saveExistingMeso() {
    const val = parseNum(document.getElementById('existingMeso').value);
    localStorage.setItem('mapleExistingMeso', val);
    updateStats(); 
}

// 이번 달 목표 충전 금액을 저장하는 함수입니다.
function saveCharge() {
    const month = document.getElementById('monthFilter').value || new Date().toISOString().substring(0, 7);
    const chargeInput = document.getElementById('chargeAmount');
    
    let val = parseNum(chargeInput.value);
    monthlyCharges[month] = val;
    localStorage.setItem('mapleMonthlyCharges', JSON.stringify(monthlyCharges));
    localStorage.setItem('mapleChargeAmount', val);
    
    updateStats(); 
}

// 메부자의 심장부! 상단 대시보드의 모든 현금 지출, 목표 메소 잔액, 손해액, 손해율을 완벽히 계산하는 통계 함수입니다.
function updateStats() {
    const month = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : new Date().toISOString().substring(0, 7);
    const chargeInput = document.getElementById('chargeAmount');
    
    // 현재 마우스를 올리고 입력 중인 칸이 아니라면 금액 포맷팅을 자동으로 적용해 줍니다.
    if (document.activeElement !== chargeInput) {
        let charge = monthlyCharges[month] !== undefined ? monthlyCharges[month] : (parseNum(localStorage.getItem('mapleChargeAmount')) || 1530000);
        chargeInput.value = charge.toLocaleString();
    }

    const currentCharge = parseNum(chargeInput.value);
    const mPrice = parseNum(document.getElementById('marketPrice').value) || 1600; // 사용자가 상단에 적은 1억당 메소 시세 (예: 1800 또는 1900)
    
    const unit = mPrice / 100000000; // 1메소당 원화 가치로 쪼갠 수치입니다.
    const targetMeso = Math.floor(currentCharge / unit); // 목표 충전 금액 기준 달성해야 하는 목표 메소
    
    let totalUsedCash = 0, totalExchangedMeso = 0, totalReturnCash = 0;
    let soldCash = 0; 

    // 이번 달에 해당하는 판매 완료 기록들을 하나씩 돌며 실시간 누적액을 더합니다.
    getFilteredRecords().forEach(item => {
        totalUsedCash += item.cash; 
        soldCash += item.cash;      
        
        // 옥션 경매장 수수료 3%를 완전히 제외(* 0.97)한 진짜 순수 지갑 유입 메소를 계산합니다.
        let actualMesoEarned = Math.floor(item.meso * 0.97);
        totalExchangedMeso += actualMesoEarned;
        
        // [수수료 반영 현금 환산] 경매장 등록 원가(item.meso)에 수수료 3%를 먼저 뺀 후(* 0.97), 사용자가 지정한 시세(unit)를 곱합니다.
        // 이 공식 덕분에 1억당 1800원을 적든 1900원을 적든, 수수료 3%가 정확하게 차감된 실질 회수 현금이 도출됩니다!
        totalReturnCash += Math.floor(item.meso * 0.97 * unit);
    });

    // 아직 판매 완료되지 않고 인벤토리에 보관 중인 재고 물품들의 구매 원가도 사용 금액에 합산해 줍니다.
    inventoryData.filter(item => item.buyDate.startsWith(month)).forEach(item => {
        totalUsedCash += item.cash; 
    });

    // 남은 현금 및 아직 채워야 할 남은 메소 잔액을 구합니다.
    const remainCash = currentCharge - totalUsedCash;
    const remainMeso = targetMeso - totalExchangedMeso;
    
    // 지출한 캐시 대비 환전된 메소를 시세로 쳤을 때 발생한 정확한 현금 손해액과 손해율입니다.
    const lossAmount = soldCash - totalReturnCash;
    const totalLossRate = soldCash > 0 ? (lossAmount / soldCash * 100).toFixed(2) : 0;

    // 손해 금액의 이득/손해 여부에 따라 색상을 파란색/빨간색으로 알맞게 입혀줍니다.
    const lossElement = document.getElementById('totalLossAmount');
    if (lossAmount > 0) {
        lossElement.innerText = "-" + lossAmount.toLocaleString() + "원";
        lossElement.style.color = "#f04452"; // 손해는 빨간색
    } else if (lossAmount < 0) {
        lossElement.innerText = "+" + Math.abs(lossAmount).toLocaleString() + "원 (이득!)";
        lossElement.style.color = "#3182f6"; // 이득은 파란색
    } else {
        lossElement.innerText = "0원";
        lossElement.style.color = "var(--text-main)";
    }

    // 기존 보유 메소 입력창의 값과 이번 달 순수하게 환전 성공한 메소를 합쳐서 최종 자산을 구합니다.
    const existingMeso = parseNum(document.getElementById('existingMeso').value);
    const totalOwnedMeso = existingMeso + totalExchangedMeso;

    // 대시보드의 각 텍스트 요소에 최종 연산된 결과값들을 콤마와 함께 뿌려줍니다.
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

    // 목표치 대비 몇 %나 도달했는지 계산하여 상단 진행도 바(Progress Bar)의 길이를 조절합니다.
    const percent = targetMeso > 0 ? Math.min((totalExchangedMeso / targetMeso) * 100, 100) : 0;
    const bar = document.getElementById('mesoProgressBar');
    if(bar) bar.style.width = percent + '%';
}

// 상단 왼쪽 달력 필터를 바꿨을 때 모든 시뮬레이션 표, 재고 리스트, 기록장을 연동하여 새로 그리는 함수입니다.
function changeFilter() { 
    renderSimTable(); 
    renderRecordTable(); 
    renderInventoryTable(); 
    updateStats(); 
}

// 현재 화면에 설정된 월(Month)에 일치하는 판매 완료 기록만 정밀하게 걸러내어 반환하는 필터링 도우미 함수입니다.
function getFilteredRecords() {
    const monthVal = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : '';
    return recordData.filter(item => monthVal ? item.date.startsWith(monthVal) : true);
}

// ================= [1. 시뮬레이션 탭] =================
// 사용자가 입력한 시뮬레이션 가상 아이템을 배열에 저장하고 표에 즉시 추가합니다.
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

// 시뮬레이션 표 안의 어제/오늘 옥션 입력칸에 숫자를 적을 때마다 즉각 연산하여 손익 결과를 갱신해 주는 함수입니다.
function updateSimPrice(id, type, value) {
    const item = simData.find(d => d.id === id);
    if(item) {
        item[type] = parseNum(value); 
        localStorage.setItem('mapleSimData', JSON.stringify(simData));
        
        const row = document.querySelector(`#sim-row-${id}`);
        const mPrice = parseNum(document.getElementById('marketPrice').value) || 1600;
        const unit = mPrice / 100000000;
        
        // 오늘 옥션 가액이 적혀있다면 오늘 기준, 비어있다면 어제 기준 가격을 스마트하게 채택합니다.
        const activeMeso = item.todayMeso > 0 ? item.todayMeso : (item.yesterdayMeso || 0);
        
        // [시뮬레이션 수수료 반영] 시뮬레이션 표에서도 입력된 시세(unit)를 곱하기 전 경매장 수수료 3%를 먼저 빼줍니다(* 0.97).
        const returnCash = Math.floor(activeMeso * 0.97 * unit); 
        const profit = returnCash - item.cash;
        const perProfit = item.amount > 0 ? Math.floor(profit / item.amount).toLocaleString() + "원" : "0원";
        
        // 어제 대비 오늘 가격이 올랐는지 내렸는지 차액을 연산하여 부호를 매깁니다.
        const diff = (item.todayMeso && item.yesterdayMeso) ? (item.todayMeso - item.yesterdayMeso) : 0;
        const diffCell = row.querySelector('.diff-cell');
        if (diffCell) {
            if (diff > 0) { diffCell.innerText = "+" + diff.toLocaleString(); diffCell.className = 'diff-cell profit-plus'; }
            else if (diff < 0) { diffCell.innerText = diff.toLocaleString(); diffCell.className = 'diff-cell profit-minus'; }
            else { diffCell.innerText = "-"; diffCell.className = 'diff-cell'; }
        }
        
        // 손익 텍스트의 디자인 클래스(파랑색/빨간색)를 상황에 맞춰 동적으로 부여합니다.
        const pClass = profit < 0 ? 'profit-minus' : 'profit-plus';
        row.querySelector('.profit-cell').innerText = profit.toLocaleString();
        row.querySelector('.profit-cell').className = 'profit-cell ' + pClass;
        row.querySelector('.per-profit-cell').innerText = perProfit;
        row.querySelector('.per-profit-cell').className = 'per-profit-cell ' + pClass;
    }
}

// 시뮬레이션 탭 표의 전체적인 뼈대를 잡고 아이템 개수가 적은 순(1개 -> 10개 -> 45개)으로 줄 세워 화면에 렌더링합니다.
function renderSimTable() {
    const container = document.getElementById('sim-container');
    if(!container) return; 
    container.innerHTML = '';
    
    const currentMonth = document.getElementById('monthFilter').value;
    const filteredSims = simData.filter(item => item.month === currentMonth);

    // 개수(amount)가 오름차순으로 적은 것부터 예쁘게 배치되도록 자동 정렬 메커니즘을 적용했습니다.
    filteredSims.sort((a, b) => a.amount - b.amount);

    // 아이템 카테고리별(예: 메이플 로얄 스타일 그룹, 가위 그룹)로 묶어 표를 분할 빌드합니다.
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
            refreshSimRow(row, item); 
        });
        container.appendChild(div);
    }
}

// 시뮬레이션 테이블 내부의 실제 HTML 행 내부 입력 폼들의 간격과 요소를 깔끔하게 채워 넣는 하위 함수입니다.
function refreshSimRow(row, item) {
    const mPrice = parseNum(document.getElementById('marketPrice').value) || 1600;
    const unit = mPrice / 100000000;
    const activeMeso = item.todayMeso > 0 ? item.todayMeso : (item.yesterdayMeso || 0);
    
    // [렌더링 시 수수료 반영] 표를 처음 그릴 때도 수수료 3%를 제외(* 0.97)한 정확한 알짜배기 현금 회수액을 보여줍니다.
    const returnCash = Math.floor(activeMeso * 0.97 * unit); 
    const profit = returnCash - item.cash;
    const perProfit = item.amount > 0 ? Math.floor(profit / item.amount).toLocaleString() + "원" : "0원";
    const pClass = profit < 0 ? 'profit-minus' : 'profit-plus';
    
    const diff = (item.todayMeso && item.yesterdayMeso) ? (item.todayMeso - item.yesterdayMeso) : 0;
    let diffStr = "-"; 
    let dClass = "";
    if (diff > 0) { diffStr = "+" + diff.toLocaleString(); dClass = 'profit-plus'; }
    else if (diff < 0) { diffStr = diff.toLocaleString(); dClass = 'profit-minus'; }

    // 부모 CSS 최적화가 완벽하게 발동되도록 깔끔하게 인라인 구조를 짜서 반환합니다.
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
// 실제 유저가 구매한 시점의 날짜, 수량, 세트 묶음 개수를 곱해 총액 비용으로 인벤토리 재고 탭에 추가하는 함수입니다.
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

// 보유하고 있는 주식재고 품목 리스트들을 표로 그려 보여줍니다. 묶음 상품의 경우 가독성 좋게 'N개씩 M묶음' 형태로 출력됩니다.
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

// 재고 중에서 원하는 개수 혹은 묶음 수량만큼 부분/전체 선택하여 판매 완료 처리창으로 넘기는 분할 정산 함수입니다.
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

    // 품목 이름 옆에 묶음 정보 꼬리표를 명시해 두어 기록장에서 정밀한 낱개 복합 연산이 가능하도록 명명합니다.
    const recordName = isBundle ? `${item.name} (${uAmt}개 묶음)` : item.name;

    recordData.push({ 
        id: Date.now(), 
        date: new Date().toISOString().substring(0, 10), 
        name: recordName, 
        amount: sellCount, // 판매한 건수(묶음 수)
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
// 최종 확정 판매된 명세 기록 일람표를 그려줍니다.
function renderRecordTable() {
    const tbody = document.getElementById('record-list');
    if(!tbody) return;
    tbody.innerHTML = '';
    const mPrice = parseNum(document.getElementById('marketPrice').value) || 1600;
    const unit = mPrice / 100000000;
    
    let filteredData = getFilteredRecords();

    // 품목 이름을 가나다순으로 깔끔하게 가시 정렬해 줍니다.
    filteredData.sort((a, b) => { if(a.name < b.name) return -1; if(a.name > b.name) return 1; if(a.date < b.date) return -1; if(a.date > b.date) return 1; return 0; });

    filteredData.forEach(item => {
        // [기록장 수수료 3% 차감 로직] 경매장 판매 총액(item.meso)에서 수수료 3%를 제외한 금액을 바탕으로 회수 현금을 산출합니다.
        // 유저분이 1800원이나 1900원을 적었을 때, 순수 수수료를 떼고 남은 알맹이만 정확히 환산해 줍니다.
        const returnCash = Math.floor(item.meso * 0.97 * unit);
        const profit = returnCash - item.cash;
        const pClass = profit < 0 ? 'profit-minus' : 'profit-plus';

        // 어떤 시세(1800원 등)나 묶음 판매 가격을 넣더라도 오차 없이 "진짜 순수 낱개 1개 기준 개당 손익"이 계산되도록 조치했습니다.
        let totalPieces = item.amount;
        const match = item.name.match(/\((\d+)개\s*묶음\)/); // 정규식으로 품목 이름 안의 'N개 묶음' 문자열을 포착합니다.
        if (match) {
            // 예: 45개 묶음을 2건 팔았다면 -> 2 * 45 = 총 90개 낱개 기준으로 손익 분할 연산
            totalPieces = item.amount * parseInt(match[1], 10);
        }
        const perProfit = totalPieces > 0 ? Math.floor(profit / totalPieces).toLocaleString() + "원" : "0원";

        const row = document.createElement('tr');
        row.dataset.id = item.id;
        row.innerHTML = `
            <td>${item.date}</td>
            <td><strong>${item.name}</strong> <span style="color:var(--text-sub); font-size:12px;">(${item.amount}건)</span></td>
            <td style="text-align:right; padding-right:15px;">${item.meso.toLocaleString()}</td>
            <td style="text-align:right; padding-right:15px;">${item.cash.toLocaleString()}</td>
            <td style="text-align:right; padding-right:15px;">${returnCash.toLocaleString()}</td>
            <td class="${pClass}" style="text-align:right; padding-right:15px;">${profit.toLocaleString()}</td>
            <td class="per-profit-cell ${pClass}" style="font-size:12px;">${perProfit}</td>
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

// 판매 기록 내용을 강제로 정정/수정하고 싶을 때 활성화되는 텍스트 인풋 폼 전환 매커니즘 함수입니다.
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

// 수정창에서 작성 완료한 데이터를 연산 규칙에 맞춰 곱해주고 세이브를 완결짓는 마감 함수입니다.
function saveEdit(id) {
    const item = recordData.find(d => d.id === id);
    if(!item) return;
    item.date = document.getElementById(`edit-date-${id}`).value;
    item.name = document.getElementById(`edit-name-${id}`).value;
    
    const newAmount = parseNum(document.getElementById(`edit-amount-${id}`).value) || 1;
    item.amount = newAmount;
    
    // 수정한 건당 단가에 전체 건수 수량을 곱해 총 매출 메소로 승산 보관 처리합니다.
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