#!/usr/bin/env python3
"""
Migration script to add standard_value and image columns to checklist master tables
Run this once to update existing database structure
"""

import mysql.connector
from mysql.connector import Error
from config import Config

def run_migration():
    """Add standard_value and image columns to all checklist_master tables"""
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
        
        tables = [
            'service_checklist_master',
            'barcode_checklist_master',
            'wheel_checklist_master',
            'checking_list_checklist_master'
        ]
        
        for table in tables:
            print(f"Checking columns for {table}...")
            
            # Check if standard_value column exists
            cursor.execute(f"""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '{table}' AND COLUMN_NAME = 'standard_value'
            """)
            if not cursor.fetchone():
                print(f"  Adding standard_value column to {table}...")
                cursor.execute(f"""
                    ALTER TABLE {table} 
                    ADD COLUMN standard_value VARCHAR(255) DEFAULT ''
                """)
                print(f"  ✓ standard_value added to {table}")
            else:
                print(f"  ✓ standard_value already exists in {table}")
            
            # Check if image column exists
            cursor.execute(f"""
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '{table}' AND COLUMN_NAME = 'image'
            """)
            if not cursor.fetchone():
                print(f"  Adding image column to {table}...")
                cursor.execute(f"""
                    ALTER TABLE {table} 
                    ADD COLUMN image LONGTEXT DEFAULT NULL
                """)
                print(f"  ✓ image added to {table}")
            else:
                print(f"  ✓ image already exists in {table}")
        
        connection.commit()
        print("\n✓ Migration completed successfully!")
        
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
    
    return True

if __name__ == "__main__":
    print("Starting database migration...")
    success = run_migration()
    exit(0 if success else 1)
