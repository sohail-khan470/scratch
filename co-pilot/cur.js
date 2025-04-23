Complete Copilot Integration Implementation

/**
 * COPILOT WEB INTEGRATION - FULL IMPLEMENTATION
 * 
 * This file contains the complete implementation of integrating a Microsoft Copilot agent
 * with a React frontend and Node.js backend using PostgreSQL/Prisma.
 * 
 * The implementation includes:
 * 1. Project setup instructions
 * 2. Backend implementation (Express server, Prisma setup)
 * 3. Frontend implementation (React components)
 * 4. Styling (CSS)
 * 5. Running instructions
 * 
 * Author: Claude
 * Date: March 21, 2025
 */

/**
 * =============================
 * PROJECT SETUP INSTRUCTIONS
 * =============================
 * 
 * Run these commands to set up the project structure:
 * 
 * # Create project directory
 * mkdir copilot-web-integration
 * cd copilot-web-integration
 * 
 * # Backend setup
 * mkdir backend
 * cd backend
 * npm init -y
 * npm install express cors dotenv jsonwebtoken axios prisma pg
 * npx prisma init
 * cd ..
 * 
 * # Frontend setup
 * mkdir frontend
 * cd frontend
 * npx create-react-app .
 * npm install @microsoft/botframework-webchat axios react-router-dom
 */

/**
 * =============================
 * BACKEND IMPLEMENTATION
 * =============================
 */

/**
 * backend/.env
 * 
 * DATABASE_URL="postgresql://username:password@localhost:5432/copilot_db"
 * JWT_SECRET="your-jwt-secret-key"
 * COPILOT_BOT_ID="your-copilot-bot-id"
 * COPILOT_SECRET_KEY="your-copilot-secret-key"
 * PORT=5000
 */

/**
 * backend/prisma/schema.prisma
 * 
 * This schema defines the database structure for the application,
 * with models for users, conversations, and messages.
 */
/*
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  name          String?
  conversations Conversation[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Conversation {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  messages  Message[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  content        String
  fromUser       Boolean
  createdAt      DateTime     @default(now())
}
*/

/**
 * backend/server.js
 * 
 * Express server that handles API requests, authentication, and
 * communication with the Copilot service.
 */
/*
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

// Middleware for parsing JSON and enabling CORS
app.use(cors());
app.use(express.json());

/**
 * Authentication middleware
 * Verifies JWT tokens from incoming requests
 */
/*
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

/**
 * Generate token for Copilot webchat
 * Exchanges our secret key for a DirectLine token
 */
/*
app.post('/api/token', authenticateToken, async (req, res) => {
  try {
    // Get DirectLine token from Copilot
    const response = await axios.get(
      `https://directline.botframework.com/v3/directline/tokens/generate`,
      {
        headers: {
          Authorization: `Bearer ${process.env.COPILOT_SECRET_KEY}`
        }
      }
    );
    
    res.json({ token: response.data.token });
  } catch (error) {
    console.error('Error getting bot token:', error);
    res.status(500).json({ error: 'Failed to get bot token' });
  }
});

/**
 * User login route
 * Finds or creates a user and generates a JWT
 */
/*
app.post('/api/login', async (req, res) => {
  const { email } = req.body;
  
  try {
    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      user = await prisma.user.create({
        data: { email, name: email.split('@')[0] }
      });
    }
    
    // Generate JWT
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });
    
    res.json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * Get all conversations for a user
 */
/*
app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.user.id },
      include: { 
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1 // Just get the first message as preview
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * Create a new conversation
 */
/*
app.post('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const conversation = await prisma.conversation.create({
      data: {
        userId: req.user.id
      }
    });
    
    res.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * Get a specific conversation with all messages
 */
/*
app.get('/api/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!conversation || conversation.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * Save a user message to a conversation
 */
/*
app.post('/api/conversations/:id/messages', authenticateToken, async (req, res) => {
  const { content } = req.body;
  
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id }
    });
    
    if (!conversation || conversation.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const message = await prisma.message.create({
      data: {
        conversationId: req.params.id,
        content,
        fromUser: true
      }
    });
    
    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() }
    });
    
    res.json(message);
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

/**
 * Save a bot response to a conversation
 */
/*
app.post('/api/conversations/:id/bot-message', authenticateToken, async (req, res) => {
  const { content } = req.body;
  
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id }
    });
    
    if (!conversation || conversation.userId !== req.user.id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const message = await prisma.message.create({
      data: {
        conversationId: req.params.id,
        content,
        fromUser: false
      }
    });
    
    res.json(message);
  } catch (error) {
    console.error('Error saving bot message:', error);
    res.status(500).json({ error: 'Failed to save bot message' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
*/

/**
 * =============================
 * FRONTEND IMPLEMENTATION
 * =============================
 */

/**
 * frontend/src/App.js
 * 
 * Main React component that handles routing and authentication state
 */
