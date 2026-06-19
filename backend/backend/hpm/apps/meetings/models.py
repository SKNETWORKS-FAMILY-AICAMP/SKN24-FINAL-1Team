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
    MINUTES_APPROVED  = "approved"
    MINUTES_CHOICES = [
        (MINUTES_DRAFT,     "검토 전"),      # 회의 종료 직후
        (MINUTES_APPROVED,  "검토 완료")     # 본인이 검토 완료 누름

    ]

    meeting_id = models.AutoField(primary_key=True, verbose_name="회의 식별 번호")
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, db_column="project_id", verbose_name="프로젝트"
    )
    creator = models.ForeignKey(
        Users, on_delete=models.PROTECT, db_column="creator_id",
        related_name="created_meetings", null=True, blank=True, verbose_name="회의 생성자"
    )

    title         = models.CharField(max_length=90, verbose_name="회의 주제")
    location      = models.CharField(max_length=150, blank=True, verbose_name="회의 장소")
    meeting_at    = models.DateTimeField(verbose_name="회의 일시")
    meeting_document = models.TextField(null=True, blank=True, verbose_name="회의록")

    # 기존 is_meeting 유지 + 새 status 추가
    is_meeting     = models.BooleanField(default=False, verbose_name="회의 진행 여부")
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SCHEDULED, verbose_name="회의 상태")
    minutes_status = models.CharField(max_length=20, choices=MINUTES_CHOICES, null=True, blank=True, verbose_name="회의록 승인 상태")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성 일시")

    class Meta:
        db_table = "meeting"


class Record(models.Model):
    meeting         = models.OneToOneField(Meeting, on_delete=models.CASCADE, db_column="meeting_id", primary_key=True, verbose_name="회의")
    record_row_text = models.TextField(null=True, blank=True, verbose_name="녹음 원본 텍스트")

    class Meta:
        db_table = "record"


class MeetingUsers(models.Model):
    meeting_users_id = models.AutoField(primary_key=True, verbose_name="회의 참여자 식별 번호")
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, db_column="meeting_id", verbose_name="회의")
    user    = models.ForeignKey(Users,   on_delete=models.CASCADE, db_column="user_id", verbose_name="참여자")

    class Meta:
        db_table = "meeting_users"


class MeetingAgendas(models.Model):
    agenda_id = models.AutoField(primary_key=True, verbose_name="안건 식별 번호")
    meeting   = models.ForeignKey(Meeting, on_delete=models.CASCADE, db_column="meeting_id", verbose_name="회의 식별 번호")
    content   = models.TextField(verbose_name="안건 내용")

    class Meta:
        db_table = "meeting_agendas"


class MeetingPreparation(models.Model):
    meeting  = models.ForeignKey(Meeting, on_delete=models.CASCADE, db_column="meeting_id", verbose_name="회의")
    document = models.TextField(verbose_name="준비 자료 내용")

    class Meta:
        db_table = "meeting_preparation"


class OuterDocument(models.Model):
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, db_column="meeting_id", verbose_name="회의 식별 번호")
    path    = models.TextField(verbose_name="OCR 파일 경로")

    class Meta:
        db_table = "outer_document"


class MeetingTask(models.Model):
    meeting_task_id = models.AutoField(primary_key=True, verbose_name="태스크 식별 번호")
    meeting         = models.ForeignKey(Meeting, on_delete=models.CASCADE, db_column="meeting_id", verbose_name="회의")
    title    = models.CharField(max_length=255, verbose_name="업무 제목")
    content  = models.TextField(blank=True, verbose_name="업무 내용")
    meeting_users   = models.ForeignKey(
        MeetingUsers,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        db_column="meeting_users_id",
        verbose_name="담당자"
    )
    due_date = models.DateField(null=True, blank=True, verbose_name="업무 마감 기한")
    priority = models.CharField(max_length=20, blank=True, verbose_name="업무 우선순위(# High/Medium/Low/Lowest)")
    status   = models.IntegerField(default=0, verbose_name="업무 상태(0=미완료, 1=진행중, 2=완료)")
    is_jira_synced = models.BooleanField(default=False, verbose_name="Jira 등록 여부")

    class Meta:
        db_table = "meeting_task"

class SpeakerMapping(models.Model):
    meeting       = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        db_column="meeting_id",
        verbose_name="회의"
    )
    speaker_label = models.CharField(max_length=20, verbose_name="발화자 라벨")  # "SPEAKER_01"
    meeting_users = models.ForeignKey(
        MeetingUsers,
        on_delete=models.CASCADE,
        db_column="meeting_users_id",
        verbose_name="실제 참여자"
    )

    class Meta:
        db_table = "speaker_mapping"