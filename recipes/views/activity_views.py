from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, date
from django.db.models import Sum

from ..models import ActivityLog, MET_VALUES
from ..serializers import ActivityLogSerializer


def _calc_calories(profile, met, duration_minutes):
    """
    Calculate calories burned using Harris-Benedict BMR + MET formula.
    Returns (calories: float, missing_fields: list).
    """
    missing = []
    if not profile.weight_kg:
        missing.append('weight')
    if not profile.height_cm:
        missing.append('height')
    if not profile.age:
        missing.append('age')
    if not profile.gender:
        missing.append('gender')

    if missing:
        return None, missing

    bmr = profile.bmr()
    correction = bmr / 1440
    calories = round(met * correction * duration_minutes, 1)
    return calories, []


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def activity_log_list(request):
    """
    GET: Return all activity logs for a date (or all if no date given).
         Query params: date (YYYY-MM-DD)

    POST: Log a new activity — calories are calculated server-side.
          Body: { date, activity_type, duration_minutes, notes? }
    """
    if request.method == 'GET':
        date_param = request.query_params.get('date')
        logs = ActivityLog.objects.filter(user=request.user)

        if date_param:
            try:
                filter_date = datetime.strptime(date_param, '%Y-%m-%d').date()
                logs = logs.filter(date=filter_date)
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = ActivityLogSerializer(logs, many=True)
        return Response(serializer.data)

    # ── POST ──
    activity_type    = request.data.get('activity_type', '').strip()
    duration_str     = request.data.get('duration_minutes')
    date_str         = request.data.get('date')
    notes            = request.data.get('notes', '')

    if not activity_type or activity_type not in MET_VALUES:
        return Response(
            {'error': f'Invalid activity_type. Choose from: {", ".join(MET_VALUES)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not date_str:
        return Response({'error': 'date is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        log_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

    if log_date > date.today():
        return Response({'error': 'Cannot log activities for future dates'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        duration = int(duration_str)
        if duration <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return Response({'error': 'duration_minutes must be a positive integer'}, status=status.HTTP_400_BAD_REQUEST)

    # Get user profile for calorie calculation
    try:
        profile = request.user.profile
    except Exception:
        return Response(
            {
                'error': 'Profile incomplete',
                'missing_fields': ['age', 'height', 'weight', 'gender'],
                'detail': 'Please update your body metrics in the Profile page to log activities.',
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    calories, missing = _calc_calories(profile, MET_VALUES[activity_type], duration)

    if missing:
        return Response(
            {
                'error': 'Profile incomplete',
                'missing_fields': missing,
                'detail': f'Please update your {", ".join(missing)} in the Profile page to calculate calories.',
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    log = ActivityLog.objects.create(
        user=request.user,
        date=log_date,
        activity_type=activity_type,
        duration_minutes=duration,
        calories_burned=calories,
        notes=notes,
    )

    return Response(ActivityLogSerializer(log).data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def activity_log_detail(request, pk):
    """DELETE a specific activity log entry."""
    try:
        log = ActivityLog.objects.get(pk=pk, user=request.user)
    except ActivityLog.DoesNotExist:
        return Response({'error': 'Activity log not found'}, status=status.HTTP_404_NOT_FOUND)

    log.delete()
    return Response({'message': 'Activity deleted'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity_daily_summary(request):
    """
    GET: Total calories burned from activities for a date.
    Query params: date (YYYY-MM-DD)
    Returns: { date, total_calories_burned, activities: [...] }
    """
    date_param = request.query_params.get('date')

    if date_param:
        try:
            query_date = datetime.strptime(date_param, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        query_date = date.today()

    logs = ActivityLog.objects.filter(user=request.user, date=query_date)
    total = logs.aggregate(total=Sum('calories_burned'))['total'] or 0

    return Response({
        'date': query_date.isoformat(),
        'total_calories_burned': float(total),
        'activities': ActivityLogSerializer(logs, many=True).data,
    })
