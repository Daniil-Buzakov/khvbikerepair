from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import Service, SparePart, RepairRequest, RequestService, RequestPart, WorkerProfile

class RequestServiceInline(admin.TabularInline):
    model = RequestService
    extra = 1

class RequestPartInline(admin.TabularInline):
    model = RequestPart
    extra = 1

@admin.register(RepairRequest)
class RepairRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'fullname', 'phone', 'status', 'created_at', 'total_price']
    list_filter = ['status', 'created_at']
    search_fields = ['fullname', 'phone', 'address']
    inlines = [RequestServiceInline, RequestPartInline]
    readonly_fields = ['created_at', 'updated_at', 'completed_at', 'total_price']

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'is_active']
    list_editable = ['price', 'is_active']
    search_fields = ['name']

@admin.register(SparePart)
class SparePartAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'quantity']
    list_editable = ['price', 'quantity']
    search_fields = ['name']

@admin.register(WorkerProfile)
class WorkerProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone', 'is_active']
    list_editable = ['is_active']

class WorkerProfileInline(admin.StackedInline):
    model = WorkerProfile
    can_delete = False

class CustomUserAdmin(UserAdmin):
    inlines = [WorkerProfileInline]
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active']
    list_filter = ['is_staff', 'is_active', 'groups']

admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)