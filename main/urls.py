from django.urls import path
from django_distill import distill_path
from . import views

# Функции для генерации статических страниц
def get_index():
    """Возвращает список всех страниц для генерации (для главной страницы)"""
    return [None]  # Один раз генерируем главную страницу

def get_worker():
    """Генерация страницы работника"""
    return [None]

def get_admin():
    """Генерация админ-панели"""
    return [None]

urlpatterns = [
    # Главная страница
    distill_path('', views.index, name='index', 
                 distill_file='index.html',
                 distill_func=get_index),
    
    # Панель работника
    distill_path('worker/', views.worker_static, name='worker_static', 
                 distill_file='worker/index.html',
                 distill_func=get_worker),
    
    # Админ-панель
    distill_path('admin-panel/', views.admin_static, name='admin_static', 
                 distill_file='admin/index.html',
                 distill_func=get_admin),
    
    # API endpoints (не генерируются в статику)
    path('api/create-request/', views.create_request, name='create_request'),
    path('worker/api/requests/<str:status>/', views.get_requests, name='get_requests'),
    path('worker/api/request/<int:request_id>/', views.update_request, name='update_request'),
    path('worker/api/statistics/', views.get_statistics, name='get_statistics'),
    path('admin-panel/api/add-worker/', views.add_worker, name='add_worker'),
    path('admin-panel/api/delete-worker/<int:worker_id>/', views.delete_worker, name='delete_worker'),
    path('admin-panel/api/reset-password/<int:worker_id>/', views.reset_worker_password, name='reset_password'),
]