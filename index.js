const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; 
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; 
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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
                
                // Agar message text nahi hai (sticker/image), toh ignore maaro warna code phatega
                if (messageObj.type !== "text") {
                    console.log("⚠️ Text message nahi tha, isliye ignore kiya.");
                    return res.sendStatus(200);
                }

                let phone_number_id = body.entry[0].changes[0].value.metadata.phone_number_id;
                let from = messageObj.from; 
                let msg_body = messageObj.text.body;

                console.log(`📩 Message aaya ${from} se: "${msg_body}"`);

                // Memory aur personality set 
                const systemPrompt = "Tu Dishant ki personal AI assistant hai, tera naam Disha hai. Direct, helpful aur smart tarike se reply dena. Hindi aur Hinglish use karna. Ek supportive dost ya girlfriend jaisi vibe rakhna. Thodi cheeky aur confident rehna.";
                
                // Gemini 1.5 Flash - Sabse tez aur latest model
                const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                const result = await model.generateContent(`${systemPrompt}\n\nUser Message: ${msg_body}`);
                
                const result = await model.generateContent(msg_body);
                const aiReply = result.response.text();
                
                console.log(`🧠 AI ne socha: "${aiReply}"`);

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
                console.error("❌ Error aayi:", error.response ? error.response.data : error.message);
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
