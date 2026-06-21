import hashlib

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Users
from .serializers import UserSerializer

import os
import requests
from django.shortcuts import redirect
from django.utils import timezone
from datetime import timedelta
from django.http import HttpResponse

from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny
from rest_framework.decorators import permission_classes
from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from apps.meetings.jira_client import (
    get_jira_issues,
    update_jira_issue_status,
    delete_jira_issue,
    create_jira_issue_for_board,
    update_jira_issue
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
JIRA_CLIENT_ID = os.getenv("JIRA_CLIENT_ID", "")
JIRA_CLIENT_SECRET = os.getenv("JIRA_CLIENT_SECRET", "")
JIRA_REDIRECT_URI = os.getenv("JIRA_REDIRECT_URI", "http://localhost:8000/api/jira/callback/")
JIRA_SCOPES = "read:jira-work write:jira-work offline_access"


def _hash_pw(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()

def get_tokens_for_user(user):
    refresh = RefreshToken()
    refresh['user_id'] = user.users_id
    return {
        'refresh' : str(refresh),
        'access' : str(refresh.access_token),
    }

# 로그인
@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """아이디(이메일) + 비밀번호 로그인 (JWT 없이 user_id 반환)"""
    email = request.data.get("email", "")
    password = request.data.get("password", "")

    try:
        user = Users.objects.get(email=email)
    except Users.DoesNotExist:
        return Response({"error": "이메일 또는 비밀번호가 올바르지 않습니다."}, 
        status=status.HTTP_401_UNAUTHORIZED)

    # 초기 비밀번호 abc123 또는 해시 비교
    raw_match = (password == settings.DEFAULT_USER_PASSWORD and user.password == settings.DEFAULT_USER_PASSWORD)
    hash_match = (user.password == _hash_pw(password))

    if not (raw_match or hash_match):
        return Response({"error": "이메일 또는 비밀번호가 올바르지 않습니다."}, status=status.HTTP_401_UNAUTHORIZED)

    if user.status != 0:
        return Response(
            {"error": "비활성화된 계정입니다."},
            status=status.HTTP_403_FORBIDDEN
        )

    tokens = get_tokens_for_user(user)

    response = Response({
        "message": "로그인 성공",
        "user_id": user.users_id,
        "email": user.email,
        "is_initial_password": user.is_initial_password
    })

    response.set_cookie(
        key="access",
        value=tokens["access"],
        httponly=True,
        secure=False, 
        samesite="Lax",
    )

    response.set_cookie(
        key="refresh",
        value=tokens["refresh"],
        httponly=True,
        secure=False,
        samesite="Lax",
    )

    return response

# 로그인 유지
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_me(request):
    user = request.user

    return Response({
        "users_id": user.users_id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "is_initial_password": user.is_initial_password,
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_list(request):
    """전체 사용자 목록 (관리자용)"""
    users = Users.objects.all().order_by("-created_at")
    return Response(UserSerializer(users, many=True).data)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def user_detail(request, users_id):
    try:
        user = Users.objects.select_related("dept", "rank").get(users_id=users_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response({
            "users_id": user.users_id,
            "email": user.email,
            "name": user.name,
            "emp_no": user.emp_no,
            "work": user.work,
            "dept_name": user.dept.dept_name,
            "rank_name": user.rank.rank_name,
        })

    # PATCH - 수정 가능 필드
    for field in ["name", "email", "work"]:
        if field in request.data:
            setattr(user, field, request.data[field])

    # 비밀번호 변경
    new_pw = request.data.get("password")
    if new_pw:
        user.password = _hash_pw(new_pw)
        user.is_initial_password = False

    user.save()
    return Response(UserSerializer(user).data)

# ── Step 1: Jira 로그인 시작 ───────────────────────────────────────────────
# GET /api/jira/start/
# 세션에서 user_id를 읽어서 Atlassian 로그인 페이지로 리다이렉트
@permission_classes([AllowAny])
def jira_oauth_start(request):
    user_id = request.GET.get("user_id")
    if not user_id:
        return redirect(f"{FRONTEND_URL}/projects/create?jira=error&reason=not_logged_in")

    auth_url = (
        "https://auth.atlassian.com/authorize"
        f"?audience=api.atlassian.com"
        f"&client_id={JIRA_CLIENT_ID}"
        f"&scope={JIRA_SCOPES.replace(' ', '%20')}"
        f"&redirect_uri={JIRA_REDIRECT_URI}"
        f"&state={user_id}"
        f"&response_type=code"
        f"&prompt=login%20consent"
    )
    return redirect(auth_url)


# ── Step 2: Jira 로그인 콜백 ──────────────────────────────────────────────
# GET /api/jira/callback/?code=...&state=user_id
# Atlassian이 인증 후 이 URL로 code를 보내줌
@permission_classes([AllowAny])
def jira_oauth_callback(request):
    code = request.GET.get("code")
    user_id = request.GET.get("state")  # start에서 넣었던 user_id

    if not code or not user_id:
        return redirect(f"{FRONTEND_URL}/projects/create?jira=error")
    
    # code → access_token 교환
    token_response = requests.post(
        "https://auth.atlassian.com/oauth/token",
        json={
            "grant_type": "authorization_code",
            "client_id": JIRA_CLIENT_ID,
            "client_secret": JIRA_CLIENT_SECRET,
            "code": code,
            "redirect_uri": JIRA_REDIRECT_URI,
        },
        headers={"Content-Type": "application/json"},
        timeout=10,
    )

    if not token_response.ok:
        return redirect("/?jira=error")

    token_data = token_response.json()
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 3600)  # 초 단위

    # cloud_id 조회 (어떤 Jira 인스턴스인지 식별)
    resources_response = requests.get(
        "https://api.atlassian.com/oauth/token/accessible-resources",
        headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        timeout=10,
    )
    cloud_id = ""
    if resources_response.ok:
        resources = resources_response.json()
        if resources:
            cloud_id = resources[0].get("id", "")  # 첫 번째 Jira 인스턴스

    # DB에 토큰 저장
    try:
        user = Users.objects.get(users_id=user_id)
        user.jira_access_token = access_token
        user.jira_refresh_token = refresh_token
        user.jira_token_expires_at = timezone.now() + timedelta(seconds=expires_in)
        
        user.save(update_fields=[
            "jira_access_token",
            "jira_refresh_token",
            "jira_token_expires_at",
            "jira_cloud_id",
        ])
    except Users.DoesNotExist:
        return redirect(f"{FRONTEND_URL}/?jira=error")

    return redirect(f"{FRONTEND_URL}/projects/create?jira=success")

# ── 토큰 갱신 ─────────────────────────────────────────────────────────────
def refresh_jira_token(user: Users) -> bool:
    if not user.jira_refresh_token:
        return False

    response = requests.post(
        "https://auth.atlassian.com/oauth/token",
        json={
            "grant_type": "refresh_token",
            "client_id": JIRA_CLIENT_ID,
            "client_secret": JIRA_CLIENT_SECRET,
            "refresh_token": user.jira_refresh_token,
        },
        headers={"Content-Type": "application/json"},
        timeout=10,
    )
    if not response.ok:
        return False

    token_data = response.json()
    user.jira_access_token = token_data.get("access_token")
    user.jira_refresh_token = token_data.get("refresh_token", user.jira_refresh_token)
    user.jira_token_expires_at = timezone.now() + timedelta(seconds=token_data.get("expires_in", 3600))
    user.save(update_fields=["jira_access_token", "jira_refresh_token", "jira_token_expires_at"])
    return True


# ── 유효한 access_token 반환 (만료 시 자동 갱신) ──────────────────────────
def get_valid_access_token(user: Users) -> str | None:
    if not user.jira_access_token:
        return None
    # 만료 5분 전이면 미리 갱신
    if user.jira_token_expires_at and timezone.now() >= user.jira_token_expires_at - timedelta(minutes=5):
        success = refresh_jira_token(user)
        if not success:
            return None
    return user.jira_access_token


# ── Jira 연동 상태 확인 ───────────────────────────────────────────────────

@api_view(["GET"])
def jira_oauth_status(request):
    user_id = request.auth['user_id']

    try:
        user = Users.objects.get(users_id=user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    connected = bool(user.jira_access_token)
    return Response({
        "connected": connected,
        "jira_cloud_id": user.jira_cloud_id if connected else None,
    })

# GET /api/jira/projects/
@api_view(["GET"])
def jira_projects(request):
    user_id = request.auth['user_id']

    try:
        user = Users.objects.get(users_id=user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    access_token = get_valid_access_token(user)
    if not access_token:
        return Response({"error": "Jira 연동이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)

    res = requests.get(
        f"https://api.atlassian.com/ex/jira/{user.jira_cloud_id}/rest/api/3/project",
        headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        timeout=10,
    )
    if not res.ok:
        return Response({"error": "Jira 프로젝트 조회 실패"}, status=status.HTTP_502_BAD_GATEWAY)

    projects = [{"key": p["key"], "name": p["name"]} for p in res.json()]
    return Response(projects)



@api_view(["GET"])
def jira_board(request):
    user_id = request.auth['user_id']

    try:
        user = Users.objects.get(users_id = user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
    
    access_token = get_valid_access_token(user)
    if not access_token:
        return Response({"error" : "Jira 연동이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)
    
    result = get_jira_issues(access_token, user.jira_cloud_id, user.jira_project_key)


    if not result["success"]:
        return Response({"error": result["error"]}, status=status.HTTP_502_BAD_GATEWAY)

    return Response(result["columns"])


@api_view(["PATCH"])
def jira_board_issue_status(request, issue_key):
    user_id = request.auth['user_id']

    try:
        user = Users.objects.get(users_id=user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    access_token = get_valid_access_token(user)
    if not access_token:
        return Response({"error": "Jira 연동이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)

    column_id = request.data.get("column_id")

    if not column_id:
        return Response({"error": "column_id가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

    result = update_jira_issue_status(issue_key, column_id, access_token, user.jira_cloud_id)

    if not result["success"]:
        return Response({"error": result["error"]}, status=status.HTTP_502_BAD_GATEWAY)

    return Response(result)


@api_view(["DELETE", "PUT"])
def jira_board_issue_detail(request, issue_key):
    user_id = request.auth['user_id']
    try:
        user = Users.objects.get(users_id=user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    access_token = get_valid_access_token(user)
    if not access_token:
        return Response({"error": "Jira 연동이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)

    if request.method == "DELETE":
        result = delete_jira_issue(issue_key, access_token, user.jira_cloud_id)
        if not result["success"]:
            return Response({"error": result["error"]}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"issue_key": issue_key}, status=status.HTTP_200_OK)

    elif request.method == "PUT":
        title = request.data.get("title", "")
        description = request.data.get("description", "")
        if not title and not description:
            return Response({"error": "title 또는 description이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)
        result = update_jira_issue(
            issue_key=issue_key,
            title=title,
            description=description,
            access_token=access_token,
            cloud_id=user.jira_cloud_id,
        )
        if not result["success"]:
            return Response({"error": result["error"], "detail": result.get("detail")}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"issue_key": issue_key}, status=status.HTTP_200_OK)


@api_view(["PATCH"])
def jira_set_project_key(request):
    user_id = request.auth['user_id']

    try:
        user = Users.objects.get(users_id =user_id)
    except Users.DoesNotExist:
        return Response({"error" : "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
    
    project_key = request.data.get("project_key")
    if not project_key:
        return Response({"error" : "project_key가 필요합니다"},status=status.HTTP_400_BAD_REQUEST)
    
    user.jira_project_key = project_key
    user.save(update_fields= ["jira_project_key"])
    return Response({"success" : True, "project_key" : project_key})


@api_view(["GET"])
def jira_workspaces(request):
    user_id = request.auth['user_id']

    try:
        user = Users.objects.get(users_id=user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
    
    access_token = get_valid_access_token(user)
    if not access_token:
        return Response({"error": "Jira 연동이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)
    
    res = requests.get(
        "https://api.atlassian.com/oauth/token/accessible-resources",
        headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        timeout=10,
    )
    if not res.ok:
        return Response({"error": "Jira 워크스페이스를 조회할 수 없습니다."}, status=status.HTTP_502_BAD_GATEWAY)
    
    workspaces = [
        {"cloud_id": w["id"], "name": w["name"], "url": w["url"]}
        for w in res.json()
    ]
    return Response(workspaces)


@api_view(["PATCH"])
def jira_select_workspace(request):
    user_id = request.auth['user_id']

    try:
        user = Users.objects.get(users_id=user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    cloud_id = request.data.get("cloud_id")
    if not cloud_id:
        return Response({"error": "cloud_id가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

    user.jira_cloud_id = cloud_id
    user.save(update_fields=["jira_cloud_id"])
    return Response({"success": True, "cloud_id": cloud_id})



@api_view(["POST"])
def jira_board_issue_create(request):
    user_id = request.auth['user_id']

    try:
        user = Users.objects.get(users_id=user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    access_token = get_valid_access_token(user)
    if not access_token:
        return Response({"error": "Jira 연동이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)

    title = request.data.get("title")
    if not title:
        return Response({"error": "title이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

    if not user.jira_project_key:
        return Response({"error": "프로젝트 키가 설정되지 않았습니다."}, status=status.HTTP_400_BAD_REQUEST)

    result = create_jira_issue_for_board(
        title=title,
        access_token=access_token,
        cloud_id=user.jira_cloud_id,
        project_key=user.jira_project_key,
    )

    if not result["success"]:
        # detail 부분 추후에 제거 필요
        return Response({"error": result["error"],"detail" : result.get("detail")}, status=status.HTTP_502_BAD_GATEWAY)

    return Response({"issue_key": result["issue_key"]}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def jira_issue_types(request):
    user_id = request.auth['user_id']
    try:
        user = Users.objects.get(users_id=user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
    
    access_token = get_valid_access_token(user)
    if not access_token:
        return Response({"error": "Jira 연동이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)
    
    url = f"https://api.atlassian.com/ex/jira/{user.jira_cloud_id}/rest/api/3/project/{user.jira_project_key}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }
    response = requests.get(url, headers=headers, timeout=10)
    data = response.json()
    issue_types = [{"id": t["id"], "name": t["name"]} for t in data.get("issueTypes", [])]
    return Response({"issue_types": issue_types})


@api_view(["PUT"])
def jira_board_issue_update(request, issue_key):
    user_id = request.auth['user_id']
    try:
        user = Users.objects.get(users_id=user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    access_token = get_valid_access_token(user)
    if not access_token:
        return Response({"error": "Jira 연동이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)

    title = request.data.get("title", "")
    description = request.data.get("description", "")

    if not title and not description:
        return Response({"error": "title 또는 description이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

    result = update_jira_issue(
        issue_key=issue_key,
        title=title,
        description=description,
        access_token=access_token,
        cloud_id=user.jira_cloud_id,
    )

    if not result["success"]:
        return Response({"error": result["error"], "detail": result.get("detail")}, status=status.HTTP_502_BAD_GATEWAY)

    return Response({"issue_key": issue_key}, status=status.HTTP_200_OK)