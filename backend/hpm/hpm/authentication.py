from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from apps.users.models import Users

class CustomJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        try:
            user_id = validated_token['user_id']
        except KeyError:
            raise InvalidToken('Token에 user_id가 없습니다.')
        
        try:
            user = Users.objects.get(users_id = user_id)
        except Users.DoesNotExist:
            raise AuthenticationFailed('사용자를 찾을 수 없습니다')
        
        return user