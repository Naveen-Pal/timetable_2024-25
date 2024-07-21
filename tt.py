import pandas as pd

# Load the provided files
time_slots_file = pd.read_csv('Timetable 2024-25, Sem-I - Time Slots.csv')
updated_processed_timetable = pd.read_csv('Updated_Processed_Timetable.csv')

# Process the time slots file
time_slots_file.columns = time_slots_file.iloc[0]  # Set the first row as column headers
time_slots_file = time_slots_file[1:]  # Drop the first row now that it's set as the header
time_slots_file.set_index('Slot', inplace=True)  # Set 'Slot' column as the index

# Define the courses of interest
courses = ['ES 214', 'ES 242', 'ES 243', 'GE 201', 'MA 204', 'MA 205', 'PH 202', 'ES 335']

# Map course codes to their corresponding slots including course names
course_slots = {
    row['Course Code']: {
        'name': row['Course Name'],
        'Lecture': row['Lecture Time'],
        'Tutorial': row['Tutorial Time'],
        'Lab': row['Lab Time']
    }
    for _, row in updated_processed_timetable.iterrows() if row['Course Code'] in courses
}

# Initialize a personalized timetable with the same structure as the time slots file
personalized_timetable = time_slots_file.copy()

# Prepare a dictionary to track overlap
overlaps = {}

# Replace time slots with course information
for slot in personalized_timetable.index:
    for day in personalized_timetable.columns:
        current_slot = personalized_timetable.at[slot, day]
        entries = []
        # Check each course and its associated slots
        for code, info in course_slots.items():
            for session_type in ['Lecture', 'Tutorial', 'Lab']:
                times = info[session_type]
                if pd.notna(times) and current_slot in times.split(','):
                    # Create entry for the course
                    course_entry = f"{info['name']} ({code}) {session_type}"
                    entries.append(course_entry)
        
        # Check if there is an overlap
        if len(entries) > 1:
            overlaps[f"{slot} {day}"] = entries
            personalized_timetable.at[slot, day] = " / ".join(entries) + " [Overlap]"
        elif entries:
            personalized_timetable.at[slot, day] = entries[0]

# Print the overlaps if any
print("Overlaps found:", overlaps)

# Save the personalized timetable to a CSV file
personalized_timetable.to_csv('Personalized_Timetable.csv')
