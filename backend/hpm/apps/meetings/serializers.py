from rest_framework import serializers
from .models import Meeting, MeetingAgendas, MeetingTask, MeetingUsers, Record, RecordUtterance


class MeetingSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    minutes_status = serializers.SerializerMethodField()
    is_meeting = serializers.SerializerMethodField()

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
    class Meta:
        model = MeetingPreparation
        fields = "__all__"

