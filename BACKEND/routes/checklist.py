from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db_connection

checklist_bp = Blueprint('checklist', __name__)


@checklist_bp.route('/master', methods=['GET'])
@jwt_required()
def get_checklist_master():
    """Get the master checklist template"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT sr_no, activity FROM service_checklist_master ORDER BY sr_no ASC
        """)
        checklist = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'data': checklist
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch checklist master: {str(e)}'
        }), 500


@checklist_bp.route('/hanger/<int:hanger_no>', methods=['GET'])
@jwt_required()
def get_hanger_checklist(hanger_no):
    """Get checklist for a specific hanger"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get hanger id
        cursor.execute("SELECT id FROM hangers WHERE hanger_no = %s", (hanger_no,))
        hanger = cursor.fetchone()
        
        if not hanger:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Hanger not found'
            }), 404
        
        hanger_id = hanger['id']
        
        # Check if there's an existing checklist for today
        cursor.execute("""
            SELECT sc.id, sc.sr_no, sc.activity, sc.status, sc.remarks, sc.done_by, sc.done_on,
                   scm.standard_value, scm.image
            FROM service_checklist sc
            LEFT JOIN service_checklist_master scm ON sc.sr_no = scm.sr_no
            WHERE sc.hanger_id = %s AND DATE(sc.created_at) = CURDATE()
            ORDER BY sc.sr_no ASC
        """, (hanger_id,))
        checklist = cursor.fetchall()
        
        if not checklist:
            # Return master checklist template with pending status
            cursor.execute("""
                SELECT sr_no, activity, standard_value, image FROM service_checklist_master ORDER BY sr_no ASC
            """)
            master = cursor.fetchall()
            checklist = [
                {
                    'sr_no': item['sr_no'],
                    'activity': item['activity'],
                    'status': 'pending',
                    'remarks': '',
                    'done_by': None,
                    'done_on': None,
                    'standard_value': item.get('standard_value', ''),
                    'image': item.get('image', '')
                }
                for item in master
            ]
        else:
            for item in checklist:
                item['done_on'] = item['done_on'].isoformat() if item['done_on'] else None
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'data': {
                'hangerNo': hanger_no,
                'hangerId': hanger_id,
                'checklist': checklist
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch hanger checklist: {str(e)}'
        }), 500


@checklist_bp.route('/hanger/<int:hanger_no>', methods=['POST'])
@jwt_required()
def save_hanger_checklist(hanger_no):
    """Save/submit checklist for a hanger"""
    try:
        data = request.get_json()
        checklist_items = data.get('checklist', [])
        done_by = data.get('doneBy')
        done_on = data.get('doneOn')
        
        if not checklist_items:
            return jsonify({
                'success': False,
                'message': 'Checklist items are required'
            }), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get hanger id
        cursor.execute("SELECT id FROM hangers WHERE hanger_no = %s", (hanger_no,))
        hanger = cursor.fetchone()
        
        if not hanger:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Hanger not found'
            }), 404
        
        hanger_id = hanger['id']
        
        # Delete existing checklist for today
        cursor.execute("""
            DELETE FROM service_checklist 
            WHERE hanger_id = %s AND DATE(created_at) = CURDATE()
        """, (hanger_id,))
        
        # Insert new checklist items
        for item in checklist_items:
            cursor.execute("""
                INSERT INTO service_checklist 
                (hanger_id, sr_no, activity, status, remarks, done_by, done_on)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                hanger_id,
                item.get('sr_no') or item.get('sr'),
                item.get('activity'),
                item.get('status', 'pending'),
                item.get('remarks', ''),
                done_by,
                done_on
            ))
        
        # Update hanger status based on checklist completion
        all_done = all(item.get('status') == 'done' for item in checklist_items)
        any_failed = any(item.get('status') == 'failed' for item in checklist_items)
        
        if all_done:
            cursor.execute("""
                UPDATE hangers SET status = 'done', last_serviced_date = %s, last_serviced_by = %s
                WHERE id = %s
            """, (done_on, done_by, hanger_id))
        elif any_failed:
            cursor.execute("""
                UPDATE hangers SET status = 'needed' WHERE id = %s
            """, (hanger_id,))
        
        connection.commit()
        
        # Log activity
        current_user = get_jwt_identity()
        cursor.execute("""
            INSERT INTO activity_logs (user_id, activity_type, hanger_id, description)
            VALUES (%s, 'service', %s, %s)
        """, (
            current_user,
            hanger_id,
            f"Service checklist submitted for Hanger {hanger_no}"
        ))
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': 'Checklist saved successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to save checklist: {str(e)}'
        }), 500


