from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from django.middleware.csrf import CsrfViewMiddleware
from .models import Users


class CSRFCheck(CsrfViewMiddleware):
    def _reject(self, request, reason):
        return reason


class CustomJWTAuthentication(JWTAuthentication):
    def enforce_csrf(self, request):
        check = CSRFCheck(lambda req: None)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise PermissionDenied(f"CSRF Failed: {reason}")

    def authenticate(self, request):
        raw_token = request.COOKIES.get("access")

        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            if request.method not in ("GET", "HEAD", "OPTIONS", "TRACE"):
                self.enforce_csrf(request)
            return self.get_user(validated_token), validated_token
        except PermissionDenied:
            raise
        except Exception:
            return None

    def get_user(self, validated_token):
        try:
            user_id = validated_token["user_id"]
        except KeyError:
            raise InvalidToken("Token에 user_id가 없습니다.")

        try:
            user = Users.objects.get(users_id=user_id)
        except Users.DoesNotExist:
            raise AuthenticationFailed("사용자를 찾을 수 없습니다.")

        return user
