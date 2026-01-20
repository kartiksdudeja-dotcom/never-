from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
import bcrypt
from datetime import datetime, timedelta
from database import get_db_connection

auth_bp = Blueprint('auth', __name__)

# Rate limiting will be applied from app.py


def save_token_to_session(user_id: str, token: str, expires_hours: int = 8):
    """Save JWT token to sessions table for tracking"""
    try:
        connection = get_db_connection()
        if not connection:
            return False
        
        cursor = connection.cursor()
        expires_at = datetime.now() + timedelta(hours=expires_hours)
        token_identifier = token[-100:] if len(token) > 100 else token
        
        cursor.execute("""
            INSERT INTO sessions (user_id, token, is_active, expires_at)
            VALUES (%s, %s, TRUE, %s)
        """, (user_id, token_identifier, expires_at))
        
        connection.commit()
        cursor.close()
        connection.close()
        return True
    except Exception as e:
        print(f"Error saving session: {e}")
        return False


def invalidate_token(token: str):
    """Invalidate a JWT token by marking session as inactive"""
    try:
        connection = get_db_connection()
        if not connection:
            return False
        
        cursor = connection.cursor()
        token_identifier = token[-100:] if len(token) > 100 else token
        
        cursor.execute("""
            UPDATE sessions SET is_active = FALSE 
            WHERE token = %s
        """, (token_identifier,))
        
        connection.commit()
        cursor.close()
        connection.close()
        return True
    except Exception as e:
        print(f"Error invalidating token: {e}")
        return False


def invalidate_all_user_tokens(user_id: str):
    """Invalidate all tokens for a user (force logout everywhere)"""
    try:
        connection = get_db_connection()
        if not connection:
            return False
        
        cursor = connection.cursor()
        cursor.execute("""
            UPDATE sessions SET is_active = FALSE 
            WHERE user_id = %s
        """, (user_id,))
        
        connection.commit()
        cursor.close()
        connection.close()
        return True
    except Exception as e:
        print(f"Error invalidating user tokens: {e}")
        return False


def is_token_valid(token: str) -> bool:
    """Check if token is still active in sessions table"""
    try:
        connection = get_db_connection()
        if not connection:
            return False  # Reject if DB fails (don't allow on error)
        
        cursor = connection.cursor(dictionary=True)
        token_identifier = token[-100:] if len(token) > 100 else token
        
        cursor.execute("""
            SELECT is_active, expires_at FROM sessions 
            WHERE token = %s ORDER BY created_at DESC LIMIT 1
        """, (token_identifier,))
        
        session = cursor.fetchone()
        cursor.close()
        connection.close()
        
        if not session:
            return False  # Reject if session not found
        
        if not session['is_active']:
            return False  # Token was explicitly revoked
        
        if session['expires_at'] and session['expires_at'] < datetime.now():
            return False  # Token expired
        
        return True
    except Exception as e:
        print(f"Error checking token validity: {e}")
        return False  # Reject on error (don't allow graceful degradation)


def cleanup_expired_sessions():
    """Remove expired sessions from database"""
    try:
        connection = get_db_connection()
        if not connection:
            return
        
        cursor = connection.cursor()
        cursor.execute("""
            DELETE FROM sessions 
            WHERE expires_at < NOW() OR is_active = FALSE
        """)
        connection.commit()
        cursor.close()
        connection.close()
    except Exception as e:
        print(f"Error cleaning up sessions: {e}")


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login endpoint for both admin and users"""
    try:
        data = request.get_json()
        user_id = data.get('userId')
        password = data.get('password')
        
        if not user_id or not password:
            return jsonify({
                'success': False,
                'message': 'User ID and password are required'
            }), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, user_id, password, role, status 
            FROM users WHERE user_id = %s
        """, (user_id,))
        user = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid user ID or password'
            }), 401
        
        if user['status'] != 'active':
            return jsonify({
                'success': False,
                'message': 'User account is inactive'
            }), 401
        
        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            return jsonify({
                'success': False,
                'message': 'Invalid user ID or password'
            }), 401
        
        # Create JWT token - store user_id as simple string, role in additional_claims
        access_token = create_access_token(
            identity=user['user_id'],
            additional_claims={'role': user['role']}
        )
        
        # TEMPORARILY DISABLED - Save token to sessions table for tracking/revocation
        # save_token_to_session(user['user_id'], access_token)
        
        # Cleanup old expired sessions periodically
        # cleanup_expired_sessions()
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'data': {
                'token': access_token,
                'userId': user['user_id'],
                'role': user['role']
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Login failed: {str(e)}'
        }), 500


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout endpoint - invalidates the current token"""
    try:
        current_user = get_jwt_identity()
        
        # Get the token from the request header
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            # Invalidate this specific token
            invalidate_token(token)
        
        return jsonify({
            'success': True,
            'message': 'Logout successful'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Logout failed: {str(e)}'
        }), 500


@auth_bp.route('/verify', methods=['GET'])
@jwt_required()
def verify_token():
    """Verify JWT token and return user info with current role from database"""
    try:
        # TEMPORARILY DISABLED - Check if token has been revoked
        # auth_header = request.headers.get('Authorization', '')
        # if auth_header.startswith('Bearer '):
        #     token = auth_header[7:]
        #     if not is_token_valid(token):
        #         return jsonify({
        #             'success': False,
        #             'message': 'Token has been revoked. Please login again.'
        #         }), 401
        
        current_user = get_jwt_identity()
        claims = get_jwt()
        
        # Get the latest role from database (in case it was updated)
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            cursor.execute("SELECT role FROM users WHERE user_id = %s", (current_user,))
            user = cursor.fetchone()
            cursor.close()
            connection.close()
            
            if user:
                role = user['role']
            else:
                role = claims.get('role', 'user')
        else:
            role = claims.get('role', 'user')
        
        return jsonify({
            'success': True,
            'data': {
                'userId': current_user,
                'role': role
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Token verification failed: {str(e)}'
        }), 401


@auth_bp.route('/logout-all', methods=['POST'])
@jwt_required()
def logout_all():
    """Logout from all devices - invalidates all tokens for the user"""
    try:
        current_user = get_jwt_identity()
        
        # Invalidate all tokens for this user
        invalidate_all_user_tokens(current_user)
        
        return jsonify({
            'success': True,
            'message': 'Logged out from all devices successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Logout failed: {str(e)}'
        }), 500