@checklist_bp.route('/history/<int:hanger_no>', methods=['GET'])
@jwt_required()
def get_checklist_history(hanger_no):
    """Get checklist history for a hanger"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get hanger id
        cursor.execute("SELECT id FROM hangers WHERE hanger_no = %s", (hanger_no,))
        hanger = cursor.fetchone()
        
        if not hanger:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Hanger not found'
            }), 404
        
        # Get all checklist entries grouped by date
        cursor.execute("""
            SELECT DATE(created_at) as service_date, done_by,
                   COUNT(*) as total_items,
                   SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_items,
                   SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_items
            FROM service_checklist
            WHERE hanger_id = %s
            GROUP BY DATE(created_at), done_by
            ORDER BY DATE(created_at) DESC
            LIMIT 30
        """, (hanger['id'],))
        history = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        for item in history:
            item['service_date'] = item['service_date'].isoformat() if item['service_date'] else None
        
        return jsonify({
            'success': True,
            'data': history
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch checklist history: {str(e)}'
        }), 500


@checklist_bp.route('/report', methods=['GET'])
@jwt_required()
def get_checklist_report():
    """Get checklist submissions report for all hangers (admin only)"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get all checklist submissions with user and hanger info
        cursor.execute("""
            SELECT 
                h.hanger_no,
                DATE(sc.created_at) as submission_date,
                sc.done_by as submitted_by,
                COUNT(sc.id) as total_items,
                SUM(CASE WHEN sc.status = 'done' THEN 1 ELSE 0 END) as completed_items,
                SUM(CASE WHEN sc.status = 'failed' THEN 1 ELSE 0 END) as failed_items,
                SUM(CASE WHEN sc.status = 'pending' THEN 1 ELSE 0 END) as pending_items,
                GROUP_CONCAT(CASE WHEN sc.remarks != '' THEN CONCAT(sc.sr_no, ': ', sc.remarks) END SEPARATOR ' | ') as remarks
            FROM service_checklist sc
            LEFT JOIN hangers h ON sc.hanger_id = h.id
            GROUP BY h.hanger_no, DATE(sc.created_at), sc.done_by
            ORDER BY DATE(sc.created_at) DESC, h.hanger_no ASC
            LIMIT 500
        """)
        reports = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        # Convert dates to ISO format
        for report in reports:
            report['submission_date'] = report['submission_date'].isoformat() if report['submission_date'] else None
        
        return jsonify({
            'success': True,
            'data': reports
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch checklist report: {str(e)}'
        }), 500


