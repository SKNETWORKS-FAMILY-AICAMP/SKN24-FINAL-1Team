import requests
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.meetings.models import Meeting, MeetingUsers
from apps.projects.models import Project, ProjectUsers
from .models import Chatbot, ChatHistory
from .serializers import ChatHistorySerializer


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

    if not _can_access_meeting(request, meeting):
        return Response({"error": "회의 접근 권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

    # 챗봇 세션 가져오기 / 생성
    meeting_user, _ = MeetingUsers.objects.get_or_create(
        meeting=meeting,
        user_id=user_id
    )

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
        resp.encoding = "utf-8"
        resp_json = resp.json()
        result = resp_json.get("result", {})
        answer = result.get("answer", "관련 문서에서 확인할 수 있는 내용이 없습니다.")
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

    if not _can_access_meeting(request, meeting):
        return Response({"error": "회의 접근 권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

    meeting_user = MeetingUsers.objects.filter(meeting=meeting, user_id=user_id).first()

    chatbot = Chatbot.objects.filter(meeting=meeting, meeting_users=meeting_user).first()
    if not chatbot:
        return Response([])

    history = ChatHistory.objects.filter(chat=chatbot).order_by("created_at")
    return Response(ChatHistorySerializer(history, many=True).data)

@api_view(["POST"])
def project_chat(request, project_id) :
    """프로젝트 기반 플로팅 챗봇 질의(대화 저장 없음, 검색 용도)"""
    question = request.data.get("question", "").strip()

    if len(question) < 2 :
        return Response({"error" : "2자 이상 입력해주세요."}, status=status.HTTP_400_BAD_REQUEST)
    if len(question) > 200 :
        return Response({"error" : "200자 내로 입력해주세요."}, status=status.HTTP_400_BAD_REQUEST)
    
    try :
        Project.objects.get(project_id=project_id)
    except Project.DoesNotExist :
        return Response({"error" : "프로젝트를 찾을 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)
    
    if not _can_access_project(request, project_id):
        return Response({"error" : "프로젝트 접근 권한이 없습니다."}, status=status.HTTP_400_BAD_REQUEST)
    
    # RAG 서버 호출 (이전 대화 맥학 없음)
    # settings.RAG_SERVER_URL이 .env에 설정되어 있으면 → 그 값 사용
    # 설정 안 되어 있으면 → "http://127.0.0.1:8088/chat" 기본값 사용
    rag_url = getattr(settings, "RAG_SERVER_URL", "http://127.0.0.1:8088/chat")
    try :
        payload = {
            "question" : question,
            "project_id" : str(project_id),
            "meeting_id" : "",
            "source_scope" : "project",
            "max_previous_meetings" : 5,
        }
        # RAG 서버에 요청 보내고 응답 처리하는 부분
        # RAG 서버에 POST 요청 보냄. timeout=30은 30초 안에 응답 없으면 에러
        resp=requests.post(rag_url,json=payload,timeout=30)
        # HTTP 상태코드가 4xx, 5xx면 즉시 예외 발생시킴. 정상(200)이면 그냥 통과
        resp.raise_for_status()
        # 응답 텍스트를 한글 깨짐 없이 읽기 위해 인코딩 강제 지정.
        # RAG 서버 응답 구조 :
        # json{
        # "result": {
        #     "answer": "답변 내용",
        #     "citations": ["출처1", "출처2"]
        # }
        # }
        resp.encoding="utf-8"
        resp_json=resp.json()
        result=resp_json.get("result", {})
        answer=result.get("answer", "관련 문서에서 확인할 수 있는 내용이 없습니다.")
        citations=result.get("citations", [])
    except Exception as e :
        answer=f"챗봇 요청 중 오류가 발생했습니다 : {str(e)}"
        citations=[]

    return Response({"answer" : answer, "sources" : citations})