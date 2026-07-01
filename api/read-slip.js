export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Image required' });
  }

  const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: image,
              }
            },
            {
              text: 'นี่คือสลิปโอนเงิน/ใบเสร็จของร้านขายการ์ดสะสม อ่านข้อมูลแล้วตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่น รูปแบบ: {"amount": ตัวเลขจำนวนเงินบาท, "date": "YYYY-MM-DD", "type": "income หรือ expense", "note": "ชื่อผู้รับ/ร้าน/รายละเอียดสั้นๆ"} ถ้าเป็นเงินเข้าให้ income ถ้าเป็นการจ่ายให้ expense ถ้าหาวันที่ไม่ได้ให้เว้นว่าง'
            }
          ]
        }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API error:', error);
      return res.status(response.status).json({ error: 'Gemini API error' });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(400).json({ error: 'Could not parse response', raw: text });
    }

    const result = JSON.parse(jsonMatch[0]);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error reading slip:', error);
    res.status(500).json({ error: error.message });
  }
}
