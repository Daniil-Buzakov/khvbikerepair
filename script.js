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

// Данные для авторизации (ЖЕСТКО ЗАДАДИМ ПРЯМО ЗДЕСЬ)
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

// Загрузка из localStorage
function loadData() {
    const storedOrders = localStorage.getItem('bike_orders_v2');
    const storedPrices = localStorage.getItem('bike_prices_v2');
    const storedWorkers = localStorage.getItem('bike_workers_v2');
    
    orders = storedOrders ? JSON.parse(storedOrders) : [];
    priceList = storedPrices ? JSON.parse(storedPrices) : defaultPriceList;
    workers = storedWorkers ? JSON.parse(storedWorkers) : defaultWorkers;
}
function saveOrders() { localStorage.setItem('bike_orders_v2', JSON.stringify(orders)); }
function savePrices() { localStorage.setItem('bike_prices_v2', JSON.stringify(priceList)); }
function saveWorkers() { localStorage.setItem('bike_workers_v2', JSON.stringify(workers)); }

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
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'orderModal';
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
            // Прямое сравнение с жестко заданными данными
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
}

// ==================== АДМИНСКАЯ ЧАСТЬ ====================
function renderAdminPart() {
    let filteredOrders = [...orders];
    if (currentFilter === 'pending') filteredOrders = orders.filter(o => o.status === 'pending');
    else if (currentFilter === 'in-progress') filteredOrders = orders.filter(o => o.status === 'in-progress');
    else if (currentFilter === 'completed') filteredOrders = orders.filter(o => o.status === 'completed');
    
    filteredOrders.sort((a,b) => b.createdAt - a.createdAt);
    
    let contentHtml = '';
    
    if (currentAdminSection === 'orders') {
        contentHtml = `
            <div class="filter-tabs">
                <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">Все</button>
                <button class="filter-btn ${currentFilter === 'pending' ? 'active' : ''}" data-filter="pending">Новые</button>
                <button class="filter-btn ${currentFilter === 'in-progress' ? 'active' : ''}" data-filter="in-progress">В работе</button>
                <button class="filter-btn ${currentFilter === 'completed' ? 'active' : ''}" data-filter="completed">Завершённые</button>
            </div>
            <button class="btn btn-primary" id="createOrderBtn" style="margin-bottom: 1rem;">➕ Создать заказ вручную</button>
            <div id="ordersList"></div>
        `;
    } else if (currentAdminSection === 'price') {
        contentHtml = `
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
        `;
    } else if (currentAdminSection === 'stats') {
        let now = new Date();
        let startDate, endDate = new Date();
        if (statsMode === 'today') { 
            startDate = new Date(); startDate.setHours(0,0,0,0); 
            endDate = new Date(); endDate.setHours(23,59,59,999); 
        } else if (statsMode === 'week') { 
            let day = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
            startDate.setHours(0,0,0,0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23,59,59,999);
        } else if (statsMode === 'month') { 
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (statsMode === 'custom' && customStart && customEnd) { 
            startDate = new Date(customStart);
            endDate = new Date(customEnd);
            endDate.setHours(23,59,59,999);
        }
        
        let filtered = orders.filter(o => {
            if (!startDate || !endDate) return false;
            let createdDate = new Date(o.createdAt);
            return createdDate >= startDate && createdDate <= endDate;
        });
        
        let totalSum = filtered.reduce((sum, o) => {
            const servicesSum = o.services.reduce((sSum, service) => sSum + (service.price * service.quantity), 0);
            return sum + servicesSum;
        }, 0);
        
        let completed = filtered.filter(o => o.status === 'completed').length;
        
        let workerStats = workers.map(worker => {
            const workerOrders = orders.filter(o => o.workerId === worker.id && o.status === 'completed');
            const earned = workerOrders.reduce((sum, o) => sum + (o.services.reduce((s, svc) => s + svc.price * svc.quantity, 0) || 0), 0);
            return { ...worker, ordersCount: workerOrders.length, earned };
        });
        
        contentHtml = `
            <h2>📊 Статистика</h2>
            <div class="stats-period">
                <button class="stats-btn ${statsMode === 'today' ? 'active' : ''}" data-mode="today">Сегодня</button>
                <button class="stats-btn ${statsMode === 'week' ? 'active' : ''}" data-mode="week">Неделя</button>
                <button class="stats-btn ${statsMode === 'month' ? 'active' : ''}" data-mode="month">Месяц</button>
                <button class="stats-btn ${statsMode === 'custom' ? 'active' : ''}" data-mode="custom">Свои даты</button>
            </div>
            ${statsMode === 'custom' ? `
                <div class="date-range">
                    <div><label>С</label><input type="date" id="customStart" value="${customStart}"></div>
                    <div><label>По</label><input type="date" id="customEnd" value="${customEnd}"></div>
                    <button id="applyCustom" class="btn-primary">Применить</button>
                </div>
            ` : ''}
            <div class="stats-summary">
                💰 Сумма заказов (только услуги): ${totalSum} ₽<br>
                📦 Кол-во заказов: ${filtered.length} (из них завершено: ${completed})
            </div>
            <h3 style="margin-top: 2rem;">📊 Статистика по работникам</h3>
            ${workerStats.map(w => `
                <div class="stats-worker">
                    <strong>${escapeHtml(w.name)}</strong><br>
                    ✅ Завершённых заказов: ${w.ordersCount}<br>
                    💰 Заработано: ${w.earned} ₽
                </div>
            `).join('')}
        `;
    } else if (currentAdminSection === 'workers') {
        contentHtml = `
            <h2>👨‍🔧 Работники</h2>
            <div class="form-card">
                <div class="form-group">
                    <label>Имя мастера</label>
                    <input id="newWorkerName" placeholder="Имя">
                </div>
                <div class="form-group">
                    <label>Телефон</label>
                    <input id="newWorkerPhone" placeholder="+7 XXX XXX-XX-XX">
                </div>
                <div class="form-group">
                    <label>Логин</label>
                    <input id="newWorkerLogin" placeholder="Логин для входа">
                </div>
                <div class="form-group">
                    <label>Пароль</label>
                    <input id="newWorkerPassword" type="password" placeholder="Пароль">
                </div>
                <button class="btn-primary" id="addWorkerBtn">Добавить мастера</button>
            </div>
            <div id="workersList">
                ${workers.map(worker => `
                    <div class="worker-card">
                        <strong>${escapeHtml(worker.name)}</strong><br>
                        📞 ${escapeHtml(worker.phone)}<br>
                        🔑 Логин: ${escapeHtml(worker.login)}
                        <button class="btn-sm btn-danger" data-delworker="${worker.id}" style="margin-top: 0.5rem;">Удалить</button>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    let html = `
        <div class="app">
            <div class="header">
                <div class="header-left">
                    <button class="menu-btn" id="menuButton">☰</button>
                    <h1>👑 Админ панель - KHV Bike Repair</h1>
                </div>
                <button class="btn-sm" id="logoutBtn" style="background:#ef4444; color:white;">🚪 Выйти</button>
            </div>
            ${drawerOverlay()}
            <div class="content">
                ${contentHtml}
            </div>
        </div>
    `;
    
    appRoot.innerHTML = html;
    attachDrawerEvents();
    
    if (currentAdminSection === 'orders') {
        attachFilterEvents();
        document.getElementById('createOrderBtn')?.addEventListener('click', () => openAdminOrderModal());
        
        const ordersContainer = document.getElementById('ordersList');
        if (ordersContainer) {
            if (filteredOrders.length === 0) {
                ordersContainer.innerHTML = '<div style="text-align:center; padding:2rem;">Нет заказов</div>';
            } else {
                ordersContainer.innerHTML = filteredOrders.map(order => `
                    <div class="order-card ${order.status}">
                        <div class="order-header">
                            <span class="order-customer">${escapeHtml(order.fio)}</span>
                            <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
                        </div>
                        <div class="order-info">
                            <span>📞 ${escapeHtml(order.phone)}</span>
                            <span>📍 ${escapeHtml(order.address)}</span>
                            <span>⏱ ${order.desiredTime ? new Date(order.desiredTime).toLocaleString() : 'не указано'}</span>
                            <span>👨‍🔧 ${order.workerName || 'Не назначен'}</span>
                        </div>
                        ${order.problem ? `<div class="order-problem">📝 Проблема: ${escapeHtml(order.problem)}</div>` : ''}
                        <div class="order-total">💰 Сумма: ${order.total} ₽</div>
                        <div class="order-actions">
                            <button class="btn-sm" data-edit="${order.id}">✏️ Редактировать</button>
                            <select class="btn-sm" data-assign="${order.id}">
                                <option value="">Назначить мастера</option>
                                ${workers.map(w => `<option value="${w.id}" ${order.workerId === w.id ? 'selected' : ''}>${escapeHtml(w.name)}</option>`).join('')}
                            </select>
                            <button class="btn-sm btn-danger" data-delete="${order.id}">🗑 Удалить</button>
                        </div>
                    </div>
                `).join('');
                
                attachAdminOrderEvents();
            }
        }
    }
    
    if (currentAdminSection === 'price') {
        document.getElementById('addPriceBtn')?.addEventListener('click', () => {
            const name = document.getElementById('newPriceName')?.value.trim();
            const cost = parseInt(document.getElementById('newPriceCost')?.value);
            if (!name || isNaN(cost) || cost <= 0) {
                alert('Введите корректное название и цену');
                return;
            }
            priceList.push({ id: generateId(), name, price: cost });
            savePrices();
            render();
        });
        
        const priceContainer = document.getElementById('priceListContainer');
        if (priceContainer) {
            priceContainer.innerHTML = priceList.map(p => `
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
                    render();
                };
            });
        }
    }
    
    if (currentAdminSection === 'stats') {
        document.querySelectorAll('.stats-btn')?.forEach(btn => {
            btn.onclick = () => {
                statsMode = btn.dataset.mode;
                render();
            };
        });
        
        document.getElementById('applyCustom')?.addEventListener('click', () => {
            customStart = document.getElementById('customStart')?.value || '';
            customEnd = document.getElementById('customEnd')?.value || '';
            render();
        });
    }
    
    if (currentAdminSection === 'workers') {
        document.getElementById('addWorkerBtn')?.addEventListener('click', () => {
            const name = document.getElementById('newWorkerName')?.value.trim();
            const phone = document.getElementById('newWorkerPhone')?.value.trim();
            const login = document.getElementById('newWorkerLogin')?.value.trim();
            const password = document.getElementById('newWorkerPassword')?.value;
            
            if (!name || !phone || !login || !password) {
                alert('Заполните все поля');
                return;
            }
            
            const newId = 'w' + (workers.length + 1);
            workers.push({
                id: newId,
                name,
                phone,
                login,
                password,
                ordersCount: 0,
                totalEarned: 0
            });
            saveWorkers();
            render();
        });
        
        document.querySelectorAll('[data-delworker]')?.forEach(btn => {
            btn.onclick = () => {
                if (confirm('Удалить мастера?')) {
                    const id = btn.dataset.delworker;
                    workers = workers.filter(w => w.id !== id);
                    saveWorkers();
                    render();
                }
            };
        });
    }
    
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
}

function openAdminOrderModal(editOrder = null) {
    isModalOpen = true;
    editingOrder = editOrder;
    const isEdit = editOrder !== null;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'orderModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${isEdit ? '✏️ Редактирование заказа' : '➕ Новый заказ'}</h3>
                <button class="modal-close" id="closeModalBtn">&times;</button>
            </div>
            <div class="form-group"><label>ФИО *</label><input type="text" id="orderFio" value="${escapeHtml(editOrder?.fio || '')}"></div>
            <div class="form-group"><label>Телефон *</label><input type="text" id="orderPhone" value="${escapeHtml(editOrder?.phone || '')}"></div>
            <div class="form-group"><label>Адрес</label><input type="text" id="orderAddress" value="${escapeHtml(editOrder?.address || '')}"></div>
            <div class="form-group"><label>Время ремонта</label><input type="datetime-local" id="orderTime" value="${editOrder?.desiredTime || ''}"></div>
            <div class="form-group"><label>Описание проблемы</label><textarea id="orderProblem">${escapeHtml(editOrder?.problem || '')}</textarea></div>
            <div class="form-group"><label>Статус</label>
                <select id="orderStatus">
                    <option value="pending" ${editOrder?.status === 'pending' ? 'selected' : ''}>Новый</option>
                    <option value="in-progress" ${editOrder?.status === 'in-progress' ? 'selected' : ''}>В работе</option>
                    <option value="completed" ${editOrder?.status === 'completed' ? 'selected' : ''}>Завершён</option>
                </select>
            </div>
            <div class="form-group"><label>Мастер</label>
                <select id="orderWorker">
                    <option value="">Не назначен</option>
                    ${workers.map(w => `<option value="${w.id}" ${editOrder?.workerId === w.id ? 'selected' : ''}>${escapeHtml(w.name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group"><label>Услуги</label><div id="servicesContainer"></div><button type="button" class="add-button" id="addServiceBtn">+ Добавить услугу</button></div>
            <div class="form-group"><label>Запчасти</label><div id="partsContainer"></div><button type="button" class="add-button" id="addPartBtn">+ Добавить запчасть</button></div>
            <button class="btn-primary" id="saveOrderBtn">${isEdit ? 'Сохранить' : 'Создать'}</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    let serviceItems = (editOrder?.services || []).map(s => ({ serviceId: s.id, quantity: s.quantity }));
    if (serviceItems.length === 0) serviceItems = [{ serviceId: '', quantity: 1 }];
    
    let partItems = (editOrder?.parts || []).map(p => ({ name: p.name, price: p.price, quantity: p.quantity }));
    if (partItems.length === 0) partItems = [{ name: '', price: 0, quantity: 1 }];
    
    function renderServiceForm() {
        const container = document.getElementById('servicesContainer');
        if (!container) return;
        container.innerHTML = serviceItems.map((item, idx) => `
            <div class="service-row">
                <select data-svc="${idx}" style="flex:2">
                    <option value="">--Выберите услугу--</option>
                    ${priceList.map(p => `<option value="${p.id}" ${item.serviceId === p.id ? 'selected' : ''}>${escapeHtml(p.name)} - ${p.price}₽</option>`).join('')}
                </select>
                <input type="number" data-qty="${idx}" value="${item.quantity}" min="1" style="width:70px">
                <button class="btn-sm" data-remove-s="${idx}">❌</button>
            </div>
        `).join('');
        
        document.querySelectorAll('[data-svc]').forEach(sel => sel.addEventListener('change', (e) => {
            serviceItems[parseInt(e.target.dataset.svc)].serviceId = e.target.value;
        }));
        document.querySelectorAll('[data-qty]').forEach(inp => inp.addEventListener('change', (e) => {
            serviceItems[parseInt(e.target.dataset.qty)].quantity = parseInt(e.target.value) || 1;
        }));
        document.querySelectorAll('[data-remove-s]').forEach(btn => btn.addEventListener('click', () => {
            serviceItems.splice(parseInt(btn.dataset.removeS), 1);
            renderServiceForm();
        }));
    }
    
    function renderPartForm() {
        const container = document.getElementById('partsContainer');
        if (!container) return;
        container.innerHTML = partItems.map((item, idx) => `
            <div class="part-row">
                <input placeholder="Название" data-pname="${idx}" value="${escapeHtml(item.name)}" style="flex:2">
                <input type="number" placeholder="Цена" data-pprice="${idx}" value="${item.price}" style="width:90px">
                <input type="number" placeholder="Кол-во" data-pqty="${idx}" value="${item.quantity}" style="width:80px">
                <button class="btn-sm" data-remove-p="${idx}">❌</button>
            </div>
        `).join('');
        
        document.querySelectorAll('[data-pname]').forEach(inp => inp.addEventListener('change', (e) => {
            partItems[parseInt(e.target.dataset.pname)].name = inp.value;
        }));
        document.querySelectorAll('[data-pprice]').forEach(inp => inp.addEventListener('change', (e) => {
            partItems[parseInt(e.target.dataset.pprice)].price = parseInt(inp.value) || 0;
        }));
        document.querySelectorAll('[data-pqty]').forEach(inp => inp.addEventListener('change', (e) => {
            partItems[parseInt(e.target.dataset.pqty)].quantity = parseInt(inp.value) || 1;
        }));
        document.querySelectorAll('[data-remove-p]').forEach(btn => btn.addEventListener('click', () => {
            partItems.splice(parseInt(btn.dataset.removeP), 1);
            renderPartForm();
        }));
    }
    
    renderServiceForm();
    renderPartForm();
    
    document.getElementById('addServiceBtn')?.addEventListener('click', () => {
        serviceItems.push({ serviceId: '', quantity: 1 });
        renderServiceForm();
    });
    document.getElementById('addPartBtn')?.addEventListener('click', () => {
        partItems.push({ name: '', price: 0, quantity: 1 });
        renderPartForm();
    });
    
    document.getElementById('saveOrderBtn')?.addEventListener('click', () => {
        const fio = document.getElementById('orderFio')?.value.trim();
        if (!fio) { alert('Введите ФИО'); return; }
        
        const services = serviceItems.filter(s => s.serviceId).map(s => {
            const svc = priceList.find(p => p.id === s.serviceId);
            return { id: s.serviceId, name: svc?.name || '', price: svc?.price || 0, quantity: s.quantity };
        });
        const parts = partItems.filter(p => p.name.trim() && p.price > 0);
        const total = [...services.map(s => s.price * s.quantity), ...parts.map(p => p.price * p.quantity)].reduce((a,b)=>a+b,0);
        
        const orderData = {
            fio,
            phone: document.getElementById('orderPhone')?.value || '',
            address: document.getElementById('orderAddress')?.value || '',
            desiredTime: document.getElementById('orderTime')?.value || '',
            problem: document.getElementById('orderProblem')?.value || '',
            status: document.getElementById('orderStatus')?.value || 'pending',
            workerId: document.getElementById('orderWorker')?.value || null,
            workerName: workers.find(w => w.id === document.getElementById('orderWorker')?.value)?.name || null,
            services,
            parts,
            total
        };
        
        if (isEdit) {
            const index = orders.findIndex(o => o.id === editOrder.id);
            if (index !== -1) orders[index] = { ...orders[index], ...orderData };
        } else {
            orders.unshift({ id: generateId(), ...orderData, createdAt: Date.now() });
        }
        saveOrders();
        closeModal();
        render();
    });
    
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
}

function attachAdminOrderEvents() {
    document.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
            const order = orders.find(o => o.id === btn.dataset.edit);
            if (order) openAdminOrderModal(order);
        });
    });
    document.querySelectorAll('[data-assign]').forEach(select => {
        select.addEventListener('change', (e) => {
            const order = orders.find(o => o.id === select.dataset.assign);
            if (order) {
                const workerId = e.target.value;
                const worker = workers.find(w => w.id === workerId);
                order.workerId = workerId || null;
                order.workerName = worker?.name || null;
                saveOrders();
                render();
            }
        });
    });
    document.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Удалить заказ?')) {
                orders = orders.filter(o => o.id !== btn.dataset.delete);
                saveOrders();
                render();
            }
        });
    });
}

