from rest_framework import serializers
from .models import Meeting, MeetingAgendas, MeetingTask, MeetingUsers, Record, RecordUtterance


class MeetingSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    minutes_status = serializers.SerializerMethodField()
    is_meeting = serializers.SerializerMethodField()
    elapsed_seconds = serializers.SerializerMethodField()
    creator_name = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = "__all__"

    def get_status(self, obj):
        return {
            Meeting.MeetingStatus.SCHEDULED: "scheduled",
            Meeting.MeetingStatus.IN_PROGRESS: "in_progress",
            Meeting.MeetingStatus.FINISHED: "finished",
        }.get(obj.meeting_status, "scheduled")

    def get_minutes_status(self, obj):
        if obj.is_meeting_approve:
            return "approved"
        if obj.meeting_document:
            return "draft"
        return None

    def get_is_meeting(self, obj):
        return obj.meeting_status == Meeting.MeetingStatus.IN_PROGRESS

    def get_elapsed_seconds(self, obj):
        from django.utils import timezone
        if obj.meeting_status == Meeting.MeetingStatus.IN_PROGRESS and not obj.is_paused and obj.meeting_at:
            delta = timezone.now() - obj.meeting_at
            try:
                curr_sec = int(obj.during_time or "0")
            except ValueError:
                curr_sec = 0
            return curr_sec + int(delta.total_seconds())
        try:
            return int(obj.during_time or "0")
        except ValueError:
            return 0

    def get_creator_name(self, obj):
        return obj.creator.name if obj.creator else None

    def get_participants(self, obj):
        from .models import MeetingUsers
        mus = MeetingUsers.objects.filter(meeting=obj).select_related("user")
        return [{"user_id": mu.user.users_id, "name": mu.user.name} for mu in mus]


class MeetingAgendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingAgendas
        fields = "__all__"


class MeetingTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingTask
        fields = "__all__"


class MeetingUsersSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingUsers
        fields = "__all__"


class RecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = Record
        fields = "__all__"

class RecordUtteranceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecordUtterance
        fields = "__all__"


from .models import MeetingPreparation

class MeetingPreparationSerializer(serializers.ModelSerializer):
    sources = serializers.SerializerMethodField()

    class Meta:
        model = MeetingPreparation
        fields = "__all__"

    def get_sources(self, obj):
        from apps.documents.models import Document
        from apps.meetings.models import PreparationDocument
        from django.conf import settings
        import os
        prep_docs = PreparationDocument.objects.filter(preparation=obj)
        doc_ids = [pd.document_id for pd in prep_docs]
        docs = Document.objects.filter(document_id__in=doc_ids)
        
        sources_list = []
        for doc in docs:
            file_url = ""
            if doc.path:
                normalized_path = doc.path.replace('\\', '/')
                if 'media/' in normalized_path:
                    relative_path = normalized_path.split('media/', 1)[1]
                else:
                    try:
                        relative_path = os.path.relpath(doc.path, settings.MEDIA_ROOT)
                    except ValueError:
                        relative_path = os.path.basename(doc.path)
                
                media_path = f"{settings.MEDIA_URL}{relative_path.replace(os.sep, '/')}"
                if media_path.startswith('//'):
                    media_path = media_path[1:]
                
                request = self.context.get("request")
                file_url = request.build_absolute_uri(media_path) if request else media_path
                
            sources_list.append({
                "document_id": doc.document_id,
                "title": doc.title,
                "file_url": file_url
            })
        return sources_list

