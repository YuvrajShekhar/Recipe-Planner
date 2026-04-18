from decimal import Decimal, InvalidOperation

import requests as http_requests

from django.contrib import admin, messages
from django.shortcuts import render, redirect
from django.urls import path, reverse

from .models import (
    Ingredient, Recipe, RecipeIngredient, Pantry, Favorite,
    IngredientNutrition, DailyNutritionLog,
)


# ── Open Food Facts helper ────────────────────────────────────────────────────

def _safe_decimal(val, default=None):
    try:
        return Decimal(str(val)) if val not in (None, '') else default
    except (InvalidOperation, TypeError):
        return default


def _fetch_off(barcode):
    """
    Call Open Food Facts and return a normalised dict, or None if not found.
    All nutrition values are per 100 g (the OFF standard).
    """
    url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
    resp = http_requests.get(url, timeout=10, headers={'User-Agent': 'FreshPlate/1.0'})
    resp.raise_for_status()
    data = resp.json()

    if data.get('status') != 1:
        return None

    p = data['product']
    n = p.get('nutriments', {})

    # Calories: prefer energy-kcal_100g, fall back to kJ ÷ 4.184
    cal = n.get('energy-kcal_100g') or n.get('energy-kcal')
    if cal is None:
        kj = n.get('energy_100g') or n.get('energy')
        cal = round(float(kj) / 4.184, 2) if kj else None

    return {
        'name':             (p.get('product_name') or p.get('product_name_en') or '').strip(),
        'brand':            p.get('brands', '').split(',')[0].strip(),
        'barcode':          barcode,
        'thumbnail_url':    p.get('image_front_thumb_url') or p.get('image_thumb_url') or '',
        'category':         'other',
        'unit':             'grams',
        'unit_type': 'per_100g',
        # Nutrition per 100 g
        'calories_per_100g': cal,
        'protein_per_100g':  n.get('proteins_100g'),
        'carbs_per_100g':    n.get('carbohydrates_100g'),
        'fat_per_100g':      n.get('fat_100g'),
        'fiber_per_100g':    n.get('fiber_100g'),
    }


# ── Template context helpers ──────────────────────────────────────────────────

CATEGORIES = Ingredient.CATEGORY_CHOICES

def _nutrition_100g_fields(product):
    return [
        ('calories_per_100g', 'Calories (kcal)', product.get('calories_per_100g')),
        ('protein_per_100g',  'Protein (g)',      product.get('protein_per_100g')),
        ('carbs_per_100g',    'Carbs (g)',         product.get('carbs_per_100g')),
        ('fat_per_100g',      'Fat (g)',           product.get('fat_per_100g')),
        ('fiber_per_100g',    'Fiber (g)',         product.get('fiber_per_100g')),
    ]

def _nutrition_unit_fields(product):
    return [
        ('calories_per_unit', 'Calories (kcal)', product.get('calories_per_unit')),
        ('protein_per_unit',  'Protein (g)',      product.get('protein_per_unit')),
        ('carbs_per_unit',    'Carbs (g)',         product.get('carbs_per_unit')),
        ('fat_per_unit',      'Fat (g)',           product.get('fat_per_unit')),
        ('fiber_per_unit',    'Fiber (g)',         product.get('fiber_per_unit')),
    ]


# ── IngredientAdmin ───────────────────────────────────────────────────────────

