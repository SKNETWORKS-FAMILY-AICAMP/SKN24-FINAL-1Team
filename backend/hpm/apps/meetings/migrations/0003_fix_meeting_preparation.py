from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('meetings', '0002_meeting_is_paused'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS meeting_preparation (
                preration_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                meeting_id INT NOT NULL,
                purpose LONGTEXT NULL,
                project_status LONGTEXT NULL,
                rule LONGTEXT NULL,
                effect LONGTEXT NULL,
                CONSTRAINT fk_meeting_prep
                    FOREIGN KEY (meeting_id) REFERENCES meeting(meeting_id) ON DELETE CASCADE
            );
            """,
            reverse_sql = "DROP TABLE IF EXISTS meeting_preparation;"

        )
    ]