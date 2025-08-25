const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const app = express();
app.use(express.json());

dotenv.config();
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

async function parseResume(resumeText) {
    if (!MISTRAL_API_KEY || MISTRAL_API_KEY === "YOUR_STATIC_MISTRAL_API_KEY_HERE") {
        throw new Error("Mistral API key is not configured in the code.");
    }
    
    if (!resumeText || !resumeText.trim()) {
        throw new Error("Resume text is empty or not provided.");
    }

    const apiUrl = "https://api.mistral.ai/v1/chat/completions";

    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${MISTRAL_API_KEY}`,
    };

    const prompt = `
    You are an expert resume parser. Your task is to extract specific information from the provided resume text and return it in a structured JSON format.

    Please extract the following fields from the resume text below:
    - Name
    - phoneNumber
    - email
    - address
    - github
    - linkedin
    - skills (as a list of strings)
    - education (as a list of objects, each with degree, institution, year, and percentage)
    - experience (as a list of objects, each with company, designation, duration, and location)
    - certifications (as a list of strings)

    The output MUST be a valid JSON object with the following structure. If a field is not present in the resume, the corresponding value should be an empty string "" for single fields, or an empty list [] for lists. Do not invent any information.

    {
      "Name": "",
      "phoneNumber": "",
      "email": "",
      "address": "",
      "github": "",
      "linkedin": "",
      "skills": [],
      "education": [
        {
          "degree": "",
          "institution": "",
          "year": "",
          "percentage": ""
        }
      ],
      "experience": [
        {
          "company": "",
          "designation": "",
          "duration": "",
          "location": ""
        }
      ],
      "certifications": []
    }

    --- RESUME TEXT ---
    ${resumeText}
    `;

    const payload = {
        "model": "mistral-large-latest",
        "messages": [{
            "role": "user",
            "content": prompt
        }],
        "response_format": { "type": "json_object" }
    };

    try {
        const response = await axios.post(apiUrl, payload, { headers, timeout: 120000 });
        const parsedContentStr = response.data.choices[0].message.content;
        return JSON.parse(parsedContentStr);
    } catch (apiError) {
        console.error("Error details from Mistral API:", apiError.response ? apiError.response.data : apiError.message);
        throw new Error(`API call failed: ${apiError.message}`);
    }
}

app.post('/parse-resume', async (req, res) => {
    const { resume_text } = req.body;

    if (!resume_text) {
        return res.status(400).json({ error: "Request body must contain 'resume_text' field." });
    }

    try {
        const parsedData = await parseResume(resume_text);
        res.status(200).json(parsedData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log("Send POST requests to /parse-resume");
});
