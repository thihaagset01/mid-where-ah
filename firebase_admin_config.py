"""
Firebase Admin SDK Configuration for MidWhereAh

This module initializes the Firebase Admin SDK for server-side verification
of Firebase Authentication tokens.
"""

import os
import json
import firebase_admin
from firebase_admin import credentials, auth
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Firebase Admin SDK
def initialize_firebase_admin():
    """Initialize Firebase Admin SDK with credentials from environment variables."""
    try:
        # Check if already initialized
        if not firebase_admin._apps:
            # Get Firebase service account key from environment variable
            firebase_service_account = os.getenv('FIREBASE_SERVICE_ACCOUNT')
            
            if firebase_service_account:
                # If provided as a JSON string in environment variable
                service_account_info = json.loads(firebase_service_account)
                cred = credentials.Certificate(service_account_info)
            else:
                # Try to load from a file path
                service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', 'service-account.json')
                if os.path.exists(service_account_path):
                    cred = credentials.Certificate(service_account_path)
                else:
                    # Use application default credentials as a fallback
                    cred = credentials.ApplicationDefault()
            
            # Initialize the app
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized successfully")
        return True
    except Exception as e:
        print(f"Error initializing Firebase Admin SDK: {e}")
        return False

# Verify Firebase ID token
def verify_firebase_token(id_token):
    """
    Verify the Firebase ID token and return the decoded token.
    
    Args:
        id_token: The Firebase ID token to verify
        
    Returns:
        dict: The decoded token if valid
        
    Raises:
        Exception: If token is invalid or verification fails
    """
    try:
        # Check if we're in development mode
        if os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEVELOPMENT_MODE') == 'true':
            print("DEVELOPMENT MODE: Bypassing token verification")
            # In development mode, decode the token without verification
            # This is NOT secure and should NEVER be used in production
            import jwt
            try:
                # Try to decode without verification
                decoded_token = jwt.decode(id_token, options={"verify_signature": False})
                print(f"Development mode token decode: {decoded_token}")
                return decoded_token
            except Exception as jwt_error:
                print(f"Error decoding token in development mode: {jwt_error}")
                # If JWT decode fails, return a mock token for development
                return {
                    "email": "dev@example.com",
                    "uid": "dev-user-id",
                    "name": "Development User"
                }
        else:
            # Production mode - verify the token properly
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token
    except Exception as e:
        print(f"Error verifying Firebase token: {e}")
        # In development, don't raise the exception
        if os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEVELOPMENT_MODE') == 'true':
            print("DEVELOPMENT MODE: Returning mock token despite verification failure")
            return {
                "email": "dev@example.com",
                "uid": "dev-user-id",
                "name": "Development User"
            }
        raise e

# Initialize Firebase Admin when this module is imported
initialize_firebase_admin()
