// --- Начальные данные ---
let orders = [];
let priceList = [
    { id: 'p1', name: 'Замена камеры', price: 500 },
    { id: 'p2', name: 'Настройка переключателей', price: 700 },
    { id: 'p3', name: 'Замена тормозных колодок', price: 600 },
    { id: 'p4', name: 'Смазка цепи', price: 300 },
    { id: 'p5', name: 'Ремонт колеса', price: 900 }
];

// Загрузка из localStorage
function loadData() {
    const storedOrders = localStorage.getItem('bike_orders');
    const storedPrices = localStorage.getItem('bike_prices');
    if (storedOrders) orders = JSON.parse(storedOrders);
    if (storedPrices) priceList = JSON.parse(storedPrices);
}
function saveOrders() { localStorage.setItem('bike_orders', JSON.stringify(orders)); }
function savePrices() { localStorage.setItem('bike_prices', JSON.stringify(priceList)); }

// --- Вспомогательные функции ---
function generateId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 6); }

// --- Состояние приложения ---
let currentSection = 'orders';
let currentFilter = 'active';
let statsMode = 'today';
let customStart = '', customEnd = '';
let drawerOpen = false;
let isModalOpen = false;

const appRoot = document.getElementById('app');

function toggleDrawer(open) { drawerOpen = open; render(); }
function setSection(section) { currentSection = section; toggleDrawer(false); render(); }

function openCreateModal() { 
    isModalOpen = true;
    renderModal(null);
}

function openEditModal(order) { 
    isModalOpen = true;
    renderModal(order);
}

function closeModal() { 
    isModalOpen = false;
    const modal = document.getElementById('orderModal');
    if(modal) modal.remove();
    render();
}

function render() {
    if (currentSection === 'orders') renderOrdersScreen();
    else if (currentSection === 'price') renderPriceScreen();
    else if (currentSection === 'stats') renderStatsScreen();
}

// --- ЭКРАН ЗАКАЗОВ ---
function renderOrdersScreen() {
    let filteredOrders = [...orders];
    if (currentFilter === 'active') filteredOrders = orders.filter(o => !o.closed);
    else if (currentFilter === 'closed') filteredOrders = orders.filter(o => o.closed);
    
    filteredOrders.sort((a,b) => b.createdAt - a.createdAt);
    
    let html = `
        <div class="content">
            <div class="filter-tabs">
                <button class="filter-btn ${currentFilter === 'active' ? 'active' : ''}" data-filter="active">Активные</button>
                <button class="filter-btn ${currentFilter === 'closed' ? 'active' : ''}" data-filter="closed">Закрытые</button>
                <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">Все</button>
            </div>
            <div id="ordersList"></div>
        </div>
    `;
    
    appRoot.innerHTML = `
        <div class="app">
            <div class="header">
                <div class="header-left">
                    <button class="menu-btn" id="menuButton">☰</button>
                    <h1>🚲 Велоремонт</h1>
                </div>
                <button class="create-order-btn" id="createOrderMainBtn">➕ Создать заказ</button>
            </div>
            ${drawerOverlay()}
            ${html}
        </div>
    `;
    
    attachDrawerEvents();
    attachFilterEvents();
    
    document.getElementById('createOrderMainBtn')?.addEventListener('click', openCreateModal);
    
    const ordersContainer = document.getElementById('ordersList');
    if(ordersContainer) {
        if(filteredOrders.length === 0) {
            ordersContainer.innerHTML = '<div style="text-align:center; padding:2rem; color:#64748b;">Нет заказов. Нажмите "Создать заказ"</div>';
        } else {
            ordersContainer.innerHTML = filteredOrders.map(order => `
                <div class="order-card ${order.closed ? 'closed' : ''}">
                    <div class="order-header">
                        <span class="order-customer">${escapeHtml(order.fio)}</span>
                        <span class="order-status ${order.closed ? 'closed' : ''}">${order.closed ? '✅ Закрыт' : '🔧 Активен'}</span>
                    </div>
                    <div class="order-info">
                        📞 ${order.phone || '—'} &nbsp; 📍 ${order.address || '—'} &nbsp; 
                        ⏱ ${order.deadline ? new Date(order.deadline).toLocaleString() : 'не указано'}
                    </div>
                    <div class="services-list">
                        🛠 Услуги: ${order.services.map(s => `${s.name} x${s.quantity} = ${s.price*s.quantity}₽`).join(', ') || '—'}
                    </div>
                    <div class="parts-list">
                        🔩 Запчасти: ${order.parts.map(p => `${p.name} x${p.quantity} = ${p.price*p.quantity}₽`).join(', ') || '—'}
                    </div>
                    <div class="order-total">💰 Итого: ${order.total} ₽</div>
                    <div class="order-actions">
                        <button class="btn-sm" data-edit="${order.id}">✏️ Редактировать</button>
                        ${!order.closed ? `<button class="btn-sm" data-close="${order.id}">✅ Закрыть</button>` : `<button class="btn-sm" data-open="${order.id}">🔄 Открыть снова</button>`}
                        <button class="btn-sm" data-delete="${order.id}">🗑 Удалить</button>
                    </div>
                </div>
            `).join('');
            
            document.querySelectorAll('[data-edit]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const order = orders.find(o => o.id === btn.dataset.edit);
                    if(order) openEditModal(order);
                });
            });
            
            document.querySelectorAll('[data-close]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const order = orders.find(o => o.id === btn.dataset.close);
                    if(order) { order.closed = true; saveOrders(); renderOrdersScreen(); }
                });
            });
            
            document.querySelectorAll('[data-open]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const order = orders.find(o => o.id === btn.dataset.open);
                    if(order) { order.closed = false; saveOrders(); renderOrdersScreen(); }
                });
            });
            
            document.querySelectorAll('[data-delete]').forEach(btn => {
                btn.addEventListener('click', () => {
                    if(confirm('Удалить заказ?')) { 
                        orders = orders.filter(o => o.id !== btn.dataset.delete); 
                        saveOrders(); 
                        renderOrdersScreen(); 
                    }
                });
            });
        }
    }
}

