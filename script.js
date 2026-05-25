// ==================== SUPABASE НАСТРОЙКА ====================
const SUPABASE_URL = 'https://sjmubbiqceluomzbwwzw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2PVFcZgK_9TIR38CLZLf8w_dQ3R6aLn';

let supabaseClient = null;
let currentRole = 'user';
let currentUser = null;
let currentAdminTab = 'orders';
let orders = [];
let priceList = [];
let workers = [];

const ADMIN_LOGIN = 'DaniilBuzakov';
const ADMIN_PASSWORD = '123654123Aa@';

// Инициализация
try {
    if (typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase готов');
    }
} catch(e) { console.error(e); }

function generateId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 8); }

// Сохранение в localStorage
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

// Загрузка из Supabase - ИСПРАВЛЕНО: используем repair_orders
async function loadFromSupabase() {
    if (!supabaseClient) {
        loadFromLocal();
        render();
        return;
    }
    
    try {
        // Используем repair_orders вместо orders!
        const { data: o, error: ordersError } = await supabaseClient.from('repair_orders').select('*');
        if (ordersError) throw ordersError;
        if (o && o.length) {
            // Преобразуем поля из БД в формат приложения
            orders = o.map(item => ({
                id: item.id,
                fio: item.fio,
                phone: item.phone,
                address: item.address,
                desiredTime: item.desiredtime || item.desiredTime,
                problem: item.problem,
                status: item.status,
                workerId: item.workerid || item.workerId,
                workerName: item.workername || item.workerName,
                services: item.services || [],
                parts: item.parts || [],
                total: item.total || 0,
                note: item.note,
                createdAt: item.created_at
            }));
            console.log('✅ Заказов загружено:', orders.length);
        }
        
        const { data: p } = await supabaseClient.from('price_list').select('*');
        if (p && p.length) priceList = p;
        
        const { data: w } = await supabaseClient.from('workers').select('*');
        if (w && w.length) workers = w;
        
        saveToLocal();
    } catch(e) { 
        console.error('Ошибка загрузки:', e); 
        loadFromLocal(); 
    }
    render();
}

// Сохранение в Supabase - ИСПРАВЛЕНО: используем repair_orders
async function saveToSupabase() {
    if (!supabaseClient) return;
    try {
        // Сохраняем заказы в repair_orders
        for (const order of orders) {
            const repairOrder = {
                id: order.id,
                fio: order.fio,
                phone: order.phone,
                address: order.address || '',
                desiredtime: order.desiredTime || '',
                problem: order.problem || '',
                status: order.status || 'new',
                workerid: order.workerId || null,
                workername: order.workerName || null,
                services: order.services || [],
                parts: order.parts || [],
                total: order.total || 0,
                note: order.note || '',
                created_at: order.createdAt || Date.now()
            };
            
            const { error } = await supabaseClient.from('repair_orders').upsert(repairOrder);
            if (error) console.error('Order error:', error);
        }
        
        // Сохраняем прайс
        for (const item of priceList) {
            await supabaseClient.from('price_list').upsert(item);
        }
        
        // Сохраняем работников
        for (const worker of workers) {
            await supabaseClient.from('workers').upsert(worker);
        }
        
        console.log('✅ Сохранено в Supabase');
    } catch(e) { 
        console.error('Ошибка сохранения:', e); 
    }
}

function saveAll() {
    saveToLocal();
    saveToSupabase();
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
        
        orders.unshift({
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
        });
        await saveAll();
        alert('✅ Заявка отправлена!');
        document.getElementById('requestForm').reset();
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
            ${renderOrdersHtml(newOrders)}
            
            <h3>🔄 В работе (${inProgress.length})</h3>
            ${renderOrdersHtml(inProgress)}
            
            <h3>✅ Завершённые (${completed.length})</h3>
            ${renderOrdersHtml(completed)}
        `;
        
        document.getElementById('createOrderBtn')?.addEventListener('click', () => openCreateModal());
        attachOrderEvents();
        
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

function renderOrdersHtml(ordersList) {
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
            <div>💰 <input type="number" data-price="${order.id}" value="${order.total || 0}" style="width:80px;"> ₽</div>
            <div style="margin-top:0.5rem;">
                <select data-assign="${order.id}" class="btn-sm">
                    <option value="">Назначить мастера</option>
                    ${workers.map(w => `<option value="${w.id}" ${order.workerId === w.id ? 'selected' : ''}>${escapeHtml(w.name)}</option>`).join('')}
                </select>
                <select data-status="${order.id}" class="btn-sm">
                    <option value="new" ${order.status === 'new' ? 'selected' : ''}>🟡 Новый</option>
                    <option value="calculated" ${order.status === 'calculated' ? 'selected' : ''}>💰 Рассчитан</option>
                    <option value="agreed" ${order.status === 'agreed' ? 'selected' : ''}>✅ Согласован</option>
                    <option value="assigned" ${order.status === 'assigned' ? 'selected' : ''}>🔧 Назначен</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>🏁 Завершён</option>
                </select>
                <button data-delete="${order.id}" class="btn-sm" style="background:#ef4444;color:white;">🗑 Удалить</button>
            </div>
        </div>
    `).join('');
}

function attachOrderEvents() {
    document.querySelectorAll('[data-price]').forEach(inp => {
        inp.addEventListener('change', async (e) => {
            const order = orders.find(o => o.id === inp.dataset.price);
            if (order) {
                order.total = parseInt(e.target.value) || 0;
                await saveAll();
            }
        });
    });
    
    document.querySelectorAll('[data-assign]').forEach(select => {
        select.addEventListener('change', async (e) => {
            const order = orders.find(o => o.id === select.dataset.assign);
            if (order) {
                const worker = workers.find(w => w.id === e.target.value);
                order.workerId = e.target.value || null;
                order.workerName = worker?.name || null;
                await saveAll();
                renderAdmin();
            }
        });
    });
    
    document.querySelectorAll('[data-status]').forEach(select => {
        select.addEventListener('change', async (e) => {
            const order = orders.find(o => o.id === select.dataset.status);
            if (order) {
                order.status = e.target.value;
                await saveAll();
                renderAdmin();
            }
        });
    });
    
    document.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Удалить заказ?')) {
                orders = orders.filter(o => o.id !== btn.dataset.delete);
                await saveAll();
                renderAdmin();
            }
        });
    });
}

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
            <div id="loginError" style="color:red;display:none;">Неверный логин или пароль</div>
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
                document.getElementById('loginError').style.display = 'block';
                document.getElementById('loginError').textContent = 'Неверный логин или пароль админа';
            }
        } else {
            const worker = workers.find(w => w.login === login && w.password === password);
            if (worker) {
                currentRole = 'worker';
                currentUser = worker;
                close();
                render();
            } else {
                document.getElementById('loginError').style.display = 'block';
                document.getElementById('loginError').textContent = 'Неверный логин или пароль мастера';
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
console.log('🚀 Запуск приложения...');
loadFromSupabase();