@checklist_bp.route('/report/details', methods=['GET'])
@jwt_required()
def get_checklist_report_details():
    """Get detailed checklist items for a specific submission"""
    try:
        hanger_no = request.args.get('hanger_no')
        submission_date = request.args.get('date')
        submitted_by = request.args.get('user')
        
        if not hanger_no or not submission_date or not submitted_by:
            return jsonify({
                'success': False,
                'message': 'Missing required parameters: hanger_no, date, user'
            }), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({
                'success': False,
                'message': 'Database connection failed'
            }), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get hanger id
        cursor.execute("SELECT id FROM hangers WHERE hanger_no = %s", (hanger_no,))
        hanger = cursor.fetchone()
        
        if not hanger:
            cursor.close()
            connection.close()
            return jsonify({
                'success': False,
                'message': 'Hanger not found'
            }), 404
        
        # Get all checklist items for this submission
        cursor.execute("""
            SELECT 
                sc.sr_no,
                sc.activity,
                sc.status,
                sc.remarks,
                sc.done_by,
                sc.done_on
            FROM service_checklist sc
            WHERE sc.hanger_id = %s 
                AND DATE(sc.created_at) = %s 
                AND sc.done_by = %s
            ORDER BY sc.sr_no ASC
        """, (hanger['id'], submission_date, submitted_by))
        
        items = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        # Format response
        for item in items:
            item['done_on'] = item['done_on'].isoformat() if item['done_on'] else None
        
        return jsonify({
            'success': True,
            'data': {
                'hanger_no': hanger_no,
                'submission_date': submission_date,
                'submitted_by': submitted_by,
                'items': items
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to fetch checklist details: {str(e)}'
        }), 500


# ==================== BARCODE CHECKLIST ROUTES ====================

@checklist_bp.route('/barcode/master', methods=['GET'])
@jwt_required()
def get_barcode_checklist_master():
    """Get the master barcode checklist template"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT sr_no, activity FROM barcode_checklist_master ORDER BY sr_no ASC")
        checklist = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'data': checklist}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch barcode checklist master: {str(e)}'}), 500


@checklist_bp.route('/barcode/hanger/<int:hanger_no>', methods=['GET'])
@jwt_required()
def get_barcode_hanger_checklist(hanger_no):
    """Get barcode checklist for a specific hanger"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get hanger id
        cursor.execute("SELECT id FROM hangers WHERE hanger_no = %s", (hanger_no,))
        hanger = cursor.fetchone()
        
        if not hanger:
            cursor.close()
            connection.close()
            return jsonify({'success': False, 'message': 'Hanger not found'}), 404
        
        hanger_id = hanger['id']
        
        # Check if there's an existing checklist for today
        cursor.execute("""
            SELECT id, sr_no, activity, status, remarks, done_by, done_on
            FROM barcode_checklist
            WHERE hanger_id = %s AND DATE(created_at) = CURDATE()
            ORDER BY sr_no ASC
        """, (hanger_id,))
        checklist = cursor.fetchall()
        
        if not checklist:
            cursor.execute("SELECT sr_no, activity, standard_value, image FROM barcode_checklist_master ORDER BY sr_no ASC")
            master = cursor.fetchall()
            checklist = [{'sr_no': item['sr_no'], 'activity': item['activity'], 'status': 'pending', 'remarks': '', 'done_by': None, 'done_on': None, 'standard_value': item.get('standard_value', ''), 'image': item.get('image', '')} for item in master]
        else:
            for item in checklist:
                item['done_on'] = item['done_on'].isoformat() if item['done_on'] else None
        
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'data': {'hangerNo': hanger_no, 'hangerId': hanger_id, 'checklist': checklist}}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch barcode checklist: {str(e)}'}), 500