/*
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import ChatContainer from './components/ChatContainer';
import './App.css';

function App() {
  // Get auth state from localStorage if available
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  
  // Handle user login
  const handleLogin = (userData, userToken) => {
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
  };
  
  // Handle user logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };
  
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Login route - redirect to chat if already logged in */}
          <Route path="/login" element={
            token ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
          } />
          
          {/* Main chat route - redirect to login if not authenticated */}
          <Route path="/" element={
            token ? 
            <ChatContainer token={token} user={user} onLogout={handleLogout} /> : 
            <Navigate to="/login" />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
*/

/**
 * frontend/src/components/Login.js
 * 
 * Login component that handles user authentication
 */
/*
import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Send login request to backend
      const response = await axios.post('http://localhost:5000/api/login', { email });
      onLogin(response.data.user, response.data.token);
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="login-container">
      <div className="login-form-wrapper">
        <h1>Welcome to Copilot Web</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
*/

/**
 * frontend/src/components/ChatContainer.js
 * 
 * Main container for the chat interface
 * Manages conversations and the active conversation
 */
/*
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';

const ChatContainer = ({ token, user, onLogout }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Set up axios with auth token
  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` }
  };
  
  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations();
  }, []);
  
  // Get all conversations from the API
  const fetchConversations = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/conversations', axiosConfig);
      setConversations(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    }
  };
  
  // Create a new conversation
  const createNewConversation = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/conversations', {}, axiosConfig);
      const newConversation = response.data;
      setConversations([newConversation, ...conversations]);
      setActiveConversation(newConversation.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };
  
  // Select a conversation to display
  const selectConversation = (conversationId) => {
    setActiveConversation(conversationId);
  };
  
  return (
    <div className="chat-container">
      {/* Header with user info and logout button */}
      <header className="chat-header">
        <h1>Copilot Web</h1>
        <div className="user-info">
          <span>Logged in as {user.name || user.email}</span>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </div>
      </header>
      
      <div className="chat-content">
        {/* Sidebar with conversation list */}
        <ConversationList 
          conversations={conversations}
          activeConversation={activeConversation}
          onSelect={selectConversation}
          onNew={createNewConversation}
          loading={loading}
        />
        
        {/* Main chat window or empty state */}
        {activeConversation ? (
          <ChatWindow 
            conversationId={activeConversation}
            token={token}
            axiosConfig={axiosConfig}
          />
        ) : (
          <div className="empty-chat">
            <h2>Select a conversation or start a new one</h2>
            <button onClick={createNewConversation} className="new-conversation-button">
              Start new conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatContainer;
*/

/**
 * frontend/src/components/ConversationList.js
 * 
 * Component to display the list of conversations
 */
/*
import React from 'react';

const ConversationList = ({ conversations, activeConversation, onSelect, onNew, loading }) => {
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="conversation-list">
      <div className="conversation-list-header">
        <h2>Conversations</h2>
        <button onClick={onNew} className="new-chat-button">
          New Chat
        </button>
      </div>
      
      {/* Display loading state, empty state, or conversation list */}
      {loading ? (
        <div className="loading-conversations">Loading conversations...</div>
      ) : conversations.length === 0 ? (
        <div className="no-conversations">
          <p>No conversations yet</p>
          <p>Start a new chat to begin</p>
        </div>
      ) : (
        <ul className="conversations">
          {conversations.map((conversation) => (
            <li 
              key={conversation.id} 
              className={`conversation-item ${activeConversation === conversation.id ? 'active' : ''}`}
              onClick={() => onSelect(conversation.id)}
            >
              <div className="conversation-preview">
                <div className="conversation-title">
                  {/* Show first message content or default text */}
                  {conversation.messages && conversation.messages.length > 0 
                    ? conversation.messages[0].content.substring(0, 30) + (conversation.messages[0].content.length > 30 ? '...' : '')
                    : 'New conversation'}
                </div>
                <div className="conversation-date">{formatDate(conversation.updatedAt)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ConversationList;
*/

/**
 * frontend/src/components/ChatWindow.js
 * 
 * Component that displays the active conversation and integrates with BotFramework
 */
/*
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactWebChat, { createDirectLine } from 'botframework-webchat';

const ChatWindow = ({ conversationId, token, axiosConfig }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [botToken, setBotToken] = useState(null);
  const [directLine, setDirectLine] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch conversation messages when the conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/conversations/${conversationId}`, 
          axiosConfig
        );
        setMessages(response.data.messages || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching messages:', error);
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId]);

  // Get bot token and create DirectLine connection
  useEffect(() => {
    const getBotToken = async () => {
      try {
        const response = await axios.post(
          'http://localhost:5000/api/token',
          {},
          axiosConfig
        );
        setBotToken(response.data.token);
        const dl = createDirectLine({ token: response.data.token });
        setDirectLine(dl);
      } catch (error) {
        console.error('Error getting bot token:', error);
      }
    };

    getBotToken();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save bot responses to the database
  useEffect(() => {
    if (directLine) {
      directLine.activity$
        .filter(activity => activity.type === 'message' && activity.from.id !== 'user')
        .subscribe(async activity => {
          try {
            // Save bot message to database
            await axios.post(
              `http://localhost:5000/api/conversations/${conversationId}/bot-message`,
              { content: activity.text },
              axiosConfig
            );
            
            // Update local messages
            const response = await axios.get(
              `http://localhost:5000/api/conversations/${conversationId}`, 
              axiosConfig
            );
            setMessages(response.data.messages || []);
          } catch (error) {
            console.error('Error saving bot message:', error);
          }
        });
    }
  }, [directLine, conversationId]);

  // Define bot webchat configuration
  const botChatProps = React.useMemo(() => ({
    directLine,
    userID: 'user',
    username: 'User',
    botAvatarInitials: 'CP',
    userAvatarInitials: 'U',
    styleOptions: {
      bubbleBackground: '#F5F5F5',
      bubbleFromUserBackground: '#0078D7',
      bubbleFromUserTextColor: 'white',
      bubbleBorderRadius: 10,
      hideUploadButton: true
    }
  }), [directLine]);
  
  return (
    <div className="chat-window">
      {loading ? (
        <div className="loading-messages">Loading messages...</div>
      ) : (
        <>
          {directLine ? (
            <div className="webchat-container" style={{ height: '100%', width: '100%' }}>
              {/* BotFramework WebChat component */}
              <ReactWebChat {...botChatProps} />
            </div>
          ) : (
            <div className="loading-bot">Connecting to Copilot...</div>
          )}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};

export default ChatWindow;
*/

/**
 * frontend/src/App.css
 * 
 * Styling for the application
 */
/*
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  line-height: 1.6;
  background-color: #f5f5f5;
}

/* Login Page Styling */
/*
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
}

.login-form-wrapper {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-form-wrapper h1 {
  margin-bottom: 1.5rem;
  text-align: center;
  color: #333;
}

.login-form .form-group {
  margin-bottom: 1rem;
}

.login-form label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.login-form input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.login-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #0078d7;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}

.login-button:hover {
  background-color: #0063b1;
}

.error-message {
  color: #e74c3c;
  margin: 0.5rem 0;
}

/* Chat Container Styling */
/*
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #0078d7;
  color: white;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logout-button {
  padding: 0.5rem 1rem;
  background-color: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

.logout-button:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.chat-content {
  display: flex;
  height: calc(100vh - 64px); /* Subtract header height */
}

/* Conversation List Styling */
/*
.conversation-list {
  width: 300px;
  background-color: #f9f9f9;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.conversation-list-header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
}

.new-chat-button {
  padding: 0.5rem 1rem;
  background-color: #0078d7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.conversations {
  list-style: none;
  overflow-y: auto;
  flex-grow: 1;
}

.conversation-item {
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
}

.conversation-item:hover {
  background-color: #f0f0f0;
}

.conversation-item.active {
  background-color: #e6f2ff;
}

.conversation-preview {
  display: flex;
  flex-direction: column;
}

.conversation-title {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.conversation-date {
  font-size: 0.8rem;
  color: #777;
}

.loading-conversations, .no-conversations {
  padding: 2rem;
  text-align: center;
  color: #777;
}

/* Chat Window Styling */
/*
.chat-window {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background-color: white;
}

.loading-messages, .loading-bot {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #777;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  color: #555;
}

.new-conversation-button {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background-color: #0078d7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* WebChat container */
/*
.webchat-container {
  flex-grow: 1;
}
*/

/**
 * =============================
 * RUNNING INSTRUCTIONS
 * =============================
 * 
 * 1. Database Setup:
 *    - Install PostgreSQL if not already installed
 *    - Create a database called 'copilot_db'
 *    - Update the DATABASE_URL in the .env file with your credentials
 * 
 * 2. Backend Setup:
 *    - Navigate to the backend directory: cd backend
 *    - Run Prisma migration: npx prisma migrate dev --name init
 *    - Install dependencies: npm install
 *    - Start the server: node server.js
 * 
 * 3. Copilot Configuration:
 *    - In Copilot Studio, publish your bot
 *    - Get your Bot ID and Secret Key
 *    - Update the .env file with these values
 * 
 * 4. Frontend Setup:
 *    - Navigate to the frontend directory: cd frontend
 *    - Install dependencies: npm install
 *    - Start the development server: npm start
 * 
 * 5. Access the Application:
 *    - Open your browser and navigate to: http://localhost:3000
 */

/**
 * =============================
 * DEPLOYMENT CONSIDERATIONS
 * =============================
 * 
 * For production deployment:
 * 
 * 1. Backend:
 *    - Set up proper environment variables
 *    - Enable HTTPS
 *    - Implement rate limiting
 *    - Add proper error handling and logging
 * 
 * 2. Frontend:
 *    - Build the React app for production: npm run build
 *    - Serve the built files using a web server
 * 
 * 3. Database:
 *    - Set up database backups
 *    - Configure connection pooling
 *    - Set up proper indexes for performance
 * 
 * 4. Security:
 *    - Store secrets securely
 *    - Implement proper authentication
 *    - Add input validation
 */