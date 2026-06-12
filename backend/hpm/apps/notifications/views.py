from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


@api_view(["GET"])
def notification_list(request):
    """로그인 사용자 알림 목록 (user_id 쿼리파라미터로 필터)"""
    user_id = request.query_params.get("user_id")
    qs = Notification.objects.all().order_by("-notification_id")
    if user_id:
        qs = qs.filter(user_id=user_id)
    return Response(NotificationSerializer(qs, many=True).data)


@api_view(["PATCH"])
def notification_read(request, notification_id):
    """단건 읽음 처리"""
    try:
        notif = Notification.objects.get(notification_id=notification_id)
    except Notification.DoesNotExist:
        return Response({"error": "알림을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
    notif.is_read = True
    notif.save()
    return Response(NotificationSerializer(notif).data)


@api_view(["DELETE"])
def notification_delete(request, notification_id):
    """단건 삭제"""
    try:
        notif = Notification.objects.get(notification_id=notification_id)
    except Notification.DoesNotExist:
        return Response({"error": "알림을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
    notif.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["DELETE"])
def notification_delete_all(request):
    """전체 삭제 (user_id 쿼리파라미터)"""
    user_id = request.query_params.get("user_id")
    qs = Notification.objects.all()
    if user_id:
        qs = qs.filter(user_id=user_id)
    qs.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
