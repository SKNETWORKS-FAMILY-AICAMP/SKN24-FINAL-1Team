from django.urls import path
from . import views

urlpatterns = [
    path("", views.notification_list),
    path("stream/", views.notification_stream),
    path("all/", views.notification_delete_all),
    path("<int:notification_id>/read/", views.notification_read),
    path("<int:notification_id>/", views.notification_delete),
]
