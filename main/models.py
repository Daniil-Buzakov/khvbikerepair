from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Service(models.Model):
    name = models.CharField('Название услуги', max_length=200)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)
    is_active = models.BooleanField('Активна', default=True)
    
    class Meta:
        verbose_name = 'Услуга'
        verbose_name_plural = 'Услуги'
    
    def __str__(self):
        return f"{self.name} - {self.price}₽"

class SparePart(models.Model):
    name = models.CharField('Название запчасти', max_length=200)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)
    quantity = models.IntegerField('Количество на складе', default=0)
    
    class Meta:
        verbose_name = 'Запчасть'
        verbose_name_plural = 'Запчасти'
    
    def __str__(self):
        return f"{self.name} - {self.price}₽"

class RepairRequest(models.Model):
    STATUS_CHOICES = [
        ('new', 'Новая'),
        ('work', 'В работе'),
        ('completed', 'Завершена'),
        ('cancelled', 'Отменена'),
    ]
    
    fullname = models.CharField('ФИО', max_length=200)
    address = models.TextField('Адрес')
    phone = models.CharField('Телефон', max_length=20)
    services = models.ManyToManyField(Service, through='RequestService', verbose_name='Услуги')
    status = models.CharField('Статус', max_length=20, choices=STATUS_CHOICES, default='new')
    created_at = models.DateTimeField('Дата создания', auto_now_add=True)
    updated_at = models.DateTimeField('Дата обновления', auto_now=True)
    completed_at = models.DateTimeField('Дата завершения', null=True, blank=True)
    total_price = models.DecimalField('Общая стоимость', max_digits=10, decimal_places=2, default=0)
    note = models.TextField('Примечание', blank=True)
    
    class Meta:
        verbose_name = 'Заявка на ремонт'
        verbose_name_plural = 'Заявки на ремонт'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Заявка #{self.id} - {self.fullname}"
    
    def save(self, *args, **kwargs):
        if self.status == 'completed' and not self.completed_at:
            self.completed_at = timezone.now()
        super().save(*args, **kwargs)

class RequestService(models.Model):
    request = models.ForeignKey(RepairRequest, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    quantity = models.IntegerField('Количество', default=1)
    discount = models.IntegerField('Скидка %', default=0)
    
    def get_price(self):
        price = self.service.price * self.quantity
        if self.discount:
            price = price * (100 - self.discount) / 100
        return price
    
    class Meta:
        verbose_name = 'Услуга в заявке'
        verbose_name_plural = 'Услуги в заявках'

class RequestPart(models.Model):
    request = models.ForeignKey(RepairRequest, on_delete=models.CASCADE, related_name='parts')
    part_name = models.CharField('Название запчасти', max_length=200)
    quantity = models.IntegerField('Количество', default=1)
    price = models.DecimalField('Цена', max_digits=10, decimal_places=2)
    
    def get_total(self):
        return self.price * self.quantity
    
    class Meta:
        verbose_name = 'Запчасть в заявке'
        verbose_name_plural = 'Запчасти в заявках'

class WorkerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, verbose_name='Пользователь')
    phone = models.CharField('Телефон', max_length=20, blank=True)
    is_active = models.BooleanField('Активен', default=True)
    
    class Meta:
        verbose_name = 'Профиль работника'
        verbose_name_plural = 'Профили работников'
    
    def __str__(self):
        return self.user.get_full_name() or self.user.username