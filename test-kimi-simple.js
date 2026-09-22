import axios from 'axios';

const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
const stream = false;

const headers = {
  "Authorization": "Bearer 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",
  "Content-Type": "application/json"
};

async function testKimiConnection() {
  console.log('🧪 Testing Kimi K3 Connection via NVIDIA API...\n');
  
  const payload = {
    "messages": [
      {
        "role": "user",
        "content": "Say 'Kimi is working!' if you receive this message."
      }
    ],
    "model": "moonshotai/kimi-k3",
    "max_tokens": 256,
    "temperature": 0.7,
    "stream": stream
  };

  try {
    console.log('📤 Sending request to NVIDIA API...');
    const response = await axios.post(invokeUrl, payload, {
      headers: headers,
      timeout: 30000
    });

    console.log('✅ Connection successful!\n');
    console.log('📊 Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data?.choices?.[0]?.message?.content) {
      console.log('\n🤖 Kimi Response:');
      console.log(response.data.choices[0].message.content);
    }
  } catch (error) {
    console.error('❌ Connection failed!\n');
    if (error.response) {
      console.error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      console.error('Response:', error.response.data);
    } else if (error.code === 'ENOTFOUND') {
      console.error('⚠️  Network error: Could not reach NVIDIA API');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('⚠️  Connection refused: Check your internet connection');
    } else {
      console.error('Error:', error.message);
    }
  }
}

testKimiConnection();
