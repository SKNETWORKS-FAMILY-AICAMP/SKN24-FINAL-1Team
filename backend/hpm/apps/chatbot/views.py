import requests
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.meetings.models import Meeting, MeetingUsers
from .models import Chatbot, ChatHistory
from .serializers import ChatHistorySerializer


@api_view(["POST"])
def chat(request, meeting_id):
    """실시간 챗봇 질의"""
    question = request.data.get("question", "").strip()
    user_id  = request.auth["user_id"]

    if len(question) < 2:
        return Response({"error": "2자 이상 입력해주세요."}, status=status.HTTP_400_BAD_REQUEST)
    if len(question) > 200:
        return Response({"error": "200자 이내로 입력해주세요."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    # 챗봇 세션 가져오기 / 생성
    meeting_user = MeetingUsers.objects.filter(meeting=meeting, user_id=user_id).first()

    chatbot, _ = Chatbot.objects.get_or_create(
        meeting=meeting,
        meeting_users=meeting_user,
    )

    # 이전 대화 맥락 구성
    history = ChatHistory.objects.filter(chat=chatbot).order_by("created_at")
    context = [{"role": "user" if h.type == 1 else "assistant", "content": h.content} for h in history]

    # RAG 서버 호출
    rag_url = getattr(settings, "RAG_SERVER_URL", "http://127.0.0.1:8088/chat")
    try:
        payload = {
            "question": question,
            "context": "",
            "history": context,
            "sources": [],
            "project_id": str(meeting.project_id),
            "meeting_id": str(meeting_id),
            "source_scope": "project",
            "source_types": [],
            "max_previous_meetings": 5,
            "min_relevance_score": None
        }
        resp = requests.post(
            rag_url,
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        resp_json = resp.json()
        result = resp_json.get("result", {})
        answer = result.get("answer", "답변을 불러오지 못했습니다.")
        citations = result.get("citations", [])
    except Exception as e:
        answer = f"챗봇 요청 중 오류가 발생했습니다: {str(e)}"
        citations = []

    # 대화 저장
    ChatHistory.objects.create(chat=chatbot, type=1, content=question)   # 1=질문
    ChatHistory.objects.create(chat=chatbot, type=2, content=answer)      # 2=답변

    return Response({
        "answer": answer,
        "sources": citations
    })


@api_view(["GET"])
def chat_history(request, meeting_id):
    """챗봇 질의·답변 내역 조회 (회의 종료 후)"""
    user_id = request.auth["user_id"]
    try:
        meeting = Meeting.objects.get(meeting_id=meeting_id)
    except Meeting.DoesNotExist:
        return Response({"error": "회의를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    meeting_user = MeetingUsers.objects.filter(meeting=meeting, user_id=user_id).first()

    chatbot = Chatbot.objects.filter(meeting=meeting, meeting_users=meeting_user).first()
    if not chatbot:
        return Response([])

    history = ChatHistory.objects.filter(chat=chatbot).order_by("created_at")
    return Response(ChatHistorySerializer(history, many=True).data)
