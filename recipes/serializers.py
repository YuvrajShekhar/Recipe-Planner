from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Ingredient, Recipe, RecipeIngredient, Pantry, Favorite


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user


class IngredientSerializer(serializers.ModelSerializer):
    """Serializer for Ingredient model"""
    
    class Meta:
        model = Ingredient
        fields = ['id', 'name', 'category', 'unit']


class RecipeIngredientSerializer(serializers.ModelSerializer):
    """Serializer for RecipeIngredient with ingredient details"""
    
    ingredient = IngredientSerializer(read_only=True)
    ingredient_id = serializers.PrimaryKeyRelatedField(
        queryset=Ingredient.objects.all(),
        source='ingredient',
        write_only=True
    )
    
    class Meta:
        model = RecipeIngredient
        fields = ['id', 'ingredient', 'ingredient_id', 'quantity', 'unit']


class RecipeListSerializer(serializers.ModelSerializer):
    """Serializer for listing recipes (minimal details)"""
    
    created_by = UserSerializer(read_only=True)
    total_time = serializers.ReadOnlyField()
    ingredient_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Recipe
        fields = [
            'id', 'title', 'description', 'prep_time', 'cook_time',
            'total_time', 'servings', 'difficulty', 'image_url',
            'created_by', 'created_at', 'ingredient_count'
        ]
    
    def get_ingredient_count(self, obj):
        return obj.recipe_ingredients.count()


class RecipeDetailSerializer(serializers.ModelSerializer):
    """Serializer for full recipe details"""
    
    created_by = UserSerializer(read_only=True)
    recipe_ingredients = RecipeIngredientSerializer(many=True, read_only=True)
    total_time = serializers.ReadOnlyField()
    is_favorited = serializers.SerializerMethodField()
    
    class Meta:
        model = Recipe
        fields = [
            'id', 'title', 'description', 'instructions', 'prep_time',
            'cook_time', 'total_time', 'servings', 'difficulty', 'image_url',
            'created_by', 'created_at', 'updated_at', 'recipe_ingredients',
            'is_favorited'
        ]
    
    def get_is_favorited(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, recipe=obj).exists()
        return False


class RecipeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating recipes"""
    
    ingredients = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Recipe
        fields = [
            'id', 'title', 'description', 'instructions', 'prep_time',
            'cook_time', 'servings', 'difficulty', 'image_url', 'ingredients'
        ]
    
    def create(self, validated_data):
        ingredients_data = validated_data.pop('ingredients', [])
        recipe = Recipe.objects.create(**validated_data)
        
        for ingredient_data in ingredients_data:
            RecipeIngredient.objects.create(
                recipe=recipe,
                ingredient_id=ingredient_data['ingredient_id'],
                quantity=ingredient_data['quantity'],
                unit=ingredient_data['unit']
            )
        
        return recipe
    
    def update(self, instance, validated_data):
        ingredients_data = validated_data.pop('ingredients', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if ingredients_data is not None:
            instance.recipe_ingredients.all().delete()
            for ingredient_data in ingredients_data:
                RecipeIngredient.objects.create(
                    recipe=instance,
                    ingredient_id=ingredient_data['ingredient_id'],
                    quantity=ingredient_data['quantity'],
                    unit=ingredient_data['unit']
                )
        
        return instance


class PantrySerializer(serializers.ModelSerializer):
    """Serializer for Pantry items"""
    
    ingredient = IngredientSerializer(read_only=True)
    ingredient_id = serializers.PrimaryKeyRelatedField(
        queryset=Ingredient.objects.all(),
        source='ingredient',
        write_only=True
    )
    
    class Meta:
        model = Pantry
        fields = ['id', 'ingredient', 'ingredient_id', 'quantity', 'added_at']
        read_only_fields = ['id', 'added_at']


class FavoriteSerializer(serializers.ModelSerializer):
    """Serializer for Favorite recipes"""
    
    recipe = RecipeListSerializer(read_only=True)
    recipe_id = serializers.PrimaryKeyRelatedField(
        queryset=Recipe.objects.all(),
        source='recipe',
        write_only=True
    )
    
    class Meta:
        model = Favorite
        fields = ['id', 'recipe', 'recipe_id', 'saved_at']
        read_only_fields = ['id', 'saved_at']


class RecipeMatchSerializer(serializers.ModelSerializer):
    """Serializer for recipe matching results with match percentage"""
    
    created_by = UserSerializer(read_only=True)
    total_time = serializers.ReadOnlyField()
    match_percentage = serializers.FloatField(read_only=True)
    matched_ingredients = serializers.ListField(read_only=True)
    missing_ingredients = serializers.ListField(read_only=True)
    
    class Meta:
        model = Recipe
        fields = [
            'id', 'title', 'description', 'prep_time', 'cook_time',
            'total_time', 'servings', 'difficulty', 'image_url',
            'created_by', 'match_percentage', 'matched_ingredients',
            'missing_ingredients'
        ]