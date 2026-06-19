from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.users.views import jira_oauth_start, jira_oauth_callback, jira_oauth_status, jira_projects

urlpatterns = [
    path('admin/', admin.site.urls),
    # 사용자
    path("api/users/", include("apps.users.urls")),
    # 프로젝트
    path("api/projects/", include("apps.projects.urls")),
    # 회의 (기초안건·태스크·승인 플로우 포함)
    path("api/meetings/", include("apps.meetings.urls")),
    # 문서
    path("api/documents/", include("apps.documents.urls")),
    # 챗봇
    path("api/chat/", include("apps.chatbot.urls")),
    # 알림
    path("api/notifications/", include("apps.notifications.urls")),
    
    path("api/jira/start/",    jira_oauth_start),
    path("api/jira/callback/", jira_oauth_callback),
    path("api/jira/status/",   jira_oauth_status),
    path("api/jira/projects/", jira_projects),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
