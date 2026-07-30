"""
Production entry point.

Development:  python app.py           (Flask's built-in dev server)
Production:   gunicorn wsgi:app       (a real WSGI server -- see Procfile)

Flask's built-in server (app.run()) is single-threaded and not designed
to handle real traffic or concurrent requests safely. Gunicorn runs
multiple worker processes and is what most Flask hosting guides assume.
"""

from app import create_app

app = create_app()
