from django.urls import path
from . import views
from .views import login, user_list, user_detail, jira_oauth_start, jira_oauth_callback, jira_oauth_status, jira_projects
from rest_framework_simplejwt.views import TokenRefreshView
urlpatterns = [
    path("login/", views.login),
    path('me/', views.get_me, name='get_me'),
    path("", views.user_list),
    path("<int:users_id>/", views.user_detail),
    path("start/", jira_oauth_start),
    path("callback/", jira_oauth_callback),
    path("status/", jira_oauth_status),
    path("projects/", jira_projects),
    path("token/refresh/", TokenRefreshView.as_view()),
]
