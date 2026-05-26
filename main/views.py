from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
import json

# Статические страницы
def index(request):
    """Главная страница"""
    return render(request, 'main/index.html')

def worker_static(request):
    """Статическая страница панели работника"""
    return render(request, 'main/worker.html')

def admin_static(request):
    """Статическая страница админ-панели"""
    return render(request, 'main/admin_panel.html')

# API для заявок
@csrf_exempt
def create_request(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            # Здесь будет логика сохранения в Supabase
            return JsonResponse({'success': True, 'id': 1})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False}, status=405)

def get_requests(request, status):
    """Получение списка заявок"""
    # Здесь будет запрос к Supabase
    return JsonResponse([], safe=False)

def update_request(request, request_id):
    """Обновление заявки"""
    return JsonResponse({'success': True})

def get_statistics(request):
    """Получение статистики"""
    return JsonResponse({'total_count': 0, 'total_amount': 0})

# API для админки
@csrf_exempt
def add_worker(request):
    if request.method == 'POST':
        return JsonResponse({'success': True})
    return JsonResponse({'success': False}, status=405)

def delete_worker(request, worker_id):
    return JsonResponse({'success': True})

def reset_worker_password(request, worker_id):
    return JsonResponse({'success': True})