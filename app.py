from flask import Flask, render_template, request, redirect, url_for, jsonify, session, Blueprint, g
from flask_cors import CORS
import os
import json
from dotenv import load_dotenv
from functools import wraps

# Import Firebase Admin modules
from firebase_admin import credentials, firestore

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

# Import Firebase admin config
from firebase_admin_config import verify_firebase_token
from functools import wraps

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get the ID token from the request
        id_token = None
        
        # Check if token is in the Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            id_token = auth_header.split('Bearer ')[1]
            print(f"Found token in Authorization header")
        
        # Check if token is in the session
        if not id_token and 'id_token' in session:
            id_token = session['id_token']
            print(f"Found token in session")
            
        # Check if token is in a cookie
        if not id_token:
            id_token = request.cookies.get('id_token')
            if id_token:
                print(f"Found token in cookie")
                # Store in session for future requests
                session['id_token'] = id_token
        
        if not id_token:
            # No token found, redirect to login
            print(f"No token found, redirecting to login")
            return redirect(url_for('auth.login'))
        
        try:
            # Verify the token
            print(f"Attempting to verify token...")
            decoded_token = verify_firebase_token(id_token)
            print(f"Token verified successfully for user: {decoded_token.get('email', 'unknown')}")
            
            # Store user info in g for access in the route
            g.user = decoded_token
            
            # Store verified token and user data in session
            session['id_token'] = id_token
            session['user_email'] = decoded_token.get('email')
            
            # Ensure user data is properly stored in session
            if 'user' not in session or not session['user'] or 'uid' not in session['user']:
                # Create user object in session
                session['user'] = {
                    'uid': decoded_token.get('uid'),
                    'email': decoded_token.get('email'),
                    'name': decoded_token.get('name', decoded_token.get('email')),
                    'photoURL': decoded_token.get('picture')
                }
                print(f"Created user data in session for: {session['user'].get('email')}")
            else:
                print(f"User data already exists in session for: {session['user'].get('email')}")
            
            # Call the protected view
            return f(*args, **kwargs)
        except Exception as e:
            print(f"Token verification failed: {e}")
            # Clear any invalid tokens
            if 'id_token' in session:
                print(f"Clearing invalid token from session")
                session.pop('id_token', None)
            
            # Token verification failed, redirect to login
            return redirect(url_for('auth.login'))
        
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
    # Clear session
    session.clear()
    
    # Clear auth cookies
    response = redirect(url_for('index'))
    response.delete_cookie('id_token')
    
    return response

# Mobile blueprint routes
@mobile_bp.route('/groups')
@login_required
def groups():
    """Groups management page - mobile interface"""
    return render_template('group.html')

# Friends page route - accessible only from profile
@app.route('/profile/friends')
@login_required
def friends():
    """Render the friends management page - only accessible from profile"""
    return render_template('friends.html')

# API Routes for Friends Feature

