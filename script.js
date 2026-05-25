// ==================== ПРОСТАЯ ВЕРСИЯ (localStorage) ====================
let currentRole = 'user';
let currentUser = null;
let currentAdminTab = 'orders';
let orders = [];
let priceList = [];
let workers = [];

const ADMIN_LOGIN = 'DaniilBuzakov';
const ADMIN_PASSWORD = '123654123Aa@';

// const defaultPriceList = [
//     { id: 'p1', name: 'Замена камеры', price: 500 },
//     { id: 'p2', name: 'Настройка переключателей', price: 700 },
//     { id: 'p3', name: 'Замена тормозных колодок', price: 600 },
//     { id: 'p4', name: 'Смазка цепи', price: 300 },
//     { id: 'p5', name: 'Ремонт колеса', price: 900 },
//     { id: 'p6', name: 'Диагностика', price: 500 }
// ];

// const defaultWorkers = [
//     { id: 'w1', name: 'Алексей', phone: '+7 999 123-45-67', login: 'alexey', password: '123' },
//     { id: 'w2', name: 'Дмитрий', phone: '+7 999 234-56-78', login: 'dmitry', password: '123' },
//     { id: 'w3', name: 'Сергей', phone: '+7 999 345-67-89', login: 'sergey', password: '123' }
// ];

function generateId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 8); }

function saveData() {
    localStorage.setItem('khv_orders', JSON.stringify(orders));
    localStorage.setItem('khv_prices', JSON.stringify(priceList));
    localStorage.setItem('khv_workers', JSON.stringify(workers));
}

function loadData() {
    orders = JSON.parse(localStorage.getItem('khv_orders') || '[]');
    priceList = JSON.parse(localStorage.getItem('khv_prices') || JSON.stringify(defaultPriceList));
    workers = JSON.parse(localStorage.getItem('khv_workers') || JSON.stringify(defaultWorkers));
}

const app = document.getElementById('app');

function render() {
    if (currentRole === 'user') renderUser();
    else if (currentRole === 'admin') renderAdmin();
    else if (currentRole === 'worker') renderWorker();
}

