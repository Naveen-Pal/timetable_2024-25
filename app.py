from flask import Flask, render_template, request, session, jsonify
import pandas as pd
import os
import uuid
import logging
import traceback

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

app = Flask(__name__, template_folder='templates')
app.secret_key = os.urandom(24)

output_dir = 'generated_images'
os.makedirs(output_dir, exist_ok=True)

try:
    time_slots = pd.read_csv('Time Slots.csv')
    timetable_data = pd.read_csv('Updated_Processed_Timetable.csv')    
    logger.info("Timetable data loaded successfully")
except Exception as e:
    logger.error(f"Error loading data: {e}")
    timetable_data = pd.DataFrame()
    time_slots = pd.DataFrame()

@app.route('/api/courses', methods=['GET'])
def get_courses():
    try:
        courses = [
            {
                'code': row['Course Code'], 
                'name': row['Course Name'], 
                'credits': row['Credit'],
                'lecture': str(row.get('Lecture Time', '')),
                'tutorial': str(row.get('Tutorial Time', '')),
                'lab': str(row.get('Lab Time', '')),
                'lecture_location': str(row.get('Lecture Location', '')),
                'tutorial_location': str(row.get('Tutorial Location', '')),
                'lab_location': str(row.get('Lab Location', ''))
            } 
            for _, row in timetable_data.iterrows() 
            if not pd.isna(row['Credit'])
        ]
        
        time_slots_csv = pd.read_csv('Time Slots.csv')
        
        days = list(time_slots.columns)
        slots = []
        for idx, row in time_slots.iterrows():
            slot_data = {}
            for day in days:
                slot_data[day] = row[day]
            slots.append(slot_data)
            
        time_slots_column = time_slots_csv.iloc[:, 0].tolist()
        
        return jsonify({
            "courses": courses,
            "days": days,
            "slots": slots,
            "timeLabels": time_slots_column
        })
        
    except Exception as e:
        logger.error(f"Error in get_courses: {e}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/', methods=['GET'])
def index():
    try:
        session_id = session.get('session_id')
        if not session_id:
            session_id = str(uuid.uuid4())
            session['session_id'] = session_id
            
        return render_template('index.html', session_id=session_id)
    except Exception as e:
        logger.error(f"Error in index route: {e}")
        logger.error(traceback.format_exc())
        return render_template('error.html', error="Failed to load timetable data")


@app.route('/api/timetable/text', methods=['POST'])
def get_timetable_text():
    try:
        selected_courses = request.json.get('courses')
        if not selected_courses or not isinstance(selected_courses, list):
            return jsonify({"error": "No courses selected or invalid format"}), 400
            
        try:
            personalized_timetable = create_timetable_data(selected_courses)
            
            text_data = []
            
            # Use only the columns of the personalized timetable (time slots are already included)
            header = list(personalized_timetable.columns)
            text_data.append("\t".join(header))
            
            for _, row in personalized_timetable.iterrows():
                # Directly use the row values without adding time slots again
                text_row = [str(cell).replace('\n', ',') for cell in row]
                text_data.append("\t".join(text_row))
            return jsonify({"text": "\n".join(text_data)})
            
        except Exception as e:
            logger.error(f"Error creating text timetable: {e}")
            logger.error(traceback.format_exc())
            return jsonify({"error": "Failed to generate text timetable"}), 500
            
    except Exception as e:
        logger.error(f"Error in get_timetable_text: {e}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

def create_timetable_data(selected_courses):
    """Common function to create the timetable data structure"""
    course_slots = {}
    for _, row in timetable_data.iterrows():
        if row['Course Code'] in selected_courses:
            course_slots[row['Course Code']] = {
                'name': row['Course Name'],
                'Lecture': str(row.get('Lecture Time', '')),
                'Tutorial': str(row.get('Tutorial Time', '')),
                'Lab': str(row.get('Lab Time', '')),
                'Lecture_Location': str(row.get('Lecture Location', '')),
                'Tutorial_Location': str(row.get('Tutorial Location', '')),
                'Lab_Location': str(row.get('Lab Location', ''))
            }

    # Create a copy of the time slots dataframe without the index column
    personalized_timetable = time_slots.copy()
    # Ensure there's no index column in the output
    personalized_timetable.reset_index(drop=True, inplace=True)
    overlaps = {}

    for slot in personalized_timetable.index:
        for day in personalized_timetable.columns:
            entries = []
            for code, info in course_slots.items():
                for session_type in ['Lecture', 'Tutorial', 'Lab']:
                    times = info.get(session_type)
                    if pd.isna(times) or times == 'nan':
                        continue
                        
                    if personalized_timetable.at[slot, day] in [time.strip() for time in times.split(',') if time.strip()]:
                        location = info.get(f"{session_type}_Location", "")
                        location_text = f"\n{location}" if location and location != "nan" else ""
                        entries.append(f"{code}\n{info['name']}\n{session_type}{location_text}")

            if len(entries) > 1:
                overlaps[f"{slot} {day}"] = entries
                display = ""
                for ent in entries:
                    # Show full course code in clashes too
                    display += ent.split("\n")[0].strip() + "/ "
                
                display = display[:-2] + "\n(Clash)"
                personalized_timetable.at[slot, day] = display
            elif entries:
                personalized_timetable.at[slot, day] = entries[0]
    
    return personalized_timetable

@app.errorhandler(404)
def page_not_found(e):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
