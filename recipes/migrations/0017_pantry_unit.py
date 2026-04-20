from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0016_fooditem_foodpantry'),
    ]

    operations = [
        migrations.AddField(
            model_name='pantry',
            name='unit',
            field=models.CharField(
                blank=True, default='', max_length=30,
                help_text='Unit for this pantry entry (overrides ingredient default)',
            ),
        ),
    ]
