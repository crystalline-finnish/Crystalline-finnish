from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class QuoteRequest(db.Model):
    """A submission from the 'Request a Quote' form."""
    __tablename__ = "quote_requests"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(40), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    location = db.Column(db.String(150), nullable=False)
    product = db.Column(db.String(120), nullable=False)
    measurements = db.Column(db.String(255))
    notes = db.Column(db.Text)
    status = db.Column(db.String(30), default="new")  # new / contacted / quoted / won / lost
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    files = db.relationship(
        "QuoteFile", backref="quote_request", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "email": self.email,
            "location": self.location,
            "product": self.product,
            "measurements": self.measurements,
            "notes": self.notes,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "files": [
                {"filename": f.filename, "url": f.stored_path}
                for f in self.files
            ],
        }


class QuoteFile(db.Model):
    """An uploaded plan/photo attached to a QuoteRequest."""
    __tablename__ = "quote_files"

    id = db.Column(db.Integer, primary_key=True)
    quote_request_id = db.Column(
        db.Integer, db.ForeignKey("quote_requests.id"), nullable=False
    )
    filename = db.Column(db.String(255), nullable=False)   # original filename shown to user
    stored_path = db.Column(db.String(400), nullable=False)  # path on disk / URL


class Product(db.Model):
    """A catalog product, exposed via /api/products for the storefront."""
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), nullable=False)   # e.g. "aluminium", "upvc", "glass"
    use_case = db.Column(db.String(50), nullable=False)    # "residential" / "commercial" / "both"
    description = db.Column(db.Text)
    dimensions = db.Column(db.String(120))
    glass_thickness = db.Column(db.String(120))
    frame_colors = db.Column(db.String(200))               # comma-separated
    energy_rating = db.Column(db.String(120))
    base_rate_per_m2 = db.Column(db.Float)                 # used by the quote calculator
    image_url = db.Column(db.String(400))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "use_case": self.use_case,
            "description": self.description,
            "dimensions": self.dimensions,
            "glass_thickness": self.glass_thickness,
            "frame_colors": self.frame_colors.split(",") if self.frame_colors else [],
            "energy_rating": self.energy_rating,
            "base_rate_per_m2": self.base_rate_per_m2,
            "image_url": self.image_url,
        }


class ContactMessage(db.Model):
    """A generic contact-us message (separate from a quote request)."""
    __tablename__ = "contact_messages"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "message": self.message,
            "created_at": self.created_at.isoformat(),
        }


class Testimonial(db.Model):
    """A customer-submitted testimonial. Starts as 'pending' and only
    shows on the public site once an admin marks it 'approved'.
    """
    __tablename__ = "testimonials"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    location = db.Column(db.String(150))          # e.g. "Kileleshwa, Nairobi"
    message = db.Column(db.Text, nullable=False)
    rating = db.Column(db.Integer, default=5)       # 1-5 stars
    status = db.Column(db.String(20), default="pending")  # pending / approved / declined
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "message": self.message,
            "rating": self.rating,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }


class Project(db.Model):
    """A before/after portfolio entry shown on the Projects page. Admin
    uploads exactly two photos (before + after) per entry.
    """
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)      # e.g. "Kileleshwa Residence"
    caption = db.Column(db.String(255))                     # e.g. "Aluminium sliding windows, 12 openings"
    category = db.Column(db.String(50), default="residential")  # residential / commercial / apartments / offices
    before_image_url = db.Column(db.String(400), nullable=False)
    after_image_url = db.Column(db.String(400), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "caption": self.caption,
            "category": self.category,
            "before_image_url": self.before_image_url,
            "after_image_url": self.after_image_url,
            "created_at": self.created_at.isoformat(),
        }
