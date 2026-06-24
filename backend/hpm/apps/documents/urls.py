from django.urls import path
from . import views

urlpatterns = [
    path("upload-config/", views.upload_config),
    path("<int:project_id>/", views.document_list),
    path("<int:project_id>/ingest/status/", views.document_ingest_status),
    path("<int:project_id>/<int:document_id>/", views.document_delete),
]
