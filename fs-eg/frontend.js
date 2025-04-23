// // frontend.js - React/Redux Frontend

// import React, { useState, useEffect } from 'react';
// import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import { Provider, useSelector, useDispatch } from 'react-redux';
// import axios from 'axios';

// // -------------------------------
// // REDUX STORE CONFIGURATION
// // -------------------------------

// // Async Thunks for API calls
// export const fetchNotes = createAsyncThunk(
//   'notes/fetchNotes',
//   async (_, { rejectWithValue }) => {
//     try {
//       const response = await axios.get('/api/notes');
//       return response.data;
//     } catch (err) {
//       return rejectWithValue(err.response.data);
//     }
//   }
// );

// export const addNewNote = createAsyncThunk(
//   'notes/addNewNote',
//   async (noteData, { rejectWithValue }) => {
//     try {
//       const response = await axios.post('/api/notes', noteData);
//       return response.data;
//     } catch (err) {
//       return rejectWithValue(err.response.data);
//     }
//   }
// );

// export const updateNote = createAsyncThunk(
//   'notes/updateNote',
//   async ({ id, noteData }, { rejectWithValue }) => {
//     try {
//       const response = await axios.put(`/api/notes/${id}`, noteData);
//       return response.data;
//     } catch (err) {
//       return rejectWithValue(err.response.data);
//     }
//   }
// );

// export const deleteNote = createAsyncThunk(
//   'notes/deleteNote',
//   async (id, { rejectWithValue }) => {
//     try {
//       await axios.delete(`/api/notes/${id}`);
//       return id;
//     } catch (err) {
//       return rejectWithValue(err.response.data);
//     }
//   }
// );

// // Notes Slice
// const notesSlice = createSlice({
//   name: 'notes',
//   initialState: {
//     items: [],
//     status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
//     error: null
//   },
//   reducers: {},
//   extraReducers: (builder) => {
//     builder
//       // Fetch Notes
//       .addCase(fetchNotes.pending, (state) => {
//         state.status = 'loading';
//       })
//       .addCase(fetchNotes.fulfilled, (state, action) => {
//         state.status = 'succeeded';
//         state.items = action.payload;
//       })
//       .addCase(fetchNotes.rejected, (state, action) => {
//         state.status = 'failed';
//         state.error = action.payload.message;
//       })
//       // Add Note
//       .addCase(addNewNote.fulfilled, (state, action) => {
//         state.items.unshift(action.payload);
//       })
//       // Update Note
//       .addCase(updateNote.fulfilled, (state, action) => {
//         const index = state.items.findIndex(note => note._id === action.payload._id);
//         if (index !== -1) {
//           state.items[index] = action.payload;
//         }
//       })
//       // Delete Note
//       .addCase(deleteNote.fulfilled, (state, action) => {
//         state.items = state.items.filter(note => note._id !== action.payload);
//       });
//   }
// });

// // Create store
// const store = configureStore({
//   reducer: {
//     notes: notesSlice.reducer
//   }
// });

// // -------------------------------
// // REACT COMPONENTS
// // -------------------------------

// // NoteItem Component
// const NoteItem = ({ note }) => {
//   const dispatch = useDispatch();
//   const [isEditing, setIsEditing] = useState(false);
//   const [editData, setEditData] = useState({ title: note.title, content: note.content });

//   const handleUpdate = () => {
//     dispatch(updateNote({ id: note._id, noteData: editData }));
//     setIsEditing(false);
//   };

//   const handleDelete = () => {
//     dispatch(deleteNote(note._id));
//   };

//   return (
//     <div className="note-item">
//       {isEditing ? (
//         <div className="edit-form">
//           <input
//             type="text"
//             value={editData.title}
//             onChange={(e) => setEditData({...editData, title: e.target.value})}
//           />
//           <textarea
//             value={editData.content}
//             onChange={(e) => setEditData({...editData, content: e.target.value})}
//           />
//           <button onClick={handleUpdate}>Save</button>
//           <button onClick={() => setIsEditing(false)}>Cancel</button>
//         </div>
//       ) : (
//         <div className="note-content">
//           <h3>{note.title}</h3>
//           <p>{note.content}</p>
//           <div className="note-actions">
//             <button onClick={() => setIsEditing(true)}>Edit</button>
//             <button onClick={handleDelete}>Delete</button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// // NoteList Component
// const NoteList = () => {
//   const dispatch = useDispatch();
//   const { items, status, error } = useSelector((state) => state.notes);

//   useEffect(() => {
//     if (status === 'idle') {
//       dispatch(fetchNotes());
//     }
//   }, [status, dispatch]);

//   if (status === 'loading') {
//     return <div className="loading">Loading notes...{}</div>;
//   }

//   if (status === 'failed') {
//     return <div className="error">Error: {error}</div>;
//   }

//   return (
//     <div className="note-list">
//       {items.map((note) => (
//         <NoteItem key={note._id} note={note} />
//       ))}
//     </div>
//   );
// };

