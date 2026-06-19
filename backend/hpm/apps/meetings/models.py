from django.db import models
from apps.users.models import Users


class Meeting(models.Model):
    STATUS_SCHEDULED   = "scheduled"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_FINISHED    = "finished"
    STATUS_CHOICES = [
        (STATUS_SCHEDULED,   "회의 예정"),
        (STATUS_IN_PROGRESS, "진행 중"),
        (STATUS_FINISHED,    "종료"),
    ]

    MINUTES_DRAFT     = "draft"
    MINUTES_REVIEWING = "reviewing"
    MINUTES_APPROVED  = "approved"
    MINUTES_REJECTED  = "rejected"
    MINUTES_CHOICES = [
        (MINUTES_DRAFT,     "초안"),
        (MINUTES_REVIEWING, "검토중"),
        (MINUTES_APPROVED,  "승인"),
        (MINUTES_REJECTED,  "거절"),
    ]

    meeting_id = models.AutoField(primary_key=True)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, db_column="project_id"
    )
    creator = models.ForeignKey(
        Users, on_delete=models.PROTECT, db_column="creator_id",
        related_name="created_meetings", null=True, blank=True
    )

    title         = models.CharField(max_length=90)
    location      = models.CharField(max_length=150, blank=True)
    meeting_at    = models.DateTimeField()
    end_at        = models.DateTimeField(null=True, blank=True)
    meeting_document = models.TextField(null=True, blank=True)

    # 기존 is_meeting 유지 + 새 status 추가
    is_meeting     = models.BooleanField(default=False)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    minutes_status = models.CharField(max_length=20, choices=MINUTES_CHOICES, null=True, blank=True)
    special_note   = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "meeting"


class Record(models.Model):
    record_id       = models.AutoField(primary_key=True)
    meeting         = models.OneToOneField(Meeting, on_delete=models.CASCADE, db_column="meeting_id")
    record_path     = models.TextField(null=True, blank=True)
    record_row_text = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "record"


class MeetingUsers(models.Model):
    meeting_users_id = models.AutoField(primary_key=True)
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, db_column="meeting_id")
    user    = models.ForeignKey(Users,   on_delete=models.CASCADE, db_column="user_id")

    class Meta:
        db_table = "meeting_users"


class MeetingAgendas(models.Model):
    agenda_id = models.AutoField(primary_key=True)
    meeting   = models.ForeignKey(Meeting, on_delete=models.CASCADE, db_column="meeting_id")
    content   = models.TextField()
    reason    = models.TextField(null=True, blank=True)
    is_confirmed = models.BooleanField(default=False)

    class Meta:
        db_table = "meeting_agendas"


class MeetingPreparation(models.Model):
    meeting  = models.ForeignKey(Meeting, on_delete=models.CASCADE, db_column="meeting_id")
    document = models.TextField()

    class Meta:
        db_table = "meeting_preparation"


class OuterDocument(models.Model):
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, db_column="meeting_id")
    path    = models.TextField()

    class Meta:
        db_table = "outer_document"


class MeetingTask(models.Model):
    meeting_task_id = models.AutoField(primary_key=True)
    meeting         = models.ForeignKey(Meeting, on_delete=models.CASCADE, db_column="meeting_id")
    meeting_users   = models.ForeignKey(
        MeetingUsers, on_delete=models.CASCADE, db_column="meeting_users_id",
        null=True, blank=True
    )
    title    = models.CharField(max_length=255)
    content  = models.TextField(blank=True)
    owner    = models.CharField(max_length=90, blank=True)  # 이름 직접 저장
    due_date = models.DateField(null=True, blank=True)
    priority = models.CharField(max_length=20, blank=True)  # High/Medium/Low/Lowest
    status   = models.IntegerField(default=0)               # 0=미완료, 1=진행중, 2=완료
    jira_key = models.CharField(max_length=100, null=True, blank=True)
    is_jira_synced = models.BooleanField(default=False)

    class Meta:
        db_table = "meeting_task"

class SpeakerMapping(models.Model):
    meeting = models.ForeignKey(
        Meeting, on_delete = models.CASCADE, db_column = "meeting_id"
    )
    speaker_label = models.CharField(max_length = 20)
    meeting_users = models.ForeignKey(
        MeetingUsers, on_delete= models.CASCADE, db_column = "meeting_users_id"
    )

    class Meta:
        db_table= "speaker_mapping"