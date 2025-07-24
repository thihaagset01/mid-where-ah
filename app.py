from flask import Flask, render_template, request, redirect, url_for, jsonify, session, Blueprint
from flask_cors import CORS
import os
import json
from dotenv import load_dotenv
from functools import wraps

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key')
CORS(app)

# Define blueprints
auth_bp = Blueprint('auth', __name__, url_prefix='/auth')
mobile_bp = Blueprint('mobile', __name__, url_prefix='/mobile')
api_bp = Blueprint('api', __name__, url_prefix='/api')

# Helper function to get Firebase configuration
def get_firebase_config():
    # First try to get the complete Firebase config JSON
    firebase_config_json = os.environ.get('FIREBASE_CONFIG')
    if firebase_config_json:
        try:
            config = json.loads(firebase_config_json)
            # Validate that we have the minimum required fields
            if config.get('apiKey') and config.get('authDomain') and config.get('projectId'):
                print("Using Firebase config from FIREBASE_CONFIG environment variable")
                return config
            else:
                print("Warning: FIREBASE_CONFIG is missing required fields")
        except json.JSONDecodeError:
            print("Error: FIREBASE_CONFIG is not valid JSON")
    
    # Fallback to individual environment variables
    api_key = os.environ.get('FIREBASE_API_KEY')
    auth_domain = os.environ.get('FIREBASE_AUTH_DOMAIN')
    project_id = os.environ.get('FIREBASE_PROJECT_ID')
    
    if not (api_key and auth_domain and project_id):
        print("Warning: Missing required Firebase configuration values")
    
    config = {
        "apiKey": api_key,
        "authDomain": auth_domain,
        "projectId": project_id,
        "storageBucket": os.environ.get('FIREBASE_STORAGE_BUCKET'),
        "messagingSenderId": os.environ.get('FIREBASE_MESSAGING_SENDER_ID'),
        "appId": os.environ.get('FIREBASE_APP_ID'),
        "measurementId": os.environ.get('FIREBASE_MEASUREMENT_ID')
    }
    
    print(f"Using Firebase config from individual environment variables")
    return config

# Create a context processor to make config available to all templates
@app.context_processor
def inject_config():
    return dict(
        firebase_config=get_firebase_config(),
        google_maps_api_key=os.environ.get('GOOGLE_MAPS_API_KEY')
    )

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # In a real app, you would check session or Firebase auth status here
        # For now, we'll just pass through since client-side auth is handling this
        return f(*args, **kwargs)
    return decorated_function

# Main routes
@app.route('/')
def index():
    """Landing page - Serves landing page with auth check
    
    If the user is already authenticated (client-side Firebase auth),
    they will be automatically redirected to the app via JavaScript.
    If not authenticated, they'll see login/signup buttons.
    """
    print('Serving landing page from root route')
    return render_template('landing.html')

@app.route('/view_map')
def view_map():
    return render_template('view_map.html')
@app.route('/app')
@login_required
def home():
    """Mobile interface - Custom CSS mobile app"""
    print('Mobile interface activated')
    # Get any query parameters for group joining
    group_code = request.args.get('group')
    user_name = request.args.get('name')
    
    return render_template('mobile_home.html', 
                         group_code=group_code, 
                         user_name=user_name)


# Auth blueprint routes
@auth_bp.route('/login')
def login():
    """Login page"""
    firebase_config = get_firebase_config()
    return render_template('login.html', firebase_config=firebase_config, is_auth_page=True)

@auth_bp.route('/logout')
def logout():
    """Logout and redirect to login page"""
    # Clear session if you're using it
    session.clear()
    return redirect(url_for('index'))

# Mobile blueprint routes
@mobile_bp.route('/groups')
@login_required
def groups():
    """Groups management page - mobile interface"""
    return render_template('group.html')

@mobile_bp.route('/profile')
@login_required
def profile():
    """Profile page - mobile interface"""
    return render_template('profile.html')

@mobile_bp.route('/group_chat')
@login_required
def group_chat():
    """Group chat - mobile interface"""
    return render_template('group_chat.html')

@mobile_bp.route('/venues/<group_id>')
@login_required
def venues(group_id):
    """Venues page - mobile interface"""
    return render_template('venues.html', group_id=group_id)

@mobile_bp.route('/swipe/<group_id>')
@login_required
def swipe(group_id):
    """Swipe interface - mobile interface"""
    return render_template('swipe.html', group_id=group_id)

# Utility routes
@app.route('/join')
def join_group():
    """Handle group joining from external links"""
    group_code = request.args.get('code')
    if group_code:
        return redirect(url_for('home', group=group_code))
    else:
        return redirect(url_for('index'))

@app.route('/quick-start')
def quick_start():
    """Quick start - bypass landing page, go straight to mobile interface"""
    return redirect(url_for('home'))

# API blueprint routes
@api_bp.route('/user', methods=['GET', 'POST'])
@login_required
def user_api():
    """User API endpoint"""
    if request.method == 'POST':
        # Handle user creation/update
        return jsonify({"status": "success"})
    else:
        # Return user data
        return jsonify({"status": "success", "data": {}})

@api_bp.route('/group', methods=['GET', 'POST'])
@login_required
def group_api():
    """Group API endpoint"""
    if request.method == 'POST':
        # Handle group creation/update
        return jsonify({"status": "success"})
    else:
        # Return group data
        return jsonify({"status": "success", "data": {}})

@api_bp.route('/venues', methods=['GET'])
@login_required
def venues_api():
    """Calculate and return venue recommendations"""
    return jsonify({"status": "success", "data": []})

@api_bp.route('/join-group', methods=['POST'])
def join_group_api():
    """Handle group joining via API"""
    data = request.get_json()
    group_code = data.get('group_code')
    user_name = data.get('user_name')
    
    # TODO: Implement actual group joining logic
    # For now, just return success
    return jsonify({
        "status": "success", 
        "redirect_url": url_for('home', group=group_code, name=user_name)
    })

# ERROR HANDLERS
@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors - redirect to landing page"""
    return redirect(url_for('index'))

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return render_template('error.html', error="Internal server error"), 500

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(mobile_bp)
app.register_blueprint(api_bp)

# Map old routes to new ones for backward compatibility
@app.route('/login')
def legacy_login():
    return redirect(url_for('auth.login'))

@app.route('/groups')
def legacy_groups():
    return redirect(url_for('mobile.groups'))

@app.route('/profile')
def legacy_profile():
    return redirect(url_for('mobile.profile'))

@app.route('/group_chat')
def legacy_group_chat():
    return redirect(url_for('mobile.group_chat'))

@app.route('/venues/<group_id>')
def legacy_venues(group_id):
    return redirect(url_for('mobile.venues', group_id=group_id))

@app.route('/swipe/<group_id>')
def legacy_swipe(group_id):
    return redirect(url_for('mobile.swipe', group_id=group_id))

if __name__ == '__main__':
    app.run(debug=True)