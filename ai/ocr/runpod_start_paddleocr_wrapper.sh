#!/usr/bin/env bash
set -euo pipefail

export OCR_BACKEND="${OCR_BACKEND:-paddleocr_vl}"
export PADDLEOCR_VL_URL="${PADDLEOCR_VL_URL:-http://127.0.0.1:8080}"
export PADDLEOCR_VL_TIMEOUT_SEC="${PADDLEOCR_VL_TIMEOUT_SEC:-600}"
export PADDLEOCR_VL_RETURN_MARKDOWN_IMAGES="${PADDLEOCR_VL_RETURN_MARKDOWN_IMAGES:-false}"
export PADDLEOCR_VL_VISUALIZE="${PADDLEOCR_VL_VISUALIZE:-false}"

if ! command -v paddlex >/dev/null 2>&1; then
  echo "paddlex is not installed. Install PaddleOCR first:"
  echo 'python -m pip install "paddleocr[doc-parser]"'
  exit 1
fi

paddlex --install serving

paddlex --serve \
  --pipeline PaddleOCR-VL \
  --host 127.0.0.1 \
  --port 8080 \
  > /tmp/paddleocr-vl-8080.log 2>&1 &

echo "Waiting for PaddleOCR-VL service on 127.0.0.1:8080..."
for i in $(seq 1 120); do
  if python -c "import socket; s=socket.create_connection(('127.0.0.1', 8080), timeout=2); s.close()" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "Starting OCR wrapper on 0.0.0.0:8501..."
exec uvicorn ocr_server:app --host 0.0.0.0 --port 8501 --reload
