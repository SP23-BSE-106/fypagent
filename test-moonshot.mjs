async function testMoonshotAPI() {
  console.log('🧪 Testing Moonshot API (Direct Kimi Endpoint)...\n');
  
  const payload = {
    "messages": [
      {
        "role": "user",
        "content": "Say 'Kimi is working!' if you receive this message."
      }
    ],
    "model": "moonshot-v1-8k",
    "max_tokens": 256,
    "temperature": 0.7
  };

  try {
    console.log('📤 Sending request to Moonshot API...');
    const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: 'POST',
      headers: {
        "Authorization": "Bearer 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",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log(`📊 HTTP Status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      console.error('❌ API Error!');
      const errorData = await response.json();
      console.error('Response:', JSON.stringify(errorData, null, 2));
      return;
    }

    const data = await response.json();
    console.log('✅ Connection successful!\n');
    console.log('📊 Full Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data?.choices?.[0]?.message?.content) {
      console.log('\n🤖 Kimi Response:');
      console.log(data.choices[0].message.content);
    }
  } catch (error) {
    console.error('❌ Connection failed!\n');
    console.error('Error:', error.message);
  }
}

testMoonshotAPI();
