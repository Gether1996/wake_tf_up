from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken


class DemoLoginView(APIView):
    """
    Temporary demo login - only for superusers.
    This allows access to the production site only for admin users.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Authenticate user
        user = authenticate(request, username=email, password=password)
        
        if user is None:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if user is superuser
        if not user.is_superuser:
            return Response(
                {'error': 'Access denied. Only administrators allowed.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_superuser': user.is_superuser
            },
            'demo_access': True
        }, status=status.HTTP_200_OK)


class DemoCheckView(APIView):
    """
    Check if current user has demo access (is superuser).
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        return Response({
            'has_access': request.user.is_superuser,
            'user': {
                'id': request.user.id,
                'email': request.user.email,
                'is_superuser': request.user.is_superuser
            }
        }, status=status.HTTP_200_OK)
