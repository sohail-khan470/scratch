// Import required modules
require('dotenv').config(); // Loads environment variables from the .env file
const express = require('express'); // Express framework for building the server
const { Configuration, OpenAIApi } = require('openai'); // OpenAI library for interacting with OpenAI API
const fs = require('fs'); // File system module for reading JSON files

// Initialize Express application
const app = express();
app.use(express.json()); // Middleware to parse JSON bodies in incoming requests

// Load JSON data from a file
const data = JSON.parse(fs.readFileSync('data.json', 'utf-8'));

// Set up OpenAI API configuration using API key from environment variables
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY, // Load API key securely from .env file
});
const openai = new OpenAIApi(configuration); // Initialize OpenAI API client

/**
 * Search function to find relevant data in the JSON file.
 * @param {string} query - The user's query to search the JSON data.
 * @returns {array} - Array of relevant data entries matching the query.
 */
function searchJsonData(query) {
    // Filter the data to find entries containing the query (case-insensitive)
    return data.filter(item => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()));
}

// Define POST endpoint to handle user queries
app.post('/query', async (req, res) => {
    const { query } = req.body; // Extract query from the request body

    // Step 1: Search the JSON data for relevant entries
    const relevantData = searchJsonData(query);

    // Step 2: Create a prompt for OpenAI using the relevant data
    const prompt = `Using the following data: ${JSON.stringify(relevantData)}\nAnswer the following query: ${query}`;

    try {
        // Step 3: Use OpenAI API to generate a response based on the prompt
        const response = await openai.createCompletion({
            model: "text-davinci-003", // Specify the OpenAI model to use
            prompt: prompt, // Pass the constructed prompt
            max_tokens: 200, // Limit the response length to 200 tokens
        });

        // Return the AI-generated result to the client
        res.json({ result: response.data.choices[0].text.trim() });
    } catch (error) {
        console.error("Error:", error.message); // Log any errors to the console
        res.status(500).send("Error generating a response."); // Send error message to the client
    }
});

// Start the server and listen on the specified port
const PORT = 3000; // Port number for the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`); // Log success message
});