@checklist_bp.route('/barcode/hanger/<int:hanger_no>', methods=['POST'])
@jwt_required()
def save_barcode_hanger_checklist(hanger_no):
    """Save barcode checklist for a hanger"""
    try:
        data = request.get_json()
        checklist_items = data.get('checklist', [])
        done_by = data.get('doneBy')
        done_on = data.get('doneOn')
        
        if not checklist_items:
            return jsonify({'success': False, 'message': 'Checklist items are required'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get hanger id
        cursor.execute("SELECT id FROM hangers WHERE hanger_no = %s", (hanger_no,))
        hanger = cursor.fetchone()
        
        if not hanger:
            cursor.close()
            connection.close()
            return jsonify({'success': False, 'message': 'Hanger not found'}), 404
        
        hanger_id = hanger['id']
        
        # Delete existing checklist for today
        cursor.execute("DELETE FROM barcode_checklist WHERE hanger_id = %s AND DATE(created_at) = CURDATE()", (hanger_id,))
        
        # Insert new checklist items
        for item in checklist_items:
            cursor.execute("""
                INSERT INTO barcode_checklist (hanger_id, sr_no, activity, status, remarks, done_by, done_on)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (hanger_id, item.get('sr_no') or item.get('sr'), item.get('activity'), item.get('status', 'pending'), item.get('remarks', ''), done_by, done_on))
        
        # Update hanger status based on checklist completion
        all_done = all(item.get('status') == 'done' for item in checklist_items)
        any_failed = any(item.get('status') == 'failed' for item in checklist_items)
        
        if all_done:
            cursor.execute("UPDATE hangers SET status = 'done' WHERE id = %s", (hanger_id,))
        elif any_failed:
            cursor.execute("UPDATE hangers SET status = 'needed' WHERE id = %s", (hanger_id,))
        
        connection.commit()
        
        # Log activity
        current_user = get_jwt_identity()
        cursor.execute("INSERT INTO activity_logs (user_id, activity_type, hanger_id, description) VALUES (%s, 'barcode', %s, %s)", 
                      (current_user, hanger_id, f'Barcode checklist completed for hanger {hanger_no}'))
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'message': 'Barcode checklist saved successfully', 'hangerNo': hanger_no}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to save barcode checklist: {str(e)}'}), 500


# ==================== WHEEL CHECKLIST ROUTES ====================

@checklist_bp.route('/wheel/master', methods=['GET'])
@jwt_required()
def get_wheel_checklist_master():
    """Get the master wheel checklist template"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT sr_no, activity FROM wheel_checklist_master ORDER BY sr_no ASC")
        checklist = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'data': checklist}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch wheel checklist master: {str(e)}'}), 500


@checklist_bp.route('/wheel/hanger/<int:hanger_no>', methods=['GET'])
@jwt_required()
def get_wheel_hanger_checklist(hanger_no):
    """Get wheel checklist for a specific hanger"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get hanger id
        cursor.execute("SELECT id FROM hangers WHERE hanger_no = %s", (hanger_no,))
        hanger = cursor.fetchone()
        
        if not hanger:
            cursor.close()
            connection.close()
            return jsonify({'success': False, 'message': 'Hanger not found'}), 404
        
        hanger_id = hanger['id']
        
        # Check if there's an existing checklist for today
        cursor.execute("""
            SELECT id, sr_no, activity, status, remarks, done_by, done_on
            FROM wheel_checklist
            WHERE hanger_id = %s AND DATE(created_at) = CURDATE()
            ORDER BY sr_no ASC
        """, (hanger_id,))
        checklist = cursor.fetchall()
        
        if not checklist:
            cursor.execute("SELECT sr_no, activity, standard_value, image FROM wheel_checklist_master ORDER BY sr_no ASC")
            master = cursor.fetchall()
            checklist = [{'sr_no': item['sr_no'], 'activity': item['activity'], 'status': 'pending', 'remarks': '', 'done_by': None, 'done_on': None, 'standard_value': item.get('standard_value', ''), 'image': item.get('image', '')} for item in master]
        else:
            for item in checklist:
                item['done_on'] = item['done_on'].isoformat() if item['done_on'] else None
        
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'data': {'hangerNo': hanger_no, 'hangerId': hanger_id, 'checklist': checklist}}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch wheel checklist: {str(e)}'}), 500


@checklist_bp.route('/wheel/hanger/<int:hanger_no>', methods=['POST'])
@jwt_required()
def save_wheel_hanger_checklist(hanger_no):
    """Save wheel checklist for a hanger"""
    try:
        data = request.get_json()
        checklist_items = data.get('checklist', [])
        done_by = data.get('doneBy')
        done_on = data.get('doneOn')
        
        if not checklist_items:
            return jsonify({'success': False, 'message': 'Checklist items are required'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get hanger id
        cursor.execute("SELECT id FROM hangers WHERE hanger_no = %s", (hanger_no,))
        hanger = cursor.fetchone()
        
        if not hanger:
            cursor.close()
            connection.close()
            return jsonify({'success': False, 'message': 'Hanger not found'}), 404
        
        hanger_id = hanger['id']
        
        # Delete existing checklist for today
        cursor.execute("DELETE FROM wheel_checklist WHERE hanger_id = %s AND DATE(created_at) = CURDATE()", (hanger_id,))
        
        # Insert new checklist items
        for item in checklist_items:
            cursor.execute("""
                INSERT INTO wheel_checklist (hanger_id, sr_no, activity, status, remarks, done_by, done_on)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (hanger_id, item.get('sr_no') or item.get('sr'), item.get('activity'), item.get('status', 'pending'), item.get('remarks', ''), done_by, done_on))
        
        # Update hanger status based on checklist completion
        all_done = all(item.get('status') == 'done' for item in checklist_items)
        any_failed = any(item.get('status') == 'failed' for item in checklist_items)
        
        if all_done:
            cursor.execute("UPDATE hangers SET status = 'done' WHERE id = %s", (hanger_id,))
        elif any_failed:
            cursor.execute("UPDATE hangers SET status = 'needed' WHERE id = %s", (hanger_id,))
        
        connection.commit()
        
        # Log activity
        current_user = get_jwt_identity()
        cursor.execute("INSERT INTO activity_logs (user_id, activity_type, hanger_id, description) VALUES (%s, 'wheel', %s, %s)", 
                      (current_user, hanger_id, f'Wheel checklist completed for hanger {hanger_no}'))
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'message': 'Wheel checklist saved successfully', 'hangerNo': hanger_no}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to save wheel checklist: {str(e)}'}), 500


