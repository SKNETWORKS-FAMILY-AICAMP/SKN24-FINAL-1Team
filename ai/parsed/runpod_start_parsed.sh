#!/usr/bin/env bash
set -euo pipefail

exec uvicorn parsed_server:app --host 0.0.0.0 --port 8501 --reload
