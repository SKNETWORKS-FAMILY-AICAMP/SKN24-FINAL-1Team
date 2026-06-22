import os

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.projects.models import ProjectUsers
from .models import Document
from .serializers import DocumentSerializer

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_SIZE = 20 * 1024 * 1024


def get_project_user_or_response(project_id, user_id):
    try:
        return ProjectUsers.objects.select_related("user", "user__dept").get(
            project_id=project_id,
            user_id=user_id,
        )
    except ProjectUsers.DoesNotExist:
        return Response({"error": "프로젝트 구성원이 아닙니다."}, status=status.HTTP_403_FORBIDDEN)


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
        created.append(DocumentSerializer(doc, context={"request": request}).data)

    return Response({"created": created, "errors": errors}, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
def document_delete(request, project_id, document_id):
    project_user = get_project_user_or_response(project_id, request.auth["user_id"])
    if isinstance(project_user, Response):
        return project_user

    try:
        doc = Document.objects.get(document_id=document_id, project_id=project_id)
    except Document.DoesNotExist:
        return Response({"error": "문서를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

    if os.path.exists(doc.path):
        os.remove(doc.path)
    doc.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
