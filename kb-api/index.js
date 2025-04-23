// mkdir copilot-backend
// cd copilot-backend
// npm init -y
// npm install express axios body-parser





const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Copilot Backend is running!');
});

const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);


const knowledgeBase = require('./knowledgeBase.json');

function searchKnowledgeBase(query) {
  const result = knowledgeBase.find(item => 
    item.question.toLowerCase().includes(query.toLowerCase())
  );
  return result ? result.answer : null;
}
/* api responses **/

app.post('/ask', async (req, res) => {
  const { query } = req.body;

  // Step 1: Search the knowledge base
  const kbAnswer = searchKnowledgeBase(query);
  if (kbAnswer) {
    return res.json({ answer: kbAnswer, source: 'knowledge base' });
  }

  // Step 2: Use OpenAI API if no answer is found in the knowledge base
  try {
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: query,
      max_tokens: 150,
    });

    const answer = response.data.choices[0].text.trim();
    res.json({ answer, source: 'OpenAI' });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});






app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


// npm install openai