// --- Модальное окно создания/редактирования ---
function renderModal(editOrder) {
    // Удаляем существующий модал
    const existingModal = document.getElementById('orderModal');
    if(existingModal) {
        existingModal.remove();
    }
    
    const isEdit = editOrder !== null;
    const orderData = editOrder || {
        fio: '', phone: '', address: '', deadline: '',
        services: [], parts: []
    };
    
    let serviceItems = orderData.services.map(s => ({ serviceId: s.id, quantity: s.quantity }));
    if(serviceItems.length === 0) serviceItems = [{ serviceId: '', quantity: 1 }];
    
    let partItems = orderData.parts.map(p => ({ name: p.name, price: p.price, quantity: p.quantity }));
    if(partItems.length === 0) partItems = [{ name: '', price: 0, quantity: 1 }];
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'orderModal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${isEdit ? '✏️ Редактирование заказа' : '➕ Новый заказ'}</h3>
                <button class="modal-close" id="closeModalBtn">&times;</button>
            </div>
            <div class="form-group">
                <label>ФИО *</label>
                <input type="text" id="orderFio" value="${escapeHtml(orderData.fio)}" placeholder="Иванов Иван">
            </div>
            <div class="form-group">
                <label>Телефон (необяз.)</label>
                <input type="text" id="orderPhone" value="${escapeHtml(orderData.phone)}" placeholder="+7 999 123-45-67">
            </div>
            <div class="form-group">
                <label>Адрес (необяз.)</label>
                <input type="text" id="orderAddress" value="${escapeHtml(orderData.address)}" placeholder="г. Москва, ул. Примерная 1">
            </div>
            <div class="form-group">
                <label>Услуги</label>
                <div id="servicesContainer"></div>
                <button type="button" class="add-button" id="addServiceBtn">+ Добавить услугу</button>
            </div>
            <div class="form-group">
                <label>Запчасти</label>
                <div id="partsContainer"></div>
                <button type="button" class="add-button" id="addPartBtn">+ Добавить запчасть</button>
            </div>
            <div class="form-group">
                <label>Время ремонта</label>
                <input type="datetime-local" id="orderDeadline" value="${orderData.deadline || ''}">
            </div>
            <button class="btn-primary" id="saveOrderBtn" style="width:100%; padding:0.75rem;">${isEdit ? '💾 Сохранить изменения' : '✅ Создать заказ'}</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    let currentServiceItems = [...serviceItems];
    let currentPartItems = [...partItems];
    
    function renderServiceForm() {
        const container = document.getElementById('servicesContainer');
        if(!container) return;
        container.innerHTML = currentServiceItems.map((item, idx) => `
            <div class="service-row" data-svidx="${idx}">
                <select class="price-select" data-svidx="${idx}">
                    <option value="">--Выберите услугу--</option>
                    ${priceList.map(p => `<option value="${p.id}" ${item.serviceId === p.id ? 'selected' : ''}>${escapeHtml(p.name)} - ${p.price}₽</option>`).join('')}
                </select>
                <input type="number" class="qty-input" data-qidx="${idx}" value="${item.quantity}" min="1" style="width:70px">
                <button class="btn-sm" data-remove-s="${idx}">❌</button>
            </div>
        `).join('');
        
        document.querySelectorAll('.price-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                let idx = parseInt(e.target.dataset.svidx);
                currentServiceItems[idx].serviceId = e.target.value;
            });
        });
        document.querySelectorAll('.qty-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                let idx = parseInt(e.target.dataset.qidx);
                currentServiceItems[idx].quantity = parseInt(e.target.value) || 1;
            });
        });
        document.querySelectorAll('[data-remove-s]').forEach(btn => {
            btn.addEventListener('click', () => {
                let idx = parseInt(btn.dataset.removeS);
                currentServiceItems.splice(idx,1);
                renderServiceForm();
            });
        });
    }
    
    function renderPartForm() {
        const container = document.getElementById('partsContainer');
        if(!container) return;
        container.innerHTML = currentPartItems.map((item, idx) => `
            <div class="part-row" data-pidx="${idx}">
                <input placeholder="Название запчасти" value="${escapeHtml(item.name)}" data-pname="${idx}" style="flex:2">
                <input type="number" placeholder="Цена" value="${item.price}" data-pprice="${idx}" style="width:90px">
                <input type="number" placeholder="Кол-во" value="${item.quantity}" data-pqty="${idx}" style="width:80px">
                <button class="btn-sm" data-remove-p="${idx}">❌</button>
            </div>
        `).join('');
        
        document.querySelectorAll('[data-pname]').forEach(inp => {
            inp.addEventListener('change', (e) => {
                let idx = parseInt(inp.dataset.pname);
                currentPartItems[idx].name = inp.value;
            });
        });
        document.querySelectorAll('[data-pprice]').forEach(inp => {
            inp.addEventListener('change', (e) => {
                let idx = parseInt(inp.dataset.pprice);
                currentPartItems[idx].price = parseInt(inp.value) || 0;
            });
        });
        document.querySelectorAll('[data-pqty]').forEach(inp => {
            inp.addEventListener('change', (e) => {
                let idx = parseInt(inp.dataset.pqty);
                currentPartItems[idx].quantity = parseInt(inp.value) || 1;
            });
        });
        document.querySelectorAll('[data-remove-p]').forEach(btn => {
            btn.addEventListener('click', () => {
                let idx = parseInt(btn.dataset.removeP);
                currentPartItems.splice(idx,1);
                renderPartForm();
            });
        });
    }
    
    renderServiceForm();
    renderPartForm();
    
    document.getElementById('addServiceBtn')?.addEventListener('click', () => {
        currentServiceItems.push({ serviceId: '', quantity: 1 });
        renderServiceForm();
    });
    
    document.getElementById('addPartBtn')?.addEventListener('click', () => {
        currentPartItems.push({ name: '', price: 0, quantity: 1 });
        renderPartForm();
    });
    
    // Функция сохранения
    const saveOrder = () => {
        const fio = document.getElementById('orderFio').value.trim();
        if(!fio) { alert('Введите ФИО'); return; }
        const phone = document.getElementById('orderPhone').value;
        const address = document.getElementById('orderAddress').value;
        const deadline = document.getElementById('orderDeadline').value;
        
        const selectedServices = currentServiceItems.filter(s => s.serviceId).map(s => {
            const svc = priceList.find(p => p.id === s.serviceId);
            return { id: s.serviceId, name: svc?.name || '', price: svc?.price || 0, quantity: s.quantity };
        });
        const parts = currentPartItems.filter(p => p.name.trim() !== '' && p.price > 0).map(p => ({ ...p }));
        const total = [...selectedServices.map(s => s.price * s.quantity), ...parts.map(p => p.price * p.quantity)].reduce((a,b)=>a+b,0);
        
        if(isEdit) {
            const index = orders.findIndex(o => o.id === editOrder.id);
            if(index !== -1) {
                orders[index] = {
                    ...orders[index],
                    fio, phone, address, deadline,
                    services: selectedServices,
                    parts: parts,
                    total: total
                };
                saveOrders();
            }
        } else {
            const newOrder = {
                id: generateId(),
                fio, phone, address, deadline,
                services: selectedServices,
                parts: parts,
                total: total,
                closed: false,
                createdAt: Date.now()
            };
            orders.unshift(newOrder);
            saveOrders();
        }
        
        closeModal();
    };
    
    // Обработчики закрытия - используем прямые вызовы
    const closeBtn = document.getElementById('closeModalBtn');
    if(closeBtn) {
        closeBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    }
    
    // Закрытие по клику на фон
    modal.onclick = function(e) {
        if(e.target === modal) {
            closeModal();
        }
    };
    
    const saveBtn = document.getElementById('saveOrderBtn');
    if(saveBtn) {
        saveBtn.onclick = function(e) {
            e.preventDefault();
            saveOrder();
        };
    }
}

