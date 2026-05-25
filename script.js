// ==================== SUPABASE НАСТРОЙКА ====================
const KHV_SUPABASE_URL = 'https://sjmubbiqceluomzbwwzw.supabase.co';
const KHV_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqbXVjYmlxY2VsdW9temJ3d3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwNjQwMDAsImV4cCI6MjA1MDY0MDAwMH0';

// Создаем Supabase клиент
let khvSupabase = null;

try {
    if (typeof window.supabase !== 'undefined') {
        khvSupabase = window.supabase.createClient(KHV_SUPABASE_URL, KHV_SUPABASE_KEY);
        console.log('✅ Supabase подключен!');
    } else {
        console.log('⚠️ Supabase не загружен, работаем локально');
    }
} catch(e) {
    console.error('❌ Ошибка Supabase:', e);
}

// ==================== ДАННЫЕ ====================
let currentRole = 'user';
let currentUser = null;
let currentAdminTab = 'orders'; // orders, price, workers, stats
let orders = [];
let priceList = [];
let workers = [];

// Админ данные
const ADMIN_LOGIN = 'DaniilBuzakov';
const ADMIN_PASSWORD = '123654123Aa@';

// Начальные данные
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

// ==================== ФУНКЦИИ ====================
function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 8);
}

function saveToLocal() {
    try {
        localStorage.setItem('khv_orders', JSON.stringify(orders));
        localStorage.setItem('khv_prices', JSON.stringify(priceList));
        localStorage.setItem('khv_workers', JSON.stringify(workers));
        console.log('💾 Сохранено в localStorage');
    } catch(e) { console.error('Ошибка сохранения:', e); }
}

function loadFromLocal() {
    try {
        const savedOrders = localStorage.getItem('khv_orders');
        const savedPrices = localStorage.getItem('khv_prices');
        const savedWorkers = localStorage.getItem('khv_workers');
        
        orders = savedOrders ? JSON.parse(savedOrders) : [];
        priceList = savedPrices ? JSON.parse(savedPrices) : defaultPriceList;
        workers = savedWorkers ? JSON.parse(savedWorkers) : defaultWorkers;
        console.log('📂 Загружено из localStorage:', orders.length, 'заказов');
    } catch(e) { console.error('Ошибка загрузки:', e); }
}

async function saveToSupabase() {
    if (!khvSupabase) return;
    try {
        if (orders.length) await khvSupabase.from('orders').upsert(orders);
        if (priceList.length) await khvSupabase.from('price_list').upsert(priceList);
        if (workers.length) await khvSupabase.from('workers').upsert(workers);
        console.log('☁️ Сохранено в Supabase');
    } catch(e) { console.error('Ошибка Supabase:', e); }
}

async function loadFromSupabase() {
    if (!khvSupabase) {
        loadFromLocal();
        render();
        return;
    }
    
    try {
        const { data: o } = await khvSupabase.from('orders').select('*');
        if (o && o.length) orders = o;
        
        const { data: p } = await khvSupabase.from('price_list').select('*');
        if (p && p.length) priceList = p;
        else if (priceList.length === 0) priceList = defaultPriceList;
        
        const { data: w } = await khvSupabase.from('workers').select('*');
        if (w && w.length) workers = w;
        else if (workers.length === 0) workers = defaultWorkers;
        
        console.log('☁️ Загружено из Supabase:', orders.length, 'заказов');
    } catch(e) {
        console.error('Ошибка Supabase:', e);
        loadFromLocal();
    }
    render();
    checkHash();
}

function saveAll() {
    saveToLocal();
    saveToSupabase();
}

// ==================== UI ====================
const appElement = document.getElementById('app');

function render() {
    if (!appElement) return;
    
    if (currentRole === 'user') renderUser();
    else if (currentRole === 'admin') renderAdmin();
    else if (currentRole === 'worker') renderWorker();
}

