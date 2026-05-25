// ==================== SUPABASE ВЕРСИЯ (синхронизация между устройствами) ====================
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

const defaultPriceList = [
    { id: 'p1', name: 'Замена камеры', price: 500 },
    { id: 'p2', name: 'Настройка переключателей', price: 700 },
    { id: 'p3', name: 'Замена тормозных колодок', price: 600 },
    { id: 'p4', name: 'Смазка цепи', price: 300 },
    { id: 'p5', name: 'Ремонт колеса', price: 900 },
    { id: 'p6', name: 'Диагностика', price: 500 }
];

const defaultWorkers = [
    { id: 'w1', name: 'Алексей', phone: '+7 999 123-45-67', login: 'alexey', password: '123' },
    { id: 'w2', name: 'Дмитрий', phone: '+7 999 234-56-78', login: 'dmitry', password: '123' },
    { id: 'w3', name: 'Сергей', phone: '+7 999 345-67-89', login: 'sergey', password: '123' }
];

function generateId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 8); }

// Инициализация Supabase
try {
    if (typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase подключен');
    }
} catch(e) { console.error('Supabase error:', e); }

// Загрузка из Supabase
async function loadFromSupabase() {
    if (!supabaseClient) { loadFromLocal(); render(); return; }
    
    try {
        const { data: o } = await supabaseClient.from('orders').select('*');
        if (o && o.length) orders = o;
        
        const { data: p } = await supabaseClient.from('price_list').select('*');
        if (p && p.length) priceList = p;
        else if (priceList.length === 0) priceList = defaultPriceList;
        
        const { data: w } = await supabaseClient.from('workers').select('*');
        if (w && w.length) workers = w;
        else if (workers.length === 0) workers = defaultWorkers;
        
        console.log('✅ Загружено из Supabase:', orders.length, 'заказов');
    } catch(e) { console.error('Ошибка загрузки:', e); loadFromLocal(); }
    render();
    checkHash();
}

async function saveToSupabase() {
    if (!supabaseClient) return;
    try {
        if (orders.length) await supabaseClient.from('orders').upsert(orders);
        if (priceList.length) await supabaseClient.from('price_list').upsert(priceList);
        if (workers.length) await supabaseClient.from('workers').upsert(workers);
        console.log('✅ Сохранено в Supabase');
    } catch(e) { console.error('Ошибка сохранения:', e); }
}

function saveToLocal() {
    localStorage.setItem('khv_orders', JSON.stringify(orders));
    localStorage.setItem('khv_prices', JSON.stringify(priceList));
    localStorage.setItem('khv_workers', JSON.stringify(workers));
}

function loadFromLocal() {
    orders = JSON.parse(localStorage.getItem('khv_orders') || '[]');
    priceList = JSON.parse(localStorage.getItem('khv_prices') || JSON.stringify(defaultPriceList));
    workers = JSON.parse(localStorage.getItem('khv_workers') || JSON.stringify(defaultWorkers));
}

function saveAll() {
    saveToLocal();
    saveToSupabase();
}

// Остальной код такой же как в предыдущей версии...
// (функции renderUser, renderAdmin, renderWorker - те же самые)

const app = document.getElementById('app');

