from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import bcrypt
import re
from database import get_db_connection

users_bp = Blueprint('users', __name__)


def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"


def sanitize_input(text):
    """Sanitize input to prevent SQL injection and XSS"""
    if not text:
        return text
    # Remove any potentially dangerous characters
    dangerous_chars = ['<', '>', '"', "'", ';', '--', '/*', '*/', 'DROP', 'DELETE', 'INSERT', 'UPDATE', 'SELECT']
    sanitized = str(text)
    for char in dangerous_chars:
        sanitized = sanitized.replace(char.lower(), '').replace(char.upper(), '')
    return sanitized.strip()


def admin_required(fn):
    """Decorator to require admin role"""
    from functools import wraps
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get('role') != 'admin':
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        return fn(*args, **kwargs)
    return wrapper


@users_bp.route('', methods=['GET'])
@admin_required
def get_all_users():
    """Get all users (admin only)"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, user_id, role, status, created_at, updated_at 
            FROM users ORDER BY created_at DESC
        """)
        users = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        # Convert datetime to string
        for user in users:
            user['created_at'] = user['created_at'].isoformat() if user['created_at'] else None
            user['updated_at'] = user['updated_at'].isoformat() if user['updated_at'] else None
        
        return jsonify({
            'success': True,
            'data': users
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch users: {str(e)}'
        }), 500


@users_bp.route('', methods=['POST'])
@admin_required
def create_user():
    """Create a new user (admin only)"""
    try:
        data = request.get_json()
        user_id = data.get('userId')
        password = data.get('password')
        role = data.get('role', 'user')
        
        if not user_id or not password:
            return jsonify({
                'success': False,
                'message': 'User ID and password are required'
            }), 400
        
        # Validate password strength
        is_valid, message = validate_password(password)
        if not is_valid:
            return jsonify({
                'success': False,
                'message': message
            }), 400
        
        # Sanitize user_id
        user_id = sanitize_input(user_id)
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE user_id = %s", (user_id,))
        if cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'User ID already exists'
            }), 400
        
        # Hash password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Insert new user
        cursor.execute("""
            INSERT INTO users (user_id, password, role, status) 
            VALUES (%s, %s, %s, 'active')
        """, (user_id, hashed_password.decode('utf-8'), role))
        
        connection.commit()
        new_id = cursor.lastrowid
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'data': {
                'id': new_id,
                'userId': user_id,
                'role': role
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to create user: {str(e)}'
        }), 500


@users_bp.route('/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Update a user (admin only)"""
    try:
        data = request.get_json()
        new_user_id = data.get('userId')
        new_password = data.get('password')
        status = data.get('status')
        role = data.get('role')
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Build update query dynamically
        updates = []
        params = []
        
        if new_user_id:
            # Check if the new user_id is already taken by another user
            cursor.execute("SELECT id FROM users WHERE user_id = %s AND id != %s", (new_user_id, user_id))
            if cursor.fetchone():
                cursor.close()
                connection.close()
                return jsonify({
                    'success': False,
                    'message': 'User ID already exists'
                }), 400
            updates.append("user_id = %s")
            params.append(new_user_id)
        
        if new_password:
            hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
            updates.append("password = %s")
            params.append(hashed_password.decode('utf-8'))
        
        if status:
            updates.append("status = %s")
            params.append(status)
        
        if role:
            updates.append("role = %s")
            params.append(role)
        
        if not updates:
            return jsonify({
                'success': False,
                'message': 'No fields to update'
            }), 400
        
        params.append(user_id)
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
        cursor.execute(query, params)
        
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': 'User updated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to update user: {str(e)}'
        }), 500


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Delete a user (admin only)"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor()
        
        # Don't allow deletion of admin
        cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        if user[0] == 'admin':
            # Check if this is the last admin
            cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
            admin_count = cursor.fetchone()[0]
            if admin_count <= 1:
                cursor.close()
                connection.close()
                return jsonify({
                    'success': False,
                    'message': 'Cannot delete the last admin user'
                }), 400
        
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': 'User deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to delete user: {str(e)}'
        }), 500
