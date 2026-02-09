web: gunicorn backend.wsgi --bind 0.0.0.0:$PORT
release: python manage.py collectstatic --no-input && python manage.py migrate --no-input
