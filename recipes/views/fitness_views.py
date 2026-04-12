from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime, date, timezone as dt_tz
import base64
import json

import requests as http_requests

from ..models import FitnessLog, FitbitCredentials
from ..serializers import FitnessLogSerializer

# Fitbit OAuth 2.0 credentials
FITBIT_CLIENT_ID     = '23VD8D'
FITBIT_CLIENT_SECRET = '52f20fdaaff852df3839f4f0500ac969'
FITBIT_API_BASE      = 'https://api.fitbit.com'


# ── Fitbit token helper ───────────────────────────────────────────────────────

def _refresh_fitbit_token(creds):
    """
    Refresh the Fitbit access token using the stored refresh token.
    Uses Basic auth with client_id:client_secret (confidential-client flow).
    Returns True on success and persists updated tokens to DB.
    Returns False on any failure (caller should fall back gracefully).
    """
    import logging
    logger = logging.getLogger(__name__)

    # Fitbit confidential-client: Basic base64(client_id:client_secret)
    auth_header = base64.b64encode(
        f'{FITBIT_CLIENT_ID}:{FITBIT_CLIENT_SECRET}'.encode()
    ).decode()

    try:
        resp = http_requests.post(
            f'{FITBIT_API_BASE}/oauth2/token',
            headers={
                'Authorization': f'Basic {auth_header}',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data={
                'grant_type':    'refresh_token',
                'refresh_token': creds.refresh_token,
                'client_id':     FITBIT_CLIENT_ID,
            },
            timeout=10,
        )

        if resp.status_code == 200:
            from django.utils import timezone as dj_tz
            from datetime import timedelta
            data = resp.json()
            creds.access_token  = data['access_token']
            # Fitbit rotates the refresh token — always save the new one
            creds.refresh_token = data.get('refresh_token', creds.refresh_token)
            expires_in          = data.get('expires_in', 28800)
            creds.expires_at    = dj_tz.now() + timedelta(seconds=expires_in)
            creds.save()
            logger.info('Fitbit token refreshed for user %s', creds.user_id)
            return True

        # Log the Fitbit error response to help with debugging
        logger.warning(
            'Fitbit token refresh failed: status=%s body=%s',
            resp.status_code, resp.text[:300],
        )

    except Exception as exc:
        logger.exception('Fitbit token refresh exception: %s', exc)

    return False


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fitness_log_list(request):
    """
    GET: List fitness logs for the authenticated user (optionally filtered).
    POST: Create or update the fitness log for the given date (upsert).

    GET params: date (YYYY-MM-DD) | month + year
    POST body:  { date, steps, notes }
    """
    if request.method == 'GET':
        date_param = request.query_params.get('date', None)
        month_param = request.query_params.get('month', None)
        year_param = request.query_params.get('year', None)

        logs = FitnessLog.objects.filter(user=request.user)

        if date_param:
            try:
                filter_date = datetime.strptime(date_param, '%Y-%m-%d').date()
                logs = logs.filter(date=filter_date)
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        elif month_param and year_param:
            try:
                logs = logs.filter(date__month=int(month_param), date__year=int(year_param))
            except ValueError:
                return Response(
                    {'error': 'Invalid month or year'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = FitnessLogSerializer(logs, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        date_str = request.data.get('date')
        steps = request.data.get('steps', 0)
        notes = request.data.get('notes', '')
        weight_kg_raw = request.data.get('weight_kg', None)

        if not date_str:
            return Response({'error': 'date is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            log_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

        if log_date > date.today():
            return Response({'error': 'Cannot log fitness for future dates'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            steps = int(steps)
            if steps < 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({'error': 'steps must be a non-negative integer'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate weight_kg if provided
        weight_kg = None
        if weight_kg_raw not in (None, ''):
            try:
                weight_kg = float(weight_kg_raw)
                if weight_kg <= 0 or weight_kg > 500:
                    raise ValueError
            except (ValueError, TypeError):
                return Response({'error': 'weight_kg must be a positive number'}, status=status.HTTP_400_BAD_REQUEST)

        # Upsert: update if exists, create if not
        log, created = FitnessLog.objects.update_or_create(
            user=request.user,
            date=log_date,
            defaults={'steps': steps, 'notes': notes, 'weight_kg': weight_kg}
        )

        serializer = FitnessLogSerializer(log)
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=response_status)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def fitness_log_detail(request, pk):
    """
    GET/PUT/DELETE a specific fitness log entry.
    """
    try:
        log = FitnessLog.objects.get(pk=pk, user=request.user)
    except FitnessLog.DoesNotExist:
        return Response({'error': 'Fitness log not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(FitnessLogSerializer(log).data)

    elif request.method == 'PUT':
        serializer = FitnessLogSerializer(log, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        log.delete()
        return Response({'message': 'Fitness log deleted'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fitness_daily(request):
    """
    GET: Return the fitness log for a specific date (defaults to today).
    Returns { steps: 0, date, id: null } if no entry exists yet.

    Query params: date (YYYY-MM-DD)
    """
    date_param = request.query_params.get('date', None)

    if date_param:
        try:
            query_date = datetime.strptime(date_param, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        query_date = date.today()

    log = FitnessLog.objects.filter(user=request.user, date=query_date).first()

    if log:
        return Response(FitnessLogSerializer(log).data)

    # No entry yet for this date — return a zero-state
    return Response({
        'id': None,
        'date': query_date.isoformat(),
        'steps': 0,
        'notes': '',
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fitness_monthly_summary(request):
    """
    GET: Return all fitness logs for a given month.
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
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    logs = FitnessLog.objects.filter(
        user=request.user,
        date__month=month,
        date__year=year
    ).order_by('date')

    serializer = FitnessLogSerializer(logs, many=True)
    return Response({
        'month': month,
        'year': year,
        'logs': serializer.data,
    })


# ── Fitbit OAuth setup ────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def setup_fitbit(request):
    """
    POST: Store the user's Fitbit OAuth tokens.
    Body: { access_token, refresh_token }
    The expiry is decoded from the JWT aud/exp claim if present,
    otherwise defaults to 8 hours from now.
    """
    access_token  = request.data.get('access_token', '').strip()
    refresh_token = request.data.get('refresh_token', '').strip()

    if not access_token or not refresh_token:
        return Response(
            {'error': 'access_token and refresh_token are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from django.utils import timezone as dj_tz
    from datetime import timedelta

    # Try to extract expiry from JWT payload (exp claim), best-effort
    expires_at = None
    try:
        payload_b64 = access_token.split('.')[1]
        # Add padding
        payload_b64 += '=' * (4 - len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        exp = payload.get('exp')
        if exp:
            expires_at = datetime.fromtimestamp(exp, tz=dt_tz.utc)
    except Exception:
        pass

    if expires_at is None:
        expires_at = dj_tz.now() + timedelta(hours=8)

    FitbitCredentials.objects.update_or_create(
        user=request.user,
        defaults={
            'access_token':  access_token,
            'refresh_token': refresh_token,
            'expires_at':    expires_at,
        },
    )

    return Response({'message': 'Fitbit credentials saved successfully'})


# ── Fitbit step sync ──────────────────────────────────────────────────────────

def _fitbit_fetch_steps(access_token, target_date):
    """
    Call the Fitbit activities/steps endpoint for a single day.
    Returns (steps: int, ok: bool).
    """
    url = f'{FITBIT_API_BASE}/1/user/-/activities/steps/date/{target_date}/1d.json'
    try:
        resp = http_requests.get(
            url,
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            entries = data.get('activities-steps', [])
            if entries:
                return int(entries[0]['value']), True
            return 0, True
        return None, False
    except Exception:
        return None, False


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sync_fitbit_steps(request):
    """
    GET: Sync steps from Fitbit for the given date (defaults to today).
    - Past days with an existing DB entry: return stored data immediately.
    - Today (or missing past-day entry): fetch from Fitbit, upsert, return.
    Query params: date (YYYY-MM-DD)

    Response: { id, date, steps, notes, source: 'fitbit'|'stored'|'manual', fitbit_connected: bool }
    """
    date_param = request.query_params.get('date', None)

    if date_param:
        try:
            query_date = datetime.strptime(date_param, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        query_date = date.today()

    # Check if user has Fitbit credentials
    try:
        creds = FitbitCredentials.objects.get(user=request.user)
        fitbit_connected = True
    except FitbitCredentials.DoesNotExist:
        fitbit_connected = False

    existing_log = FitnessLog.objects.filter(user=request.user, date=query_date).first()

    # No Fitbit credentials — return DB value or zero-state without hitting the API
    if not fitbit_connected:
        if existing_log:
            return Response({
                'id':               existing_log.id,
                'date':             existing_log.date.isoformat(),
                'steps':            existing_log.steps,
                'weight_kg':        str(existing_log.weight_kg) if existing_log.weight_kg is not None else None,
                'notes':            existing_log.notes,
                'source':           'manual',
                'fitbit_connected': False,
            })
        return Response({
            'id':               None,
            'date':             query_date.isoformat(),
            'steps':            0,
            'weight_kg':        None,
            'notes':            '',
            'source':           'manual',
            'fitbit_connected': False,
        })

    # Proactively refresh if the token expires within the next 5 minutes
    from django.utils import timezone as dj_tz
    from datetime import timedelta
    if creds.expires_at and creds.expires_at <= dj_tz.now() + timedelta(minutes=5):
        _refresh_fitbit_token(creds)
        creds.refresh_from_db()

    # Fetch from Fitbit
    date_str = query_date.isoformat()
    steps, ok = _fitbit_fetch_steps(creds.access_token, date_str)

    if not ok:
        # Token may have expired mid-request — refresh once and retry
        if _refresh_fitbit_token(creds):
            creds.refresh_from_db()
            steps, ok = _fitbit_fetch_steps(creds.access_token, date_str)

    token_expires_at = creds.expires_at.isoformat() if creds.expires_at else None

    if ok and steps is not None:
        notes = existing_log.notes if existing_log else ''
        weight_kg = existing_log.weight_kg if existing_log else None
        log, _ = FitnessLog.objects.update_or_create(
            user=request.user,
            date=query_date,
            defaults={'steps': steps, 'notes': notes, 'weight_kg': weight_kg},
        )
        return Response({
            'id':               log.id,
            'date':             log.date.isoformat(),
            'steps':            log.steps,
            'weight_kg':        str(log.weight_kg) if log.weight_kg is not None else None,
            'notes':            log.notes,
            'source':           'fitbit',
            'fitbit_connected': True,
            'token_expires_at': token_expires_at,
        })

    # Fitbit call failed — fall back to DB or zero-state
    if existing_log:
        return Response({
            'id':               existing_log.id,
            'date':             existing_log.date.isoformat(),
            'steps':            existing_log.steps,
            'weight_kg':        str(existing_log.weight_kg) if existing_log.weight_kg is not None else None,
            'notes':            existing_log.notes,
            'source':           'stored',
            'fitbit_connected': True,
            'token_expires_at': token_expires_at,
        })

    return Response({
        'id':               None,
        'date':             query_date.isoformat(),
        'steps':            0,
        'weight_kg':        None,
        'notes':            '',
        'source':           'manual',
        'fitbit_connected': True,
        'token_expires_at': token_expires_at,
    })
