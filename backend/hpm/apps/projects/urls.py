from django.urls import path
from . import views

urlpatterns = [
    path("", views.project_list),
    path("<int:project_id>/jira-board/", views.project_jira_board),
    path("<int:project_id>/", views.project_detail),
]
