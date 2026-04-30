from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0018_pantry_low_stock'),
    ]

    operations = [
        migrations.AlterField(
            model_name='pantry',
            name='quantity',
            field=models.DecimalField(max_digits=9, decimal_places=3, blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='pantry',
            name='low_stock_threshold',
            field=models.DecimalField(
                max_digits=9, decimal_places=3, blank=True, null=True,
                help_text='Alert when quantity drops below this value',
            ),
        ),
    ]
