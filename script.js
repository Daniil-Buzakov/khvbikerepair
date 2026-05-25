// ==================== SUPABASE КОНФИГУРАЦИЯ ====================
// ВАШИ ДАННЫЕ ИЗ SUPABASE
const SUPABASE_URL = 'https://sjmubbiqceluomzbwwzw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqbXVjYmlxY2VsdW9temJ3d3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwNjQwMDAsImV4cCI6MjA1MDY0MDAwMH0'; // ВСТАВЬТЕ ВАШ ПОЛНЫЙ КЛЮЧ!

// Проверяем, загрузилась ли библиотека Supabase
if (typeof supabase === 'undefined' && typeof window.supabase !== 'undefined') {
    var supabaseLib = window.supabase;
} else if (typeof supabase !== 'undefined') {
    var supabaseLib = supabase;
} else {
    console.error('❌ Supabase библиотека не загружена! Проверьте интернет и index.html');
    var supabaseLib = null;
}

// Создаем клиент
let supabaseClient = null;
if (supabaseLib) {
    try {
        supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase клиент создан!');
    } catch (e) {
        console.error('❌ Ошибка создания клиента:', e);
    }
} else {
    console.error('❌ Не удалось создать Supabase клиент');
}

// --- Роли пользователей ---
const ROLES = {
    USER: 'user',
    ADMIN: 'admin',
    WORKER: 'worker'
};

// --- Состояние приложения ---
let currentRole = ROLES.USER;
let orders = [];
let priceList = [];
let workers = [];
let currentUser = null;
let drawerOpen = false;
let showAuthModal = false;
let authError = '';
let authTargetRole = null;

// Данные для авторизации админа
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
    { id: 'w1', name: 'Алексей', phone: '+7 999 123-45-67', login: 'alexey', password: '123', ordersCount: 0, totalEarned: 0 },
    { id: 'w2', name: 'Дмитрий', phone: '+7 999 234-56-78', login: 'dmitry', password: '123', ordersCount: 0, totalEarned: 0 },
    { id: 'w3', name: 'Сергей', phone: '+7 999 345-67-89', login: 'sergey', password: '123', ordersCount: 0, totalEarned: 0 }
];

// Функции работы с Supabase
async function loadFromSupabase() {
    if (!supabaseClient) {
        console.log('⚠️ Supabase не доступен, используем localStorage');
        loadFromLocal();
        render();
        return;
    }
    
    console.log('🔄 Загрузка из Supabase...');
    
    try {
        // Загрузка заказов
        const { data: ordersData, error: ordersError } = await supabaseClient.from('orders').select('*');
        if (ordersError) throw ordersError;
        if (ordersData && ordersData.length > 0) orders = ordersData;
        console.log('✅ Заказов:', orders.length);
    } catch (err) {
        console.error('❌ Ошибка загрузки заказов:', err.message);
    }
    
    try {
        // Загрузка прайса
        const { data: pricesData, error: pricesError } = await supabaseClient.from('price_list').select('*');
        if (pricesError) throw pricesError;
        if (pricesData && pricesData.length > 0) priceList = pricesData;
        else if (priceList.length === 0) priceList = defaultPriceList;
        console.log('✅ Прайс:', priceList.length);
    } catch (err) {
        console.error('❌ Ошибка загрузки прайса:', err.message);
        if (priceList.length === 0) priceList = defaultPriceList;
    }
    
    try {
        // Загрузка работников
        const { data: workersData, error: workersError } = await supabaseClient.from('workers').select('*');
        if (workersError) throw workersError;
        if (workersData && workersData.length > 0) workers = workersData;
        else if (workers.length === 0) workers = defaultWorkers;
        console.log('✅ Работников:', workers.length);
    } catch (err) {
        console.error('❌ Ошибка загрузки работников:', err.message);
        if (workers.length === 0) workers = defaultWorkers;
    }
    
    render();
    checkUrlForAuth();
}

