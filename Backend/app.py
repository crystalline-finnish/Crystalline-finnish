import os
import uuid
import smtplib
import threading
import webbrowser
from email.mime.text import MIMEText
from functools import wraps
from flask import Flask, render_template, request, jsonify, session, redirect, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

from config import Config, validate_production_config
from models import db, QuoteRequest, QuoteFile, Product, ContactMessage, Testimonial, Project
from notifications import notify_new_quote_request


def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
    app.static_folder = os.path.join(project_root, 'static')
    app.static_url_path = '/static'

    validate_production_config(app)

    # Make sure instance/ and the upload folders actually exist
    os.makedirs(app.instance_path, exist_ok=True)
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["PRODUCT_IMAGE_FOLDER"], exist_ok=True)
    os.makedirs(app.config["PROJECT_IMAGE_FOLDER"], exist_ok=True)
    os.makedirs(app.config["IMAGE_UPLOAD_FOLDER"], exist_ok=True)

    # If DATABASE_URL is set (e.g. a Postgres URL), Config already used it.
    # Otherwise, point SQLite at a file inside the instance folder, which
    # is the conventional place for Flask apps to keep local data files.
    if not Config.DATABASE_URL:
        app.config["SQLALCHEMY_DATABASE_URI"] = (
            "sqlite:///" + os.path.join(app.instance_path, "crystalline.db")
        )

    db.init_app(app)

    # Session cookies. SameSite=Lax is the safe default: it's sent on
    # normal cross-site GET navigations but withheld on cross-site
    # POST/PUT/etc, which is exactly what we want. This only works
    # correctly if the frontend calls this API using the SAME hostname
    # it's itself served from (both "localhost", or both "127.0.0.1") --
    # the admin app's client.js is built to guarantee that automatically.
    app.config["SESSION_COOKIE_SAMESITE"] = "None"
    app.config["SESSION_COOKIE_SECURE"] = True

    CORS(
    app,
    supports_credentials=True,
    origins=[
        "https://crystalline-finnish-tln2.onrender.com",
        "https://crystalline.alwaysdata.net",
    ]
)

    with app.app_context():
        db.create_all()
        _seed_products_if_empty()

    register_routes(app)
    return app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS
    )


def allowed_image_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_IMAGE_EXTENSIONS
    )


def save_uploaded_image(app_instance, uploaded_file):
    """Persist an uploaded image under the shared static images folder and
    return the public URL that the frontend should store."""
    safe_name = secure_filename(uploaded_file.filename)
    unique_name = f"{uuid.uuid4().hex[:10]}_{safe_name}"
    disk_path = os.path.join(app_instance.config["IMAGE_UPLOAD_FOLDER"], unique_name)
    uploaded_file.save(disk_path)
    return f"/static/images/{unique_name}"


def require_admin_key(view_func):
    """Admin-only API endpoints. Accepts EITHER:
      - a valid logged-in session (set by /api/admin/login), which is
        what the admin dashboard uses automatically via its cookie, or
      - the X-Admin-Key header, for scripts / direct API access without
        a browser session.
    """
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        if session.get("admin_logged_in"):
            return view_func(*args, **kwargs)
        if request.headers.get("X-Admin-Key") == Config.ADMIN_API_KEY:
            return view_func(*args, **kwargs)
        return jsonify({"error": "Unauthorized"}), 401
    return wrapped


