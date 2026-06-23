import os
import re
import requests
from datetime import datetime
import boto3

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.notifications.models import Notification
from apps.users.models import Users
from apps.users.views import get_valid_access_token
from apps.meetings.jira_client import create_jira_issue_for_board
from .models import Meeting, MeetingAgendas, MeetingTask, MeetingUsers, Record, RecordUtterance, MeetingPreparation, PreparationDocument
from .serializers import (
    MeetingAgendaSerializer,
    MeetingSerializer,
    MeetingTaskSerializer,
    RecordUtteranceSerializer,
    MeetingPreparationSerializer,
    build_meeting_participants,
)


def _minutes_payload(meeting, text):
    return {
        "text": text,
        "meeting_id": str(meeting.meeting_id),
        "project_id": str(meeting.project_id),
        "title": meeting.title or "",
        "meeting_datetime": str(meeting.meeting_at or ""),
        "location": meeting.location or "",
    }


def _minutes_result(data):
    if not isinstance(data, dict):
        return {}
    result = data.get("result")
    return result if isinstance(result, dict) else data


def _create_notification(user, notification_type, content, target_id=None):
    Notification.objects.create(
        user=user,
        notification_type=notification_type,
        content=content,
        target_id=target_id,
        is_read=False,
    )

def _send_invite_email(user, meeting) :
    """AWS SES로 회의 초대 이메일 발송"""
    try :
        client=boto3.client("ses", region_name = settings.AWS_REGION)
        client.send_email(
            Source=settings.DEFAULT_FROM_EMAIL,
            Destination={"ToAddresses" : [user.email]},
            Message={
                "Subject" : {
                    "Data" : f"[HPM] {meeting.title}회의에 초대 되었습니다."
                },
                "Body" : {
                    "Text" : {
                        "Data" : f"{user.name}님, \n\n '{meeting.title}' 회의에 초대되었습니다. \n\n 일시 : {meeting.meeting_at} \n\n 장소 : {meeting.location} \n\n https://hpm-meeting.site/meetings/{meeting.meeting_id}/"
                    }
                }
            }
        )

    except Exception as e:
        print(f"이메일 발송 실패 ({user.email}) : {e}")

def _meeting_email_recipients(meeting):
    recipients = []
    seen_user_ids = set()

    if meeting.creator_id and meeting.creator:
        recipients.append(meeting.creator)
        seen_user_ids.add(meeting.creator_id)

    meeting_users = MeetingUsers.objects.filter(meeting=meeting).select_related("user")
    for meeting_user in meeting_users:
        user = meeting_user.user
        if user.users_id in seen_user_ids:
            continue
        recipients.append(user)
        seen_user_ids.add(user.users_id)

    return recipients

def _send_summary_email(user, meeting, tasks):
    task_lines = []
    for idx, task in enumerate(tasks, start=1):
        owner = task.meeting_users.user.name if task.meeting_users_id and task.meeting_users else "미배정"
        due_date = task.due_date.isoformat() if task.due_date else "-"
        priority = task.priority or "-"
        task_lines.append(
            f"{idx}. {task.title} (담당자: {owner}, 기한: {due_date}, 우선순위: {priority})"
        )

    task_text = "\n".join(task_lines) if task_lines else "등록된 태스크가 없습니다."
    meeting_document = meeting.meeting_document or "회의록 내용이 없습니다."

    body = (
        f"{user.name}님,\n\n"
        f"회의록이 확정되었습니다.\n\n"
        f"[회의 정보]\n"
        f"- 회의 제목: {meeting.title}\n"
        f"- 회의 일시: {timezone.localtime(meeting.meeting_at).strftime('%Y-%m-%d %H:%M') if meeting.meeting_at else '-'}\n"
        f"- 회의 장소: {meeting.location or '-'}\n\n"
        f"[회의록]\n"
        f"{meeting_document}\n\n"
        f"[부여된 태스크]\n"
        f"{task_text}\n\n"
        f"프로젝트에서 더 자세한 내용을 확인하실 수 있습니다.\n"
        f"감사합니다."
    )

    client = boto3.client("ses", region_name=settings.AWS_REGION)
    client.send_email(
        Source=settings.DEFAULT_FROM_EMAIL,
        Destination={"ToAddresses": [user.email]},
        Message={
            "Subject": {"Data": f"[HPM] {meeting.title} 회의록 및 태스크 공유"},
            "Body": {"Text": {"Data": body}},
        },
    )

