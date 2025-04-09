import pandas as pd
import re

# Load the uploaded file
file_path = 'Timetable.csv'
df = pd.read_csv(file_path)

df = df[df['Course Code'].str.len() <= 15]
column_names = list(df.columns)

df = df[['Course Name', 'Course Code', 'Lecture', 'Tutorial', 'Lab', 'C']]
df.columns = ['Course Name', 'Course Code', 'Lecture Time', 'Tutorial Time', 'Lab Time', 'Credit']

def extract_location(text):
    if not isinstance(text, str):
        return text, ""
    
    locations = re.findall(r'\((.*?)\)', text)
    location = ", ".join([loc for loc in locations if len(loc) < 30])
    clean_text = re.sub(r'\(.*?\)', '', text).strip()
    
    return clean_text, location

df['Lecture Location'] = ""
df['Tutorial Location'] = ""
df['Lab Location'] = ""

for col, loc_col in [('Lecture Time', 'Lecture Location'), 
                     ('Tutorial Time', 'Tutorial Location'), 
                     ('Lab Time', 'Lab Location')]:
    df[[col, loc_col]] = pd.DataFrame(df[col].apply(extract_location).tolist(), index=df.index)

df.reset_index(drop=True, inplace=True)
cleaned_file_path = 'Updated_Processed_Timetable.csv'
df.to_csv(cleaned_file_path, index=False)

