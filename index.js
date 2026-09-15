const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; 
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; 
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.get('/ping', (req, res) => res.send('Disha bot ekdum zinda hai! 💋'));

app.get('/webhook', (req, res) => {
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];
    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post('/webhook', async (req, res) => {
    let body = req.body;
    console.log("🔔 Naya Webhook Payload Aaya!");

    if (body.object) {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
            try {
                let messageObj = body.entry[0].changes[0].value.messages[0];
                
                if (messageObj.type !== "text") {
                    console.log("⚠️ Text message nahi tha, isliye ignore kiya.");
                    return res.sendStatus(200);
                }

                let phone_number_id = body.entry[0].changes[0].value.metadata.phone_number_id;
                let from = messageObj.from; 
                let msg_body = messageObj.text.body;

                console.log(`📩 Message aaya ${from} se: "${msg_body}"`);

                const systemPrompt = "Tu Dishant ki personal AI assistant hai, tera naam Disha hai. Direct, helpful aur smart tarike se reply dena. Hindi aur Hinglish use karna. Ek supportive dost jaisi vibe rakhna.";
                
                // BRAHMASTRA: Direct API Call (Bypassing glitchy libraries)
                console.log("🧠 Gemini ko request bhej rahe hain...");
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
                
                const geminiResponse = await axios.post(geminiUrl, {
                    contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${msg_body}` }] }]
                });

                const aiReply = geminiResponse.data.candidates[0].content.parts[0].text;
                console.log(`🧠 AI ne socha: "${aiReply}"`);

                // WhatsApp ko reply bhejo
                await axios({
                    method: "POST",
                    url: `https://graph.facebook.com/v17.0/${phone_number_id}/messages`,
                    data: { 
                        messaging_product: "whatsapp", 
                        to: from,
                        type: "text",
                        text: { body: aiReply } 
                    },
                    headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" }
                });
                console.log("✅ Reply bhej diya WhatsApp pe! Mission Successful.");

            } catch (error) {
                // Agar yahan error aayi, toh hum exact reason print karenge
                console.error("❌ Error aayi:", error.response ? JSON.stringify(error.response.data) : error.message);
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
