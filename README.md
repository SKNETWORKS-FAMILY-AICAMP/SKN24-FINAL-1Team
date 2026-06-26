# HPM - 회의 피하지마

HPM은 회의 준비, 녹음, 회의록 생성, 태스크 추출, Jira 등록, 문서 기반 챗봇까지 한 번에 처리하는 AI 회의 협업 플랫폼입니다. 프론트엔드, Django 백엔드, GPU 기반 AI 서버를 나누어 운영합니다.

## 한눈에 보기

- 회의 녹음 파일을 STT로 텍스트화합니다.
- LLM이 회의록, 액션 아이템, 안건, 회의 준비자료를 생성합니다.
- 회의에서 나온 태스크를 Jira 이슈로 등록합니다.
- 프로젝트별 문서를 업로드하고 RAG 챗봇에서 검색합니다.
- 사용자, 프로젝트, 회의, 문서, 알림을 웹 화면에서 관리합니다.

## 폴더 구조

```text
SKN24-FINAL-1Team/
├─ frontend/             # React + TypeScript + Vite 웹 클라이언트
├─ backend/              # Django REST Framework API 서버
├─ ai/                   # STT, OCR, 문서 파싱, LLM/RAG FastAPI 서버
│  ├─ ocr/               # 문서/이미지 OCR
│  ├─ stt/               # 회의 녹음 STT
│  ├─ parsed/            # 내부 문서 파싱/임베딩/Qdrant 적재
│  └─ vllm/              # 회의록/안건/챗봇 LLM 서버
├─ docker-compose.yml    # 배포용 compose 설정
├─ Dockerfile.backend
├─ Dockerfile.frontend
└─ nginx.conf
```

## 상세 문서

- [frontend/README.md](frontend/README.md): 프론트엔드 실행, 라우트, API 호출 구조
- [backend/README.md](backend/README.md): Django API, 환경변수, AI 서버 연동
- [ai/README.md](ai/README.md): AI 서비스 전체 구조
- [ai/ocr/README.md](ai/ocr/README.md): OCR 서버
- [ai/stt/README.md](ai/stt/README.md): STT 서버
- [ai/parsed/README.md](ai/parsed/README.md): 문서 ingest 서버
- [ai/vllm/README.md](ai/vllm/README.md): LLM/RAG 서버

## 주요 기술

| 영역 | 기술 |
| --- | --- |
| Frontend | React, TypeScript, Vite, Zustand, Axios, Tailwind CSS |
| Backend | Django, Django REST Framework, Simple JWT, MySQL |
| AI | FastAPI, WhisperX, PaddleOCR-VL, vLLM, Qdrant, SentenceTransformers |
| Infra | Docker, nginx, RunPod, AWS S3/SES, Jira API |

## 실행 순서

로컬에서 전체 기능을 확인하려면 보통 아래 순서로 준비합니다.

1. MySQL 또는 사용할 DB를 준비합니다.
2. Qdrant를 실행합니다.
3. AI 서버를 필요한 기능별로 실행합니다.
4. Django 백엔드를 실행합니다.
5. React 프론트엔드를 실행합니다.

## Backend 실행

```bash
cd backend/hpm
pip install -r ../requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

## Frontend 실행

```bash
cd frontend/hpm
npm install
npm run dev
```

기본 접속 주소:

```text
http://localhost:5173
```

## AI 서버 실행 예시

```bash
# STT
cd ai/stt
uvicorn stt_server:app --host 0.0.0.0 --port 8502 --reload

# OCR
cd ai/ocr
uvicorn ocr_server:app --host 0.0.0.0 --port 8501 --reload

# Parsed
cd ai/parsed
uvicorn parsed_server:app --host 0.0.0.0 --port 8503 --reload

# LLM/RAG
cd ai/vllm
uvicorn core_server:app --host 0.0.0.0 --port 8504 --reload
```

AI 서버는 GPU, 모델 파일, Hugging Face token, Qdrant 상태에 영향을 많이 받습니다. 자세한 설정은 각 AI 하위 README를 확인합니다.

## 환경변수

실제 secret 값은 `.env`에 넣고 Git에 올리지 않습니다. 주요 위치는 다음과 같습니다.

```text
.env
backend/hpm/.env
frontend/hpm/.env
ai/.env
ai/ocr/.env
ai/stt/.env
ai/parsed/.env
ai/vllm/.env
```

대표적으로 필요한 값:

```dotenv
# Frontend
VITE_API_BASE_URL=http://localhost:8000/api

# Backend DB
DB_NAME=hpm_db
DB_USER=root
DB_PASSWORD=change-me
DB_HOST=localhost
DB_PORT=3306

# AI service URLs
RUNPOD_CORE_BASE_URL=http://localhost:8504
RUNPOD_STT_BASE_URL=http://localhost:8502
RUNPOD_OCR_BASE_URL=http://localhost:8501
RUNPOD_PARSED_BASE_URL=http://localhost:8503
RAG_SERVER_URL=http://localhost:8504/chat

# Vector DB
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
```

## Docker 실행

```bash
docker-compose up --build
```

Docker 설정은 backend와 frontend 중심입니다. AI 서버와 Qdrant는 배포 방식에 맞춰 별도 서버 또는 RunPod에서 운영할 수 있습니다.

## Git에 올리지 않을 것

- `.env`, API key, token, 비밀번호
- `node_modules/`
- `backend/hpm/media/`
- 모델 캐시, Qdrant 저장소, 임시 파싱 결과
- `desktop.ini`, 로그 파일, 로컬 DB 파일

## 현재 상태 메모

이 프로젝트는 기능별 서버가 분리되어 있어서 한 번에 전부 실행하기보다, 필요한 기능부터 서버를 켜고 연결 상태를 확인하는 방식이 좋습니다. 프론트엔드와 백엔드는 기본 기능 확인용이고, 회의록/챗봇/문서 ingest는 AI 서버와 Qdrant 설정이 맞아야 정상 동작합니다.