// // AddNoteForm Component
// const AddNoteForm = () => {
//   const dispatch = useDispatch();
//   const [title, setTitle] = useState('');
//   const [content, setContent] = useState('');

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (title && content) {
//       dispatch(addNewNote({ title, content }));
//       setTitle('');
//       setContent('');
//     }
//   };

//   return (
//     <form className="add-note-form" onSubmit={handleSubmit}>
//       <h2>Add New Note</h2>
//       <div className="form-group">
//         <label>Title</label>
//         <input
//           type="text"
//           value={title}
//           onChange={(e) => setTitle(e.target.value)}
//           required
//         />
//       </div>
//       <div className="form-group">
//         <label>Content</label>
//         <textarea
//           value={content}
//           onChange={(e) => setContent(e.target.value)}
//           required
//         />
//       </div>
//       <button type="submit">Add Note</button>
//     </form>
//   );
// };

// // App Component
// const App = () => {
//   return (
//     <div className="app">
//       <h1>MERN Notes App</h1>
//       <AddNoteForm />
//       <NoteList />
//     </div>
//   );
// };

// // Root Component with Redux Provider
// const Root = () => {
//   return (
//     <Provider store={store}>
//       <App />
//     </Provider>
//   );
// };

// export default Root;

// // Note: To run this frontend, you would typically:
// // 1. Create a React app with create-react-app
// // 2. Install required dependencies:
// //    npm install react-redux @reduxjs/toolkit axios
// // 3. Set up a proxy in package.json to your backend server
// // 4. Import and render the Root component in index.js

/************************************************************************************/

// NotesApp.jsx
import { create } from 'zustand';
import axios from 'axios';
import { useState, useEffect } from 'react';

// 1. Create Zustand Store
const useNoteStore = create((set) => ({
  notes: [],
  loading: false,
  error: null,
  
  // Fetch all notes
  fetchNotes: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/notes');
      set({ notes: response.data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },
  
  // Add new note
  addNote: async (noteData) => {
    try {
      const response = await axios.post('/api/notes', noteData);
      set((state) => ({ notes: [response.data, ...state.notes] }));
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },
  
  // Update note
  updateNote: async (id, noteData) => {
    try {
      const response = await axios.put(`/api/notes/${id}`, noteData);
      set((state) => ({
        notes: state.notes.map(note => 
          note._id === id ? response.data : note
        )
      }));
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },
  
  // Delete note
  deleteNote: async (id) => {
    try {
      await axios.delete(`/api/notes/${id}`);
      set((state) => ({
        notes: state.notes.filter(note => note._id !== id)
      }));
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },
  
  // Clear error
  clearError: () => set({ error: null })
}));

// 2. NoteItem Component
const NoteItem = ({ note }) => {
  const { updateNote, deleteNote } = useNoteStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: note.title,
    content: note.content
  });

  const handleUpdate = async () => {
    try {
      await updateNote(note._id, editData);
      setIsEditing(false);
    } catch (err) {
      // Error handled in store
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this note?')) {
      await deleteNote(note._id);
    }
  };

  return (
    <div className="note-item">
      {isEditing ? (
        <div className="edit-mode">
          <input
            value={editData.title}
            onChange={(e) => setEditData({...editData, title: e.target.value})}
          />
          <textarea
            value={editData.content}
            onChange={(e) => setEditData({...editData, content: e.target.value})}
          />
          <div className="note-actions">
            <button onClick={handleUpdate}>Save</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="view-mode">
          <h3>{note.title}</h3>
          <p>{note.content}</p>
          <div className="note-actions">
            <button onClick={() => setIsEditing(true)}>Edit</button>
            <button onClick={handleDelete}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
};

// 3. NoteList Component
const NoteList = () => {
  const { notes, loading } = useNoteStore();
  
  if (loading) return <div className="loading">Loading...</div>;
  if (notes.length === 0) return <div className="empty">No notes found</div>;

  return (
    <div className="note-list">
      {notes.map((note) => (
        <NoteItem key={note._id} note={note} />
      ))}
    </div>
  );
};

// 4. AddNoteForm Component
const AddNoteForm = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { addNote } = useNoteStore();

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
      <h2>Add New Note</h2>
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

// 5. Main App Component
const NotesApp = () => {
  const { fetchNotes, error, clearError } = useNoteStore();

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return (
    <div className="app">
      <h1>Notes App</h1>
      
      {error && (
        <div className="error">
          {error}
          <button onClick={clearError}>×</button>
        </div>
      )}
      
      <AddNoteForm />
      <NoteList />
    </div>
  );
};

export default NotesApp;

// 6. Basic CSS (could be added in the same file with styled-components)
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
    align-items: center;
  }
  
  .note-form {
    margin-bottom: 30px;
  }
  
  .note-form input,
  .note-form textarea {
    display: block;
    width: 100%;
    margin-bottom: 10px;
    padding: 8px;
  }
  
  .note-form textarea {
    min-height: 100px;
  }
  
  .note-item {
    border: 1px solid #ddd;
    padding: 15px;
    margin-bottom: 15px;
    border-radius: 4px;
  }
  
  .note-actions {
    margin-top: 10px;
  }
  
  .note-actions button {
    margin-right: 10px;
  }
  
  .loading {
    text-align: center;
    padding: 20px;
  }
`;

// Inject styles
const styleElement = document.createElement('style');
styleElement.innerHTML = styles;
document.head.appendChild(styleElement);





















