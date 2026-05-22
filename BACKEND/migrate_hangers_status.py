import mysql.connector
from mysql.connector import Error
from config import Config

def run_migration():
    """Add service_status, barcode_status, wheel_status, checking_list_status columns to hangers table"""
    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME
        )
        cursor = connection.cursor()
        
        table = 'hangers'
        columns_to_add = [
            ('service_status', "ENUM('done', 'needed', 'none') DEFAULT 'none'"),
            ('barcode_status', "ENUM('done', 'needed', 'none') DEFAULT 'none'"),
            ('wheel_status', "ENUM('done', 'needed', 'none') DEFAULT 'none'"),
            ('checking_list_status', "ENUM('done', 'needed', 'none') DEFAULT 'none'")
        ]
        
        new_columns_added = False
        for col_name, col_def in columns_to_add:
            # Check if column exists
            cursor.execute(f"""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '{table}' AND COLUMN_NAME = '{col_name}' AND TABLE_SCHEMA = '{Config.DB_NAME}'
            """)
            if not cursor.fetchone():
                print(f"Adding {col_name} column to {table}...")
                cursor.execute(f"""
                    ALTER TABLE {table} 
                    ADD COLUMN {col_name} {col_def}
                """)
                print(f"[OK] {col_name} added to {table}")
                new_columns_added = True
            else:
                print(f"[OK] {col_name} already exists in {table}")
        
        # If columns were newly added, populate them with the existing status value
        if new_columns_added:
            print("Populating new status columns with existing general status values...")
            cursor.execute("""
                UPDATE hangers 
                SET service_status = status, 
                    barcode_status = status, 
                    wheel_status = status, 
                    checking_list_status = status
            """)
            print("[OK] Populated status values successfully!")
            
        connection.commit()
        print("\n[OK] Migration completed successfully!")
        return True
        
    except Error as e:
        print(f"Error during migration: {e}")
        if connection:
            connection.rollback()
        return False
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()

if __name__ == "__main__":
    print("Starting hangers status columns migration...")
    run_migration()
