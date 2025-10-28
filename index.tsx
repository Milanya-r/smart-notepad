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

let db, messaging;
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    messaging = firebase.messaging();
}


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
const BoldIcon = ({ className = 'w-6 h-6' }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h4.5a3 3 0 0 1 0 6h-4.5m0 0H6.75m1.5 0v6m0-6h4.5a3 3 0 0 1 0 6h-4.5m0 0v6" /></svg>;
const ItalicIcon = ({ className = 'w-6 h-6' }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 15" /></svg>;
const ListBulletIcon = ({ className = 'w-6 h-6' }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>;
const CodeBracketIcon = ({ className = 'w-6 h-6' }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" /></svg>;
const InformationCircleIcon = ({ className = 'w-6 h-6' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
  </svg>
);


// --- Helper Functions ---
function calculateNextSendAt(reminder, fromDate = new Date()) {
    if (!reminder || !reminder.type || !reminder.startDate || !reminder.times?.length) return null;

    const fromTime = fromDate.getTime();
    let searchDate = new Date(reminder.startDate);
    searchDate.setHours(0, 0, 0, 0);

    const sortedTimes = reminder.times
        .map(t => { const [h, m] = t.split(':').map(Number); return { h, m }; })
        .sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));

    if (reminder.type === "single") {
        for (const time of sortedTimes) {
            const dueDate = new Date(searchDate);
            dueDate.setHours(time.h, time.m, 0, 0);
            if (dueDate.getTime() > fromTime) {
                return dueDate.getTime();
            }
        }
        return null; // All times for the single date have passed
    }
    
    // Start searching from today or the reminder's start date, whichever is later
    let searchFrom = new Date(fromDate);
    searchFrom.setHours(0,0,0,0);
    if(searchFrom.getTime() < searchDate.getTime()){
        searchFrom = new Date(searchDate);
    }


    // Limit search to 2 years to prevent infinite loops
    for (let i = 0; i < 730; i++) {
        let isValidDay = false;
        switch (reminder.type) {
            case "daily":
                isValidDay = true;
                break;
            case "weekly":
                isValidDay = reminder.daysOfWeek?.includes(searchFrom.getDay()) ?? false;
                break;
            case "monthly":
                // Handles month-end cases by capping at last day of month
                const reminderDay = new Date(reminder.startDate).getDate();
                const lastDayOfMonth = new Date(searchFrom.getFullYear(), searchFrom.getMonth() + 1, 0).getDate();
                isValidDay = searchFrom.getDate() === Math.min(reminderDay, lastDayOfMonth);
                break;
        }

        if (isValidDay) {
            for (const time of sortedTimes) {
                const dueDate = new Date(searchFrom);
                dueDate.setHours(time.h, time.m, 0, 0);
                if (dueDate.getTime() > fromTime) {
                    if (reminder.endDate && dueDate.getTime() > new Date(reminder.endDate).getTime()) {
                        return null; // Past end date
                    }
                    return dueDate.getTime();
                }
            }
        }
        searchFrom.setDate(searchFrom.getDate() + 1);
    }
    return null;
}

const NoteListItemContent = ({ note, updateNote }) => {
    const isChecklist = useMemo(() => /-\s\[( |x)\]/.test(note.content), [note.content]);

    if (!isChecklist) {
        return (
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                {note.content?.substring(0, 100) + (note.content?.length > 100 ? '...' : '') || 'Нет дополнительного текста'}
            </p>
        );
    }
    
    const toggleTask = useCallback((e, taskIndex) => {
        e.stopPropagation(); // Prevent note from opening when clicking the task
        const lines = note.content.split('\n');
        const line = lines[taskIndex];
        if (!line) return;
        const isDone = /-\s\[x\]/.test(line);
        lines[taskIndex] = isDone ? line.replace('[x]', '[ ]') : line.replace('[ ]', '[x]');
        updateNote(note.id, { content: lines.join('\n') });
    }, [note.id, note.content, updateNote]);
    
    const checklistItems = useMemo(() => note.content.split('\n')
        .map((line, index) => ({ line, index }))
        .filter(item => /-\s\[( |x)\]/.test(item.line))
        .slice(0, 5), [note.content]);

    const totalTasks = useMemo(() => note.content.split('\n').filter(item => /-\s\[( |x)\]/.test(item)).length, [note.content]);

    return (
        <div className="mt-2 space-y-1.5 pr-2">
            {checklistItems.map(({ line, index }) => {
                const isDone = /-\s\[x\]/.test(line);
                const text = line.replace(/-\s\[( |x)\]\s*/, '');
                return (
                    <div key={index} className="flex items-center gap-2 text-sm cursor-pointer group" onClick={(e) => toggleTask(e, index)}>
                        <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${isDone ? 'bg-cyan-600 border-cyan-600' : 'border-slate-400 dark:border-slate-500 group-hover:border-cyan-500'}`}>
                           {isDone && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-white"><path d="M12.207 4.793a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.5 9.086l4.293-4.293a1 1 0 0 1 1.414 0Z" /></svg>}
                        </div>
                        <span className={`flex-grow ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>
                           {text}
                        </span>
                    </div>
                );
            })}
             {totalTasks > 5 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">...и еще {totalTasks - 5}</p>
             )}
        </div>
    );
};


const App = () => {
  const [notes, setNotes] = useLocalStorage('notes', []);
  const [categories, setCategories] = useLocalStorage('categories', [{ id: 'all', name: 'Все заметки' }]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const [theme, setTheme] = useLocalStorage('theme', 'system');
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  useEffect(() => {
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  const showToast = (message, type = 'info', duration = 3000) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
        setToast(prev => prev.show ? { show: false, message: '', type: 'info' } : prev);
    }, duration);
  };
  
   useEffect(() => {
    // Proactive notification permission check
    if (typeof firebase !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        const permissionRequested = localStorage.getItem('notificationPermissionRequested');
        if (!permissionRequested) {
             setTimeout(() => {
                showToast("Включите уведомления, чтобы получать напоминания!", "info", 6000);
                localStorage.setItem('notificationPermissionRequested', 'true');
            }, 8000); // After 8 seconds
        }
    }
  }, []);

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
    window.location.hash = `note=${newNote.id}`;
    if (window.innerWidth < 768) {
        setSidebarVisible(false);
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
        const hash = window.location.hash;
        if (hash.startsWith('#note=')) {
            const noteId = hash.substring(6);
            if (notes.some(n => n.id === noteId)) {
                setActiveNoteId(noteId);
            }
        } else if (hash === '#new-note') {
            createNewNote();
            history.pushState("", document.title, window.location.pathname + window.location.search);
        }
    };

    window.addEventListener('hashchange', handleHashChange, false);
    handleHashChange(); // Run on initial load

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [notes]); // Re-run if notes change to find the note

  useEffect(() => {
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
      window.location.hash = '';
    }
    if (db) {
        db.collection('reminders').doc(id).delete().catch(err => console.error("Error deleting reminder from Firestore:", err));
    }
  };

  const setReminder = async (note, reminderData) => {
      if (!messaging || !db) {
          showToast("Система уведомлений не инициализирована.", "error");
          return false;
      }

      if (Notification.permission !== 'granted') {
          showToast("Сначала разрешите уведомления.", "error");
          return false;
      }

      try {
          const token = await messaging.getToken();
          const firstSendAt = calculateNextSendAt(reminderData);

          if (!firstSendAt) {
              showToast("Не удалось рассчитать время для напоминания. Проверьте даты.", "error");
              return false;
          }

          await db.collection('reminders').doc(note.id).set({
              title: note.title,
              content: note.content.substring(0, 100) || 'Посмотрите свою заметку.',
              token: token,
              sendAt: firstSendAt,
              reminderData: reminderData,
              noteId: note.id,
          });

          updateNote(note.id, { reminder: reminderData });
          showToast("Напоминание успешно установлено!", "success");
          return true;

      } catch (err) {
          console.error("Error setting reminder:", err);
          let message = "Ошибка при установке напоминания.";
          if (err.code === 'messaging/permission-denied') {
              message = "Уведомления заблокированы. Включите их в настройках браузера.";
          } else {
              message = "Не удалось получить токен. Проверьте подключение к интернету.";
          }
          showToast(message, "error", 5000);
          return false;
      }
  };

  const deleteReminder = async (noteId) => {
     if (!db) {
        showToast("Система уведомлений не инициализирована.", "error");
        return;
    }
    try {
        await db.collection('reminders').doc(noteId).delete();
        updateNote(noteId, { reminder: null });
        showToast("Напоминание удалено.", "success");
    } catch (err) {
        console.error("Error deleting reminder:", err);
        showToast("Ошибка при удалении напоминания.", "error");
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

  const getSanitizedHtml = useCallback((markdown) => {
      const rawHtml = marked.parse(markdown || '', { gfm: true, breaks: true });
      const lines = (markdown || '').split('\n');
      let taskCounter = 0;
      
      const enhancedHtml = rawHtml.replace(/<li class="task-list-item(.*?)"><input type="checkbox"/g, (match, classContent) => {
          let originalLineIndex = -1;
          let currentTask = 0;
          for (let i = 0; i < lines.length; i++) {
              if (/^\s*-\s\[( |x)\]/.test(lines[i])) {
                  if (currentTask === taskCounter) {
                      originalLineIndex = i;
                      break;
                  }
                  currentTask++;
              }
          }
          taskCounter++;
          if (originalLineIndex !== -1) {
              return `<li class="task-list-item${classContent}" data-line-index="${originalLineIndex}"><input type="checkbox"`;
          }
          return match; // fallback
      }).replace(/disabled/g, '');

      return DOMPurify.sanitize(enhancedHtml, { ADD_ATTR: ['data-line-index'] });
  }, []);
  
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans overflow-hidden">
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />}
      {isSidebarVisible && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setSidebarVisible(false)}
          aria-hidden="true"
        ></div>
      )}
      <aside className={`w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300 ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-40 h-full`}>
        <div className="p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-xl font-bold text-cyan-600">Умный Блокнот</h1>
          <div className="flex items-center">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Toggle theme">
              {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
             <button onClick={() => setSidebarVisible(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 md:hidden ml-2" aria-label="Close sidebar">
                <XMarkIcon className="w-6 h-6"/>
            </button>
          </div>
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
              aria-label="Search notes"
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

      <div className={`w-full flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 md:w-96 ${activeNoteId && window.innerWidth < 768 ? 'hidden' : 'flex'}`}>
         <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center justify-between h-16">
            <div>
              <h2 className="text-lg font-semibold">{categories.find(c => c.id === activeCategoryId)?.name || 'Заметки'}</h2>
              <p className="text-sm text-slate-500">{filteredNotes.length} заметок</p>
            </div>
            <button onClick={() => setSidebarVisible(true)} className="md:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Open sidebar">
              <Bars3Icon className="w-6 h-6"/>
            </button>
         </div>
         <div className="overflow-y-auto flex-1">
            {filteredNotes.map(note => (
              <div 
                key={note.id} 
                onClick={() => { setActiveNoteId(note.id); window.location.hash = `note=${note.id}`;}}
                className={`p-4 border-l-4 border-b border-slate-200 dark:border-slate-700 cursor-pointer ${activeNoteId === note.id ? 'bg-cyan-50 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'} note-color-${note.color || 'slate'}`}
              >
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate pr-2 flex-1">{note.title}</h3>
                    <div className="flex items-center flex-shrink-0 gap-2 text-slate-400">
                        {note.isPinned && <PinIcon rotated className="w-4 h-4" />}
                        {note.reminder && <ClockIcon className="w-4 h-4" />}
                        <button onClick={(e) => { e.stopPropagation(); updateNote(note.id, { isFavorite: !note.isFavorite }); }} className="p-1 -m-1">
                            <StarIcon filled={note.isFavorite} className={`w-5 h-5 ${note.isFavorite ? 'text-yellow-400' : 'text-slate-400 hover:text-slate-500'}`} />
                        </button>
                    </div>
                  </div>
                  <NoteListItemContent note={note} updateNote={updateNote} />
                  <p className="text-xs text-slate-400 mt-2">{new Date(note.updatedAt).toLocaleString()}</p>
              </div>
            ))}
         </div>
      </div>
      
      <main className={`flex-1 flex-col ${activeNoteId ? 'flex' : 'hidden md:flex'}`}>
        {activeNote ? (
          <Editor activeNote={activeNote} updateNote={updateNote} deleteNote={deleteNote} setActiveNoteId={setActiveNoteId} getSanitizedHtml={getSanitizedHtml} setReminder={setReminder} deleteReminder={deleteReminder} />
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

const EditorToolbar = ({ onFormat }) => {
    const tools = [
        { icon: BoldIcon, handler: () => onFormat('**', '**'), title: 'Жирный' },
        { icon: ItalicIcon, handler: () => onFormat('*', '*'), title: 'Курсив' },
        { icon: ListBulletIcon, handler: () => onFormat('\n- ', ''), title: 'Список' },
        { icon: CodeBracketIcon, handler: () => onFormat('`', '`'), title: 'Код' },
    ];

    return (
        <div className="flex items-center p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            {tools.map((tool, index) => (
                <button key={index} onClick={tool.handler} title={tool.title} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
                    <tool.icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </button>
            ))}
        </div>
    );
};

const Editor = ({ activeNote, updateNote, deleteNote, setActiveNoteId, getSanitizedHtml, setReminder, deleteReminder }) => {
    const [isColorPickerOpen, setColorPickerOpen] = useState(false);
    const [isReminderModalOpen, setReminderModalOpen] = useState(false);
    const colorPickerRef = useRef(null);
    const titleRef = useRef(null);
    const contentRef = useRef(null);
    const previewRef = useRef(null);
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
                setColorPickerOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (titleRef.current) {
            const el = titleRef.current;
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }
    }, [activeNote.title, activeNote.id]);
    
    const addJournalEntry = (entryText) => {
        if (!entryText.trim()) return;
        const newEntry = { text: entryText, timestamp: new Date().toISOString() };
        const updatedJournal = activeNote.journal ? [...activeNote.journal, newEntry] : [newEntry];
        updateNote(activeNote.id, { journal: updatedJournal });
    };

    const deleteJournalEntry = (timestamp) => {
        const updatedJournal = activeNote.journal.filter(entry => entry.timestamp !== timestamp);
        updateNote(activeNote.id, { journal: updatedJournal });
    };

    const handleFormat = (startSyntax, endSyntax = '') => {
        const textarea = contentRef.current;
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = activeNote.content.substring(start, end);
        
        const newContent = 
            activeNote.content.substring(0, start) +
            startSyntax + 
            selectedText + 
            endSyntax + 
            activeNote.content.substring(end);
        
        updateNote(activeNote.id, { content: newContent });

        setTimeout(() => {
            textarea.focus();
            if (selectedText) {
                textarea.selectionStart = start + startSyntax.length;
                textarea.selectionEnd = end + startSyntax.length;
            } else {
                 textarea.selectionStart = textarea.selectionEnd = start + startSyntax.length;
            }
        }, 0);
    };

    const toggleTaskInContent = useCallback((lineIndex) => {
        const lines = activeNote.content.split('\n');
        if (lines[lineIndex]) {
            const line = lines[lineIndex];
            if (line.includes('- [ ]')) {
                lines[lineIndex] = line.replace('- [ ]', '- [x]');
            } else if (line.includes('- [x]')) {
                lines[lineIndex] = line.replace('- [x]', '- [ ]');
            }
            updateNote(activeNote.id, { content: lines.join('\n') });
        }
    }, [activeNote.id, activeNote.content, updateNote]);

    useEffect(() => {
        const previewEl = previewRef.current;
        if (!previewEl) return;

        const handleClick = (e) => {
            if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
                const li = e.target.closest('li');
                if (li && li.hasAttribute('data-line-index')) {
                    const lineIndex = parseInt(li.getAttribute('data-line-index'), 10);
                    toggleTaskInContent(lineIndex);
                }
            }
        };
        previewEl.addEventListener('click', handleClick);
        return () => previewEl.removeEventListener('click', handleClick);
    }, [activeNote.id, activeNote.content, toggleTaskInContent]);

    return (
        <div className="flex-1 flex flex-col min-w-0 h-full">
            {isReminderModalOpen && <ReminderModal note={activeNote} onSave={setReminder} onDelete={deleteReminder} onClose={() => setReminderModalOpen(false)} />}
            
            <header className="flex-shrink-0 p-2 h-auto md:h-16 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
               <div className="flex items-center gap-2 min-w-0 w-full md:w-auto">
                  <button onClick={() => { setActiveNoteId(null); window.location.hash = ''; }} className="md:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                    <ArrowLeftIcon className="w-6 h-6"/>
                  </button>
                  <textarea 
                    ref={titleRef}
                    rows="1"
                    value={activeNote.title}
                    onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                    className="text-lg font-semibold bg-transparent focus:outline-none focus:ring-0 border-0 p-1 w-full resize-none overflow-hidden block"
                    placeholder="Заголовок заметки"
                  />
               </div>
               <div className="flex items-center gap-1 flex-shrink-0 self-end md:self-center">
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
                 <button onClick={() => {if(confirm('Вы уверены, что хотите удалить эту заметку?')) deleteNote(activeNote.id)}} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" title="Удалить">
                   <TrashIcon className="w-5 h-5 text-slate-500" />
                 </button>
               </div>
            </header>
            
            <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
               <div className="w-full lg:w-1/2 h-1/2 lg:h-full flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700">
                  <EditorToolbar onFormat={handleFormat} />
                  <textarea
                    ref={contentRef}
                    value={activeNote.content}
                    onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                    className="w-full h-full p-6 bg-white dark:bg-slate-900 text-base resize-none focus:outline-none leading-relaxed"
                    placeholder="Начните писать..."
                  ></textarea>
               </div>
               <div className="w-full lg:w-1/2 h-1/2 lg:h-full overflow-y-auto flex flex-col">
                 <div
                   ref={previewRef}
                   className="p-6 markdown-content flex-grow"
                   dangerouslySetInnerHTML={{ __html: getSanitizedHtml(activeNote.content) }}
                 />
                 <Journal journal={activeNote.journal || []} onAddEntry={addJournalEntry} onDeleteEntry={deleteJournalEntry} />
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
                    aria-label={`Select ${color} color`}
                />
            ))}
        </div>
    );
};