# ==================== CHECKING LIST CHECKLIST ROUTES ====================

@checklist_bp.route('/checking-list/master', methods=['GET'])
@jwt_required()
def get_checking_list_checklist_master():
    """Get the master checking list checklist template"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT sr_no, activity FROM checking_list_checklist_master ORDER BY sr_no ASC")
        checklist = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'data': checklist}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch checking list master: {str(e)}'}), 500


@checklist_bp.route('/checking-list/hanger/<int:hanger_no>', methods=['GET'])
@jwt_required()
def get_checking_list_hanger_checklist(hanger_no):
    """Get checking list checklist for a specific hanger"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get hanger id
        cursor.execute("SELECT id FROM hangers WHERE hanger_no = %s", (hanger_no,))
        hanger = cursor.fetchone()
        
        if not hanger:
            cursor.close()
            connection.close()
            return jsonify({'success': False, 'message': 'Hanger not found'}), 404
        
        hanger_id = hanger['id']
        
        # Check if there's an existing checklist for today
        cursor.execute("""
            SELECT id, sr_no, activity, status, remarks, done_by, done_on
            FROM checking_list_checklist
            WHERE hanger_id = %s AND DATE(created_at) = CURDATE()
            ORDER BY sr_no ASC
        """, (hanger_id,))
        checklist = cursor.fetchall()
        
        if not checklist:
            cursor.execute("SELECT sr_no, activity, standard_value, image FROM checking_list_checklist_master ORDER BY sr_no ASC")
            master = cursor.fetchall()
            checklist = [{'sr_no': item['sr_no'], 'activity': item['activity'], 'status': 'pending', 'remarks': '', 'done_by': None, 'done_on': None, 'standard_value': item.get('standard_value', ''), 'image': item.get('image', '')} for item in master]
        else:
            for item in checklist:
                item['done_on'] = item['done_on'].isoformat() if item['done_on'] else None
        
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'data': {'hangerNo': hanger_no, 'hangerId': hanger_id, 'checklist': checklist}}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch checking list: {str(e)}'}), 500


