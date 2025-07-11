from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key')
CORS(app)

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    # In a real app, we would check if user is authenticated here
    return render_template('dashboard.html')

@app.route('/group/<group_id>')
def group(group_id):
    # In a real app, we would fetch group data from Firestore
    return render_template('group.html', group_id=group_id)

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
