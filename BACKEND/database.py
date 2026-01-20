import mysql.connector
from mysql.connector import Error
from config import Config

def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL Database: {e}")
        return None


def init_database():
    """Initialize database tables if they don't exist"""
    connection = None
    cursor = None
    try:
        # First connect without database to create it if needed
        print(f"Attempting to connect to MySQL at {Config.DB_HOST}...")
        connection = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            connection_timeout=5
        )
        cursor = connection.cursor()
        print("✓ Connected to MySQL successfully")
        
        # Create database if not exists
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {Config.DB_NAME}")
        cursor.execute(f"USE {Config.DB_NAME}")
        
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'user') DEFAULT 'user',
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        
        # Create hangers table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hangers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                hanger_no INT UNIQUE NOT NULL,
                status ENUM('done', 'needed', 'none') DEFAULT 'none',
                last_serviced_date DATE,
                last_serviced_by VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        
        # Create service_checklist_master table (template)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS service_checklist_master (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sr_no INT NOT NULL,
                activity VARCHAR(255) NOT NULL,
                standard_value VARCHAR(255) DEFAULT '',
                image LONGTEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create service_checklist table (actual entries)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS service_checklist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                hanger_id INT NOT NULL,
                sr_no INT NOT NULL,
                activity VARCHAR(255) NOT NULL,
                status ENUM('pending', 'done', 'failed') DEFAULT 'pending',
                remarks TEXT,
                done_by VARCHAR(50),
                done_on DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (hanger_id) REFERENCES hangers(id) ON DELETE CASCADE
            )
        """)
        
        # Create barcode_checklist_master table (template)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS barcode_checklist_master (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sr_no INT NOT NULL,
                activity VARCHAR(255) NOT NULL,
                standard_value VARCHAR(255) DEFAULT '',
                image LONGTEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create barcode_checklist table (actual entries)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS barcode_checklist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                hanger_id INT NOT NULL,
                sr_no INT NOT NULL,
                activity VARCHAR(255) NOT NULL,
                status ENUM('pending', 'done', 'failed') DEFAULT 'pending',
                remarks TEXT,
                done_by VARCHAR(50),
                done_on DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (hanger_id) REFERENCES hangers(id) ON DELETE CASCADE
            )
        """)

        # Create wheel_checklist_master table (template)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS wheel_checklist_master (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sr_no INT NOT NULL,
                activity VARCHAR(255) NOT NULL,
                standard_value VARCHAR(255) DEFAULT '',
                image LONGTEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create wheel_checklist table (actual entries)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS wheel_checklist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                hanger_id INT NOT NULL,
                sr_no INT NOT NULL,
                activity VARCHAR(255) NOT NULL,
                status ENUM('pending', 'done', 'failed') DEFAULT 'pending',
                remarks TEXT,
                done_by VARCHAR(50),
                done_on DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (hanger_id) REFERENCES hangers(id) ON DELETE CASCADE
            )
        """)

        # Create checking_list_checklist_master table (template)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS checking_list_checklist_master (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sr_no INT NOT NULL,
                activity VARCHAR(255) NOT NULL,
                standard_value VARCHAR(255) DEFAULT '',
                image LONGTEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create checking_list_checklist table (actual entries)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS checking_list_checklist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                hanger_id INT NOT NULL,
                sr_no INT NOT NULL,
                activity VARCHAR(255) NOT NULL,
                status ENUM('pending', 'done', 'failed') DEFAULT 'pending',
                remarks TEXT,
                done_by VARCHAR(50),
                done_on DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (hanger_id) REFERENCES hangers(id) ON DELETE CASCADE
            )
        """)

        # Create activity_logs table
        cursor.execute("DROP TABLE IF EXISTS activity_logs")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                activity_type ENUM('service', 'barcode', 'wheel', 'checking_list') NOT NULL,
                hanger_id INT,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (hanger_id) REFERENCES hangers(id) ON DELETE SET NULL
            )
        """)
        
        # Create sessions table for tracking active sessions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50) NOT NULL,
                token VARCHAR(500) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP
            )
        """)
        
        connection.commit()
        print("✓ Database initialized successfully!")
        
        # Insert default data
        insert_default_data(cursor, connection)
        
    except Error as e:
        print(f"✗ Error initializing database: {e}")
        print(f"  Database Host: {Config.DB_HOST}")
        print(f"  Database Name: {Config.DB_NAME}")
        print("  Please ensure MySQL server is running and accessible.")
        raise
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