function loadFromLocal() {
    const storedOrders = localStorage.getItem('bike_orders_v2');
    const storedPrices = localStorage.getItem('bike_prices_v2');
    const storedWorkers = localStorage.getItem('bike_workers_v2');
    
    if (storedOrders) orders = JSON.parse(storedOrders);
    if (storedPrices) priceList = JSON.parse(storedPrices);
    if (storedWorkers) workers = JSON.parse(storedWorkers);
    
    if (orders.length === 0) orders = [];
    if (priceList.length === 0) priceList = defaultPriceList;
    if (workers.length === 0) workers = defaultWorkers;
}

async function saveToSupabase() {
    if (!supabaseClient) return;
    
    try {
        if (orders.length) {
            await supabaseClient.from('orders').upsert(orders, { onConflict: 'id' });
        }
        if (priceList.length) {
            await supabaseClient.from('price_list').upsert(priceList, { onConflict: 'id' });
        }
        if (workers.length) {
            await supabaseClient.from('workers').upsert(workers, { onConflict: 'id' });
        }
        console.log('✅ Данные сохранены в Supabase');
    } catch (err) {
        console.error('❌ Ошибка сохранения:', err);
    }
}

function saveToLocal() {
    localStorage.setItem('bike_orders_v2', JSON.stringify(orders));
    localStorage.setItem('bike_prices_v2', JSON.stringify(priceList));
    localStorage.setItem('bike_workers_v2', JSON.stringify(workers));
}

function saveAll() {
    saveToLocal();
    saveToSupabase();
}

function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

const appRoot = document.getElementById('app');

function closeModal() {
    showAuthModal = false;
    authTargetRole = null;
    const modal = document.getElementById('authModal');
    if (modal) modal.remove();
    render();
}

function showAuthModalFunc(role) {
    showAuthModal = true;
    authTargetRole = role;
    authError = '';
    renderAuthModal();
}

function renderAuthModal() {
    const oldModal = document.getElementById('authModal');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'authModal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>Вход в ${authTargetRole === ROLES.ADMIN ? 'Админ-панель' : 'Кабинет мастера'}</h3>
                <button class="modal-close" id="closeModalBtn">&times;</button>
            </div>
            ${authError ? `<div style="background:#fee; color:#c00; padding:0.5rem; border-radius:0.5rem; margin-bottom:1rem;">${authError}</div>` : ''}
            <div class="form-group">
                <label>Логин</label>
                <input type="text" id="authLogin" placeholder="Логин">
            </div>
            <div class="form-group">
                <label>Пароль</label>
                <input type="password" id="authPassword" placeholder="Пароль">
            </div>
            <button class="btn-primary" id="authSubmitBtn" style="width:100%;">Войти</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    
    document.getElementById('authSubmitBtn')?.addEventListener('click', () => {
        const login = document.getElementById('authLogin')?.value.trim();
        const password = document.getElementById('authPassword')?.value;
        
        if (authTargetRole === ROLES.ADMIN) {
            if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
                currentRole = ROLES.ADMIN;
                currentUser = null;
                closeModal();
                render();
            } else {
                authError = 'Неверный логин или пароль';
                renderAuthModal();
            }
        } else if (authTargetRole === ROLES.WORKER) {
            const worker = workers.find(w => w.login === login && w.password === password);
            if (worker) {
                currentRole = ROLES.WORKER;
                currentUser = worker;
                closeModal();
                render();
            } else {
                authError = 'Неверный логин или пароль';
                renderAuthModal();
            }
        }
    });
}

function logout() {
    currentRole = ROLES.USER;
    currentUser = null;
    window.location.hash = '';
    render();
}

function render() {
    if (currentRole === ROLES.USER) {
        renderUserPart();
    } else if (currentRole === ROLES.ADMIN) {
        renderAdminPart();
    } else if (currentRole === ROLES.WORKER) {
        renderWorkerPart();
    }
}

