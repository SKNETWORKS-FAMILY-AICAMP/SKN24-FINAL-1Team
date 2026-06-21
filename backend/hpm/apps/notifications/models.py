from django.db import models
from apps.users.models import Users


class Notification(models.Model):
    PROJECT_MEMBER_ADDED = "project_member_added"
    PROJECT_MEMBER_REMOVED = "project_member_removed"
    MEETING_INVITED = "meeting_invited"
    MEETING_STARTED = "meeting_started"
    MINUTES_APPROVED = "minutes_approved"
    TASK_ASSIGNED = "task_assigned"

    TYPE_CHOICES = [
        (PROJECT_MEMBER_ADDED, "프로젝트 팀원 추가"),
        (MEETING_INVITED, "회의 초대"),
        (MEETING_STARTED, "회의 시작"),
        (MINUTES_APPROVED, "회의록 확정 완료"),
        (TASK_ASSIGNED, "업무 배정"),
    ]

    notification_id = models.AutoField(primary_key=True, verbose_name="알림 식별 번호")
    user = models.ForeignKey(Users, on_delete=models.CASCADE, db_column="user_id", verbose_name="알림 수신자 식별 번호")
    notification_type = models.CharField(max_length=50, choices=TYPE_CHOICES, verbose_name="알림 유형")
    content = models.TextField(verbose_name="알림 내용")
    target_id = models.IntegerField(null=True, blank=True, verbose_name="알림 대상 식별 번호")
    is_read = models.BooleanField(default=False, verbose_name="읽음 여부(0:안읽음, 1:읽음)")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="알림 생성 일시")

    class Meta:
        db_table = "notification"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read", "-created_at"]),
        ]