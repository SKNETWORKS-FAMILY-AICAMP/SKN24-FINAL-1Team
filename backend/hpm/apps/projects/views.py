import requests
from django.utils import timezone
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
    "In Review": "progress",
    "검토 중": "progress",
    "Done": "done",
    "완료": "done",
}

DEFAULT_JIRA_COLUMNS = [
    {
        "id": "todo",
        "label": "할 일",
        "status_ids": [],
        "status_names": ["To Do", "할 일", "해야 할 일"],
    },
    {
        "id": "progress",
        "label": "진행중",
        "status_ids": [],
        "status_names": ["In Progress", "진행 중", "진행중"],
    },
    {
        "id": "done",
        "label": "완료",
        "status_ids": [],
        "status_names": ["Done", "완료", "해결됨"],
    },
]


RANK_PRIORITY = [
    "회장",
    "대표",
    "대표이사",
    "사장",
    "부사장",
    "전무",
    "상무",
    "이사",
    "본부장",
    "실장",
    "팀장",
    "부장",
    "차장",
    "과장",
    "대리",
    "주임",
    "사원",
    "인턴",
]


def _user_rank_sort_key(user):
    rank_name = user.rank.rank_name
    try:
        priority = RANK_PRIORITY.index(rank_name)
    except ValueError:
        priority = len(RANK_PRIORITY)

    return (priority, user.rank_id or 9999, user.name)


def _project_card_data(project):
    project_members = list(
        ProjectUsers.objects.filter(project=project)
        .select_related("user", "user__rank")
    )
    users_by_id = {member.user_id: member.user for member in project_members}
    users_by_id.setdefault(project.project_owner_id, project.project_owner)
    members = sorted(users_by_id.values(), key=_user_rank_sort_key)

    return {
        **ProjectSerializer(project).data,
        "startDate": f"{timezone.localtime(project.created_at).strftime('%Y.%m.%d')} ~",
        "members": [
            f"{member.name}(생성자)"
            if member.users_id == project.project_owner_id
            else member.name
            for member in members
        ],
    }


def _status_name_map(access_token, cloud_id):
    try:
        res = requests.get(
            f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/status",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            timeout=10,
        )
    except requests.RequestException:
        return {}

    if not res.ok:
        return {}

    return {str(item.get("id")): item.get("name", "") for item in res.json()}


def _get_jira_board_columns(access_token, cloud_id, project_key):
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}

    try:
        res = requests.get(
            f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/project/{project_key}/statuses",
            headers=headers,
            timeout=10,
        )
    except requests.RequestException as e:
        print(f"[BOARD] statuses 요청 실패: {e}")
        return DEFAULT_JIRA_COLUMNS

    if not res.ok:
        print(f"[BOARD] statuses 응답 오류: {res.status_code} {res.text[:200]}")
        return DEFAULT_JIRA_COLUMNS

    # statusCategory 순서: new(할 일) → indeterminate(진행) → done(완료)
    CATEGORY_ORDER = {"new": 0, "indeterminate": 1, "done": 2}

    seen_ids = set()
    statuses = []

    for issue_type in res.json():
        for st in issue_type.get("statuses", []):
            sid = str(st.get("id", ""))
            if not sid or sid in seen_ids:
                continue
            seen_ids.add(sid)
            cat_key = st.get("statusCategory", {}).get("key", "undefined")
            sort_key = CATEGORY_ORDER.get(cat_key, 3)
            statuses.append((sort_key, st.get("name", ""), sid))

    statuses.sort(key=lambda x: x[0])

    columns = [
        {
            "id": f"status-{sid}",
            "label": name,
            "status_ids": [sid],
            "status_names": [name],
        }
        for sort_key, name, sid in statuses
        if name
    ]

    print(f"[BOARD] 동적 컬럼: {[c['label'] for c in columns]}")
    return columns or DEFAULT_JIRA_COLUMNS


def _match_jira_column(columns, jira_status):
    status_id = str(jira_status.get("id") or "")
    status_name = jira_status.get("name", "")
    status_name_lower = status_name.lower()

    for column in columns:
        if status_id and status_id in column.get("status_ids", []):
            return column["id"]
        if status_name_lower in {name.lower() for name in column.get("status_names", [])}:
            return column["id"]

    # fallback: status category로 매핑
    return columns[0]["id"] if columns else "jira-new"


