import json
import time

from django.db import close_old_connections
from django.http import JsonResponse, StreamingHttpResponse
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken
from .models import Notification
from .serializers import NotificationSerializer


def _request_user_id(request):
    if isinstance(request.auth, dict) and request.auth.get("user_id") is not None:
        return request.auth["user_id"]
    return getattr(request.user, "users_id", None)


def _parse_last_event_id(value):
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


@api_view(["GET"])
def notification_list(request):
    """로그인 사용자 알림 목록 (user_id 쿼리파라미터로 필터)"""
    user_id = _request_user_id(request)
    qs = Notification.objects.filter(user_id=user_id).order_by("-created_at", "-notification_id")

    return Response(NotificationSerializer(qs, many=True).data)


def notification_stream(request):
    if request.method != "GET":
        return JsonResponse({"error": "method not allowed"}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    raw_token = request.COOKIES.get("access")
    if not raw_token:
        return JsonResponse({"error": "access cookie is required"}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        token = AccessToken(raw_token)
        user_id = token["user_id"]
    except (KeyError, TokenError):
        return JsonResponse({"error": "invalid token"}, status=status.HTTP_401_UNAUTHORIZED)

    last_id = _parse_last_event_id(
        request.headers.get("Last-Event-ID") or request.GET.get("last_id")
    )

    def event_stream():
        nonlocal last_id

        while True:
            close_old_connections()
            qs = Notification.objects.filter(
                user_id=user_id,
                notification_id__gt=last_id,
            ).order_by("notification_id")

            for notif in qs:
                last_id = max(last_id, notif.notification_id)
                payload = json.dumps(NotificationSerializer(notif).data, ensure_ascii=False)
                yield f"id: {notif.notification_id}\nevent: notification\ndata: {payload}\n\n"

            yield ": keep-alive\n\n"
            time.sleep(1)

    response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


@api_view(["PATCH"])
def notification_read(request, notification_id):
    """단건 읽음 처리"""
    try:
        notif = Notification.objects.get(notification_id=notification_id, user_id=_request_user_id(request))
    except Notification.DoesNotExist:
        return Response({"error": "알림을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
    notif.is_read = True
    notif.save(update_fields=["is_read"])
    return Response(NotificationSerializer(notif).data)


@api_view(["DELETE"])
def notification_delete(request, notification_id):
    """단건 삭제"""
    try:
        notif = Notification.objects.get(notification_id=notification_id, user_id=_request_user_id(request))
    except Notification.DoesNotExist:
        return Response({"error": "알림을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
    notif.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["DELETE"])
def notification_delete_all(request):
    """전체 삭제 (user_id 쿼리파라미터)"""
    user_id = _request_user_id(request)
    qs = Notification.objects.filter(user_id=user_id)
    qs.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