def insert_default_data(cursor, connection):
    """Insert default data into tables"""
    import bcrypt
    
    try:
        # Check if admin exists
        cursor.execute("SELECT COUNT(*) FROM users WHERE user_id = 'admin'")
        admin_exists = cursor.fetchone()[0] > 0
        
        if not admin_exists:
            # Create default admin user
            hashed_password = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt())
            cursor.execute("""
                INSERT INTO users (user_id, password, role, status) 
                VALUES (%s, %s, %s, %s)
            """, ('admin', hashed_password.decode('utf-8'), 'admin', 'active'))
            
            # Create default operator user
            operator_password = bcrypt.hashpw('operator123'.encode('utf-8'), bcrypt.gensalt())
            cursor.execute("""
                INSERT INTO users (user_id, password, role, status) 
                VALUES (%s, %s, %s, %s)
            """, ('operator1', operator_password.decode('utf-8'), 'user', 'active'))
        
        # Check if hangers exist
        cursor.execute("SELECT COUNT(*) FROM hangers")
        hangers_count = cursor.fetchone()[0]
        
        if hangers_count < 114:
            # Insert missing hangers up to 114
            for i in range(1, 115):
                cursor.execute("""
                    INSERT IGNORE INTO hangers (hanger_no, status) VALUES (%s, %s)
                """, (i, 'none'))
        
        # Check if checklist master exists
        cursor.execute("SELECT COUNT(*) FROM service_checklist_master")
        checklist_exists = cursor.fetchone()[0] > 0
        
        if not checklist_exists:
            # Insert default checklist items for service
            service_items = [
                (1, "Visual Inspection"),
                (2, "Check Hook Integrity"),
                (3, "Lubrication"),
                (4, "Paint Touch-up"),
                (5, "Barcode Verification"),
                (6, "Weight Capacity Test"),
                (7, "Chain/Cable Check"),
                (8, "Safety Lock Inspection"),
            ]
            for sr, activity in service_items:
                cursor.execute("""
                    INSERT INTO service_checklist_master (sr_no, activity) VALUES (%s, %s)
                """, (sr, activity))
        
        # Check if barcode checklist master exists
        cursor.execute("SELECT COUNT(*) FROM barcode_checklist_master")
        barcode_exists = cursor.fetchone()[0] > 0
        
        if not barcode_exists:
            # Insert default barcode checklist items
            barcode_items = [
                (1, "Barcode Readable"),
                (2, "Barcode Visible"),
                (3, "Barcode Not Damaged"),
                (4, "Barcode Position Correct"),
                (5, "Barcode Font Clear"),
            ]
            for sr, activity in barcode_items:
                cursor.execute("""
                    INSERT INTO barcode_checklist_master (sr_no, activity) VALUES (%s, %s)
                """, (sr, activity))
        
        # Check if wheel checklist master exists
        cursor.execute("SELECT COUNT(*) FROM wheel_checklist_master")
        wheel_exists = cursor.fetchone()[0] > 0
        
        if not wheel_exists:
            # Insert default wheel checklist items
            wheel_items = [
                (1, "Wheel Condition Check"),
                (2, "Wheel Alignment"),
                (3, "Bearing Inspection"),
                (4, "Lubrication Applied"),
                (5, "Rotation Test"),
                (6, "Noise Check"),
            ]
            for sr, activity in wheel_items:
                cursor.execute("""
                    INSERT INTO wheel_checklist_master (sr_no, activity) VALUES (%s, %s)
                """, (sr, activity))
        
        # Check if checking list master exists
        cursor.execute("SELECT COUNT(*) FROM checking_list_checklist_master")
        checking_exists = cursor.fetchone()[0] > 0
        
        if not checking_exists:
            # Insert default checking list items
            checking_items = [
                (1, "Hanger Serial Number Verified"),
                (2, "Weight Capacity Label Check"),
                (3, "Safety Certificate Present"),
                (4, "Installation Date Recorded"),
                (5, "Maintenance History Available"),
                (6, "General Condition Report"),
            ]
            for sr, activity in checking_items:
                cursor.execute("""
                    INSERT INTO checking_list_checklist_master (sr_no, activity) VALUES (%s, %s)
                """, (sr, activity))
        
        connection.commit()
        print("✓ Default data inserted successfully!")
        
    except Error as e:
        print(f"✗ Error inserting default data: {e}")
        connection.rollback()


if __name__ == "__main__":
    init_database()
