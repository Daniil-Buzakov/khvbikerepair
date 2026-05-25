// ==================== SUPABASE НАСТРОЙКА ====================
const SUPABASE_URL = 'https://sjmubbiqceluomzbwwzw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2PVFcZgK_9TIR38CLZLf8w_dQ3R6aLn';

let supabase = null;
let currentRole = 'user';
let currentUser = null;
let currentAdminTab = 'orders';
let orders = [];
let priceList = [];
let workers = [];

const ADMIN_LOGIN = 'DaniilBuzakov';
const ADMIN_PASSWORD = '123654123Aa@';

// Инициализация Supabase
try {
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: true },
            global: { headers: { 'x-application-name': 'khv-bike-repair' } }
        });
        console.log('✅ Supabase подключен');
    }
} catch(e) { console.error('Ошибка Supabase:', e); }

function generateId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 8); }

// ==================== РАБОТА С ДАННЫМИ ====================
function saveToLocal() {
    localStorage.setItem('khv_orders', JSON.stringify(orders));
    localStorage.setItem('khv_prices', JSON.stringify(priceList));
    localStorage.setItem('khv_workers', JSON.stringify(workers));
}

function loadFromLocal() {
    orders = JSON.parse(localStorage.getItem('khv_orders') || '[]');
    priceList = JSON.parse(localStorage.getItem('khv_prices') || '[]');
    workers = JSON.parse(localStorage.getItem('khv_workers') || '[]');
}

// Загрузка из Supabase
async function loadFromSupabase() {
    if (!supabase) {
        loadFromLocal();
        render();
        return;
    }
    
    console.log('🔄 Загрузка из Supabase...');
    
    try {
        // Загружаем заказы
        const { data: ordersData, error: ordersError } = await supabase
            .from('repair_orders')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (ordersError) throw ordersError;
        if (ordersData) {
            orders = ordersData.map(o => ({
                id: o.id,
                fio: o.fio,
                phone: o.phone,
                address: o.address,
                desiredTime: o.desired_time,
                problem: o.problem,
                status: o.status,
                workerId: o.worker_id,
                workerName: o.worker_name,
                services: o.services || [],
                parts: o.parts || [],
                total: o.total || 0,
                note: o.note || '',
                createdAt: o.created_at
            }));
            console.log('✅ Заказов загружено:', orders.length);
        }
        
        // Загружаем прайс
        const { data: pricesData, error: pricesError } = await supabase
            .from('price_list')
            .select('*');
        if (pricesError) throw pricesError;
        if (pricesData) {
            priceList = pricesData;
            console.log('✅ Прайс загружен:', priceList.length);
        }
        
        // Загружаем работников
        const { data: workersData, error: workersError } = await supabase
            .from('workers')
            .select('*');
        if (workersError) throw workersError;
        if (workersData) {
            workers = workersData;
            console.log('✅ Работники загружены:', workers.length);
        }
        
        saveToLocal();
    } catch(e) {
        console.error('❌ Ошибка загрузки:', e);
        loadFromLocal();
    }
    render();
    checkHash();
}

// Сохранение в Supabase
async function saveToSupabase() {
    if (!supabase) return;
    
    console.log('☁️ Сохранение в Supabase...');
    
    try {
        // Сохраняем заказы
        for (const order of orders) {
            const dbOrder = {
                id: order.id,
                fio: order.fio,
                phone: order.phone,
                address: order.address || '',
                desired_time: order.desiredTime || '',
                problem: order.problem || '',
                status: order.status || 'new',
                worker_id: order.workerId || null,
                worker_name: order.workerName || null,
                services: order.services || [],
                parts: order.parts || [],
                total: order.total || 0,
                note: order.note || '',
                created_at: order.createdAt || Date.now()
            };
            
            const { error } = await supabase
                .from('repair_orders')
                .upsert(dbOrder, { onConflict: 'id' });
            if (error) console.error('Ошибка сохранения заказа:', error);
        }
        
        // Сохраняем прайс
        for (const item of priceList) {
            const { error } = await supabase
                .from('price_list')
                .upsert(item, { onConflict: 'id' });
            if (error) console.error('Ошибка сохранения прайса:', error);
        }
        
        // Сохраняем работников
        for (const worker of workers) {
            const { error } = await supabase
                .from('workers')
                .upsert(worker, { onConflict: 'id' });
            if (error) console.error('Ошибка сохранения работника:', error);
        }
        
        console.log('✅ Данные сохранены в Supabase');
    } catch(e) {
        console.error('❌ Ошибка сохранения:', e);
    }
}

