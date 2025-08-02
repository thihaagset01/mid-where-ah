from flask import Flask, render_template, request, redirect, url_for, jsonify, session, Blueprint, g
from flask_cors import CORS
import os
import json
from dotenv import load_dotenv
from functools import wraps

from scrape_timeout import scrape_events

# Import Firebase Admin modules
from firebase_admin import credentials, firestore
from firebase_admin_config import verify_firebase_token

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key')
CORS(app)

# =============================================================================
# BLUEPRINTS
# =============================================================================

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')
mobile_bp = Blueprint('mobile', __name__, url_prefix='/mobile')
api_bp = Blueprint('api', __name__, url_prefix='/api')

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_firebase_config():
    """Get Firebase configuration from environment variables"""
    # Try complete Firebase config JSON first
    firebase_config_json = os.environ.get('FIREBASE_CONFIG')
    if firebase_config_json:
        try:
            config = json.loads(firebase_config_json)
            if config.get('apiKey') and config.get('authDomain') and config.get('projectId'):
                print("Using Firebase config from FIREBASE_CONFIG environment variable")
                return config
        except json.JSONDecodeError:
            print("Error: FIREBASE_CONFIG is not valid JSON")
    
    # Fallback to individual environment variables
    config = {
        "apiKey": os.environ.get('FIREBASE_API_KEY'),
        "authDomain": os.environ.get('FIREBASE_AUTH_DOMAIN'),
        "projectId": os.environ.get('FIREBASE_PROJECT_ID'),
        "storageBucket": os.environ.get('FIREBASE_STORAGE_BUCKET'),
        "messagingSenderId": os.environ.get('FIREBASE_MESSAGING_SENDER_ID'),
        "appId": os.environ.get('FIREBASE_APP_ID'),
        "measurementId": os.environ.get('FIREBASE_MEASUREMENT_ID')
    }
    
    if not (config['apiKey'] and config['authDomain'] and config['projectId']):
        print("Warning: Missing required Firebase configuration values")
    
    return config

@app.route('/api/events')
def api_events():
    events = scrape_events("https://www.visitsingapore.com/whats-happening/all-happenings/")
    return jsonify(events)  # pass a Python list/dict, NOT json.dumps

@app.context_processor
def inject_config():
    """Make configuration available to all templates"""
    return dict(
        firebase_config=get_firebase_config(),
        google_maps_api_key=os.environ.get('GOOGLE_MAPS_API_KEY')
    )

