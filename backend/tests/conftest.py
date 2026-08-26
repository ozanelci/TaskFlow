import os

import pytest
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from models import User
from security import hash_password

from main import app
from database import get_db


load_dotenv()

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")

from models import Base

test_engine = create_engine(TEST_DATABASE_URL)

Base.metadata.create_all(bind=test_engine)


TestingSessionLocal = sessionmaker(
    bind=test_engine,
    autoflush=False,
    autocommit=False
)


@pytest.fixture
def db():
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        
@pytest.fixture
def test_user(db):
    existing_user = (
        db.query(User)
        .filter(User.email == "test@example.com")
        .first()
    )

    if existing_user:
        db.delete(existing_user)
        db.commit()

    user = User(
        full_name="Test User",
        email="test@example.com",
        password_hash=hash_password("Test123!"),
        role="USER",
        is_active=True
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    yield user

    db.delete(user)
    db.commit()


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    yield TestClient(app)

    app.dependency_overrides.clear()