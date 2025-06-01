from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
import uuid
import re

app = Flask(__name__, template_folder='templates')
app.secret_key = os.urandom(24)

# Enable CORS for all routes and origins
CORS(app, origins="*", methods=["GET", "POST"])

# Load data
try:
    time_slots = pd.read_csv('Time Slots.csv')
    timetable_data = pd.read_csv('Updated_Processed_Timetable.csv')
    time_labels = pd.read_csv('Time Slots.csv').iloc[:, 0].tolist()
except Exception:
    time_slots = pd.DataFrame()
    timetable_data = pd.DataFrame()
    time_labels = []

@app.route('/')
def index():
    return render_template('index.html', session_id=str(uuid.uuid4()))

@app.route('/api/courses')
def get_courses():
    try:
        courses = [
            {
                'code': row['Course Code'], 
                'name': row['Course Name'], 
                'credits': row['Credit']
            } 
            for _, row in timetable_data.iterrows() 
            if not pd.isna(row['Credit'])
        ]
        
        return jsonify({
            "courses": courses,
            "days": list(time_slots.columns) if not time_slots.empty else [],
            "timeLabels": time_labels
        })
    except Exception as e:
        return jsonify({"error": f"Failed to load courses: {str(e)}"}), 500

@app.route('/api/timetable', methods=['POST'])
def get_timetable():
    try:
        selected_courses = request.json.get('courses', []) if request.json else []
        if not selected_courses:
            return jsonify({"error": "No courses selected"}), 400
        
        # Create timetable structure
        timetable = create_timetable(selected_courses)
        clean_timetable = {}
        days = [col for col in timetable.columns if col != 'Time Slot']
        
        # Initialize days
        for day in days:
            clean_timetable[day.lower()] = []
        
        # Process each time slot
        for idx, row in timetable.iterrows():
            time_slot = time_labels[idx] if idx < len(time_labels) else f"Slot {idx + 1}"
            
            for day in days:
                content = str(row[day]) if pd.notna(row[day]) else ""
                clean_info = clean_course_info(content)
                
                if clean_info:
                    clean_timetable[day.lower()].append({
                        "time": time_slot,
                        "class": clean_info
                    })
        
        # Remove empty days
        return jsonify({day: classes for day, classes in clean_timetable.items() if classes})
    except Exception as e:
        return jsonify({"error": f"Failed to generate timetable: {str(e)}"}), 500

def clean_course_info(content):
    """Clean and format course information"""
    if not content or content.strip() in ['', 'nan'] or re.match(r'^[A-Z]\d+$', content.strip()):
        return None
    
    if content.strip() in ['T1', 'T2', 'T3', 'O1', 'O2']:
        return None
    
    # Remove brackets and clean content
    content = re.sub(r'\([^)]*\)', '', content).replace('\n', ', ')
    parts = [part.strip() for part in content.split(',') if part.strip()]
    clean_parts = [part for part in parts if not re.match(r'^[A-Z]\d+$', part) and part]
    
    return ', '.join(clean_parts) if clean_parts else None

def create_timetable(selected_courses):
    """Create timetable data structure"""
    course_info = {}
    for _, row in timetable_data.iterrows():
        if row['Course Code'] in selected_courses:
            course_info[row['Course Code']] = {
                'name': row['Course Name'],
                'Lecture': str(row.get('Lecture Time', '')),
                'Tutorial': str(row.get('Tutorial Time', '')),
                'Lab': str(row.get('Lab Time', '')),
                'Lecture_Location': str(row.get('Lecture Location', '')),
                'Tutorial_Location': str(row.get('Tutorial Location', '')),
                'Lab_Location': str(row.get('Lab Location', ''))
            }

    timetable = time_slots.copy().reset_index(drop=True)
    
    for slot in timetable.index:
        for day in timetable.columns:
            entries = []
            for code, info in course_info.items():
                for session_type in ['Lecture', 'Tutorial', 'Lab']:
                    times = info.get(session_type, '')
                    if pd.isna(times) or times == 'nan':
                        continue
                        
                    if timetable.at[slot, day] in [t.strip() for t in times.split(',') if t.strip()]:
                        location = info.get(f"{session_type}_Location", "")
                        location_text = f"\n{location}" if location and location != "nan" else ""
                        entries.append(f"{code}\n{info['name']}\n{session_type}{location_text}")

            if len(entries) > 1:
                display = "/ ".join([e.split("\n")[0].strip() for e in entries]) + "\n(Clash)"
                timetable.at[slot, day] = display
            elif entries:
                timetable.at[slot, day] = entries[0]
    
    return timetable

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
