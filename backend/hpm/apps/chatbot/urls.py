from django.urls import path
from . import views

urlpatterns = [
    path("<int:meeting_id>/", views.chat),
    path("<int:meeting_id>/history/", views.chat_history),
    path("project/<int:project_id>/", views.project_chat)
]
