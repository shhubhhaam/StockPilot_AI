import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from apps.api.app.main import app
from apps.api.app.core.database import engine, Base


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup tables after test
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_health_and_ready():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        health_resp = await ac.get("/health")
        assert health_resp.status_code == 200
        assert health_resp.json()["status"] == "healthy"

        ready_resp = await ac.get("/ready")
        assert ready_resp.status_code == 200
        assert ready_resp.json()["status"] == "ready"


@pytest.mark.asyncio
async def test_auth_and_user_isolation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Register User A
        reg_a = await ac.post("/api/v1/auth/register", json={
            "email": "userA@example.com",
            "password": "Password123!",
            "display_name": "User Alpha",
        })
        assert reg_a.status_code == 201
        token_a = reg_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # 2. Register User B
        reg_b = await ac.post("/api/v1/auth/register", json={
            "email": "userB@example.com",
            "password": "Password123!",
            "display_name": "User Beta",
        })
        assert reg_b.status_code == 201
        token_b = reg_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # 3. User A creates a holding
        add_holding = await ac.post("/api/v1/portfolio/holdings", json={
            "symbol": "RELIANCE",
            "quantity": 10.0,
            "average_purchase_price": 2500.0,
        }, headers=headers_a)
        assert add_holding.status_code == 201
        holding_a_id = add_holding.json()["id"]

        # 4. User B checks their holdings -> must be empty (isolation check)
        list_b = await ac.get("/api/v1/portfolio/holdings", headers=headers_b)
        assert list_b.status_code == 200
        assert len(list_b.json()) == 0

        # 5. User B tries to update User A's holding -> MUST BE 403 Forbidden!
        bad_update = await ac.patch(f"/api/v1/portfolio/holdings/{holding_a_id}", json={
            "quantity": 999.0,
        }, headers=headers_b)
        assert bad_update.status_code == 403

        # 6. User B tries to delete User A's holding -> MUST BE 403 Forbidden!
        bad_delete = await ac.delete(f"/api/v1/portfolio/holdings/{holding_a_id}", headers=headers_b)
        assert bad_delete.status_code == 403

        # 7. Unauthenticated request to protected route -> 401 Unauthorized
        unauth_resp = await ac.get("/api/v1/portfolio/holdings")
        assert unauth_resp.status_code == 401