@api_view(["GET", "POST"])
def project_list(request):
    user_id = request.auth['user_id']
    if request.method == "GET":
        owned = Project.objects.filter(project_owner_id = user_id)
        joined = Project.objects.filter(projectusers__user_id=user_id)
        qs = (
            (owned | joined)
            .distinct()
            .select_related("project_owner", "project_owner__rank")
            .order_by("-created_at")
        )

        return Response([_project_card_data(project) for project in qs])

    # POST - 프로젝트 생성
    data = request.data
    jira_project_key = data.get("jira_project_key") or None
    if jira_project_key and Project.objects.filter(jira_project_key=jira_project_key).exists():
        return Response(
            {"error": "이미 해당 Jira 프로젝트와 연결된 프로젝트가 있습니다."},
            status=status.HTTP_409_CONFLICT,
        )
    try:
        owner = Users.objects.get(pk=user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

    project = Project.objects.create(
        project_owner=owner,
        project_name=data.get("project_name", ""),
        jira_project_key=jira_project_key,
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

    user = project.project_owner

    access_token = get_valid_access_token(user)
    if not access_token:
        return Response({"error": "Jira 연동이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.jira_cloud_id:
        return Response({"error": "Jira 클라우드 ID가 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

    jira_columns = _get_jira_board_columns(access_token, user.jira_cloud_id, project.jira_project_key)

    if request.method == "POST":
        try:
            requester = Users.objects.get(users_id=user_id)
        except Users.DoesNotExist:
            return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        requester_token = get_valid_access_token(requester)
        if not requester_token or not requester.jira_cloud_id:
            return Response({"error": "Jira connection is required to manage board tasks."}, status=status.HTTP_403_FORBIDDEN)

        access_token = requester_token
        user = requester

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
        target_status_names = request.data.get("target_status_names") or []
        if result.get("issue_key") and column_id:
            result["transition"] = update_jira_issue_status(
                result["issue_key"],
                column_id,
                access_token,
                user.jira_cloud_id,
                target_status_names=target_status_names,
            )
        result["column_id"] = column_id or jira_columns[0]["id"]

        return Response(result, status=status.HTTP_201_CREATED)

    # 1) Agile 보드 이슈 조회 시도
    raw_issues = []
    board_res = requests.get(
        f"https://api.atlassian.com/ex/jira/{user.jira_cloud_id}/rest/agile/1.0/board",
        headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        params={"projectKeyOrId": project.jira_project_key, "type": "kanban"},
        timeout=10,
    )

    if board_res.ok and board_res.json().get("values"):
        board_id = board_res.json()["values"][0]["id"]
        agile_res = requests.get(
            f"https://api.atlassian.com/ex/jira/{user.jira_cloud_id}/rest/agile/1.0/board/{board_id}/issue",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            params={"maxResults": 100, "fields": "summary,description,status,assignee,priority,duedate,created,parent,issuetype"},
            timeout=10,
        )
        if agile_res.ok:
            raw_issues = agile_res.json().get("issues", [])

    # 2) Agile API 실패 시 JQL 폴백
    if not raw_issues:
        try:
            res = requests.post(
                f"https://api.atlassian.com/ex/jira/{user.jira_cloud_id}/rest/api/3/search/jql",
                headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json", "Content-Type": "application/json"},
                json={"jql": f"project = {project.jira_project_key} ORDER BY created DESC", "maxResults": 100, "fields": ["summary", "description", "status", "assignee", "priority", "duedate", "created", "parent", "issuetype"]},
                timeout=10,
            )
            if res.ok:
                raw_issues = res.json().get("issues", [])
        except requests.RequestException:
            pass
    
    print(f"[BOARD] JQL 결과 이슈 수: {len(raw_issues)}")
    issues_by_column = {column["id"]: [] for column in jira_columns}
    for issue in raw_issues:
        fields = issue.get("fields", {})
        jira_status = fields.get("status", {})
        column_id = _match_jira_column(jira_columns, jira_status)
        print(f"[BOARD] 이슈 {issue.get('key')} 상태={jira_status.get('name')} → 컬럼={column_id}")
        assignee = fields.get("assignee") or {}
        priority = fields.get("priority") or {}
        parent = fields.get("parent") or {}
        parent_fields = parent.get("fields") or {}
        issue_type = fields.get("issuetype") or {}

        issues_by_column.setdefault(column_id, []).append({
            "issue_key": issue.get("key"),
            "title": fields.get("summary", ""),
            "description": "",
            "assignee": assignee.get("displayName", ""),
            "priority": priority.get("name", ""),
            "due_date": fields.get("duedate") or "",
            "created": fields.get("created") or "",
            "status": jira_status.get("name", ""),
            "parent_key": parent.get("key", ""),
            "parent_title": parent_fields.get("summary", ""),
            "issue_type": issue_type.get("name", ""),
            "issue_type_icon_url": issue_type.get("iconUrl", ""),
            "issue_type_hierarchy_level": issue_type.get("hierarchyLevel"),
        })

    return Response({
        "columns": jira_columns,
        "issues": issues_by_column,
    })


@api_view(["PATCH"])
def project_jira_board_issue_status(request, project_id, issue_key):
    user_id = request.auth["user_id"]

    # 1) 프로젝트 존재 확인
    try:
        project = Project.objects.get(project_id=project_id)
    except Project.DoesNotExist:
        return Response({"error": "프로젝트를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    # 2) 권한 확인 (소유자 또는 구성원만)
    is_member = ProjectUsers.objects.filter(project=project, user_id=user_id).exists()
    if project.project_owner_id != user_id and not is_member:
        return Response({"error": "프로젝트 구성원이 아닙니다."}, status=status.HTTP_403_FORBIDDEN)

    # 3) 사용자 / Jira 토큰 확인
    try:
        user = Users.objects.get(users_id=user_id)
    except Users.DoesNotExist:
        return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    access_token = get_valid_access_token(user)
    if not access_token:
        return Response({"error": "Jira 연동이 필요합니다."}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.jira_cloud_id:
        return Response({"error": "Jira 클라우드 ID가 없습니다."}, status=status.HTTP_400_BAD_REQUEST)

    # 4) 요청 본문 파싱
    column_id = request.data.get("column_id")
    target_status_names = request.data.get("target_status_names") or []
    if not column_id:
        return Response({"error": "column_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    # 5) Jira 상태 전환 (기존 jira_client 함수 재사용)
    result = update_jira_issue_status(
        issue_key,
        column_id,
        access_token,
        user.jira_cloud_id,
        target_status_names=target_status_names,
    )

    if not result.get("success"):
        return Response(
            {"error": "Jira 상태 변경에 실패했습니다.", "detail": result},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response(result, status=status.HTTP_200_OK)

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

    if project.project_owner_id != request.auth["user_id"]:
        return Response({"error": "프로젝트 생성자만 삭제할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)

    project.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def user_project_list(request, user_id):
    owned = Project.objects.filter(project_owner_id = user_id)
    joined = Project.objects.filter(projectusers__user_id = user_id)
    qs = (owned | joined).distinct().order_by("-created_at")
    return Response([_project_card_data(project) for project in qs])