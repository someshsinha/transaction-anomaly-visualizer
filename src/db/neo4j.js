const neo4j = require('neo4j-driver');
require('dotenv').config();

// Create a driver instance
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

// Verify the connection
const initNeo4j = async () => {
  const session = driver.session();
  try {
    await session.run('RETURN 1');
    console.log('✅ Connected to Neo4j (Bolt Protocol)');
  } catch (err) {
    console.error('❌ Neo4j Connection Failed:', err.message);
  } finally {
    await session.close();
  }
};

initNeo4j();

module.exports = driver;