@app.route('/api/friends/search', methods=['GET'])
@login_required
def search_users():
    try:
        # Ensure user data is available in session
        if 'user' not in session or not session['user'] or 'uid' not in session['user']:
            print("User data missing in session")
            return jsonify({'error': 'User not authenticated properly'}), 401
            
        query = request.args.get('q', '').lower().strip()
        if len(query) < 2:
            return jsonify({'users': []})
            
        current_user_id = session['user']['uid']
        db = firestore.client()
        print(f"Searching for users with query: '{query}' by user: {current_user_id}")
        
        # Search directly in users collection
        print(f"Searching users collection for: {query}")
        search_results = []
        # Get all users (not efficient but works for small user base)
        all_users = db.collection('users').limit(50).get()
        
        for user_doc in all_users:
            user_data = user_doc.to_dict()
            # Simple search in name or email
            if (user_data.get('name', '').lower().find(query) >= 0 or 
                user_data.get('email', '').lower().find(query) >= 0 or
                user_data.get('username', '').lower().find(query) >= 0):
                # Create a custom document-like object for consistency
                class FallbackDoc:
                    def __init__(self, doc_id, data):
                        self.id = doc_id
                        self._data = data
                    
                    def to_dict(self):
                        return self._data
                
                # Add userId to the data if not present
                if 'userId' not in user_data:
                    user_data['userId'] = user_doc.id
                
                # Create a fallback document
                fallback_doc = FallbackDoc(user_doc.id, user_data)
                search_results.append(fallback_doc)
        
        print(f"Search results count: {len(search_results)}")
        
        users = []
        for doc in search_results:
            try:
                user_data = doc.to_dict()
                # Make sure userId exists in the user data
                if 'userId' not in user_data and hasattr(doc, 'id'):
                    user_data['userId'] = doc.id
                    
                print(f"Processing user: {user_data.get('userId', 'unknown')}")
                
                # Skip current user
                if user_data.get('userId') == current_user_id:
                    print(f"Skipping current user: {current_user_id}")
                    continue
                
                # Check if already friends
                try:
                    if 'userId' in user_data:  # Only check if userId exists
                        friendship = db.collection('users').document(current_user_id)\
                                    .collection('friends').document(user_data['userId']).get()
                        user_data['isFriend'] = friendship.exists
                    else:
                        print("Missing userId in user data, skipping friendship check")
                        user_data['isFriend'] = False
                except Exception as friend_error:
                    print(f"Error checking friendship: {friend_error}")
                    user_data['isFriend'] = False
                    
                # Check for pending friend request
                try:
                    if 'userId' in user_data:  # Only check if userId exists
                        pending_requests = db.collection('friend_requests')\
                                            .where('fromUserId', '==', current_user_id)\
                                            .where('toUserId', '==', user_data['userId'])\
                                            .where('status', '==', 'pending').get()
                        user_data['requestPending'] = len(pending_requests) > 0
                    else:
                        print("Missing userId in user data, skipping request check")
                        user_data['requestPending'] = False
                except Exception as request_error:
                    print(f"Error checking pending requests: {request_error}")
                    user_data['requestPending'] = False
                
                # Make sure all required fields exist
                if 'userId' not in user_data:
                    print("Skipping user without userId")
                    continue
                    
                # Ensure name and email fields exist
                if 'name' not in user_data:
                    user_data['name'] = "Unknown User"
                if 'email' not in user_data:
                    user_data['email'] = "No email"
                
                users.append(user_data)
            except Exception as user_error:
                print(f"Error processing user data: {user_error}")
                continue
        
        print(f"Returning {len(users)} users")
        return jsonify({'users': users})
    except Exception as search_error:
        print(f"Error during search operation: {search_error}")
        return jsonify({'error': f'Search operation failed: {str(search_error)}'}), 500

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
        
        # Initialize Firestore client
        db = firestore.client()
        
        # Check if request already exists
        existing_requests = db.collection('friend_requests')\
                              .where('fromUserId', '==', current_user_id)\
                              .where('toUserId', '==', to_user_id)\
                              .where('status', '==', 'pending').get()
        
        if existing_requests:
            print(f"Friend request already sent from {current_user_id} to {to_user_id}")
            return jsonify({'error': 'Friend request already sent'}), 400
        
        # Check if already friends - verify bidirectional relationship
        friendship1 = db.collection('users').document(current_user_id)\
                       .collection('friends').document(to_user_id).get()
        friendship2 = db.collection('users').document(to_user_id)\
                       .collection('friends').document(current_user_id).get()
        
        # Only consider them friends if both documents exist and the emails match
        is_friends = False
        if friendship1.exists and friendship2.exists:
            friendship1_data = friendship1.to_dict()
            friendship2_data = friendship2.to_dict()
            
            # Verify the email in the friendship document matches current user's email
            if (friendship1_data.get('email') == current_user.get('email') and 
                friendship2_data.get('userId') == current_user_id):
                is_friends = True
                print(f"Verified bidirectional friendship between {current_user_id} and {to_user_id}")
        
        if is_friends:
            print(f"Users {current_user_id} and {to_user_id} are already friends")
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
        # Ensure user data is available in session
        if 'user' not in session or not session['user'] or 'uid' not in session['user']:
            print("User data missing in session")
            return jsonify({'error': 'User not authenticated properly'}), 401
            
        current_user_id = session['user']['uid']
        print(f"Getting friend requests for user: {current_user_id}")
        
        try:
            db = firestore.client()
            
            # Get pending requests
            print("Querying friend_requests collection")
            requests_query = db.collection('friend_requests')\
                        .where('toUserId', '==', current_user_id)\
                        .where('status', '==', 'pending')\
                        .order_by('createdAt', direction=firestore.Query.DESCENDING)
            
            print("Executing query")
            requests = requests_query.get()
            print(f"Found {len(requests)} friend requests")
            
            request_list = []
            for doc in requests:
                try:
                    request_data = doc.to_dict()
                    print(f"Processing request: {doc.id}")
                    
                    # Convert timestamp to string for JSON serialization
                    if 'createdAt' in request_data:
                        try:
                            if hasattr(request_data['createdAt'], 'isoformat'):
                                request_data['createdAt'] = request_data['createdAt'].isoformat()
                            else:
                                request_data['createdAt'] = str(request_data['createdAt'])
                        except Exception as ts_error:
                            print(f"Error converting timestamp: {ts_error}")
                            request_data['createdAt'] = str(request_data['createdAt'])
                    
                    request_list.append(request_data)
                except Exception as doc_error:
                    print(f"Error processing request document: {doc_error}")
                    continue
            
            print(f"Returning {len(request_list)} friend requests")
            return jsonify({'requests': request_list})
            
        except Exception as query_error:
            print(f"Error during friend requests query: {query_error}")
            return jsonify({'error': f'Friend requests query failed: {str(query_error)}'}), 500
        
    except Exception as e:
        print(f"Error getting friend requests: {e}")
        return jsonify({'error': f'Failed to get friend requests: {str(e)}'}), 500