function renderUser() {
    appElement.innerHTML = `
        <div class="app">
            <div class="header">
                <div class="header-left">
                    <h1>🚲 KHV Bike Repair</h1>
                </div>
            </div>
            <div class="content">
                <div class="hero">
                    <h1>🚲 Ремонт велосипедов с выездом на дом</h1>
                    <p>Профессиональный ремонт, настройка и обслуживание</p>
                </div>
                
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
    
    const form = document.getElementById('requestForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const fio = document.getElementById('fio').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const address = document.getElementById('address').value.trim();
            
            if (!fio || !phone || !address) {
                alert('Заполните ФИО, телефон и адрес');
                return;
            }
            
            const newOrder = {
                id: generateId(),
                fio, phone, address,
                desiredTime: document.getElementById('time').value,
                problem: document.getElementById('problem').value,
                status: 'pending',
                workerId: null,
                workerName: null,
                services: [],
                parts: [],
                total: 0,
                createdAt: Date.now()
            };
            
            orders.unshift(newOrder);
            saveAll();
            alert('✅ Заявка отправлена! Ожидайте звонка мастера.');
            form.reset();
        });
    }
}

function renderAdmin() {
    let content = '';
    
    // Рендерим контент в зависимости от выбранной вкладки
    if (currentAdminTab === 'orders') {
        content = renderOrdersTab();
    } else if (currentAdminTab === 'price') {
        content = renderPriceTab();
    } else if (currentAdminTab === 'workers') {
        content = renderWorkersTab();
    } else if (currentAdminTab === 'stats') {
        content = renderStatsTab();
    }
    
    appElement.innerHTML = `
        <div class="app">
            <div class="header">
                <div class="header-left">
                    <button class="menu-btn" id="menuButton">☰</button>
                    <h1>👑 Админ панель</h1>
                </div>
                <button class="btn-sm" id="logoutBtn" style="background:#ef4444; color:white;">Выйти</button>
            </div>
            
            <!-- Меню админки -->
            <div class="admin-menu">
                <button class="admin-menu-btn ${currentAdminTab === 'orders' ? 'active' : ''}" data-tab="orders">📋 Заказы</button>
                <button class="admin-menu-btn ${currentAdminTab === 'price' ? 'active' : ''}" data-tab="price">💰 Прайс-лист</button>
                <button class="admin-menu-btn ${currentAdminTab === 'workers' ? 'active' : ''}" data-tab="workers">👨‍🔧 Работники</button>
                <button class="admin-menu-btn ${currentAdminTab === 'stats' ? 'active' : ''}" data-tab="stats">📊 Статистика</button>
            </div>
            
            <div class="content">
                ${content}
            </div>
        </div>
    `;
    
    // Обработчики для меню
    document.querySelectorAll('.admin-menu-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentAdminTab = btn.dataset.tab;
            render();
        });
    });
    
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        currentRole = 'user';
        currentUser = null;
        window.location.hash = '';
        render();
    });
    
    // Обработчики для кнопок внутри вкладок
    if (currentAdminTab === 'orders') attachOrdersEvents();
    if (currentAdminTab === 'price') attachPriceEvents();
    if (currentAdminTab === 'workers') attachWorkersEvents();
}

function renderOrdersTab() {
    return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h2>📋 Заказы (${orders.length})</h2>
            <button class="btn-primary" id="addTestOrder">➕ Тестовый заказ</button>
        </div>
        <div id="ordersList"></div>
    `;
}

function renderPriceTab() {
    return `
        <h2>💰 Прайс-лист</h2>
        <div class="form-card" style="margin-bottom: 1rem;">
            <div class="form-group"><label>Название услуги</label><input type="text" id="newPriceName" placeholder="Например: Замена камеры"></div>
            <div class="form-group"><label>Цена (₽)</label><input type="number" id="newPriceCost" placeholder="500"></div>
            <button class="btn-primary" id="addPriceBtn">➕ Добавить услугу</button>
        </div>
        <div id="priceListContainer"></div>
    `;
}

