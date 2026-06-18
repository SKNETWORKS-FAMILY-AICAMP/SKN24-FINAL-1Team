import os
import requests


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