// ==================== РЕМОНТНАЯ ЧАСТЬ (МАСТЕР) ====================
function renderWorkerPart() {
    let workerOrders = orders.filter(o => o.workerId === currentUser?.id);
    let filteredOrders = workerOrders;
    if (currentFilter === 'pending') filteredOrders = workerOrders.filter(o => o.status === 'pending');
    else if (currentFilter === 'in-progress') filteredOrders = workerOrders.filter(o => o.status === 'in-progress');
    else if (currentFilter === 'completed') filteredOrders = workerOrders.filter(o => o.status === 'completed');
    
    filteredOrders.sort((a,b) => b.createdAt - a.createdAt);
    
    let stats = calculateWorkerStats(currentUser?.id);
    
    let html = `
        <div class="app">
            <div class="header">
                <div class="header-left">
                    <button class="menu-btn" id="menuButton">☰</button>
                    <h1>🔧 ${escapeHtml(currentUser?.name || 'Мастер')} - Панель мастера</h1>
                </div>
                <button class="btn-sm" id="logoutBtn" style="background:#ef4444; color:white;">🚪 Выйти</button>
            </div>
            ${drawerOverlay()}
            <div class="content">
                <div class="stats-summary" style="margin-bottom: 1rem;">
                    📊 Ваша статистика: ${stats.completedOrders} завершённых заказов | 💰 ${stats.totalEarned} ₽ заработано
                </div>
                <div class="filter-tabs">
                    <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">Все</button>
                    <button class="filter-btn ${currentFilter === 'pending' ? 'active' : ''}" data-filter="pending">Новые</button>
                    <button class="filter-btn ${currentFilter === 'in-progress' ? 'active' : ''}" data-filter="in-progress">В работе</button>
                    <button class="filter-btn ${currentFilter === 'completed' ? 'active' : ''}" data-filter="completed">Завершённые</button>
                </div>
                <div id="ordersList"></div>
            </div>
        </div>
    `;
    
    appRoot.innerHTML = html;
    attachDrawerEvents();
    attachFilterEvents();
    
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    const ordersContainer = document.getElementById('ordersList');
    if (ordersContainer) {
        if (filteredOrders.length === 0) {
            ordersContainer.innerHTML = '<div style="text-align:center; padding:2rem;">Нет назначенных заказов</div>';
        } else {
            ordersContainer.innerHTML = filteredOrders.map(order => `
                <div class="order-card ${order.status}">
                    <div class="order-header">
                        <span class="order-customer">${escapeHtml(order.fio)}</span>
                        <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
                    </div>
                    <div class="order-info">
                        <span>📞 ${escapeHtml(order.phone)}</span>
                        <span>📍 ${escapeHtml(order.address)}</span>
                        <span>⏱ ${order.desiredTime ? new Date(order.desiredTime).toLocaleString() : 'не указано'}</span>
                    </div>
                    ${order.problem ? `<div class="order-problem">📝 ${escapeHtml(order.problem)}</div>` : ''}
                    <div class="order-total">💰 Сумма: ${order.total} ₽</div>
                    <div class="order-actions">
                        ${order.status !== 'completed' ? `<button class="btn-sm btn-success" data-complete="${order.id}">✅ Завершить заказ</button>` : ''}
                        <button class="btn-sm" data-start="${order.id}">🔧 Начать работу</button>
                    </div>
                </div>
            `).join('');
            
            document.querySelectorAll('[data-complete]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const order = orders.find(o => o.id === btn.dataset.complete);
                    if (order && confirm('Завершить заказ?')) {
                        order.status = 'completed';
                        saveOrders();
                        render();
                    }
                });
            });
            
            document.querySelectorAll('[data-start]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const order = orders.find(o => o.id === btn.dataset.start);
                    if (order && order.status === 'pending') {
                        order.status = 'in-progress';
                        saveOrders();
                        render();
                    }
                });
            });
        }
    }
}

