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

# Routes
@app.route('/profile')
def profile():
    return render_template('profile.html')
@app.route('/')
def index():
    print('activated')
    return render_template('mobile_home.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    # In a real app, we would check if user is authenticated here
    return render_template('dashboard.html')

@app.route('/groups')
def groups():
    # Redirected from bottom nav, shows all user groups
    return render_template('group.html')

@app.route('/group_chat')
def group_chat():
    # In a real app, we would fetch group data from Firestore
    return render_template('group_chat.html')

@app.route('/venues/<group_id>')
def venues(group_id):
    # In a real app, we would calculate venues based on group locations
    return render_template('venues.html', group_id=group_id)

@app.route('/swipe/<group_id>')
def swipe(group_id):
    # In a real app, we would fetch venue options for swiping
    return render_template('swipe.html', group_id=group_id)

# API endpoints
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
    # Calculate and return venue recommendations
    return jsonify({"status": "success", "data": []})

if __name__ == '__main__':
    app.run(debug=True)