@app.route('/api/friends/request/<request_id>/accept', methods=['POST'])
@login_required
def accept_friend_request(request_id):
    """Accept a friend request"""
    try:
        current_user_id = session['user']['uid']
        current_user = session['user']
        db = firestore.client()
        
        # Get the friend request
        request_ref = db.collection('friend_requests').document(request_id)
        request_doc = request_ref.get()
        
        if not request_doc.exists:
            return jsonify({'error': 'Friend request not found'}), 404
        
        request_data = request_doc.to_dict()
        
        # Verify this request is for the current user
        if request_data['toUserId'] != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Use a batch write for atomicity
        batch = db.batch()
        
        # Add to both users' friends collections
        current_user_friend_ref = db.collection('users').document(current_user_id)\
                                   .collection('friends').document(request_data['fromUserId'])
        
        other_user_friend_ref = db.collection('users').document(request_data['fromUserId'])\
                                 .collection('friends').document(current_user_id)
        
        # Get current user data for the friend record
        current_user_doc = db.collection('users').document(current_user_id).get()
        current_user_data = current_user_doc.to_dict() if current_user_doc.exists else {}
        
        # Add friend records
        batch.set(current_user_friend_ref, {
            'userId': request_data['fromUserId'],
            'name': request_data['fromUserName'],
            'email': request_data['fromUserEmail'],
            'username': request_data['fromUserEmail'].split('@')[0],
            'photoURL': request_data.get('fromUserPhotoURL', ''),
            'friendsSince': firestore.SERVER_TIMESTAMP,
            'lastInteraction': firestore.SERVER_TIMESTAMP,
            'status': 'active'
        })
        
        batch.set(other_user_friend_ref, {
            'userId': current_user_id,
            'name': current_user_data.get('name', ''),
            'email': current_user_data.get('email', ''),
            'username': current_user_data.get('username', current_user_data.get('email', '').split('@')[0]),
            'photoURL': current_user_data.get('photoURL', ''),
            'friendsSince': firestore.SERVER_TIMESTAMP,
            'lastInteraction': firestore.SERVER_TIMESTAMP,
            'status': 'active'
        })
        
        # Update request status
        batch.update(request_ref, {
            'status': 'accepted',
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        # Commit the batch
        batch.commit()
        
        return jsonify({
            'success': True,
            'message': 'Friend request accepted'
        })
        
    except Exception as e:
        print(f"Error accepting friend request: {e}")
        print(f"Request ID: {request_id}")
        print(f"Current user: {session.get('user', 'Not in session')}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Failed to accept friend request', 
            'details': str(e)
        }), 500

@app.route('/api/friends/request/<request_id>/decline', methods=['POST'])
@login_required
def decline_friend_request(request_id):
    """Decline a friend request"""
    try:
        current_user_id = session['user']['uid']
        db = firestore.client()
        
        # Get the friend request
        request_ref = db.collection('friend_requests').document(request_id)
        request_doc = request_ref.get()
        
        if not request_doc.exists:
            return jsonify({'error': 'Friend request not found'}), 404
        
        request_data = request_doc.to_dict()
        
        # Verify this request is for the current user
        if request_data['toUserId'] != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Update request status
        request_ref.update({
            'status': 'declined',
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({
            'success': True,
            'message': 'Friend request declined'
        })
        
    except Exception as e:
        print(f"Error declining friend request: {e}")
        print(f"Request ID: {request_id}")
        print(f"Current user: {session.get('user', 'Not in session')}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Failed to decline friend request',
            'details': str(e)
        }), 500

@app.route('/api/friends', methods=['GET'])
@login_required
def get_friends():
    """Get friends list for current user"""
    try:
        current_user_id = session['user']['uid']
        db = firestore.client()
        
        # Get friends
        friends = db.collection('users').document(current_user_id)\
                   .collection('friends')\
                   .where('status', '==', 'active')\
                   .order_by('friendsSince', direction=firestore.Query.DESCENDING).get()
        
        friends_list = []
        for doc in friends:
            friend_data = doc.to_dict()
            # Convert timestamp to string for JSON serialization
            if 'friendsSince' in friend_data:
                friend_data['friendsSince'] = friend_data['friendsSince'].isoformat() if hasattr(friend_data['friendsSince'], 'isoformat') else str(friend_data['friendsSince'])
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
        
        # Use a batch write to remove from both users' friends collections
        batch = db.batch()
        
        current_user_friend_ref = db.collection('users').document(current_user_id)\
                                   .collection('friends').document(friend_id)
        
        other_user_friend_ref = db.collection('users').document(friend_id)\
                                 .collection('friends').document(current_user_id)
        
        batch.delete(current_user_friend_ref)
        batch.delete(other_user_friend_ref)
        
        # Commit the batch
        batch.commit()
        
        return jsonify({'message': 'Friend removed successfully'})
        
    except Exception as e:
        print(f"Error removing friend: {e}")
        return jsonify({'error': 'Failed to remove friend'}), 500

@app.route('/join/<invite_code>')
def join_group_direct(invite_code):
    """Handle direct invite links"""
    return render_template('groups.html', invite_code=invite_code)

@app.route('/view_map')
def view_map():
    event_id = request.args.get('eventId')
    return render_template('view_map.html', event_id=event_id)

    
# Helper function to update user search index when user profile is updated
def update_user_search_index(user_id, user_data):
    """Update the user search index when user profile changes"""
    try:
        db = firestore.client()
        
        # Create search terms
        search_terms = []
        if user_data.get('name'):
            search_terms.extend([
                user_data['name'].lower(),
                *user_data['name'].lower().split()
            ])
        if user_data.get('email'):
            search_terms.extend([
                user_data['email'].lower(),
                user_data['email'].split('@')[0].lower()
            ])
        if user_data.get('username'):
            search_terms.append(user_data['username'].lower())
        
        # Remove duplicates
        search_terms = list(set(filter(None, search_terms)))
        
        # Update search index
        db.collection('user_search').document(user_id).set({
            'userId': user_id,
            'name': user_data.get('name', ''),
            'email': user_data.get('email', ''),
            'username': user_data.get('username', ''),
            'photoURL': user_data.get('photoURL', ''),
            'searchTerms': search_terms
        })
        
    except Exception as e:
        print(f"Error updating user search index: {e}")


@mobile_bp.route('/profile')
@login_required
def profile():
    """Profile page - mobile interface"""
    return render_template('profile.html')


@mobile_bp.route('/group_chat')
@login_required
def group_chat():
    """Group chat - mobile interface - ENHANCED to accept group ID"""
    # Get group ID from query parameter
    group_id = request.args.get('groupId')
    
    if not group_id:
        # If no group ID provided, redirect to groups page
        return redirect(url_for('mobile.groups'))
    
    # Pass group_id to template
    return render_template('group_chat.html', group_id=group_id)

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
    # Get user info from the token (stored in g.user by login_required decorator)
    user_info = g.user
    
    # Store user email in session for easier access
    if user_info and 'email' in user_info:
        session['user_email'] = user_info['email']
        print(f"User API: Set session for {user_info['email']}")
    
    if request.method == 'POST':
        # Handle user creation/update
        return jsonify({"status": "success"})
    else:
        # Return user data from the token
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


@app.route('/venues/<group_id>')
def legacy_venues(group_id):
    return redirect(url_for('mobile.venues', group_id=group_id))

@app.route('/swipe/<group_id>')
def legacy_swipe(group_id):
    return redirect(url_for('mobile.swipe', group_id=group_id))

if __name__ == '__main__':
    app.run(debug=True)