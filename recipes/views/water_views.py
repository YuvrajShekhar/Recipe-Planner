from datetime import date as date_type
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ..models import WaterLog, UserProfile


def _water_goal_ml(user):
    """
    Recommended daily water in ml using weight-based formula.
    Base: weight_kg × 35 ml
    Age: <18 → ×1.1 | 18-55 → ×1.0 | >55 → ×0.90
    Gender: female → ×0.87
    Clamp to [1500, 4000], round to nearest 50 ml.
    Falls back to 2500 ml if profile is incomplete.
    """
    try:
        profile = user.profile
    except UserProfile.DoesNotExist:
        return 2500

    if not profile.weight_kg:
        return 2500

    base = float(profile.weight_kg) * 40.0

    if profile.age:
        if profile.age < 18:
            base *= 1.10
        elif profile.age > 55:
            base *= 0.90

    if profile.gender == 'female':
        base *= 0.87

    base = max(1500, min(4000, base))
    return int(round(base / 50) * 50)


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def water_log(request):
    """
    GET  /api/water/?date=YYYY-MM-DD  — return today's intake + daily goal
    POST /api/water/                  — body: { date, add_ml }  increment intake
                                        body: { date, amount_ml } set absolute value
    DELETE /api/water/?date=YYYY-MM-DD — reset water to 0 for that date
    """
    if request.method == 'GET':
        date_str = request.query_params.get('date', str(date_type.today()))
        try:
            log_date = date_type.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date'}, status=status.HTTP_400_BAD_REQUEST)

        log = WaterLog.objects.filter(user=request.user, date=log_date).first()
        goal = _water_goal_ml(request.user)

        return Response({
            'date': str(log_date),
            'amount_ml': log.amount_ml if log else 0,
            'goal_ml': goal,
            'completed': (log.amount_ml if log else 0) >= goal,
        })

    if request.method == 'POST':
        date_str = request.data.get('date', str(date_type.today()))
        try:
            log_date = date_type.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date'}, status=status.HTTP_400_BAD_REQUEST)

        add_ml = request.data.get('add_ml')
        amount_ml = request.data.get('amount_ml')

        if add_ml is not None:
            # Increment mode
            try:
                add_ml = int(add_ml)
                if add_ml < 0:
                    raise ValueError
            except (ValueError, TypeError):
                return Response({'error': 'add_ml must be a positive integer'}, status=status.HTTP_400_BAD_REQUEST)

            log, _ = WaterLog.objects.get_or_create(user=request.user, date=log_date)
            log.amount_ml = max(0, log.amount_ml + add_ml)
            log.save(update_fields=['amount_ml'])

        elif amount_ml is not None:
            # Absolute set mode
            try:
                amount_ml = int(amount_ml)
                if amount_ml < 0:
                    raise ValueError
            except (ValueError, TypeError):
                return Response({'error': 'amount_ml must be a non-negative integer'}, status=status.HTTP_400_BAD_REQUEST)

            log, _ = WaterLog.objects.update_or_create(
                user=request.user, date=log_date,
                defaults={'amount_ml': amount_ml},
            )
        else:
            return Response({'error': 'Provide add_ml or amount_ml'}, status=status.HTTP_400_BAD_REQUEST)

        goal = _water_goal_ml(request.user)
        return Response({
            'date': str(log_date),
            'amount_ml': log.amount_ml,
            'goal_ml': goal,
            'completed': log.amount_ml >= goal,
        })

    if request.method == 'DELETE':
        date_str = request.query_params.get('date', str(date_type.today()))
        try:
            log_date = date_type.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date'}, status=status.HTTP_400_BAD_REQUEST)

        WaterLog.objects.filter(user=request.user, date=log_date).delete()
        goal = _water_goal_ml(request.user)
        return Response({'date': str(log_date), 'amount_ml': 0, 'goal_ml': goal, 'completed': False})