async function saveAll() {
    saveToLocal();
    await saveToSupabase();
}

const app = document.getElementById('app');

function render() {
    if (!app) return;
    if (currentRole === 'user') renderUser();
    else if (currentRole === 'admin') renderAdmin();
    else if (currentRole === 'worker') renderWorker();
}

// ==================== ПОЛЬЗОВАТЕЛЬ ====================
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
    
    document.getElementById('requestForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fio = document.getElementById('fio').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const address = document.getElementById('address').value.trim();
        if (!fio || !phone || !address) { alert('Заполните все поля'); return; }
        
        const newOrder = {
            id: generateId(),
            fio, phone, address,
            desiredTime: document.getElementById('time').value,
            problem: document.getElementById('problem').value,
            status: 'new',
            workerId: null,
            workerName: null,
            services: [],
            parts: [],
            total: 0,
            note: '',
            createdAt: Date.now()
        };
        
        orders.unshift(newOrder);
        await saveAll();
        alert('✅ Заявка отправлена!');
        document.getElementById('requestForm').reset();
        render();
    });
}

// ==================== АДМИН ====================
function renderAdmin() {
    app.innerHTML = `
        <div class="app">
            <div class="header">
                <div class="header-left"><button class="menu-btn" id="menuButton">☰</button><h1>👑 Админ панель</h1></div>
                <button class="btn-sm" id="logoutBtn" style="background:#ef4444;color:white;">Выйти</button>
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
    
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        currentRole = 'user';
        currentUser = null;
        window.location.hash = '';
        render();
    });
    
    document.querySelectorAll('.admin-menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentAdminTab = btn.dataset.tab;
            renderAdmin();
        });
    });
    
    const content = document.getElementById('adminContent');
    if (!content) return;
    
    if (currentAdminTab === 'orders') {
        const newOrders = orders.filter(o => o.status === 'new');
        const inProgress = orders.filter(o => o.status !== 'new' && o.status !== 'completed');
        const completed = orders.filter(o => o.status === 'completed');
        
        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                <h2>📋 Заказы (${orders.length})</h2>
                <button class="btn-primary" id="createOrderBtn">➕ Создать заказ</button>
            </div>
            
            <h3>🟡 Новые (${newOrders.length})</h3>
            ${renderOrdersList(newOrders)}
            
            <h3>🔄 В работе (${inProgress.length})</h3>
            ${renderOrdersList(inProgress)}
            
            <h3>✅ Завершённые (${completed.length})</h3>
            ${renderOrdersList(completed)}
        `;
        
        document.getElementById('createOrderBtn')?.addEventListener('click', () => openCreateModal());
        
    } else if (currentAdminTab === 'price') {
        content.innerHTML = `
            <h2>💰 Прайс-лист</h2>
            <div class="form-card">
                <input type="text" id="newPriceName" placeholder="Название услуги">
                <input type="number" id="newPriceCost" placeholder="Цена">
                <button class="btn-primary" id="addPriceBtn">➕ Добавить</button>
            </div>
            ${priceList.map(p => `
                <div class="price-item">
                    <span><strong>${escapeHtml(p.name)}</strong> — ${p.price} ₽</span>
                    <button data-del="${p.id}" class="btn-sm" style="background:#ef4444;color:white;">Удалить</button>
                </div>
            `).join('')}
        `;
        
        document.getElementById('addPriceBtn')?.addEventListener('click', async () => {
            const name = document.getElementById('newPriceName').value.trim();
            const price = parseInt(document.getElementById('newPriceCost').value);
            if (name && price > 0) {
                priceList.push({ id: generateId(), name, price });
                await saveAll();
                renderAdmin();
            } else alert('Введите название и цену');
        });
        
        document.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', async () => {
                priceList = priceList.filter(p => p.id !== btn.dataset.del);
                await saveAll();
                renderAdmin();
            });
        });
        
    } else if (currentAdminTab === 'workers') {
        content.innerHTML = `
            <h2>👨‍🔧 Работники</h2>
            <div class="form-card">
                <input type="text" id="newWorkerName" placeholder="Имя">
                <input type="text" id="newWorkerPhone" placeholder="Телефон">
                <input type="text" id="newWorkerLogin" placeholder="Логин">
                <input type="password" id="newWorkerPassword" placeholder="Пароль">
                <button class="btn-primary" id="addWorkerBtn">➕ Добавить</button>
            </div>
            ${workers.map(w => `
                <div class="worker-card">
                    <strong>${escapeHtml(w.name)}</strong><br>
                    📞 ${escapeHtml(w.phone)}<br>
                    🔑 Логин: ${escapeHtml(w.login)}
                    <button data-del="${w.id}" class="btn-sm" style="background:#ef4444;color:white;margin-top:0.5rem;">Удалить</button>
                </div>
            `).join('')}
        `;
        
        document.getElementById('addWorkerBtn')?.addEventListener('click', async () => {
            const name = document.getElementById('newWorkerName').value.trim();
            const phone = document.getElementById('newWorkerPhone').value.trim();
            const login = document.getElementById('newWorkerLogin').value.trim();
            const password = document.getElementById('newWorkerPassword').value;
            if (name && phone && login && password) {
                workers.push({ id: generateId(), name, phone, login, password });
                await saveAll();
                renderAdmin();
            } else alert('Заполните все поля');
        });
        
        document.querySelectorAll('[data-del]').forEach(btn => {
            btn.addEventListener('click', async () => {
                workers = workers.filter(w => w.id !== btn.dataset.del);
                await saveAll();
                renderAdmin();
            });
        });
        
    } else if (currentAdminTab === 'stats') {
        const completed = orders.filter(o => o.status === 'completed');
        const totalEarned = completed.reduce((s,o) => s + (o.total || 0), 0);
        
        content.innerHTML = `
            <h2>📊 Статистика</h2>
            <div class="stats-grid">
                <div class="stats-card"><div class="stats-value">${orders.length}</div><div class="stats-label">Всего заказов</div></div>
                <div class="stats-card"><div class="stats-value">${orders.filter(o => o.status !== 'completed').length}</div><div class="stats-label">Активных</div></div>
                <div class="stats-card"><div class="stats-value">${completed.length}</div><div class="stats-label">Завершённых</div></div>
            </div>
            <div class="stats-card full-width"><div class="stats-value">${totalEarned} ₽</div><div class="stats-label">Общая выручка</div></div>
            <h3>👨‍🔧 Статистика по работникам</h3>
            ${workers.map(w => {
                const wo = orders.filter(o => o.workerId === w.id && o.status === 'completed');
                const earned = wo.reduce((s,o) => s + (o.total || 0), 0);
                return `<div class="worker-stats-card"><strong>${escapeHtml(w.name)}</strong><br>✅ ${wo.length} заказов<br>💰 ${earned} ₽</div>`;
            }).join('')}
        `;
    }
}

