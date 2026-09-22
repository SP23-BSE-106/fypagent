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
    "temperature": 0.7
  };

  try {
    console.log('📤 Sending request to NVIDIA API...');
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
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

testKimiConnection();