def _notify_task_assigned(task):
    if not task.meeting_users_id or not task.meeting_users:
        return

    _create_notification(
        user=task.meeting_users.user,
        notification_type=Notification.TASK_ASSIGNED,
        content=f"[{task.title}] 업무가 배정되었습니다.",
        target_id=task.meeting_task_id,
    )


def _resolve_meeting_user(meeting, data):
    meeting_users_id = data.get("meeting_users_id")
    if meeting_users_id not in (None, ""):
        try:
            return MeetingUsers.objects.get(
                meeting=meeting,
                meeting_users_id=meeting_users_id,
            )
        except MeetingUsers.DoesNotExist:
            pass

    user_id = data.get("user_id")
    if user_id not in (None, ""):
        try:
            user = Users.objects.get(pk=user_id)
            meeting_user, _ = MeetingUsers.objects.get_or_create(
                meeting=meeting,
                user=user,
            )
            return meeting_user
        except Users.DoesNotExist:
            pass

    return None


def _format_stt_time(value):
    try:
        seconds = int(float(value))
    except (TypeError, ValueError):
        return str(value or "")

    return f"[{seconds // 60:02d}:{seconds % 60:02d}]"


def _stt_utterance_items(result, full_text):
    if not isinstance(result, dict):
        result = {}

    items = (
        result.get("utterances")
        or result.get("segments")
        or result.get("speaker_segments")
        or result.get("diarization")
        or []
    )
    if isinstance(items, dict):
        items = items.get("items") or items.get("segments") or []

    normalized = []
    if isinstance(items, list):
        for index, item in enumerate(items):
            if not isinstance(item, dict):
                continue

            content = item.get("content") or item.get("text") or item.get("transcript") or ""
            content = str(content).strip()
            if not content:
                continue

            speaker = (
                item.get("speaker")
                or item.get("speaker_label")
                or item.get("label")
                or f"SPEAKER_{index + 1:02d}"
            )
            time_value = item.get("time") or item.get("start") or item.get("start_time") or ""
            normalized.append({
                "speaker": str(speaker),
                "time": str(time_value) if str(time_value).startswith("[") else _format_stt_time(time_value),
                "content": content,
            })

    if normalized:
        return normalized

    text = str(full_text or "").strip()
    if not text:
        return []

    return [{"speaker": "SPEAKER_01", "time": "[00:00]", "content": text}]


def _replace_record_utterances(record, result, full_text):
    RecordUtterance.objects.filter(record=record).delete()
    utterances = _stt_utterance_items(result, full_text)
    return [
        RecordUtterance.objects.create(
            record=record,
            speaker=item["speaker"],
            time=item["time"],
            content=item["content"],
        )
        for item in utterances
    ]


