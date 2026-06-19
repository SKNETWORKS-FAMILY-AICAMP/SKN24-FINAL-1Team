from django.db import models


class Chatbot(models.Model):
    chatbot_id = models.AutoField(primary_key=True, verbose_name="챗봇 식별 번호")
    meeting = models.ForeignKey(
        "meetings.Meeting", 
        on_delete=models.CASCADE, 
        db_column="meeting_id", 
        verbose_name="회의 식별 번호"
    )
    meeting_users = models.ForeignKey(
        "meetings.MeetingUsers",
        on_delete=models.CASCADE,
        db_column="meeting_users_id",
        null= True, blank=True,
        verbose_name="회의 참여자"
    )

    class Meta:
        db_table = "chatbot"


class ChatHistory(models.Model):
    chat_history_id = models.AutoField(primary_key=True, verbose_name="챗봇 내역 식별 번호")
    chat = models.ForeignKey(Chatbot, on_delete=models.CASCADE, db_column="chat_id", verbose_name="챗봇 식별 번호")
    type = models.IntegerField(verbose_name="유형(1:질문, 2:답변)")
    content = models.TextField(verbose_name="내용")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="질문/응답 일시")

    class Meta:
        db_table = "chat_history"
