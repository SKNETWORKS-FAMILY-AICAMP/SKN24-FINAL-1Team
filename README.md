<<<<<<< HEAD
# HPM - 회의 피하지마

HPM은 회의 준비, 녹음, 회의록 생성, 태스크 추출, Jira 등록, 문서 기반 챗봇까지 한 번에 처리하는 AI 회의 협업 플랫폼입니다. 프론트엔드, Django 백엔드, GPU 기반 AI 서버를 나누어 운영합니다.
=======
# 프로젝트명
회의피하지마
>>>>>>> ec0ac98eedece169bb0a3d69307bf570277a8bb3

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

<<<<<<< HEAD
| 영역 | 기술 |
| --- | --- |
| Frontend | React, TypeScript, Vite, Zustand, Axios, Tailwind CSS |
| Backend | Django, Django REST Framework, Simple JWT, MySQL |
| AI | FastAPI, WhisperX, PaddleOCR-VL, vLLM, Qdrant, SentenceTransformers |
| Infra | Docker, nginx, RunPod, AWS S3/SES, Jira API |

## 실행 순서
=======
## 1. 한 줄 정리

음성 회의를 자동으로 회의록·태스크로 바꾸고, 그 결과를 Jira까지 자동 연동하는 **통합 회의 자동화 플랫폼**입니다. 회의 *준비 → 진행 → 후속 업무*의 단절된 흐름을 하나의 서비스로 묶었습니다.

---

## 2. 기획 배경

### 2-1. 배경

협업 툴은 업종·규모를 가리지 않고 보편화되었고, 금융권(NH농협은행)까지 STT·LLM 기반 AI 회의록을 도입하는 추세입니다. 그러나 회의의 비효율은 회의 자체보다 **준비 단계의 구조적 공백**에서 시작됩니다. 인크루트 조사(직장인 604명)에서 56%가 회의 중 딴짓 경험이 있다고 답했고, 회의가 비효율적이라는 응답 중 52.7%는 "목적·결론이 없어서", 21.4%는 "준비·진행에 시간이 많이 들어서"를 이유로 꼽았습니다.

### 2-2. 시장 현황
>>>>>>> ec0ac98eedece169bb0a3d69307bf570277a8bb3

로컬에서 전체 기능을 확인하려면 보통 아래 순서로 준비합니다.

<<<<<<< HEAD
1. MySQL 또는 사용할 DB를 준비합니다.
2. Qdrant를 실행합니다.
3. AI 서버를 필요한 기능별로 실행합니다.
4. Django 백엔드를 실행합니다.
5. React 프론트엔드를 실행합니다.

## Backend 실행
=======

### 2-3. 문제점 → 해결

ClovaNote·Daglo 등 기존 AI 회의 도구는 대부분 음성 전사·요약·액션 아이템 추출 같은 **특정 단계 기능에만 집중**합니다. 태스크 관리·프로젝트 연동이 필요하면 Jira·Notion 등 별도 툴을 병행해야 하고, 이로 인한 **툴 피로(tool fatigue)**가 발생합니다. (앱 전환 후 업무 흐름 복귀에 평균 9.5분 소요, 직장인 45%가 잦은 전환이 생산성을 떨어뜨린다고 응답 — Qatalog·코넬대 연구)

> **해결:** 회의피하지마는 회의 전 준비부터 회의 중 실시간 지원, 회의 후 태스크 관리·Jira 연동까지 **전 과정을 하나의 플랫폼으로 통합**해 툴 파편화를 제거합니다.
>>>>>>> ec0ac98eedece169bb0a3d69307bf570277a8bb3