def login_required(f):
    """Authentication decorator for protected routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get ID token from request
        id_token = None
        
        # Check Authorization header first
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            id_token = auth_header.split('Bearer ')[1]
        
        # Check session
        if not id_token and 'id_token' in session:
            id_token = session['id_token']
            
        # Check cookies
        if not id_token:
            id_token = request.cookies.get('id_token')
            if id_token:
                session['id_token'] = id_token
        
        if not id_token:
            return redirect(url_for('auth.login'))
        
        try:
            # Verify token
            decoded_token = verify_firebase_token(id_token)
            
            # Store user info in g and session
            g.user = decoded_token
            session['id_token'] = id_token
            session['user_email'] = decoded_token.get('email')
            
            # Ensure user data in session
            session['user'] = {
                'uid': decoded_token.get('uid'),
                'email': decoded_token.get('email'),
                'name': decoded_token.get('name', decoded_token.get('email')),
                'photoURL': decoded_token.get('picture')
            }
            
            return f(*args, **kwargs)
            
        except Exception as e:
            print(f"Token verification failed: {e}")
            session.pop('id_token', None)
            return redirect(url_for('auth.login'))
    
    return decorated_function

# =============================================================================
# MAIN ROUTES
# =============================================================================

@app.route('/')
def index():
    """Landing page"""
    return render_template('landing.html')

@app.route('/app')
@login_required
def home():
    """Mobile app home interface"""
    group_code = request.args.get('group')
    user_name = request.args.get('name')
    return render_template('mobile_home.html', group_code=group_code, user_name=user_name)

@app.route('/join/<invite_code>')
def join_group_direct(invite_code):
    """Handle direct invite links"""
    return render_template('group.html', invite_code=invite_code)

@app.route('/event_map_manager')
def event_map_manager():
    """Map view page"""
    event_id = request.args.get('eventId')
    return render_template('event_map_manager.html', event_id=event_id)

# =============================================================================
# AUTH BLUEPRINT ROUTES
# =============================================================================

@auth_bp.route('/login')
def login():
    """Login page"""
    firebase_config = get_firebase_config()
    return render_template('login.html', firebase_config=firebase_config, is_auth_page=True)

@auth_bp.route('/logout')
def logout():
    """Logout and clear session"""
    session.clear()
    response = redirect(url_for('index'))
    response.delete_cookie('id_token')
    return response

# =============================================================================
# MOBILE BLUEPRINT ROUTES
# =============================================================================

@mobile_bp.route('/groups')
@login_required
def groups():
    """Groups management page"""
    return render_template('group.html')

@mobile_bp.route('/group_chat')
@login_required
def group_chat():
    """Group chat interface"""
    group_id = request.args.get('groupId')
    if not group_id:
        return redirect(url_for('mobile.groups'))
    return render_template('group_chat.html', group_id=group_id)

@mobile_bp.route('/profile')
@login_required
def profile():
    """User profile page"""
    return render_template('profile.html')

@mobile_bp.route('/explore')
@login_required
def explore():
    """explore page"""
    return render_template('explore.html')

@mobile_bp.route('/venues/<group_id>')
@login_required
def venues(group_id):
    """Venues page for group"""
    return render_template('venues.html', group_id=group_id)

@mobile_bp.route('/swipe/<group_id>')
@login_required
def swipe(group_id):
    """Swipe interface for group"""
    return render_template('swipe.html', group_id=group_id)

# =============================================================================
# FRIENDS ROUTES
# =============================================================================

@app.route('/profile/friends')
@login_required
def friends():
    """Friends management page"""
    return render_template('friends.html')

# =============================================================================
# API BLUEPRINT ROUTES - FRIENDS
# =============================================================================

@app.route('/api/friends/search', methods=['GET'])
@login_required
def search_users():
    """Search for users to add as friends"""
    try:
        query = request.args.get('q', '').lower().strip()
        if len(query) < 2:
            return jsonify({'users': []})
            
        current_user_id = session['user']['uid']
        db = firestore.client()
        
        # Simple user search (optimize this with proper search index in production)
        all_users = db.collection('users').limit(50).get()
        users = []
        
        for user_doc in all_users:
            user_data = user_doc.to_dict()
            
            # Search in name, email, username
            if (user_data.get('name', '').lower().find(query) >= 0 or 
                user_data.get('email', '').lower().find(query) >= 0 or
                user_data.get('username', '').lower().find(query) >= 0):
                
                # Skip current user
                if user_doc.id == current_user_id:
                    continue
                
                # Add userId and check friendship status
                user_data['userId'] = user_doc.id
                
                # Check if already friends
                try:
                    friendship = db.collection('users').document(current_user_id)\
                                   .collection('friends').document(user_doc.id).get()
                    user_data['isFriend'] = friendship.exists
                except:
                    user_data['isFriend'] = False
                
                # Check pending requests
                try:
                    pending_requests = db.collection('friend_requests')\
                                        .where('fromUserId', '==', current_user_id)\
                                        .where('toUserId', '==', user_doc.id)\
                                        .where('status', '==', 'pending').get()
                    user_data['requestPending'] = len(pending_requests) > 0
                except:
                    user_data['requestPending'] = False
                
                users.append(user_data)
        
        return jsonify({'users': users})
        
    except Exception as e:
        print(f"Error in search_users: {e}")
        return jsonify({'error': 'Search failed'}), 500

@app.route('/api/friends/request', methods=['POST'])
@login_required
def send_friend_request():
    """Send a friend request"""
    try:
        data = request.get_json()
        to_user_id = data.get('toUserId')
        
        if not to_user_id:
            return jsonify({'error': 'Missing toUserId'}), 400
        
        current_user_id = session['user']['uid']
        current_user = session['user']
        db = firestore.client()
        
        # Check if request already exists
        existing_requests = db.collection('friend_requests')\
                              .where('fromUserId', '==', current_user_id)\
                              .where('toUserId', '==', to_user_id)\
                              .where('status', '==', 'pending').get()
        
        if existing_requests:
            return jsonify({'error': 'Friend request already sent'}), 400
        
        # Check if already friends
        friendship = db.collection('users').document(current_user_id)\
                       .collection('friends').document(to_user_id).get()
        
        if friendship.exists:
            return jsonify({'error': 'Already friends'}), 400
        
        # Get target user data
        to_user_doc = db.collection('users').document(to_user_id).get()
        if not to_user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        to_user_data = to_user_doc.to_dict()
        
        # Create friend request
        request_ref = db.collection('friend_requests').document()
        request_data = {
            'id': request_ref.id,
            'fromUserId': current_user_id,
            'fromUserName': current_user.get('name', ''),
            'fromUserEmail': current_user.get('email', ''),
            'fromUserPhotoURL': current_user.get('photoURL', ''),
            'toUserId': to_user_id,
            'toUserName': to_user_data.get('name', ''),
            'toUserEmail': to_user_data.get('email', ''),
            'status': 'pending',
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        
        request_ref.set(request_data)
        return jsonify({'message': 'Friend request sent successfully'})
        
    except Exception as e:
        print(f"Error sending friend request: {e}")
        return jsonify({'error': 'Failed to send friend request'}), 500

@app.route('/api/friends/requests', methods=['GET'])
@login_required
def get_friend_requests():
    """Get pending friend requests for current user"""
    try:
        current_user_id = session['user']['uid']
        db = firestore.client()
        
        # Get pending requests
        requests_query = db.collection('friend_requests')\
                          .where('toUserId', '==', current_user_id)\
                          .where('status', '==', 'pending')\
                          .order_by('createdAt', direction=firestore.Query.DESCENDING)
        
        requests = requests_query.get()
        request_list = []
        
        for doc in requests:
            request_data = doc.to_dict()
            # Convert timestamp for JSON serialization
            if 'createdAt' in request_data and hasattr(request_data['createdAt'], 'isoformat'):
                request_data['createdAt'] = request_data['createdAt'].isoformat()
            request_list.append(request_data)
        
        return jsonify({'requests': request_list})
        
    except Exception as e:
        print(f"Error getting friend requests: {e}")
        return jsonify({'error': 'Failed to get friend requests'}), 500

@app.route('/api/friends/request/<request_id>/accept', methods=['POST'])
@login_required
def accept_friend_request(request_id):
    """Accept a friend request"""
    try:
        current_user_id = session['user']['uid']
        db = firestore.client()
        
        # Get the friend request
        request_ref = db.collection('friend_requests').document(request_id)
        request_doc = request_ref.get()
        
        if not request_doc.exists:
            return jsonify({'error': 'Friend request not found'}), 404
        
        request_data = request_doc.to_dict()
        
        # Verify authorization
        if request_data['toUserId'] != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get current user data
        current_user_doc = db.collection('users').document(current_user_id).get()
        current_user_data = current_user_doc.to_dict() if current_user_doc.exists else {}
        
        # Use batch write for atomicity
        batch = db.batch()
        
        # Add to both users' friends collections
        current_user_friend_ref = db.collection('users').document(current_user_id)\
                                   .collection('friends').document(request_data['fromUserId'])
        
        other_user_friend_ref = db.collection('users').document(request_data['fromUserId'])\
                                 .collection('friends').document(current_user_id)
        
        # Create friend records
        batch.set(current_user_friend_ref, {
            'userId': request_data['fromUserId'],
            'name': request_data['fromUserName'],
            'email': request_data['fromUserEmail'],
            'photoURL': request_data.get('fromUserPhotoURL', ''),
            'friendsSince': firestore.SERVER_TIMESTAMP,
            'status': 'active'
        })
        
        batch.set(other_user_friend_ref, {
            'userId': current_user_id,
            'name': current_user_data.get('name', ''),
            'email': current_user_data.get('email', ''),
            'photoURL': current_user_data.get('photoURL', ''),
            'friendsSince': firestore.SERVER_TIMESTAMP,
            'status': 'active'
        })
        
        # Update request status
        batch.update(request_ref, {
            'status': 'accepted',
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        batch.commit()
        return jsonify({'success': True, 'message': 'Friend request accepted'})
        
    except Exception as e:
        print(f"Error accepting friend request: {e}")
        return jsonify({'error': 'Failed to accept friend request'}), 500

@app.route('/api/friends/request/<request_id>/decline', methods=['POST'])
@login_required
def decline_friend_request(request_id):
    """Decline a friend request"""
    try:
        current_user_id = session['user']['uid']
        db = firestore.client()
        
        # Get and verify request
        request_ref = db.collection('friend_requests').document(request_id)
        request_doc = request_ref.get()
        
        if not request_doc.exists:
            return jsonify({'error': 'Friend request not found'}), 404
        
        request_data = request_doc.to_dict()
        
        if request_data['toUserId'] != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Update request status
        request_ref.update({
            'status': 'declined',
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({'success': True, 'message': 'Friend request declined'})
        
    except Exception as e:
        print(f"Error declining friend request: {e}")
        return jsonify({'error': 'Failed to decline friend request'}), 500

@app.route('/api/friends', methods=['GET'])
@login_required
def get_friends():
    """Get friends list for current user"""
    try:
        current_user_id = session['user']['uid']
        db = firestore.client()
        
        friends = db.collection('users').document(current_user_id)\
                   .collection('friends')\
                   .where('status', '==', 'active').get()
        
        friends_list = []
        for doc in friends:
            friend_data = doc.to_dict()
            # Convert timestamp for JSON serialization
            if 'friendsSince' in friend_data and hasattr(friend_data['friendsSince'], 'isoformat'):
                friend_data['friendsSince'] = friend_data['friendsSince'].isoformat()
            friends_list.append(friend_data)
        
        return jsonify({'friends': friends_list})
        
    except Exception as e:
        print(f"Error getting friends: {e}")
        return jsonify({'error': 'Failed to get friends'}), 500

@app.route('/api/friends/<friend_id>', methods=['DELETE'])
@login_required
def remove_friend(friend_id):
    """Remove a friend"""
    try:
        current_user_id = session['user']['uid']
        db = firestore.client()
        
        # Use batch write to remove from both users' friends collections
        batch = db.batch()
        
        current_user_friend_ref = db.collection('users').document(current_user_id)\
                                   .collection('friends').document(friend_id)
        
        other_user_friend_ref = db.collection('users').document(friend_id)\
                                 .collection('friends').document(current_user_id)
        
        batch.delete(current_user_friend_ref)
        batch.delete(other_user_friend_ref)
        batch.commit()
        
        return jsonify({'message': 'Friend removed successfully'})
        
    except Exception as e:
        print(f"Error removing friend: {e}")
        return jsonify({'error': 'Failed to remove friend'}), 500

# =============================================================================
# API BLUEPRINT ROUTES - GROUPS
# =============================================================================

@api_bp.route('/join-group-by-code', methods=['POST'])
@login_required
def join_group_by_code_api():
    """Handle group joining via invite code"""
    try:
        data = request.get_json()
        invite_code = data.get('inviteCode', '').upper().strip()
        
        if not invite_code or len(invite_code) != 6:
            return jsonify({'success': False, 'error': 'Invalid invite code format'}), 400
        
        user_info = g.user
        user_id = user_info.get('uid')
        user_email = user_info.get('email')
        user_name = user_info.get('name') or user_email.split('@')[0] if user_email else 'Anonymous User'
        
        if not user_id:
            return jsonify({'success': False, 'error': 'User not authenticated'}), 401
        
        db = firestore.client()
        
        # Find group by invite code
        groups_ref = db.collection('groups')
        query = groups_ref.where('inviteCode', '==', invite_code).limit(1)
        groups = list(query.stream())
        
        if not groups:
            return jsonify({'success': False, 'error': 'Invalid invite code'}), 404
        
        group_doc = groups[0]
        group_id = group_doc.id
        group_data = group_doc.to_dict()
        
        # Check if already a member
        if group_data.get('members', {}).get(user_id):
            return jsonify({
                'success': True,
                'alreadyMember': True,
                'groupId': group_id,
                'groupName': group_data.get('name'),
                'message': f"You're already a member of \"{group_data.get('name')}\""
            })
        
        # Add user to group
        member_data = {
            'name': user_name,
            'email': user_email or 'anonymous@user.com',
            'photoURL': user_info.get('picture'),
            'joinedAt': firestore.SERVER_TIMESTAMP,
            'role': 'member',
            'status': 'active'
        }
        
        # Update group with new member
        group_ref = db.collection('groups').document(group_id)
        group_ref.update({
            f'members.{user_id}': member_data,
            'memberCount': firestore.Increment(1),
            'updatedAt': firestore.SERVER_TIMESTAMP,
            'lastActivity': firestore.SERVER_TIMESTAMP
        })
        
        # Add system message
        group_ref.collection('messages').add({
            'text': f'{member_data["name"]} joined the group',
            'type': 'system',
            'timestamp': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({
            'success': True,
            'groupId': group_id,
            'groupName': group_data.get('name'),
            'message': f'Welcome to "{group_data.get("name")}"!'
        })
        
    except Exception as e:
        print(f"Error in join_group_by_code_api: {e}")
        return jsonify({'success': False, 'error': 'Failed to join group'}), 500

@api_bp.route('/user', methods=['GET', 'POST'])
@login_required
def user_api():
    """User API endpoint"""
    user_info = g.user
    
    if request.method == 'POST':
        # Handle user creation/update
        return jsonify({"status": "success"})
    else:
        return jsonify({
            "status": "success", 
            "authenticated": True,
            "user": user_info
        })

@api_bp.route('/group', methods=['GET', 'POST'])
@login_required
def group_api():
    """Group API endpoint"""
    if request.method == 'POST':
        # Handle group creation/update
        return jsonify({"status": "success"})
    else:
        return jsonify({"status": "success", "data": {}})

@api_bp.route('/venues', methods=['GET'])
@login_required
def venues_api():
    """Calculate and return venue recommendations"""
    return jsonify({"status": "success", "data": []})

# =============================================================================
# ERROR HANDLERS
# =============================================================================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return redirect(url_for('index'))

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return render_template('error.html', error="Internal server error"), 500

# =============================================================================
# REGISTER BLUEPRINTS
# =============================================================================

app.register_blueprint(auth_bp)
app.register_blueprint(mobile_bp)
app.register_blueprint(api_bp)

# =============================================================================
# LEGACY ROUTE REDIRECTS (for backward compatibility)
# =============================================================================

@app.route('/login')
def legacy_login():
    return redirect(url_for('auth.login'))

@app.route('/groups')
def legacy_groups():
    return redirect(url_for('mobile.groups'))

@app.route('/profile')
def legacy_profile():
    return redirect(url_for('mobile.profile'))

if __name__ == '__main__':
    app.run(debug=True)