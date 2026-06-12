from django.contrib import admin
from .models import Users, Dept, Rank

admin.site.register(Dept)
admin.site.register(Rank)
admin.site.register(Users)