function renderOrdersList(ordersList) {
    if (!ordersList.length) return '<div style="padding:0.5rem; color:#888;">Нет заказов</div>';
    
    return ordersList.map(order => `
        <div class="order-card">
            <div class="order-header">
                <strong>${escapeHtml(order.fio)}</strong>
                <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div>📞 ${escapeHtml(order.phone)}</div>
            <div>📍 ${escapeHtml(order.address || '—')}</div>
            <div>📝 ${escapeHtml(order.problem || '—')}</div>
            <div>💰 ${order.total || 0} ₽</div>
            <div style="margin-top:0.5rem;">
                <button class="btn-sm" onclick="openEditOrderModal('${order.id}')">✏️ Редактировать</button>
                <button class="btn-sm" data-delete="${order.id}" style="background:#ef4444;color:white;">🗑 Удалить</button>
            </div>
        </div>
    `).join('');
}

// ==================== МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ ====================
function openEditOrderModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    let services = order.services ? [...order.services] : [];
    let parts = order.parts ? [...order.parts] : [];
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 85vh; overflow-y: auto;">
            <div class="modal-header">
                <h3>✏️ Редактирование заказа #${order.id.slice(-6)}</h3>
                <button class="modal-close" id="closeModal">&times;</button>
            </div>
            
            <div style="background: #f1f5f9; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                <h4>👤 Информация о клиенте</h4>
                <div class="form-group"><label>ФИО</label><input type="text" id="editFio" value="${escapeHtml(order.fio)}"></div>
                <div class="form-group"><label>Телефон</label><input type="text" id="editPhone" value="${escapeHtml(order.phone)}"></div>
                <div class="form-group"><label>Адрес</label><input type="text" id="editAddress" value="${escapeHtml(order.address || '')}"></div>
                <div class="form-group"><label>Желаемое время</label><input type="datetime-local" id="editTime" value="${order.desiredTime || ''}"></div>
                <div class="form-group"><label>Описание проблемы</label><textarea id="editProblem" rows="2">${escapeHtml(order.problem || '')}</textarea></div>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <h4>🛠 Услуги</h4>
                <div id="servicesList"></div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    <select id="serviceSelect" class="btn-sm" style="flex:2;">
                        <option value="">-- Выберите услугу --</option>
                        ${priceList.map(p => `<option value="${p.id}">${escapeHtml(p.name)} - ${p.price}₽</option>`).join('')}
                    </select>
                    <input type="number" id="serviceQty" value="1" min="1" style="width: 80px;">
                    <button class="btn-sm" id="addServiceBtn">➕ Добавить</button>
                </div>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <h4>🔩 Запчасти</h4>
                <div id="partsList"></div>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    <input type="text" id="partName" placeholder="Название" style="flex:2;">
                    <input type="number" id="partPrice" placeholder="Цена" style="width: 100px;">
                    <input type="number" id="partQty" value="1" style="width: 80px;">
                    <button class="btn-sm" id="addPartBtn">➕ Добавить</button>
                </div>
            </div>
            
            <div class="form-group">
                <label>📝 Заметка</label>
                <textarea id="editNote" rows="2">${escapeHtml(order.note || '')}</textarea>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                    <label>👨‍🔧 Мастер</label>
                    <select id="editWorker">
                        <option value="">-- Не назначен --</option>
                        ${workers.map(w => `<option value="${w.id}" ${order.workerId === w.id ? 'selected' : ''}>${escapeHtml(w.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>📊 Статус</label>
                    <select id="editStatus">
                        <option value="new" ${order.status === 'new' ? 'selected' : ''}>🟡 Новый</option>
                        <option value="calculated" ${order.status === 'calculated' ? 'selected' : ''}>💰 Рассчитан</option>
                        <option value="agreed" ${order.status === 'agreed' ? 'selected' : ''}>✅ Согласован</option>
                        <option value="assigned" ${order.status === 'assigned' ? 'selected' : ''}>🔧 Назначен</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>🏁 Завершён</option>
                    </select>
                </div>
            </div>
            
            <div id="orderTotal" style="margin-top: 1rem; padding: 0.75rem; background: #eef2ff; border-radius: 0.5rem; text-align: center; font-weight: bold;">
                💰 Общая стоимость: ${order.total || 0} ₽
            </div>
            
            <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                <button class="btn-primary" id="saveOrderBtn">💾 Сохранить изменения</button>
                <button class="btn-sm" id="cancelBtn">Отмена</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    function updateServicesList() {
        const container = document.getElementById('servicesList');
        if (!container) return;
        container.innerHTML = services.map((s, idx) => `
            <div style="display: flex; justify-content: space-between; padding: 0.25rem 0; border-bottom: 1px solid #e2e8f0;">
                <span>${escapeHtml(s.name)} x${s.quantity} = ${s.price * s.quantity}₽</span>
                <button class="btn-sm" data-remove-service="${idx}" style="background:#ef4444;color:white;">✖</button>
            </div>
        `).join('');
        
        document.querySelectorAll('[data-remove-service]').forEach(btn => {
            btn.addEventListener('click', () => {
                services.splice(parseInt(btn.dataset.removeService), 1);
                updateTotal();
                updateServicesList();
            });
        });
    }
    
    function updatePartsList() {
        const container = document.getElementById('partsList');
        if (!container) return;
        container.innerHTML = parts.map((p, idx) => `
            <div style="display: flex; justify-content: space-between; padding: 0.25rem 0; border-bottom: 1px solid #e2e8f0;">
                <span>${escapeHtml(p.name)} x${p.quantity} = ${p.price * p.quantity}₽</span>
                <button class="btn-sm" data-remove-part="${idx}" style="background:#ef4444;color:white;">✖</button>
            </div>
        `).join('');
        
        document.querySelectorAll('[data-remove-part]').forEach(btn => {
            btn.addEventListener('click', () => {
                parts.splice(parseInt(btn.dataset.removePart), 1);
                updateTotal();
                updatePartsList();
            });
        });
    }
    
    function updateTotal() {
        const servicesSum = services.reduce((s, svc) => s + (svc.price * svc.quantity), 0);
        const partsSum = parts.reduce((s, p) => s + (p.price * p.quantity), 0);
        const total = servicesSum + partsSum;
        const totalDiv = document.getElementById('orderTotal');
        if (totalDiv) totalDiv.innerHTML = `💰 Общая стоимость: ${total} ₽`;
        return total;
    }
    
    document.getElementById('addServiceBtn')?.addEventListener('click', () => {
        const select = document.getElementById('serviceSelect');
        const serviceId = select.value;
        if (!serviceId) { alert('Выберите услугу'); return; }
        const qty = parseInt(document.getElementById('serviceQty').value) || 1;
        const service = priceList.find(p => p.id === serviceId);
        if (!service) return;
        
        const existing = services.find(s => s.id === serviceId);
        if (existing) existing.quantity += qty;
        else services.push({ id: serviceId, name: service.name, price: service.price, quantity: qty });
        
        updateTotal();
        updateServicesList();
        select.value = '';
        document.getElementById('serviceQty').value = '1';
    });
    
    document.getElementById('addPartBtn')?.addEventListener('click', () => {
        const name = document.getElementById('partName').value.trim();
        const price = parseInt(document.getElementById('partPrice').value);
        const qty = parseInt(document.getElementById('partQty').value) || 1;
        if (!name || isNaN(price)) { alert('Введите название и цену'); return; }
        
        parts.push({ name, price, quantity: qty });
        updateTotal();
        updatePartsList();
        document.getElementById('partName').value = '';
        document.getElementById('partPrice').value = '';
        document.getElementById('partQty').value = '1';
    });
    
    document.getElementById('saveOrderBtn')?.addEventListener('click', async () => {
        const fio = document.getElementById('editFio').value.trim();
        if (!fio) { alert('Введите ФИО'); return; }
        
        order.fio = fio;
        order.phone = document.getElementById('editPhone').value;
        order.address = document.getElementById('editAddress').value;
        order.desiredTime = document.getElementById('editTime').value;
        order.problem = document.getElementById('editProblem').value;
        order.note = document.getElementById('editNote').value;
        order.workerId = document.getElementById('editWorker').value || null;
        order.workerName = workers.find(w => w.id === order.workerId)?.name || null;
        order.status = document.getElementById('editStatus').value;
        order.services = services;
        order.parts = parts;
        order.total = updateTotal();
        
        await saveAll();
        alert('✅ Изменения сохранены!');
        modal.remove();
        renderAdmin();
    });
    
    document.getElementById('closeModal')?.addEventListener('click', () => modal.remove());
    document.getElementById('cancelBtn')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    
    updateServicesList();
    updatePartsList();
    updateTotal();
}

window.openEditOrderModal = openEditOrderModal;

// Удаление заказа
document.addEventListener('click', async (e) => {
    if (e.target.matches('[data-delete]')) {
        if (confirm('Удалить заказ?')) {
            orders = orders.filter(o => o.id !== e.target.dataset.delete);
            await saveAll();
            renderAdmin();
        }
    }
});

function openCreateModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px;">
            <div class="modal-header"><h3>➕ Новый заказ</h3><button class="modal-close" id="closeModal">&times;</button></div>
            <div class="form-group"><label>ФИО *</label><input type="text" id="modalFio"></div>
            <div class="form-group"><label>Телефон *</label><input type="text" id="modalPhone"></div>
            <div class="form-group"><label>Адрес</label><input type="text" id="modalAddress"></div>
            <div class="form-group"><label>Проблема</label><textarea id="modalProblem" rows="2"></textarea></div>
            <button class="btn-primary" id="saveModalBtn">✅ Создать</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    const close = () => modal.remove();
    document.getElementById('closeModal')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    
    document.getElementById('saveModalBtn')?.addEventListener('click', async () => {
        const fio = document.getElementById('modalFio').value.trim();
        const phone = document.getElementById('modalPhone').value.trim();
        if (!fio || !phone) { alert('Заполните ФИО и телефон'); return; }
        
        orders.unshift({
            id: generateId(),
            fio, phone,
            address: document.getElementById('modalAddress').value,
            problem: document.getElementById('modalProblem').value,
            status: 'new',
            workerId: null,
            workerName: null,
            services: [],
            parts: [],
            total: 0,
            note: '',
            createdAt: Date.now()
        });
        await saveAll();
        alert('✅ Заказ создан!');
        close();
        renderAdmin();
    });
}

// ==================== МАСТЕР ====================
function renderWorker() {
    if (!currentUser) {
        showLoginModal('worker');
        return;
    }
    
    const myOrders = orders.filter(o => o.workerId === currentUser.id && o.status !== 'completed');
    const completed = orders.filter(o => o.workerId === currentUser.id && o.status === 'completed');
    const earned = completed.reduce((s,o) => s + (o.total || 0), 0);
    
    app.innerHTML = `
        <div class="app">
            <div class="header"><div class="header-left"><h1>🔧 ${escapeHtml(currentUser.name)}</h1></div><button class="btn-sm" id="logoutBtn" style="background:#ef4444;color:white;">Выйти</button></div>
            <div class="content">
                <div class="stats-card">
                    <div class="stats-value">${completed.length}</div><div class="stats-label">Выполнено</div>
                    <div class="stats-value">${earned} ₽</div><div class="stats-label">Заработано</div>
                </div>
                <h2>📋 Мои заказы (${myOrders.length})</h2>
                ${myOrders.map(o => `
                    <div class="order-card">
                        <strong>${escapeHtml(o.fio)}</strong><br>
                        📞 ${escapeHtml(o.phone)}<br>
                        📍 ${escapeHtml(o.address || '—')}<br>
                        💰 ${o.total || 0} ₽<br>
                        <button data-complete="${o.id}" class="btn-sm btn-success">✅ Завершить</button>
                    </div>
                `).join('')}
                ${myOrders.length === 0 ? '<div style="text-align:center;padding:2rem;">Нет активных заказов</div>' : ''}
            </div>
        </div>
    `;
    
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        currentRole = 'user';
        currentUser = null;
        window.location.hash = '';
        render();
    });
    
    document.querySelectorAll('[data-complete]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const order = orders.find(o => o.id === btn.dataset.complete);
            if (order && confirm('Завершить заказ?')) {
                order.status = 'completed';
                await saveAll();
                renderWorker();
            }
        });
    });
}

function getStatusText(status) {
    const map = { new: '🟡 Новый', calculated: '💰 Рассчитан', agreed: '✅ Согласован', assigned: '🔧 Назначен', completed: '🏁 Завершён' };
    return map[status] || status;
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
            <div id="loginError" style="color:red;display:none;"></div>
            <button class="btn-primary" id="submitLogin">Войти</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    const close = () => modal.remove();
    document.getElementById('closeModal')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    
    document.getElementById('submitLogin')?.addEventListener('click', () => {
        const login = document.getElementById('loginInput').value.trim();
        const password = document.getElementById('passwordInput').value;
        
        if (role === 'admin') {
            if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
                currentRole = 'admin';
                close();
                render();
            } else {
                const err = document.getElementById('loginError');
                err.style.display = 'block';
                err.textContent = 'Неверный логин или пароль админа';
            }
        } else {
            const worker = workers.find(w => w.login === login && w.password === password);
            if (worker) {
                currentRole = 'worker';
                currentUser = worker;
                close();
                render();
            } else {
                const err = document.getElementById('loginError');
                err.style.display = 'block';
                err.textContent = 'Неверный логин или пароль мастера';
            }
        }
    });
}

function checkHash() {
    const hash = window.location.hash;
    if (hash === '#admin' && currentRole === 'user') showLoginModal('admin');
    else if (hash === '#worker' && currentRole === 'user') showLoginModal('worker');
}

window.addEventListener('hashchange', () => { if (currentRole === 'user') checkHash(); });

// ==================== ЗАПУСК ====================
loadFromSupabase();
