import pandas as pd

# Load the uploaded file
file_path = 'Timetable 2024-25, Sem-II - Time table.csv'
df = pd.read_csv(file_path)

# Display initial rows to understand structure
import re

# Step 1: Filter rows with valid course codes (two letters followed by digits)
df = df[df['Course Code'].str.len() <= 15]
column_names = list(df.columns)

# Step 2: Select relevant columns and rename them
df = df[['Course Name', 'Course Code', 'Lecture', 'Tutorial', 'Lab', 'C']]
df.columns = ['Course Name', 'Course Code', 'Lecture Time', 'Tutorial Time', 'Lab Time', 'Credit']

# Step 3: Remove text within parentheses in 'Lecture Time', 'Tutorial Time', 'Lab Time'
def remove_parentheses(text):
    return re.sub(r'\(.*?\)', '', text) if isinstance(text, str) else text

df['Lecture Time'] = df['Lecture Time'].apply(remove_parentheses).str.strip()
df['Tutorial Time'] = df['Tutorial Time'].apply(remove_parentheses).str.strip()
df['Lab Time'] = df['Lab Time'].apply(remove_parentheses).str.strip()

# Display cleaned data
df.reset_index(drop=True, inplace=True)
# Save the cleaned data to a new CSV file
cleaned_file_path = 'Updated_Processed_Timetable.csv'
df.to_csv(cleaned_file_path, index=False)

