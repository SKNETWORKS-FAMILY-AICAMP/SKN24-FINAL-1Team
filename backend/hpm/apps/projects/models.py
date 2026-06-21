from django.db import models
from apps.users.models import Users

class Project(models.Model):
    project_id = models.AutoField(primary_key=True, verbose_name="프로젝트 식별 번호")
    project_owner = models.ForeignKey(
        Users,
        on_delete=models.PROTECT,
        db_column="project_owner_id",
        related_name="owned_projects",
        verbose_name="프로젝트 생성자"
    )
    project_name = models.CharField(max_length=90, verbose_name="프로젝트 이름")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="프로젝트 생성 일시")
    context = models.CharField(max_length=300, null=True, blank=True, verbose_name="프로젝트 맥락 파악")
    jira_project_key = models.CharField(max_length=50, null=True, blank=True, verbose_name="Jira 프로젝트 키")

    class Meta:
        db_table = "project"


class ProjectUsers(models.Model):
    project_users_id = models.AutoField(primary_key=True, verbose_name="프로젝트 구성원 식별 번호")
    user = models.ForeignKey(Users, on_delete=models.CASCADE, db_column="user_id", verbose_name="프로젝트 참여자")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, db_column="project_id", verbose_name="어떤 프로젝트인지")

    class Meta:
        db_table = "project_users"
