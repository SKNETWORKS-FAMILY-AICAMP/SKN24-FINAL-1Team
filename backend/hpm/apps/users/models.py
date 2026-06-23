from django.db import models
from django.conf import settings

class Dept(models.Model):
    dept_id = models.AutoField(primary_key=True, verbose_name="부서 식별 번호")
    dept_name = models.CharField(max_length=20, verbose_name="부서명")

    class Meta:
        verbose_name="부서"
        verbose_name_plural = "부서"
        db_table = "dept"


class Rank(models.Model):
    rank_id = models.AutoField(primary_key=True, verbose_name="직급 식별 번호")
    rank_name = models.CharField(max_length=20, verbose_name="직급명")

    class Meta:
        verbose_name = "직급"
        verbose_name_plural = "직급"
        db_table = "rank"


class Users(models.Model):
    users_id = models.AutoField(primary_key=True, verbose_name="유저 식별 번호")
    dept = models.ForeignKey(Dept, on_delete=models.PROTECT, db_column="dept_id", verbose_name="부서")
    rank = models.ForeignKey(Rank, on_delete=models.PROTECT, db_column="rank_id", verbose_name="직급")

    emp_no = models.CharField(max_length=20, verbose_name="사번")
    email = models.EmailField(max_length=255, verbose_name="이메일")
    name = models.CharField(max_length=90, verbose_name="이름")
    work = models.CharField(max_length=150, verbose_name="담당 업무")

    password = models.CharField(max_length=255, default=settings.DEFAULT_USER_PASSWORD, verbose_name="비밀번호")
    account_status = models.IntegerField(default=0, verbose_name="계정 상태")
    status = models.IntegerField(default=0, verbose_name="사용자 상태")
    role = models.CharField(max_length=20, default="USER", verbose_name="관리자/사용자")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="계정 생성 일시")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="계정 수정 일시")

    jira_account_id = models.CharField(max_length=255, null=True, blank=True, db_column="jira_account_Id", verbose_name="아이디")
    jira_access_token = models.TextField(null=True, blank=True, verbose_name="Jira 액세스 토큰")
    jira_refresh_token = models.TextField(null=True, blank=True, verbose_name="Jira 리프레시 토큰")
    jira_token_expires_at = models.DateTimeField(null=True, blank=True, verbose_name="Jira 토큰 만료 일시")
    jira_cloud_id = models.CharField(max_length=255, null=True, blank=True, verbose_name="Jira 클라우드 ID")
    jira_project_key = models.CharField(max_length=50, null=True, blank=True, verbose_name="Jira 프로젝트 키")

    @property
    def is_authenticated(self):
        return True


    class Meta:
        verbose_name="유저"
        verbose_name_plural = "유저"
        db_table = "users"

