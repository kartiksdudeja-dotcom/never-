from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db_connection
from datetime import datetime

activity_bp = Blueprint('activity', __name__)


@activity_bp.route('/log', methods=['POST'])
@jwt_required()
def log_activity():
    """Log a new activity"""
    try:
        data = request.get_json()
        activity_type = data.get('activityType')
        hanger_no = data.get('hangerNo')
        description = data.get('description')
        
        if not activity_type or activity_type not in ['service', 'barcode', 'wheel']:
            return jsonify({
                'success': False,
                'message': 'Valid activity type is required (service, barcode, wheel)'
            }), 400
        
        current_user = get_jwt_identity()
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        hanger_id = None
        if hanger_no:
            cursor.execute("SELECT id FROM hangers WHERE hanger_no = %s", (hanger_no,))
            hanger = cursor.fetchone()
            if hanger:
                hanger_id = hanger['id']
        
        cursor.execute("""
            INSERT INTO activity_logs (user_id, activity_type, hanger_id, description)
            VALUES (%s, %s, %s, %s)
        """, (current_user, activity_type, hanger_id, description))
        
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': 'Activity logged successfully'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to log activity: {str(e)}'
        }), 500


@activity_bp.route('/today', methods=['GET'])
@jwt_required()
def get_today_activities():
    """Get today's activities"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT al.id, al.user_id, al.activity_type, al.description, al.created_at,
                   h.hanger_no
            FROM activity_logs al
            LEFT JOIN hangers h ON al.hanger_id = h.id
            WHERE DATE(al.created_at) = CURDATE()
            ORDER BY al.created_at DESC
        """)
        activities = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        for activity in activities:
            activity['created_at'] = activity['created_at'].isoformat() if activity['created_at'] else None
        
        return jsonify({
            'success': True,
            'data': activities
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch today\'s activities: {str(e)}'
        }), 500


@activity_bp.route('/today/stats', methods=['GET'])
@jwt_required()
def get_today_stats():
    """Get today's activity statistics"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                COUNT(CASE WHEN activity_type = 'service' THEN 1 END) as service_count,
                COUNT(CASE WHEN activity_type = 'barcode' THEN 1 END) as barcode_count,
                COUNT(CASE WHEN activity_type = 'wheel' THEN 1 END) as wheel_count,
                COUNT(*) as total
            FROM activity_logs
            WHERE DATE(created_at) = CURDATE()
        """)
        stats = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'data': stats
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch activity stats: {str(e)}'
        }), 500


@activity_bp.route('/history', methods=['GET'])
@jwt_required()
def get_activity_history():
    """Get activity history with optional filters"""
    try:
        activity_type = request.args.get('type')
        date_from = request.args.get('from')
        date_to = request.args.get('to')
        limit = request.args.get('limit', 100, type=int)
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        query = """
            SELECT al.id, al.user_id, al.activity_type, al.description, al.created_at,
                   h.hanger_no
            FROM activity_logs al
            LEFT JOIN hangers h ON al.hanger_id = h.id
            WHERE 1=1
        """
        params = []
        
        if activity_type:
            query += " AND al.activity_type = %s"
            params.append(activity_type)
        
        if date_from:
            query += " AND DATE(al.created_at) >= %s"
            params.append(date_from)
        
        if date_to:
            query += " AND DATE(al.created_at) <= %s"
            params.append(date_to)
        
        query += " ORDER BY al.created_at DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        activities = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        for activity in activities:
            activity['created_at'] = activity['created_at'].isoformat() if activity['created_at'] else None
        
        return jsonify({
            'success': True,
            'data': activities
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch activity history: {str(e)}'
        }), 500
