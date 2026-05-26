from django.urls import path
from django_distill import distill_path
from . import views

# Функция для генерации всех страниц (если нужны динамические URL)
def get_all_repair_requests():
    """Генерируем все возможные URL для статики"""
    # Если у вас есть динамические страницы заявок
    return []

urlpatterns = [
    # Главная страница
    distill_path('', views.index, name='index', distill_file='index.html'),
    
    # О сайте (если нужно отдельно)
    distill_path('about/', views.about, name='about', distill_file='about/index.html'),
    
    # Форма заявки
    distill_path('form/', views.form_page, name='form_page', distill_file='form/index.html'),
    
    # API для отправки заявок (не генерация, просто путь)
    path('api/create-request/', views.create_request, name='create_request'),
    
    # Статические страницы для панели работника
    distill_path('worker/', views.worker_static, name='worker_static', distill_file='worker/index.html'),
    
    # Статические страницы для админ-панели
    distill_path('admin-panel/', views.admin_static, name='admin_static', distill_file='admin/index.html'),
]

# Эти пути не нужно генерировать в статику, они будут работать через JavaScript
dynamic_patterns = [
    path('worker/api/requests/<str:status>/', views.get_requests, name='get_requests'),
    path('worker/api/request/<int:request_id>/', views.update_request, name='update_request'),
    path('worker/api/statistics/', views.get_statistics, name='get_statistics'),
    path('admin-panel/api/add-worker/', views.add_worker, name='add_worker'),
    path('admin-panel/api/delete-worker/<int:worker_id>/', views.delete_worker, name='delete_worker'),
    path('admin-panel/api/reset-password/<int:worker_id>/', views.reset_worker_password, name='reset_password'),
]

urlpatterns.extend(dynamic_patterns)