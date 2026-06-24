from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('meetings', '0003_fix_meeting_preparation'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TABLE IF NOT EXISTS record_utterance (
                utterance_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                record_id INT NOT NULL,
                meeting_users_id INT NULL,
                speaker VARCHAR(20) NOT NULL,
                time VARCHAR(30) NOT NULL,
                content LONGTEXT NOT NULL,
                CONSTRAINT fk_utterance_record
                    FOREIGN KEY (record_id) REFERENCES record(record_id) ON DELETE CASCADE,
                CONSTRAINT fk_utterance_meeting_users
                    FOREIGN KEY (meeting_users_id) REFERENCES meeting_users(meeting_users_id) ON DELETE SET NULL
            );
            """,
            reverse_sql="DROP TABLE IF EXISTS record_utterance;"
        ),
    ]