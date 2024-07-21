from flask import Flask, render_template, request, send_file, redirect, url_for
import pandas as pd
from PIL import Image, ImageDraw, ImageFont

app = Flask(__name__)

def wrap_text(text, font, max_width):
    words = text.split()
    wrapped_lines = []
    current_line = words[0]
    for word in words[1:]:
        test_line = f"{current_line} {word}"
        if draw.textsize(test_line, font=font)[0] > max_width:
            wrapped_lines.append(current_line)
            current_line = word
        else:
            current_line = test_line
    wrapped_lines.append(current_line)
    return wrapped_lines

@app.route('/')
def index():
    # Load courses for display
    updated_processed_timetable = pd.read_csv('Updated_Processed_Timetable.csv')
    courses = [{'code': row['Course Code'], 'name': row['Course Name']} for index, row in updated_processed_timetable.iterrows()]
    return render_template('index.html', courses=courses)

@app.route('/generate-timetable', methods=['POST'])
def generate_timetable():
    selected_courses = request.form.getlist('courses')

    # Load and process the CSV files, assuming they are located in the root directory
    time_slots_file = pd.read_csv('Timetable 2024-25, Sem-I - Time Slots.csv')
    time_slots_file.columns = time_slots_file.iloc[0]
    time_slots_file = time_slots_file[1:]
    time_slots_file.set_index('Slot', inplace=True)

    # Assuming the same processing as described earlier here

    # Save the processed CSV and generate an image
    output_path = 'Personalized_Timetable_Image_Wrapped.png'
    personalized_timetable.to_csv('Personalized_Timetable.csv')
    # Your image generation code here

    return send_file(output_path, mimetype='image/png')

if __name__ == '__main__':
    app.run(debug=True)
