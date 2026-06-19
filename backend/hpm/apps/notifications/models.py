from django.db import models
from apps.users.models import Users


class Notification(models.Model):

    notification_id = models.AutoField(primary_key=True, verbose_name="알림 식별 번호")
    user = models.ForeignKey(Users, on_delete=models.CASCADE, db_column="user_id", verbose_name="알림 수신자 식별 번호")
    content = models.TextField(verbose_name="알림 내용")
    is_read = models.BooleanField(default=False, verbose_name="읽음 여부(0:안읽음, 1:읽음)")

    created_at = models.DateTimeField(auto_now_add=True, null=True, verbose_name="알림 생성 일시")

    class Meta:
        db_table = "notification"