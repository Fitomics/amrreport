from flask import Flask, render_template, send_from_directory, request, jsonify
import os
import sqlite3
import json
from datetime import datetime

app = Flask(__name__, template_folder='./')

# Configure SQLite database path
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'discovery_data.db')

def init_db():
    """Initialize the SQLite database with required tables if they don't exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create clients table to store client metadata
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS clients (
        client_id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT,
        last_name TEXT,
        exam_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create data table to store all key-value pairs
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS client_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        key TEXT NOT NULL,
        value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (client_id),
        UNIQUE (client_id, key)
    )
    ''')
    
    conn.commit()
    conn.close()
    print("Database initialized successfully")

@app.route('/')
def index():
    """Serve the main AMR report page."""
    return render_template('amr.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files."""
    return send_from_directory(os.path.dirname(os.path.abspath(__file__)), filename)

@app.route('/api/save', methods=['POST'])
def save_form_data():
    """Save form data to the database."""
    data = request.json
    
    if not data:
        return jsonify({'status': 'error', 'message': 'No data provided'}), 400
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Extract client information
        first_name = data.get('firstName', '')
        last_name = data.get('lastName', '')
        exam_date = data.get('testDate', '')
        
        # Find or create client record
        cursor.execute(
            "SELECT client_id FROM clients WHERE first_name = ? AND last_name = ? AND exam_date = ?",
            (first_name, last_name, exam_date)
        )
        client = cursor.fetchone()
        
        if client:
            client_id = client[0]
            # Update the updated_at timestamp
            cursor.execute(
                "UPDATE clients SET updated_at = CURRENT_TIMESTAMP WHERE client_id = ?",
                (client_id,)
            )
        else:
            # Create new client
            cursor.execute(
                "INSERT INTO clients (first_name, last_name, exam_date) VALUES (?, ?, ?)",
                (first_name, last_name, exam_date)
            )
            client_id = cursor.lastrowid
        
        # Store all data points
        for key, value in data.items():
            cursor.execute(
                """
                INSERT INTO client_data (client_id, key, value) VALUES (?, ?, ?)
                ON CONFLICT(client_id, key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
                """,
                (client_id, key, str(value), str(value))
            )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'status': 'success', 
            'message': 'Data saved successfully',
            'client_id': client_id
        })
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/clients', methods=['GET'])
def get_clients():
    """Get list of all clients in the database."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # This enables column access by name
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT client_id, first_name, last_name, exam_date, updated_at FROM clients ORDER BY updated_at DESC"
        )
        clients = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({'status': 'success', 'clients': clients})
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/client/<int:client_id>', methods=['GET'])
def get_client_data(client_id):
    """Get all data for a specific client."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get client info
        cursor.execute(
            "SELECT client_id, first_name, last_name, exam_date, updated_at FROM clients WHERE client_id = ?",
            (client_id,)
        )
        client = dict(cursor.fetchone() or {})
        
        if not client:
            return jsonify({'status': 'error', 'message': 'Client not found'}), 404
        
        # Get all client data
        cursor.execute(
            "SELECT key, value FROM client_data WHERE client_id = ?",
            (client_id,)
        )
        
        client_data = {row['key']: row['value'] for row in cursor.fetchall()}
        
        conn.close()
        
        return jsonify({
            'status': 'success', 
            'client': client,
            'data': client_data
        })
    
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Initialize database when the application starts
with app.app_context():
    init_db()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
