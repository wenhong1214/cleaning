// api/chat.js
export default async function handler(req, res) {
    // 限制只允许 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 从前端接收用户的对话历史
    const { messages } = req.body;
    
    // 安全地从 Vercel 环境变量中读取 API Key
    const apiKey = process.env.OPENROUTER_API_KEY2;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured in Vercel.' });
    }

    // 这里是系统人设指令（写在后端最安全，用户看不到也改不了）
    const systemPrompt = {
        role: "system",
        content: `You are a professional customer service representative for HC. CLEANING SERVICES SDN BHD. 
        CRITICAL RULE: You must ALWAYS reply in English, regardless of the user's language.
        COMPANY INFO: Est. 1986, 30+ years experience, ISO 9001:2015 certified. Address: Suite 18.01, 18th Floor, Plaza Pengkalan, Kuala Lumpur.
        SERVICES: Commercial/residential cleaning, floor & carpet cleaning, upholstery, initial cleaning, landscaping, high-level facade cleaning.
        CLIENTS: Parkson (Pavilion, Sunway, etc.), Gucci, The Avare, Union Suites, Sri Murni, Singapore High Commission.
        RULE: Never give exact prices. Tell them price depends on size and scope. ALWAYS ask for their Phone Number, Name, and Premise Type to arrange a quotation. Contact: 03-40438599 or hc.cleaning@hotmail.com.`
    };

    // 把系统指令和用户的聊天记录合并
    const apiMessages = [systemPrompt, ...messages];

    try {
        // 请求 OpenRouter
        const response = await fetch('https://openrouter.ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                // 🔥 核心修改：利用 OpenRouter 的原生 models 数组实现自动降级
                models: [
                    "deepseek/deepseek-v4-flash",     // 1. 默认首选：速度极快，高性价比
                    "openai/gpt-5.4-nano",            // 2. 第一备用：大厂保障，稳定兜底
                    "anthropic/claude-opus-4.8:fast"  // 3. 终极备用：处理复杂客服对话能力极强
                ],
                messages: apiMessages,
                temperature: 0.7
            })
        });

        const data = await response.json();
        
        // 将 OpenRouter 的回复传回给前端
        res.status(200).json(data);
    } catch (error) {
        console.error('Error calling OpenRouter:', error);
        res.status(500).json({ error: 'Failed to communicate with OpenRouter' });
    }
}