function renderWorkersTab() {
    return `
        <h2>👨‍🔧 Работники</h2>
        <div class="form-card" style="margin-bottom: 1rem;">
            <div class="form-group"><label>Имя мастера</label><input type="text" id="newWorkerName" placeholder="Имя"></div>
            <div class="form-group"><label>Телефон</label><input type="text" id="newWorkerPhone" placeholder="+7 XXX XXX-XX-XX"></div>
            <div class="form-group"><label>Логин</label><input type="text" id="newWorkerLogin" placeholder="Логин для входа"></div>
            <div class="form-group"><label>Пароль</label><input type="password" id="newWorkerPassword" placeholder="Пароль"></div>
            <button class="btn-primary" id="addWorkerBtn">➕ Добавить мастера</button>
        </div>
        <div id="workersListContainer"></div>
    `;
}

function renderStatsTab() {
    const now = new Date();
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayEnd = new Date();
    todayEnd.setHours(23,59,59,999);
    
    const todayOrders = orders.filter(o => o.createdAt >= today.getTime() && o.createdAt <= todayEnd.getTime());
    const todaySum = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const activeOrders = orders.filter(o => o.status !== 'completed').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    
    const workerStats = workers.map(worker => {
        const workerOrders = orders.filter(o => o.workerId === worker.id && o.status === 'completed');
        const earned = workerOrders.reduce((sum, o) => sum + o.total, 0);
        return { ...worker, completedCount: workerOrders.length, earned };
    });
    
    return `
        <h2>📊 Статистика</h2>
        <div class="stats-grid">
            <div class="stats-card">
                <div class="stats-value">${orders.length}</div>
                <div class="stats-label">Всего заказов</div>
            </div>
            <div class="stats-card">
                <div class="stats-value">${activeOrders}</div>
                <div class="stats-label">Активных</div>
            </div>
            <div class="stats-card">
                <div class="stats-value">${completedOrders}</div>
                <div class="stats-label">Завершённых</div>
            </div>
            <div class="stats-card">
                <div class="stats-value">${todayOrders.length}</div>
                <div class="stats-label">Заказов сегодня</div>
            </div>
        </div>
        <div class="stats-card full-width" style="margin-top: 1rem;">
            <div class="stats-value">${todaySum} ₽</div>
            <div class="stats-label">Выручка сегодня</div>
        </div>
        
        <h3 style="margin-top: 2rem;">📊 Статистика по работникам</h3>
        ${workerStats.map(w => `
            <div class="worker-stats-card">
                <strong>${escapeHtml(w.name)}</strong>
                <div>✅ Завершённых заказов: ${w.completedCount}</div>
                <div>💰 Заработано: ${w.earned} ₽</div>
                <div>📞 ${escapeHtml(w.phone)}</div>
            </div>
        `).join('')}
    `;
}

