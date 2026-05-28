from django.urls import path
from . import views

urlpatterns = [
    path("<int:users_id>/", views.user_detail)
]