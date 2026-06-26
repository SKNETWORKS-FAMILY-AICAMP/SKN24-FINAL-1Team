<h1 align="center">HPM</h1>

<p align="center">
  <img src="assets/인트로.png" width="800" alt="회의피하지마 - AI 회의 자동화 플랫폼">
</p>

---

## 프로젝트 소개

HPM은 회의 전후에 반복되는 수작업을 줄이기 위한 협업 서비스입니다. 회의 녹음 파일을 STT로 텍스트화하고, LLM이 회의록과 액션 아이템을 정리하며, 필요한 태스크는 Jira 이슈로 등록합니다. 업로드한 프로젝트 문서는 RAG 검색에 활용되어 챗봇 답변의 근거가 됩니다.

### 핵심 기능

| 기능 | 설명 |
| --- | --- |
| 회의 관리 | 프로젝트별 회의 생성, 시작, 종료, 참석자 관리 |
| STT | 회의 녹음 파일을 텍스트로 변환 |
| 회의록 생성 | transcript 기반 회의록과 todo list 생성 |
| 안건/준비자료 | 이전 회의와 문서를 참고해 안건과 준비자료 생성 |
| Jira 연동 | 회의에서 나온 태스크를 Jira 이슈로 등록 |
| 문서 RAG | PDF/DOCX/TXT 문서를 파싱하고 Qdrant에 적재 |
| 챗봇 | 회의/프로젝트 문맥 기반 질의응답 |

## 서비스 구성

```text
SKN24-FINAL-1Team/
├─ frontend/          React + TypeScript + Vite
├─ backend/           Django REST Framework API
├─ ai/
│  ├─ ocr/            OCR server
│  ├─ stt/            WhisperX STT server
│  ├─ parsed/         Document parsing + embedding + Qdrant ingest
│  └─ vllm/           LLM/RAG server
├─ docker-compose.yml
├─ Dockerfile.backend
├─ Dockerfile.frontend
└─ nginx.conf
```

### 상세 문서

| 문서 | 내용 |
| --- | --- |
| [frontend/README.md](frontend/README.md) | 프론트엔드 실행, 라우트, API 호출 구조 |
| [backend/README.md](backend/README.md) | Django API, 환경변수, AI 서버 연동 |
| [ai/README.md](ai/README.md) | AI 서비스 전체 구조 |
| [ai/ocr/README.md](ai/ocr/README.md) | OCR 서버 |
| [ai/stt/README.md](ai/stt/README.md) | STT 서버 |
| [ai/parsed/README.md](ai/parsed/README.md) | 문서 ingest 서버 |
| [ai/vllm/README.md](ai/vllm/README.md) | LLM/RAG 서버 |

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Frontend | React, TypeScript, Vite, Zustand, Axios, Tailwind CSS |
| Backend | Django, Django REST Framework, Simple JWT, MySQL |
| AI | FastAPI, WhisperX, PaddleOCR-VL, vLLM, Qdrant, SentenceTransformers |
| Infra | Docker, nginx, RunPod, AWS S3/SES, Jira API |

## 실행 가이드

### 1. Backend

```bash
cd backend/hpm
pip install -r ../requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### 2. Frontend

```bash
cd frontend/hpm
npm install
npm run dev
```

```text
http://localhost:5173
```

### 3. AI servers

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

## 환경변수

실제 secret 값은 `.env`에 넣고 Git에 올리지 않습니다. 자세한 양식은 각 폴더 README에 있습니다.

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

대표값:

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api

DB_NAME=hpm_db
DB_USER=root
DB_PASSWORD=change-me
DB_HOST=localhost
DB_PORT=3306

RUNPOD_CORE_BASE_URL=http://localhost:8504
RUNPOD_STT_BASE_URL=http://localhost:8502
RUNPOD_OCR_BASE_URL=http://localhost:8501
RUNPOD_PARSED_BASE_URL=http://localhost:8503
RAG_SERVER_URL=http://localhost:8504/chat

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
```

## Docker

```bash
docker-compose up --build
```

Docker 설정은 backend와 frontend 중심입니다. AI 서버와 Qdrant는 로컬, 별도 서버, RunPod 중 운영 방식에 맞게 연결합니다.

## Git 제외 대상

아래 항목은 저장소에 올리지 않습니다.

```text
.env
node_modules/
backend/hpm/media/
dist/
build/
*.log
*.db
*.sqlite
desktop.ini
```

## 메모

이 프로젝트는 기능별 서버가 분리되어 있습니다. 처음 실행할 때는 프론트엔드와 백엔드부터 연결하고, 이후 STT, OCR, parsed, vLLM 서버를 필요한 기능별로 하나씩 붙여 확인하는 방식이 가장 안정적입니다.
