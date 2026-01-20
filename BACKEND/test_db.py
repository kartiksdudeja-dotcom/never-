import mysql.connector
from mysql.connector import Error

try:
    conn = mysql.connector.connect(
        host='127.0.0.1',
        user='ems_user',
        password='Kartik12345',
        database='ems_hanger',
        connection_timeout=5
    )
    print('Database connected successfully')
    conn.close()
except Error as e:
    print(f'Database connection error: {e}')
