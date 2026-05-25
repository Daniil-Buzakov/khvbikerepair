// ==================== SUPABASE КОНФИГУРАЦИЯ ====================
const SUPABASE_URL = 'https://sjmubbiqceluomzbwwzw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bqoiJCZkj7A_32LW49zfUg_xD8tS29A'; // Вставьте ваш ПОЛНЫЙ ключ

// Создаем клиент Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Проверка подключения ---
console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase Key:', SUPABASE_KEY ? 'Есть (не показываем)' : 'НЕТ!');

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
let currentAdminSection = 'orders';

// Данные для авторизации
const ADMIN_LOGIN = 'DaniilBuzakov';
const ADMIN_PASSWORD = '123654123Aa@';

// Функции загрузки из Supabase
async function loadOrdersFromSupabase() {
    try {
        const { data, error } = await supabase.from('orders').select('*');
        if (error) throw error;
        if (data) orders = data;
        console.log('✅ Заказы загружены из Supabase:', orders.length);
    } catch (err) {
        console.error('❌ Ошибка загрузки заказов:', err);
    }
}

async function loadPriceListFromSupabase() {
    try {
        const { data, error } = await supabase.from('price_list').select('*');
        if (error) throw error;
        if (data) priceList = data;
        console.log('✅ Прайс загружен из Supabase:', priceList.length);
    } catch (err) {
        console.error('❌ Ошибка загрузки прайса:', err);
    }
}

async function loadWorkersFromSupabase() {
    try {
        const { data, error } = await supabase.from('workers').select('*');
        if (error) throw error;
        if (data) workers = data;
        console.log('✅ Работники загружены из Supabase:', workers.length);
    } catch (err) {
        console.error('❌ Ошибка загрузки работников:', err);
    }
}

// Функции сохранения в Supabase
async function saveOrdersToSupabase() {
    try {
        const { error } = await supabase.from('orders').upsert(orders, { onConflict: 'id' });
        if (error) throw error;
        console.log('✅ Заказы сохранены в Supabase');
    } catch (err) {
        console.error('❌ Ошибка сохранения заказов:', err);
    }
}

async function savePriceListToSupabase() {
    try {
        const { error } = await supabase.from('price_list').upsert(priceList, { onConflict: 'id' });
        if (error) throw error;
        console.log('✅ Прайс сохранен в Supabase');
    } catch (err) {
        console.error('❌ Ошибка сохранения прайса:', err);
    }
}

async function saveWorkersToSupabase() {
    try {
        const { error } = await supabase.from('workers').upsert(workers, { onConflict: 'id' });
        if (error) throw error;
        console.log('✅ Работники сохранены в Supabase');
    } catch (err) {
        console.error('❌ Ошибка сохранения работников:', err);
    }
}

// Переопределяем функции сохранения
function saveOrders() {
    localStorage.setItem('bike_orders_v2', JSON.stringify(orders));
    saveOrdersToSupabase();
}

function savePrices() {
    localStorage.setItem('bike_prices_v2', JSON.stringify(priceList));
    savePriceListToSupabase();
}

function saveWorkers() {
    localStorage.setItem('bike_workers_v2', JSON.stringify(workers));
    saveWorkersToSupabase();
}

// Функции загрузки
async function loadAllData() {
    console.log('🔄 Загрузка данных из Supabase...');
    await Promise.all([
        loadOrdersFromSupabase(),
        loadPriceListFromSupabase(),
        loadWorkersFromSupabase()
    ]);
    console.log('✅ Все данные загружены');
    render();
    checkUrlForAuth();
}

// Начальные данные (если Supabase пуст)
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

// Загрузка резервная из localStorage
function loadDataFromLocal() {
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

function generateId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 6); }

// --- Состояние UI ---
let currentSection = 'hero';
let currentFilter = 'all';
let statsMode = 'today';
let customStart = '', customEnd = '';
let drawerOpen = false;
let isModalOpen = false;
let editingOrder = null;
let showAuthModal = false;
let authError = '';
let authTargetRole = null;

const appRoot = document.getElementById('app');

function toggleDrawer(open) { drawerOpen = open; render(); }
function setSection(section) { 
    if (currentRole === ROLES.ADMIN) {
        currentAdminSection = section;
    }
    currentSection = section; 
    toggleDrawer(false); 
    render(); 
}
function logout() { 
    currentRole = ROLES.USER; 
    currentUser = null;
    currentSection = 'hero';
    currentAdminSection = 'orders';
    window.location.hash = '';
    render(); 
}
function closeModal() { 
    isModalOpen = false; 
    editingOrder = null;
    showAuthModal = false;
    authTargetRole = null;
    const modal = document.getElementById('orderModal');
    if(modal) modal.remove();
    render(); 
}

function showAuthModalFunc(role) {
    showAuthModal = true;
    authTargetRole = role;
    authError = '';
    renderAuthModal();
}

function renderAuthModal() {
    const oldModal = document.getElementById('orderModal');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'orderModal';
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
                currentAdminSection = 'orders';
                currentSection = 'orders';
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
                currentSection = 'my-orders';
                closeModal();
                render();
            } else {
                authError = 'Неверный логин или пароль';
                renderAuthModal();
            }
        }
    });
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
        createUserRequest();
    });
}

function createUserRequest() {
    const fio = document.getElementById('userFio')?.value.trim();
    const phone = document.getElementById('userPhone')?.value.trim();
    const address = document.getElementById('userAddress')?.value.trim();
    const desiredTime = document.getElementById('userDesiredTime')?.value;
    const problem = document.getElementById('userProblem')?.value;
    
    if (!fio || !phone || !address) {
        alert('Заполните обязательные поля: ФИО, телефон и адрес');
        return;
    }
    
    const newOrder = {
        id: generateId(),
        fio, phone, address,
        desiredTime,
        problem,
        status: 'pending',
        workerId: null,
        workerName: null,
        services: [],
        parts: [],
        total: 0,
        createdAt: Date.now()
    };
    
    orders.unshift(newOrder);
    saveOrders();
    alert('Заявка успешно отправлена! Ожидайте звонка мастера.');
    document.getElementById('requestForm')?.reset();
    render();
}

// ==================== ДАЛЬШЕ ВАШ СУЩЕСТВУЮЩИЙ КОД ====================
// (функции renderAdminPart, renderWorkerPart, attachDrawerEvents и т.д.)
// ... ОСТАЛЬНОЙ КОД ОСТАЕТСЯ БЕЗ ИЗМЕНЕНИЙ ...

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
// Загружаем данные из localStorage как резерв
loadDataFromLocal();
// Загружаем из Supabase
loadAllData();

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