/* ================================================================
   GARE CARD — Firebase Configuration
   ================================================================
   วิธีตั้งค่า:
   1. ไปที่ https://console.firebase.google.com/
   2. สร้าง Project ใหม่ (หรือใช้ที่มีอยู่)
   3. เปิด Authentication → Sign-in method → เปิด Google + Email/Password
   4. สร้าง Firestore Database (เลือก "Start in test mode" ก่อน)
   5. ไปที่ Project Settings → Your apps → Add web app (</>)
   6. คัดลอก firebaseConfig แล้ววางแทนที่ค่าด้านล่าง
   7. รีเฟรชหน้าเว็บ

   STORE_ID คืออะไร:
   - ถ้าเป็นร้านเดียว ให้ใส่ชื่อร้านเป็น slug เช่น "gare-card-bkk"
   - ผู้ใช้ทุกคนที่ใช้ store_id เดียวกันจะเห็นข้อมูลเดียวกัน
   - ถ้าเว้นว่าง (null) → ใช้ uid ของ admin คนแรกเป็น store_id
   ================================================================ */

window.FIREBASE_CONFIG = {
  // Fixed Firebase config
  apiKey:            "AIzaSyBbWQCRGVjtj3hXUEax9fOfDtBUcRcD9Dk",
  authDomain:        "gare-card-finance-os.firebaseapp.com",
  projectId:         "gare-card-finance-os",
  storageBucket:     "gare-card-finance-os.firebasestorage.app",
  messagingSenderId: "444604755231",
  appId:             "1:444604755231:web:ea27bd4c2eb2034871542a",
};

/* Store ID — ตัวระบุร้านค้า */
window.GARE_STORE_ID = null; // เช่น "gare-card-bkk"
