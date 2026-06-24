import os
import json
import mimetypes

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
import requests
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.notifications.models import Notification
from apps.projects.models import ProjectUsers
from .models import Document
from .serializers import DocumentSerializer

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_SIZE = 20 * 1024 * 1024
PARSED_REQUEST_TIMEOUT = 300
PARSED_STATUS_TIMEOUT = 20
NOTIFIED_INGEST_JOBS = set()


def get_project_user_or_response(project_id, user_id):
    try:
        return ProjectUsers.objects.select_related("user", "user__dept").get(
            project_id=project_id,
            user_id=user_id,
        )
    except ProjectUsers.DoesNotExist:
        return Response({"error": "프로젝트 구성원이 아닙니다."}, status=status.HTTP_403_FORBIDDEN)


def _parsed_base_url():
    return getattr(settings, "RUNPOD_PARSED_BASE_URL", "").rstrip("/")


def _content_type_for_file(path):
    guessed, _ = mimetypes.guess_type(path)
    return guessed or "application/octet-stream"


def _parsed_metadata(project_id, documents):
    return json.dumps(
        {
            "project_id": str(project_id),
            "source": "document_upload",
            "source_type": "internal_document",
            "document_ids": [doc.document_id for doc in documents],
            "filenames": [doc.title for doc in documents],
        },
        ensure_ascii=False,
    )


def _start_parsed_ingest(project_id, documents):
    base_url = _parsed_base_url()
    if not base_url:
        return {
            "ingest_status": "failed",
            "ingest_error": "RUNPOD_PARSED_BASE_URL is not configured.",
        }

    opened_files = []
    files = []
    try:
        for doc in documents:
            file_obj = open(doc.path, "rb")
            opened_files.append(file_obj)
            files.append(
                (
                    "files",
                    (
                        doc.title,
                        file_obj,
                        _content_type_for_file(doc.path),
                    ),
                )
            )

        response = requests.post(
            f"{base_url}/internal-docs/ingest/jobs",
            files=files,
            data={
                "project_id": str(project_id),
                "metadata": _parsed_metadata(project_id, documents),
            },
            timeout=PARSED_REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
        job_id = payload.get("job_id")
        if not job_id:
            return {
                "ingest_status": "failed",
                "ingest_error": "Parsed ingest response did not include job_id.",
            }
        return {
            "ingest_job_id": job_id,
            "ingest_status": payload.get("status", "queued"),
        }
    except Exception as exc:
        return {
            "ingest_status": "failed",
            "ingest_error": str(exc),
        }
    finally:
        for file_obj in opened_files:
            file_obj.close()


def _create_document_ingest_notification(user_id, project_id, job_id, files):
    if job_id in NOTIFIED_INGEST_JOBS:
        return

    file_names = [str(name) for name in files if name]
    if not file_names:
        file_text = "내부문서"
    elif len(file_names) == 1:
        file_text = file_names[0]
    else:
        file_text = f"{file_names[0]} 외 {len(file_names) - 1}건"

    Notification.objects.create(
        user_id=user_id,
        notification_type="document_uploaded",
        content=f"{file_text} 적재가 완료되었습니다.",
        target_id=project_id,
        is_read=False,
    )
    NOTIFIED_INGEST_JOBS.add(job_id)


@api_view(["GET"])
def upload_config(request):
    return Response({
        "max_files": 10,
        "max_size_mb": 20,
        "allowed_formats": ["pdf", "docx", "txt"],
        "messages": {
            "entry": "최대 파일 10개만 업로드 가능합니다",
            "size_exceeded": "파일의 용량이 20MB를 초과했습니다.\n다시 한번 확인해주세요",
            "unsupported_format": "지원하지 않는 파일 형식입니다",
        },
    })


@api_view(["GET", "POST"])
def document_list(request, project_id):
    uploader = get_project_user_or_response(project_id, request.auth["user_id"])
    if isinstance(uploader, Response):
        return uploader

    if request.method == "GET":
        docs = (
            Document.objects.filter(project_id=project_id)
            .select_related("uploader__user", "uploader__user__dept")
            .order_by("-uploaded_at")
        )
        serializer = DocumentSerializer(docs, many=True, context={"request": request})
        return Response(serializer.data)

    files = request.FILES.getlist("files")
    if not files:
        return Response({"error": "파일이 없습니다."}, status=status.HTTP_400_BAD_REQUEST)
    if len(files) > 10:
        return Response({"error": "한 번에 최대 10개까지 업로드할 수 있습니다."}, status=status.HTTP_400_BAD_REQUEST)

    created = []
    errors = []
    created_docs = []

    use_s3 = bool(getattr(settings, "AWS_STORAGE_BUCKET_NAME", ""))

    for file in files:
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            errors.append({"file": file.name, "error": "허용되지 않는 파일 형식입니다."})
            continue
        if file.size > MAX_FILE_SIZE:
            errors.append({"file": file.name, "error": "파일 크기가 20MB를 초과합니다."})
            continue

        # S3에 저장
        s3_key = f"documents/{project_id}/{file.name}"
        saved_path = default_storage.save(s3_key, ContentFile(file.read()))

        doc = Document.objects.create(
            project_id=project_id,
            uploader=uploader,
            title=file.name,
            path=saved_path,
        )
        created_docs.append(doc)
        created.append(DocumentSerializer(doc, context={"request": request}).data)

    ingest_info = _start_parsed_ingest(project_id, created_docs) if created_docs else {}

    return Response(
        {"created": created, "errors": errors, **ingest_info},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
def document_ingest_status(request, project_id):
    project_user = get_project_user_or_response(project_id, request.auth["user_id"])
    if isinstance(project_user, Response):
        return project_user

    job_id = request.query_params.get("job_id")
    if not job_id:
        return Response({"error": "job_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    base_url = _parsed_base_url()
    if not base_url:
        return Response(
            {"error": "RUNPOD_PARSED_BASE_URL is not configured."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        response = requests.get(
            f"{base_url}/internal-docs/ingest/jobs/{job_id}",
            timeout=PARSED_STATUS_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:
        return Response(
            {"error": f"Parsed ingest status check failed: {str(exc)}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    job_status = str(payload.get("status", "")).lower()
    if job_status == "succeeded":
        _create_document_ingest_notification(
            request.auth["user_id"],
            project_id,
            job_id,
            payload.get("files") or [],
        )
        return Response(
            {
                "status": "completed",
                "job_id": job_id,
                "result": payload.get("result"),
            }
        )

    if job_status in {"failed", "error", "cancelled"}:
        return Response(
            {
                "status": "failed",
                "job_id": job_id,
                "error": payload.get("error") or f"Parsed ingest job failed: {job_status}",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "status": "processing",
            "job_id": job_id,
            "raw_status": payload.get("status"),
            "step": payload.get("step"),
        }
    )


@api_view(["DELETE"])
def document_delete(request, project_id, document_id):
    project_user = get_project_user_or_response(project_id, request.auth["user_id"])
    if isinstance(project_user, Response):
        return project_user

    try:
        doc = Document.objects.get(document_id=document_id, project_id=project_id)
    except Document.DoesNotExist:
        return Response({"error": "문서를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if doc.uploader_id != project_user.id:
        return Response({"error": "문서를 업로드한 사용자만 삭제할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)

    try :
        if default_storage.exists(doc.path):
            default_storage.delete(doc.path)
    except Exception :
        pass
    
    doc.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
