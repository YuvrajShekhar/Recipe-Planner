# Generated manually for UserProfile and ActivityLog models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('recipes', '0008_fitbitcredentials'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('age', models.PositiveIntegerField(blank=True, help_text='Age in years', null=True)),
                ('height_cm', models.DecimalField(blank=True, decimal_places=1, help_text='Height in centimetres', max_digits=5, null=True)),
                ('weight_kg', models.DecimalField(blank=True, decimal_places=1, help_text='Weight in kilograms', max_digits=5, null=True)),
                ('gender', models.CharField(
                    blank=True, max_length=10, null=True,
                    choices=[('male', 'Male'), ('female', 'Female')],
                )),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='profile',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
        migrations.CreateModel(
            name='ActivityLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(help_text='Date of the activity')),
                ('activity_type', models.CharField(
                    max_length=30,
                    choices=[
                        ('bouldering', 'Bouldering / Rock Climbing'),
                        ('weight_training_moderate', 'Gym \u2013 Weight Training (moderate)'),
                        ('weight_training_vigorous', 'Gym \u2013 Weight Training (vigorous)'),
                        ('cardio_moderate', 'Cardio (moderate)'),
                        ('cardio_vigorous', 'Cardio (vigorous)'),
                        ('circuit_training', 'Circuit Training'),
                    ],
                )),
                ('duration_minutes', models.PositiveIntegerField(help_text='Duration in minutes')),
                ('calories_burned', models.DecimalField(
                    decimal_places=1, max_digits=7,
                    help_text='Calories burned \u2014 calculated via Harris-Benedict + MET',
                )),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='activity_logs',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-date', '-created_at'],
                'indexes': [models.Index(fields=['user', 'date'], name='recipes_act_user_id_idx')],
            },
        ),
    ]
