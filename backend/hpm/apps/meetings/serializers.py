from rest_framework import serializers
from .models import Meeting, MeetingAgendas, MeetingTask, MeetingUsers, Record, RecordUtterance


class MeetingSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    is_meeting = serializers.SerializerMethodField()

    class Meta:
        model = Meeting
        fields = "__all__"

    def get_status(self, obj):
        return {
            Meeting.MeetingStatus.SCHEDULED:   "scheduled",
            Meeting.MeetingStatus.IN_PROGRESS: "in_progress",
            Meeting.MeetingStatus.FINISHED:    "finished",
        }.get(obj.meeting_status, "scheduled")

    def get_is_meeting(self, obj):
        return obj.meeting_status == Meeting.MeetingStatus.IN_PROGRESS


class MeetingAgendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingAgendas
        fields = "__all__"


class MeetingTaskSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField()

    class Meta:
        model = MeetingTask
        fields = "__all__"

    def get_owner(self, obj):
        if obj.meeting_users and obj.meeting_users.user:
            return obj.meeting_users.user.name
        return ""


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

