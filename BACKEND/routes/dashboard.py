from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from database import get_db_connection

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/admin', methods=['GET'])
@jwt_required()
def get_admin_dashboard():
    """Get admin dashboard statistics"""
    try:
        current_user = get_jwt_identity()
        claims = get_jwt()
        role = claims.get('role', 'user')
        
        if role != 'admin':
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get total users
        cursor.execute("SELECT COUNT(*) as count FROM users")
        total_users = cursor.fetchone()['count']
        
        # Get active sessions (simplified - count of active users)
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE status = 'active'")
        active_sessions = cursor.fetchone()['count']
        
        # Get today's logs count (handle if table doesn't exist)
        try:
            cursor.execute("""
                SELECT COUNT(*) as count FROM activity_logs 
                WHERE DATE(created_at) = CURDATE()
            """)
            today_logs = cursor.fetchone()['count']
        except:
            today_logs = 0
        
        # Get recent activity (handle if table doesn't exist)
        try:
            cursor.execute("""
                SELECT al.user_id, al.activity_type, al.description, al.created_at,
                       h.hanger_no
                FROM activity_logs al
                LEFT JOIN hangers h ON al.hanger_id = h.id
                ORDER BY al.created_at DESC
                LIMIT 10
            """)
            recent_activity = cursor.fetchall()
        except:
            recent_activity = []
        
        cursor.close()
        connection.close()
        
        for activity in recent_activity:
            activity['created_at'] = activity['created_at'].isoformat() if activity['created_at'] else None
        
        return jsonify({
            'success': True,
            'data': {
                'totalUsers': total_users,
                'activeSessions': active_sessions,
                'todayLogs': today_logs,
                'recentActivity': recent_activity
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch dashboard data: {str(e)}'
        }), 500


@dashboard_bp.route('/user', methods=['GET'])
@jwt_required()
def get_user_dashboard():
    """Get user dashboard statistics"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get hanger statistics
        cursor.execute("""
            SELECT 
                COUNT(CASE WHEN status = 'done' THEN 1 END) as done,
                COUNT(CASE WHEN status = 'needed' THEN 1 END) as needed,
                COUNT(CASE WHEN status = 'none' THEN 1 END) as none,
                COUNT(*) as total
            FROM hangers
        """)
        hanger_stats = cursor.fetchone()
        
        # Get today's activity stats
        cursor.execute("""
            SELECT 
                COUNT(CASE WHEN activity_type = 'service' THEN 1 END) as service,
                COUNT(CASE WHEN activity_type = 'barcode' THEN 1 END) as barcode,
                COUNT(CASE WHEN activity_type = 'wheel' THEN 1 END) as wheel
            FROM activity_logs
            WHERE DATE(created_at) = CURDATE()
        """)
        activity_stats = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'data': {
                'hangers': hanger_stats,
                'todayActivity': activity_stats
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch dashboard data: {str(e)}'
        }), 500
