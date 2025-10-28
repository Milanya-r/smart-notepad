// FIX: Declare global variables from CDN scripts to resolve TypeScript errors.
declare var React: any;
declare var ReactDOM: any;
declare var marked: any;
declare var DOMPurify: any;
declare var firebase: any;

const { useState, useEffect, useMemo, useRef, useCallback } = React;
      
// --- Firebase Initialization ---
const firebaseConfig = {
    apiKey: "AIzaSyDy2phSHb80YLILjKLM06FpwpclHgxvJgz8",
    authDomain: "smart-notepad-1de7f.firebaseapp.com",
    projectId: "smart-notepad-1de7f",
    storageBucket: "smart-notepad-1de7f.appspot.com",
    messagingSenderId: "898845270205",
    appId: "1:898845270205:web:ea28355a98aba55e32d7d4",
    measurementId: "G-17HQLRRGNZ"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const messaging = firebase.messaging();

// --- Hooks ---
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error('Error saving to localStorage', error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}


// --- Icons ---
const PlusIcon = ({ className = 'w-6 h-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);
const StarIcon = ({ className = 'w-6 h-6', filled = false }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);
const TrashIcon = ({ className = 'w-6 h-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.548 0A48.094 48.094 0 016.25 5.397m11.5 0a48.11 48.11 0 00-7.5 0" />
  </svg>
);
const ArrowLeftIcon = ({ className = 'w-6 h-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);
const SearchIcon = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
);
const BellIcon = ({ className = 'w-6 h-6', filled = false }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
  </svg>
);
const Bars3Icon = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);
const DocumentDuplicateIcon = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H9.75" />
    </svg>
);
const SunIcon = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
);
const MoonIcon = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
);
const ClockIcon = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);
const PaintBrushIcon = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-2.818.172l-1.172 1.172a3 3 0 0 0 4.242 4.242l1.172-1.172a3 3 0 0 0 .172-2.818l-.172-.172a3 3 0 0 0-4.242 0l-1.172 1.172a3 3 0 0 0 4.242 4.242l1.172-1.172a3 3 0 0 0 2.818-.172l.172-.172a3 3 0 0 0 0-4.242l-1.172-1.172a3 3 0 0 0-4.242 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12.31 16.31 8.865 12.865m0 0a3 3 0 0 1 0-4.242l1.172-1.172a3 3 0 0 1 4.242 0l1.172 1.172a3 3 0 0 1 0 4.242l-1.172-1.172a3 3 0 0 1-4.242 0Zm-2.818-4.242a3 3 0 0 0 0 4.242l1.172 1.172a3 3 0 0 0 4.242 0l1.172-1.172a3 3 0 0 0 0-4.242l-1.172-1.172a3 3 0 0 0-4.242 0l-1.172 1.172Z" />
    </svg>
);
const XMarkIcon = ({ className = 'w-6 h-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const PinIcon = ({ className = 'w-6 h-6', filled = false, rotated = false }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={{ transform: rotated ? 'rotate(45deg)' : 'none' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        {filled && <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />}
    </svg>
);

const App = () => {
  const [notes, setNotes] = useLocalStorage('notes', []);
  const [categories, setCategories] = useLocalStorage('categories', [{ id: 'all', name: 'Все заметки' }]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [theme, setTheme] = useLocalStorage('theme', 'system');

  useEffect(() => {
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  const createNewNote = (content = '') => {
    const newNote = {
      id: Date.now().toString(),
      title: 'Новая заметка',
      content: content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categoryId: activeCategoryId === 'all' ? (categories[1]?.id || null) : activeCategoryId,
      isFavorite: false,
      isPinned: false,
      color: 'slate',
      reminder: null,
      journal: [],
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    if (window.innerWidth < 768) {
        setSidebarVisible(false);
    }
  };

  useEffect(() => {
    // Other initializations...
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(reg => console.log('Service Worker registered.', reg))
          .catch(err => console.error('Service Worker registration failed:', err));
      });
    }
  }, []);

  const updateNote = (id, updatedFields) => {
    setNotes(notes.map(note => 
      note.id === id ? { ...note, ...updatedFields, updatedAt: new Date().toISOString() } : note
    ));
  };
  
  const deleteNote = (id) => {
    setNotes(notes.filter(note => note.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
  };

  const activeNote = useMemo(() => notes.find(note => note.id === activeNoteId), [notes, activeNoteId]);

  const filteredNotes = useMemo(() => {
    return notes
      .filter(note => {
        const inCategory = activeCategoryId === 'all' || note.categoryId === activeCategoryId;
        const matchesSearch = searchTerm.trim() === '' || 
          note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          note.content.toLowerCase().includes(searchTerm.toLowerCase());
        return inCategory && matchesSearch;
      })
      .sort((a, b) => (b.isPinned - a.isPinned) || (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  }, [notes, activeCategoryId, searchTerm]);

  const getSanitizedHtml = (markdown) => {
    const rawHtml = marked.parse(markdown || '', { gfm: true, breaks: true });
    const withTasks = rawHtml.replace(/<li>\[ \] (.*?)<\/li>/g, '<li class="task-list-item"><input type="checkbox" disabled> $1</li>')
                             .replace(/<li>\[x\] (.*?)<\/li>/g, '<li class="task-list-item done"><input type="checkbox" checked disabled> $1</li>');
    return DOMPurify.sanitize(withTasks);
  };
  
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans overflow-hidden">
      {isSidebarVisible && (
        <div 
          className="fixed inset-0 bg-black/30 z-10 md:hidden"
          onClick={() => setSidebarVisible(false)}
        ></div>
      )}
      <aside className={`w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300 ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative absolute z-20 h-full`}>
        <div className="p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-xl font-bold text-cyan-600">Умный Блокнот</h1>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
            {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>
        </div>
        <div className="p-4">
          <button onClick={() => createNewNote()} className="w-full flex items-center justify-center gap-2 bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-cyan-700 transition-colors">
            <PlusIcon className="w-5 h-5" />
            Новая заметка
          </button>
        </div>
        <div className="p-4">
          <div className="relative">
            <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Поиск..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-700 border border-transparent rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2">
          <ul>
            {categories.map(cat => (
              <li key={cat.id}>
                <a 
                  href="#"
                  onClick={(e) => { e.preventDefault(); setActiveCategoryId(cat.id); if (window.innerWidth < 768) setSidebarVisible(false); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm ${activeCategoryId === cat.id ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  {cat.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className={`w-full flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 md:w-96 ${activeNoteId ? 'hidden md:flex' : 'flex'}`}>
         <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center justify-between h-16">
            <div>
              <h2 className="text-lg font-semibold">{categories.find(c => c.id === activeCategoryId)?.name || 'Заметки'}</h2>
              <p className="text-sm text-slate-500">{filteredNotes.length} заметок</p>
            </div>
            <button onClick={() => setSidebarVisible(true)} className="md:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
              <Bars3Icon className="w-6 h-6"/>
            </button>
         </div>
         <div className="overflow-y-auto flex-1">
            {filteredNotes.map(note => (
              <div 
                key={note.id} 
                onClick={() => { setActiveNoteId(note.id); }}
                className={`p-4 border-l-4 border-b border-slate-200 dark:border-slate-700 cursor-pointer ${activeNoteId === note.id ? 'bg-cyan-50 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'} note-color-${note.color || 'slate'}`}
              >
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate pr-2 flex-1">{note.title}</h3>
                    <div className="flex items-center flex-shrink-0 gap-2 text-slate-400">
                        {note.isPinned && <PinIcon rotated className="w-4 h-4" />}
                        {note.reminder && <ClockIcon className="w-4 h-4" />}
                        <StarIcon filled={note.isFavorite} className={`w-5 h-5 ${note.isFavorite ? 'text-yellow-400' : 'text-slate-400'}`} />
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                    {note.content?.substring(0, 100) + (note.content?.length > 100 ? '...' : '') || 'Нет дополнительного текста'}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">{new Date(note.updatedAt).toLocaleString()}</p>
              </div>
            ))}
         </div>
      </div>
      
      <main className={`flex-1 flex-col ${activeNoteId ? 'flex' : 'hidden md:flex'}`}>
        {activeNote ? (
          <Editor activeNote={activeNote} updateNote={updateNote} deleteNote={deleteNote} setActiveNoteId={setActiveNoteId} getSanitizedHtml={getSanitizedHtml} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 p-4">
            <DocumentDuplicateIcon className="w-24 h-24 text-slate-300 dark:text-slate-600" />
            <h2 className="mt-4 text-xl font-medium">Выберите заметку для просмотра</h2>
            <p className="mt-1">Или создайте новую, чтобы начать.</p>
          </div>
        )}
      </main>
    </div>
  );
};

const Editor = ({ activeNote, updateNote, deleteNote, setActiveNoteId, getSanitizedHtml }) => {
    const [isColorPickerOpen, setColorPickerOpen] = useState(false);
    const [isReminderModalOpen, setReminderModalOpen] = useState(false);
    const colorPickerRef = useRef(null);
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
                setColorPickerOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const addJournalEntry = (entryText) => {
        if (!entryText.trim()) return;
        const newEntry = { text: entryText, timestamp: new Date().toISOString() };
        const updatedJournal = activeNote.journal ? [...activeNote.journal, newEntry] : [newEntry];
        updateNote(activeNote.id, { journal: updatedJournal });
    };

    return (
        <div className="flex-1 flex flex-col min-w-0 h-full">
            {isReminderModalOpen && <ReminderModal note={activeNote} updateNote={updateNote} onClose={() => setReminderModalOpen(false)} />}
            
            <header className="flex-shrink-0 p-2 h-16 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
               <div className="flex items-center gap-2 min-w-0">
                  <button onClick={() => setActiveNoteId(null)} className="md:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                    <ArrowLeftIcon className="w-6 h-6"/>
                  </button>
                  <input 
                    type="text" 
                    value={activeNote.title}
                    onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                    className="text-lg font-semibold bg-transparent focus:outline-none focus:ring-0 border-0 p-1 w-full truncate"
                  />
               </div>
               <div className="flex items-center gap-1 flex-shrink-0">
                 <button onClick={() => updateNote(activeNote.id, { isFavorite: !activeNote.isFavorite })} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" title="В избранное">
                    <StarIcon filled={activeNote.isFavorite} className={`w-5 h-5 ${activeNote.isFavorite ? 'text-yellow-400' : 'text-slate-500'}`} />
                 </button>
                 <button onClick={() => updateNote(activeNote.id, { isPinned: !activeNote.isPinned })} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" title="Закрепить">
                    <PinIcon filled={activeNote.isPinned} className={`w-5 h-5 ${activeNote.isPinned ? 'text-cyan-500' : 'text-slate-500'}`} />
                 </button>
                 <button onClick={() => setReminderModalOpen(true)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" title="Напоминание">
                    <BellIcon filled={!!activeNote.reminder} className={`w-5 h-5 ${activeNote.reminder ? 'text-cyan-500' : 'text-slate-500'}`} />
                 </button>
                 <div className="relative">
                    <button onClick={() => setColorPickerOpen(prev => !prev)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" title="Цвет заметки">
                       <PaintBrushIcon className="w-5 h-5 text-slate-500" />
                    </button>
                    {isColorPickerOpen && <ColorPicker nodeRef={colorPickerRef} onSelectColor={(color) => { updateNote(activeNote.id, { color }); setColorPickerOpen(false); }} />}
                 </div>
                 <button onClick={() => deleteNote(activeNote.id)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" title="Удалить">
                   <TrashIcon className="w-5 h-5 text-slate-500" />
                 </button>
               </div>
            </header>
            
            <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
               <div className="w-full lg:w-1/2 h-1/2 lg:h-full flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700">
                  <textarea
                    value={activeNote.content}
                    onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                    className="w-full h-full p-6 bg-white dark:bg-slate-900 text-base resize-none focus:outline-none leading-relaxed"
                    placeholder="Начните писать..."
                  ></textarea>
               </div>
               <div className="w-full lg:w-1/2 h-1/2 lg:h-full overflow-y-auto flex flex-col">
                 <div
                   className="p-6 markdown-content flex-grow"
                   dangerouslySetInnerHTML={{ __html: getSanitizedHtml(activeNote.content) }}
                 />
                 <Journal journal={activeNote.journal || []} onAddEntry={addJournalEntry} />
               </div>
            </div>
        </div>
    );
};

const ColorPicker = ({ onSelectColor, nodeRef }) => {
    const colors = ['slate', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
    return (
        <div ref={nodeRef} className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-2 z-10 grid grid-cols-6 gap-2">
            {colors.map(color => (
                <button
                    key={color}
                    onClick={() => onSelectColor(color)}
                    className={`w-6 h-6 rounded-full bg-${color}-500 hover:ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-${color}-500`}
                    title={color}
                />
            ))}
        </div>
    );
};

const Journal = ({ journal, onAddEntry }) => {
    const [newEntry, setNewEntry] = useState("");
    const handleSubmit = (e) => {
        e.preventDefault();
        onAddEntry(newEntry);
        setNewEntry("");
    };

    return (
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
            <h4 className="font-semibold mb-2">Журнал</h4>
            <div className="max-h-48 overflow-y-auto mb-2 pr-2">
                {journal.length > 0 ? (
                    [...journal].reverse().map((entry, index) => (
                        <div key={index} className="text-sm py-1 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                            <p className="text-slate-600 dark:text-slate-300">{entry.text}</p>
                            <p className="text-xs text-slate-400">{new Date(entry.timestamp).toLocaleString()}</p>
                        </div>
                    ))
                ) : <p className="text-sm text-slate-400">Записей нет.</p>}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={newEntry}
                    onChange={(e) => setNewEntry(e.target.value)}
                    placeholder="Давление: 120/80"
                    className="flex-grow bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button type="submit" className="bg-cyan-600 text-white font-semibold text-sm py-1.5 px-3 rounded-md hover:bg-cyan-700 transition-colors">
                    Добавить
                </button>
            </form>
        </div>
    );
};

const ReminderModal = ({ note, updateNote, onClose }) => {
    // ... Reminder modal implementation ...
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
             <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
                 <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Настроить напоминание</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                 </div>
                 <div className="p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Функционал напоминаний находится в разработке и скоро будет доступен.</p>
                 </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md">Закрыть</button>
                    <button disabled className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md opacity-50 cursor-not-allowed">Сохранить</button>
                 </div>
             </div>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(<App />);
}