@checklist_bp.route('/checking-list/hanger/<int:hanger_no>', methods=['POST'])
@jwt_required()
def save_checking_list_hanger_checklist(hanger_no):
    """Save checking list checklist for a hanger"""
    try:
        data = request.get_json()
        checklist_items = data.get('checklist', [])
        done_by = data.get('doneBy')
        done_on = data.get('doneOn')
        
        if not checklist_items:
            return jsonify({'success': False, 'message': 'Checklist items are required'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get hanger id
        cursor.execute("SELECT id FROM hangers WHERE hanger_no = %s", (hanger_no,))
        hanger = cursor.fetchone()
        
        if not hanger:
            cursor.close()
            connection.close()
            return jsonify({'success': False, 'message': 'Hanger not found'}), 404
        
        hanger_id = hanger['id']
        
        # Delete existing checklist for today
        cursor.execute("DELETE FROM checking_list_checklist WHERE hanger_id = %s AND DATE(created_at) = CURDATE()", (hanger_id,))
        
        # Insert new checklist items
        for item in checklist_items:
            cursor.execute("""
                INSERT INTO checking_list_checklist (hanger_id, sr_no, activity, status, remarks, done_by, done_on)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (hanger_id, item.get('sr_no') or item.get('sr'), item.get('activity'), item.get('status', 'pending'), item.get('remarks', ''), done_by, done_on))
        
        # Update hanger status based on checklist completion
        all_done = all(item.get('status') == 'done' for item in checklist_items)
        any_failed = any(item.get('status') == 'failed' for item in checklist_items)
        
        if all_done:
            cursor.execute("UPDATE hangers SET status = 'done' WHERE id = %s", (hanger_id,))
        elif any_failed:
            cursor.execute("UPDATE hangers SET status = 'needed' WHERE id = %s", (hanger_id,))
        
        connection.commit()
        
        # Log activity
        current_user = get_jwt_identity()
        cursor.execute("INSERT INTO activity_logs (user_id, activity_type, hanger_id, description) VALUES (%s, 'checking_list', %s, %s)", 
                      (current_user, hanger_id, f'Checking list completed for hanger {hanger_no}'))
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'message': 'Checking list saved successfully', 'hangerNo': hanger_no}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to save checking list: {str(e)}'}), 500


# ==================== BARCODE CHECKLIST REPORT ROUTES ====================

@checklist_bp.route('/barcode/report', methods=['GET'])
@jwt_required()
def get_barcode_checklist_report():
    """Get barcode checklist report"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                h.hanger_no,
                DATE(bcc.created_at) as submission_date,
                MAX(bcc.done_by) as submitted_by,
                COUNT(CASE WHEN bcc.status = 'done' THEN 1 END) as completed_items,
                COUNT(CASE WHEN bcc.status = 'pending' THEN 1 END) as pending_items,
                COUNT(CASE WHEN bcc.status = 'failed' THEN 1 END) as failed_items,
                COUNT(*) as total_items
            FROM barcode_checklist bcc
            JOIN hangers h ON bcc.hanger_id = h.id
            GROUP BY h.hanger_no, DATE(bcc.created_at)
            ORDER BY submission_date DESC
            LIMIT 500
        """)
        report = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'data': report}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch barcode report: {str(e)}'}), 500


@checklist_bp.route('/barcode/report/details', methods=['GET'])
@jwt_required()
def get_barcode_checklist_report_details():
    """Get detailed barcode checklist report"""
    try:
        hanger_no = request.args.get('hanger_no')
        submission_date = request.args.get('submission_date')
        
        if not hanger_no or not submission_date:
            return jsonify({'success': False, 'message': 'Hanger number and submission date required'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                bcc.sr_no,
                bcc.activity,
                bcc.status,
                bcc.remarks,
                bcc.done_by,
                bcc.done_on
            FROM barcode_checklist bcc
            JOIN hangers h ON bcc.hanger_id = h.id
            WHERE h.hanger_no = %s AND DATE(bcc.created_at) = %s
            ORDER BY bcc.sr_no ASC
        """, (hanger_no, submission_date))
        details = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'data': details}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch barcode report details: {str(e)}'}), 500


# ==================== WHEEL CHECKLIST REPORT ROUTES ====================

@checklist_bp.route('/wheel/report', methods=['GET'])
@jwt_required()
def get_wheel_checklist_report():
    """Get wheel checklist report"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                h.hanger_no,
                DATE(wcc.created_at) as submission_date,
                MAX(wcc.done_by) as submitted_by,
                COUNT(CASE WHEN wcc.status = 'done' THEN 1 END) as completed_items,
                COUNT(CASE WHEN wcc.status = 'pending' THEN 1 END) as pending_items,
                COUNT(CASE WHEN wcc.status = 'failed' THEN 1 END) as failed_items,
                COUNT(*) as total_items
            FROM wheel_checklist wcc
            JOIN hangers h ON wcc.hanger_id = h.id
            GROUP BY h.hanger_no, DATE(wcc.created_at)
            ORDER BY submission_date DESC
            LIMIT 500
        """)
        report = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'data': report}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch wheel report: {str(e)}'}), 500


