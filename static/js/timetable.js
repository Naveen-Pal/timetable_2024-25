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
    
    // Fetch course data
    fetch('/api/courses')
        .then(response => response.json())
        .then(data => {
            courseData = data.courses;
            days = data.days;
            slots = data.slots;
            timeLabels = data.timeLabels;
            
            // Render courses
            renderCourseTable(courseData);
        })
        .catch(error => {
            console.error('Error fetching course data:', error);
            showError('Failed to load course data. Please try refreshing the page.');
        });
        
    // Search functionality
    searchField.addEventListener('input', function() {
        const searchQuery = this.value.toLowerCase();
        renderCourseTable(courseData, searchQuery);
    });
    
    // Preview timetable
    previewButton.addEventListener('click', function() {
        if (selectedCourses.length === 0) {
            showError('Please select at least one course.');
            return;
        }
        
        generateTimetable();
    });
    
    // Deselect all courses
    deselectAllButton.addEventListener('click', function() {
        selectedCourses = [];
        totalCredits = 0;
        updateTotalCredits();
        renderCourseTable(courseData, searchField.value.toLowerCase());
        timetableContainer.innerHTML = '';
        downloadOptions.style.display = 'none';
        showSuccess('All courses have been deselected.');
    });
    
    // Download buttons
    downloadImage.addEventListener('click', function() {
        if (selectedCourses.length === 0) {
            showError('Please select at least one course.');
            return;
        }
        
        const form = document.createElement('form');
        form.method = 'post';
        form.action = '/api/timetable';
        
        selectedCourses.forEach(course => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'courses';
            input.value = course;
            form.appendChild(input);
        });
        
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    });
    
    downloadExcel.addEventListener('click', function() {
        if (selectedCourses.length === 0) {
            showError('Please select at least one course.');
            return;
        }
        
        const form = document.createElement('form');
        form.method = 'post';
        form.action = '/api/timetable/excel';
        
        selectedCourses.forEach(course => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'courses';
            input.value = course;
            form.appendChild(input);
        });
        
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    });
    
    downloadCSV.addEventListener('click', function() {
        if (selectedCourses.length === 0) {
            showError('Please select at least one course.');
            return;
        }
        
        const form = document.createElement('form');
        form.method = 'post';
        form.action = '/api/timetable/csv';
        
        selectedCourses.forEach(course => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'courses';
            input.value = course;
            form.appendChild(input);
        });
        
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
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
            
            // Course code cell
            const codeCell = document.createElement('td');
            codeCell.textContent = course.code;
            row.appendChild(codeCell);
            
            // Course name cell
            const nameCell = document.createElement('td');
            nameCell.textContent = course.name;
            row.appendChild(nameCell);
            
            // Credits cell
            const creditsCell = document.createElement('td');
            creditsCell.textContent = course.credits;
            row.appendChild(creditsCell);
            
            // Checkbox cell
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
    
    // Update total credits display
    function updateTotalCredits() {
        totalCreditsElement.textContent = totalCredits;
    }
    
    // Generate timetable
    function generateTimetable() {
        if (selectedCourses.length === 0) {
            showError('Please select at least one course.');
            return;
        }
        
        timetableContainer.innerHTML = '<div class="loader" style="display:block;"></div>';
        
        // Prepare the timetable structure
        const table = document.createElement('table');
        table.className = 'timetable';
        
        // Create header row with days
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Add empty cell for the top-left corner
        const cornerCell = document.createElement('th');
        cornerCell.textContent = 'Time / Day';
        headerRow.appendChild(cornerCell);
        
        // Add day headers
        days.forEach(day => {
            const th = document.createElement('th');
            th.className = 'day-header';
            
            // Create spans for full name and abbreviation
            const fullSpan = document.createElement('span');
            fullSpan.className = 'day-full';
            fullSpan.textContent = day;
            
            const abbrSpan = document.createElement('span');
            abbrSpan.className = 'day-abbr';
            abbrSpan.textContent = day[0];
            abbrSpan.style.display = 'none';  // Hidden by default, shown on small screens via CSS
            
            th.appendChild(fullSpan);
            th.appendChild(abbrSpan);
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        
        // Send POST request to preview timetable
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
            
            // Parse the text data
            const lines = data.text.split('\n');
            const headers = lines[0].split('\t');
            
            // Create rows for each time slot
            for (let i = 1; i < lines.length; i++) {
                const cells = lines[i].split('\t');
                const row = document.createElement('tr');
                
                // Add time slot cell
                const timeCell = document.createElement('td');
                timeCell.className = 'time-slot';
                timeCell.textContent = cells[0];
                row.appendChild(timeCell);
                
                // Add day cells
                for (let j = 1; j < cells.length; j++) {
                    const cell = document.createElement('td');
                    
                    // Check for clash
                    if (cells[j].includes('(Clash)')) {
                        cell.className = 'clash';
                    }
                    
                    // Format cell content
                    if (cells[j].trim() !== '') {
                        const courseCell = document.createElement('div');
                        courseCell.className = 'course-cell';
                        
                        const parts = cells[j].split(' ');
                        
                        // For mobile view, only show course code
                        if (window.innerWidth <= 480) {
                            if (parts[0] !== '') {
                                const codeSpan = document.createElement('span');
                                codeSpan.className = 'course-code';
                                codeSpan.textContent = parts[0];
                                courseCell.appendChild(codeSpan);
                            }
                        } else {
                            // For larger screens, show more details
                            const cellContent = cells[j].replace(' (Clash)', '');
                            const contentLines = cellContent.split(' ');
                            
                            if (contentLines.length > 0) {
                                const codeSpan = document.createElement('span');
                                codeSpan.className = 'course-code';
                                codeSpan.textContent = contentLines[0];
                                courseCell.appendChild(codeSpan);
                                
                                // Add course type if available
                                if (contentLines.length > 1) {
                                    const typeSpan = document.createElement('span');
                                    typeSpan.className = 'course-type';
                                    typeSpan.textContent = contentLines.slice(1).join(' ');
                                    courseCell.appendChild(typeSpan);
                                }
                            }
                        }
                        
                        // Add clash marker if needed
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
            
            // Show download options
            downloadOptions.style.display = 'flex';
            
            // Scroll to the timetable
            downloadOptions.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            console.error('Error generating timetable:', error);
            showError('Failed to generate timetable. Please try again.');
            timetableContainer.innerHTML = '';
        });
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
