import os
import requests
from datetime import datetime
import redis
import json
from django.http import StreamingHttpResponse
from django.utils.timezone import now

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.notifications.models import Notification
from apps.users.models import Users
from .models import Meeting, MeetingAgendas, MeetingTask, MeetingUsers, Record,SpeakerMapping
from .serializers import MeetingAgendaSerializer, MeetingSerializer, MeetingTaskSerializer, SpeakerMappingSerializer

PRIORITY_MAP = {"High": 1, "Medium": 2, "Low": 3, "Lowest": 4}


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

    meeting = Meeting.objects.create(
        project=project,
        title=data.get("title", ""),
        location=data.get("location", ""),
        meeting_at=data.get("meeting_at"),
        end_at=data.get("end_at"),
        status=Meeting.STATUS_SCHEDULED,
    )

    for user_id in data.get("participants", []):
        try:
            MeetingUsers.objects.create(meeting=meeting, user=Users.objects.get(pk=user_id))
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

    for field in ["special_note", "title", "location"]:
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
    created = [MeetingAgendas.objects.create(meeting=meeting, content=i.get("title",""), reason=i.get("reason",""), is_confirmed=False) for i in items]
    return Response(MeetingAgendaSerializer(created, many=True).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def confirm_agenda(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
    MeetingAgendas.objects.filter(meeting=meeting).update(is_confirmed=True)
    return Response({"message": "안건이 확정되었습니다."})


# ── 회의 시작 / 종료 ─────────────────────────────────────────────
@api_view(["POST"])
def start_meeting(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if meeting.status == Meeting.STATUS_IN_PROGRESS:
        return Response({"error": "이미 진행 중인 회의입니다."}, status=status.HTTP_400_BAD_REQUEST)

    meeting.status = Meeting.STATUS_IN_PROGRESS
    meeting.is_meeting = True
    meeting.save()
    Record.objects.create(meeting=meeting)

    r = redis.Redis(host='localhost', port=6379)
    r.publish(f"meeting:{meeting_id}", json.dumps({
        "event" : "meeting_started",
        "meeting_id" : meeting_id,
        "status" : "회의 진행 중"
    }, ensure_ascii=False))

    return Response({"message": "회의가 시작되었습니다.", "meeting_id": meeting_id})


@api_view(["POST"])
def end_meeting(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    meeting.status = Meeting.STATUS_FINISHED
    meeting.is_meeting = False
    meeting.minutes_status = Meeting.MINUTES_DRAFT
    meeting.save()

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
            participants = MeetingUsers.objects.filter(meeting=meeting).values_list("user__name", flat=True)
            with open(file_path, "rb") as f:
                stt_res = requests.post(
                    f"{base_url}/transcribe",
                    files = {"file":f},
                    data = {"participants" : ",".join(participants)},
                    timeout=600
                )
            full_text = stt_res.text

            record = Record.objects.filter(meeting=meeting).last()
            if record:
                record.record_path = file_path
                record.record_row_text = full_text
                record.save()
                txt_dir = os.path.join(settings.MEDIA_ROOT, "texts", str(meeting_id))
                os.makedirs(txt_dir, exist_ok=True)
                with open(os.path.join(txt_dir, f"meeting-{meeting_id}.txt"), "w", encoding="utf-8") as f:
                    f.write(full_text)

            minutes_resp = requests.post(f"{base_url}/generate-minutes", json={
                "text": full_text,
                "meeting_id" : str(meeting_id),
                "title" : meeting.title,
                "meeting_datetime" : str(meeting.meeting_at),
                "location" : meeting.location,
                }, 
                timeout=300)
            minutes_resp.raise_for_status()
            minutes_data = minutes_resp.json()

            result = minutes_data.get("result", {})
            meeting.meeting_document = result.get("content", "")
            meeting.save()

            _create_tasks_from_todo(meeting, result.get("todo_list", []))
        except Exception as e:
            return Response({"error": f"STT/회의록 처리 실패: {str(e)}", "meeting_id": meeting_id}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({"message": "회의가 종료되었습니다.", "meeting_id": meeting_id, "minutes_data": minutes_data})


def _create_tasks_from_todo(meeting, todo_list):
    for todo in todo_list:
        due_date_str = todo.get("due_date", "")
        try:
            due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            due_date = None
        MeetingTask.objects.create(
            meeting=meeting, title=todo.get("title",""), content=todo.get("content",""),
            owner=todo.get("owner",""), due_date=due_date, priority=todo.get("priority","Medium"), status=0,
        )


# ── 회의록 승인 플로우 ───────────────────────────────────────────
@api_view(["POST"])
def request_minutes_approval(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if meeting.minutes_status not in [None, Meeting.MINUTES_DRAFT, Meeting.MINUTES_REJECTED]:
        return Response({"error": "승인 요청 불가 상태입니다."}, status=status.HTTP_400_BAD_REQUEST)

    meeting.minutes_status = Meeting.MINUTES_REVIEWING
    meeting.save()

    try:
        creator = meeting.project.project_owner
        Notification.objects.create(user=creator, content=f"[{meeting.title}] 회의록 확정 승인 요청이 있습니다.", is_read=False)
    except Exception:
        pass

    return Response({"message": "승인 요청이 전송되었습니다.", "minutes_status": "reviewing"})


@api_view(["POST"])
def approve_minutes(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if meeting.minutes_status != Meeting.MINUTES_REVIEWING:
        return Response({"error": "검토 중 상태가 아닙니다."}, status=status.HTTP_400_BAD_REQUEST)

    meeting.minutes_status = Meeting.MINUTES_APPROVED
    meeting.save()
    _notify_meeting_users(meeting, f"[{meeting.title}] 회의록이 승인되었습니다.")
    return Response({"message": "회의록이 승인되었습니다.", "minutes_status": "approved"})


@api_view(["POST"])
def reject_minutes(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if meeting.minutes_status != Meeting.MINUTES_REVIEWING:
        return Response({"error": "검토 중 상태가 아닙니다."}, status=status.HTTP_400_BAD_REQUEST)

    meeting.minutes_status = Meeting.MINUTES_REJECTED
    meeting.save()
    _notify_meeting_users(meeting, f"[{meeting.title}] 회의록 승인이 거절되었습니다. 수정 후 재요청해 주세요.")
    return Response({"message": "회의록 승인이 거절되었습니다.", "minutes_status": "rejected"})


def _notify_meeting_users(meeting, content):
    for mu in MeetingUsers.objects.filter(meeting=meeting).select_related("user"):
        Notification.objects.create(user=mu.user, content=content, is_read=False)


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
    task = MeetingTask.objects.create(
        meeting=meeting, title=data.get("title",""), content=data.get("content",""),
        owner=data.get("owner",""), due_date=data.get("due_date"), priority=data.get("priority","Medium"), status=0,
    )
    return Response(MeetingTaskSerializer(task).data, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
def task_detail(request, meeting_id, task_id):
    try:
        task = MeetingTask.objects.get(meeting_task_id=task_id, meeting_id=meeting_id)
    except MeetingTask.DoesNotExist:
        return Response({"error": "태스크를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    for field in ["title", "content", "owner", "due_date", "priority", "status"]:
        if field in request.data:
            setattr(task, field, request.data[field])
    task.save()
    return Response(MeetingTaskSerializer(task).data)


# ── Jira 등록 ────────────────────────────────────────────────────
@api_view(["POST"])
def register_jira_tasks(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    task_ids = request.data.get("task_ids", [])
    jira_base_url = getattr(settings, "JIRA_BASE_URL", "")
    jira_token    = getattr(settings, "JIRA_API_TOKEN", "")
    jira_project  = getattr(settings, "JIRA_PROJECT_KEY", "HPM")

    registered, failed = [], []

    for task_id in task_ids:
        try:
            task = MeetingTask.objects.get(meeting_task_id=task_id, meeting=meeting)
        except MeetingTask.DoesNotExist:
            failed.append({"task_id": task_id, "reason": "태스크 없음"})
            continue

        if jira_base_url and jira_token:
            try:
                payload = {"fields": {
                    "project": {"key": jira_project},
                    "summary": task.title,
                    "description": {"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":task.content or task.title}]}]},
                    "issuetype": {"name": "Task"},
                    "priority": {"name": task.priority or "Medium"},
                    "duedate": str(task.due_date) if task.due_date else None,
                }}
                resp = requests.post(f"{jira_base_url}/rest/api/3/issue", json=payload,
                    headers={"Authorization": f"Bearer {jira_token}", "Content-Type": "application/json"}, timeout=10)
                if resp.status_code in [200, 201]:
                    jira_key = resp.json().get("key", "")
                    task.jira_key = jira_key
                    task.is_jira_synced = True
                    task.save()
                    registered.append({"task_id": task_id, "jira_key": jira_key})
                else:
                    failed.append({"task_id": task_id, "reason": resp.text})
            except Exception as e:
                failed.append({"task_id": task_id, "reason": str(e)})
        else:
            task.is_jira_synced = True
            task.jira_key = f"HPM-{task_id}"
            task.save()
            registered.append({"task_id": task_id, "jira_key": f"HPM-{task_id}"})

    return Response({"registered": registered, "failed": failed})


# ── 회의록 생성 (기존 RunPod 엔드포인트 유지) ───────────────────
@api_view(["POST"])
def generate_minutes(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    record = Record.objects.filter(meeting=meeting).last()
    if not record or not record.record_row_text:
        return Response({"error": "변환된 텍스트가 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

    
    transcript = record.record_row_text
    mappings = SpeakerMapping.objects.filter(meeting=meeting).select_related("meeting_users")
    for mapping in mappings:
        speaker_label = mapping.speaker_label          
        real_name = mapping.meeting_users.user.name    
        transcript = transcript.replace(speaker_label, real_name)

    base_url = settings.RUNPOD_BASE_URL
    try:
        response = requests.post(f"{base_url}/generate-minutes", json={
            "text": transcript,
            "meeting_id" : str(meeting_id),
            "title" : meeting.title,
            "meeting_datetime" : str(meeting.meeting_at),
            "location" : meeting.location,
            }, timeout=300)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as e:
        return Response({"error": f"RunPod 연결 실패: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

    result = data.get("result", {})
    
    meeting.meeting_document = result.get("content", "")
    meeting.save()
    _create_tasks_from_todo(meeting, result.get("todo_list", []))

    return Response({"message": "회의록 및 태스크 생성이 완료되었습니다.", "meeting_id": meeting_id,
        "content": result.get("content", ""), "todo_list": result.get("todo_list", [])})

# ── OCR + 기초 안건 생성 ───────────────────────────────────────────
@api_view(["POST"])
def generate_agenda(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    ocr_text = ""
    uploaded_file = request.FILES.get("file")

    # 1) 파일이 있으면 OCR 서버로 전달
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

    # 2) 회의 정보 + OCR 텍스트로 안건 생성 요청
    base_url = settings.RUNPOD_BASE_URL
    try:
        payload = {
            "title": meeting.title,
            "ocr_text": ocr_text,
        }
        agenda_res = requests.post(f"{base_url}/generate-agendas", json=payload, timeout=300)
        agenda_res.raise_for_status()
        agenda_data = agenda_res.json()
    except Exception as e:
        return Response({"error": f"안건 생성 실패: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

    items = agenda_data.get("result", {}).get("agendas", [])

    # 3) DB에 저장 (기존 agenda_list POST와 동일 로직)
    MeetingAgendas.objects.filter(meeting=meeting).delete()
    created = [
        MeetingAgendas.objects.create(
            meeting=meeting,
            content=i.get("title", ""),
            reason=i.get("content", ""),  # ← RunPod 응답의 "content"를 reason에 매핑
            is_confirmed=False,
        )
        for i in items
    ]

    return Response({
        "ocr_text": ocr_text,
        "agenda": MeetingAgendaSerializer(created, many=True).data,
    }, status=status.HTTP_201_CREATED)


def meeting_stream(request, meeting_id):
    def event_stream():
        r =  redis.Redis(host='localhost', port=6379)
        pubsub = r.pubsub()
        pubsub.subscribe(f"meeting:{meeting_id}")

        for message in pubsub.listen():
            if message["type"] == "message":
                yield f"data: {message['data'].decode()}\n\n"

    return StreamingHttpResponse(
        event_stream(),
        content_type = "text/event-stream; charset=utf-8"
    )


# -- 발화자 매핑

@api_view(["GET", "POST"])
def speaker_mapping_list(request, meeting_id):
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error" : "회의를 찾을 수 없습니다"}, status = status.HTTP_404_NOT_FOUND)
    
    if request.method == "GET":
        mappings = SpeakerMapping.objects.filter(meeting=meeting)
        return Response(SpeakerMappingSerializer(mappings, many=True).data)
    
    mapping = SpeakerMapping.objects.create(
        meeting=meeting,
        speaker_label = request.data.get("speaker_label"),
        meeting_users_id =  request.data.get("meeting_users_id"),
    )
    return Response(SpeakerMappingSerializer(mapping).data, status = status.HTTP_201_CREATED)

@api_view(["DELETE"])
def speaker_mapping_delete(request, meeting_id, mapping_id):
    try:
        mapping = SpeakerMapping.objects.get(pk=mapping_id, meeting_id=meeting_id)
    except SpeakerMapping.DoesNotExist:
        return Response({"error": "매핑을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
    mapping.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)