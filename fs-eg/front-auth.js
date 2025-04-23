import { create } from 'zustand';
import axios from 'axios';
import { useState, useEffect } from 'react';

// Zustand Store
const useStore = create((set) => ({
  user: null,
  notes: [],
  loading: false,
  error: null,
  authToken: localStorage.getItem('authToken') || null,
  
  // Auth Actions
  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      localStorage.setItem('authToken', response.data.token);
      set({ authToken: response.data.token, loading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Login failed', loading: false });
      return false;
    }
  },
  
  register: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/api/auth/register', { username, password });
      localStorage.setItem('authToken', response.data.token);
      set({ authToken: response.data.token, loading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Registration failed', loading: false });
      return false;
    }
  },
  
  logout: () => {
    localStorage.removeItem('authToken');
    set({ user: null, authToken: null, notes: [] });
  },
  
  // Note Actions
  fetchNotes: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/notes', {
        headers: { Authorization: `Bearer ${useStore.getState().authToken}` }
      });
      set({ notes: response.data, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch notes', loading: false });
    }
  },
  
  addNote: async (noteData) => {
    try {
      const response = await axios.post('/api/notes', noteData, {
        headers: { Authorization: `Bearer ${useStore.getState().authToken}` }
      });
      set((state) => ({ notes: [response.data, ...state.notes] }));
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to add note' });
      throw err;
    }
  },
  
  clearError: () => set({ error: null })
}));

// Components
const AuthForm = ({ isLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, register, loading, error, clearError } = useStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = isLogin 
      ? await login(username, password)
      : await register(username, password);
    
    if (success) {
      setUsername('');
      setPassword('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      {error && (
        <div className="error">
          {error}
          <button onClick={clearError}>×</button>
        </div>
      )}
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
      </button>
    </form>
  );
};

const NoteList = () => {
  const { notes, loading, fetchNotes } = useStore();

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  if (loading) return <div>Loading notes...</div>;
  if (notes.length === 0) return <div>No notes found</div>;

  return (
    <div className="note-list">
      {notes.map((note) => (
        <div key={note._id} className="note">
          <h3>{note.title}</h3>
          <p>{note.content}</p>
        </div>
      ))}
    </div>
  );
};

const AddNoteForm = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { addNote } = useStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content) return;
    try {
      await addNote({ title, content });
      setTitle('');
      setContent('');
    } catch (err) {
      // Error handled in store
    }
  };

  return (
    <form onSubmit={handleSubmit} className="note-form">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        required
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Content"
        required
      />
      <button type="submit">Add Note</button>
    </form>
  );
};

const App = () => {
  const { authToken, logout } = useStore();

  return (
    <div className="app">
      <header>
        <h1>Notes App</h1>
        {authToken && <button onClick={logout}>Logout</button>}
      </header>

      {!authToken ? (
        <div className="auth-container">
          <AuthForm isLogin={true} />
          <AuthForm isLogin={false} />
        </div>
      ) : (
        <div className="notes-container">
          <AddNoteForm />
          <NoteList />
        </div>
      )}
    </div>
  );
};

// Basic Styles
const styles = `
  .app {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: sans-serif;
  }
  
  .error {
    background: #ffebee;
    color: #d32f2f;
    padding: 10px;
    margin-bottom: 20px;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
  }
  
  .auth-form, .note-form {
    margin-bottom: 20px;
  }
  
  input, textarea, button {
    display: block;
    width: 100%;
    margin-bottom: 10px;
    padding: 8px;
  }
  
  button {
    cursor: pointer;
  }
  
  .note {
    border: 1px solid #ddd;
    padding: 15px;
    margin-bottom: 15px;
    border-radius: 4px;
  }
`;

// Inject styles
const styleElement = document.createElement('style');
styleElement.innerHTML = styles;
document.head.appendChild(styleElement);

export default App;