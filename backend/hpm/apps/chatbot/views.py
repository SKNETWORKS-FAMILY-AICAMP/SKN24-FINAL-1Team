import requests
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.meetings.models import Meeting, MeetingUsers
from apps.projects.models import Project, ProjectUsers
from .models import Chatbot, ChatHistory
from .serializers import ChatHistorySerializer


NO_RELATED_DOCS_MESSAGE = "관련 문서에서 확인할 수 있는 내용이 없습니다."


def _can_access_meeting(request, meeting):
    user_id = request.auth["user_id"]
    return meeting.creator_id == user_id or MeetingUsers.objects.filter(
        meeting=meeting,
        user_id=user_id,
    ).exists()


def _can_access_project(request, project_id):
    user_id = request.auth["user_id"]
    return (
        Project.objects.filter(project_id=project_id, project_owner_id=user_id).exists()
        or ProjectUsers.objects.filter(project_id=project_id, user_id=user_id).exists()
    )


def _extract_rag_result(response):
    response.raise_for_status()
    response.encoding = "utf-8"
    payload = response.json()
    result = payload.get("result", {}) if isinstance(payload, dict) else {}
    if not isinstance(result, dict):
        return NO_RELATED_DOCS_MESSAGE, []
    return result.get("answer") or NO_RELATED_DOCS_MESSAGE, result.get("citations", [])


def _request_rag(payload):
    rag_url = getattr(settings, "RAG_SERVER_URL", "http://127.0.0.1:8088/chat")
    try:
        response = requests.post(rag_url, json=payload, timeout=30)
        return _extract_rag_result(response)
    except Exception:
        return NO_RELATED_DOCS_MESSAGE, []


@api_view(["POST"])
def chat(request, meeting_id):
    question = request.data.get("question", "").strip()
    user_id = request.auth["user_id"]

    if len(question) < 2:
        return Response({"error": "2자 이상 입력해주세요."}, status=status.HTTP_400_BAD_REQUEST)
    if len(question) > 200:
        return Response({"error": "200자 이내로 입력해주세요."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if not _can_access_meeting(request, meeting):
        return Response({"error": "회의 접근 권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

    meeting_user, _ = MeetingUsers.objects.get_or_create(
        meeting=meeting,
        user_id=user_id,
    )
    chatbot, _ = Chatbot.objects.get_or_create(
        meeting=meeting,
        meeting_users=meeting_user,
    )

    history = ChatHistory.objects.filter(chat=chatbot).order_by("created_at")
    context = [
        {"role": "user" if item.type == 1 else "assistant", "content": item.content}
        for item in history
    ]

    answer, citations = _request_rag(
        {
            "question": question,
            "context": "",
            "history": context,
            "sources": [],
            "project_id": str(meeting.project_id),
            "meeting_id": str(meeting_id),
            "source_scope": "project",
            "source_types": [],
            "max_previous_meetings": 5,
            "min_relevance_score": None,
        }
    )

    ChatHistory.objects.create(chat=chatbot, type=1, content=question)
    ChatHistory.objects.create(chat=chatbot, type=2, content=answer)

    return Response({"answer": answer, "sources": citations})


@api_view(["GET"])
def chat_history(request, meeting_id):
    user_id = request.auth["user_id"]
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if not _can_access_meeting(request, meeting):
        return Response({"error": "회의 접근 권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

    meeting_user = MeetingUsers.objects.filter(meeting=meeting, user_id=user_id).first()
    chatbot = Chatbot.objects.filter(meeting=meeting, meeting_users=meeting_user).first()
    if not chatbot:
        return Response([])

    history = ChatHistory.objects.filter(chat=chatbot).order_by("created_at")
    return Response(ChatHistorySerializer(history, many=True).data)


@api_view(["POST"])
def project_chat(request, project_id):
    question = request.data.get("question", "").strip()

    if len(question) < 2:
        return Response({"error": "2자 이상 입력해주세요."}, status=status.HTTP_400_BAD_REQUEST)
    if len(question) > 200:
        return Response({"error": "200자 이내로 입력해주세요."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        Project.objects.get(project_id=project_id)
    except Project.DoesNotExist:
        return Response({"error": "프로젝트를 찾을 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

    if not _can_access_project(request, project_id):
        return Response({"error": "프로젝트 접근 권한이 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

    answer, citations = _request_rag(
        {
            "question": question,
            "context": "",
            "history": [],
            "sources": [],
            "project_id": str(project_id),
            "meeting_id": "",
            "source_scope": "project",
            "source_types": [],
            "max_previous_meetings": 5,
            "min_relevance_score": None,
        }
    )

    return Response({"answer": answer, "sources": citations})
