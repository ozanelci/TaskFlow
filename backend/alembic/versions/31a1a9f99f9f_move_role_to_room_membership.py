"""move role to room membership

Revision ID: 31a1a9f99f9f
Revises: 00346e9534d5
Create Date: 2026-09-07 10:11:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '31a1a9f99f9f'
down_revision: Union[str, Sequence[str], None] = '00346e9534d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add role to room_memberships
    op.add_column('room_memberships', sa.Column('role', sa.String(length=20), server_default='USER', nullable=False))
    
    # 2. Backfill: Update role in room_memberships based on rooms.created_by
    op.execute(
        """
        UPDATE room_memberships
        SET role = 'ADMIN'
        FROM rooms
        WHERE room_memberships.room_id = rooms.id
          AND room_memberships.user_id = rooms.created_by
        """
    )

    # 3. Drop role from users
    op.drop_column('users', 'role')

def downgrade() -> None:
    # 1. Add role back to users
    op.add_column('users', sa.Column('role', sa.String(length=20), server_default='USER', autoincrement=False, nullable=False))
    
    # 2. Drop role from room_memberships
    op.drop_column('room_memberships', 'role')
