// 1. ใส่ URL ที่ได้จาก Google Apps Script (ต้องเลือก Anyone)
const scriptURL = 'https://script.google.com/macros/s/AKfycbzOvo-NyWEJaGHsLXFlJ6W5u7TKAeOxN21O2AsBOz8j2gqZf8s4fqdhHbFEBtYkNoAh/exec';

const timeSlots = ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

// --- ฟังก์ชันสำหรับการจอง (booking.html) ---

async function checkAvailability() {
    const dateEl = document.getElementById('date');
    const roomEl = document.getElementById('room');
    const startSelect = document.getElementById('startTime');
    if (!dateEl || !roomEl || !startSelect) return;

    if (!dateEl.value || !roomEl.value) {
        startSelect.disabled = true;
        startSelect.innerHTML = '<option value="">-- กรุณาเลือกวันที่และห้องประชุมก่อน --</option>';
        return;
    }

    startSelect.disabled = true;
    startSelect.innerHTML = '<option>🔄 กำลังตรวจสอบเวลาว่าง...</option>';

    try {
        const response = await fetch(scriptURL + "?action=read");
        const data = await response.json();
        
        const [y, m, d] = dateEl.value.split('-');
        const targetDate = `${d}/${m}/${y}`;
        const targetRoom = roomEl.value;

        const booked = data.filter(row => row.date === targetDate && row.room === targetRoom);

        startSelect.innerHTML = '<option value="">-- เลือกเวลาเริ่มจอง --</option>';
        timeSlots.forEach(slot => {
            const isBooked = booked.some(b => {
                const s = String(b.startTime).substring(0, 5);
                const e = String(b.endTime).substring(0, 5);
                return slot >= s && slot < e;
            });
            if (!isBooked) startSelect.innerHTML += `<option value="${slot}">${slot} น.</option>`;
        });
        startSelect.disabled = false;
        if(startSelect.options.length <= 1) startSelect.innerHTML = '<option value="">❌ เต็มทุกช่วงเวลา</option>';
    } catch (e) {
        startSelect.innerHTML = '<option>❌ เกิดข้อผิดพลาด (โปรดเช็คการ Deploy)</option>';
    }
}

function updateEndTime() {
    const startSelect = document.getElementById('startTime');
    const endSelect = document.getElementById('endTime');
    if (!startSelect || !endSelect || !startSelect.value) return;

    const startIndex = timeSlots.indexOf(startSelect.value);
    endSelect.innerHTML = '<option value="">-- เลือกเวลาสิ้นสุด --</option>';
    for (let i = startIndex + 1; i < timeSlots.length; i++) {
        endSelect.innerHTML += `<option value="${timeSlots[i]}">${timeSlots[i]} น.</option>`;
    }
    endSelect.innerHTML += `<option value="17:00">17:00 น.</option>`;
    endSelect.disabled = false;
}

// --- ฟังก์ชันหน้าสถานะ (3 สี: เขียว เหลือง แดง) ---

async function loadStatusTable() {
    const todayBody = document.getElementById('todayTableBody');
    const futureBody = document.getElementById('futureTableBody');
    if (!todayBody) return;

    try {
        const res = await fetch(scriptURL + "?action=read");
        const data = await res.json();
        
        const now = new Date();
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        const todayStr = `${d}/${m}/${y}`; // รูปแบบ dd/mm/yyyy ให้ตรงกับใน Sheet

        todayBody.innerHTML = '';
        if(futureBody) futureBody.innerHTML = '';

        data.forEach(row => {
            // กรองแถวว่าง
            if (!row.date || !row.room) return;

            const tr = document.createElement('tr');
            
            if (row.date === todayStr) {
                // --- ตารางวันนี้ (แสดงสถานะ) ---
                let statusClass = row.status === "อนุมัติ" ? "status-approved" : (row.status === "ยกเลิก" ? "status-cancelled" : "status-pending");
                tr.innerHTML = `
                    <td>${row.room}</td>
                    <td>⏰ ${row.startTime} - ${row.endTime}</td>
                    <td>${row.user}</td>
                    <td><span class="status-badge ${statusClass}">${row.status || 'รออนุมัติ'}</span></td>
                `;
                todayBody.appendChild(tr);
            } else {
                // --- ตารางจองล่วงหน้า (ไม่แสดงสถานะ) ---
                if(futureBody) {
                    tr.innerHTML = `
                        <td>${row.date}</td>
                        <td>${row.room}</td>
                        <td>⏰ ${row.startTime} - ${row.endTime}</td>
                        <td>${row.user}</td>
                    `;
                    futureBody.appendChild(tr);
                }
            }
        });

        if (todayBody.innerHTML === '') todayBody.innerHTML = '<tr><td colspan="4">ไม่มีรายการจองวันนี้</td></tr>';
        if (futureBody && futureBody.innerHTML === '') futureBody.innerHTML = '<tr><td colspan="4">ไม่มีรายการจองล่วงหน้า</td></tr>';

    } catch (e) { console.error("Error:", e); }
}
// --- ฟังก์ชันหน้าสถิติ (โชว์ทุกรายการ) ---

async function renderStatistics() {
    const canvas = document.getElementById('statChart');
    if (!canvas) return;

    try {
        const res = await fetch(scriptURL + "?action=read");
        const data = await res.json();
        const stats = {};
        data.forEach(item => { if (item.room) stats[item.room] = (stats[item.room] || 0) + 1; });

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: Object.keys(stats),
                datasets: [{
                    label: 'สถิติการใช้งานรวม (ครั้ง)',
                data: Object.values(stats),
                backgroundColor: '#6a1b9a', // สีม่วงขวาตามธีม
                borderColor: '#ffc107',
                borderWidth: 2
                }]
            }
        });
    } catch (e) { console.error(e); }
}
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerText = '⌛ กำลังตรวจสอบการจองซ้ำ...';

        const formData = new FormData(bookingForm);
        const queryString = new URLSearchParams(formData).toString();
        const finalURL = `${scriptURL}?action=insert&${queryString}`;

        try {
            const response = await fetch(finalURL, { method: 'GET' });
            const result = await response.json();
            
            if (result.result === 'success') {
                alert('✅ จองห้องประชุมสำเร็จ!');
                window.location.href = 'status.html';
            } else {
                // แก้จุดนี้: แสดงข้อความ Error ที่ส่งมาจาก Google Apps Script ตรงๆ
                alert(result.message); 
                submitBtn.disabled = false;
                submitBtn.innerText = 'ยืนยันการจอง';
            }
        } catch (error) {
            alert('❌ เกิดข้อผิดพลาดทางเทคนิค โปรดลองใหม่อีกครั้ง');
            submitBtn.disabled = false;
            submitBtn.innerText = 'ยืนยันการจอง';
        }
    });
}
// ผูกฟังก์ชันเข้ากับหน้าต่างเพื่อให้ HTML เรียกหาเจอ
window.checkAvailability = checkAvailability;
window.updateEndTime = updateEndTime;

window.onload = function() {
    if(document.getElementById('todayTableBody')) loadStatusTable();
    if(document.getElementById('statChart')) renderStatistics();
};