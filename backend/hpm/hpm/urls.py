from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

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
    
    path("api/jira/", include("apps.users.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
