from database import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()

tables = ['barcode_checklist', 'wheel_checklist', 'checking_list_checklist', 'service_checklist']

for table in tables:
    print(f"\n=== {table} ===")
    cursor.execute(f'DESCRIBE {table}')
    result = cursor.fetchall()
    for row in result:
        print(row[0], row[1])

cursor.close()
conn.close()
