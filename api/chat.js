// api/chat.js
export default async function handler(req, res) {
    console.log('🚀 [DEBUG] Function invoked, method:', req.method);

    // 1. Restrict to POST requests only
    if (req.method !== 'POST') {
        console.log('❌ [DEBUG] Rejected non-POST request');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 🔑 关键：打印所有环境变量名（只打名字，不打值）
    console.log('📋 [DEBUG] Available env keys:', Object.keys(process.env).filter(k => k.includes('OPENROUTER') || k.includes('API')));

    // 尝试多个可能的变量名
    const apiKey = process.env.OPENROUTER_API_KEY 
        || process.env.OPENROUTER_API_KEY3 
        || process.env.OPENROUTER_API_KEY2;

    if (!apiKey) {
        console.error('🔥 [DEBUG] No OpenRouter API Key found in env vars!');
        console.error('   Checked: OPENROUTER_API_KEY, OPENROUTER_API_KEY3, OPENROUTER_API_KEY2');
        return res.status(500).json({ 
            error: 'API key not configured. Check Vercel environment variables.',
            debug: 'Missing OPENROUTER_API_KEY'
        });
    }

    console.log('✅ [DEBUG] API Key found, length:', apiKey.length);

    // 2. Safely extract messages (prevents crash if req.body is empty)
    const messages = req.body?.messages || [];
    console.log('📥 [DEBUG] Received messages count:', messages.length);
    if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        console.log('📥 [DEBUG] Last user message:', lastMsg.content?.substring);
    }

    // 3. System Prompt (Hidden safely on the backend)
    const systemPrompt = {
        role: "system",
        content: `You are a professional, polite, and highly knowledgeable Customer Service Representative for HC CLEANING SERVICES SDN BHD.

### CRITICAL RULES ###
1. ALWAYS reply in English, regardless of the user's language.
2. NEVER give exact prices or cost estimates. If asked about price, politely explain that costs depend on the premise size and scope of work, and offer a FREE site visit.
3. YOUR ULTIMATE GOAL is to collect the user's Name, Phone Number, and Premise Type to arrange a site visit and quotation.

### COMPANY BACKGROUND ###
- Company Name: HC Cleaning Services Sdn Bhd (399404-K)
- Established: 1986 (Nearly 40 years of experience)
- Paid-up Capital: RM250,000.00
- Workforce: Over 300 dedicated employees
- Key Personnel: Chairman is Ms. Hooi Yeat Ney, Operation Manager is Mr. Hooi Chee Kok.
- Subsidiary: Friendly Eco Services Sdn Bhd (Est. 2015).
- Certifications: ISO 9001:2015 Certified by Pearl Certification for Provision of Commercial and Residential Cleaning Services.

### CONTACT INFO ###
- Address: Suite 18.01, 18th Floor, Plaza Pengkalan, Jalan Tiong, Off BT 3, Jalan Sultan Azlan Shah, 51100 Kuala Lumpur.
- Telephone: 03-4043 8599 / 03-4043 8598
- Email: hc.cleaning@hotmail.com

### CORE SERVICES ###
1. Floor Cleaning: Sweeping, mopping, burnishing, spray cleaning, floor stripping, sealing, polishing, machine scrubbing.
2. Carpet Cleaning: Shampooing and Hot Water Extraction.
3. Furniture Cleaning: Upholstery cleaning for fabric/car seats, polishing for wooden/leather furniture, telephone cleaning.
4. General Cleaning: Commercial, Residential, Initial cleaning for new buildings/handovers.
5. Specialized: High-Rise Facade Cleaning (rope access), Drain maintenance.
6. Landscaping & Horticulture: Garden maintenance, grass cutting.

### EQUIPMENT & SAFETY ###
- We use industrial-grade equipment: Numatic Backpack & Wet/Dry Vacuums, Virco Scrubbing & Burnishing Machines, SJS Mops, 3M Floor Pads.
- We strictly adhere to Housekeeping Safety Rules (proper chemical handling, wet floor signs, safe lifting).

### MAJOR CLIENTS & TRACK RECORD (Over 100 contracts in Klang Valley) ###
- Condominiums: Enau Court (since 1991), Sri Kenny, Meadow Park, The Avare, Union Suites, Razak City, Sri Murni, Ken Damansara.
- Departmental Stores: Long-term partner of Parkson (Pavilion, Sunway, East Coast Mall, Kuantan, IOI City Mall, etc., since 2004), Gucci (Pavilion KL).
- Office/Corporate: Soka Gakkai Malaysia, Hitachi Rail STS.
- Landscaping Clients: Singapore High Commission (2000-2019/2024), Union Height Condo.

### AWARDS & ACHIEVEMENTS ###
- Our exceptional cleaning standards helped our clients win the MRA Excellence Award (Parkson Elite Pavilion).
- We maintain 5-Star Public Toilet Ratings certified by local councils like MBPJ (Petaling Jaya) and MPK (Kuantan).

### HOW TO HANDLE USERS ###
- If they ask about experience: Mention we've been operating since 1986 with ISO 9001:2015 certification.
- If they ask about past clients: Casually mention top tier clients like Parkson, Gucci, The Avare, or the Singapore High Commission depending on their inquiry.
- If they ask for a quote: Say "I would be happy to help you with a quotation! To provide an accurate proposal, our Operation Executive will need to conduct a quick site visit. Could I please have your Name, Contact Number, and the Name of your premise?"`
    };

    // Combine system prompt with user's conversation history
    const apiMessages = [systemPrompt, ...messages];
    console.log('📨 [DEBUG] Total messages to API:', apiMessages.length, '(system + user history)');

    try {
        console.log('🌐 [DEBUG] Sending request to OpenRouter...');
        const modelsToTry = [
            "deepseek/deepseek-v4-flash",
            "anthropic/claude-opus-4.8:fast",  
            "openai/gpt-5.4-nano"
        ];
        console.log('🔄 [DEBUG] Models to try:', modelsToTry);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                "HTTP-Referer": "https://vercel.com"
            },
            body: JSON.stringify({
                models: modelsToTry,
                messages: apiMessages,
                temperature: 0.7
            })
        });

        console.log('📡 [DEBUG] OpenRouter response status:', response.status);

        // Handle OpenRouter API errors
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ [DEBUG] OpenRouter error body:', errorText);
            return res.status(response.status).json({ 
                error: 'Upstream AI provider error',
                debug: `Status ${response.status}: ${errorText.substring(0, 200)}`
            });
        }

        const data = await response.json();
        console.log('✅ [DEBUG] Got valid response from OpenRouter');

        if (!data.choices || data.choices.length === 0) {
            console.error('❌ [DEBUG] No choices in response:', JSON.stringify(data).substring(0, 500));
            return res.status(500).json({ error: 'AI 返回数据异常' });
        }

        const reply = data.choices[0].message?.content || '';
        console.log('💬 [DEBUG] Reply preview:', reply.substring(0, 100));

        // Send back the full response (original behavior)
        res.status(200).json(data);

    } catch (error) {
        console.error('🔥 [DEBUG] Fetch error:', error.message);
        console.error('🔥 [DEBUG] Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to communicate with AI provider',
            debug: error.message
        });
    }
}