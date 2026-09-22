import { OpenAI } from "openai";
import * as fs from "node:fs";
import * as path from "node:path";

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  });
}

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN,
});

async function testHuggingFaceKimi() {
  console.log('🧪 Testing Kimi K3 via HuggingFace Router...\n');
  
  if (!process.env.HF_TOKEN) {
    console.error('❌ HF_TOKEN not found in .env.local');
    console.error('Please add: HF_TOKEN=your_huggingface_api_token');
    return;
  }

  try {
    console.log('📤 Sending request to HuggingFace API...');
    const chatCompletion = await client.chat.completions.create({
      model: "moonshotai/Kimi-K3:together",
      messages: [
        {
          role: "user",
          content: "Say 'Kimi is working via HuggingFace!' if you receive this message.",
        },
      ],
      max_tokens: 256,
    });

    console.log('✅ Connection successful!\n');
    console.log('🤖 Kimi Response:');
    console.log(chatCompletion.choices[0].message.content);
  } catch (error) {
    console.error('❌ Connection failed!\n');
    if (error.status) {
      console.error(`HTTP ${error.status}: ${error.message}`);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testHuggingFaceKimi();