@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display  = ('name', 'category', 'unit', 'barcode_import_link')
    list_filter   = ('category',)
    search_fields = ['name']
    ordering      = ('name',)

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                'import-barcode/',
                self.admin_site.admin_view(self.barcode_import_view),
                name='recipes_ingredient_barcode_import',
            ),
        ]
        return custom + urls

    # Column with a quick link on each row (not strictly needed, but handy)
    @admin.display(description='')
    def barcode_import_link(self, obj):
        from django.utils.html import format_html
        url = reverse('admin:recipes_ingredient_barcode_import')
        return format_html('<a href="{}">Import by barcode</a>', url)

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['barcode_import_url'] = reverse('admin:recipes_ingredient_barcode_import')
        return super().changelist_view(request, extra_context=extra_context)

    # ── The custom view ───────────────────────────────────────────────────────

    def barcode_import_view(self, request):
        context = {
            **self.admin_site.each_context(request),
            'title':       'Import Ingredient by Barcode',
            'categories':  CATEGORIES,
            'product':     None,
            'barcode':     '',
            'lookup_error': '',
            'save_error':  '',
        }

        if request.method != 'POST':
            return render(request, 'admin/recipes/ingredient/barcode_import.html', context)

        action = request.POST.get('action')

        # ── Step 1: look up barcode ───────────────────────────────────────────
        if action == 'lookup':
            barcode = request.POST.get('barcode', '').strip()
            context['barcode'] = barcode

            if not barcode:
                context['lookup_error'] = 'Please enter a barcode.'
                return render(request, 'admin/recipes/ingredient/barcode_import.html', context)

            try:
                product = _fetch_off(barcode)
            except Exception as exc:
                context['lookup_error'] = f'Open Food Facts lookup failed: {exc}'
                return render(request, 'admin/recipes/ingredient/barcode_import.html', context)

            if product is None:
                context['lookup_error'] = (
                    f'No product found for barcode "{barcode}". '
                    'Try another barcode or add the ingredient manually.'
                )
                return render(request, 'admin/recipes/ingredient/barcode_import.html', context)

            context['product']         = product
            context['nutrition_100g']  = _nutrition_100g_fields(product)
            context['nutrition_unit']  = _nutrition_unit_fields(product)
            return render(request, 'admin/recipes/ingredient/barcode_import.html', context)

        # ── Step 2: save ──────────────────────────────────────────────────────
        if action == 'save':
            barcode       = request.POST.get('barcode', '').strip()
            name          = request.POST.get('name', '').strip()
            category      = request.POST.get('category', 'other')
            unit          = request.POST.get('unit', 'grams').strip()
            unit_type     = request.POST.get('unit_type', 'per_100g')
            thumbnail_url = request.POST.get('thumbnail_url', '').strip()

            if not name:
                # Re-build product dict from POST so the form re-renders
                product = {
                    'name':          name,
                    'brand':         request.POST.get('brand', ''),
                    'barcode':       barcode,
                    'thumbnail_url': thumbnail_url,
                    'category':      category,
                    'unit':          unit,
                    'unit_type': unit_type,
                }
                context.update({
                    'product':        product,
                    'barcode':        barcode,
                    'save_error':     'Name is required.',
                    'nutrition_100g': _nutrition_100g_fields(product),
                    'nutrition_unit': _nutrition_unit_fields(product),
                })
                return render(request, 'admin/recipes/ingredient/barcode_import.html', context)

            # Create or update the Ingredient
            ingredient, created = Ingredient.objects.get_or_create(
                name__iexact=name,
                defaults={'name': name, 'category': category, 'unit': unit},
            )
            if not created:
                ingredient.category = category
                ingredient.unit     = unit
                ingredient.save(update_fields=['category', 'unit'])

            # Create or update IngredientNutrition
            nutrition_defaults = {
                'unit_type': unit_type,
            }
            if unit_type == 'per_100g':
                nutrition_defaults.update({
                    'calories_per_100g': _safe_decimal(request.POST.get('calories_per_100g')),
                    'protein_per_100g':  _safe_decimal(request.POST.get('protein_per_100g')),
                    'carbs_per_100g':    _safe_decimal(request.POST.get('carbs_per_100g')),
                    'fat_per_100g':      _safe_decimal(request.POST.get('fat_per_100g')),
                    'fiber_per_100g':    _safe_decimal(request.POST.get('fiber_per_100g')),
                })
            else:
                nutrition_defaults.update({
                    'calories_per_unit': _safe_decimal(request.POST.get('calories_per_unit')),
                    'protein_per_unit':  _safe_decimal(request.POST.get('protein_per_unit')),
                    'carbs_per_unit':    _safe_decimal(request.POST.get('carbs_per_unit')),
                    'fat_per_unit':      _safe_decimal(request.POST.get('fat_per_unit')),
                    'fiber_per_unit':    _safe_decimal(request.POST.get('fiber_per_unit')),
                })

            IngredientNutrition.objects.update_or_create(
                ingredient=ingredient,
                defaults=nutrition_defaults,
            )

            action_word = 'Created' if created else 'Updated'
            messages.success(request, f'{action_word} ingredient "{ingredient.name}" with nutrition data.')
            return redirect(reverse('admin:recipes_ingredient_change', args=[ingredient.pk]))

        return render(request, 'admin/recipes/ingredient/barcode_import.html', context)


# ── Remaining admin registrations ─────────────────────────────────────────────

class RecipeIngredientInline(admin.TabularInline):
    model              = RecipeIngredient
    extra              = 3
    autocomplete_fields = ['ingredient']


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'difficulty', 'preference', 'prep_time', 'cook_time', 'created_at')
    list_filter  = ('difficulty', 'preference', 'created_at')
    search_fields = ('title', 'description')
    ordering     = ('-created_at',)
    inlines      = [RecipeIngredientInline]

    fieldsets = (
        ('Basic Info', {
            'fields': ('title', 'description', 'image_url', 'preference')
        }),
        ('Cooking Details', {
            'fields': ('instructions', 'prep_time', 'cook_time', 'servings', 'difficulty')
        }),
        ('Metadata', {
            'fields': ('created_by',)
        }),
    )


@admin.register(RecipeIngredient)
class RecipeIngredientAdmin(admin.ModelAdmin):
    list_display  = ('recipe', 'ingredient', 'quantity', 'unit')
    list_filter   = ('recipe', 'ingredient')
    search_fields = ('recipe__title', 'ingredient__name')


@admin.register(Pantry)
class PantryAdmin(admin.ModelAdmin):
    list_display  = ('user', 'ingredient', 'quantity', 'added_at')
    list_filter   = ('user', 'ingredient__category')
    search_fields = ('user__username', 'ingredient__name')
    ordering      = ('-added_at',)


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display  = ('user', 'recipe', 'saved_at')
    list_filter   = ('user', 'saved_at')
    search_fields = ('user__username', 'recipe__title')
    ordering      = ('-saved_at',)


@admin.register(IngredientNutrition)
class IngredientNutritionAdmin(admin.ModelAdmin):
    list_display       = ['ingredient', 'unit_type', 'calories_per_100g', 'calories_per_unit',
                          'protein_per_100g', 'carbs_per_100g', 'fat_per_100g']
    list_filter        = ['unit_type']
    search_fields      = ['ingredient__name']
    autocomplete_fields = ['ingredient']


@admin.register(DailyNutritionLog)
class DailyNutritionLogAdmin(admin.ModelAdmin):
    list_display  = ('user', 'date', 'dish_name', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'created_at')
    list_filter   = ('user', 'date')
    search_fields = ('user__username', 'dish_name')
    ordering      = ('-date', '-created_at')
    date_hierarchy = 'date'

    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'date', 'dish_name')
        }),
        ('Nutritional Information', {
            'fields': ('calories', 'protein', 'carbs', 'fat', 'fiber')
        }),
        ('Additional Info', {
            'fields': ('notes',)
        }),
    )
