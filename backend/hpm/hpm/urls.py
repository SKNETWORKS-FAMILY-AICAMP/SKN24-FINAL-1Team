from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.users.views import (
    jira_oauth_start, jira_oauth_callback, jira_oauth_status, jira_projects,
    jira_board, jira_board_issue_status, jira_board_issue_detail,
    jira_set_project_key, jira_workspaces, jira_select_workspace,
    jira_board_issue_create, jira_issue_types,
    admin_user_list, admin_user_detail, dept_list, rank_list,
)
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

    path("api/jira/board/",                              jira_board),
    path("api/jira/board/issue/<str:issue_key>/status/", jira_board_issue_status),
    

    path("api/jira/project-key/", jira_set_project_key),
    path("api/jira/workspaces/", jira_workspaces),
    path("api/jira/select-workspace/", jira_select_workspace),
    path("api/jira/board/issue/", jira_board_issue_create),
    path("api/jira/issue-types/", jira_issue_types),

    path("api/admin/users/", admin_user_list),
    path("api/admin/users/<int:users_id>/", admin_user_detail),
    path("api/admin/depts/", dept_list),
    path("api/admin/ranks/", rank_list),

    path("api/jira/board/issue/<str:issue_key>/", jira_board_issue_detail),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
