from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from flask_cors import CORS
import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key')
CORS(app)

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

# MAIN ROUTES - Proper separation
@app.route('/')
def index():
    """Landing page - Serves login page for new users, redirects authenticated users to dashboard
    
    This is the entry point for all users. The login page has client-side Firebase auth
    that will handle redirecting authenticated users to the dashboard.
    """
    print('Serving login page from root route')
    # Serve the login page - client-side Firebase auth will handle redirects for authenticated users
    return render_template('login.html')

@app.route('/app')
def mobile_interface():
    """Mobile interface - Custom CSS mobile app"""
    print('Mobile interface activated')
    # Get any query parameters for group joining
    group_code = request.args.get('group')
    user_name = request.args.get('name')
    
    return render_template('mobile_home.html', 
                         group_code=group_code, 
                         user_name=user_name)

@app.route('/login')
def login():
    """Login page - can redirect to mobile interface after auth"""
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    """Dashboard - redirect to mobile interface for now"""
    return redirect(url_for('mobile_interface'))

# MOBILE APP ROUTES - All use mobile_base.html
@app.route('/groups')
def groups():
    """Groups management page - mobile interface"""
    return render_template('group.html')

@app.route('/profile')
def profile():
    """Profile page - mobile interface"""
    return render_template('profile.html')

@app.route('/group_chat')
def group_chat():
    """Group chat - mobile interface"""
    return render_template('group_chat.html')

@app.route('/venues/<group_id>')
def venues(group_id):
    """Venues page - mobile interface"""
    return render_template('venues.html', group_id=group_id)

@app.route('/swipe/<group_id>')
def swipe(group_id):
    """Swipe interface - mobile interface"""
    return render_template('swipe.html', group_id=group_id)

# UTILITY ROUTES
@app.route('/join')
def join_group():
    """Handle group joining from external links"""
    group_code = request.args.get('code')
    if group_code:
        return redirect(url_for('mobile_interface', group=group_code))
    else:
        return redirect(url_for('index'))

@app.route('/quick-start')
def quick_start():
    """Quick start - bypass landing page, go straight to mobile interface"""
    return redirect(url_for('mobile_interface'))

# API ENDPOINTS
@app.route('/api/user', methods=['GET', 'POST'])
def user_api():
    if request.method == 'POST':
        # Handle user creation/update
        return jsonify({"status": "success"})
    else:
        # Return user data
        return jsonify({"status": "success", "data": {}})

@app.route('/api/group', methods=['GET', 'POST'])
def group_api():
    if request.method == 'POST':
        # Handle group creation/update
        return jsonify({"status": "success"})
    else:
        # Return group data
        return jsonify({"status": "success", "data": {}})

@app.route('/api/venues', methods=['GET'])
def venues_api():
    """Calculate and return venue recommendations"""
    return jsonify({"status": "success", "data": []})

@app.route('/api/join-group', methods=['POST'])
def join_group_api():
    """Handle group joining via API"""
    data = request.get_json()
    group_code = data.get('group_code')
    user_name = data.get('user_name')
    
    # TODO: Implement actual group joining logic
    # For now, just return success
    return jsonify({
        "status": "success", 
        "redirect_url": url_for('mobile_interface', group=group_code, name=user_name)
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

if __name__ == '__main__':
    app.run(debug=True)