```bash
cd backend/hpm
pip install -r ../requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

<<<<<<< HEAD
## Frontend 실행

```bash
cd frontend/hpm
npm install
npm run dev
```
=======
## 3. 핵심 기능

| 단계 | 기능 |
|------|------|
| **회의 생성** | OCR로 스캔 문서·이미지를 텍스트화, 주제·요청 입력 시 AI가 **기초 안건 자동 생성**, 참석자에게 안내 메일 발송 |
| **회의 전** | 외부 API·크롤링 + 내부 DB 연동으로 관련 자료 자동 탐색, **회의 준비 자료 생성** |
| **회의 중** | 내·외부 데이터 **RAG 기반 실시간 질의응답 챗봇** |
| **회의 후** | 녹음 원본과 함께 **회의록 자동 생성**, STT 화자 분리로 태스크 식별·**담당자 자동 매칭**, 요약 메일 발송 |
| **칸반 대시보드** | 담당자별 태스크 현황 모니터링, **Jira 양방향 자동 동기화**(상태·담당자·기한·우선순위) |

> 핵심 차별점은 **담당자까지 포함한 태스크 자동 분류**와 **Jira 양방향 자동 배정**입니다. 회의록에서 "본인 선언"과 "리더의 지시" 발화 패턴을 구분해 담당자·마감일을 추출합니다.

---

## 4. 시장 규모
>>>>>>> ec0ac98eedece169bb0a3d69307bf570277a8bb3

기본 접속 주소:

<<<<<<< HEAD
```text
http://localhost:5173
```

## AI 서버 실행 예시
=======
---

---
>>>>>>> ec0ac98eedece169bb0a3d69307bf570277a8bb3

```bash
# STT
cd ai/stt
uvicorn stt_server:app --host 0.0.0.0 --port 8502 --reload

<<<<<<< HEAD
# OCR
cd ai/ocr
uvicorn ocr_server:app --host 0.0.0.0 --port 8501 --reload
=======
## 5. 경쟁사 분석 · 포지셔닝 · 수익 모델

### 경쟁사 비교

| 기능 | ClovaNote | Notion AI | MS Teams | Daglo | **회의피하지마** |
|------|:---:|:---:|:---:|:---:|:---:|
| 회의 준비 내용 생성 | ❌ | ✅ | ❌ | ✅ | ✅ |
| 음성 → 자동 요약 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 화자 분리 | ✅ | ❌ | ✅ | ✅ | ✅ |
| 태스크 자동 분류(담당자) | ❌ | △ | △ | ✅ | ✅ |
| Jira 연동 | ❌ | 수동 | 수동 | ❌ | **자동(양방향)** |

## 주요 고객
>>>>>>> ec0ac98eedece169bb0a3d69307bf570277a8bb3

# Parsed
cd ai/parsed
uvicorn parsed_server:app --host 0.0.0.0 --port 8503 --reload

# LLM/RAG
cd ai/vllm
uvicorn core_server:app --host 0.0.0.0 --port 8504 --reload
```

<<<<<<< HEAD
AI 서버는 GPU, 모델 파일, Hugging Face token, Qdrant 상태에 영향을 많이 받습니다. 자세한 설정은 각 AI 하위 README를 확인합니다.

## 환경변수
=======
### 포지셔닝

기존 서비스가 일부 단계에 머문다면, 회의피하지마는 **회의 준비부터 업무 배정까지 전 과정을 자동화**하는 통합 업무 자동화 서비스입니다. 특히 **내·외부 데이터 자동 매핑 기반 준비 자료 생성**과 **회의 결과 기반 Jira 자동 배정**은 경쟁사가 제공하지 않는 영역입니다.

### 타겟 & 수익 모델

타겟은 **Jira 기반 업무 환경에서 회의 전후 단절로 비효율을 겪는 조직·실무자**입니다.
>>>>>>> ec0ac98eedece169bb0a3d69307bf570277a8bb3

실제 secret 값은 `.env`에 넣고 Git에 올리지 않습니다. 주요 위치는 다음과 같습니다.

<<<<<<< HEAD
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
=======
---
## 6. 증명 가능한 성과 · 베타테스터 평가

## 7. 시스템 아키텍처 · 핵심 백엔드 로직

## 8. 모델 테스트 평가 · 시스템 평가 결과

## 9. 서비스 시연

## 10. 트러블 슈팅 · 향후 보완점

### 향후 보완점



## 기대 효과

회의록 작성과 업무 배정에 드는 시간을 대폭 줄여 구성원이 핵심 논의에 집중할 수 있습니다. 회의에서 결정된 태스크가 담당자·마감일과 함께 Jira에 자동 등록되므로 후속 업무 누락이 줄고 실행력이 높아집니다. 또한 회의 데이터가 검색 가능한 형태로 축적되어 조직의 지식 자산으로 활용할 수 있습니다.


>>>>>>> ec0ac98eedece169bb0a3d69307bf570277a8bb3
