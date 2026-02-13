#!/usr/bin/env python3
"""
Database optimization script to add indexes for faster queries
Run this once after initial setup: python3 optimize_db.py
"""

from database import get_db_connection
import sys

def add_database_indexes():
    """Add indexes to tables for optimized query performance"""
    try:
        connection = get_db_connection()
        if not connection:
            print("✗ Database connection failed")
            return False
        
        cursor = connection.cursor()
        
        # List of indexes to create
        indexes = [
            # Users table
            ("users", "idx_user_id", "user_id"),
            ("users", "idx_status", "status"),
            
            # Hangers table
            ("hangers", "idx_hanger_no", "hanger_no"),
            ("hangers", "idx_status", "status"),
            
            # Service Checklist table
            ("service_checklist", "idx_hanger_id", "hanger_id"),
            ("service_checklist", "idx_created_at", "created_at"),
            ("service_checklist", "idx_hanger_created", ["hanger_id", "created_at"]),
            
            # Barcode Checklist table
            ("barcode_checklist", "idx_hanger_id", "hanger_id"),
            ("barcode_checklist", "idx_created_at", "created_at"),
            
            # Wheel Checklist table
            ("wheel_checklist", "idx_hanger_id", "hanger_id"),
            ("wheel_checklist", "idx_created_at", "created_at"),
            
            # Checking List Checklist table
            ("checking_list_checklist", "idx_hanger_id", "hanger_id"),
            ("checking_list_checklist", "idx_created_at", "created_at"),
            
            # Activity Logs table
            ("activity_logs", "idx_created_at", "created_at"),
            ("activity_logs", "idx_user_id", "user_id"),
            ("activity_logs", "idx_hanger_id", "hanger_id"),
        ]
        
        print("🔧 Adding database indexes for optimization...")
        
        for table, index_name, columns in indexes:
            try:
                # Check if index already exists
                cursor.execute(f"""
                    SELECT 1 FROM information_schema.statistics 
                    WHERE table_name = %s AND index_name = %s
                """, (table, index_name))
                
                if cursor.fetchone():
                    print(f"  ✓ Index {index_name} already exists on {table}")
                    continue
                
                # Create composite or single column index
                if isinstance(columns, list):
                    cols = ", ".join(columns)
                    sql = f"CREATE INDEX {index_name} ON {table} ({cols})"
                else:
                    sql = f"CREATE INDEX {index_name} ON {table} ({columns})"
                
                cursor.execute(sql)
                print(f"  ✓ Created index {index_name} on {table}")
                
            except Exception as e:
                print(f"  ⚠ Error creating index {index_name}: {e}")
                continue
        
        connection.commit()
        cursor.close()
        connection.close()
        
        print("✓ Database optimization complete!")
        return True
        
    except Exception as e:
        print(f"✗ Error during optimization: {e}")
        return False


if __name__ == "__main__":
    success = add_database_indexes()
    sys.exit(0 if success else 1)
