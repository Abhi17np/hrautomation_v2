"""
db.py
Handles all MySQL interaction: connecting, fetching current max slno,
and inserting new punch records while skipping duplicates.
"""

import mysql.connector
from mysql.connector import Error
import config


def get_connection():
    """Open a new MySQL connection."""
    return mysql.connector.connect(
        host=config.MYSQL_HOST,
        port=config.MYSQL_PORT,
        user=config.MYSQL_USER,
        password=config.MYSQL_PASSWORD,
        database=config.MYSQL_DATABASE,
    )


def ensure_unique_constraint(conn):
    """
    Make sure (employee_id, punch_datetime) has a UNIQUE constraint so that
    re-inserting the same punch twice is safely ignored by the DB itself.
    Safe to run every time — does nothing if it already exists.
    """
    cursor = conn.cursor()
    try:
        cursor.execute(f"""
            ALTER TABLE {config.MYSQL_TABLE}
            ADD CONSTRAINT uq_employee_punch UNIQUE (employee_id, punch_datetime)
        """)
        conn.commit()
        print("[db] Added unique constraint on (employee_id, punch_datetime).")
    except Error as e:
        if e.errno == 1061:  # duplicate key name -> already exists
            pass
        else:
            print(f"[db] Warning while ensuring unique constraint: {e}")
    finally:
        cursor.close()


def get_last_slno(conn):
    """Return current MAX(slno) in the table, or 0 if table is empty."""
    cursor = conn.cursor()
    cursor.execute(f"SELECT COALESCE(MAX(slno), 0) FROM {config.MYSQL_TABLE}")
    (max_slno,) = cursor.fetchone()
    cursor.close()
    return max_slno


def get_last_punch_datetime(conn):
    """
    Return the most recent punch_datetime already stored, or None if the
    table is empty. Used so we only ask the device for punches newer than
    this, instead of re-scanning the entire device log every cycle.
    """
    cursor = conn.cursor()
    cursor.execute(f"SELECT MAX(punch_datetime) FROM {config.MYSQL_TABLE}")
    (last_dt,) = cursor.fetchone()
    cursor.close()
    return last_dt


def insert_records(conn, records):
    """
    Insert a list of (slno, employee_id, punch_datetime) tuples.
    Uses INSERT IGNORE so duplicate (employee_id, punch_datetime) pairs
    are silently skipped rather than raising an error.
    Returns the number of rows actually inserted.
    """
    if not records:
        return 0

    cursor = conn.cursor()
    sql = f"""
        INSERT IGNORE INTO {config.MYSQL_TABLE} (slno, employee_id, punch_datetime)
        VALUES (%s, %s, %s)
    """
    cursor.executemany(sql, records)
    conn.commit()
    inserted = cursor.rowcount
    cursor.close()
    return inserted