// --- ПРАЙС ---
function renderPriceScreen() {
    let html = `
        <div class="content">
            <h2>💰 Прайс-лист</h2>
            <div class="form-card">
                <div class="form-group">
                    <label>Новая услуга</label>
                    <input id="newPriceName" placeholder="Название">
                </div>
                <div class="form-group">
                    <label>Стоимость (₽)</label>
                    <input id="newPriceCost" type="number" placeholder="500">
                </div>
                <button class="btn-primary" id="addPriceBtn">Добавить услугу</button>
            </div>
            <div id="priceListContainer"></div>
        </div>
    `;
    
    appRoot.innerHTML = `
        <div class="app">
            <div class="header">
                <div class="header-left">
                    <button class="menu-btn" id="menuButton">☰</button>
                    <h1>🚲 Велоремонт</h1>
                </div>
                <div style="width:100px;"></div>
            </div>
            ${drawerOverlay()}
            ${html}
        </div>
    `;
    
    attachDrawerEvents();
    
    const container = document.getElementById('priceListContainer');
    function renderPrices() {
        container.innerHTML = priceList.map(p => `
            <div class="price-item">
                <span><strong>${escapeHtml(p.name)}</strong> — ${p.price} ₽</span>
                <div class="price-actions">
                    <button data-delprice="${p.id}" class="btn-sm">Удалить</button>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('[data-delprice]').forEach(btn => {
            btn.onclick = () => {
                priceList = priceList.filter(p => p.id !== btn.dataset.delprice);
                savePrices();
                renderPrices();
            };
        });
    }
    renderPrices();
    
    document.getElementById('addPriceBtn')?.addEventListener('click', () => {
        const name = document.getElementById('newPriceName').value.trim();
        const cost = parseInt(document.getElementById('newPriceCost').value);
        if(!name || isNaN(cost) || cost<=0) { alert('Введите корректное название и цену'); return; }
        priceList.push({ id: generateId(), name, price: cost });
        savePrices();
        renderPriceScreen();
    });
}

// --- СТАТИСТИКА (исправленная) ---
function renderStatsScreen() {
    let now = new Date();
    let startDate, endDate = new Date();
    if(statsMode === 'today') { 
        startDate = new Date(); startDate.setHours(0,0,0,0); 
        endDate = new Date(); endDate.setHours(23,59,59,999); 
    } else if(statsMode === 'week') { 
        let day = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        startDate.setHours(0,0,0,0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23,59,59,999);
    } else if(statsMode === 'month') { 
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if(statsMode === 'custom' && customStart && customEnd) { 
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
        endDate.setHours(23,59,59,999);
    } else { 
        startDate = null; endDate = null; 
    }
    
    let filtered = orders.filter(o => {
        if(!startDate || !endDate) return false;
        let createdDate = new Date(o.createdAt);
        return createdDate >= startDate && createdDate <= endDate;
    });
    
    // Вычисляем сумму ТОЛЬКО по услугам (без запчастей)
    let totalSum = filtered.reduce((sum, o) => {
        const servicesSum = o.services.reduce((sSum, service) => sSum + (service.price * service.quantity), 0);
        return sum + servicesSum;
    }, 0);
    
    let completed = filtered.filter(o=>o.closed).length;
    
    let html = `
        <div class="content">
            <h2>📊 Статистика</h2>
            <div class="stats-period">
                <button class="stats-btn ${statsMode==='today'?'active':''}" data-mode="today">Сегодня</button>
                <button class="stats-btn ${statsMode==='week'?'active':''}" data-mode="week">Неделя</button>
                <button class="stats-btn ${statsMode==='month'?'active':''}" data-mode="month">Месяц</button>
                <button class="stats-btn ${statsMode==='custom'?'active':''}" data-mode="custom">Свои даты</button>
            </div>
    `;
    
    if(statsMode === 'custom') {
        html += `
            <div class="date-range">
                <div><label>С</label><input type="date" id="customStart" value="${customStart}"></div>
                <div><label>По</label><input type="date" id="customEnd" value="${customEnd}"></div>
                <button id="applyCustom" class="btn-primary">Применить</button>
            </div>
        `;
    }
    
    html += `
            <div class="stats-summary">
                💰 Сумма заказов (только услуги): ${totalSum} ₽<br>
                📦 Кол-во заказов: ${filtered.length} (из них закрыто: ${completed})<br>
                <small style="font-size:0.8rem; color:#64748b;">* Запчасти не учитываются в статистике</small>
            </div>
        </div>
    `;
    
    appRoot.innerHTML = `
        <div class="app">
            <div class="header">
                <div class="header-left">
                    <button class="menu-btn" id="menuButton">☰</button>
                    <h1>🚲 Велоремонт</h1>
                </div>
                <div style="width:100px;"></div>
            </div>
            ${drawerOverlay()}
            ${html}
        </div>
    `;
    
    attachDrawerEvents();
    
    document.querySelectorAll('.stats-btn').forEach(btn => {
        btn.onclick = () => {
            statsMode = btn.dataset.mode;
            renderStatsScreen();
        };
    });
    
    if(statsMode === 'custom') {
        document.getElementById('customStart')?.addEventListener('change', (e)=> customStart = e.target.value);
        document.getElementById('customEnd')?.addEventListener('change', (e)=> customEnd = e.target.value);
        document.getElementById('applyCustom')?.addEventListener('click', ()=> { renderStatsScreen(); });
    }
}

// --- Шторка ---
function drawerOverlay() {
    return `
        <div class="drawer-overlay ${drawerOpen ? 'open' : ''}" id="drawerOverlay">
            <div class="drawer">
                <div class="drawer-header">📋 Меню</div>
                <ul class="drawer-nav">
                    <li data-section="orders" class="${currentSection==='orders'?'active':''}">📋 Заказы</li>
                    <li data-section="price" class="${currentSection==='price'?'active':''}">💰 Прайс</li>
                    <li data-section="stats" class="${currentSection==='stats'?'active':''}">📈 Статистика</li>
                </ul>
                <div class="close-drawer" id="closeDrawerBtn">✖ Закрыть</div>
            </div>
        </div>
    `;
}

function attachDrawerEvents() {
    const menuBtn = document.getElementById('menuButton');
    const overlay = document.getElementById('drawerOverlay');
    const closeBtn = document.getElementById('closeDrawerBtn');
    
    if(menuBtn) {
        menuBtn.onclick = () => toggleDrawer(true);
    }
    
    if(closeBtn) {
        closeBtn.onclick = () => toggleDrawer(false);
    }
    
    if(overlay) {
        overlay.onclick = (e) => { if(e.target === overlay) toggleDrawer(false); };
    }
    
    document.querySelectorAll('.drawer-nav li').forEach(li => {
        li.onclick = () => {
            const section = li.dataset.section;
            if(section) setSection(section);
        };
    });
}

function attachFilterEvents() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            currentFilter = btn.dataset.filter;
            renderOrdersScreen();
        };
    });
}

function escapeHtml(str) { 
    if(!str) return ''; 
    return str.replace(/[&<>]/g, function(m){
        if(m==='&') return '&amp;'; 
        if(m==='<') return '&lt;'; 
        if(m==='>') return '&gt;'; 
        return m;
    }); 
}

// Инициализация
loadData();
render();