const Journal = ({ journal, onAddEntry, onDeleteEntry }) => {
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
                    [...journal].reverse().map((entry, index) => {
                        const date = new Date(entry.timestamp);
                        const displayDate = !isNaN(date.getTime()) ? date.toLocaleString() : "Неверная дата";
                        return (
                            <div key={entry.timestamp || index} className="text-sm py-1.5 border-b border-slate-200 dark:border-slate-700 last:border-b-0 flex justify-between items-center gap-2">
                                <div className="min-w-0">
                                    <p className="text-slate-600 dark:text-slate-300 break-words">{entry.text}</p>
                                    <p className="text-xs text-slate-400">{displayDate}</p>
                                </div>
                                <button onClick={() => onDeleteEntry(entry.timestamp)} className="p-1 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0" title="Удалить запись">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )
                    })
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

const ReminderModal = ({ note, onSave, onDelete, onClose }) => {
    const [permissionStatus, setPermissionStatus] = useState('default');
    
    useEffect(() => {
        if ('Notification' in window) {
            setPermissionStatus(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);
        }
    };
    
    const PermissionRequiredView = () => (
        <div className="p-6 flex flex-col items-center text-center">
            <BellIcon className="w-12 h-12 text-slate-400 mb-4" />
            <h4 className="font-semibold text-lg mb-2">Требуется разрешение</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Чтобы получать напоминания, необходимо разрешить приложению отправлять уведомления.
            </p>
            <button onClick={requestPermission} className="w-full bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-cyan-700 transition-colors">
                Разрешить уведомления
            </button>
        </div>
    );

    const PermissionBlockedView = () => (
        <div className="p-6 flex flex-col items-center text-center">
            <InformationCircleIcon className="w-12 h-12 text-red-500 mb-4" />
            <h4 className="font-semibold text-lg mb-2">Уведомления заблокированы</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Вы заблокировали уведомления для этого сайта. Чтобы использовать напоминания, пожалуйста, измените настройки разрешений в вашем браузере.
            </p>
        </div>
    );

    const ReminderForm = () => {
        const today = new Date().toISOString().split('T')[0];
        const [type, setType] = useState(note.reminder?.type || 'single');
        const [startDate, setStartDate] = useState(note.reminder?.startDate || today);
        const [endDate, setEndDate] = useState(note.reminder?.endDate || '');
        const [times, setTimes] = useState(note.reminder?.times || ['09:00']);
        const [daysOfWeek, setDaysOfWeek] = useState(note.reminder?.daysOfWeek || []);
    
        const handleSave = async () => {
            const reminderData = {
                type,
                startDate,
                times: times.filter(t => t), // Remove empty times
                ...(type === 'weekly' && { daysOfWeek }),
                ...(type !== 'single' && endDate && { endDate }),
            };
            const success = await onSave(note, reminderData);
            if(success){
                onClose();
            }
        };
        
        const handleDelete = () => {
            onDelete(note.id);
            onClose();
        }
    
        const handleDayToggle = (dayIndex) => {
            setDaysOfWeek(prev => prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]);
        };
    
        const handleTimeChange = (index, value) => {
            const newTimes = [...times];
            newTimes[index] = value;
            setTimes(newTimes);
        };
    
        const addTime = () => setTimes([...times, '']);
        const removeTime = (index) => setTimes(times.filter((_, i) => i !== index));
    
        const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

        return (
            <>
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Тип</label>
                        <select value={type} onChange={e => setType(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm bg-white dark:bg-slate-700 focus:border-cyan-500 focus:ring-cyan-500 text-sm">
                            <option value="single">Один раз</option>
                            <option value="daily">Ежедневно</option>
                            <option value="weekly">Еженедельно</option>
                            <option value="monthly">Ежемесячно</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Дата начала</label>
                        <input type="date" min={today} value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm bg-white dark:bg-slate-700 focus:border-cyan-500 focus:ring-cyan-500 text-sm"/>
                    </div>
                    {type === "weekly" && (
                        <div>
                            <label className="block text-sm font-medium">Дни недели</label>
                            <div className="mt-2 grid grid-cols-7 gap-1">
                                {weekDays.map((day, index) => (
                                    <button key={index} onClick={() => handleDayToggle(index)} className={`p-2 text-xs font-semibold rounded-md ${daysOfWeek.includes(index) ? 'bg-cyan-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>{day}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium">Время</label>
                        {times.map((time, index) => (
                            <div key={index} className="flex items-center gap-2 mt-1">
                                <input type="time" value={time} onChange={e => handleTimeChange(index, e.target.value)} className="block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm bg-white dark:bg-slate-700 focus:border-cyan-500 focus:ring-cyan-500 text-sm"/>
                                {times.length > 1 && <button onClick={() => removeTime(index)} className="p-1 text-slate-500 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>}
                            </div>
                        ))}
                         <button onClick={addTime} className="text-sm text-cyan-600 hover:text-cyan-700 mt-2">Добавить время</button>
                    </div>
                     {type !== 'single' && (
                        <div>
                            <label className="block text-sm font-medium">Дата окончания (необязательно)</label>
                            <input type="date" min={startDate} value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm bg-white dark:bg-slate-700 focus:border-cyan-500 focus:ring-cyan-500 text-sm"/>
                        </div>
                    )}
                 </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-between gap-2">
                    {note.reminder ? 
                        <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md">Удалить</button>
                        : <div></div>
                    }
                    <div className="flex justify-end gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md">Закрыть</button>
                        <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700">Сохранить</button>
                    </div>
                 </div>
            </>
        )
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
             <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                 <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Настроить напоминание</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><XMarkIcon className="w-5 h-5" /></button>
                 </div>
                 {permissionStatus === 'granted' && <ReminderForm />}
                 {permissionStatus === 'default' && <PermissionRequiredView />}
                 {permissionStatus === 'denied' && <PermissionBlockedView />}
                 {permissionStatus === 'denied' && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md">Закрыть</button>
                    </div>
                 )}
             </div>
        </div>
    );
};

const Toast = ({ message, type, onClose }) => {
    const colors = {
        info: 'bg-sky-500',
        success: 'bg-emerald-500',
        error: 'bg-red-500',
    };
    return (
        <div className={`fixed bottom-5 right-5 text-white p-4 rounded-lg shadow-lg z-50 animate-slide-in ${colors[type] || 'bg-gray-800'}`}>
            <div className="flex items-center justify-between">
                <span>{message}</span>
                <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-black/20"><XMarkIcon className="w-4 h-4"/></button>
            </div>
        </div>
    );
}

const container = document.getElementById('root');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(<App />);
}