function calculateWorkerStats(workerId) {
    const workerOrders = orders.filter(o => o.workerId === workerId);
    const completedOrders = workerOrders.filter(o => o.status === 'completed');
    const totalEarned = completedOrders.reduce((sum, o) => sum + (o.services?.reduce((s, svc) => s + svc.price * svc.quantity, 0) || 0), 0);
    return { completedOrders: completedOrders.length, totalEarned };
}

// ==================== ОБЩИЕ ФУНКЦИИ ====================
function drawerOverlay() {
    return `
        <div class="drawer-overlay ${drawerOpen ? 'open' : ''}" id="drawerOverlay">
            <div class="drawer">
                <div class="drawer-header">📋 Меню</div>
                <ul class="drawer-nav">
                    ${currentRole === ROLES.ADMIN ? `
                        <li data-section="orders" class="${currentAdminSection === 'orders' ? 'active' : ''}">📋 Заказы</li>
                        <li data-section="price" class="${currentAdminSection === 'price' ? 'active' : ''}">💰 Прайс-лист</li>
                        <li data-section="stats" class="${currentAdminSection === 'stats' ? 'active' : ''}">📊 Статистика</li>
                        <li data-section="workers" class="${currentAdminSection === 'workers' ? 'active' : ''}">👨‍🔧 Работники</li>
                    ` : ''}
                    ${currentRole === ROLES.WORKER ? `
                        <li data-section="my-orders" class="${currentSection === 'my-orders' ? 'active' : ''}">📋 Мои заказы</li>
                        <li data-section="my-stats" class="${currentSection === 'my-stats' ? 'active' : ''}">📊 Моя статистика</li>
                    ` : ''}
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
    
    if (menuBtn) menuBtn.onclick = () => toggleDrawer(true);
    if (closeBtn) closeBtn.onclick = () => toggleDrawer(false);
    if (overlay) overlay.onclick = (e) => { if (e.target === overlay) toggleDrawer(false); };
    
    document.querySelectorAll('.drawer-nav li').forEach(li => {
        li.onclick = () => {
            const section = li.dataset.section;
            if (section) setSection(section);
            toggleDrawer(false);
        };
    });
}

function attachFilterEvents() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            currentFilter = btn.dataset.filter;
            render();
        };
    });
}

function getStatusText(status) {
    const statusMap = { pending: 'Новая', 'in-progress': 'В работе', completed: 'Завершён' };
    return statusMap[status] || status;
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
        showAuthModalFunc(ROLES.ADMIN);
    } else if (hash === '#worker') {
        showAuthModalFunc(ROLES.WORKER);
    }
}

// Инициализация
loadData();
render();
checkUrlForAuth();
