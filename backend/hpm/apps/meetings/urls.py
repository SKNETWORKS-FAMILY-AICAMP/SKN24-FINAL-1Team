from django.urls import path
from . import views
from .views import generate_agenda
from .views import meeting_stream 

urlpatterns = [
    # 회의 목록 / 생성
    path("", views.meeting_list),
    # 회의 상세 / 수정
    path("<int:meeting_id>/", views.meeting_detail),
    # 회의 시작
    path("<int:meeting_id>/start/", views.start_meeting),
    # 회의 종료 (STT + 회의록 생성)
    path("<int:meeting_id>/end/", views.end_meeting),
    # 회의록 생성 (RunPod 별도 호출)
    path("<int:meeting_id>/minutes/", views.generate_minutes),
    # 기초 안건
    path("<int:meeting_id>/agenda/", views.agenda_list),
    path("<int:meeting_id>/agenda/confirm/", views.confirm_agenda),
    # 회의록 승인 플로우
    path("<int:meeting_id>/minutes/request/", views.request_minutes_approval),
    path("<int:meeting_id>/minutes/approve/", views.approve_minutes),
    path("<int:meeting_id>/minutes/reject/", views.reject_minutes),
    # 태스크
    path("<int:meeting_id>/tasks/", views.task_list),
    path("<int:meeting_id>/tasks/<int:task_id>/", views.task_detail),
    # Jira 등록
    path("<int:meeting_id>/jira/", views.register_jira_tasks),
    # 안건생성
    path("<int:meeting_id>/agenda/generate/", generate_agenda),

    path("<int:meeting_id>/stream/",meeting_stream),

]