function attachOrdersEvents() {
    document.getElementById('addTestOrder')?.addEventListener('click', () => {
        orders.unshift({
            id: generateId(),
            fio: 'Тестовый Клиент',
            phone: '+7 999 000-00-00',
            address: 'Тестовый адрес',
            problem: 'Тестовая заявка',
            status: 'pending',
            services: [],
            parts: [],
            total: 0,
            createdAt: Date.now()
        });
        saveAll();
        render();
    });
    
    const container = document.getElementById('ordersList');
    if (container) {
        if (orders.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:2rem; color:#888;">Нет заказов. Создайте тестовый заказ</div>';
        } else {
            container.innerHTML = orders.map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <strong>${escapeHtml(order.fio)}</strong>
                        <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
                    </div>
                    <div>📞 ${escapeHtml(order.phone)}</div>
                    <div>📍 ${escapeHtml(order.address || '—')}</div>
                    <div>📅 ${order.desiredTime ? new Date(order.desiredTime).toLocaleString() : 'время не указано'}</div>
                    ${order.problem ? `<div class="order-problem">📝 ${escapeHtml(order.problem)}</div>` : ''}
                    <div style="margin-top: 0.5rem;">
                        <select data-assign="${order.id}" class="btn-sm">
                            <option value="">👨‍🔧 Назначить мастера</option>
                            ${workers.map(w => `<option value="${w.id}" ${order.workerId === w.id ? 'selected' : ''}>${escapeHtml(w.name)}</option>`).join('')}
                        </select>
                        <button data-delete="${order.id}" class="btn-sm" style="background:#ef4444; color:white; margin-left:0.5rem;">🗑 Удалить</button>
                    </div>
                </div>
            `).join('');
            
            document.querySelectorAll('[data-assign]').forEach(select => {
                select.addEventListener('change', (e) => {
                    const order = orders.find(o => o.id === select.dataset.assign);
                    if (order) {
                        const worker = workers.find(w => w.id === e.target.value);
                        order.workerId = worker?.id || null;
                        order.workerName = worker?.name || null;
                        saveAll();
                        render();
                    }
                });
            });
            
            document.querySelectorAll('[data-delete]').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (confirm('Удалить заказ?')) {
                        orders = orders.filter(o => o.id !== btn.dataset.delete);
                        saveAll();
                        render();
                    }
                });
            });
        }
    }
}

function attachPriceEvents() {
    document.getElementById('addPriceBtn')?.addEventListener('click', () => {
        const name = document.getElementById('newPriceName')?.value.trim();
        const price = parseInt(document.getElementById('newPriceCost')?.value);
        if (!name || isNaN(price) || price <= 0) {
            alert('Введите название и цену');
            return;
        }
        priceList.push({ id: generateId(), name, price });
        saveAll();
        render();
    });
    
    const container = document.getElementById('priceListContainer');
    if (container) {
        container.innerHTML = priceList.map(item => `
            <div class="price-item">
                <span><strong>${escapeHtml(item.name)}</strong> — ${item.price} ₽</span>
                <button data-delprice="${item.id}" class="btn-sm" style="background:#ef4444; color:white;">Удалить</button>
            </div>
        `).join('');
        
        document.querySelectorAll('[data-delprice]').forEach(btn => {
            btn.addEventListener('click', () => {
                priceList = priceList.filter(p => p.id !== btn.dataset.delprice);
                saveAll();
                render();
            });
        });
    }
}

function attachWorkersEvents() {
    document.getElementById('addWorkerBtn')?.addEventListener('click', () => {
        const name = document.getElementById('newWorkerName')?.value.trim();
        const phone = document.getElementById('newWorkerPhone')?.value.trim();
        const login = document.getElementById('newWorkerLogin')?.value.trim();
        const password = document.getElementById('newWorkerPassword')?.value;
        
        if (!name || !phone || !login || !password) {
            alert('Заполните все поля');
            return;
        }
        
        workers.push({
            id: generateId(),
            name, phone, login, password
        });
        saveAll();
        render();
    });
    
    const container = document.getElementById('workersListContainer');
    if (container) {
        container.innerHTML = workers.map(worker => `
            <div class="worker-card">
                <strong>${escapeHtml(worker.name)}</strong>
                <div>📞 ${escapeHtml(worker.phone)}</div>
                <div>🔑 Логин: ${escapeHtml(worker.login)}</div>
                <button data-delworker="${worker.id}" class="btn-sm" style="background:#ef4444; color:white; margin-top:0.5rem;">Удалить</button>
            </div>
        `).join('');
        
        document.querySelectorAll('[data-delworker]').forEach(btn => {
            btn.addEventListener('click', () => {
                workers = workers.filter(w => w.id !== btn.dataset.delworker);
                saveAll();
                render();
            });
        });
    }
}

function renderWorker() {
    const workerOrders = orders.filter(o => o.workerId === currentUser?.id);
    const completedCount = workerOrders.filter(o => o.status === 'completed').length;
    const totalEarned = workerOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0);
    
    appElement.innerHTML = `
        <div class="app">
            <div class="header">
                <div class="header-left">
                    <h1>🔧 ${escapeHtml(currentUser?.name)}</h1>
                </div>
                <button class="btn-sm" id="logoutBtn" style="background:#ef4444; color:white;">Выйти</button>
            </div>
            <div class="content">
                <div class="stats-card" style="margin-bottom: 1rem;">
                    <div class="stats-value">${completedCount}</div>
                    <div class="stats-label">Завершённых заказов</div>
                    <div class="stats-value">${totalEarned} ₽</div>
                    <div class="stats-label">Заработано</div>
                </div>
                <h2>📋 Мои заказы (${workerOrders.length})</h2>
                <div id="ordersList"></div>
            </div>
        </div>
    `;
    
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        currentRole = 'user';
        currentUser = null;
        window.location.hash = '';
        render();
    });
    
    const container = document.getElementById('ordersList');
    if (container) {
        if (workerOrders.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:2rem; color:#888;">Нет назначенных заказов</div>';
        } else {
            container.innerHTML = workerOrders.map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <strong>${escapeHtml(order.fio)}</strong>
                        <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
                    </div>
                    <div>📞 ${escapeHtml(order.phone)}</div>
                    <div>📍 ${escapeHtml(order.address || '—')}</div>
                    <div>📅 ${order.desiredTime ? new Date(order.desiredTime).toLocaleString() : 'время не указано'}</div>
                    ${order.problem ? `<div class="order-problem">📝 ${escapeHtml(order.problem)}</div>` : ''}
                    <div class="order-actions">
                        ${order.status === 'pending' ? `<button data-start="${order.id}" class="btn-sm">🔧 Начать работу</button>` : ''}
                        ${order.status === 'in-progress' ? `<button data-complete="${order.id}" class="btn-sm btn-success">✅ Завершить заказ</button>` : ''}
                    </div>
                </div>
            `).join('');
            
            document.querySelectorAll('[data-start]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const order = orders.find(o => o.id === btn.dataset.start);
                    if (order) { 
                        order.status = 'in-progress'; 
                        saveAll(); 
                        render(); 
                    }
                });
            });
            
            document.querySelectorAll('[data-complete]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const order = orders.find(o => o.id === btn.dataset.complete);
                    if (order && confirm('Завершить заказ?')) { 
                        order.status = 'completed'; 
                        saveAll(); 
                        render(); 
                    }
                });
            });
        }
    }
}

