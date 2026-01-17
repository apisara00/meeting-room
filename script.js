// 1. ตั้งค่า URL ให้ตรงกับที่ Deploy จาก Google Apps Script (ต้องเลือก Anyone เท่านั้น)
const scriptURL = 'https://script.google.com/macros/s/AKfycbzrC7T3nEr21nYGIp6fOTu6gtz6bVB-rUlS90UUtG41mnbpPUaFl9B7vJGUcMQUId78-Q/exec';

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
        const response = await fetch(scriptURL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'check', date: dateEl.value, room: roomEl.value }) 
        });
        const booked = await response.json();

        startSelect.innerHTML = '<option value="">-- เลือกเวลาเริ่มจอง --</option>';
        timeSlots.forEach(slot => {
            const isBooked = booked.some(b => slot >= b.start && slot < b.end);
            if (!isBooked) {
                startSelect.innerHTML += `<option value="${slot}">${slot} น.</option>`;
            }
        });
        startSelect.disabled = false;
    } catch (e) {
        startSelect.innerHTML = '<option>❌ ไม่สามารถโหลดข้อมูลได้</option>';
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

const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.onsubmit = async function(e) {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.innerText = '⌛ กำลังส่งข้อมูล...';
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());
        try {
            await fetch(scriptURL, { method: 'POST', body: JSON.stringify({ action: 'save', ...data }) });
            alert('✅ บันทึกการจองเรียบร้อยแล้ว!');
            window.location.href = 'status.html';
        } catch (e) {
            alert('❌ เกิดข้อผิดพลาดในการบันทึก');
            btn.disabled = false;
        }
    };
}

// --- ฟังก์ชันสำหรับหน้าสถานะ (status.html) ---
// แก้ไข ReferenceError และ Logic วันที่เรียบร้อยแล้ว

async function loadStatusTable() {
    const todayBody = document.getElementById('todayTableBody');
    const futureBody = document.getElementById('futureTableBody');
    if (!todayBody || !futureBody) return;

    try {
        todayBody.innerHTML = '<tr><td colspan="4">⏳ กำลังโหลดข้อมูล...</td></tr>';
        const res = await fetch(scriptURL + "?action=read");
        const data = await res.json();
        
        // กำหนดวันที่วันนี้เป็น ค.ศ. (DD/MM/YYYY) เพื่อให้ตรงกับฐานข้อมูล
        const now = new Date();
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear(); 
        const todayStr = `${d}/${m}/${y}`; // จะได้ "17/01/2026"

        todayBody.innerHTML = '';
        futureBody.innerHTML = '';

        data.forEach(row => {
            const formatTime = (t) => String(t).includes("T") ? t.split("T")[1].substring(0, 5) : String(t).substring(0, 5);
            const tr = document.createElement('tr'); // สร้างแถวก่อนนำข้อมูลใส่
            const content = `<td>🏢 ${row.room}</td><td>🕒 ${formatTime(row.startTime)} - ${formatTime(row.endTime)}</td><td>👤 ${row.user}</td>`;

            if (row.date === todayStr) {
                const statusClass = row.status === "อนุมัติ" ? "status-approved" : "status-pending";
                tr.innerHTML = content + `<td><span class="status-badge ${statusClass}">${row.status || 'รอดำเนินการ'}</span></td>`;
                todayBody.appendChild(tr);
            } else {
                tr.innerHTML = `<td>📅 ${row.date}</td>` + content;
                futureBody.appendChild(tr);
            }
        });

        if (todayBody.innerHTML === '') todayBody.innerHTML = '<tr><td colspan="4">ไม่มีรายการใช้งานวันนี้</td></tr>';
    } catch (e) { console.error(e); }
}

// --- ฟังก์ชันสำหรับหน้าสถิติ (statistics.html) ---
// แก้ไข ReferenceError: renderStatistics is not defined

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
                    label: 'จำนวนครั้งที่จอง (ครั้ง)',
                    data: Object.values(stats),
                    backgroundColor: 'rgba(75, 0, 130, 0.7)',
                    borderColor: '#4b0082',
                    borderWidth: 1.5
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } catch (e) { console.error(e); }
}

// รันฟังก์ชันเมื่อโหลดหน้าเว็บ
window.onload = function() {
    loadStatusTable();
    renderStatistics();
};