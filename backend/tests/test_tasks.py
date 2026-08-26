from sqlalchemy import text
from models import User
from security import hash_password

def test_root(client):
    response = client.get("/")

    assert response.status_code == 200


def test_tasks_requires_authentication(client):
    response = client.get("/tasks")

    assert response.status_code in [401, 403]


def test_db_connection(db):
    result = db.execute(text("SELECT 1"))

    assert result.scalar() == 1
    
def test_authenticated_tasks_access(client, test_user):
    login_response = client.post(
        "/login",
        json={
            "email": test_user.email,
            "password": "Test123!"
        }
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    response = client.get(
        "/tasks",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 200
    
def test_login_success(client, test_user):
    response = client.post(
        "/login",
        json={
            "email": test_user.email,
            "password": "Test123!"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"
    
def test_user_cannot_access_admin(client, test_user):
    login_response = client.post(
        "/login",
        json={
            "email": test_user.email,
            "password": "Test123!"
        }
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    response = client.get(
        "/admin-test",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 403
    
def test_admin_can_access_admin(client, db):
    admin = User(
        full_name="Admin User",
        email="admin@example.com",
        password_hash=hash_password("Admin123!"),
        role="ADMIN",
        is_active=True
    )

    db.add(admin)
    db.commit()
    db.refresh(admin)

    login_response = client.post(
        "/login",
        json={
            "email": "admin@example.com",
            "password": "Admin123!"
        }
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    response = client.get(
        "/admin-test",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 200

    db.delete(admin)
    db.commit()    
    
def test_user_cannot_update_another_user(client, db, test_user):
    another_user = User(
        full_name="Another User",
        email="another@example.com",
        password_hash=hash_password("Test123!"),
        role="USER",
        is_active=True
    )

    db.add(another_user)
    db.commit()
    db.refresh(another_user)

    login_response = client.post(
        "/login",
        json={
            "email": test_user.email,
            "password": "Test123!"
        }
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    response = client.patch(
        f"/users/{another_user.id}",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "full_name": "Hacked Name"
        }
    )

    assert response.status_code == 403

    db.delete(another_user)
    db.commit()
    
def test_user_can_update_own_name(client, test_user):
    login_response = client.post(
        "/login",
        json={
            "email": test_user.email,
            "password": "Test123!"
        }
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    response = client.patch(
        f"/users/{test_user.id}",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "full_name": "Updated Name"
        }
    )

    assert response.status_code == 200
    assert response.json()["full_name"] == "Updated Name"
    
def test_user_cannot_update_restricted_field(client, test_user):
    login_response = client.post(
        "/login",
        json={
            "email": test_user.email,
            "password": "Test123!"
        }
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    response = client.patch(
        f"/users/{test_user.id}",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "role": "ADMIN"
        }
    )

    assert response.status_code == 403
    
def test_user_cannot_delete_user(client, test_user):
    response = client.delete(
        f"/users/{test_user.id}",
        headers={
            "Authorization": f"Bearer {(
                client.post(
                    "/login",
                    json={
                        "email": test_user.email,
                        "password": "Test123!"
                    }
                ).json()["access_token"]
            )}"
        }
    )

    assert response.status_code == 403