function getStatusText(status) {
    const map = { pending: '🟡 Новый', 'in-progress': '🔵 В работе', completed: '✅ Завершён' };
    return map[status] || status;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function showLoginModal(role) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'loginModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 350px;">
            <div class="modal-header">
                <h3>Вход в ${role === 'admin' ? 'Админ-панель' : 'Кабинет мастера'}</h3>
                <button class="modal-close" id="closeModal">&times;</button>
            </div>
            <div class="form-group"><label>Логин</label><input type="text" id="loginInput" placeholder="Логин"></div>
            <div class="form-group"><label>Пароль</label><input type="password" id="passwordInput" placeholder="Пароль"></div>
            <button class="btn-primary" id="submitLogin" style="width:100%;">Войти</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    const closeModal = () => modal.remove();
    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    
    document.getElementById('submitLogin')?.addEventListener('click', () => {
        const login = document.getElementById('loginInput').value.trim();
        const password = document.getElementById('passwordInput').value;
        
        if (role === 'admin') {
            if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
                currentRole = 'admin';
                currentUser = null;
                currentAdminTab = 'orders';
                closeModal();
                render();
            } else {
                alert('❌ Неверный логин или пароль');
            }
        } else if (role === 'worker') {
            const worker = workers.find(w => w.login === login && w.password === password);
            if (worker) {
                currentRole = 'worker';
                currentUser = worker;
                closeModal();
                render();
            } else {
                alert('❌ Неверный логин или пароль');
            }
        }
    });
}

function checkHash() {
    const hash = window.location.hash;
    if (hash === '#admin' && currentRole === 'user') {
        showLoginModal('admin');
    } else if (hash === '#worker' && currentRole === 'user') {
        showLoginModal('worker');
    }
}

// ==================== ЗАПУСК ====================
window.addEventListener('hashchange', () => {
    if (currentRole === 'user') checkHash();
});

// Стартуем приложение
loadFromLocal();
render();
checkHash();
