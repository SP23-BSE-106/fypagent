import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db('agentflow');

// Get agents
const agents = await db.collection('agents').find({}).limit(5).toArray();
console.log('=== AGENTS ===');
agents.forEach(agent => {
  console.log(`\nAgent: ${agent.name} (ID: ${agent._id})`);
  console.log(`  Status: ${agent.status}`);
  console.log(`  Workflow: ${agent.workflow ? 'YES - ' + (agent.workflow.nodes?.length || 0) + ' nodes' : 'NO'}`);
  if (agent.workflow?.nodes) {
    console.log(`  Nodes: ${JSON.stringify(agent.workflow.nodes.map(n => n.name))}`);
  }
});

// Check KB
const docs = await db.collection('rag_documents').countDocuments({});
const chunks = await db.collection('rag_chunks').countDocuments({});
console.log(`\n=== KNOWLEDGE BASE ===`);
console.log(`Documents: ${docs}`);
console.log(`Chunks: ${chunks}`);

await client.close();
