from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum
from datetime import datetime, date
from decimal import Decimal

from ..models import DailyNutritionLog
from ..serializers import DailyNutritionLogSerializer, DailyNutritionSummarySerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def nutrition_log_list(request):
    """
    GET: List all nutrition logs for the authenticated user (optionally filtered by date)
    POST: Create a new nutrition log entry
    """
    if request.method == 'GET':
        # Get query parameters
        date_param = request.query_params.get('date', None)
        month_param = request.query_params.get('month', None)
        year_param = request.query_params.get('year', None)

        # Base queryset
        logs = DailyNutritionLog.objects.filter(user=request.user)

        # Filter by specific date
        if date_param:
            try:
                filter_date = datetime.strptime(date_param, '%Y-%m-%d').date()
                logs = logs.filter(date=filter_date)
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Filter by month and year
        elif month_param and year_param:
            try:
                logs = logs.filter(date__month=int(month_param), date__year=int(year_param))
            except ValueError:
                return Response(
                    {'error': 'Invalid month or year'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = DailyNutritionLogSerializer(logs, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = DailyNutritionLogSerializer(data=request.data)
        if serializer.is_valid():
            # Validate that date is not in the future
            log_date = serializer.validated_data.get('date')
            if log_date > date.today():
                return Response(
                    {'error': 'Cannot log food for future dates'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def nutrition_log_detail(request, pk):
    """
    GET: Retrieve a specific nutrition log entry
    PUT: Update a nutrition log entry
    DELETE: Delete a nutrition log entry
    """
    try:
        log = DailyNutritionLog.objects.get(pk=pk, user=request.user)
    except DailyNutritionLog.DoesNotExist:
        return Response(
            {'error': 'Nutrition log not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        serializer = DailyNutritionLogSerializer(log)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = DailyNutritionLogSerializer(log, data=request.data, partial=True)
        if serializer.is_valid():
            # Validate that date is not in the future
            log_date = serializer.validated_data.get('date', log.date)
            if log_date > date.today():
                return Response(
                    {'error': 'Cannot log food for future dates'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        log.delete()
        return Response(
            {'message': 'Nutrition log deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nutrition_daily_summary(request):
    """
    GET: Get aggregated nutrition summary for a specific date
    Query params: date (YYYY-MM-DD format, defaults to today)
    """
    date_param = request.query_params.get('date', None)

    if date_param:
        try:
            summary_date = datetime.strptime(date_param, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        summary_date = date.today()

    # Get all logs for this date
    logs = DailyNutritionLog.objects.filter(user=request.user, date=summary_date)

    # Calculate aggregates
    aggregates = logs.aggregate(
        total_calories=Sum('calories'),
        total_protein=Sum('protein'),
        total_carbs=Sum('carbs'),
        total_fat=Sum('fat'),
        total_fiber=Sum('fiber')
    )

    # Handle None values (when no entries exist)
    for key in aggregates:
        if aggregates[key] is None:
            aggregates[key] = Decimal('0.00')

    # Build response
    summary_data = {
        'date': summary_date,
        'total_calories': aggregates['total_calories'],
        'total_protein': aggregates['total_protein'],
        'total_carbs': aggregates['total_carbs'],
        'total_fat': aggregates['total_fat'],
        'total_fiber': aggregates['total_fiber'],
        'entry_count': logs.count(),
        'entries': DailyNutritionLogSerializer(logs, many=True).data
    }

    serializer = DailyNutritionSummarySerializer(summary_data)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nutrition_monthly_summary(request):
    """
    GET: Get aggregated nutrition summary for each day in a month
    Query params: month (1-12), year (YYYY)
    """
    month_param = request.query_params.get('month', None)
    year_param = request.query_params.get('year', None)

    if not month_param or not year_param:
        return Response(
            {'error': 'Both month and year parameters are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        month = int(month_param)
        year = int(year_param)

        if month < 1 or month > 12:
            raise ValueError("Month must be between 1 and 12")

    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get all logs for this month
    logs = DailyNutritionLog.objects.filter(
        user=request.user,
        date__month=month,
        date__year=year
    )

    # Group by date and calculate daily totals
    daily_summaries = {}
    for log in logs:
        log_date = log.date.isoformat()
        if log_date not in daily_summaries:
            daily_summaries[log_date] = {
                'date': log.date,
                'total_calories': Decimal('0.00'),
                'total_protein': Decimal('0.00'),
                'total_carbs': Decimal('0.00'),
                'total_fat': Decimal('0.00'),
                'total_fiber': Decimal('0.00'),
                'entry_count': 0,
                'entries': []
            }

        daily_summaries[log_date]['total_calories'] += log.calories
        daily_summaries[log_date]['total_protein'] += log.protein
        daily_summaries[log_date]['total_carbs'] += log.carbs
        daily_summaries[log_date]['total_fat'] += log.fat
        daily_summaries[log_date]['total_fiber'] += log.fiber
        daily_summaries[log_date]['entry_count'] += 1
        daily_summaries[log_date]['entries'].append(log)

    # Sort by date
    sorted_summaries = sorted(daily_summaries.values(), key=lambda x: x['date'])

    serializer = DailyNutritionSummarySerializer(sorted_summaries, many=True)
    return Response({
        'month': month,
        'year': year,
        'daily_summaries': serializer.data
    })
