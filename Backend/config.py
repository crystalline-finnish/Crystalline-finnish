import os
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Loads variables from a .env file in the project root, if one exists.
# In production you'd typically set these as real environment variables
# instead (e.g. through your hosting platform), but .env keeps local
# development simple. See .env.example for the full list of variables.
load_dotenv(os.path.join(BASE_DIR, ".env"))


class Config:
    # --- Database ---
    # If DATABASE_URL is set (e.g. postgresql://user:pass@host:5432/dbname),
    # that's used instead of SQLite. This is what lets the exact same code
    # run against SQLite locally and Postgres in production.
    DATABASE_URL = os.environ.get("DATABASE_URL")
    SQLALCHEMY_DATABASE_URI = DATABASE_URL or "sqlite:///crystalline.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    IS_PRODUCTION = os.environ.get("FLASK_ENV") == "production"
    SESSION_COOKIE_SAMESITE = "None" if IS_PRODUCTION else "Lax"
    SESSION_COOKIE_SECURE = IS_PRODUCTION
 
    SQLALCHEMY_ENGINE_OPTIONS = (
        {"pool_pre_ping": True} if DATABASE_URL else {}
        
    )

    # --- File uploads ---
    PROJECT_ROOT_STATIC = os.path.abspath(os.path.join(BASE_DIR, os.pardir, "static"))
    UPLOAD_FOLDER = os.path.join(PROJECT_ROOT_STATIC, "uploads", "quotes")
    PRODUCT_IMAGE_FOLDER = os.path.join(PROJECT_ROOT_STATIC, "uploads", "products")
    PROJECT_IMAGE_FOLDER = os.path.join(PROJECT_ROOT_STATIC, "uploads", "projects")
    IMAGE_UPLOAD_FOLDER = os.path.join(PROJECT_ROOT_STATIC, "images")
    ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png"}
    ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
    MAX_CONTENT_LENGTH = 15 * 1024 * 1024  # 15 MB per request (across all files)

    # --- Admin access ---
    # Falls back to obviously-fake dev defaults so the app still runs out
    # of the box. validate_production_config() below refuses to start if
    # FLASK_ENV=production and any of these are still at that default.
    ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "change-me-please")
    ADMIN_APP_URL = os.environ.get("ADMIN_APP_URL", "/admin")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "crystalline2026")
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")

    # Session cookie behaviour (useful to override in production when
    # frontend and backend are on different hostnames). Set to "None"
    # and SESSION_COOKIE_SECURE=true when you need cross-site cookies.
    SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"

    # --- CORS ---
    # Comma-separated list of origins allowed to call this API with
    # credentials (cookies). Add your deployed admin URL here in production.
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.environ.get(
            "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]

    # --- Email notifications (optional) ---
    # If SMTP_HOST is unset, email notifications are silently skipped
    # rather than raising errors -- so the app works fine without them
    # configured, and you can add them whenever you're ready.
    SMTP_HOST = os.environ.get("SMTP_HOST")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
    SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
    SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "true").lower() == "true"
    NOTIFY_FROM_EMAIL = os.environ.get("NOTIFY_FROM_EMAIL", "noreply@crystalline.co.ke")
    NOTIFY_TO_EMAIL = os.environ.get("NOTIFY_TO_EMAIL")  # staff inbox for new quotes

    # --- WhatsApp notifications (optional) ---
    # Uses Meta's WhatsApp Business Cloud API. If WHATSAPP_ACCESS_TOKEN is
    # unset, WhatsApp notifications are silently skipped.
    WHATSAPP_ACCESS_TOKEN = os.environ.get("WHATSAPP_ACCESS_TOKEN")
    WHATSAPP_PHONE_NUMBER_ID = os.environ.get("WHATSAPP_PHONE_NUMBER_ID")
    WHATSAPP_NOTIFY_NUMBER = os.environ.get("WHATSAPP_NOTIFY_NUMBER")  # staff number, e.g. 254700000000


def validate_production_config(app):
    """Called once at startup. Refuses to run with insecure defaults if
    FLASK_ENV=production, so a misconfigured deployment can't accidentally
    go live with the placeholder admin password or a guessable secret key.
    """
    if os.environ.get("FLASK_ENV") != "production":
        return
    insecure_defaults = {
        "ADMIN_API_KEY": "change-me-please",
        "ADMIN_PASSWORD": "crystalline2026",
        "SECRET_KEY": "dev-secret-change-me",
    }
    still_default = [
        name for name, default_value in insecure_defaults.items()
        if app.config.get(name) == default_value
    ]
    if still_default:
        raise RuntimeError(
            f"Refusing to start in production with default values still set for: "
            f"{', '.join(still_default)}. Set real values as environment variables "
            f"(see .env.example)."
        )
