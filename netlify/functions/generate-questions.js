// This is a Netlify Function that acts as a secure proxy to the Google Gemini API.

exports.handler = async function(event, context) {
    // Get the API key from the environment variables set in the Netlify UI.
    const apiKey = process.env.API_KEY;
    
    // Get the topic and difficulty from the request sent by the front-end.
    const { topic, difficulty } = JSON.parse(event.body);

    // --- Create the prompt for the AI ---
    let prompt;
    if (difficulty === 'interview') {
        prompt = `Generate 5 unique, high-quality, multiple-choice questions that are **very commonly asked in technical job interviews** for the programming language ${topic}. The questions should cover core concepts, data structures, and common pitfalls. One of the four options must be the correct answer. Provide the output in a valid JSON format.`;
    } else {
        prompt = `Generate 5 unique, high-quality, multiple-choice interview questions for the programming language ${topic} at a ${difficulty} difficulty level. One of the four options must be the correct answer. The questions should be suitable for preparing for a technical job interview. Provide the output in a valid JSON format.`;
    }

    // --- Prepare the payload for the Google API ---
    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "questions": {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                "question": { "type": "STRING" },
                                "options": { "type": "ARRAY", "items": { "type": "STRING" } },
                                "answer": { "type": "STRING" },
                                "subtopic": { "type": "STRING" }
                            },
                            required: ["question", "options", "answer", "subtopic"]
                        }
                    }
                },
                required: ["questions"]
            }
        }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // --- Make the request to the Google API ---
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `API request failed with status ${response.status}` })
            };
        }

        const result = await response.json();
        
        // Return the successful result to the front-end.
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch questions.' })
        };
    }
};
