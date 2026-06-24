from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='jira_project_key',
            field=models.CharField(blank=True, max_length=50, null=True, verbose_name='Jira 프로젝트 키'),
        ),
    ]
