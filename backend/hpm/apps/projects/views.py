from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.users.models import Users
from apps.notifications.models import Notification
from .models import Project, ProjectUsers
from .serializers import ProjectSerializer, ProjectUsersSerializer


@api_view(["GET", "POST"])
def project_list(request):
    if request.method == "GET":
        user_id = request.query_params.get("user_id")
        if user_id:
            # 생성자이거나 구성원인 프로젝트만
            owned = Project.objects.filter(project_owner_id=user_id)
            joined = Project.objects.filter(projectusers__user_id=user_id)
            qs = (owned | joined).distinct().order_by("-created_at")
        else:
            qs = Project.objects.all().order_by("-created_at")
        return Response(ProjectSerializer(qs, many=True).data)

    # POST - 프로젝트 생성
    data = request.data
    try:
        owner = Users.objects.get(pk=data.get("owner_id"))
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

    project = Project.objects.create(
        project_owner=owner,
        project_name=data.get("project_name", ""),
    )
    # 생성자를 구성원으로 자동 추가
    ProjectUsers.objects.create(project=project, user=owner)

    # 초대 구성원 추가
    for uid in data.get("member_ids", []):
        try:
            user = Users.objects.get(pk=uid)
            ProjectUsers.objects.create(project=project, user=user)
            Notification.objects.create(
                user=user,
                content=f"[{project.project_name}] 프로젝트에 초대되었습니다.",
                is_read=False,
            )
        except Users.DoesNotExist:
            pass

    return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
def project_detail(request, project_id):
    try:
        project = Project.objects.get(project_id=project_id)
    except Project.DoesNotExist:
        return Response({"error": "프로젝트를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        data = ProjectSerializer(project).data
        members = ProjectUsers.objects.filter(project=project).select_related("user")
        data["members"] = [
            {"user_id": m.user.users_id, "name": m.user.name, "work": m.user.work}
            for m in members
        ]
        return Response(data)

    if request.method == "PATCH":
        # 구성원 추가 / 삭제
        add_ids = request.data.get("add_member_ids", [])
        remove_ids = request.data.get("remove_member_ids", [])

        for uid in add_ids:
            try:
                user = Users.objects.get(pk=uid)
                ProjectUsers.objects.get_or_create(project=project, user=user)
                Notification.objects.create(user=user, content=f"[{project.project_name}] 프로젝트에 추가되었습니다.", is_read=False)
            except Users.DoesNotExist:
                pass

        for uid in remove_ids:
            ProjectUsers.objects.filter(project=project, user_id=uid).delete()
            try:
                user = Users.objects.get(pk=uid)
                Notification.objects.create(user=user, content=f"[{project.project_name}] 프로젝트에서 제외되었습니다.", is_read=False)
            except Users.DoesNotExist:
                pass

        return Response(ProjectSerializer(project).data)

    # DELETE
    project.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
