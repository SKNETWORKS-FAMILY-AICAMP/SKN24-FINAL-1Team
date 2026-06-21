import os

from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="document_id", read_only=True)
    name = serializers.CharField(source="title", read_only=True)
    creator = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    uploadedAt = serializers.SerializerMethodField()
    size = serializers.SerializerMethodField()
    fileUrl = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "document_id",
            "name",
            "creator",
            "department",
            "uploadedAt",
            "size",
            "fileUrl",
        ]

    def get_creator(self, obj):
        return getattr(obj.uploader.user, "name", "")

    def get_department(self, obj):
        dept = getattr(obj.uploader.user, "dept", None)
        return getattr(dept, "dept_name", "") if dept else ""

    def get_uploadedAt(self, obj):
        return timezone.localtime(obj.uploaded_at).date().isoformat()

    def get_size(self, obj):
        if obj.path and os.path.exists(obj.path):
            return os.path.getsize(obj.path)
        return 0

    def get_fileUrl(self, obj):
        if not obj.path:
            return ""

        try:
            relative_path = os.path.relpath(obj.path, settings.MEDIA_ROOT)
        except ValueError:
            return ""

        media_path = f"{settings.MEDIA_URL}{relative_path.replace(os.sep, '/')}"
        request = self.context.get("request")
        return request.build_absolute_uri(media_path) if request else media_path
