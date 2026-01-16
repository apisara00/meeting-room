const scriptURL = 'https://script.google.com/macros/s/AKfycbzvF44hFQAqZCtoDgeaCCkp3jx4GIJmRCADqfa54WPZzz5NwSun5kix1pCZn3Jz4A3fow/exec';
const timeSlots = ["08:30", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "16:30"];

// 1. ฟังก์ชันเช็คเวลาว่าง
async function checkAvailability() {
    const date = document.getElementById('date').value;
    const room = document.getElementById('room').value;
    const select = document.getElementById('startTime');
    if(!date || !room) return;
    select.innerHTML = '<option>กำลังเช็คเวลาว่าง...</option>';

    try {
        const res = await fetch(scriptURL, { method: 'POST', body: JSON.stringify({action: 'check', date: date, room: room}) });
        const booked = await res.json();
        select.innerHTML = '<option value="">-- เลือกเวลาที่ว่าง --</option>';
        timeSlots.forEach(slot => {
            const isFull = booked.some(b => slot >= b.start && slot < b.end);
            if(!isFull) select.innerHTML += `<option value="${slot}">${slot} น.</option>`;
        });
    } catch (e) { select.innerHTML = '<option>เกิดข้อผิดพลาด</option>'; }
}

// 2. ฟังก์ชันเลือกเวลาสิ้นสุด (ต้องมากกว่าเวลาเริ่ม)
document.getElementById('startTime').onchange = function() {
    const start = this.value;
    const endSelect = document.getElementById('endTime');
    endSelect.innerHTML = '<option value="">-- เลือกเวลาสิ้นสุด --</option>';
    timeSlots.filter(t => t > start).forEach(t => {
        endSelect.innerHTML += `<option value="${t}">${t} น.</option>`;
    });
};

// 3. ส่งข้อมูลบันทึก
document.getElementById('bookingForm').onsubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());
    
    // ตั้งชื่อให้ตรงกับ Code.gs
    const payload = {
        action: 'save',
        'วันที่จอง': data['วันที่จอง'],
        'ชื่อห้องประชุม': data['ชื่อห้องประชุม'],
        'startTime': data['startTime'],
        'endTime': data['endTime'],
        'ชื่อผู้จอง': data['ชื่อผู้จอง'],
        'เบอร์ติดต่อ': data['เบอร์ติดต่อ']
    };

    await fetch(scriptURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    alert('บันทึกข้อมูลสำเร็จ!');
    location.reload();
};