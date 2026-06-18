import os
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.projects.models import ProjectUsers
from .models import Document
from .serializers import DocumentSerializer

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


@api_view(["GET", "POST"])
def document_list(request, project_id):
    if request.method == "GET":
        docs = Document.objects.filter(project_id=project_id).order_by("-uploaded_at")
        return Response(DocumentSerializer(docs, many=True).data)

    # POST - 파일 업로드 (최대 10개)
    files = request.FILES.getlist("files")
    if not files:
        return Response({"error": "파일이 없습니다."}, status=status.HTTP_400_BAD_REQUEST)
    if len(files) > 10:
        return Response({"error": "한 번에 최대 10개까지 업로드 가능합니다."}, status=status.HTTP_400_BAD_REQUEST)

    uploader_id = request.data.get("uploader_id")
    try:
        uploader = ProjectUsers.objects.get(project_id=project_id, user_id=uploader_id)
    except ProjectUsers.DoesNotExist:
        return Response({"error": "프로젝트 구성원이 아닙니다."}, status=status.HTTP_403_FORBIDDEN)

    created = []
    errors = []

    for file in files:
        ext = os.path.splitext(file.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            errors.append({"file": file.name, "error": "허용되지 않는 파일 형식입니다."})
            continue
        if file.size > MAX_FILE_SIZE:
            errors.append({"file": file.name, "error": "파일 크기가 20MB를 초과합니다."})
            continue

        save_dir = os.path.join(settings.MEDIA_ROOT, "documents", str(project_id))
        os.makedirs(save_dir, exist_ok=True)
        file_path = os.path.join(save_dir, file.name)

        # 중복 파일명 처리
        base, extension = os.path.splitext(file.name)
        counter = 1
        while os.path.exists(file_path):
            file_path = os.path.join(save_dir, f"{base}({counter}){extension}")
            counter += 1

        with open(file_path, "wb+") as f:
            for chunk in file.chunks():
                f.write(chunk)

        doc = Document.objects.create(
            project_id=project_id,
            uploader=uploader,
            title=os.path.basename(file_path),
            path=file_path,
        )
        created.append(DocumentSerializer(doc).data)

    return Response({"created": created, "errors": errors}, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
def document_delete(request, project_id, document_id):
    try:
        doc = Document.objects.get(document_id=document_id, project_id=project_id)
    except Document.DoesNotExist:
        return Response({"error": "문서를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    # 파일 실제 삭제
    if os.path.exists(doc.path):
        os.remove(doc.path)
    doc.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
