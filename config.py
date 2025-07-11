import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Flask configuration
FLASK_SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key')
DEBUG = os.environ.get('FLASK_DEBUG', 'True') == 'True'

# Google Maps API configuration
GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', '')

# Firebase configuration (will be loaded from environment variable in production)
# For development, you can paste your Firebase config here
FIREBASE_CONFIG = os.environ.get('FIREBASE_CONFIG', '''{
    "apiKey": "YOUR_API_KEY",
    "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
    "projectId": "YOUR_PROJECT_ID",
    "storageBucket": "YOUR_PROJECT_ID.appspot.com",
    "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
    "appId": "YOUR_APP_ID",
    "measurementId": "YOUR_MEASUREMENT_ID"
}''')
