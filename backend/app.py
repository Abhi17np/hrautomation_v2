from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from pymongo import MongoClient
from datetime import timedelta
import os
import os
from datetime import timedelta

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))




app = Flask(__name__)
app.url_map.strict_slashes = False
CORS(app,
     resources={r"/api/*": {"origins": "*"}},
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

app.config['JWT_SECRET_KEY']            = os.getenv('JWT_SECRET_KEY', 'dev-secret-change-in-prod')
app.config['JWT_ACCESS_TOKEN_EXPIRES']  = timedelta(hours=8)
app.config['STORAGE_ROOT']              = os.path.join(os.getcwd(), 'storage')
app.config['UPLOAD_FOLDER']             = os.path.join(os.getcwd(), 'storage')
app.config['MONGO_URI']                 = os.getenv('MONGO_URI', 'mongodb://localhost:27017/hr_offer_letters')

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    return response

for d in ['templates', 'letters', 'documents', 'previews']:
    os.makedirs(os.path.join(app.config['STORAGE_ROOT'], d), exist_ok=True)

jwt    = JWTManager(app)
client = MongoClient(app.config['MONGO_URI'])
app.db = client.hr_offer_letters

from routes.auth               import auth_bp
from routes.employees          import employees_bp
from routes.templates          import templates_bp
from routes.letters            import letters_bp
from routes.approvals          import approvals_bp
from routes.exit               import exit_bp
from routes.appointment_orders import appointment_orders_bp
from routes.documents          import documents_bp
from routes.leaves             import leaves_bp
from routes.attendance         import attendance_bp
from routes.payslips           import payslips_bp

app.register_blueprint(auth_bp,               url_prefix='/api/auth')
app.register_blueprint(employees_bp,          url_prefix='/api/employees')
app.register_blueprint(templates_bp,          url_prefix='/api/templates')
app.register_blueprint(letters_bp,            url_prefix='/api/letters')
app.register_blueprint(approvals_bp,          url_prefix='/api/approvals')
app.register_blueprint(exit_bp,               url_prefix='/api/exit')
app.register_blueprint(appointment_orders_bp, url_prefix='/api/appointment-orders')
app.register_blueprint(documents_bp,          url_prefix='/api/documents')
app.register_blueprint(leaves_bp,             url_prefix='/api/leaves')
app.register_blueprint(attendance_bp,         url_prefix='/api/attendance')
app.register_blueprint(payslips_bp,           url_prefix='/api/payslips')

@app.route('/')
def index():
    return {
        'status': 'ok',
        'message': 'HR Automation API is running',
        'version': '1.0.0'
    }

@app.errorhandler(404)
def not_found(e):    return {'error': 'Not found'}, 404

@app.errorhandler(500)
def server_error(e): return {'error': 'Internal server error'}, 500

# ── TEST ONLY — remove before production ─────────────────────────────────────
# from flask import jsonify
# @app.route('/api/test-scheduler')
# def test_scheduler():
#     from scheduler import run_checks_now
#     return jsonify(run_checks_now(app))

# ── Start background scheduler (birthday + anniversary emails) ────────────────
from scheduler import start_scheduler
start_scheduler(app)

# ── Start biometric attendance sync (guarded — a missing device/driver
#    should never take down the whole API) ────────────────────────────────────
try:
    from services.essl_sync import start_background_sync
    start_background_sync(app)
except Exception as e:
    print(f'[app.py] ESSL biometric sync not started: {e}', flush=True)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5050))
    # threaded=True is important: a slow/unreachable biometric device connection
    # (services/essl_sync.py) must not block every other API request while it
    # times out — without this, Flask's dev server handles one request at a time.
    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=False, threaded=True)