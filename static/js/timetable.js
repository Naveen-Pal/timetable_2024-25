document.addEventListener('DOMContentLoaded', function() {
    let selectedCourses = [];
    const searchField = document.getElementById('search-field');
    const courseTableBody = document.getElementById('course-table-body');
    const previewButton = document.getElementById('preview-button');
    const deselectAllButton = document.getElementById('deselect-all');
    const timetableContainer = document.getElementById('timetable-container');
    const downloadOptions = document.getElementById('download-options');
    const downloadImage = document.getElementById('download-image');
    const downloadExcel = document.getElementById('download-excel');
    const downloadCSV = document.getElementById('download-csv');
    const totalCreditsElement = document.getElementById('total-credits');
    const errorBox = document.getElementById('error-box');
    const successBox = document.getElementById('success-box');
    
    let courseData = [];
    let days = [];
    let slots = [];
    let timeLabels = [];
    let totalCredits = 0;
    let timetableData = null;
    
    fetch('/api/courses')
        .then(response => response.json())
        .then(data => {
            courseData = data.courses;
            days = data.days;
            slots = data.slots;
            timeLabels = data.timeLabels;
            
            renderCourseTable(courseData);
        })
        .catch(error => {
            console.error('Error fetching course data:', error);
            showError('Failed to load course data. Please try refreshing the page.');
        });
        
    searchField.addEventListener('input', function() {
        const searchQuery = this.value.toLowerCase();
        renderCourseTable(courseData, searchQuery);
    });
    
    previewButton.addEventListener('click', function() {
        if (selectedCourses.length === 0) {
            showError('Please select at least one course.');
            return;
        }
        
        generateTimetable();
    });
    
    deselectAllButton.addEventListener('click', function() {
        selectedCourses = [];
        totalCredits = 0;
        updateTotalCredits();
        renderCourseTable(courseData, searchField.value.toLowerCase());
        timetableContainer.innerHTML = '';
        downloadOptions.style.display = 'none';
        showSuccess('All courses have been deselected.');
    });
    
    downloadImage.addEventListener('click', function() {
        if (selectedCourses.length === 0) {
            showError('Please select at least one course.');
            return;
        }
        
        generateTimetableImage();
    });
    
    downloadExcel.addEventListener('click', function() {
        if (selectedCourses.length === 0) {
            showError('Please select at least one course.');
            return;
        }
        
        generateTimetableExcel();
    });
    
    downloadCSV.addEventListener('click', function() {
        if (selectedCourses.length === 0) {
            showError('Please select at least one course.');
            return;
        }
        
        generateTimetableCSV();
    });
    
    // Render course table
    function renderCourseTable(courses, searchQuery = '') {
        courseTableBody.innerHTML = '';
        
        const filteredCourses = courses.filter(course => {
            return course.code.toLowerCase().includes(searchQuery) || 
                   course.name.toLowerCase().includes(searchQuery);
        });
        
        if (filteredCourses.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 4;
            cell.textContent = 'No courses found matching your search.';
            row.appendChild(cell);
            courseTableBody.appendChild(row);
            return;
        }
        
        filteredCourses.forEach(course => {
            const row = document.createElement('tr');
            
            const codeCell = document.createElement('td');
            codeCell.textContent = course.code;
            row.appendChild(codeCell);
            
            const nameCell = document.createElement('td');
            nameCell.textContent = course.name;
            row.appendChild(nameCell);
            
            const creditsCell = document.createElement('td');
            creditsCell.textContent = course.credits;
            row.appendChild(creditsCell);
            
            const checkboxCell = document.createElement('td');
            const checkboxWrapper = document.createElement('div');
            checkboxWrapper.className = 'course-checkbox-wrapper';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.courseCode = course.code;
            checkbox.dataset.credits = course.credits;
            checkbox.checked = selectedCourses.includes(course.code);
            
            checkbox.addEventListener('change', function() {
                if (this.checked) {
                    if (!selectedCourses.includes(course.code)) {
                        selectedCourses.push(course.code);
                        totalCredits += parseInt(course.credits);
                    }
                } else {
                    const index = selectedCourses.indexOf(course.code);
                    if (index > -1) {
                        selectedCourses.splice(index, 1);
                        totalCredits -= parseInt(course.credits);
                    }
                }
                updateTotalCredits();
            });
            
            checkboxWrapper.appendChild(checkbox);
            checkboxCell.appendChild(checkboxWrapper);
            row.appendChild(checkboxCell);
            
            courseTableBody.appendChild(row);
        });
    }
    
    function updateTotalCredits() {
        totalCreditsElement.textContent = totalCredits;
    }
    
    function generateTimetable() {
        if (selectedCourses.length === 0) {
            showError('Please select at least one course.');
            return;
        }
        
        timetableContainer.innerHTML = '<div class="loader" style="display:block;"></div>';
        
        const table = document.createElement('table');
        table.className = 'timetable';
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        days.forEach(day => {
            const th = document.createElement('th');
            th.className = 'day-header';
            
            const fullSpan = document.createElement('span');
            fullSpan.className = 'day-full';
            fullSpan.textContent = day;
            
            const abbrSpan = document.createElement('span');
            abbrSpan.className = 'day-abbr';
            abbrSpan.textContent = day[0];
            abbrSpan.style.display = 'none';
            
            th.appendChild(fullSpan);
            th.appendChild(abbrSpan);
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        
        fetch('/api/timetable/text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ courses: selectedCourses }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showError(data.error);
                return;
            }
            
            timetableData = data.text;
            
            const lines = data.text.split('\n');
            const headers = lines[0].split('\t');
            console.log(lines);
            
            for (let i = 1; i < lines.length; i++) {
                const cells = lines[i].split('\t');
                const row = document.createElement('tr');

                const timeCell = document.createElement('td');
                timeCell.className = 'time-slot';
                timeCell.textContent = timeLabels[i-1]; // Use the time labels from API
                row.appendChild(timeCell);
                
                for (let j = 1; j < cells.length; j++) {
                    const cell = document.createElement('td');
                    
                    if (cells[j].includes('(Clash)')) {
                        cell.className = 'clash';
                    }
                    
                    if (cells[j].trim() !== '') {
                        const courseCell = document.createElement('div');
                        courseCell.className = 'course-cell';
                        
                        const parts = cells[j].split(',');

                            const cellContent = cells[j].replace(' (Clash)', '');
                            const contentLines = cellContent.split(',');
                            
                            if (contentLines.length > 0) {
                                const codeSpan = document.createElement('span');
                                codeSpan.className = 'course-code';
                                codeSpan.textContent = contentLines[0];
                                courseCell.appendChild(codeSpan);
                            
                                if (contentLines.length > 1 && contentLines[1]) {
                                    const nameSpan = document.createElement('span');
                                    nameSpan.className = 'course-name';
                                    nameSpan.textContent = contentLines[1];
                                    courseCell.appendChild(nameSpan);
                                }
                            
                                if (contentLines.length > 2 && contentLines[2]) {
                                    const typeSpan = document.createElement('span');
                                    typeSpan.className = 'course-type';
                                    typeSpan.textContent = contentLines[2];
                                    courseCell.appendChild(typeSpan);
                                }
                            
                                if (contentLines.length > 3 && contentLines[3]) {
                                    const locationSpan = document.createElement('span');
                                    locationSpan.className = 'course-location';
                                    locationSpan.textContent = contentLines[3];
                                    courseCell.appendChild(locationSpan);
                                }
                            }
                        
                        if (cells[j].includes('(Clash)')) {
                            const clashSpan = document.createElement('span');
                            clashSpan.className = 'course-clash';
                            clashSpan.textContent = '(Clash)';
                            courseCell.appendChild(clashSpan);
                        }
                        
                        cell.appendChild(courseCell);
                    }
                    
                    row.appendChild(cell);
                }
                
                tbody.appendChild(row);
            }
            
            table.appendChild(tbody);
            timetableContainer.innerHTML = '';
            timetableContainer.appendChild(table);
            
            downloadOptions.style.display = 'flex';
            
            downloadOptions.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            console.error('Error generating timetable:', error);
            showError('Failed to generate timetable. Please try again.');
            timetableContainer.innerHTML = '';
        });
    }
    
    function generateTimetableImage() {
        const timetableElement = timetableContainer.querySelector('.timetable');
        
        if (!timetableElement) {
            showError('Timetable not found. Please generate the timetable first.');
            return;
        }
        
        showSuccess('Generating image, please wait...');
        
        html2canvas(timetableElement, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false,
            onclone: function(clonedDoc) {
                const style = clonedDoc.createElement('style');
                style.innerHTML = `
                    .timetable { border-collapse: collapse; width: 100%; }
                    .timetable th, .timetable td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                    .timetable th { background-color: #0066cc; color: white; font-weight: bold; }
                    .timetable td.time-slot { background-color: #f0f0f0; font-weight: bold; }
                    .timetable td.clash { background-color: #ffdddd; }
                    .course-cell { min-height: 45px; }
                    .course-code { font-weight: bold; color: #0066cc; }
                    .course-clash { color: #ff0000; font-weight: bold; }
                `;
                clonedDoc.head.appendChild(style);
            }
        }).then(canvas => {
            // Convert canvas to data URL and trigger download
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            link.download = `Timetable_${formatDateTime()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showSuccess('Image downloaded successfully!');
        }).catch(err => {
            console.error('Error generating image:', err);
            showError('Failed to generate image. Please try again.');
        });
    }
    
    // Generate Excel file using SheetJS
    function generateTimetableExcel() {
        if (!timetableData) {
            showError('No timetable data found. Please generate the timetable first.');
            return;
        }
        
        try {
            const lines = timetableData.split('\n');
            const headers = lines.map(line => line.split('\t'));
            const excelData = headers;
                        
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(excelData);
            
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let c = range.s.c; c <= range.e.c; c++) {
                const cell = XLSX.utils.encode_cell({r: 0, c: c});
                if (!ws[cell]) ws[cell] = {};
                ws[cell].s = {
                    fill: {fgColor: {rgb: "0066CC"}},
                    font: {color: {rgb: "FFFFFF"}, bold: true}
                };
            }
            
            XLSX.utils.book_append_sheet(wb, ws, "Timetable");
            XLSX.writeFile(wb, `Timetable_${formatDateTime()}.xlsx`);
            
            showSuccess('Excel file downloaded successfully!');
        } catch (err) {
            console.error('Error generating Excel file:', err);
            showError('Failed to generate Excel file. Please try again.');
        }
    }
    
    function generateTimetableCSV() {
        if (!timetableData) {
            showError('No timetable data found. Please generate the timetable first.');
            return;
        }
        
        try {
            // Parse timetable data
            const lines = timetableData.split('\n');
            const headers = lines[0].split('\t');
            
            let csvContent = headers.join(',') + '\n';
            
            for (let i = 1; i < lines.length; i++) {
                const rowData = lines[i].split('\t');
                
                // Format for CSV (handle commas and quotes)
                const formattedData = rowData.map(cell => {
                    const cleanedCell = cell.replace(/"/g, '');
                    if (cleanedCell.includes(',') || cleanedCell.includes('\n')) {
                        return `"${cleanedCell}"`;
                    }
                    return cleanedCell;
                });
                
                csvContent += formattedData.join(',') + '\n';
            }
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `Timetable_${formatDateTime()}.csv`);
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            showSuccess('CSV file downloaded successfully!');
        } catch (err) {
            console.error('Error generating CSV file:', err);
            showError('Failed to generate CSV file. Please try again.');
        }
    }
    
    // Helper function to format date and time for filenames
    function formatDateTime() {
        const now = new Date();
        return now.getFullYear() + 
               pad(now.getMonth() + 1) + 
               pad(now.getDate()) + 
               '_' + 
               pad(now.getHours()) + 
               pad(now.getMinutes()) + 
               pad(now.getSeconds());
    }
    
    // Helper function to pad numbers with leading zeros
    function pad(number) {
        return (number < 10 ? '0' : '') + number;
    }
    
    // Show error message
    function showError(message) {
        errorBox.textContent = message;
        errorBox.style.display = 'block';
        successBox.style.display = 'none';
        
        setTimeout(() => {
            errorBox.style.display = 'none';
        }, 5000);
    }
    
    // Show success message
    function showSuccess(message) {
        successBox.textContent = message;
        successBox.style.display = 'block';
        errorBox.style.display = 'none';
        
        setTimeout(() => {
            successBox.style.display = 'none';
        }, 5000);
    }
});
