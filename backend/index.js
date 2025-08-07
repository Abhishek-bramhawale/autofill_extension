import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/map-fields', async (req, res) => {
  const { fields } = req.body;
  if (!fields || !Array.isArray(fields)) {
    return res.status(400).json({ error: 'Missing or invalid fields array.' });
  }

  const prompt = `
Given the following form fields, map each field's actual name/id to one of these standard keys: name, phone, city, email. 
Only return a JSON object where each field's actual name or id (from the input) is mapped to the most likely standard key.
Do NOT include any user data or values, only the mapping.

Fields:
${JSON.stringify(fields, null, 2)}

Example output:
{
  "navdjbme": "name",
  "user_phone": "phone", 
  "city_field": "city",
  "user_email": "email"
}

Important rules:
1. Map the actual field name/id, not the label text
2. If a field has no name/id, use the label text as the key
3. For Google Forms entry IDs (like "entry.1045781291"), map based on the label text, not the entry ID
4. Only return mappings that are clearly correct - skip uncertain ones
5. Do not include null, undefined, or empty values
6. Focus on the most obvious matches only
`;

  try {
    const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API timeout after 5 seconds')), 5000);
    });
    
    const geminiPromise = geminiModel.generateContent(prompt);
    
    console.log('Sending request to Gemini AI...');
    const result = await Promise.race([geminiPromise, timeoutPromise]);
    const response = await result.response;
    let analysis = response.text();
    let mapping = {};
    try {
      mapping = JSON.parse(analysis);
      console.log('Gemini AI mapping successful:', mapping);
    } catch (e) {
      const match = analysis.match(/\{[\s\S]*\}/);
      if (match) mapping = JSON.parse(match[0]);
      console.log('Extracted JSON from Gemini response:', mapping);
    }
    res.json(mapping);
  } catch (err) {
    console.error('Gemini API error:', err?.response?.data || err.message);
    if (err.message.includes('timeout')) {
      res.status(408).json({ error: 'AI analysis timeout', details: 'Gemini API took too long to respond' });
    } else {
      res.status(500).json({ error: 'Gemini API error', details: err?.response?.data || err.message });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
}); 