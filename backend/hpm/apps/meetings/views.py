import os
import requests
from datetime import datetime

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.notifications.models import Notification
from apps.users.models import Users
from .models import Meeting, MeetingAgendas, MeetingTask, MeetingUsers, Record, RecordUtterance
from .serializers import MeetingAgendaSerializer, MeetingSerializer, MeetingTaskSerializer, RecordUtteranceSerializer


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


def _notify_task_assigned(task):
    if not task.meeting_users_id or not task.meeting_users:
        return

    _create_notification(
        user=task.meeting_users.user,
        notification_type=Notification.TASK_ASSIGNED,
        content=f"[{task.title}] 업무가 배정되었습니다.",
        target_id=task.meeting_task_id,
    )


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

    for participant_id in data.get("participants", []):
        try:
            participant = Users.objects.get(pk=participant_id)
            MeetingUsers.objects.create(meeting=meeting, user=participant)
            _create_notification(
                user=participant,
                notification_type=Notification.MEETING_INVITED,
                content=f"[{meeting.title}] 회의에 초대되었습니다.",
                target_id=meeting.meeting_id,
            )
        except Users.DoesNotExist:
            pass

    return Response(MeetingSerializer(meeting).data, status=status.HTTP_201_CREATED)


# ── 회의 상세 / 수정 ─────────────────────────────────────────────
@api_view(["GET", "PATCH"])
def meeting_detail(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        data = MeetingSerializer(meeting).data
        participants = MeetingUsers.objects.filter(meeting=meeting).select_related("user")
        data["participants"] = [{"user_id": mu.user.users_id, "name": mu.user.name} for mu in participants]
        data["agenda"] = MeetingAgendaSerializer(MeetingAgendas.objects.filter(meeting=meeting), many=True).data
        data["tasks"] = MeetingTaskSerializer(MeetingTask.objects.filter(meeting=meeting), many=True).data
        return Response(data)

    # special_note 제거 (모델에 없음) → title, location만 수정 가능
    for field in ["title", "location"]:
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
    meeting.save(update_fields=["meeting_status"])

    # OneToOneField라서 get_or_create 사용
    Record.objects.get_or_create(meeting=meeting)
    return Response({"message": "회의가 시작되었습니다.", "meeting_id": meeting_id})


@api_view(["POST"])
def end_meeting(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    meeting.meeting_status = Meeting.MeetingStatus.FINISHED
    meeting.is_meeting_approve = False
    meeting.save(update_fields=["meeting_status", "is_meeting_approve"])

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

            meeting.meeting_document = minutes_data.get("content", "")
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
                meeting=meeting,
                speaker_label=owner_label
            ).first()
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
        mappings = RecordUtterance.objects.filter(meeting=meeting)
        return Response(RecordUtteranceSerializer(mappings, many=True).data)

    # POST - 매핑 저장 (기존 매핑 삭제 후 새로 저장)
    # 요청 형식: [{"speaker_label": "SPEAKER_01", "meeting_users_id": 3}, ...]
    items = request.data.get("mappings", [])
    RecordUtterance.objects.filter(meeting=meeting).delete()
    created = []
    for item in items:
        try:
            meeting_user = MeetingUsers.objects.get(
                meeting_users_id=item.get("meeting_users_id")
            )
            mapping = RecordUtterance.objects.create(
                meeting=meeting,
                speaker_label=item.get("speaker_label", ""),
                meeting_users=meeting_user,
            )
            created.append(mapping)
        except MeetingUsers.DoesNotExist:
            pass

    return Response(RecordUtteranceSerializer(created, many=True).data, status=status.HTTP_201_CREATED)


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
    return Response({"message": "검토 완료되었습니다.", "minutes_status": "approved"})

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
    meeting_users = None
    meeting_users_id = data.get("meeting_users_id")
    if meeting_users_id:
        try:
            meeting_users = MeetingUsers.objects.get(meeting_users_id=meeting_users_id)
        except MeetingUsers.DoesNotExist:
            pass

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


@api_view(["PATCH"])
def task_detail(request, meeting_id, task_id):
    try:
        task = MeetingTask.objects.get(meeting_task_id=task_id, meeting_id=meeting_id)
    except MeetingTask.DoesNotExist:
        return Response({"error": "태스크를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    old_meeting_users_id = task.meeting_users_id

    for field in ["title", "content", "due_date", "priority", "status"]:
        if field in request.data:
            setattr(task, field, request.data[field])

    if "meeting_users_id" in request.data:
        try:
            task.meeting_users = MeetingUsers.objects.get(
                meeting_users_id=request.data["meeting_users_id"]
            )
        except MeetingUsers.DoesNotExist:
            task.meeting_users = None

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

    # 요청자 user_id로 Jira 토큰 확인
    user_id = request.data.get("user_id")
    if not user_id:
        return Response({"error": "user_id가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = Users.objects.get(users_id=user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    # users/views.py의 get_valid_access_token 함수 사용
    from apps.users.views import get_valid_access_token
    access_token = get_valid_access_token(user)
    if not access_token:
        return Response({"error": "Jira 연동이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)

    cloud_id = user.jira_cloud_id
    if not cloud_id:
        return Response({"error": "Jira 클라우드 ID가 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

    # 프론트에서 선택한 Jira 프로젝트 키
    jira_project_key = request.data.get("jira_project_key", "HPM")
    task_ids = request.data.get("task_ids", [])

    registered, failed = [], []

    for task_id in task_ids:
        try:
            task = MeetingTask.objects.get(meeting_task_id=task_id, meeting=meeting)
        except MeetingTask.DoesNotExist:
            failed.append({"task_id": task_id, "reason": "태스크 없음"})
            continue

        try:
            payload = {"fields": {
                "project": {"key": jira_project_key},
                "summary": task.title,
                "description": {
                    "type": "doc",
                    "version": 1,
                    "content": [{
                        "type": "paragraph",
                        "content": [{"type": "text", "text": task.content or task.title}]
                    }]
                },
                "issuetype": {"name": "Task"},
                "priority": {"name": task.priority or "Medium"},
                "duedate": str(task.due_date) if task.due_date else None,
            }}

            resp = requests.post(
                f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/issue",
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                timeout=10
            )

            if resp.status_code in [200, 201]:
                task.is_jira_synced = True
                task.save()
                registered.append({"task_id": task_id, "jira_key": resp.json().get("key", "")})
            else:
                failed.append({"task_id": task_id, "reason": resp.text})

        except Exception as e:
            failed.append({"task_id": task_id, "reason": str(e)})

    return Response({"registered": registered, "failed": failed})

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
        data = _minutes_result(response.json())
    except requests.RequestException as e:
        return Response({"error": f"RunPod 연결 실패: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

    meeting.meeting_document = data.get("content", "")
    meeting.save()
    _create_tasks_from_todo(meeting, data.get("todo_list", []))

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
        payload = {"title": meeting.title, "ocr_text": ocr_text}
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