// ==================== ПОЛЬЗОВАТЕЛЬСКАЯ ЧАСТЬ ====================
function renderUserPart() {
    let html = `
        <div class="app">
            <div class="header">
                <div class="header-left">
                    <h1><span class="logo-icon">🚲</span> KHV Bike Repair</h1>
                </div>
            </div>
            <div class="content">
                <div class="hero">
                    <h1>🚲 Ремонт велосипедов с выездом на дом</h1>
                    <p>Профессиональный ремонт, настройка и обслуживание велосипедов в удобное для вас время</p>
                </div>
                
                <div class="services-grid">
                    <div class="service-card">
                        <div class="service-icon">🔧</div>
                        <h3>Диагностика</h3>
                        <p>Бесплатная диагностика неисправностей</p>
                    </div>
                    <div class="service-card">
                        <div class="service-icon">🛠️</div>
                        <h3>Любой ремонт</h3>
                        <p>От прокола до полной сборки велосипеда</p>
                    </div>
                    <div class="service-card">
                        <div class="service-icon">📦</div>
                        <h3>Выезд мастера</h3>
                        <p>Ремонтируем велосипеды у вас дома</p>
                    </div>
                </div>
                
                <div class="request-form">
                    <h2>📝 Оставить заявку на ремонт</h2>
                    <form id="requestForm">
                        <div class="form-group">
                            <label>ФИО *</label>
                            <input type="text" id="userFio" required placeholder="Иванов Иван Иванович">
                        </div>
                        <div class="form-group">
                            <label>Номер телефона *</label>
                            <input type="tel" id="userPhone" required placeholder="+7 999 123-45-67">
                        </div>
                        <div class="form-group">
                            <label>Адрес ремонта *</label>
                            <input type="text" id="userAddress" required placeholder="г. Москва, ул. Примерная, д.1, кв.2">
                        </div>
                        <div class="form-group">
                            <label>Желаемое время приезда мастера</label>
                            <input type="datetime-local" id="userDesiredTime">
                        </div>
                        <div class="form-group">
                            <label>Описание проблемы</label>
                            <textarea id="userProblem" placeholder="Опишите, что случилось с велосипедом..."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">Отправить заявку</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    appRoot.innerHTML = html;
    
    document.getElementById('requestForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fio = document.getElementById('userFio')?.value.trim();
        const phone = document.getElementById('userPhone')?.value.trim();
        const address = document.getElementById('userAddress')?.value.trim();
        const desiredTime = document.getElementById('userDesiredTime')?.value;
        const problem = document.getElementById('userProblem')?.value;
        
        if (!fio || !phone || !address) {
            alert('Заполните обязательные поля');
            return;
        }
        
        const newOrder = {
            id: generateId(),
            fio, phone, address,
            desiredTime, problem,
            status: 'pending',
            workerId: null, workerName: null,
            services: [], parts: [], total: 0,
            createdAt: Date.now()
        };
        
        orders.unshift(newOrder);
        saveAll();
        alert('Заявка отправлена!');
        document.getElementById('requestForm')?.reset();
        render();
    });
}

// ==================== АДМИНКА ====================
function renderAdminPart() {
    let html = `
        <div class="app">
            <div class="header">
                <div class="header-left">
                    <h1>👑 Админ панель</h1>
                </div>
                <button class="btn-sm" id="logoutBtn" style="background:#ef4444; color:white;">Выйти</button>
            </div>
            <div class="content">
                <h2>📋 Заказы (${orders.length})</h2>
                <button class="btn-primary" id="createTestOrder" style="margin-bottom: 1rem;">➕ Тестовый заказ</button>
                <div id="ordersList"></div>
            </div>
        </div>
    `;
    
    appRoot.innerHTML = html;
    
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('createTestOrder')?.addEventListener('click', () => {
        const testOrder = {
            id: generateId(),
            fio: 'Тестовый Клиент',
            phone: '+7 999 000-00-00',
            address: 'Тестовый адрес',
            status: 'pending',
            services: [], parts: [], total: 0,
            createdAt: Date.now()
        };
        orders.unshift(testOrder);
        saveAll();
        render();
    });
    
    const container = document.getElementById('ordersList');
    if (container) {
        if (orders.length === 0) {
            container.innerHTML = '<div style="padding:2rem; text-align:center;">Нет заказов</div>';
        } else {
            container.innerHTML = orders.map(order => `
                <div class="order-card">
                    <div class="order-header">
                        <strong>${escapeHtml(order.fio)}</strong>
                        <span class="order-status status-${order.status}">${order.status === 'pending' ? 'Новый' : order.status === 'in-progress' ? 'В работе' : 'Завершён'}</span>
                    </div>
                    <div>📞 ${escapeHtml(order.phone)}</div>
                    <div>📍 ${escapeHtml(order.address || '—')}</div>
                    <button class="btn-sm" data-delete="${order.id}" style="margin-top:0.5rem; background:#ef4444; color:white;">Удалить</button>
                </div>
            `).join('');
            
            document.querySelectorAll('[data-delete]').forEach(btn => {
                btn.addEventListener('click', () => {
                    orders = orders.filter(o => o.id !== btn.dataset.delete);
                    saveAll();
                    render();
                });
            });
        }
    }
}

// ==================== МАСТЕР ====================
function renderWorkerPart() {
    let workerOrders = orders.filter(o => o.workerId === currentUser?.id);
    
    let html = `
        <div class="app">
            <div class="header">
                <div class="header-left">
                    <h1>🔧 ${escapeHtml(currentUser?.name)}</h1>
                </div>
                <button class="btn-sm" id="logoutBtn" style="background:#ef4444; color:white;">Выйти</button>
            </div>
            <div class="content">
                <h2>📋 Мои заказы (${workerOrders.length})</h2>
                <div id="ordersList"></div>
            </div>
        </div>
    `;
    
    appRoot.innerHTML = html;
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    const container = document.getElementById('ordersList');
    if (container) {
        if (workerOrders.length === 0) {
            container.innerHTML = '<div style="padding:2rem; text-align:center;">Нет заказов</div>';
        } else {
            container.innerHTML = workerOrders.map(order => `
                <div class="order-card">
                    <strong>${escapeHtml(order.fio)}</strong>
                    <div>📞 ${escapeHtml(order.phone)}</div>
                    <div>📍 ${escapeHtml(order.address || '—')}</div>
                    <div>Статус: ${order.status === 'pending' ? 'Новый' : order.status === 'in-progress' ? 'В работе' : 'Завершён'}</div>
                    <div class="order-actions">
                        ${order.status !== 'completed' ? `<button class="btn-sm btn-success" data-complete="${order.id}">✅ Завершить</button>` : ''}
                        <button class="btn-sm" data-start="${order.id}">🔧 Начать</button>
                    </div>
                </div>
            `).join('');
            
            document.querySelectorAll('[data-complete]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const order = orders.find(o => o.id === btn.dataset.complete);
                    if (order) { order.status = 'completed'; saveAll(); render(); }
                });
            });
            document.querySelectorAll('[data-start]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const order = orders.find(o => o.id === btn.dataset.start);
                    if (order && order.status === 'pending') { order.status = 'in-progress'; saveAll(); render(); }
                });
            });
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function checkUrlForAuth() {
    const hash = window.location.hash;
    if (hash === '#admin') {
        setTimeout(() => showAuthModalFunc(ROLES.ADMIN), 500);
    } else if (hash === '#worker') {
        setTimeout(() => showAuthModalFunc(ROLES.WORKER), 500);
    }
}

window.addEventListener('hashchange', () => {
    if (currentRole === ROLES.USER) {
        checkUrlForAuth();
    }
});

// ==================== ЗАПУСК ====================
console.log('🚀 Запуск...');
loadFromSupabase();
