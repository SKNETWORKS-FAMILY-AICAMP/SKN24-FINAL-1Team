from rest_framework import serializers
from .models import Project, ProjectUsers

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = "__all__"

class ProjectUsersSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectUsers
        fields = "__all__"