def _seed_products_if_empty():
    if Product.query.first():
        return
    img = lambda pid, w=600, h=450: (
        f"https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg"
        f"?auto=compress&cs=tinysrgb&w={w}&h={h}&fit=crop"
    )
    seed = [
        dict(name="Aluminium Sliding Windows", category="aluminium", use_case="residential",
             description="Smooth two- or three-track sliding system with a slim aluminium profile.",
             dimensions="Up to 2400x1800mm", glass_thickness="4mm / 6mm / 8mm",
             frame_colors="Charcoal,Champagne,White,Wood-grain", energy_rating="Std / Double-glazed",
             base_rate_per_m2=1800, image_url=img(34725820)),
        dict(name="Casement Windows", category="aluminium", use_case="residential",
             description="Side- or top-hung, hinged opening for full ventilation control.",
             dimensions="Up to 1200x1500mm", glass_thickness="4mm / 6mm",
             frame_colors="Charcoal,Champagne,White", energy_rating="Std / Double-glazed",
             base_rate_per_m2=2100, image_url=img(9487654)),
        dict(name="Fixed Windows", category="glass", use_case="commercial",
             description="Non-opening glazing for maximum light and unobstructed views.",
             dimensions="Custom, any size", glass_thickness="6mm / 8mm / 10mm",
             frame_colors="Charcoal,White", energy_rating="Laminated option",
             base_rate_per_m2=1500, image_url=img(31628811)),
        dict(name="Tilt & Turn Windows", category="upvc", use_case="residential",
             description="Dual-function opening: tilt for ventilation, turn for full access.",
             dimensions="Up to 1300x1500mm", glass_thickness="Double-glazed 24mm unit",
             frame_colors="White,Grey,Wood-grain", energy_rating="High - thermally broken",
             base_rate_per_m2=3200, image_url=img(2077343)),
        dict(name="Bay Windows", category="aluminium", use_case="residential",
             description="Angled multi-panel projection that adds floor space and light.",
             dimensions="Custom, per elevation", glass_thickness="6mm / 8mm",
             frame_colors="Charcoal,Champagne", energy_rating="Double-glazed option",
             base_rate_per_m2=2800, image_url=img(29690104)),
        dict(name="uPVC Windows", category="upvc", use_case="residential",
             description="Low-maintenance, corrosion-resistant frames with strong insulation.",
             dimensions="Up to 1500x1800mm", glass_thickness="Double-glazed 20-28mm",
             frame_colors="White,Grey", energy_rating="High",
             base_rate_per_m2=2000, image_url=img(36552399)),
        dict(name="Frameless Glass", category="glass", use_case="commercial",
             description="Toughened glass panels with minimal hardware for a seamless look.",
             dimensions="Custom, any size", glass_thickness="10mm / 12mm toughened",
             frame_colors="", energy_rating="N/A",
             base_rate_per_m2=4500, image_url=img(38216275)),
        dict(name="Shopfronts", category="glass", use_case="commercial",
             description="Full-height storefront glazing with aluminium structural framing.",
             dimensions="Custom, per storefront", glass_thickness="8mm / 10mm laminated",
             frame_colors="Charcoal,Champagne", energy_rating="Solar-control option",
             base_rate_per_m2=5200, image_url=img(5021939)),
        dict(name="Office Partitions", category="glass", use_case="commercial",
             description="Single or double-glazed acoustic partitions for modern offices.",
             dimensions="Modular, custom layout", glass_thickness="6mm / 8mm / acoustic 10mm",
             frame_colors="Charcoal,White", energy_rating="Acoustic rating available",
             base_rate_per_m2=3800, image_url=img(3801167)),
        dict(name="Glass Doors", category="glass", use_case="residential,commercial",
             description="Sliding, swing or frameless glass doors for entries and patios.",
             dimensions="Up to 2400x2100mm", glass_thickness="8mm / 10mm / 12mm",
             frame_colors="Charcoal,Champagne,White", energy_rating="Double-glazed option",
             base_rate_per_m2=4000, image_url=img(10586212)),
    ]
    for p in seed:
        db.session.add(Product(**p))
    db.session.commit()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