function render() {
    if (currentRole === 'user') renderUser();
    else if (currentRole === 'admin') renderAdmin();
    else if (currentRole === 'worker') renderWorker();
}

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
            status: 'pending', workerId: null, workerName: null,
            services: [], parts: [], total: 0, createdAt: Date.now()
        });
        saveAll();
        alert('✅ Заявка отправлена!');
        document.getElementById('requestForm').reset();
    });
}

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
        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:1rem;"><h2>📋 Заказы (${orders.length})</h2><button class="btn-primary" id="addTestOrder">➕ Тестовый</button></div>
            <div id="ordersList">${orders.map(o => `
                <div class="order-card">
                    <div class="order-header"><strong>${escapeHtml(o.fio)}</strong><span class="order-status status-${o.status}">${getStatus(o.status)}</span></div>
                    <div>📞 ${escapeHtml(o.phone)}</div>
                    <div>📍 ${escapeHtml(o.address || '—')}</div>
                    ${o.problem ? `<div class="order-problem">📝 ${escapeHtml(o.problem)}</div>` : ''}
                    <div style="margin-top:0.5rem;">
                        <select data-assign="${o.id}" class="btn-sm"><option value="">Назначить мастера</option>${workers.map(w => `<option value="${w.id}" ${o.workerId === w.id ? 'selected' : ''}>${escapeHtml(w.name)}</option>`).join('')}</select>
                        <button data-delete="${o.id}" class="btn-sm" style="background:#ef4444;color:white;">Удалить</button>
                    </div>
                </div>
            `).join('')}</div>
        `;
        document.getElementById('addTestOrder')?.addEventListener('click', () => {
            orders.unshift({ id: generateId(), fio: 'Тестовый Клиент', phone: '+7 999 000-00-00', address: 'Тестовый адрес', status: 'pending', services: [], parts: [], total: 0, createdAt: Date.now() });
            saveAll(); renderAdmin();
        });
        document.querySelectorAll('[data-assign]').forEach(s => s.addEventListener('change', (e) => {
            const order = orders.find(o => o.id === s.dataset.assign);
            if (order) { order.workerId = e.target.value || null; order.workerName = workers.find(w => w.id === e.target.value)?.name; saveAll(); renderAdmin(); }
        }));
        document.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => { orders = orders.filter(o => o.id !== b.dataset.delete); saveAll(); renderAdmin(); }));
    }
    else if (currentAdminTab === 'price') {
        content.innerHTML = `
            <h2>💰 Прайс-лист</h2>
            <div class="form-card"><div class="form-group"><label>Название</label><input id="newPriceName"></div><div class="form-group"><label>Цена</label><input id="newPriceCost" type="number"></div><button class="btn-primary" id="addPriceBtn">➕ Добавить</button></div>
            <div id="priceList">${priceList.map(p => `<div class="price-item"><span><strong>${escapeHtml(p.name)}</strong> — ${p.price} ₽</span><button data-del="${p.id}" class="btn-sm" style="background:#ef4444;color:white;">Удалить</button></div>`).join('')}</div>
        `;
        document.getElementById('addPriceBtn')?.addEventListener('click', () => {
            const name = document.getElementById('newPriceName').value.trim();
            const price = parseInt(document.getElementById('newPriceCost').value);
            if (name && price > 0) { priceList.push({ id: generateId(), name, price }); saveAll(); renderAdmin(); }
            else alert('Введите название и цену');
        });
        document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { priceList = priceList.filter(p => p.id !== b.dataset.del); saveAll(); renderAdmin(); }));
    }
    else if (currentAdminTab === 'workers') {
        content.innerHTML = `
            <h2>👨‍🔧 Работники</h2>
            <div class="form-card"><div class="form-group"><label>Имя</label><input id="newWorkerName"></div><div class="form-group"><label>Телефон</label><input id="newWorkerPhone"></div><div class="form-group"><label>Логин</label><input id="newWorkerLogin"></div><div class="form-group"><label>Пароль</label><input id="newWorkerPassword" type="password"></div><button class="btn-primary" id="addWorkerBtn">➕ Добавить</button></div>
            <div id="workersList">${workers.map(w => `<div class="worker-card"><strong>${escapeHtml(w.name)}</strong><br>📞 ${escapeHtml(w.phone)}<br>🔑 ${escapeHtml(w.login)}<br><button data-del="${w.id}" class="btn-sm" style="background:#ef4444;color:white;margin-top:0.5rem;">Удалить</button></div>`).join('')}</div>
        `;
        document.getElementById('addWorkerBtn')?.addEventListener('click', () => {
            const name = document.getElementById('newWorkerName').value.trim();
            const phone = document.getElementById('newWorkerPhone').value.trim();
            const login = document.getElementById('newWorkerLogin').value.trim();
            const password = document.getElementById('newWorkerPassword').value;
            if (name && phone && login && password) { workers.push({ id: generateId(), name, phone, login, password }); saveAll(); renderAdmin(); }
            else alert('Заполните все поля');
        });
        document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { workers = workers.filter(w => w.id !== b.dataset.del); saveAll(); renderAdmin(); }));
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

function renderWorker() {
    const myOrders = orders.filter(o => o.workerId === currentUser?.id);
    const completed = myOrders.filter(o => o.status === 'completed').length;
    const earned = myOrders.filter(o => o.status === 'completed').reduce((s,o) => s + o.total, 0);
    
    app.innerHTML = `
        <div class="app">
            <div class="header"><div class="header-left"><h1>🔧 ${escapeHtml(currentUser?.name)}</h1></div><button class="btn-sm" id="logoutBtn" style="background:#ef4444;color:white;">Выйти</button></div>
            <div class="content">
                <div class="stats-card"><div class="stats-value">${completed}</div><div class="stats-label">Завершённых</div><div class="stats-value">${earned} ₽</div><div class="stats-label">Заработано</div></div>
                <h2>📋 Мои заказы (${myOrders.length})</h2>
                <div id="ordersList">${myOrders.map(o => `
                    <div class="order-card">
                        <div class="order-header"><strong>${escapeHtml(o.fio)}</strong><span class="order-status status-${o.status}">${getStatus(o.status)}</span></div>
                        <div>📞 ${escapeHtml(o.phone)}</div>
                        <div>📍 ${escapeHtml(o.address || '—')}</div>
                        ${o.problem ? `<div class="order-problem">📝 ${escapeHtml(o.problem)}</div>` : ''}
                        <div class="order-actions">
                            ${o.status === 'pending' ? `<button data-start="${o.id}" class="btn-sm">🔧 Начать</button>` : ''}
                            ${o.status === 'in-progress' ? `<button data-complete="${o.id}" class="btn-sm btn-success">✅ Завершить</button>` : ''}
                        </div>
                    </div>
                `).join('')}</div>
            </div>
        </div>
    `;
    
    document.getElementById('logoutBtn')?.addEventListener('click', () => { currentRole = 'user'; currentUser = null; window.location.hash = ''; render(); });
    document.querySelectorAll('[data-start]').forEach(b => b.addEventListener('click', () => { const o = orders.find(o => o.id === b.dataset.start); if(o) { o.status = 'in-progress'; saveAll(); renderWorker(); } }));
    document.querySelectorAll('[data-complete]').forEach(b => b.addEventListener('click', () => { const o = orders.find(o => o.id === b.dataset.complete); if(o && confirm('Завершить?')) { o.status = 'completed'; saveAll(); renderWorker(); } }));
}

function getStatus(s) {
    const map = { pending: '🟡 Новый', 'in-progress': '🔵 В работе', completed: '✅ Завершён' };
    return map[s] || s;
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

// Запуск
loadFromSupabase();
