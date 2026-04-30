from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0017_pantry_unit'),
    ]

    operations = [
        migrations.AddField(
            model_name='pantry',
            name='low_stock_threshold',
            field=models.DecimalField(
                max_digits=6, decimal_places=2, blank=True, null=True,
                help_text='Alert when quantity drops below this value',
            ),
        ),
        migrations.AddField(
            model_name='pantry',
            name='low_stock_unit',
            field=models.CharField(
                max_length=30, blank=True, default='',
                help_text='Unit for the low-stock threshold',
            ),
        ),
    ]
