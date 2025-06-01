# Timetable Application

This is a web-based timetable application that allows users to view and filter personalized timetables using CSV files. The application is built with Python and Flask, and supports deployment on platforms like Heroku using Docker.

## Features

- Upload and process timetable CSV files
- Filter timetables based on user input
- Download updated or personalized timetables
- Simple web interface with custom styles and images

## Project Structure

- `app.py`: Main Flask application
- `scripts/csv-filter.py`: Script for filtering CSV files
- `static/`: Static assets (CSS, JS, images)
- `templates/`: HTML templates
- `requirements.txt`: Python dependencies
- `DockerFile`, `Procfile`, `runtime.txt`: Deployment configuration
- CSV files: Sample and processed timetable data

## Getting Started

### Prerequisites

- Python 3.8+
- pip

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd timetable
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the application:
   ```
   python app.py
   ```

4. Open your browser and go to `http://localhost:5000`

### Docker

To run with Docker:
```
docker build -t timetable-app .
docker run -p 5000:5000 timetable-app
```

## Usage

- Access the web interface to upload or filter timetables.
- Download the processed timetable as needed.

## License

This project is licensed under the MIT License.
