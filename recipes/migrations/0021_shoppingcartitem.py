from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0020_merge_20260505_1439'),
    ]

    operations = [
        migrations.CreateModel(
            name='ShoppingCartItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('note', models.CharField(blank=True, help_text="Optional detail, e.g. '2 packs'", max_length=200)),
                ('is_checked', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='cart_items',
                    to='auth.user',
                )),
            ],
            options={
                'ordering': ['is_checked', '-created_at'],
            },
        ),
    ]
