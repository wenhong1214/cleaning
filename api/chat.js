// api/chat.js
export default async function handler(req, res) {
    // 1. Restrict to POST requests only
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Safely extract messages (prevents crash if req.body is empty)
    const messages = req.body?.messages || [];
    
    // 3. Read API Key from Vercel Environment Variables
    const apiKey = process.env.OPENROUTER_API_KEY2;

    if (!apiKey) {
        console.error("Missing OPENROUTER_API_KEY2");
        return res.status(500).json({ error: 'API key not configured.' });
    }

    // 4. System Prompt (Hidden safely on the backend)
    const systemPrompt = {
        role: "system",
        content: `You are a professional customer service representative for HC. CLEANING SERVICES SDN BHD. 
        CRITICAL RULE: You must ALWAYS reply in English, regardless of the user's language.
        COMPANY INFO: Est. 1986, 30+ years experience, ISO 9001:2015 certified. Address: Suite 18.01, 18th Floor, Plaza Pengkalan, Kuala Lumpur.
        SERVICES: Commercial/residential cleaning, floor & carpet cleaning, upholstery, initial cleaning, landscaping, high-level facade cleaning.
        CLIENTS: Parkson (Pavilion, Sunway, etc.), Gucci, The Avare, Union Suites, Sri Murni, Singapore High Commission.
        RULE: Never give exact prices. Tell them price depends on size and scope. ALWAYS ask for their Phone Number, Name, and Premise Type to arrange a quotation. Contact: 03-40438599 or hc.cleaning@hotmail.com.`
    };

    // Combine system prompt with user's conversation history
    const apiMessages = [systemPrompt, ...messages];

    try {
        // 5. Fetch from OpenRouter (Fixed the typo in the URL)
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                "HTTP-Referer": "https://vercel.com"
            },
            body: JSON.stringify({
                // OpenRouter fallback routing
                models: [
                    "deepseek/deepseek-v4-flash",
                    "anthropic/claude-opus-4.8:fast",  
                    "openai/gpt-5.4-nano"             
                ],
                messages: apiMessages,
                temperature: 0.7
            })
        });

        // 6. Handle OpenRouter API errors (e.g., out of credits, bad models)
        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API Error:', response.status, errorText);
            return res.status(response.status).json({ error: 'Upstream AI provider error' });
        }

        const data = await response.json();
        
        // 7. Send the successful response back to the frontend
        res.status(200).json(data);
        
    } catch (error) {
        console.error('Server/Network Error:', error);
        res.status(500).json({ error: 'Failed to communicate with AI provider' });
    }
}