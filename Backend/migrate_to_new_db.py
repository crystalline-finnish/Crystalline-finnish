"""
One-time migration: copies every row from your existing SQLite database
into a new MySQL (or Postgres) database, without losing anything.

Why this is needed: switching DATABASE_URL in .env only changes where the
app looks for data going forward -- it does NOT copy your existing
products, quote requests, or contact messages over. This script does
that copy, once.

WHAT IT DOES NOT TOUCH: uploaded files (photos/plans customers attached
to quote requests) live on disk under static/uploads/, not in the
database -- moving to a new database doesn't affect them at all. Only
the file *records* (filename + path) are copied, same as every other
row.

Usage:
    1. Make sure your OLD SQLite database still exists at
       instance/crystalline.db (don't delete it before running this).
    2. Set up your new MySQL/Postgres database and note its connection
       URL (the same kind of string you'd put in DATABASE_URL).
    3. Run:
         python migrate_to_new_db.py "mysql+pymysql://user:pass@localhost:3306/crystalline"
       or for Postgres:
         python migrate_to_new_db.py "postgresql://user:pass@localhost:5432/crystalline"
    4. Once it prints "Migration complete", update DATABASE_URL in your
       .env file to the same URL you passed above, and restart the app.
"""

import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from models import db, Product, QuoteRequest, QuoteFile, ContactMessage


def get_sqlite_url():
    """Locates the existing SQLite database the same way app.py does."""
    base_dir = os.path.abspath(os.path.dirname(__file__))
    sqlite_path = os.path.join(base_dir, "instance", "crystalline.db")
    if not os.path.exists(sqlite_path):
        print(f"ERROR: No existing SQLite database found at {sqlite_path}")
        print("If you don't have existing data to migrate, you don't need "
              "this script -- just set DATABASE_URL and restart the app.")
        sys.exit(1)
    return f"sqlite:///{sqlite_path}"


def migrate(target_url):
    source_engine = create_engine(get_sqlite_url())
    target_engine = create_engine(target_url)

    SourceSession = sessionmaker(bind=source_engine)
    TargetSession = sessionmaker(bind=target_engine)
    source = SourceSession()
    target = TargetSession()

    # Create all tables on the target (empty ones -- safe even if they
    # already exist, same as db.create_all() does on every app startup).
    db.metadata.create_all(target_engine)

    # Order matters: quote_files references quote_requests, so requests
    # must exist first. Products and contact_messages have no dependencies.
    tables_in_order = [
        (Product, "products"),
        (QuoteRequest, "quote_requests"),
        (QuoteFile, "quote_files"),
        (ContactMessage, "contact_messages"),
    ]

    total_copied = 0
    for model, table_name in tables_in_order:
        rows = source.query(model).all()
        count = 0
        for row in rows:
            # Copy every column exactly as-is, including the original id,
            # so foreign keys (quote_files -> quote_requests) still line up.
            data = {c.name: getattr(row, c.name) for c in model.__table__.columns}
            target.execute(model.__table__.insert().values(**data))
            count += 1
        target.commit()
        total_copied += count
        print(f"  {table_name}: copied {count} row(s)")

    # After inserting explicit IDs, the target database's auto-increment
    # counter is still at 1 -- without this fix, the next INSERT from the
    # app would collide with an ID we just migrated. This resets each
    # counter to (max existing id + 1).
    dialect = target_engine.dialect.name
    for model, table_name in tables_in_order:
        max_id = target.query(model.id).order_by(model.id.desc()).first()
        next_id = (max_id[0] + 1) if max_id else 1
        if dialect == "mysql":
            target.execute(text(f"ALTER TABLE {table_name} AUTO_INCREMENT = {next_id}"))
        elif dialect == "postgresql":
            target.execute(text(
                f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), {next_id - 1}, true)"
            ))
    target.commit()

    source.close()
    target.close()

    print(f"\nMigration complete -- {total_copied} total rows copied.")
    print("Next step: set DATABASE_URL in your .env file to this same URL, "
          "then restart the app.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python migrate_to_new_db.py \"<new-database-url>\"")
        print('Example: python migrate_to_new_db.py "mysql+pymysql://user:pass@localhost:3306/crystalline"')
        sys.exit(1)

    target_url = sys.argv[1]
    print(f"Migrating from SQLite (instance/crystalline.db) to:\n  {target_url}\n")
    migrate(target_url)