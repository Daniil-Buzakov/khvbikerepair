from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.db.models import Sum, Q, Count
from datetime import datetime
import json

from .models import RepairRequest, Service, RequestService, RequestPart, WorkerProfile

def is_worker(user):
    return user.is_authenticated and (user.is_staff or hasattr(user, 'workerprofile'))

def is_admin(user):
    return user.is_authenticated and user.is_superuser

def index(request):
    services = Service.objects.filter(is_active=True)
    return render(request, 'main/index.html', {'services': services})

@csrf_exempt
def create_request(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        
        repair_request = RepairRequest.objects.create(
            fullname=data['fullname'],
            address=data['address'],
            phone=data['phone'],
            note=data.get('note', '')
        )
        
        # Добавляем услуги
        for service_data in data.get('services', []):
            service = Service.objects.get(id=service_data['service_id'])
            RequestService.objects.create(
                request=repair_request,
                service=service,
                quantity=service_data['quantity'],
                discount=service_data.get('discount', 0)
            )
        
        # Добавляем запчасти
        for part_data in data.get('parts', []):
            RequestPart.objects.create(
                request=repair_request,
                part_name=part_data['name'],
                quantity=part_data['quantity'],
                price=part_data['price']
            )
        
        # Рассчитываем общую стоимость
        total = 0
        for rs in repair_request.requestservice_set.all():
            total += rs.get_price()
        for rp in repair_request.parts.all():
            total += rp.get_total()
        
        repair_request.total_price = total
        repair_request.save()
        
        return JsonResponse({'success': True, 'id': repair_request.id})
    
    return JsonResponse({'success': False}, status=400)

@login_required
@user_passes_test(is_worker)
def worker_panel(request):
    return render(request, 'main/worker.html')

@login_required
@user_passes_test(is_worker)
def get_requests(request, status):
    requests = RepairRequest.objects.filter(status=status)
    data = []
    for req in requests:
        data.append({
            'id': req.id,
            'fullname': req.fullname,
            'phone': req.phone,
            'address': req.address,
            'status': req.status,
            'created_at': req.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'services': [{
                'name': rs.service.name,
                'quantity': rs.quantity,
                'discount': rs.discount,
                'price': float(rs.get_price())
            } for rs in req.requestservice_set.all()],
            'parts': [{
                'name': rp.part_name,
                'quantity': rp.quantity,
                'price': float(rp.price),
                'total': float(rp.get_total())
            } for rp in req.parts.all()],
            'total_price': float(req.total_price)
        })
    return JsonResponse(data, safe=False)

@login_required
@user_passes_test(is_worker)
@csrf_exempt
def update_request(request, request_id):
    if request.method == 'POST':
        data = json.loads(request.body)
        repair_request = get_object_or_404(RepairRequest, id=request_id)
        
        repair_request.fullname = data.get('fullname', repair_request.fullname)
        repair_request.address = data.get('address', repair_request.address)
        repair_request.phone = data.get('phone', repair_request.phone)
        repair_request.status = data.get('status', repair_request.status)
        repair_request.note = data.get('note', repair_request.note)
        repair_request.save()
        
        # Обновляем услуги
        if 'services' in data:
            repair_request.requestservice_set.all().delete()
            for service_data in data['services']:
                service = Service.objects.get(id=service_data['service_id'])
                RequestService.objects.create(
                    request=repair_request,
                    service=service,
                    quantity=service_data['quantity'],
                    discount=service_data.get('discount', 0)
                )
        
        # Обновляем запчасти
        if 'parts' in data:
            repair_request.parts.all().delete()
            for part_data in data['parts']:
                RequestPart.objects.create(
                    request=repair_request,
                    part_name=part_data['name'],
                    quantity=part_data['quantity'],
                    price=part_data['price']
                )
        
        # Пересчитываем стоимость
        total = 0
        for rs in repair_request.requestservice_set.all():
            total += rs.get_price()
        for rp in repair_request.parts.all():
            total += rp.get_total()
        repair_request.total_price = total
        repair_request.save()
        
        return JsonResponse({'success': True})
    
    return JsonResponse({'success': False}, status=400)

@login_required
@user_passes_test(is_worker)
def get_statistics(request):
    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')
    
    requests = RepairRequest.objects.filter(status='completed')
    
    if date_from:
        requests = requests.filter(completed_at__gte=date_from)
    if date_to:
        requests = requests.filter(completed_at__lte=date_to)
    
    total_count = requests.count()
    total_amount = requests.aggregate(Sum('total_price'))['total_price__sum'] or 0
    
    return JsonResponse({
        'total_count': total_count,
        'total_amount': float(total_amount)
    })

@login_required
@user_passes_test(is_admin)
def admin_panel(request):
    workers = WorkerProfile.objects.select_related('user').all()
    return render(request, 'main/admin_panel.html', {'workers': workers})

@login_required
@user_passes_test(is_admin)
@csrf_exempt
def add_worker(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data['username']
        password = data['password']
        
        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', '')
        )
        user.is_staff = True
        user.save()
        
        WorkerProfile.objects.create(
            user=user,
            phone=data.get('phone', '')
        )
        
        return JsonResponse({'success': True})
    
    return JsonResponse({'success': False}, status=400)

@login_required
@user_passes_test(is_admin)
@csrf_exempt
def delete_worker(request, worker_id):
    if request.method == 'DELETE':
        worker = get_object_or_404(WorkerProfile, id=worker_id)
        user = worker.user
        user.delete()
        return JsonResponse({'success': True})
    
    return JsonResponse({'success': False}, status=400)

@login_required
@user_passes_test(is_admin)
@csrf_exempt
def reset_worker_password(request, worker_id):
    if request.method == 'POST':
        data = json.loads(request.body)
        worker = get_object_or_404(WorkerProfile, id=worker_id)
        worker.user.set_password(data['password'])
        worker.user.save()
        return JsonResponse({'success': True})
    
    return JsonResponse({'success': False}, status=400)