// ==================== ПОЛЬЗОВАТЕЛЬСКАЯ ЧАСТЬ ====================
function renderUser() {
    app.innerHTML = `
        <div class="app">
            <div class="header"><div class="header-left"><h1>🚲 KHV Bike Repair</h1></div></div>
            <div class="content">
                <div class="hero"><h1>🚲 Ремонт велосипедов с выездом на дом</h1><p>Профессиональный ремонт, настройка и обслуживание</p></div>
                <div class="services-grid">
                    <div class="service-card"><div class="service-icon">🔧</div><h3>Диагностика</h3><p>Бесплатно</p></div>
                    <div class="service-card"><div class="service-icon">🛠️</div><h3>Любой ремонт</h3><p>Качественно</p></div>
                    <div class="service-card"><div class="service-icon">📦</div><h3>Выезд мастера</h3><p>К вам домой</p></div>
                </div>
                <div class="request-form">
                    <h2>📝 Заявка на ремонт</h2>
                    <form id="requestForm">
                        <div class="form-group"><label>ФИО *</label><input type="text" id="fio" required></div>
                        <div class="form-group"><label>Телефон *</label><input type="tel" id="phone" required></div>
                        <div class="form-group"><label>Адрес *</label><input type="text" id="address" required></div>
                        <div class="form-group"><label>Желаемое время</label><input type="datetime-local" id="time"></div>
                        <div class="form-group"><label>Описание проблемы</label><textarea id="problem" rows="3"></textarea></div>
                        <button type="submit" class="btn btn-primary">Отправить заявку</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('requestForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fio = document.getElementById('fio').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const address = document.getElementById('address').value.trim();
        if (!fio || !phone || !address) { alert('Заполните все поля'); return; }
        
        orders.unshift({
            id: generateId(), fio, phone, address,
            desiredTime: document.getElementById('time').value,
            problem: document.getElementById('problem').value,
            status: 'new', // new, calculated, agreed, assigned, completed
            workerId: null, workerName: null,
            services: [], parts: [], total: 0,
            adminNote: '', // заметки админа
            clientAgreed: false, // согласован ли с клиентом
            createdAt: Date.now()
        });
        saveData();
        alert('✅ Заявка отправлена! Ожидайте звонка мастера.');
        document.getElementById('requestForm').reset();
    });
}

// ==================== АДМИНСКАЯ ЧАСТЬ ====================
function renderAdmin() {
    app.innerHTML = `
        <div class="app">
            <div class="header">
                <div class="header-left"><button class="menu-btn" id="menuButton">☰</button><h1>👑 Админ панель</h1></div>
                <button class="btn-sm" id="logoutBtn" style="background:#ef4444; color:white;">Выйти</button>
            </div>
            <div class="admin-menu">
                <button class="admin-menu-btn ${currentAdminTab === 'orders' ? 'active' : ''}" data-tab="orders">📋 Заказы</button>
                <button class="admin-menu-btn ${currentAdminTab === 'price' ? 'active' : ''}" data-tab="price">💰 Прайс</button>
                <button class="admin-menu-btn ${currentAdminTab === 'workers' ? 'active' : ''}" data-tab="workers">👨‍🔧 Работники</button>
                <button class="admin-menu-btn ${currentAdminTab === 'stats' ? 'active' : ''}" data-tab="stats">📊 Статистика</button>
            </div>
            <div class="content" id="adminContent"></div>
        </div>
    `;
    
    document.getElementById('logoutBtn')?.addEventListener('click', () => { currentRole = 'user'; currentUser = null; window.location.hash = ''; render(); });
    document.querySelectorAll('.admin-menu-btn').forEach(btn => {
        btn.addEventListener('click', () => { currentAdminTab = btn.dataset.tab; renderAdmin(); });
    });
    
    const content = document.getElementById('adminContent');
    
    if (currentAdminTab === 'orders') {
        // Группируем заказы по статусу
        const newOrders = orders.filter(o => o.status === 'new');
        const calculatedOrders = orders.filter(o => o.status === 'calculated');
        const agreedOrders = orders.filter(o => o.status === 'agreed');
        const assignedOrders = orders.filter(o => o.status === 'assigned');
        const completedOrders = orders.filter(o => o.status === 'completed');
        
        content.innerHTML = `
            <h2>📋 Управление заказами</h2>
            
            <!-- Форма создания заказа вручную -->
            <div class="form-card" style="margin-bottom: 2rem; background: #f8fafc;">
                <h3 style="margin-bottom: 1rem;">➕ Создать заказ вручную</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                    <div class="form-group"><label>ФИО *</label><input type="text" id="manualFio" placeholder="Иванов Иван Иванович"></div>
                    <div class="form-group"><label>Телефон *</label><input type="tel" id="manualPhone" placeholder="+7 999 123-45-67"></div>
                    <div class="form-group"><label>Адрес</label><input type="text" id="manualAddress" placeholder="г. Москва, ул. Примерная"></div>
                    <div class="form-group"><label>Желаемое время</label><input type="datetime-local" id="manualTime"></div>
                </div>
                <div class="form-group"><label>Описание проблемы</label><textarea id="manualProblem" rows="2" placeholder="Опишите проблему..."></textarea></div>
                <button class="btn-primary" id="createManualOrderBtn">✅ Создать заказ</button>
            </div>
            
            ${renderOrderSection('🟡 Новые заказы (требуют расчета)', newOrders)}
            ${renderOrderSection('💰 Рассчитанные (ждут согласования)', calculatedOrders)}
            ${renderOrderSection('✅ Согласованные (назначить мастера)', agreedOrders)}
            ${renderOrderSection('🔧 Назначенные мастерам', assignedOrders)}
            ${renderOrderSection('🏁 Завершённые', completedOrders)}
        `;
        
        document.getElementById('createManualOrderBtn')?.addEventListener('click', () => {
            const fio = document.getElementById('manualFio').value.trim();
            const phone = document.getElementById('manualPhone').value.trim();
            if (!fio || !phone) { alert('Заполните ФИО и телефон'); return; }
            
            orders.unshift({
                id: generateId(), fio, phone,
                address: document.getElementById('manualAddress').value,
                desiredTime: document.getElementById('manualTime').value,
                problem: document.getElementById('manualProblem').value,
                status: 'new', workerId: null, workerName: null,
                services: [], parts: [], total: 0,
                adminNote: '', clientAgreed: false,
                createdAt: Date.now()
            });
            saveData();
            alert('✅ Заказ создан!');
            document.getElementById('manualFio').value = '';
            document.getElementById('manualPhone').value = '';
            document.getElementById('manualAddress').value = '';
            document.getElementById('manualTime').value = '';
            document.getElementById('manualProblem').value = '';
            renderAdmin();
        });
        
        // Добавляем обработчики для модальных окон
        attachModalHandlers();
    }
    else if (currentAdminTab === 'price') {
        content.innerHTML = `
            <h2>💰 Прайс-лист</h2>
            <div class="form-card"><div class="form-group"><label>Название услуги</label><input id="newPriceName"></div><div class="form-group"><label>Цена (₽)</label><input id="newPriceCost" type="number"></div><button class="btn-primary" id="addPriceBtn">➕ Добавить услугу</button></div>
            <div id="priceList">${priceList.map(p => `<div class="price-item"><span><strong>${escapeHtml(p.name)}</strong> — ${p.price} ₽</span><button data-del="${p.id}" class="btn-sm" style="background:#ef4444;color:white;">Удалить</button></div>`).join('')}</div>
        `;
        document.getElementById('addPriceBtn')?.addEventListener('click', () => {
            const name = document.getElementById('newPriceName').value.trim();
            const price = parseInt(document.getElementById('newPriceCost').value);
            if (name && price > 0) { priceList.push({ id: generateId(), name, price }); saveData(); renderAdmin(); }
            else alert('Введите название и цену');
        });
        document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { priceList = priceList.filter(p => p.id !== b.dataset.del); saveData(); renderAdmin(); }));
    }
    else if (currentAdminTab === 'workers') {
        content.innerHTML = `
            <h2>👨‍🔧 Работники</h2>
            <div class="form-card"><div class="form-group"><label>Имя мастера</label><input id="newWorkerName"></div><div class="form-group"><label>Телефон</label><input id="newWorkerPhone"></div><div class="form-group"><label>Логин</label><input id="newWorkerLogin"></div><div class="form-group"><label>Пароль</label><input id="newWorkerPassword" type="password"></div><button class="btn-primary" id="addWorkerBtn">➕ Добавить мастера</button></div>
            <div id="workersList">${workers.map(w => `<div class="worker-card"><strong>${escapeHtml(w.name)}</strong><br>📞 ${escapeHtml(w.phone)}<br>🔑 Логин: ${escapeHtml(w.login)}<br><button data-del="${w.id}" class="btn-sm" style="background:#ef4444;color:white;margin-top:0.5rem;">Удалить</button></div>`).join('')}</div>
        `;
        document.getElementById('addWorkerBtn')?.addEventListener('click', () => {
            const name = document.getElementById('newWorkerName').value.trim();
            const phone = document.getElementById('newWorkerPhone').value.trim();
            const login = document.getElementById('newWorkerLogin').value.trim();
            const password = document.getElementById('newWorkerPassword').value;
            if (name && phone && login && password) { workers.push({ id: generateId(), name, phone, login, password }); saveData(); renderAdmin(); }
            else alert('Заполните все поля');
        });
        document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { workers = workers.filter(w => w.id !== b.dataset.del); saveData(); renderAdmin(); }));
    }
    else if (currentAdminTab === 'stats') {
        const today = new Date(); today.setHours(0,0,0,0);
        const todayOrders = orders.filter(o => o.createdAt >= today.getTime());
        const todaySum = todayOrders.reduce((s,o) => s + o.total, 0);
        content.innerHTML = `
            <h2>📊 Статистика</h2>
            <div class="stats-grid">
                <div class="stats-card"><div class="stats-value">${orders.length}</div><div class="stats-label">Всего</div></div>
                <div class="stats-card"><div class="stats-value">${orders.filter(o => o.status !== 'completed').length}</div><div class="stats-label">Активных</div></div>
                <div class="stats-card"><div class="stats-value">${orders.filter(o => o.status === 'completed').length}</div><div class="stats-label">Завершённых</div></div>
                <div class="stats-card"><div class="stats-value">${todayOrders.length}</div><div class="stats-label">Сегодня</div></div>
            </div>
            <div class="stats-card full-width"><div class="stats-value">${todaySum} ₽</div><div class="stats-label">Выручка сегодня</div></div>
            <h3>👨‍🔧 По работникам</h3>
            ${workers.map(w => { const wo = orders.filter(o => o.workerId === w.id && o.status === 'completed'); const earned = wo.reduce((s,o) => s + o.total, 0); return `<div class="worker-stats-card"><strong>${escapeHtml(w.name)}</strong><br>✅ ${wo.length} заказов<br>💰 ${earned} ₽</div>`; }).join('')}
        `;
    }
}

function renderOrderSection(title, ordersList) {
    if (ordersList.length === 0) {
        return `<div style="margin: 1rem 0; padding: 1rem; background: #f1f5f9; border-radius: 0.5rem; color: #64748b;">${title}: нет заказов</div>`;
    }
    
    return `
        <div style="margin: 1rem 0;">
            <h3>${title}</h3>
            ${ordersList.map(order => `
                <div class="order-card" data-order-id="${order.id}" style="border-left: 4px solid ${getStatusColor(order.status)};">
                    <div class="order-header">
                        <strong>${escapeHtml(order.fio)}</strong>
                        <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
                    </div>
                    <div>📞 ${escapeHtml(order.phone)}</div>
                    <div>📍 ${escapeHtml(order.address || '—')}</div>
                    <div>📅 ${order.desiredTime ? new Date(order.desiredTime).toLocaleString() : 'время не указано'}</div>
                    <div class="order-problem">📝 ${escapeHtml(order.problem || '—')}</div>
                    ${order.services.length > 0 ? `<div>🛠 Услуги: ${order.services.map(s => `${s.name} x${s.quantity}`).join(', ')}</div>` : ''}
                    ${order.parts.length > 0 ? `<div>🔩 Запчасти: ${order.parts.map(p => `${p.name} x${p.quantity}`).join(', ')}</div>` : ''}
                    <div><strong>💰 Итого: ${order.total} ₽</strong></div>
                    ${order.adminNote ? `<div class="order-problem" style="background:#e0f2fe;">📋 Заметка: ${escapeHtml(order.adminNote)}</div>` : ''}
                    <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn-sm" onclick="openOrderModal('${order.id}')">✏️ Обработать заказ</button>
                        <button class="btn-sm" style="background:#ef4444;color:white;" onclick="deleteOrder('${order.id}')">🗑 Удалить</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function getStatusColor(status) {
    const colors = { new: '#f59e0b', calculated: '#3b82f6', agreed: '#10b981', assigned: '#8b5cf6', completed: '#6b7280' };
    return colors[status] || '#6b7280';
}

function getStatusText(status) {
    const texts = { new: '🟡 Новый', calculated: '💰 Рассчитан', agreed: '✅ Согласован', assigned: '🔧 Назначен', completed: '🏁 Завершён' };
    return texts[status] || status;
}

// Модальное окно для обработки заказа
function openOrderModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'orderModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 85vh; overflow-y: auto;">
            <div class="modal-header">
                <h3>📋 Обработка заказа #${order.id.slice(-6)}</h3>
                <button class="modal-close" id="closeModal">&times;</button>
            </div>
            
            <!-- Информация о клиенте -->
            <div style="background: #f1f5f9; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                <h4>👤 Информация о клиенте</h4>
                <div><strong>ФИО:</strong> ${escapeHtml(order.fio)}</div>
                <div><strong>Телефон:</strong> ${escapeHtml(order.phone)}</div>
                <div><strong>Адрес:</strong> ${escapeHtml(order.address || '—')}</div>
                <div><strong>Желаемое время:</strong> ${order.desiredTime ? new Date(order.desiredTime).toLocaleString() : '—'}</div>
                <div><strong>Проблема:</strong> ${escapeHtml(order.problem || '—')}</div>
            </div>
            
            <!-- Добавление услуг -->
            <div style="margin-bottom: 1rem;">
                <h4>🛠 Услуги</h4>
                <div id="servicesList"></div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    <select id="serviceSelect" class="btn-sm" style="flex:2;">
                        <option value="">-- Выберите услугу --</option>
                        ${priceList.map(p => `<option value="${p.id}" data-price="${p.price}">${escapeHtml(p.name)} - ${p.price}₽</option>`).join('')}
                    </select>
                    <input type="number" id="serviceQty" placeholder="Кол-во" value="1" min="1" style="width: 80px;">
                    <button class="btn-sm" id="addServiceBtn">➕ Добавить</button>
                </div>
            </div>
            
            <!-- Добавление запчастей -->
            <div style="margin-bottom: 1rem;">
                <h4>🔩 Запчасти</h4>
                <div id="partsList"></div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    <input type="text" id="partName" placeholder="Название запчасти" style="flex:2;">
                    <input type="number" id="PartPrice" placeholder="Цена" style="width: 100px;">
                    <input type="number" id="partQty" placeholder="Кол-во" value="1" style="width: 80px;">
                    <button class="btn-sm" id="addPartBtn">➕ Добавить</button>
                </div>
            </div>
            
            <!-- Заметка админа -->
            <div class="form-group">
                <label>📝 Заметка (для себя или клиента)</label>
                <textarea id="adminNote" rows="2" placeholder="Например: клиент согласен на ремонт, звонить после 18:00...">${escapeHtml(order.adminNote || '')}</textarea>
            </div>
            
            <!-- Назначение мастера -->
            <div class="form-group">
                <label>👨‍🔧 Назначить мастера</label>
                <select id="workerSelect" class="btn-sm">
                    <option value="">-- Не назначен --</option>
                    ${workers.map(w => `<option value="${w.id}" ${order.workerId === w.id ? 'selected' : ''}>${escapeHtml(w.name)} (${escapeHtml(w.phone)})</option>`).join('')}
                </select>
            </div>
            
            <!-- Действия -->
            <div style="display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;">
                ${order.status === 'new' ? `<button class="btn-primary" id="calculateBtn">💰 Рассчитать стоимость</button>` : ''}
                ${order.status === 'calculated' ? `<button class="btn-primary" id="agreeBtn">✅ Согласовать с клиентом</button>` : ''}
                ${order.status === 'agreed' ? `<button class="btn-primary" id="assignBtn">🔧 Назначить мастера и отправить</button>` : ''}
                <button class="btn-sm" id="saveNoteBtn">💾 Сохранить заметку</button>
            </div>
            
            <div id="orderTotal" style="margin-top: 1rem; padding: 0.75rem; background: #eef2ff; border-radius: 0.5rem; text-align: center; font-weight: bold;">
                💰 Общая стоимость: ${order.total} ₽
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Функции обновления списков
    function updateServicesList() {
        const container = document.getElementById('servicesList');
        if (!container) return;
        container.innerHTML = (order.services || []).map((s, idx) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid #e2e8f0;">
                <span>${escapeHtml(s.name)} x${s.quantity} = ${s.price * s.quantity}₽</span>
                <button class="btn-sm" data-remove-service="${idx}" style="background:#ef4444;color:white;">✖</button>
            </div>
        `).join('');
        
        document.querySelectorAll('[data-remove-service]').forEach(btn => {
            btn.addEventListener('click', () => {
                order.services.splice(parseInt(btn.dataset.removeService), 1);
                updateTotal();
                updateServicesList();
                saveData();
            });
        });
    }
    
    function updatePartsList() {
        const container = document.getElementById('partsList');
        if (!container) return;
        container.innerHTML = (order.parts || []).map((p, idx) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; border-bottom: 1px solid #e2e8f0;">
                <span>${escapeHtml(p.name)} x${p.quantity} = ${p.price * p.quantity}₽</span>
                <button class="btn-sm" data-remove-part="${idx}" style="background:#ef4444;color:white;">✖</button>
            </div>
        `).join('');
        
        document.querySelectorAll('[data-remove-part]').forEach(btn => {
            btn.addEventListener('click', () => {
                order.parts.splice(parseInt(btn.dataset.removePart), 1);
                updateTotal();
                updatePartsList();
                saveData();
            });
        });
    }
    
    function updateTotal() {
        const servicesSum = (order.services || []).reduce((s, svc) => s + (svc.price * svc.quantity), 0);
        const partsSum = (order.parts || []).reduce((s, p) => s + (p.price * p.quantity), 0);
        order.total = servicesSum + partsSum;
        const totalDiv = document.getElementById('orderTotal');
        if (totalDiv) totalDiv.innerHTML = `💰 Общая стоимость: ${order.total} ₽`;
    }
    
    // Добавление услуги
    document.getElementById('addServiceBtn')?.addEventListener('click', () => {
        const select = document.getElementById('serviceSelect');
        const option = select.options[select.selectedIndex];
        const serviceId = select.value;
        if (!serviceId) { alert('Выберите услугу'); return; }
        const qty = parseInt(document.getElementById('serviceQty').value) || 1;
        const service = priceList.find(p => p.id === serviceId);
        if (!service) return;
        
        order.services = order.services || [];
        const existing = order.services.find(s => s.id === serviceId);
        if (existing) {
            existing.quantity += qty;
        } else {
            order.services.push({ id: serviceId, name: service.name, price: service.price, quantity: qty });
        }
        updateTotal();
        updateServicesList();
        saveData();
        select.value = '';
        document.getElementById('serviceQty').value = '1';
    });
    
    // Добавление запчасти
    document.getElementById('addPartBtn')?.addEventListener('click', () => {
        const name = document.getElementById('partName').value.trim();
        const price = parseInt(document.getElementById('PartPrice').value);
        const qty = parseInt(document.getElementById('partQty').value) || 1;
        if (!name || isNaN(price)) { alert('Введите название и цену запчасти'); return; }
        
        order.parts = order.parts || [];
        order.parts.push({ name, price, quantity: qty });
        updateTotal();
        updatePartsList();
        saveData();
        document.getElementById('partName').value = '';
        document.getElementById('PartPrice').value = '';
        document.getElementById('partQty').value = '1';
    });
    
    // Сохранение заметки
    document.getElementById('saveNoteBtn')?.addEventListener('click', () => {
        order.adminNote = document.getElementById('adminNote').value;
        saveData();
        alert('Заметка сохранена');
    });
    
    // Расчет стоимости
    document.getElementById('calculateBtn')?.addEventListener('click', () => {
        order.status = 'calculated';
        saveData();
        alert('✅ Стоимость рассчитана! Теперь можно согласовывать с клиентом.');
        modal.remove();
        renderAdmin();
    });
    
    // Согласование с клиентом
    document.getElementById('agreeBtn')?.addEventListener('click', () => {
        order.status = 'agreed';
        saveData();
        alert('✅ Заказ согласован с клиентом! Теперь можно назначить мастера.');
        modal.remove();
        renderAdmin();
    });
    
    // Назначение мастера и отправка
    document.getElementById('assignBtn')?.addEventListener('click', () => {
        const workerId = document.getElementById('workerSelect').value;
        if (!workerId) { alert('Выберите мастера'); return; }
        const worker = workers.find(w => w.id === workerId);
        order.workerId = workerId;
        order.workerName = worker.name;
        order.status = 'assigned';
        saveData();
        alert(`✅ Мастер ${worker.name} назначен! Заказ отправлен ему.`);
        modal.remove();
        renderAdmin();
    });
    
    document.getElementById('closeModal')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    
    updateServicesList();
    updatePartsList();
    updateTotal();
}

function attachModalHandlers() {
    window.openOrderModal = openOrderModal;
    window.deleteOrder = (orderId) => {
        if (confirm('Удалить заказ?')) {
            orders = orders.filter(o => o.id !== orderId);
            saveData();
            renderAdmin();
        }
    };
}

// ==================== ЧАСТЬ МАСТЕРА ====================
function renderWorker() {
    const myOrders = orders.filter(o => o.workerId === currentUser?.id && o.status !== 'completed');
    const completedOrders = orders.filter(o => o.workerId === currentUser?.id && o.status === 'completed');
    const completedCount = completedOrders.length;
    const earned = completedOrders.reduce((s, o) => s + o.total, 0);
    
    app.innerHTML = `
        <div class="app">
            <div class="header"><div class="header-left"><h1>🔧 ${escapeHtml(currentUser?.name)}</h1></div><button class="btn-sm" id="logoutBtn" style="background:#ef4444;color:white;">Выйти</button></div>
            <div class="content">
                <div class="stats-card" style="margin-bottom: 1rem;">
                    <div class="stats-value">${completedCount}</div><div class="stats-label">Выполнено заказов</div>
                    <div class="stats-value">${earned} ₽</div><div class="stats-label">Заработано</div>
                </div>
                <h2>📋 Мои активные заказы (${myOrders.length})</h2>
                <div id="ordersList">${myOrders.map(o => `
                    <div class="order-card">
                        <div class="order-header"><strong>${escapeHtml(o.fio)}</strong><span class="order-status status-${o.status}">${getStatusText(o.status)}</span></div>
                        <div>📞 ${escapeHtml(o.phone)}</div>
                        <div>📍 ${escapeHtml(o.address || '—')}</div>
                        <div>📅 ${o.desiredTime ? new Date(o.desiredTime).toLocaleString() : 'время не указано'}</div>
                        <div class="order-problem">📝 ${escapeHtml(o.problem || '—')}</div>
                        ${o.services.length > 0 ? `<div>🛠 ${o.services.map(s => `${s.name} x${s.quantity}`).join(', ')}</div>` : ''}
                        <div><strong>💰 Сумма: ${o.total} ₽</strong></div>
                        <div class="order-actions" style="margin-top: 0.5rem;">
                            <button class="btn-sm btn-success" data-complete="${o.id}">✅ Завершить заказ</button>
                        </div>
                    </div>
                `).join('')}</div>
            </div>
        </div>
    `;
    
    document.getElementById('logoutBtn')?.addEventListener('click', () => { currentRole = 'user'; currentUser = null; window.location.hash = ''; render(); });
    document.querySelectorAll('[data-complete]').forEach(b => b.addEventListener('click', () => {
        const order = orders.find(o => o.id === b.dataset.complete);
        if (order && confirm('Завершить заказ?')) { order.status = 'completed'; saveData(); renderWorker(); }
    }));
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function showLoginModal(role) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:350px;">
            <div class="modal-header"><h3>Вход в ${role === 'admin' ? 'Админ-панель' : 'Кабинет мастера'}</h3><button class="modal-close" id="closeModal">&times;</button></div>
            <div class="form-group"><label>Логин</label><input type="text" id="loginInput"></div>
            <div class="form-group"><label>Пароль</label><input type="password" id="passwordInput"></div>
            <button class="btn-primary" id="submitLogin" style="width:100%;">Войти</button>
        </div>
    `;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    document.getElementById('closeModal')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.getElementById('submitLogin')?.addEventListener('click', () => {
        const login = document.getElementById('loginInput').value.trim();
        const password = document.getElementById('passwordInput').value;
        if (role === 'admin' && login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
            currentRole = 'admin'; currentUser = null; close(); render();
        } else if (role === 'worker') {
            const w = workers.find(w => w.login === login && w.password === password);
            if (w) { currentRole = 'worker'; currentUser = w; close(); render(); }
            else alert('Неверный логин или пароль');
        } else alert('Неверный логин или пароль');
    });
}

function checkHash() {
    const hash = window.location.hash;
    if (hash === '#admin' && currentRole === 'user') showLoginModal('admin');
    else if (hash === '#worker' && currentRole === 'user') showLoginModal('worker');
}

window.addEventListener('hashchange', () => { if (currentRole === 'user') checkHash(); });
loadData();
render();
checkHash();
