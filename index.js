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

app.get('/ping', (req, res) => res.send('Bot ekdum zinda hai!'));

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
    if (body.object) {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
            let phone_number_id = body.entry[0].changes[0].value.metadata.phone_number_id;
            let from = body.entry[0].changes[0].value.messages[0].from; 
            let msg_body = body.entry[0].changes[0].value.messages[0].text.body;

            try {
                // Yahan teri memory aur personality set hogi (isko hum baad me aur customize kar sakte hain)
                const systemPrompt = "Tu Nishant ka personal AI assistant hai. Direct, helpful aur smart tarike se reply dena. Hindi aur Hinglish use karna.";
                const model = genAI.getGenerativeModel({ 
                    model: "gemini-1.5-flash", 
                    systemInstruction: systemPrompt 
                });
                
                const result = await model.generateContent(msg_body);
                const aiReply = result.response.text();

                await axios({
                    method: "POST",
                    url: `https://graph.facebook.com/v17.0/${phone_number_id}/messages`,
                    data: { messaging_product: "whatsapp", to: from, text: { body: aiReply } },
                    headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" }
                });
            } catch (error) {
                console.error("Error:", error);
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
