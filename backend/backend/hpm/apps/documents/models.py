from django.db import models
from apps.projects.models import Project, ProjectUsers

class Document(models.Model):
    document_id = models.AutoField(primary_key=True, verbose_name="문서 식별 번호")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, db_column="project_id", verbose_name="프로젝트")
    uploader = models.ForeignKey(
        ProjectUsers,
        on_delete=models.PROTECT,
        db_column="uploader_id",
        verbose_name="문서 등록자"
    )

    title = models.CharField(max_length=255, verbose_name="문서명")
    path = models.CharField(max_length=500, verbose_name="문서 경로")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="업로드 일시")

    class Meta:
        db_table = "document"