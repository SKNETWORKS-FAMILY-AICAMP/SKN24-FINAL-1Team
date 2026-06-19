# HPM Backend (Django REST Framework)

## 실행 방법

```bash
cd backend/hpm
pip install -r ../requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

## API 전체 목록

### 사용자 (api/users/)
| Method | URL | 설명 |
|--------|-----|------|
| POST | /api/users/login/ | 로그인 |
| GET | /api/users/ | 전체 목록 |
| GET/PATCH | /api/users/{id}/ | 상세/수정 |

### 프로젝트 (api/projects/)
| Method | URL | 설명 |
|--------|-----|------|
| GET/POST | /api/projects/ | 목록/생성 |
| GET/PATCH/DELETE | /api/projects/{id}/ | 상세/구성원변경/삭제 |

### 회의 (api/meetings/)
| Method | URL | 설명 |
|--------|-----|------|
| GET/POST | /api/meetings/ | 목록/생성 |
| GET/PATCH | /api/meetings/{id}/ | 상세/수정 |
| POST | /api/meetings/{id}/start/ | 회의 시작 |
| POST | /api/meetings/{id}/end/ | 회의 종료 + STT + 회의록 생성 |
| POST | /api/meetings/{id}/minutes/ | 회의록 생성 (RunPod 별도 호출) |
| GET/POST | /api/meetings/{id}/agenda/ | 기초 안건 조회/저장 |
| POST | /api/meetings/{id}/agenda/confirm/ | 안건 확정 |
| POST | /api/meetings/{id}/minutes/request/ | 승인 요청 |
| POST | /api/meetings/{id}/minutes/approve/ | 승인 |
| POST | /api/meetings/{id}/minutes/reject/ | 거절 |
| GET/POST | /api/meetings/{id}/tasks/ | 태스크 목록/추가 |
| PATCH | /api/meetings/{id}/tasks/{task_id}/ | 태스크 수정 |
| POST | /api/meetings/{id}/jira/ | Jira 태스크 등록 |

### 챗봇 (api/chat/)
| Method | URL | 설명 |
|--------|-----|------|
| POST | /api/chat/{meeting_id}/ | 실시간 질의 |
| GET | /api/chat/{meeting_id}/history/ | 대화 내역 조회 |

### 문서 (api/documents/)
| Method | URL | 설명 |
|--------|-----|------|
| GET/POST | /api/documents/{project_id}/ | 목록/업로드 |
| DELETE | /api/documents/{project_id}/{doc_id}/ | 삭제 |

### 알림 (api/notifications/)
| Method | URL | 설명 |
|--------|-----|------|
| GET | /api/notifications/?user_id={id} | 알림 목록 |
| PATCH | /api/notifications/{id}/read/ | 읽음 처리 |
| DELETE | /api/notifications/{id}/ | 단건 삭제 |
| DELETE | /api/notifications/all/?user_id={id} | 전체 삭제 |

## settings.py 환경변수 (수정 필요)
- `DATABASES` — MySQL 접속 정보
- `RUNPOD_BASE_URL` — RunPod STT/회의록 서버 주소
- `RAG_SERVER_URL` — 챗봇 RAG 서버 주소
- `JIRA_BASE_URL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY` — Jira 연동 (선택)