@checklist_bp.route('/wheel/report/details', methods=['GET'])
@jwt_required()
def get_wheel_checklist_report_details():
    """Get detailed wheel checklist report"""
    try:
        hanger_no = request.args.get('hanger_no')
        submission_date = request.args.get('submission_date')
        
        if not hanger_no or not submission_date:
            return jsonify({'success': False, 'message': 'Hanger number and submission date required'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                wcc.sr_no,
                wcc.activity,
                wcc.status,
                wcc.remarks,
                wcc.done_by,
                wcc.done_on
            FROM wheel_checklist wcc
            JOIN hangers h ON wcc.hanger_id = h.id
            WHERE h.hanger_no = %s AND DATE(wcc.created_at) = %s
            ORDER BY wcc.sr_no ASC
        """, (hanger_no, submission_date))
        details = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'data': details}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch wheel report details: {str(e)}'}), 500


# ==================== CHECKING LIST CHECKLIST REPORT ROUTES ====================

@checklist_bp.route('/checking-list/report', methods=['GET'])
@jwt_required()
def get_checking_list_checklist_report():
    """Get checking list checklist report"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                h.hanger_no,
                DATE(clcc.created_at) as submission_date,
                MAX(clcc.done_by) as submitted_by,
                COUNT(CASE WHEN clcc.status = 'done' THEN 1 END) as completed_items,
                COUNT(CASE WHEN clcc.status = 'pending' THEN 1 END) as pending_items,
                COUNT(CASE WHEN clcc.status = 'failed' THEN 1 END) as failed_items,
                COUNT(*) as total_items
            FROM checking_list_checklist clcc
            JOIN hangers h ON clcc.hanger_id = h.id
            GROUP BY h.hanger_no, DATE(clcc.created_at)
            ORDER BY submission_date DESC
            LIMIT 500
        """)
        report = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'data': report}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch checking list report: {str(e)}'}), 500


@checklist_bp.route('/checking-list/report/details', methods=['GET'])
@jwt_required()
def get_checking_list_checklist_report_details():
    """Get detailed checking list checklist report"""
    try:
        hanger_no = request.args.get('hanger_no')
        submission_date = request.args.get('submission_date')
        
        if not hanger_no or not submission_date:
            return jsonify({'success': False, 'message': 'Hanger number and submission date required'}), 400
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        cursor.execute("""
            SELECT 
                clcc.sr_no,
                clcc.activity,
                clcc.status,
                clcc.remarks,
                clcc.done_by,
                clcc.done_on
            FROM checking_list_checklist clcc
            JOIN hangers h ON clcc.hanger_id = h.id
            WHERE h.hanger_no = %s AND DATE(clcc.created_at) = %s
            ORDER BY clcc.sr_no ASC
        """, (hanger_no, submission_date))
        details = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return jsonify({'success': True, 'data': details}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch checking list report details: {str(e)}'}), 500


# ==================== MASTER CHECKLIST MANAGEMENT ROUTES ====================

@checklist_bp.route('/master/all', methods=['GET'])
@jwt_required()
def get_all_master_checklists():
    """Get all master checklist items for all types"""
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get service checklist master
        cursor.execute("SELECT id, sr_no, activity, standard_value, image FROM service_checklist_master ORDER BY sr_no ASC")
        service = cursor.fetchall()
        
        # Get barcode checklist master
        cursor.execute("SELECT id, sr_no, activity, standard_value, image FROM barcode_checklist_master ORDER BY sr_no ASC")
        barcode = cursor.fetchall()
        
        # Get wheel checklist master
        cursor.execute("SELECT id, sr_no, activity, standard_value, image FROM wheel_checklist_master ORDER BY sr_no ASC")
        wheel = cursor.fetchall()
        
        # Get checking list checklist master
        cursor.execute("SELECT id, sr_no, activity, standard_value, image FROM checking_list_checklist_master ORDER BY sr_no ASC")
        checkingList = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'data': {
                'service': service,
                'barcode': barcode,
                'wheel': wheel,
                'checkingList': checkingList
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to fetch master checklists: {str(e)}'}), 500


@checklist_bp.route('/master/<string:checklist_type>', methods=['POST'])
@jwt_required()
def add_master_checklist_item(checklist_type):
    """Add a new item to master checklist"""
    try:
        data = request.get_json()
        activity = data.get('activity')
        standard_value = data.get('standard_value', '')
        
        if not activity:
            return jsonify({'success': False, 'message': 'Activity is required'}), 400
        
        # Map checklist type to table name
        table_map = {
            'service': 'service_checklist_master',
            'barcode': 'barcode_checklist_master',
            'wheel': 'wheel_checklist_master',
            'checkingList': 'checking_list_checklist_master'
        }
        
        if checklist_type not in table_map:
            return jsonify({'success': False, 'message': 'Invalid checklist type'}), 400
        
        table_name = table_map[checklist_type]
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get the next sr_no
        cursor.execute(f"SELECT MAX(sr_no) as max_sr FROM {table_name}")
        result = cursor.fetchone()
        next_sr = (result['max_sr'] or 0) + 1
        
        # Insert new item with standard_value
        cursor.execute(
            f"INSERT INTO {table_name} (sr_no, activity, standard_value) VALUES (%s, %s, %s)",
            (next_sr, activity, standard_value)
        )
        connection.commit()
        
        new_id = cursor.lastrowid
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': 'Item added successfully',
            'data': {'id': new_id, 'sr_no': next_sr, 'activity': activity, 'standard_value': standard_value, 'image': ''}
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to add item: {str(e)}'}), 500


@checklist_bp.route('/master/<string:checklist_type>/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_master_checklist_item(checklist_type, item_id):
    """Update a master checklist item"""
    try:
        data = request.get_json()
        activity = data.get('activity')
        standard_value = data.get('standard_value', '')
        image = data.get('image', '')
        
        if not activity:
            return jsonify({'success': False, 'message': 'Activity is required'}), 400
        
        # Map checklist type to table name
        table_map = {
            'service': 'service_checklist_master',
            'barcode': 'barcode_checklist_master',
            'wheel': 'wheel_checklist_master',
            'checkingList': 'checking_list_checklist_master'
        }
        
        if checklist_type not in table_map:
            return jsonify({'success': False, 'message': 'Invalid checklist type'}), 400
        
        table_name = table_map[checklist_type]
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Update item with standard_value and image
        cursor.execute(
            f"UPDATE {table_name} SET activity = %s, standard_value = %s, image = %s WHERE id = %s",
            (activity, standard_value, image, item_id)
        )
        connection.commit()
        
        if cursor.rowcount == 0:
            cursor.close()
            connection.close()
            return jsonify({'success': False, 'message': 'Item not found'}), 404
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': 'Item updated successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to update item: {str(e)}'}), 500


@checklist_bp.route('/master/<string:checklist_type>/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_master_checklist_item(checklist_type, item_id):
    """Delete a master checklist item"""
    try:
        # Map checklist type to table name
        table_map = {
            'service': 'service_checklist_master',
            'barcode': 'barcode_checklist_master',
            'wheel': 'wheel_checklist_master',
            'checkingList': 'checking_list_checklist_master'
        }
        
        if checklist_type not in table_map:
            return jsonify({'success': False, 'message': 'Invalid checklist type'}), 400
        
        table_name = table_map[checklist_type]
        
        connection = get_db_connection()
        if not connection:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = connection.cursor(dictionary=True)
        
        # Get the sr_no of the item being deleted
        cursor.execute(f"SELECT sr_no FROM {table_name} WHERE id = %s", (item_id,))
        item = cursor.fetchone()
        
        if not item:
            cursor.close()
            connection.close()
            return jsonify({'success': False, 'message': 'Item not found'}), 404
        
        deleted_sr = item['sr_no']
        
        # Delete the item
        cursor.execute(f"DELETE FROM {table_name} WHERE id = %s", (item_id,))
        
        # Reorder remaining items
        cursor.execute(f"UPDATE {table_name} SET sr_no = sr_no - 1 WHERE sr_no > %s", (deleted_sr,))
        
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'message': 'Item deleted successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Failed to delete item: {str(e)}'}), 500
