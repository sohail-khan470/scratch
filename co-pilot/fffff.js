// Import required modules
const express = require('express'); // Framework for building the server
const cors = require('cors'); // Middleware to handle CORS
const axios = require('axios'); // For making HTTP requests
const { PDFDocument } = require('pdf-lib'); // For parsing PDF documents
const dotenv = require('dotenv'); // For loading environment variables

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// Environment variables
const PORT = process.env.PORT || 5000; // Server port
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // OpenAI API key
const OPENAI_ENDPOINT = process.env.OPENAI_ENDPOINT; // OpenAI endpoint
const OPENAI_DEPLOYMENT_NAME = process.env.OPENAI_DEPLOYMENT_NAME; // OpenAI deployment name

// Example: Retrieve data from an external website
const scrapeWebsite = async (url) => {
  try {
    const response = await axios.get(url);
    return response.data; // Return the raw HTML or parsed data
  } catch (error) {
    console.error('Error scraping website:', error);
    return null;
  }
};

// Example: Fetch data from a management system API
const fetchFromManagementSystem = async () => {
  try {
    const response = await axios.get('https://management-system-api.com/data');
    return response.data; // Return the fetched data
  } catch (error) {
    console.error('Error fetching from management system:', error);
    return null;
  }
};

// Example: Parse a PDF document
const parsePDF = async (filePath) => {
  try {
    const pdfBytes = await fs.promises.readFile(filePath); // Read the PDF file
    const pdfDoc = await PDFDocument.load(pdfBytes); // Load the PDF document
    let text = '';
    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
      const page = pdfDoc.getPage(i); // Get each page
      text += page.getTextContent(); // Extract text from the page
    }
    return text; // Return the extracted text
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return null;
  }
};

// Example: Fetch FAQs from a database
const fetchFAQs = async () => {
  // Replace with actual database query
  return [
    {
      question: 'How do I apply for a business license?',
      answer: 'Visit the business licensing department with required documents.',
    },
    {
      question: 'What are the school admission requirements?',
      answer: 'School admission requirements include proof of residence and birth certificate.',
    },
  ];
};

// Generate chatbot response using OpenAI
const getOpenAIResponse = async (prompt, context) => {
  try {
    const response = await axios.post(
      `${OPENAI_ENDPOINT}/openai/deployments/${OPENAI_DEPLOYMENT_NAME}/completions?api-version=2023-05-15`,
      {
        prompt: `${context}\n\nQ: ${prompt}\nA:`, // Combine context and prompt
        max_tokens: 150, // Limit the response length
      },
      {
        headers: {
          'api-key': OPENAI_API_KEY, // OpenAI API key
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices[0].text.trim(); // Return the generated response
  } catch (error) {
    console.error('Error generating OpenAI response:', error);
    throw error;
  }
};

// Main function to get chatbot response
const getChatbotResponse = async (prompt) => {
  try {
    // Retrieve information from various sources
    const websiteData = await scrapeWebsite('https://example.com'); // Scrape website
    const managementSystemData = await fetchFromManagementSystem(); // Fetch from management system
    const pdfData = await parsePDF('path/to/document.pdf'); // Parse PDF
    const faqs = await fetchFAQs(); // Fetch FAQs

    // Combine all retrieved data into a single context
    const context = `
      Website Data: ${websiteData}
      Management System Data: ${managementSystemData}
      PDF Data: ${pdfData}
      FAQs: ${JSON.stringify(faqs)}
    `;

    // Generate response using OpenAI
    const response = await getOpenAIResponse(prompt, context);
    return response; // Return the final response
  } catch (error) {
    console.error('Error getting chatbot response:', error);
    throw error;
  }
};

// API endpoint to handle chatbot queries
app.post('/api/chatbot/ask', async (req, res) => {
  const { prompt } = req.body; // Get the user's prompt from the request body

  try {
    const response = await getChatbotResponse(prompt); // Get the chatbot's response
    res.json({ response }); // Send the response back to the client
  } catch (error) {
    res.status(500).json({ error: error.message }); // Handle errors
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});