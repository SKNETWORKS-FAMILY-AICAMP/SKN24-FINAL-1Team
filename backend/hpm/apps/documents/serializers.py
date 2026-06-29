import os

from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from .models import Document
from django.core.files.storage import default_storage

class DocumentSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="document_id", read_only=True)
    name = serializers.CharField(source="title", read_only=True)
    creator = serializers.SerializerMethodField()
    creatorRank = serializers.SerializerMethodField()
    uploaderId = serializers.SerializerMethodField()
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
            "creatorRank",
            "uploaderId",
            "department",
            "uploadedAt",
            "size",
            "fileUrl",
        ]

    def get_creator(self, obj):
        return getattr(obj.uploader.user, "name", "")

    def get_uploaderId(self, obj):
        return getattr(obj.uploader.user, "pk", None)

    def get_creatorRank(self, obj):
        rank = getattr(obj.uploader.user, "rank", None)
        return getattr(rank, "rank_name", "") if rank else ""

    def get_department(self, obj):
        dept = getattr(obj.uploader.user, "dept", None)
        return getattr(dept, "dept_name", "") if dept else ""

    def get_uploadedAt(self, obj):
        return timezone.localtime(obj.uploaded_at).date().isoformat()

    def get_size(self, obj):
        if not obj.path :
            return 0
        try : 
            return default_storage.size(obj.path)
        except Exception:
            return 0

    def get_fileUrl(self, obj):
        if not obj.path:
            return ""
        try:
            return default_storage.url(obj.path)  # S3 presigned URL (1시간 유효)
        except Exception:
            return ""
