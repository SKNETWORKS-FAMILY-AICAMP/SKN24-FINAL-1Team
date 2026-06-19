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

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny
from rest_framework.decorators import permission_classes

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
JIRA_CLIENT_ID = os.getenv("JIRA_CLIENT_ID", "")
JIRA_CLIENT_SECRET = os.getenv("JIRA_CLIENT_SECRET", "")
JIRA_REDIRECT_URI = os.getenv("JIRA_REDIRECT_URI", "http://localhost:8000/api/jira/callback/")
JIRA_SCOPES = "read:jira-work write:jira-work"


def _hash_pw(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()

def get_tokens_for_user(user):
    refresh = RefreshToken()
    refresh['user_id'] = user.users_id
    refresh['email'] = user.email
    refresh['name'] = user.name
    return {
        'refresh' : str(refresh),
        'access' : str(refresh.access_token),
    }


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """아이디(이메일) + 비밀번호 로그인 (JWT 없이 user_id 반환)"""
    email = request.data.get("email", "")
    password = request.data.get("password", "")

    try:
        user = Users.objects.get(email=email)
    except Users.DoesNotExist:
        return Response({"error": "이메일 또는 비밀번호가 올바르지 않습니다."}, status=status.HTTP_401_UNAUTHORIZED)

    # 초기 비밀번호 abc123 또는 해시 비교
    raw_match = (password == "abc123" and user.password == "abc123")
    hash_match = (user.password == _hash_pw(password))

    if not (raw_match or hash_match):
        return Response({"error": "이메일 또는 비밀번호가 올바르지 않습니다."}, status=status.HTTP_401_UNAUTHORIZED)

    if user.status != 0:
        return Response({"error": "비활성화된 계정입니다."}, status=status.HTTP_403_FORBIDDEN)

    data = UserSerializer(user).data
    data["is_initial_password"] = (user.password == "abc123")
    tokens = get_tokens_for_user(user)
    data.update(tokens)
    return  Response(data)


@api_view(["GET"])
def user_list(request):
    """전체 사용자 목록 (관리자용)"""
    users = Users.objects.all().order_by("-created_at")
    return Response(UserSerializer(users, many=True).data)


@api_view(["GET", "PATCH"])
def user_detail(request, users_id):
    try:
        user = Users.objects.get(users_id=users_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(UserSerializer(user).data)

    # PATCH - 수정 가능 필드
    for field in ["name", "email", "work"]:
        if field in request.data:
            setattr(user, field, request.data[field])

    # 비밀번호 변경
    new_pw = request.data.get("password")
    if new_pw:
        user.password = _hash_pw(new_pw)

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
        user.jira_cloud_id = cloud_id
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