from flask import Flask, render_template, request, send_file
import pandas as pd
from PIL import Image, ImageDraw, ImageFont
import os

app = Flask(__name__, template_folder='templates')

@app.route('/', methods=['GET'])
def index():
    updated_processed_timetable = pd.read_csv('Updated_Processed_Timetable.csv')
    courses = [{'code': row['Course Code'], 'name': row['Course Name']} for index, row in updated_processed_timetable.iterrows()]
    return render_template('index.html', courses=courses)

@app.route('/generate-timetable', methods=['POST'])
def generate_timetable():
    selected_courses = request.form.getlist('courses')
    image_path = create_timetable_image(selected_courses)
    return send_file(image_path, as_attachment=True)

def create_timetable_image(selected_courses):
    # Load the timetables
    time_slots_file = pd.read_csv('Timetable 2024-25, Sem-I - Time Slots.csv')
    updated_processed_timetable = pd.read_csv('Updated_Processed_Timetable.csv')

    # Set the first row as column headers and drop the first row
    time_slots_file.columns = time_slots_file.iloc[0]
    time_slots_file = time_slots_file[1:]

    # Process the timetable to filter by selected courses
    course_slots = {}
    for _, row in updated_processed_timetable.iterrows():
        if row['Course Code'] in selected_courses:
            course_slots[row['Course Code']] = {
                'name': row['Course Name'],
                'Lecture': str(row.get('Lecture Time', '')),
                'Tutorial': str(row.get('Tutorial Time', '')),
                'Lab': str(row.get('Lab Time', ''))
            }

    personalized_timetable = time_slots_file.copy()
    overlaps = {}

    # Replace time slots with course information
    for slot in personalized_timetable.index:
        for day in personalized_timetable.columns:
            entries = []
            for code, info in course_slots.items():
                for session_type in ['Lecture', 'Tutorial', 'Lab']:
                    times = info.get(session_type)
                    if times and personalized_timetable.at[slot, day] in [time.strip() for time in times.split(',') if time.strip()]:
                        entries.append(f" {code}\n{info['name']} \n {session_type}")

            if len(entries) > 1:
                overlaps[f"{slot} {day}"] = entries
                display=""
                for ent in entries:
                    display += ent[:7]+'/'
                else:
                    display = display[:-1] +"\n(Clash)"
                personalized_timetable.at[slot, day] = display
            elif entries:
                personalized_timetable.at[slot, day] = entries[0]

    # Generate image of the timetable
    output_path = 'Timetable.png'
    generate_image(personalized_timetable, output_path)
    return output_path


def generate_image(dataframe, output_path):
    # Image parameters
    cell_width = 150
    cell_height = 50
    margin = 2
    font_size = 14
    header_color = (169, 204, 227)
    cell_color = (245, 245, 245)
    text_color = (0, 0, 0)

    # Create image and draw
    image_width = len(dataframe.columns) * (cell_width + margin) + margin
    image_height = (len(dataframe) + 1) * (cell_height + margin) + margin
    image = Image.new("RGB", (image_width, image_height), "white")
    draw = ImageDraw.Draw(image)

    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except IOError:
        font = ImageFont.load_default()

    # Draw headers
    for i, column in enumerate(dataframe.columns):
        x = margin + i * (cell_width + margin)
        draw.rectangle([x, margin, x + cell_width, margin + cell_height], fill=header_color)
        draw.text((x + 5, margin + 5), column, fill=text_color, font=font)

    # Ensure index is integer
    dataframe.reset_index(drop=True, inplace=True)

    # Draw cells
    for index, row in dataframe.iterrows():
        for i, column in enumerate(dataframe.columns):
            cell_text = str(row[column])
            x = margin + i * (cell_width + margin)
            y = margin + (index + 1) * (cell_height + margin)
            draw.rectangle([x, y, x + cell_width, y + cell_height], fill=cell_color)
            draw.text((x + 5, y + 5), cell_text, fill=text_color, font=font)

    image.save(output_path)



if __name__ == '__main__':
    app.run(debug=True)