# OCR Service

문서 또는 이미지 파일에서 텍스트를 추출하는 FastAPI 서버입니다. 기본 백엔드는 PaddleOCR-VL이며, 설정에 따라 Qwen VL 모델을 직접 로딩하는 경로도 가지고 있습니다.

## 역할

- PDF, 이미지 파일 업로드를 받아 OCR 수행
- OCR 결과를 텍스트로 정리해 반환
- 긴 OCR 작업을 위한 비동기 job API 제공
- GPU 작업 충돌을 줄이기 위한 lock 사용

## 주요 파일

| 파일 | 설명 |
| --- | --- |
| `ocr_server.py` | FastAPI 앱, OCR API, job 관리 |
| `config.py` | OCR 백엔드, 모델 ID, PaddleOCR-VL URL, 토큰 수 등 환경 설정 |
| `model_runtime.py` | Qwen OCR 모델 로딩/추론 로직 |
| `runtime_locks.py` | GPU 작업 lock |
| `schemas.py` | 공통 응답 모델 |
| `requirements-ocr.txt` | OCR 서버 의존성 |
| `runpod_start_paddleocr_wrapper.sh` | PaddleOCR-VL serving 실행 후 OCR 래퍼 서버 실행 |

## API

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/health` | 서버 상태, OCR 백엔드, CUDA 여부 확인 |
| `POST` | `/ocr` | 파일을 업로드하고 OCR 결과를 바로 반환 |
| `POST` | `/ocr/jobs` | OCR job 생성 |
| `GET` | `/ocr/jobs/{job_id}` | OCR job 상태/결과 조회 |

## 실행 방법

```bash
cd ai/ocr
pip install -r requirements-ocr.txt
uvicorn ocr_server:app --host 0.0.0.0 --port 8501 --reload
```

PaddleOCR-VL serving까지 같이 띄우는 RunPod용 실행 스크립트는 다음과 같습니다.

```bash
cd ai/ocr
bash runpod_start_paddleocr_wrapper.sh
```

이 스크립트는 내부적으로 다음 흐름을 수행합니다.

1. PaddleOCR-VL serving을 `127.0.0.1:8080`에서 시작
2. 포트 준비 상태 확인
3. OCR wrapper를 `0.0.0.0:8501`에서 시작

## 주요 환경변수

| 이름 | 기본값 | 설명 |
| --- | --- | --- |
| `OCR_BACKEND` | `paddleocr_vl` | `paddleocr_vl` 또는 `qwen` |
| `OCR_MODEL_ID` | `Qwen/Qwen3-VL-4B-Instruct` | Qwen OCR 경로에서 사용할 모델 |
| `PADDLEOCR_VL_URL` | `http://127.0.0.1:8080` | PaddleOCR-VL serving 주소 |
| `PADDLEOCR_VL_TIMEOUT_SEC` | `600` | PaddleOCR-VL 요청 타임아웃 |
| `PADDLEOCR_VL_RETURN_MARKDOWN_IMAGES` | `false` | markdown image 포함 여부 |
| `PADDLEOCR_VL_VISUALIZE` | `false` | 시각화 결과 생성 여부 |
| `LOAD_IN_4BIT` | `true` | Qwen 모델 4bit 로딩 여부 |
| `MAX_NEW_TOKENS` | `2048` | Qwen 생성 최대 토큰 |
| `PRELOAD_OCR_MODEL` | `false` | 시작 시 OCR 모델 선로딩 여부 |
| `OCR_JOB_WORKERS` | `1` | OCR job worker 수 |

## 요청 예시

```bash
curl -X POST "http://localhost:8501/ocr" \
  -F "file=@sample.pdf"
```

비동기 job 방식:

```bash
curl -X POST "http://localhost:8501/ocr/jobs" \
  -F "file=@sample.pdf"

curl "http://localhost:8501/ocr/jobs/{job_id}"
```

## 백엔드 연동

Django 백엔드에서는 `RUNPOD_OCR_BASE_URL` 값을 통해 이 서버를 호출하는 형태를 권장합니다.

```text
RUNPOD_OCR_BASE_URL=http://localhost:8501
```

## 주의사항

- PaddleOCR-VL backend를 사용할 때는 별도 serving 프로세스가 먼저 준비되어야 합니다.
- Qwen backend는 모델 로딩과 GPU 메모리 사용량이 큽니다.
- 업로드 파일이 비어 있으면 400 오류를 반환합니다.
- `.env`, 모델 캐시, 임시 OCR 결과는 Git에 올리지 않습니다.
