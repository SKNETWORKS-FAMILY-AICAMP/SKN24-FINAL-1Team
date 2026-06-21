from rest_framework import serializers
from .models import Meeting, MeetingAgendas, MeetingTask, MeetingUsers, Record, RecordUtterance


class MeetingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meeting
        fields = "__all__"


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