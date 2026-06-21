import requests
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.users.models import Users
from apps.users.views import get_valid_access_token
from apps.meetings.jira_client import create_jira_issue_for_board, update_jira_issue_status
from apps.notifications.models import Notification
from .models import Project, ProjectUsers
from .serializers import ProjectSerializer, ProjectUsersSerializer
from rest_framework.permissions import AllowAny
from rest_framework.decorators import permission_classes

JIRA_STATUS_TO_COLUMN = {
    "To Do": "todo",
    "할 일": "todo",
    "In Progress": "progress",
    "진행 중": "progress",
    "In Review": "review",
    "검토 중": "review",
    "Done": "done",
    "완료": "done",
}


@api_view(["GET", "POST"])
def project_list(request):
    user_id = request.auth['user_id']
    if request.method == "GET":
        owned = Project.objects.filter(project_owner_id = user_id)
        joined = Project.objects.filter(projectusers__user_id=user_id)
        qs = (owned | joined).distinct().order_by("-created_at")

        return Response(ProjectSerializer(qs, many=True).data)

    # POST - 프로젝트 생성
    data = request.data
    try:
        owner = Users.objects.get(pk=user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

    project = Project.objects.create(
        project_owner=owner,
        project_name=data.get("project_name", ""),
        jira_project_key=data.get("jira_project_key") or None,
    )
    # 생성자를 구성원으로 자동 추가
    ProjectUsers.objects.get_or_create(project=project, user=owner)

    # 초대 구성원 추가
    for uid in data.get("member_ids", []):
        try:
            if uid == owner.users_id:
                continue
            user = Users.objects.get(pk=uid)
            _, created = ProjectUsers.objects.get_or_create(project=project, user=user)
            if not created:
                continue
            Notification.objects.create(
                user=user,
                notification_type=Notification.PROJECT_MEMBER_ADDED,
                content=f"[{project.project_name}] 프로젝트에 초대되었습니다.",
                target_id=project.project_id,
                is_read=False,
            )
        except Users.DoesNotExist:
            pass

    return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
def project_jira_board(request, project_id):
    user_id = request.auth["user_id"]

    try:
        project = Project.objects.get(project_id=project_id)
    except Project.DoesNotExist:
        return Response({"error": "프로젝트를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    is_member = ProjectUsers.objects.filter(project=project, user_id=user_id).exists()
    if project.project_owner_id != user_id and not is_member:
        return Response({"error": "프로젝트 구성원이 아닙니다."}, status=status.HTTP_403_FORBIDDEN)

    if not project.jira_project_key:
        return Response({"error": "프로젝트에 Jira 프로젝트 키가 설정되지 않았습니다."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = Users.objects.get(users_id=user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    access_token = get_valid_access_token(user)
    if not access_token:
        return Response({"error": "Jira 연동이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.jira_cloud_id:
        return Response({"error": "Jira 클라우드 ID가 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "POST":
        title = (request.data.get("title") or "").strip()
        if not title:
            return Response({"error": "title is required."}, status=status.HTTP_400_BAD_REQUEST)

        assignee_account_id = None
        assignee_user_id = request.data.get("assignee_user_id")
        if assignee_user_id and ProjectUsers.objects.filter(project=project, user_id=assignee_user_id).exists():
            try:
                assignee = Users.objects.get(users_id=assignee_user_id)
                assignee_account_id = assignee.jira_account_id
            except Users.DoesNotExist:
                assignee_account_id = None

        result = create_jira_issue_for_board(
            title,
            access_token,
            user.jira_cloud_id,
            project.jira_project_key,
            description=request.data.get("description", ""),
            due_date=request.data.get("due_date"),
            priority=request.data.get("priority"),
            assignee_account_id=assignee_account_id,
            parent_key=request.data.get("parent_key"),
        )
        if not result.get("success"):
            return Response({"error": "Jira issue create failed.", "detail": result}, status=status.HTTP_502_BAD_GATEWAY)

        column_id = request.data.get("column_id")
        if result.get("issue_key") and column_id and column_id != "todo":
            result["transition"] = update_jira_issue_status(
                result["issue_key"],
                column_id,
                access_token,
                user.jira_cloud_id,
            )
        result["column_id"] = column_id or "todo"

        return Response(result, status=status.HTTP_201_CREATED)

    try:
        res = requests.post(
            f"https://api.atlassian.com/ex/jira/{user.jira_cloud_id}/rest/api/3/search/jql",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            json={
                "jql": f"project = {project.jira_project_key} ORDER BY created DESC",
                "maxResults": 100,
                "fields": ["summary", "description", "status", "assignee", "priority", "duedate", "created", "parent", "issuetype"],
            },
            timeout=10,
        )
    except requests.RequestException as exc:
        return Response(
            {"error": "Jira 업무 조회에 실패했습니다.", "detail": str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    if not res.ok:
        return Response(
            {"error": "Jira 업무 조회에 실패했습니다.", "detail": res.text},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    columns = {"todo": [], "progress": [], "review": [], "done": []}
    for issue in res.json().get("issues", []):
        fields = issue.get("fields", {})
        jira_status = fields.get("status", {}).get("name", "")
        column_id = JIRA_STATUS_TO_COLUMN.get(jira_status, "todo")
        assignee = fields.get("assignee") or {}
        priority = fields.get("priority") or {}
        parent = fields.get("parent") or {}
        parent_fields = parent.get("fields") or {}
        issue_type = fields.get("issuetype") or {}

        columns[column_id].append({
            "issue_key": issue.get("key"),
            "title": fields.get("summary", ""),
            "description": "",
            "assignee": assignee.get("displayName", ""),
            "priority": priority.get("name", ""),
            "due_date": fields.get("duedate") or "",
            "created": fields.get("created") or "",
            "status": jira_status,
            "parent_key": parent.get("key", ""),
            "parent_title": parent_fields.get("summary", ""),
            "issue_type": issue_type.get("name", ""),
            "issue_type_icon_url": issue_type.get("iconUrl", ""),
            "issue_type_hierarchy_level": issue_type.get("hierarchyLevel"),
        })

    return Response(columns)


@api_view(["GET", "PATCH", "DELETE"])
def project_detail(request, project_id):
    try:
        project = Project.objects.get(project_id=project_id)
    except Project.DoesNotExist:
        return Response({"error": "프로젝트를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        data = ProjectSerializer(project).data
        members = ProjectUsers.objects.filter(project=project).select_related("user", "user__dept", "user__rank")
        seen_user_ids = set()
        data["members"] = []
        for m in members:
            if m.user.users_id in seen_user_ids:
                continue
            seen_user_ids.add(m.user.users_id)
            data["members"].append({
                "user_id": m.user.users_id,
                "name": m.user.name,
                "email": m.user.email,
                "work": m.user.work,
                "dept_name": m.user.dept.dept_name,
                "rank_name": m.user.rank.rank_name,
            })
        return Response(data)

    if request.method == "PATCH":
        if project.project_owner_id != request.auth["user_id"]:
            return Response({"error": "프로젝트 생성자만 구성원을 추가할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)

        # 구성원 추가 / 삭제
        add_ids = request.data.get("add_member_ids", [])
        remove_ids = request.data.get("remove_member_ids", [])

        if "jira_project_key" in request.data:
            project.jira_project_key = request.data.get("jira_project_key") or None
            project.save(update_fields=["jira_project_key"])

        for uid in add_ids:
            try:
                user = Users.objects.get(pk=uid)
                _, created = ProjectUsers.objects.get_or_create(project=project, user=user)
                if created:
                    Notification.objects.create(
                        user=user,
                        notification_type=Notification.PROJECT_MEMBER_ADDED,
                        content=f"[{project.project_name}] 프로젝트에 추가되었습니다.",
                        target_id=project.project_id,
                        is_read=False,
                    )
            except Users.DoesNotExist:
                pass

        for uid in remove_ids:
            ProjectUsers.objects.filter(project=project, user_id=uid).delete()

        return Response(ProjectSerializer(project).data)

    # DELETE
    project.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
