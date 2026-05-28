from datetime import date as date_type
from calendar import monthrange
from django.db.models import Sum
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ..models import DailyNutritionLog, FitnessLog, ActivityLog, WaterLog


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_analytics(request):
    """
    GET /api/analytics/monthly/?month=M&year=Y

    Returns one entry per calendar day with all tracked metrics merged.
    Only days that have at least one data point are included.
    """
    try:
        month = int(request.query_params.get('month', date_type.today().month))
        year  = int(request.query_params.get('year',  date_type.today().year))
        if not (1 <= month <= 12):
            raise ValueError
    except (ValueError, TypeError):
        return Response({'error': 'Invalid month or year'}, status=status.HTTP_400_BAD_REQUEST)

    _, days_in_month = monthrange(year, month)

    # ── Nutrition: aggregate per day ─────────────────────────────────────────
    nutrition_qs = (
        DailyNutritionLog.objects
        .filter(user=request.user, date__year=year, date__month=month)
        .values('date')
        .annotate(
            calories_in  = Sum('calories'),
            protein      = Sum('protein'),
            carbs        = Sum('carbs'),
            fat          = Sum('fat'),
            fiber        = Sum('fiber'),
        )
    )
    nutrition_map = {row['date'].isoformat(): row for row in nutrition_qs}

    # ── Fitness: steps + weight per day ──────────────────────────────────────
    fitness_qs = FitnessLog.objects.filter(
        user=request.user, date__year=year, date__month=month
    )
    fitness_map = {
        log.date.isoformat(): {
            'steps':     log.steps or 0,
            'weight_kg': float(log.weight_kg) if log.weight_kg is not None else None,
        }
        for log in fitness_qs
    }

    # ── Activity: total calories burned per day ───────────────────────────────
    activity_qs = (
        ActivityLog.objects
        .filter(user=request.user, date__year=year, date__month=month)
        .values('date')
        .annotate(calories_burned=Sum('calories_burned'))
    )
    activity_map = {row['date'].isoformat(): float(row['calories_burned'] or 0) for row in activity_qs}

    # ── Water: total ml per day ───────────────────────────────────────────────
    water_qs = WaterLog.objects.filter(
        user=request.user, date__year=year, date__month=month
    )
    water_map = {log.date.isoformat(): log.amount_ml for log in water_qs}

    # ── Merge into per-day array ──────────────────────────────────────────────
    days = []
    for d in range(1, days_in_month + 1):
        date_str = f"{year}-{month:02d}-{d:02d}"

        n = nutrition_map.get(date_str, {})
        f = fitness_map.get(date_str, {})
        burned = activity_map.get(date_str, None)
        water  = water_map.get(date_str, None)

        calories_in = round(float(n['calories_in']), 1) if n.get('calories_in') is not None else None
        # Calorie balance: positive = surplus, negative = deficit
        calorie_balance = None
        if calories_in is not None and burned is not None:
            calorie_balance = round(calories_in - burned, 1)
        elif calories_in is not None:
            calorie_balance = calories_in  # no activity logged

        day_data = {
            'date':             date_str,
            'day':              d,
            'calories_in':      calories_in,
            'calories_burned':  round(burned, 1) if burned is not None else None,
            'calorie_balance':  calorie_balance,
            'water_ml':         water,
            'weight_kg':        f.get('weight_kg'),
            'steps':            f.get('steps'),
            'protein':          round(float(n['protein']), 1) if n.get('protein') is not None else None,
            'carbs':            round(float(n['carbs']), 1)   if n.get('carbs')   is not None else None,
            'fat':              round(float(n['fat']), 1)     if n.get('fat')     is not None else None,
            'fiber':            round(float(n['fiber']), 1)   if n.get('fiber')   is not None else None,
        }
        days.append(day_data)

    return Response({
        'month': month,
        'year':  year,
        'days':  days,
    })
