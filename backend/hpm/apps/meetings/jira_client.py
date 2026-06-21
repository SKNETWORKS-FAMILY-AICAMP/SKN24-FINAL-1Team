import os
import requests

JIRA_STATUS_TO_COLUMN = {
    "To Do":       "todo",
    "할 일":        "todo",
    "In Progress": "progress",
    "진행 중":      "progress",
    "In Review":   "review",
    "검토":         "review",
    "Done":        "done",
    "완료":         "done",
}

COLUMN_TO_TRANSITION_NAME = {
    "todo":     "To Do",
    "progress": "In Progress",
    "review":   "In Review",
    "done":     "Done",
}


def get_jira_config():
    return {
        "client_id": os.getenv("JIRA_CLIENT_ID", ""),
        "client_secret": os.getenv("JIRA_CLIENT_SECRET", ""),
        "project_key": os.getenv("JIRA_PROJECT_KEY", ""),
    }


def create_jira_issue(title: str, owner: str, access_token: str, cloud_id: str) -> dict:
    """
    Jira에 태스크를 생성한다. (OAuth access_token 방식)
    - summary: [owner] title 형태
    - issuetype: Task
    """
    config = get_jira_config()

    if not all([access_token, cloud_id, config["project_key"]]):
        return {"success": False, "error": "Jira 연동 정보가 없습니다. Jira 로그인이 필요합니다."}

    summary = f"[{owner}] {title}" if owner and owner != "미정" else title

    url = f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/issue"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "fields": {
            "project": {"key": config["project_key"]},
            "summary": summary,
            "issuetype": {"name": "스토리"},
        }
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        return {
            "success": True,
            "issue_key": data.get("key"),   # e.g. HRJK-42
            "issue_id": data.get("id"),
            "summary": summary,
        }
    except requests.RequestException as e:
        error_detail = ""
        if hasattr(e, "response") and e.response is not None:
            try:
                error_detail = e.response.json()
            except Exception:
                error_detail = e.response.text
        return {"success": False, "error": str(e), "detail": error_detail}


def create_jira_issues_from_todo(todo_list: list, access_token: str, cloud_id: str) -> list:
    """
    todo_list의 각 항목에서 title, owner를 꺼내 Jira 태스크를 일괄 생성한다.
    """
    results = []
    for todo in todo_list:
        if not isinstance(todo, dict):
            continue
        title = str(todo.get("title") or "").strip()
        owner = str(todo.get("owner") or "미정").strip()
        if not title:
            continue
        result = create_jira_issue(title, owner, access_token, cloud_id)
        result["original_title"] = title
        result["original_owner"] = owner
        results.append(result)
    return results


def get_jira_issues(access_token : str, cloud_id: str, project_key : str) -> dict:

    if not all([access_token, cloud_id, project_key]):
        return {"success" : False, "error": "Jira 연동 정보가 없습니다."}
    
    url = f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/search/jql"
    headers = {
        "Authorization" : f"Bearer {access_token}",
        "Accept" : "application/json",
        "Content-Type": "application/json",
    }

    payload = {
        "jql" : f"project = {project_key} ORDER BY created DESC",
        "maxResults" : 100,
        "fields": ["summary", "status", "assignee", "priority", "duedate", "created"],
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        columns = {"todo" : [], "progress":[], "review" : [],"done" :[]}

        for issue in data.get("issues", []):
            fields = issue.get("fields", {})

            jira_status = fields.get("status",{}).get("name", "")
            column_id = JIRA_STATUS_TO_COLUMN.get(jira_status, "todo")

            assignee = ""
            if fields.get("assignee"):
                assignee = fields["assignee"].get("displayName", "")

            priority = ""
            if fields.get("priority"):
                priority = fields["priority"].get("name", "")

            columns[column_id].append({
                "issue_key" : issue.get("key"),
                "title" : fields.get("summary", ""),
                "assignee" : assignee,
                "priority" : priority,
                "due_date" : fields.get("duedate", ""),
            })
        return {"success" : True, "columns" : columns}
    
    except requests.RequestException as e:
        error_detail = ""
        if hasattr(e, "response") and e.response is not None:
            try:
                error_detail = e.response.json()
            except Exception:
                error_detail = e.response.text
        return {"success" : False, "error" : str(e), "detail" : error_detail}
        


def update_jira_issue_status(issue_key: str, column_id: str, access_token: str, cloud_id: str) -> dict:

    transition_name = COLUMN_TO_TRANSITION_NAME.get(column_id)
    if not transition_name:
        return {"success" : False, "error" : f"알 수 없는 column_id: {column_id}"}
    
    headers = {
        "Authorization" : f"Bearer {access_token}",
        "Content-Type" : "application/json",
        "Accept" : "application/json",
    }

    transitions_url = f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/issue/{issue_key}/transitions"

    try:
        trans_response = requests.get(transitions_url, headers=headers, timeout =10)
        trans_response.raise_for_status()
        transitions =  trans_response.json().get("transitions" ,[])

    except requests.RequestException as e:
        return {"success" : False, "error" : f"transition 조회 실패: {str(e)}"}
    
    transition_id = None
    for t in transitions:
        if t.get("name") == transition_name:
            transition_id = t.get("id")
            break

    if not transition_id:
        return {
            "success" : False,
            "error" : f"'{transition_name}' transition을 찾을 수 없습니다. Jira 워크플로우를 확인하세요."
        }
    
    try:
        exec_response = requests.post(
            transitions_url,
            json = {"transition" : {"id" : transition_id}},
            headers = headers,
            timeout=10,
        )
        exec_response.raise_for_status()
        return {"success" : True, "issue_key" : issue_key, "new_column" : column_id}
    
    except requests.RequestException as e:
        error_detail = ""
        if hasattr(e, "response") and e.response is not None:
            try:
                error_detail = e.response.json()
            except Exception:
                error_detail = e.response.text

        return {"success" : False, "error" : str(e), "detail" : error_detail}
    

def delete_jira_issue(issue_key: str, access_token: str, cloud_id: str) -> dict:


    url = f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/issue/{issue_key}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    try:
        response = requests.delete(url, headers= headers, timeout=10)
        response.raise_for_status()

        return {"success" : True, "issue_key" : issue_key}
    
    except requests.RequestException as e:
        error_detail = ""
        if hasattr(e, "response") and e.response is not None:
            try :
                error_detail = e.response.json()
            except Exception:
                error_detail = e.response.text
        return {"success" : False, "error" : str(e), "detail" : error_detail}
