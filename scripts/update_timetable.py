import os
import pandas as pd
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

def get_google_sheets_data():
    """Fetch data from Google Sheets using service account credentials."""
    try:
        # Set up credentials
        credentials = service_account.Credentials.from_service_account_file(
            'credentials.json',
            scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
        )

        # Build the Sheets API service
        service = build('sheets', 'v4', credentials=credentials)

        # Get the spreadsheet data
        sheet = service.spreadsheets()
        result = sheet.values().get(
            spreadsheetId=os.environ['SPREADSHEET_ID'],
            range=os.environ['SHEET_NAME']
        ).execute()

        values = result.get('values', [])
        if not values:
            print('No data found.')
            return None

        # Convert to DataFrame
        df = pd.DataFrame(values[1:], columns=values[0])
        return df

    except HttpError as error:
        print(f'An error occurred: {error}')
        return None

def update_csv_files(df):
    """Update the CSV files with new data."""
    if df is None:
        return False

    try:
        # Save the raw timetable data
        df.to_csv('Timetable.csv', index=False)
        
        # Process the data (you may need to adjust this based on your specific requirements)
        # This is a placeholder for any data processing you need
        processed_df = df.copy()  # Add your processing logic here
        
        # Save the processed timetable
        processed_df.to_csv('Updated_Processed_Timetable.csv', index=False)
        
        return True
    except Exception as e:
        print(f'Error updating CSV files: {e}')
        return False

def main():
    """Main function to update timetable data."""
    print('Fetching data from Google Sheets...')
    df = get_google_sheets_data()
    
    if df is not None:
        print('Updating CSV files...')
        success = update_csv_files(df)
        if success:
            print('Successfully updated timetable data.')
        else:
            print('Failed to update timetable data.')
    else:
        print('Failed to fetch data from Google Sheets.')

if __name__ == '__main__':
    main() 