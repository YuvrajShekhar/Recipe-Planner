from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from ..serializers import UserSerializer, UserRegistrationSerializer


# ==================== API ROOT ====================

@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """API Root - Lists all available endpoints"""
    return Response({
        'message': 'Welcome to Recipe Planner API',
        'endpoints': {
            'auth': {
                'register': '/api/auth/register/',
                'login': '/api/auth/login/',
                'logout': '/api/auth/logout/',
                'profile': '/api/auth/profile/',
            },
            'ingredients': '/api/ingredients/',
            'recipes': '/api/recipes/',
            'pantry': '/api/pantry/',
            'favorites': '/api/favorites/',
            'match': '/api/recipes/match/',
        }
    })


# ==================== AUTHENTICATION APIs ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """
    Register a new user
    
    POST /api/auth/register/
    {
        "username": "john",
        "email": "john@example.com",
        "password": "securepass123",
        "password_confirm": "securepass123"
    }
    """
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        # Create auth token for the new user
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'message': 'User registered successfully',
            'user': UserSerializer(user).data,
            'token': token.key,
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'message': 'Registration failed',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    """
    Login user
    
    POST /api/auth/login/
    {
        "username": "john",
        "password": "securepass123"
    }
    """
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({
            'message': 'Please provide both username and password'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        # Create or retrieve the auth token
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data,
            'token': token.key,
        }, status=status.HTTP_200_OK)
    
    return Response({
        'message': 'Invalid username or password'
    }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """
    Logout user
    
    POST /api/auth/logout/
    """
    # Delete the user's token to invalidate it
    try:
        request.user.auth_token.delete()
    except Token.DoesNotExist:
        pass
    return Response({
        'message': 'Logout successful'
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    Get or update user profile
    
    GET /api/auth/profile/
    
    PUT /api/auth/profile/
    {
        "email": "newemail@example.com"
    }
    """
    user = request.user
    
    if request.method == 'GET':
        serializer = UserSerializer(user)
        return Response({
            'user': serializer.data
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'PUT':
        serializer = UserSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Profile updated successfully',
                'user': serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response({
            'message': 'Update failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)