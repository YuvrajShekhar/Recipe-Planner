from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0010_rename_recipes_act_user_id_idx_recipes_act_user_id_98b981_idx'),
    ]

    operations = [
        migrations.AddField(
            model_name='fitnesslog',
            name='weight_kg',
            field=models.DecimalField(
                blank=True,
                decimal_places=1,
                help_text='Body weight recorded on this day (kg)',
                max_digits=5,
                null=True,
            ),
        ),
    ]
