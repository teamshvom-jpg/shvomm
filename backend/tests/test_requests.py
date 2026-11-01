import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["brand"] == "Shvom"


def test_get_questions():
    res = client.get("/api/questions")
    assert res.status_code == 200
    data = res.json()
    assert "questions" in data
    assert len(data["questions"]) >= 5


def test_estimate_endpoint():
    payload = {
        "category": "home_decor",
        "packaging": "solid_wood_chest",
        "personalization": "monogram_engraving",
        "quantity": 100
    }
    res = client.post("/api/estimate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["min_unit"] > 0
    assert data["quantity"] == 100
    assert data["currency"] == "INR"


def test_create_request_and_pdf():
    payload = {
        "occasion": "wedding",
        "client_name": "Rohan & Tara",
        "client_email": "rohan.tara@gmail.com",
        "client_phone": "+91 99887 76655",
        "delivery_city": "Jaipur",
        "delivery_date": "2026-11-28",
        "quantity": 150,
        "budget_per_gift": 5000,
        "answers": {
            "occasion": "wedding",
            "couple_names": "Rohan & Tara",
            "destination_city": "Rambagh Palace, Jaipur",
            "gift_category": "home_decor",
            "packaging_style": "solid_wood_chest",
            "personalization_level": "monogram_engraving"
        },
        "special_notes": "All wooden boxes to be customized with brass inlay monogram."
    }
    res = client.post("/api/requests", json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created["reference_id"].startswith("SHV-")
    assert created["client_name"] == "Rohan & Tara"
    assert created["status"] == "New"

    # Test PDF generation
    ref_id = created["reference_id"]
    pdf_res = client.get(f"/api/requests/{ref_id}/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000  # Non-trivial PDF generated


def test_admin_flow():
    # 1. Login with seeded credentials
    login_res = client.post("/api/admin/login", json={
        "username": "concierge",
        "password": "ShvomAtelier2026!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. List requests
    reqs_res = client.get("/api/admin/requests", headers=headers)
    assert reqs_res.status_code == 200
    data = reqs_res.json()
    assert "items" in data
    assert data["total"] >= 1

    # 3. Patch status
    first_id = data["items"][0]["id"]
    patch_res = client.patch(
        f"/api/admin/requests/{first_id}",
        json={"status": "Quoted", "admin_notes": "Sample presentation mailed."},
        headers=headers
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "Quoted"


def test_book_consultation():
    payload = {
        "full_name": "Aarav Kapoor",
        "email": "aarav.kapoor@example.com",
        "phone": "+91 98765 43210",
        "inquiry_type": "Wedding",
        "preferred_date": "2026-12-15",
        "preferred_time_slot": "Morning (11:00 AM - 1:00 PM)",
        "notes": "Interested in brass keepsake chests for destination wedding."
    }
    res = client.post("/api/consultations", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["full_name"] == "Aarav Kapoor"
    assert data["email"] == "aarav.kapoor@example.com"
    assert data["status"] == "Pending"

