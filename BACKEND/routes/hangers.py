from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db_connection

hangers_bp = Blueprint('hangers', __name__)


@hangers_bp.route('', methods=['GET'])
@jwt_required()
def get_all_hangers():
    """Get all hangers with their status"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, hanger_no, status, last_serviced_date, last_serviced_by 
            FROM hangers ORDER BY hanger_no ASC
        """)
        hangers = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        # Convert date to string
        for hanger in hangers:
            hanger['last_serviced_date'] = hanger['last_serviced_date'].isoformat() if hanger['last_serviced_date'] else None
        
        return jsonify({
            'success': True,
            'data': hangers
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch hangers: {str(e)}'
        }), 500


@hangers_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_hanger_stats():
    """Get hanger statistics for pie chart"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get counts for each status
        cursor.execute("""
            SELECT 
                COUNT(CASE WHEN status = 'done' THEN 1 END) as done,
                COUNT(CASE WHEN status = 'needed' THEN 1 END) as needed,
                COUNT(CASE WHEN status = 'none' THEN 1 END) as none,
                COUNT(*) as total
            FROM hangers
        """)
        stats = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'data': {
                'done': stats['done'],
                'needed': stats['needed'],
                'none': stats['none'],
                'total': stats['total']
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch hanger stats: {str(e)}'
        }), 500


@hangers_bp.route('/<int:hanger_no>', methods=['GET'])
@jwt_required()
def get_hanger(hanger_no):
    """Get a specific hanger by number"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, hanger_no, status, last_serviced_date, last_serviced_by 
            FROM hangers WHERE hanger_no = %s
        """, (hanger_no,))
        hanger = cursor.fetchone()
        
        cursor.close()
        connection.close()
        
        if not hanger:
            return jsonify({
                'success': False,
                'message': 'Hanger not found'
            }), 404
        
        hanger['last_serviced_date'] = hanger['last_serviced_date'].isoformat() if hanger['last_serviced_date'] else None
        
        return jsonify({
            'success': True,
            'data': hanger
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch hanger: {str(e)}'
        }), 500


@hangers_bp.route('/<int:hanger_no>', methods=['PUT'])
@jwt_required()
def update_hanger(hanger_no):
    """Update hanger status"""
    try:
        data = request.get_json()
        status = data.get('status')
        last_serviced_by = data.get('lastServicedBy')
        
        if status and status not in ['done', 'needed', 'none']:
            return jsonify({
                'success': False,
                'message': 'Invalid status value'
            }), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor()
        
        # Build update query
        updates = []
        params = []
        
        if status:
            updates.append("status = %s")
            params.append(status)
            if status == 'done':
                updates.append("last_serviced_date = CURDATE()")
        
        if last_serviced_by:
            updates.append("last_serviced_by = %s")
            params.append(last_serviced_by)
        
        if not updates:
            return jsonify({
                'success': False,
                'message': 'No fields to update'
            }), 400
        
        params.append(hanger_no)
        query = f"UPDATE hangers SET {', '.join(updates)} WHERE hanger_no = %s"
        cursor.execute(query, params)
        
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': 'Hanger updated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to update hanger: {str(e)}'
        }), 500


@hangers_bp.route('/bulk-update', methods=['PUT'])
@jwt_required()
def bulk_update_hangers():
    """Bulk update hanger statuses"""
    try:
        data = request.get_json()
        updates = data.get('updates', [])  # [{hangerNo: 1, status: 'done'}, ...]
        
        if not updates:
            return jsonify({
                'success': False,
                'message': 'No updates provided'
            }), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor()
        
        for update in updates:
            hanger_no = update.get('hangerNo')
            status = update.get('status')
            if hanger_no and status:
                cursor.execute("""
                    UPDATE hangers SET status = %s WHERE hanger_no = %s
                """, (status, hanger_no))
        
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': f'{len(updates)} hangers updated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to bulk update hangers: {str(e)}'
        }), 500
