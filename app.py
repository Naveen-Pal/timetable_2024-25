from flask import Flask, render_template, request, send_file
import pandas as pd
from PIL import Image, ImageDraw, ImageFont

app = Flask(__name__, template_folder='templates')

def wrap_text(text, font, draw, max_width):
    words = text.split()
    wrapped_lines = []
    current_line = words[0]
    for word in words[1:]:
        test_line = f"{current_line} {word}"
        # Correct usage of textsize with ImageDraw object
        if draw.textsize(test_line, font=font)[0] > max_width:
            wrapped_lines.append(current_line)
            current_line = word
        else:
            current_line = test_line
    wrapped_lines.append(current_line)
    return wrapped_lines

@app.route('/')
def index():
    updated_processed_timetable = pd.read_csv('Updated_Processed_Timetable.csv')
    courses = [{'code': row['Course Code'], 'name': row['Course Name']} for index, row in updated_processed_timetable.iterrows()]
    return render_template('index.html', courses=courses)

@app.route('/generate-timetable', methods=['POST'])
def generate_timetable():
    selected_courses = request.form.getlist('courses')

    # Load the provided files
    time_slots_file = pd.read_csv('Timetable 2024-25, Sem-I - Time Slots.csv')
    updated_processed_timetable = pd.read_csv('Updated_Processed_Timetable.csv')

    # Process the time slots file
    time_slots_file.columns = time_slots_file.iloc[0]
    time_slots_file = time_slots_file[1:]
    time_slots_file.set_index('Slot', inplace=True)

    # Map course codes to their corresponding slots including course names
    course_slots = {
        row['Course Code']: {
            'name': row['Course Name'],
            'Lecture': row['Lecture Time'],
            'Tutorial': row['Tutorial Time'],
            'Lab': row['Lab Time']
        }
        for _, row in updated_processed_timetable.iterrows() if row['Course Code'] in selected_courses
    }

    # Initialize a personalized timetable
    personalized_timetable = time_slots_file.copy()

    # Generate an image from the timetable
    cell_width, cell_height = 150, 50
    margin = 2
    font_size = 40
    header_color, cell_color, text_color = (169, 204, 227), (245, 245, 245), (0, 0, 0)
    image_width = len(personalized_timetable.columns) * (cell_width + margin) + margin
    image_height = (len(personalized_timetable) + 2) * (cell_height + margin) + margin

    image = Image.new("RGB", (image_width, image_height), "white")
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except IOError:
        font = ImageFont.load_default()

    # Function to draw cells
    def draw_cell_with_wrapping(x, y, text, fill_color):
        lines = wrap_text(text, font, draw, cell_width - 2 * margin)
        draw.rectangle([x, y, x + cell_width, y + cell_height], fill=fill_color)
        line_height = draw.textsize('Test', font=font)[1]
        current_y = y + (cell_height - line_height * len(lines)) / 2
        for line in lines:
            line_width = draw.textsize(line, font=font)[0]
            draw.text((x + (cell_width - line_width) / 2, current_y), line, fill=text_color, font=font)
            current_y += line_height + 5

    # Draw headers and cells
    for i, column in enumerate(personalized_timetable.columns):
        draw_cell_with_wrapping(margin + i * (cell_width + margin), margin, column, header_color)
    for index, row in personalized_timetable.iterrows():
        for i, column in enumerate(row.index):
            cell_text = str(row[column])
            y = margin + (index + 1) * (cell_height + margin)
            x = margin + i * (cell_width + margin)
            draw_cell_with_wrapping(x, y, cell_text, cell_color)

    output_path = 'Personalized_Timetable_Image_Wrapped.png'
    image.save(output_path)

    return send_file(output_path, mimetype='image/png')

if __name__ == '__main__':
    app.run(debug=True)
