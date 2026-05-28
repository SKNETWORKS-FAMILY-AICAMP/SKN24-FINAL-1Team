import os
import requests
from datetime import datetime
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Users
from .serializers import UserSerializer


@api_view(["GET"])
def user_detail(request, users_id):
    user = Users.objects.get(users_id=users_id)
    serializer = UserSerializer(user)
    return Response(serializer.data)