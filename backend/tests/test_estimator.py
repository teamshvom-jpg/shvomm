from app.services.estimator import calculate_estimate
from app.config.pricing import CATEGORY_BASE_RANGES, PACKAGING_MULTIPLIERS, QUANTITY_TIERS


def test_calculate_estimate_basic():
    res = calculate_estimate(
        category_key="edible",
        packaging_key="linen_keepsake_box",
        personalization_key="custom_card",
        quantity=50
    )
    assert res["min_unit"] > 0
    assert res["max_unit"] > res["min_unit"]
    assert res["min_total"] == res["min_unit"] * 50
    assert res["max_total"] == res["max_unit"] * 50
    assert res["quantity"] == 50
    assert "Edible" in res["category_name"]


def test_calculate_estimate_quantity_discount():
    # Boutique under 50 vs Enterprise 500+
    boutique = calculate_estimate(category_key="fragrance", quantity=30)
    enterprise = calculate_estimate(category_key="fragrance", quantity=600)

    # Unit price should be cheaper per unit at enterprise scale
    assert enterprise["min_unit"] < boutique["min_unit"]
    assert enterprise["discount_factor"] < boutique["discount_factor"]


def test_calculate_estimate_fallback():
    # Unknown keys should gracefully fall back without throwing exceptions
    res = calculate_estimate(
        category_key="non_existent_key",
        packaging_key="unknown_pack",
        personalization_key="unknown_pers",
        quantity=25
    )
    assert res["min_unit"] > 0
    assert res["max_unit"] > res["min_unit"]
