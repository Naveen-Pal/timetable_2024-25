document.addEventListener('DOMContentLoaded', function() {
    let selectedCourses = [];
    let courseData = [];
    let totalCredits = 0;
    let timetableData = null;
    
    const elements = {
        searchField: document.getElementById('search-field'),
        courseTableBody: document.getElementById('course-table-body'),
        previewButton: document.getElementById('preview-button'),
        deselectAllButton: document.getElementById('deselect-all'),
        timetableContainer: document.getElementById('timetable-container'),
        downloadOptions: document.getElementById('download-options'),
        downloadImage: document.getElementById('download-image'),
        downloadExcel: document.getElementById('download-excel'),
        downloadCSV: document.getElementById('download-csv'),
        totalCreditsElement: document.getElementById('total-credits'),
        errorBox: document.getElementById('error-box'),
        successBox: document.getElementById('success-box'),
        selectedCoursesContainer: document.getElementById('selected-courses-container'),
        selectedCoursesList: document.getElementById('selected-courses-list')
    };
    
    // Load courses
    fetch('/api/courses')
        .then(response => response.json())
        .then(data => {
            courseData = data.courses;
            renderCourseTable(courseData);
        })
        .catch(() => showError('Failed to load course data. Please try refreshing the page.'));
        
    // Event listeners
    elements.searchField.addEventListener('input', function() {
        renderCourseTable(courseData, this.value.toLowerCase());
    });
    
    elements.previewButton.addEventListener('click', () => {
        if (selectedCourses.length === 0) {
            showError('Please select at least one course.');
            return;
        }
        generateTimetable();
    });
    
    elements.deselectAllButton.addEventListener('click', () => {
        selectedCourses = [];
        totalCredits = 0;
        updateTotalCredits();
        renderCourseTable(courseData, elements.searchField.value.toLowerCase());
        elements.timetableContainer.innerHTML = '';
        elements.downloadOptions.style.display = 'none';
        elements.selectedCoursesContainer.style.display = 'none';
        showSuccess('All courses have been deselected.');
    });
    
    elements.downloadImage.addEventListener('click', () => {
        if (selectedCourses.length === 0) {
            showError('Please select at least one course.');
            return;
        }
        generateTimetableImage();
    });
    
    elements.downloadExcel.addEventListener('click', () => {
        if (selectedCourses.length === 0) {
            showError('Please select at least one course.');
            return;
        }
        generateTimetableExcel();
    });
    
    elements.downloadCSV.addEventListener('click', () => {
        if (selectedCourses.length === 0) {
            showError('Please select at least one course.');
            return;
        }
        generateTimetableCSV();
    });
    
    function renderCourseTable(courses, searchQuery = '') {
        const tbody = elements.courseTableBody;
        tbody.innerHTML = '';
        
        const filteredCourses = courses.filter(course => 
            course.code.toLowerCase().includes(searchQuery) || 
            course.name.toLowerCase().includes(searchQuery)
        );
        
        if (filteredCourses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No courses found matching your search.</td></tr>';
            return;
        }
        
        filteredCourses.forEach(course => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${course.code}</td>
                <td>${course.name}</td>
                <td>${course.credits}</td>
                <td>
                    <div class="course-checkbox-wrapper">
                        <input type="checkbox" ${selectedCourses.includes(course.code) ? 'checked' : ''} 
                               data-course-code="${course.code}" data-credits="${course.credits}">
                    </div>
                </td>
            `;
            
            const checkbox = row.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', function() {
                const courseCode = this.dataset.courseCode;
                const credits = parseInt(this.dataset.credits);
                
                if (this.checked) {
                    if (!selectedCourses.includes(courseCode)) {
                        selectedCourses.push(courseCode);
                        totalCredits += credits;
                    }
                } else {
                    const index = selectedCourses.indexOf(courseCode);
                    if (index > -1) {
                        selectedCourses.splice(index, 1);
                        totalCredits -= credits;
                    }
                }
                updateTotalCredits();
                // displaySelectedCourses();
            });
            
            tbody.appendChild(row);
        });
    }
    
    function updateTotalCredits() {
        elements.totalCreditsElement.textContent = totalCredits;
    }
    
    function displaySelectedCourses() {
        if (selectedCourses.length === 0) {
            elements.selectedCoursesContainer.style.display = 'none';
            return;
        }
        
        elements.selectedCoursesList.innerHTML = '';
        
        selectedCourses.forEach(courseCode => {
            const course = courseData.find(c => c.code === courseCode);
            if (course) {
                const courseItem = document.createElement('div');
                courseItem.className = 'selected-course-item';
                courseItem.innerHTML = `
                    <span class="selected-course-code">${course.code}</span>
                    <span class="selected-course-name">${course.name}</span>
                    <span class="selected-course-credits">${course.credits}C</span>
                    <button class="remove-course-btn" data-course-code="${course.code}" data-credits="${course.credits}" title="Remove course">
                        <i class="fa fa-times" aria-hidden="true"></i>
                    </button>
                `;
                
                // Add event listener for the remove button
                const removeBtn = courseItem.querySelector('.remove-course-btn');
                removeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const courseCodeToRemove = this.dataset.courseCode;
                    const creditsToRemove = parseInt(this.dataset.credits);
                    
                    // Remove from selectedCourses array
                    const index = selectedCourses.indexOf(courseCodeToRemove);
                    if (index > -1) {
                        selectedCourses.splice(index, 1);
                        totalCredits -= creditsToRemove;
                        updateTotalCredits();
                        
                        // Update the course table to reflect the change
                        renderCourseTable(courseData, elements.searchField.value.toLowerCase());
                        
                        // Update the selected courses display
                        displaySelectedCourses();
                        
                        showSuccess(`${courseCodeToRemove} has been removed from your selection.`);
                    }
                });
                
                elements.selectedCoursesList.appendChild(courseItem);
            }
        });
        
        elements.selectedCoursesContainer.style.display = 'block';
        elements.selectedCoursesContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    function generateTimetable() {
        displaySelectedCourses();
        elements.timetableContainer.innerHTML = '<div class="loader" style="display:block;"></div>';
        
        fetch('/api/timetable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courses: selectedCourses }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showError(data.error);
                return;
            }
            
            timetableData = data;
            
            // Get all time slots and sort them
            const allTimeSlots = new Set();
            Object.values(data).flat().forEach(entry => allTimeSlots.add(entry.time));
            const sortedTimeSlots = Array.from(allTimeSlots).sort((a, b) => 
                parseInt(a.split(':')[0]) - parseInt(b.split(':')[0])
            );
            
            // Create table
            const table = document.createElement('table');
            table.className = 'timetable';
            
            // Header
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = '<th class="time-header">Time</th>';
            ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
                headerRow.innerHTML += `
                    <th class="day-header">
                        <span class="day-full">${day}</span>
                        <span class="day-abbr" style="display:none">${day[0]}</span>
                    </th>
                `;
            });
            table.appendChild(document.createElement('thead')).appendChild(headerRow);
            
            // Body
            const tbody = document.createElement('tbody');
            const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            
            sortedTimeSlots.forEach(timeSlot => {
                const row = document.createElement('tr');
                row.innerHTML = `<td class="time-slot">${timeSlot}</td>`;
                
                dayKeys.forEach(dayKey => {
                    const cell = document.createElement('td');
                    const dayData = data[dayKey] || [];
                    const courseEntry = dayData.find(entry => entry.time === timeSlot);
                    
                    if (courseEntry) {
                        const parts = courseEntry.class.split(',').map(part => part.trim());
                        const courseCell = document.createElement('div');
                        courseCell.className = 'course-cell';
                        
                        if (parts[0]) {
                            courseCell.innerHTML += `<span class="course-code">${parts[0]}</span>`;
                        }
                        if (parts[1]) {
                            courseCell.innerHTML += `<span class="course-name">${parts[1]}</span>`;
                        }
                        if (parts[2]) {
                            courseCell.innerHTML += `<span class="course-type">${parts[2]}</span>`;
                        }
                        if (parts[3]) {
                            courseCell.innerHTML += `<span class="course-location">${parts[3]}</span>`;
                        }
                        
                        cell.appendChild(courseCell);
                    }
                    
                    row.appendChild(cell);
                });
                
                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            elements.timetableContainer.innerHTML = '';
            elements.timetableContainer.appendChild(table);
            
            elements.downloadOptions.style.display = 'flex';
            elements.downloadOptions.scrollIntoView({ behavior: 'smooth' });
        })
        .catch(() => {
            showError('Failed to generate timetable. Please try again.');
            elements.timetableContainer.innerHTML = '';
        });
    }
    
    function generateTimetableImage() {
        const timetableElement = elements.timetableContainer.querySelector('.timetable');
        if (!timetableElement) {
            showError('Timetable not found. Please generate the timetable first.');
            return;
        }
        
        showSuccess('Generating image, please wait...');
        
        html2canvas(timetableElement, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false
        }).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `Timetable_${formatDateTime()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showSuccess('Image downloaded successfully!');
        }).catch(() => {
            showError('Failed to generate image. Please try again.');
        });
    }
    
    function generateTimetableExcel() {
        if (!timetableData) {
            showError('No timetable data found. Please generate the timetable first.');
            return;
        }
        
        const allTimeSlots = new Set();
        Object.values(timetableData).flat().forEach(entry => allTimeSlots.add(entry.time));
        const sortedTimeSlots = Array.from(allTimeSlots).sort((a, b) => 
            parseInt(a.split(':')[0]) - parseInt(b.split(':')[0])
        );
        
        const excelData = [['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']];
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        
        sortedTimeSlots.forEach(timeSlot => {
            const row = [timeSlot];
            dayNames.forEach(day => {
                const dayData = timetableData[day] || [];
                const course = dayData.find(entry => entry.time === timeSlot);
                row.push(course ? course.class : '');
            });
            excelData.push(row);
        });
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, "Timetable");
        XLSX.writeFile(wb, `Timetable_${formatDateTime()}.xlsx`);
        
        showSuccess('Excel file downloaded successfully!');
    }
    
    function generateTimetableCSV() {
        if (!timetableData) {
            showError('No timetable data found. Please generate the timetable first.');
            return;
        }
        
        const allTimeSlots = new Set();
        Object.values(timetableData).flat().forEach(entry => allTimeSlots.add(entry.time));
        const sortedTimeSlots = Array.from(allTimeSlots).sort((a, b) => 
            parseInt(a.split(':')[0]) - parseInt(b.split(':')[0])
        );
        
        let csvContent = 'Time,Monday,Tuesday,Wednesday,Thursday,Friday\n';
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        
        sortedTimeSlots.forEach(timeSlot => {
            const row = [timeSlot];
            dayNames.forEach(day => {
                const dayData = timetableData[day] || [];
                const course = dayData.find(entry => entry.time === timeSlot);
                const courseInfo = course ? course.class : '';
                row.push(courseInfo.includes(',') ? `"${courseInfo}"` : courseInfo);
            });
            csvContent += row.join(',') + '\n';
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Timetable_${formatDateTime()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        showSuccess('CSV file downloaded successfully!');
    }
    
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
    
    function pad(number) {
        return (number < 10 ? '0' : '') + number;
    }
    
    function showError(message) {
        elements.errorBox.textContent = message;
        elements.errorBox.style.display = 'block';
        elements.successBox.style.display = 'none';
        setTimeout(() => elements.errorBox.style.display = 'none', 5000);
    }
    
    function showSuccess(message) {
        elements.successBox.textContent = message;
        elements.successBox.style.display = 'block';
        elements.errorBox.style.display = 'none';
        setTimeout(() => elements.successBox.style.display = 'none', 5000);
    }
});
