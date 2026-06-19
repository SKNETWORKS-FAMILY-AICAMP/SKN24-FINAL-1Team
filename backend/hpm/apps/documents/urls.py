from django.urls import path
from . import views

urlpatterns = [
    path("<int:project_id>/", views.document_list),
    path("<int:project_id>/<int:document_id>/", views.document_delete),
]
