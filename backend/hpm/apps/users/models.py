from django.db import models


class Dept(models.Model):
    dept_id = models.AutoField(primary_key=True)
    dept_name = models.CharField(max_length=20)

    class Meta:
        verbose_name="부서"
        verbose_name_plural = "부서"
        db_table = "dept"


class Rank(models.Model):
    rank_id = models.AutoField(primary_key=True)
    rank_name = models.CharField(max_length=20)

    class Meta:
        verbose_name="직급"
        verbose_name_plural = "직급"
        db_table = "rank"


class Users(models.Model):
    users_id = models.AutoField(primary_key=True)
    dept = models.ForeignKey(Dept, on_delete=models.PROTECT, db_column="dept_id", verbose_name="부서")
    rank = models.ForeignKey(Rank, on_delete=models.PROTECT, db_column="rank_id", verbose_name="직급")

    emp_no = models.CharField(max_length=20, verbose_name="사번")
    email = models.EmailField(max_length=255, verbose_name="이메일")
    name = models.CharField(max_length=90, verbose_name="이름")
    work = models.CharField(max_length=150, verbose_name="담당 업무")

    password = models.CharField(max_length=255, default="abc123", verbose_name="비밀번호")
    account_status = models.IntegerField(default=0, verbose_name="계정 상태")
    status = models.IntegerField(default=0, verbose_name="사용자 상태")
    account_id = models.CharField(max_length=255, null=True, blank=True, db_column="account_Id", verbose_name="아이디")
    role = models.CharField(max_length=20, default="USER", verbose_name="관리자/사용자")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    jira_access_token = models.TextField(null=True, blank=True, verbose_name=" Jira API ")
    jira_refresh_token = models.TextField(null=True, blank=True, verbose_name="access_token 재발급 필요 여부")
    jira_token_expires_at = models.DateTimeField(null=True, blank=True, verbose_name="만료 여부")
    jira_cloud_id = models.CharField(max_length=255, null=True, blank=True, verbose_name="")

    class Meta:
        verbose_name="유저"
        verbose_name_plural = "유저"
        db_table = "users"

print("USER MODEL OK")