# ── 회의 목록 / 생성 ─────────────────────────────────────────────
@api_view(["GET", "POST"])
def meeting_list(request):
    if request.method == "GET":
        project_id = request.query_params.get("project_id")
        qs = Meeting.objects.all().order_by("-meeting_at")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return Response(MeetingSerializer(qs, many=True).data)

    data = request.data
    try:
        from apps.projects.models import Project
        project = Project.objects.get(pk=data.get("project_id", 1))
    except Exception:
        return Response({"error": "프로젝트를 찾을 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)


    user_id = request.auth['user_id']
    creator = Users.objects.get(pk=user_id)
    meeting = Meeting.objects.create(
        project=project,
        title=data.get("title", ""),
        location=data.get("location", ""),
        meeting_at=data.get("meeting_at"),
        meeting_status=Meeting.MeetingStatus.SCHEDULED,
        creator = creator,
    )

    participant_ids = [creator.users_id, *data.get("participants", [])]
    seen_participant_ids = set()
    for participant_id in participant_ids:
        if participant_id in seen_participant_ids:
            continue
        seen_participant_ids.add(participant_id)
        try:
            participant = Users.objects.get(pk=participant_id)
            MeetingUsers.objects.get_or_create(meeting=meeting, user=participant)
            if participant.users_id != creator.users_id:
                _create_notification(
                    user=participant,
                    notification_type=Notification.MEETING_INVITED,
                    content=f"[{meeting.title}] 회의에 초대되었습니다.",
                    target_id=meeting.meeting_id,
                )
                _send_invite_email(participant, meeting)
        except Users.DoesNotExist:
            pass

    return Response(MeetingSerializer(meeting).data, status=status.HTTP_201_CREATED)


# ── 회의 상세 / 수정 / 삭제 ─────────────────────────────────────────────
@api_view(["GET", "PATCH", "DELETE"])
def meeting_detail(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        data = MeetingSerializer(meeting).data
        data["participants"] = build_meeting_participants(meeting)
        data["agenda"] = MeetingAgendaSerializer(MeetingAgendas.objects.filter(meeting=meeting), many=True).data
        data["tasks"] = MeetingTaskSerializer(MeetingTask.objects.filter(meeting=meeting), many=True).data
        return Response(data)


    if request.method == "DELETE":
        meeting.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    for field in ["title", "location", "meeting_document"]:
        if field in request.data:
            setattr(meeting, field, request.data[field])
    meeting.save()
    return Response(MeetingSerializer(meeting).data)


# ── 기초 안건 ────────────────────────────────────────────────────
@api_view(["GET", "POST"])
def agenda_list(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(MeetingAgendaSerializer(MeetingAgendas.objects.filter(meeting=meeting), many=True).data)

    items = request.data.get("agenda", [])
    MeetingAgendas.objects.filter(meeting=meeting).delete()
    # reason, is_confirmed 제거 (모델에 없음)
    created = [
        MeetingAgendas.objects.create(
            meeting=meeting,
            content=i.get("title", ""),
        )
        for i in items
    ]
    return Response(MeetingAgendaSerializer(created, many=True).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def confirm_agenda(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
    # is_confirmed 제거 (모델에 없음) → 확정 개념 자체를 제거
    return Response({"message": "안건이 확정되었습니다."})


# ── 회의 시작 / 종료 ─────────────────────────────────────────────
@api_view(["POST"])
def start_meeting(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if meeting.meeting_status == Meeting.MeetingStatus.IN_PROGRESS:
        return Response({"error": "이미 진행 중인 회의입니다."}, status=status.HTTP_400_BAD_REQUEST)

    meeting.meeting_status = Meeting.MeetingStatus.IN_PROGRESS
    meeting.meeting_at = timezone.now()
    meeting.during_time = "0"
    meeting.is_paused = False
    meeting.save(update_fields=["meeting_status", "meeting_at", "during_time", "is_paused"])

    # OneToOneField라서 get_or_create 사용
    Record.objects.get_or_create(meeting=meeting)

    # 회의 참여자들에게 시작 알림 생성 (생성자 제외)
    meeting_users = MeetingUsers.objects.filter(meeting=meeting)
    for mu in meeting_users:
        if mu.user_id != request.auth["user_id"]:
            _create_notification(
                user=mu.user,
                notification_type="meeting_started",
                content=f"'{meeting.title}' 회의가 시작되었습니다.",
                target_id=meeting.meeting_id
            )

    return Response({"message": "회의가 시작되었습니다.", "meeting_id": meeting_id})


@api_view(["POST"])
def pause_meeting(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if not meeting.is_paused:
        meeting.is_paused = True
        if meeting.meeting_at:
            delta = timezone.now() - meeting.meeting_at
            try:
                curr_sec = int(meeting.during_time or "0")
            except ValueError:
                curr_sec = 0
            meeting.during_time = str(curr_sec + int(delta.total_seconds()))
        meeting.save(update_fields=["is_paused", "during_time"])

    return Response({"message": "회의가 일시 중지되었습니다.", "meeting_id": meeting_id, "is_paused": True})


@api_view(["POST"])
def resume_meeting(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if meeting.is_paused:
        meeting.is_paused = False
        meeting.meeting_at = timezone.now()
        meeting.save(update_fields=["is_paused", "meeting_at"])

    return Response({"message": "회의가 재개되었습니다.", "meeting_id": meeting_id, "is_paused": False})


@api_view(["POST"])
def end_meeting(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    meeting.meeting_status = Meeting.MeetingStatus.FINISHED
    meeting.is_meeting_approve = False
    
    if not meeting.is_paused and meeting.meeting_at:
        delta = timezone.now() - meeting.meeting_at
        try:
            curr_sec = int(meeting.during_time or "0")
        except ValueError:
            curr_sec = 0
        meeting.during_time = str(curr_sec + int(delta.total_seconds()))
    meeting.is_paused = False
    meeting.save(update_fields=["meeting_status", "is_meeting_approve", "during_time", "is_paused"])

    minutes_data = {"content": "", "todo_list": []}
    audio_file = request.FILES.get("audio")

    if audio_file:
        save_dir = os.path.join(settings.MEDIA_ROOT, "records", str(meeting_id))
        os.makedirs(save_dir, exist_ok=True)
        file_path = os.path.join(save_dir, audio_file.name)
        with open(file_path, "wb+") as f:
            for chunk in audio_file.chunks():
                f.write(chunk)

        base_url = settings.RUNPOD_BASE_URL
        try:
            with open(file_path, "rb") as f:
                stt_res = requests.post(f"{base_url}/transcribe", files={"file": f}, timeout=600)
            stt_data = stt_res.json()
            result = stt_data.get("result", {})
            full_text = result.get("text", "")

            # OneToOneField라서 .get() 사용 (record_path 제거)
            record, _ = Record.objects.get_or_create(meeting=meeting)
            record.record_row_text = full_text
            record.save()
            _replace_record_utterances(record, result, full_text)

            txt_dir = os.path.join(settings.MEDIA_ROOT, "texts", str(meeting_id))
            os.makedirs(txt_dir, exist_ok=True)
            with open(os.path.join(txt_dir, f"meeting-{meeting_id}.txt"), "w", encoding="utf-8") as f:
                f.write(full_text)

            minutes_resp = requests.post(
                f"{base_url}/generate-minutes",
                json=_minutes_payload(meeting, full_text),
                timeout=300,
            )
            minutes_resp.raise_for_status()
            minutes_data = _minutes_result(minutes_resp.json())

            meeting.meeting_document = minutes_data.get("content") or minutes_data.get("cotent", "")
            meeting.save()
            _create_tasks_from_todo(meeting, minutes_data.get("todo_list", []))

        except Exception as e:
            return Response(
                {"error": f"STT/회의록 처리 실패: {str(e)}", "meeting_id": meeting_id},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    return Response({"message": "회의가 종료되었습니다.", "meeting_id": meeting_id, "minutes_data": minutes_data})


def _create_tasks_from_todo(meeting, todo_list):
    """
    LLM이 추출한 todo_list에서 태스크 생성
    owner(담당자 이름)로 SpeakerMapping 조회 → meeting_users FK 저장
    """
    for todo in todo_list:
        due_date_str = todo.get("due_date", "")
        try:
            due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            due_date = None

        # owner(SPEAKER_01 등)로 SpeakerMapping 조회 → meeting_users FK 연결
        owner_label = todo.get("owner", "")
        meeting_users = None
        if owner_label:
            mapping = RecordUtterance.objects.filter(
                record__meeting=meeting,
                speaker=owner_label,
                meeting_users__isnull=False,
            ).select_related("meeting_users").first()
            if mapping:
                meeting_users = mapping.meeting_users

        task = MeetingTask.objects.create(
            meeting=meeting,
            meeting_users=meeting_users,   # FK로 저장 (owner 문자열 제거)
            title=todo.get("title", ""),
            content=todo.get("content", ""),
            due_date=due_date,
            priority=todo.get("priority", "Medium"),
            status=0,
        )
        _notify_task_assigned(task)


# ── 발화자 매핑 ──────────────────────────────────────────────────
@api_view(["GET", "POST"])
def speaker_mapping_list(request, meeting_id):
    """발화자 매핑 조회 / 저장"""
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        mappings = (
            RecordUtterance.objects
            .filter(record__meeting=meeting)
            .select_related("meeting_users__user")
            .order_by("time", "utterance_id")
        )
        return Response(RecordUtteranceSerializer(mappings, many=True).data)

    # POST - 기존 발화 row의 담당자만 갱신
    # 요청 형식: {"mappings": [{"utterance_id": 1, "meeting_users_id": 3}, ...]}
    items = request.data.get("mappings", [])
    if not isinstance(items, list):
        return Response({"error": "mappings는 배열이어야 합니다."}, status=status.HTTP_400_BAD_REQUEST)

    for item in items:
        if not isinstance(item, dict):
            continue

        utterance_id = item.get("utterance_id")
        if not utterance_id:
            continue

        try:
            utterance = RecordUtterance.objects.get(
                utterance_id=utterance_id,
                record__meeting=meeting,
            )
        except RecordUtterance.DoesNotExist:
            continue

        meeting_users_id = item.get("meeting_users_id")
        if meeting_users_id in (None, ""):
            utterance.meeting_users = None
            utterance.save(update_fields=["meeting_users"])
            continue

        try:
            meeting_user = MeetingUsers.objects.get(
                meeting=meeting,
                meeting_users_id=meeting_users_id,
            )
        except MeetingUsers.DoesNotExist:
            continue

        utterance.meeting_users = meeting_user
        utterance.save(update_fields=["meeting_users"])

    mappings = (
        RecordUtterance.objects
        .filter(record__meeting=meeting)
        .select_related("meeting_users__user")
        .order_by("time", "utterance_id")
    )
    return Response(RecordUtteranceSerializer(mappings, many=True).data)


# ── 회의록 승인 플로우 ───────────────────────────────────────────

@api_view(["POST"])
def complete_minutes_review(request, meeting_id):
    """회의록 검토 완료 처리"""
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if not meeting.meeting_document:
        return Response({"error": "확정할 회의록이 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

    was_approved = meeting.is_meeting_approve
    meeting.is_meeting_approve = True
    meeting.save(update_fields=["is_meeting_approve"])
    if not was_approved:
        _notify_meeting_users(
            meeting,
            Notification.MINUTES_APPROVED,
            f"[{meeting.title}] 회의록이 확정되었습니다.",
        )
    return Response({"message": "검토 완료되었습니다."})

def _notify_meeting_users(meeting, notification_type, content):
    for mu in MeetingUsers.objects.filter(meeting=meeting).select_related("user"):
        _create_notification(
            user=mu.user,
            notification_type=notification_type,
            content=content,
            target_id=meeting.meeting_id,
        )


# ── 태스크 ───────────────────────────────────────────────────────
@api_view(["GET", "POST"])
def task_list(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(MeetingTaskSerializer(MeetingTask.objects.filter(meeting=meeting), many=True).data)

    data = request.data
    meeting_users = _resolve_meeting_user(meeting, data)

    task = MeetingTask.objects.create(
        meeting=meeting,
        meeting_users=meeting_users,
        title=data.get("title", ""),
        content=data.get("content", ""),
        due_date=data.get("due_date"),
        priority=data.get("priority", "Medium"),
        status=0,
    )
    _notify_task_assigned(task)
    return Response(MeetingTaskSerializer(task).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
def task_detail(request, meeting_id, task_id):
    try:
        task = MeetingTask.objects.get(meeting_task_id=task_id, meeting_id=meeting_id)
    except MeetingTask.DoesNotExist:
        return Response({"error": "태스크를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    old_meeting_users_id = task.meeting_users_id

    for field in ["title", "content", "due_date", "priority", "status"]:
        if field in request.data:
            setattr(task, field, request.data[field])

    if "meeting_users_id" in request.data or "user_id" in request.data:
        if request.data.get("meeting_users_id") in ("", None) and request.data.get("user_id") in ("", None):
            task.meeting_users = None
        else:
            task.meeting_users = _resolve_meeting_user(task.meeting, request.data)

    task.save()
    if task.meeting_users_id and task.meeting_users_id != old_meeting_users_id:
        _notify_task_assigned(task)
    return Response(MeetingTaskSerializer(task).data)


# ── Jira 등록 (OAuth 방식) ───────────────────────────────────────
@api_view(["POST"])
def register_jira_tasks(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if not meeting.project.jira_project_key:
        return Response({"error": "프로젝트에 Jira 프로젝트 키가 설정되지 않았습니다."}, status=status.HTTP_400_BAD_REQUEST)

    # 요청자 user_id로 Jira 토큰 확인
    user_id = request.data.get("user_id") or request.auth.get("user_id")
    if not user_id:
        return Response({"error": "user_id가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = Users.objects.get(users_id=user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    access_token = get_valid_access_token(user)
    if not access_token:
        return Response({"error": "Jira 연동이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)

    cloud_id = user.jira_cloud_id
    if not cloud_id:
        return Response({"error": "Jira 클라우드 ID가 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

    task_ids = request.data.get("task_ids", [])

    registered, failed = [], []

    for task_id in task_ids:
        try:
            task = MeetingTask.objects.get(meeting_task_id=task_id, meeting=meeting)
        except MeetingTask.DoesNotExist:
            failed.append({"task_id": task_id, "reason": "태스크 없음"})
            continue

        assignee_account_id = None
        if task.meeting_users_id and task.meeting_users and task.meeting_users.user:
            assignee_account_id = task.meeting_users.user.jira_account_id

        result = create_jira_issue_for_board(
            task.title,
            access_token,
            cloud_id,
            meeting.project.jira_project_key,
            description=task.content or task.title,
            due_date=str(task.due_date) if task.due_date else None,
            priority=task.priority or "Medium",
            assignee_account_id=assignee_account_id,
        )

        if result.get("success"):
            registered.append(
                {"task_id": task_id, "jira_key": result.get("issue_key", "")}
            )
        else:
            failed.append({"task_id": task_id, "reason": result})

    return Response({"registered": registered, "failed": failed})

@api_view(["POST"])
def send_summary_email(request, meeting_id):
    try:
        meeting = Meeting.objects.select_related("creator").get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    recipients = _meeting_email_recipients(meeting)
    recipient_user_ids = request.data.get("recipient_user_ids")
    if recipient_user_ids is not None:
        try:
            selected_user_ids = {int(user_id) for user_id in recipient_user_ids}
        except (TypeError, ValueError):
            return Response({"error": "수신자 목록이 올바르지 않습니다."}, status=status.HTTP_400_BAD_REQUEST)
        recipients = [user for user in recipients if user.users_id in selected_user_ids]

    if not recipients:
        return Response({"error": "이메일을 발송할 참여자가 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

    if not settings.DEFAULT_FROM_EMAIL:
        return Response({"error": "발신 이메일 설정이 없습니다."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    tasks = list(
        MeetingTask.objects
        .filter(meeting=meeting)
        .select_related("meeting_users__user")
        .order_by("meeting_task_id")
    )
    sent, failed = [], []

    for user in recipients:
        if not user.email:
            failed.append({"user_id": user.users_id, "name": user.name, "reason": "이메일 없음"})
            continue

        try:
            _send_summary_email(user, meeting, tasks)
            sent.append({"user_id": user.users_id, "name": user.name, "email": user.email})
        except Exception as exc:
            failed.append({"user_id": user.users_id, "name": user.name, "email": user.email, "reason": str(exc)})

    if failed:
        return Response({"sent": sent, "failed": failed}, status=status.HTTP_502_BAD_GATEWAY)

    return Response({"sent": sent})

# ── 회의록 생성 (RunPod 엔드포인트) ─────────────────────────────
@api_view(["POST"])
def generate_minutes(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    try:
        record = Record.objects.get(meeting=meeting)
    except Record.DoesNotExist:
        return Response({"error": "녹음 데이터가 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

    if not record.record_row_text:
        return Response({"error": "변환된 텍스트가 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

    base_url = settings.RUNPOD_BASE_URL
    try:
        response = requests.post(
            f"{base_url}/generate-minutes",
            json=_minutes_payload(meeting, record.record_row_text),
            timeout=300,
        )
        response.raise_for_status()
        print(response.json())
        data = _minutes_result(response.json())
    except requests.RequestException as e:
        return Response({"error": f"RunPod 연결 실패: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

    meeting.meeting_document = data.get("content") or data.get("cotent", "")
    meeting.save()
    _create_tasks_from_todo(meeting, data.get("todo_list", []))

    print(Response({
        "message": "회의록 및 태스크 생성이 완료되었습니다.",
        "meeting_id": meeting_id,
        "content": data.get("content", ""),
        "todo_list": data.get("todo_list", [])
    }))

    return Response({
        "message": "회의록 및 태스크 생성이 완료되었습니다.",
        "meeting_id": meeting_id,
        "content": data.get("content", ""),
        "todo_list": data.get("todo_list", [])
    })


# ── OCR + 기초 안건 생성 ─────────────────────────────────────────
@api_view(["POST"])
def generate_agenda(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    ocr_text = ""
    uploaded_file = request.FILES.get("file")

    if uploaded_file:
        ocr_base_url = settings.RUNPOD_OCR_BASE_URL
        if not ocr_base_url:
            return Response({"error": "OCR 서버 주소가 설정되지 않았습니다."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        try:
            files = {"file": (uploaded_file.name, uploaded_file.read(), uploaded_file.content_type)}
            ocr_res = requests.post(f"{ocr_base_url}/ocr", files=files, timeout=300)
            ocr_res.raise_for_status()
            ocr_data = ocr_res.json()
            ocr_text = ocr_data.get("result", {}).get("text", "")
        except Exception as e:
            return Response({"error": f"OCR 처리 실패: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

    base_url = settings.RUNPOD_BASE_URL
    try:
        payload = {"title": meeting.title, "ocr_text": ocr_text, "context": meeting.project.context or ""}
        agenda_res = requests.post(f"{base_url}/generate-agendas", json=payload, timeout=300)
        agenda_res.raise_for_status()
        agenda_data = agenda_res.json()
    except Exception as e:
        return Response({"error": f"안건 생성 실패: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

    items = agenda_data.get("result", {}).get("agendas", [])

    MeetingAgendas.objects.filter(meeting=meeting).delete()
    created = [
        MeetingAgendas.objects.create(
            meeting=meeting,
            content=i.get("title", ""),
        )
        for i in items
    ]

    return Response({
        "ocr_text": ocr_text,
        "agenda": MeetingAgendaSerializer(created, many=True).data,
    }, status=status.HTTP_201_CREATED)


def _parse_prep_markdown(text):
    sections = {
        "purpose": "",
        "project_status": "",
        "rule": "",
        "effect": ""
    }
    
    parts = re.split(r'(####?\s+\d+\.\s+[^\n]+)', text)
    current_section = None
    for part in parts:
        part = part.strip()
        if not part:
            continue
        
        header_match = re.match(r'####?\s+(\d+)\.\s+([^\n]+)', part)
        if header_match:
            num = int(header_match.group(1))
            title = header_match.group(2)
            if num == 2 or "목적" in title:
                current_section = "purpose"
            elif num in [3, 5] or "맥락" in title or "상태" in title or "논의" in title:
                current_section = "project_status"
            elif num in [4, 6] or "근거" in title or "규정" in title or "리스크" in title:
                current_section = "rule"
            elif num == 7 or "준비" in title or "기대" in title or "효과" in title or "결과" in title:
                current_section = "effect"
            else:
                current_section = None
        else:
            if current_section and part:
                if sections[current_section]:
                    sections[current_section] += "\n\n" + part
                else:
                    sections[current_section] = part
                    
    for k in sections:
        sections[k] = sections[k].strip()
    return sections


def _compile_prep_markdown(prep):
    lines = [
        "### 회의 준비 자료",
        "",
        "#### 1. 회의 목적",
        prep.purpose or "",
        "",
        "#### 2. 프로젝트 현재 상태",
        prep.project_status or "",
        "",
        "#### 3. 관련 규정 및 제약사항",
        prep.rule or "",
        "",
        "#### 4. 회의 종료 후 기대 결과",
        prep.effect or ""
    ]
    return "\n".join(lines)


@api_view(["GET", "POST", "PATCH"])
def prep_material_detail(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    prep = MeetingPreparation.objects.filter(meeting=meeting).first()

    if request.method == "GET":
        if not prep:
            return Response({
                "preration_id": None,
                "meeting": meeting_id,
                "purpose": "",
                "project_status": "",
                "rule": "",
                "effect": ""
            })
        serializer = MeetingPreparationSerializer(prep, context={"request": request})
        return Response(serializer.data)

    data = request.data
    if not prep:
        prep = MeetingPreparation.objects.create(
            meeting=meeting,
            purpose=data.get("purpose", ""),
            project_status=data.get("project_status", ""),
            rule=data.get("rule", ""),
            effect=data.get("effect", "")
        )
    else:
        prep.purpose = data.get("purpose", prep.purpose)
        prep.project_status = data.get("project_status", prep.project_status)
        prep.rule = data.get("rule", prep.rule)
        prep.effect = data.get("effect", prep.effect)
        prep.save()

    meeting.meeting_document = _compile_prep_markdown(prep)
    meeting.save(update_fields=["meeting_document"])

    serializer = MeetingPreparationSerializer(prep, context={"request": request})
    return Response(serializer.data)


@api_view(["POST"])
def generate_prep_material(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    participants = []
    meeting_users = MeetingUsers.objects.filter(meeting=meeting).select_related("user")
    for mu in meeting_users:
        participants.append({
            "name": mu.user.name,
            "work": mu.user.work or ""
        })

    agendas = [agenda.content for agenda in MeetingAgendas.objects.filter(meeting=meeting)]

    payload = {
        "title": meeting.title,
        "meeting_id": str(meeting.meeting_id),
        "project_id": str(meeting.project_id),
        "meeting_datetime": meeting.meeting_at.isoformat() if meeting.meeting_at else "",
        "location": meeting.location or "",
        "project_context": meeting.project.context or "",
        "participants": participants,
        "agendas": agendas,
        "max_previous_meetings": 5
    }

    base_url = settings.RUNPOD_BASE_URL
    try:
        response = requests.post(f"{base_url}/generate-preparation", json=payload, timeout=300)
        response.raise_for_status()
        resp_data = response.json()
    except Exception as e:
        return Response({"error": f"준비자료 생성 실패: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

    result_data = resp_data.get("result", {})
    text = result_data.get("text") or result_data.get("document") or ""

    parsed = _parse_prep_markdown(text)

    prep, created = MeetingPreparation.objects.get_or_create(meeting=meeting)
    prep.purpose = parsed["purpose"]
    prep.project_status = parsed["project_status"]
    prep.rule = parsed["rule"]
    prep.effect = parsed["effect"]
    prep.save()

    meeting.meeting_document = _compile_prep_markdown(prep)
    meeting.save(update_fields=["meeting_document"])

    PreparationDocument.objects.filter(preparation=prep).delete()
    for source in result_data.get("sources", []):
        try:
            doc_id = source.get("document_id")
            if doc_id is not None:
                PreparationDocument.objects.create(
                    preparation=prep,
                    document_id=int(doc_id)
                )
        except (ValueError, TypeError):
            pass

    serializer = MeetingPreparationSerializer(prep, context={"request": request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)