def register_routes(app):

    # ---------- Frontend ----------

    # Small lookup so templates can turn "Charcoal" into an actual swatch
    # color without hardcoding hex values all over the HTML.
    COLOR_HEX = {
        "Charcoal": "#3a352e", "Champagne": "#c9c2b0", "White": "#ffffff",
        "Wood-grain": "#6b4a2f", "Grey": "#8a8478",
    }

    @app.context_processor
    def inject_color_hex():
        return {"color_hex": COLOR_HEX}

    @app.route("/admin")
    @app.route("/admin/<path:path>")
    def serve_admin_app(path=""):
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
        build_dir = os.path.join(project_root, "build")
        if path in {"", "."}:
            return send_from_directory(build_dir, "index.html")
        if path.startswith("static/"):
            return send_from_directory(build_dir, path)
        return send_from_directory(build_dir, "index.html")

    @app.route("/")
    def home():
        # Homepage shows a handful of featured products; full catalog lives
        # on /products.
        featured_products = Product.query.order_by(Product.id).limit(4).all()
        testimonials = (
            Testimonial.query.filter_by(status="approved")
            .order_by(Testimonial.created_at.desc())
            .limit(6)
            .all()
        )
        return render_template("home.html", products=featured_products, testimonials=testimonials)

    @app.route("/products")
    def products_page():
        products = Product.query.order_by(Product.id).all()
        return render_template("products.html", products=products)

    @app.route("/projects")
    def projects_page():
        projects = Project.query.order_by(Project.created_at.desc()).all()
        return render_template("projects.html", projects=projects)

    @app.route("/quote-calculator")
    def quote_calculator_page():
        products = Product.query.order_by(Product.id).all()
        return render_template("quote_calculator.html", products=products)

    @app.route("/get-quote")
    def get_quote_page():
        products = Product.query.order_by(Product.id).all()
        return render_template("get_quote.html", products=products)

    @app.route("/about")
    def about_page():
        return render_template("about.html")

    @app.route("/blog")
    def blog_page():
        return render_template("blog.html")

    @app.route("/faqs")
    def faqs_page():
        return render_template("faqs.html")

    @app.route("/contact")
    def contact_page():
        return render_template("contact.html")

    @app.route("/login")
    def admin_login_redirect():
        admin_login_target = Config.ADMIN_APP_URL.rstrip("/")
        if not admin_login_target.startswith(("http://", "https://")):
            admin_login_target = f"/{admin_login_target.lstrip('/')}"
        if not admin_login_target.endswith("/login"):
            admin_login_target = f"{admin_login_target}/login"
        return redirect(admin_login_target, code=307)

    # ---------- Admin auth (JSON API used by the React admin app) ----------

    @app.route("/api/admin/login", methods=["POST"])
    def api_admin_login():
        data = request.get_json(silent=True) or {}
        password = data.get("password", "")
        if password == Config.ADMIN_PASSWORD:
            session["admin_logged_in"] = True
            return jsonify({"authenticated": True})
        return jsonify({"authenticated": False, "error": "Incorrect password"}), 401

    @app.route("/api/admin/logout", methods=["POST"])
    def api_admin_logout():
        session.pop("admin_logged_in", None)
        return jsonify({"authenticated": False})

    @app.route("/api/admin/me", methods=["GET"])
    def api_admin_me():
        return jsonify({"authenticated": bool(session.get("admin_logged_in"))})

    # ---------- Products API ----------

    @app.route("/api/products", methods=["GET"])
    def list_products():
        """Supports ?category=aluminium&use_case=residential&q=sliding"""
        query = Product.query

        category = request.args.get("category")
        if category and category != "all":
            query = query.filter(Product.category == category)

        use_case = request.args.get("use_case")
        if use_case and use_case != "all":
            query = query.filter(Product.use_case.contains(use_case))

        q = request.args.get("q")
        if q:
            query = query.filter(Product.name.ilike(f"%{q}%"))

        products = query.order_by(Product.id).all()
        return jsonify([p.to_dict() for p in products])

    @app.route("/api/products/<int:product_id>", methods=["GET"])
    def get_product(product_id):
        product = Product.query.get_or_404(product_id)
        return jsonify(product.to_dict())

    @app.route("/api/products/upload-image", methods=["POST"])
    @require_admin_key
    def upload_product_image():
        """
        Accepts multipart/form-data with a single 'image' file field.
        Returns {"url": "/static/images/xxxx.jpg"} -- the admin
        UI then saves that URL onto the product's image_url field via the
        normal create/update product calls. Kept as a separate endpoint
        (rather than bundled into create/update) so the image can be
        uploaded and previewed before the rest of the form is submitted.
        """
        if "image" not in request.files:
            return jsonify({"error": "No image file provided (expected field name 'image')"}), 400

        file = request.files["image"]
        if not file or file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not allowed_image_file(file.filename):
            return jsonify({
                "error": f"File type not allowed: {file.filename}. "
                         f"Allowed: {', '.join(Config.ALLOWED_IMAGE_EXTENSIONS)}"
            }), 400

        image_url = save_uploaded_image(app, file)
        return jsonify({"url": image_url}), 201

    @app.route("/api/products", methods=["POST"])
    @require_admin_key
    def create_product():
        data = request.get_json(silent=True) or {}
        required = ["name", "category", "use_case", "base_rate_per_m2"]
        missing = [f for f in required if data.get(f) in (None, "")]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        try:
            rate = float(data["base_rate_per_m2"])
        except (TypeError, ValueError):
            return jsonify({"error": "base_rate_per_m2 must be a number"}), 400

        product = Product(
            name=data["name"].strip(),
            category=data["category"].strip().lower(),
            use_case=data["use_case"].strip().lower(),
            description=data.get("description", "").strip(),
            dimensions=data.get("dimensions", "").strip(),
            glass_thickness=data.get("glass_thickness", "").strip(),
            frame_colors=data.get("frame_colors", "").strip(),
            energy_rating=data.get("energy_rating", "").strip(),
            base_rate_per_m2=rate,
            image_url=data.get("image_url", "").strip(),
        )
        db.session.add(product)
        db.session.commit()
        return jsonify(product.to_dict()), 201

    @app.route("/api/products/<int:product_id>", methods=["PUT"])
    @require_admin_key
    def update_product(product_id):
        product = Product.query.get_or_404(product_id)
        data = request.get_json(silent=True) or {}

        editable_fields = [
            "name", "category", "use_case", "description", "dimensions",
            "glass_thickness", "frame_colors", "energy_rating", "image_url",
        ]
        for field in editable_fields:
            if field in data:
                value = data[field]
                setattr(product, field, value.strip() if isinstance(value, str) else value)

        if "base_rate_per_m2" in data:
            try:
                product.base_rate_per_m2 = float(data["base_rate_per_m2"])
            except (TypeError, ValueError):
                return jsonify({"error": "base_rate_per_m2 must be a number"}), 400

        db.session.commit()
        return jsonify(product.to_dict())

    @app.route("/api/products/<int:product_id>", methods=["DELETE"])
    @require_admin_key
    def delete_product(product_id):
        product = Product.query.get_or_404(product_id)
        db.session.delete(product)
        db.session.commit()
        return jsonify({"message": f"Deleted product #{product_id}"}), 200

    # ---------- Quote calculator ----------

    @app.route("/api/quote-calculator", methods=["POST"])
    def quote_calculator():
        """
        Body (JSON): { product_id, width_mm, height_mm, quantity,
                        glass_multiplier, color_multiplier }
        Returns a ballpark estimate computed server-side (mirrors the
        client-side JS calculator, but this is the source of truth).
        """
        data = request.get_json(silent=True) or {}

        try:
            product_id = int(data["product_id"])
            width_mm = float(data["width_mm"])
            height_mm = float(data["height_mm"])
            quantity = int(data.get("quantity", 1))
            glass_mult = float(data.get("glass_multiplier", 1))
            color_mult = float(data.get("color_multiplier", 1))
        except (KeyError, ValueError, TypeError):
            return jsonify({"error": "Invalid or missing input"}), 400

        if width_mm <= 0 or height_mm <= 0 or quantity <= 0:
            return jsonify({"error": "Dimensions and quantity must be positive"}), 400

        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Unknown product_id"}), 404

        area_m2_each = (width_mm / 1000) * (height_mm / 1000)
        total_area_m2 = area_m2_each * quantity
        unit_price = area_m2_each * product.base_rate_per_m2 * glass_mult * color_mult
        total_price = unit_price * quantity

        return jsonify({
            "product": product.name,
            "area_m2_each": round(area_m2_each, 2),
            "total_area_m2": round(total_area_m2, 2),
            "base_rate_per_m2": product.base_rate_per_m2,
            "unit_price": round(unit_price, 2),
            "quantity": quantity,
            "total_price": round(total_price, 2),
            "currency": "KES",
        })

    # ---------- Quote requests (with file upload) ----------

    @app.route("/api/quote-requests", methods=["POST"])
    def create_quote_request():
        """
        Expects multipart/form-data:
          name, phone, email, location, product, measurements, notes
          files  (0 or more, field name "files")
        """
        form = request.form
        required = ["name", "phone", "email", "location", "product"]
        missing = [f for f in required if not form.get(f)]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        quote = QuoteRequest(
            name=form["name"].strip(),
            phone=form["phone"].strip(),
            email=form["email"].strip(),
            location=form["location"].strip(),
            product=form["product"].strip(),
            measurements=form.get("measurements", "").strip(),
            notes=form.get("notes", "").strip(),
        )
        db.session.add(quote)
        db.session.flush()  # assigns quote.id before we commit, so we can use it in the folder path

        saved_files = []
        upload_files = request.files.getlist("files")
        quote_folder = os.path.join(app.config["UPLOAD_FOLDER"], str(quote.id))

        for file in upload_files:
            if not file or file.filename == "":
                continue
            if not allowed_file(file.filename):
                db.session.rollback()
                return jsonify({
                    "error": f"File type not allowed: {file.filename}. "
                             f"Allowed: {', '.join(Config.ALLOWED_EXTENSIONS)}"
                }), 400

            os.makedirs(quote_folder, exist_ok=True)
            safe_name = secure_filename(file.filename)
            unique_name = f"{uuid.uuid4().hex[:8]}_{safe_name}"
            disk_path = os.path.join(quote_folder, unique_name)
            file.save(disk_path)

            relative_url = f"/static/uploads/quotes/{quote.id}/{unique_name}"
            db.session.add(QuoteFile(
                quote_request_id=quote.id,
                filename=file.filename,
                stored_path=relative_url,
            ))
            saved_files.append(relative_url)

        db.session.commit()

        # Fires email + WhatsApp notifications to staff. Both fail silently
        # if unconfigured (see .env.example) or if the send itself fails --
        # a notification problem should never break the customer's
        # submission, which is already safely saved above.
        notify_new_quote_request(quote)

        return jsonify({
            "message": "Quote request received. Our team will contact you within 24 hours.",
            "quote_request": quote.to_dict(),
        }), 201

    @app.route("/api/quote-requests", methods=["GET"])
    @require_admin_key
    def list_quote_requests():
        """Admin-only: list quote requests, newest first, paginated.

        Query params:
          status    - filter by status (optional)
          page      - 1-indexed page number (default 1)
          per_page  - items per page (default 20, max 100)
        """
        status = request.args.get("status")

        try:
            page = max(1, int(request.args.get("page", 1)))
        except ValueError:
            page = 1
        try:
            per_page = int(request.args.get("per_page", 20))
        except ValueError:
            per_page = 20
        per_page = max(1, min(per_page, 100))  # clamp to a sane range

        query = QuoteRequest.query
        if status:
            query = query.filter(QuoteRequest.status == status)
        query = query.order_by(QuoteRequest.created_at.desc())

        total = query.count()
        total_pages = max(1, (total + per_page - 1) // per_page)
        items = query.offset((page - 1) * per_page).limit(per_page).all()

        return jsonify({
            "items": [q.to_dict() for q in items],
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
        })

    @app.route("/api/quote-requests/<int:quote_id>", methods=["GET"])
    @require_admin_key
    def get_quote_request(quote_id):
        quote = QuoteRequest.query.get_or_404(quote_id)
        return jsonify(quote.to_dict())

    @app.route("/api/quote-requests/<int:quote_id>/status", methods=["PATCH"])
    @require_admin_key
    def update_quote_status(quote_id):
        quote = QuoteRequest.query.get_or_404(quote_id)
        data = request.get_json(silent=True) or {}
        new_status = data.get("status")
        allowed = {"new", "contacted", "quoted", "won", "lost"}
        if new_status not in allowed:
            return jsonify({"error": f"status must be one of {sorted(allowed)}"}), 400
        quote.status = new_status
        db.session.commit()
        return jsonify(quote.to_dict())

    # ---------- Contact messages ----------

    @app.route("/api/contact", methods=["POST"])
    def create_contact_message():
        data = request.get_json(silent=True) or request.form
        required = ["name", "email", "message"]
        missing = [f for f in required if not data.get(f)]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        msg = ContactMessage(
            name=data["name"].strip(),
            email=data["email"].strip(),
            message=data["message"].strip(),
        )
        db.session.add(msg)
        db.session.commit()
        return jsonify({"message": "Message received.", "contact": msg.to_dict()}), 201

    @app.route("/api/contact", methods=["GET"])
    @require_admin_key
    def list_contact_messages():
        messages = ContactMessage.query.order_by(ContactMessage.created_at.desc()).all()
        return jsonify([m.to_dict() for m in messages])

    # ---------- Testimonials ----------

    @app.route("/api/testimonials", methods=["POST"])
    def create_testimonial():
        """Public submission. Always starts as 'pending' -- it will not
        show up anywhere on the public site until an admin approves it.
        """
        data = request.get_json(silent=True) or request.form
        required = ["name", "message"]
        missing = [f for f in required if not data.get(f)]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        try:
            rating = int(data.get("rating", 5))
        except (TypeError, ValueError):
            rating = 5
        rating = max(1, min(rating, 5))

        testimonial = Testimonial(
            name=data["name"].strip(),
            location=data.get("location", "").strip(),
            message=data["message"].strip(),
            rating=rating,
            status="pending",
        )
        db.session.add(testimonial)
        db.session.commit()

        return jsonify({
            "message": "Thank you! Your testimonial has been submitted and will appear once approved.",
            "testimonial": testimonial.to_dict(),
        }), 201

    @app.route("/api/testimonials", methods=["GET"])
    def list_public_testimonials():
        """Public: only ever returns approved testimonials."""
        testimonials = (
            Testimonial.query.filter_by(status="approved")
            .order_by(Testimonial.created_at.desc())
            .all()
        )
        return jsonify([t.to_dict() for t in testimonials])

    @app.route("/api/testimonials/admin", methods=["GET"])
    @require_admin_key
    def list_all_testimonials():
        """Admin-only: every testimonial regardless of status.
        Supports ?status=pending|approved|declined
        """
        status = request.args.get("status")
        query = Testimonial.query
        if status:
            query = query.filter_by(status=status)
        testimonials = query.order_by(Testimonial.created_at.desc()).all()
        return jsonify([t.to_dict() for t in testimonials])

    @app.route("/api/testimonials/<int:testimonial_id>/status", methods=["PATCH"])
    @require_admin_key
    def update_testimonial_status(testimonial_id):
        testimonial = Testimonial.query.get_or_404(testimonial_id)
        data = request.get_json(silent=True) or {}
        new_status = data.get("status")
        if new_status not in {"pending", "approved", "declined"}:
            return jsonify({"error": "status must be one of: pending, approved, declined"}), 400
        testimonial.status = new_status
        db.session.commit()
        return jsonify(testimonial.to_dict())

    @app.route("/api/testimonials/<int:testimonial_id>", methods=["DELETE"])
    @require_admin_key
    def delete_testimonial(testimonial_id):
        testimonial = Testimonial.query.get_or_404(testimonial_id)
        db.session.delete(testimonial)
        db.session.commit()
        return jsonify({"message": f"Deleted testimonial #{testimonial_id}"})

    # ---------- Projects (before/after portfolio) ----------

    @app.route("/api/projects", methods=["GET"])
    def list_projects():
        category = request.args.get("category")
        query = Project.query
        if category and category != "all":
            query = query.filter_by(category=category)
        projects = query.order_by(Project.created_at.desc()).all()
        return jsonify([p.to_dict() for p in projects])

    @app.route("/api/projects/upload-image", methods=["POST"])
    @require_admin_key
    def upload_project_image():
        """Same pattern as the product image uploader. The admin UI calls
        this twice per project -- once for the 'before' photo, once for
        'after' -- then sends both resulting URLs when creating/updating
        the project.
        """
        if "image" not in request.files:
            return jsonify({"error": "No image file provided (expected field name 'image')"}), 400

        file = request.files["image"]
        if not file or file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not allowed_image_file(file.filename):
            return jsonify({
                "error": f"File type not allowed: {file.filename}. "
                         f"Allowed: {', '.join(Config.ALLOWED_IMAGE_EXTENSIONS)}"
            }), 400

        image_url = save_uploaded_image(app, file)
        return jsonify({"url": image_url}), 201

    @app.route("/api/projects", methods=["POST"])
    @require_admin_key
    def create_project():
        data = request.get_json(silent=True) or {}
        required = ["title", "before_image_url", "after_image_url"]
        missing = [f for f in required if not data.get(f)]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        project = Project(
            title=data["title"].strip(),
            caption=data.get("caption", "").strip(),
            category=data.get("category", "residential").strip(),
            before_image_url=data["before_image_url"].strip(),
            after_image_url=data["after_image_url"].strip(),
        )
        db.session.add(project)
        db.session.commit()
        return jsonify(project.to_dict()), 201

    @app.route("/api/projects/<int:project_id>", methods=["PUT"])
    @require_admin_key
    def update_project(project_id):
        project = Project.query.get_or_404(project_id)
        data = request.get_json(silent=True) or {}

        for field in ["title", "caption", "category", "before_image_url", "after_image_url"]:
            if field in data:
                setattr(project, field, data[field].strip() if isinstance(data[field], str) else data[field])

        db.session.commit()
        return jsonify(project.to_dict())

    @app.route("/api/projects/<int:project_id>", methods=["DELETE"])
    @require_admin_key
    def delete_project(project_id):
        project = Project.query.get_or_404(project_id)
        db.session.delete(project)
        db.session.commit()
        return jsonify({"message": f"Deleted project #{project_id}"})

    # ---------- Health check ----------

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok"})


app = create_app()


def open_homepage_in_browser():
    webbrowser.open("http://127.0.0.1:5000/", new=0, autoraise=True)


if __name__ == "__main__":
    if os.environ.get("FLASK_ENV") != "production":
        threading.Timer(1.0, open_homepage_in_browser).start()
    app.run(debug=True, port=5000)