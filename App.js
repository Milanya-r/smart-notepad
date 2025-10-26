
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Note, Category, ToastMessage, Template, Reminder, JournalEntry } from './types.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { PlusIcon, FolderPlusIcon, StarIcon, PencilIcon, TrashIcon, ArrowLeftIcon, CheckIcon, XMarkIcon, SearchIcon, BellIcon, EyeIcon, EyeSlashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ChevronUpDownIcon, ClipboardDocumentCheckIcon, ArchiveBoxXMarkIcon, CheckCircleIcon, PinIcon, PaintBrushIcon, ArrowUturnLeftIcon, Cog6ToothIcon, LockClosedIcon, EllipsisVerticalIcon, SunIcon, MoonIcon, DocumentDuplicateIcon, BoldIcon, ItalicIcon, HeadingIcon, LinkIcon, CodeBracketIcon, ListBulletIcon, ListOrderedIcon, QuoteIcon, ShareIcon, ClockIcon, CalendarDaysIcon, ArrowPathIcon } from './components/icons.js';
import Modal from './components/Modal.js';
import Toast from './components/Toast.js';
import EditorToolbar, { FormatType } from './components/EditorToolbar.js';

type View = 'LIST' | 'EDITOR' | 'TRASH';
type Filter = 'ALL' | 'FAVORITES';
type SortOrder = 'updatedAt_desc' | 'updatedAt_asc' | 'createdAt_desc' | 'createdAt_asc' | 'title_asc' | 'title_desc';
type Theme = 'light' | 'dark';

const calculateNextDueDate = (reminder: Reminder, lastCheckTime: number): number | null => {
    if (!reminder) return null;

    const sortedTimes = reminder.times
        .map(t => {
            const [h, m] = t.split(':').map(Number);
            return { h, m };
        })
        .sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));

    let searchDate = new Date(lastCheckTime);
    searchDate.setHours(0, 0, 0, 0);
    
    const startDate = new Date(reminder.startDate);
    startDate.setHours(0,0,0,0);

    // Limit search to 2 years to prevent infinite loops
    for (let i = 0; i < 730; i++) { 
        if (searchDate.getTime() >= startDate.getTime()) {
             let isValidDay = false;
             switch (reminder.type) {
                case 'daily':
                    isValidDay = true;
                    break;
                case 'weekly':
                    isValidDay = reminder.daysOfWeek?.includes(searchDate.getDay()) ?? false;
                    break;
                case 'monthly':
                    isValidDay = searchDate.getDate() === new Date(reminder.startDate).getDate();
                    break;
                case 'single':
                    isValidDay = searchDate.getTime() === startDate.getTime();
                    break;
             }

             if (isValidDay) {
                for (const time of sortedTimes) {
                    let dueDate = new Date(searchDate);
                    dueDate.setHours(time.h, time.m, 0, 0);

                    if (dueDate.getTime() > lastCheckTime) {
                        if (reminder.endDate && dueDate.getTime() > reminder.endDate) {
                            return null; // Past the end date
                        }
                        return dueDate.getTime();
                    }
                }
             }
        }
       
        searchDate.setDate(searchDate.getDate() + 1);
    }

    return null; // No upcoming date found within the search limit
};

const parseMarkdownWithChecklists = (markdown: string, noteId: string): { __html: string } => {
    // Enable GFM task lists
    const rawHtml = window.marked.parse(markdown, { gfm: true });

    let checklistItemIndex = -1;
    const processedHtml = rawHtml.replace(/<li class="task-list-item">/g, (match) => {
        checklistItemIndex++;
        // Inject data attributes for interactivity
        return `<li class="task-list-item" data-note-id="${noteId}" data-item-index="${checklistItemIndex}">`;
    }).replace(/<input type="checkbox" disabled="">/g, (match) => {
        // Make checkboxes clickable
        return match.replace(' disabled=""', '');
    }).replace(/<li class="task-list-item" data-note-id="(.+?)" data-item-index="(.+?)"><input type="checkbox" checked="">/g, (match) => {
        // Add a 'done' class for styling completed items
        return match.replace('<li class="task-list-item"', '<li class="task-list-item done"');
    });

    const sanitizedHtml = window.DOMPurify.sanitize(processedHtml, {
        ADD_ATTR: ['data-note-id', 'data-item-index'],
        // DOMPurify by default allows 'checked' and 'type' on inputs
    });

    return { __html: sanitizedHtml };
};


const App: React.FC = () => {
  const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);
  const [categories, setCategories] = useLocalStorage<Category[]>('categories', []);
  const [templates, setTemplates] = useLocalStorage<Template[]>('templates', []);
  const [activeToast, setActiveToast] = useState<ToastMessage | null>(null);

  const [view, setView] = useState<View>('LIST');
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');

  const [activeFilter, setActiveFilter] = useState<Filter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('updatedAt_desc');
  
  const [noteToTrash, setNoteToTrash] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [isDeleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [dataToImport, setDataToImport] = useState<{notes: Note[], categories: Category[], templates: Template[], theme: Theme} | null>(null);

  // Selection and mass delete state
  const [isSelectionMode, setSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [isDeleteSelectedModalOpen, setDeleteSelectedModalOpen] = useState(false);

  // Trash actions state
  const [isClearTrashModalOpen, setClearTrashModalOpen] = useState(false);
  
  // PIN lock state
  const [pinHash, setPinHash] = useLocalStorage<string | null>('smart-notepad-pin', null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(!pinHash);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);

  // Template state
  const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);


  // Theme state
  const osTheme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const [theme, setTheme] = useLocalStorage<Theme>('theme', osTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // One-time migration for old reminders
  useEffect(() => {
    const isMigrated = localStorage.getItem('smart-notepad-reminder-migrated-v2');
    if (isMigrated) return;

    const notesToMigrate = notes.some(n => (n as any).reminderAt);

    if (notesToMigrate) {
        const migratedNotes = notes.map(note => {
            const oldNote = note as any;
            let newNotePart: Partial<Note> = {};

            if (oldNote.reminderAt) {
                const reminderDate = new Date(oldNote.reminderAt);
                const newReminder: Reminder = {
                    type: 'single',
                    startDate: reminderDate.getTime(),
                    times: [`${String(reminderDate.getHours()).padStart(2, '0')}:${String(reminderDate.getMinutes()).padStart(2, '0')}`],
                    nextDueDate: reminderDate.getTime(),
                    endDate: null,
                };
                newNotePart.reminder = newReminder;
            } else {
                newNotePart.reminder = note.reminder || null;
            }

            if (!note.journal) {
                newNotePart.journal = [];
            }
            
            const { reminderAt, ...restOfNote } = oldNote;

            return { ...restOfNote, ...newNotePart };
        });
        setNotes(migratedNotes as Note[]);
        showToast('Напоминания обновлены до нового формата!', 'info');
    }
    localStorage.setItem('smart-notepad-reminder-migrated-v2', 'true');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    // Request notification permission on load if not already determined.
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Check for due reminders every 30 seconds
    const intervalId = setInterval(() => {
        const now = Date.now();
        let notesChanged = false;
        const updatedNotes = [...notes]; // Create a mutable copy

        updatedNotes.forEach((note, index) => {
            if (note.reminder && note.reminder.nextDueDate && note.reminder.nextDueDate <= now) {
                if (Notification.permission === 'granted') {
                    new Notification(`Напоминание: ${note.title}`, {
                        body: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
                    });
                }

                // Calculate the next due date
                const newNextDueDate = calculateNextDueDate(note.reminder, now);

                updatedNotes[index] = {
                    ...note,
                    reminder: {
                        ...note.reminder,
                        nextDueDate: newNextDueDate,
                    },
                    updatedAt: now,
                };
                notesChanged = true;
            }
        });

        if (notesChanged) {
            setNotes(updatedNotes);
            showToast('Сработало напоминание!', 'info');
        }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [notes, setNotes]);

  // Handle shared note import from URL on initial load
  useEffect(() => {
    const handleUrlImport = () => {
        try {
            const hash = window.location.hash;
            if (hash.startsWith('#/import-note/')) {
                const encodedData = hash.substring('#/import-note/'.length);
                const decodedJson = atob(decodeURIComponent(encodedData));
                const noteData = JSON.parse(decodedJson);

                if (noteData.title && typeof noteData.content !== 'undefined') {
                     const now = Date.now();
                     const newNote: Note = {
                        id: now.toString(),
                        title: noteData.title,
                        content: noteData.content,
                        color: noteData.color || null,
                        createdAt: now,
                        updatedAt: now,
                        isFavorite: false,
                        isPinned: false,
                        categoryId: null,
                        reminder: null,
                        journal: [],
                        deletedAt: null,
                     };
                     setNotes(prevNotes => [newNote, ...prevNotes]);
                     showToast('Заметка успешно импортирована!', 'success');
                     
                     // Clean up URL
                     window.history.replaceState(null, '', window.location.pathname + window.location.search);
                }
            }
        } catch (e) {
            console.error("Failed to import note from URL", e);
            showToast('Не удалось импортировать заметку по ссылке.', 'error');
        }
    };
    handleUrlImport();
  }, [setNotes]);


  const showToast = (message: string, type: ToastMessage['type'] = 'info') => {
    setActiveToast({ id: Date.now(), message, type });
  };
  
  const hashPin = async (pin: string): Promise<string> => {
      const encoder = new TextEncoder();
      const data = encoder.encode(pin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSaveNote = (noteData: { title: string; content: string; isFavorite: boolean; categoryId: string | null; reminder: Reminder | null; journal: JournalEntry[]; color: string | null; }) => {
    const now = Date.now();
    
    if (noteData.reminder && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'denied') {
          showToast('Уведомления заблокированы. Вы не получите напоминание.', 'error');
        }
      });
    } else if (noteData.reminder && Notification.permission === 'denied') {
        showToast('Уведомления заблокированы. Включите их в настройках браузера.', 'error');
    }
    
    // Calculate next due date for the new/updated reminder
    let processedReminder = noteData.reminder;
    if (processedReminder) {
        const nextDueDate = calculateNextDueDate(processedReminder, Date.now());
        processedReminder = { ...processedReminder, nextDueDate };
    }


    if (currentNote) {
      setNotes(notes.map(n => n.id === currentNote.id ? { ...n, ...noteData, reminder: processedReminder, updatedAt: now } : n));
      showToast('Заметка обновлена', 'success');
    } else {
      const newNote: Note = {
        id: now.toString(),
        ...noteData,
        reminder: processedReminder,
        createdAt: now,
        updatedAt: now,
        isPinned: false,
        deletedAt: null,
      };
      setNotes([newNote, ...notes]);
      showToast('Заметка создана', 'success');
    }
    setView('LIST');
    setCurrentNote(null);
  };
  
  const handleMoveToTrash = (id: string) => {
    setNoteToTrash(id);
  };

  const confirmMoveToTrash = () => {
    if (!noteToTrash) return;
    setNotes(notes.map(n => n.id === noteToTrash ? { ...n, deletedAt: Date.now(), isPinned: false } : n));
    showToast('Заметка перемещена в корзину', 'info');
    setNoteToTrash(null);
  };
  
  const handleRestoreNote = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, deletedAt: null } : n));
    showToast('Заметка восстановлена', 'success');
  };
  
  const handleDeletePermanently = (id: string) => {
    setNoteToDelete(id);
  };
  
  const confirmDeletePermanently = () => {
    if (!noteToDelete) return;
    setNotes(notes.filter(n => n.id !== noteToDelete));
    showToast('Заметка удалена навсегда', 'error');
    setNoteToDelete(null);
  };

  const handleEmptyTrash = () => {
    setNotes(notes.filter(n => !n.deletedAt));
    showToast('Корзина очищена', 'error');
    setClearTrashModalOpen(false);
  };

  const handleToggleFavorite = (id: string) => {
    setNotes(notes.map(n => {
      if (n.id === id) {
        const isNowFavorite = !n.isFavorite;
        return { ...n, isFavorite: isNowFavorite, categoryId: isNowFavorite ? n.categoryId : null };
      }
      return n;
    }));
  };
  
  const handleTogglePin = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  };
  
  const handleToggleChecklistItem = (noteId: string, itemIndex: number) => {
        setNotes(prevNotes => {
            const noteToUpdate = prevNotes.find(n => n.id === noteId);
            if (!noteToUpdate) return prevNotes;

            const lines = noteToUpdate.content.split('\n');
            let currentChecklistItem = -1;
            const newLines = lines.map(line => {
                if (line.trim().startsWith('- [ ]') || line.trim().startsWith('- [x]')) {
                    currentChecklistItem++;
                    if (currentChecklistItem === itemIndex) {
                        return line.includes('[ ]') ? line.replace('[ ]', '[x]') : line.replace('[x]', '[ ]');
                    }
                }
                return line;
            });

            return prevNotes.map(n => 
                n.id === noteId 
                    ? { ...n, content: newLines.join('\n'), updatedAt: Date.now() } 
                    : n
            );
        });
    };

  const handleChangeCategory = (noteId: string, categoryId: string | null) => {
      setNotes(notes.map(n => n.id === noteId ? { ...n, categoryId: categoryId } : n));
  };

  const handleCreateCategory = () => {
    if (newCategoryName.trim() === '') {
      showToast('Название категории не может быть пустым', 'error');
      return;
    }
    const newCategory: Category = { id: Date.now().toString(), name: newCategoryName.trim() };
    setCategories([...categories, newCategory]);
    setNewCategoryName('');
    showToast('Категория создана', 'success');
  };

  const handleDeleteCategory = (id: string) => {
    setNotes(notes.map(n => n.categoryId === id ? { ...n, categoryId: null } : n));
    setCategories(categories.filter(c => c.id !== id));
    showToast('Категория удалена', 'error');
  };

  const startEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditedCategoryName(category.name);
  };

  const cancelEditCategory = () => {
      setEditingCategoryId(null);
      setEditedCategoryName('');
  };

  const handleUpdateCategory = () => {
      if (!editingCategoryId || editedCategoryName.trim() === '') {
          showToast('Название категории не может быть пустым', 'error');
          return;
      }
      setCategories(categories.map(c => c.id === editingCategoryId ? { ...c, name: editedCategoryName.trim() } : c));
      showToast('Категория обновлена', 'success');
      cancelEditCategory();
  };

  // Template CRUD
  const handleSaveTemplate = (templateData: {id?: string, title: string, content: string}) => {
    if (templateData.title.trim() === '') {
        showToast('Название шаблона не может быть пустым', 'error');
        return false;
    }
    if (templateData.id) { // Update
        setTemplates(templates.map(t => t.id === templateData.id ? { ...t, title: templateData.title, content: templateData.content } : t));
        showToast('Шаблон обновлен', 'success');
    } else { // Create
        const newTemplate: Template = {
            id: Date.now().toString(),
            title: templateData.title.trim(),
            content: templateData.content
        };
        setTemplates([...templates, newTemplate]);
        showToast('Шаблон создан', 'success');
    }
    return true;
  };

  const handleDeleteTemplate = (id: string) => {
      setTemplates(templates.filter(t => t.id !== id));
      showToast('Шаблон удален', 'error');
  };


  const openEditor = (note: Note | null) => {
    setCurrentNote(note);
    setView('EDITOR');
  };
  
  const navigateTo = (targetView: View) => {
    setView(targetView);
    setSelectionMode(false);
    setSelectedNoteIds([]);
  };

  const handleExportData = () => {
    try {
      const data = JSON.stringify({ notes, categories, templates, theme }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-notepad-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Данные успешно экспортированы!', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Ошибка при экспорте данных.', 'error');
    }
  };

  const handleImportClick = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error('File is not a text file');
        const parsedData = JSON.parse(text);

        if (Array.isArray(parsedData.notes) && Array.isArray(parsedData.categories)) {
          // Add missing fields to imported notes for backward compatibility
          const notesWithDefaults = parsedData.notes.map((n: Partial<Note> & {reminderAt?: number}) => ({
              id: n.id || Date.now().toString(),
              title: n.title || '',
              content: n.content || '',
              createdAt: n.createdAt || Date.now(),
              updatedAt: n.updatedAt || Date.now(),
              isFavorite: n.isFavorite ?? false,
              categoryId: n.categoryId ?? null,
              isPinned: n.isPinned ?? false,
              color: n.color ?? null,
              reminder: n.reminder ?? null,
              journal: n.journal ?? [],
              deletedAt: n.deletedAt ?? null,
          }));
          const templatesWithDefaults = (parsedData.templates || []).map((t: Partial<Template>) => ({
              id: t.id || Date.now().toString(),
              title: t.title || 'Без названия',
              content: t.content || '',
          }));
          
          const themeFromImport = parsedData.theme === 'light' ? 'light' : 'dark';
          setDataToImport({ notes: notesWithDefaults, categories: parsedData.categories, templates: templatesWithDefaults, theme: themeFromImport });
          setImportModalOpen(true);
        } else {
          throw new Error('Invalid file structure');
        }
      } catch (error) {
        console.error('Import failed:', error);
        showToast('Ошибка: Неверный формат файла.', 'error');
      } finally {
        if (importFileInputRef.current) {
          importFileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const confirmImportData = () => {
    if (dataToImport) {
        setNotes(dataToImport.notes);
        setCategories(dataToImport.categories);
        setTemplates(dataToImport.templates);
        setTheme(dataToImport.theme);
        showToast('Данные успешно импортированы!', 'success');
    }
    setImportModalOpen(false);
    setDataToImport(null);
  };
  
  // Selection Handlers
  const handleToggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    setSelectedNoteIds([]);
  };

  const handleSelectNote = (id: string) => {
    if (!isSelectionMode) return;
    setSelectedNoteIds(prev =>
      prev.includes(id)
        ? prev.filter(noteId => noteId !== id)
        : [...prev, id]
    );
  };

  const confirmDeleteSelected = () => {
    const count = selectedNoteIds.length;
    
    // In Trash view, delete permanently. In List view, move to trash.
    if (view === 'TRASH') {
        setNotes(notes.filter(n => !selectedNoteIds.includes(n.id)));
    } else {
        const now = Date.now();
        setNotes(notes.map(n => selectedNoteIds.includes(n.id) ? {...n, deletedAt: now, isPinned: false} : n));
    }
    
    let message = '';
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastDigit === 1 && lastTwoDigits !== 11) {
        message = `${count} заметка ${view === 'TRASH' ? 'удалена' : 'перемещена в корзину'}`;
    } else if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwoDigits)) {
        message = `${count} заметки ${view === 'TRASH' ? 'удалены' : 'перемещены в корзину'}`;
    } else {
        message = `${count} заметок ${view === 'TRASH' ? 'удалено' : 'перемещено в корзину'}`;
    }

    showToast(message, 'error');
    setDeleteSelectedModalOpen(false);
    setSelectionMode(false);
    setSelectedNoteIds([]);
  };

  const confirmDeleteAllActive = () => {
    const now = Date.now();
    setNotes(notes.map(n => !n.deletedAt ? { ...n, deletedAt: now, isPinned: false } : n));
    showToast('Все заметки перемещены в корзину', 'info');
    setDeleteAllModalOpen(false);
  };

  const activeNotes = useMemo(() => notes.filter(n => !n.deletedAt), [notes]);
  const trashedNotes = useMemo(() => {
    const sorted = notes.filter(n => n.deletedAt);
    sorted.sort((a,b) => (b.deletedAt || 0) - (a.deletedAt || 0));
    return sorted;
  }, [notes]);


  const filteredNotes = useMemo(() => {
    const sortNotes = (notesToSort: Note[]) => {
      const sorted = [...notesToSort];
      switch (sortOrder) {
        case 'updatedAt_desc': sorted.sort((a, b) => b.updatedAt - a.updatedAt); break;
        case 'updatedAt_asc': sorted.sort((a, b) => a.updatedAt - b.updatedAt); break;
        case 'createdAt_desc': sorted.sort((a, b) => b.createdAt - a.createdAt); break;
        case 'createdAt_asc': sorted.sort((a, b) => a.createdAt - b.createdAt); break;
        case 'title_asc': sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
        case 'title_desc': sorted.sort((a, b) => b.title.localeCompare(a.title)); break;
      }
      return sorted;
    };
    
    let notesToDisplay = activeNotes;
    if (activeFilter === 'FAVORITES') {
      notesToDisplay = activeNotes.filter(n => n.isFavorite);
    }

    if (searchQuery.trim() !== '') {
        notesToDisplay = notesToDisplay.filter(note => 
            note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            note.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    const pinnedNotes = notesToDisplay.filter(n => n.isPinned);
    const unpinnedNotes = notesToDisplay.filter(n => !n.isPinned);

    return [...sortNotes(pinnedNotes), ...sortNotes(unpinnedNotes)];

  }, [activeNotes, activeFilter, searchQuery, sortOrder]);

  const favoritesByCategory = useMemo(() => {
    if (activeFilter !== 'FAVORITES') return [];
    
    const grouped: { category: Category | null; notes: Note[] }[] = [];
    const uncategorized: Note[] = [];

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const notesForGrouping = filteredNotes.filter(n => n.isFavorite);

    for (const note of notesForGrouping) {
        if (note.categoryId && categoryMap.has(note.categoryId)) {
          const category = categoryMap.get(note.categoryId)!;
          let group = grouped.find(g => g.category?.id === category.id);
          if (!group) {
            group = { category, notes: [] };
            grouped.push(group);
          }
          group.notes.push(note);
        } else {
          uncategorized.push(note);
        }
    }
    
    grouped.sort((a, b) => a.category!.name.localeCompare(b.category!.name));

    if (uncategorized.length > 0) {
      grouped.push({ category: null, notes: uncategorized });
    }

    return grouped;
  }, [filteredNotes, categories, activeFilter]);

  if (!isUnlocked) {
      return <LockScreen pinHash={pinHash!} onUnlock={() => setIsUnlocked(true)} hashFn={hashPin} />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100">
      <div className="container mx-auto max-w-3xl p-4">
        {view === 'LIST' && (
          <ListView
            notes={filteredNotes}
            categories={categories}
            activeFilter={activeFilter}
            favoritesByCategory={favoritesByCategory}
            setActiveFilter={setActiveFilter}
            onEdit={openEditor}
            onDelete={handleMoveToTrash}
            onToggleFavorite={handleToggleFavorite}
            onTogglePin={handleTogglePin}
            onChangeCategory={handleChangeCategory}
            onOpenCategoryModal={() => setCategoryModalOpen(true)}
            onOpenSettingsModal={() => setSettingsModalOpen(true)}
            onOpenTemplateModal={() => setTemplateModalOpen(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
            onExport={handleExportData}
            onImport={handleImportClick}
            isSelectionMode={isSelectionMode}
            selectedNoteIds={selectedNoteIds}
            onToggleSelectionMode={handleToggleSelectionMode}
            onSelectNote={handleSelectNote}
            onDeleteAll={() => setDeleteAllModalOpen(true)}
            onNavigate={navigateTo}
            trashedCount={trashedNotes.length}
            onToggleChecklistItem={handleToggleChecklistItem}
          />
        )}
        {view === 'TRASH' && (
           <TrashView
             notes={trashedNotes}
             onRestore={handleRestoreNote}
             onDelete={handleDeletePermanently}
             onEmptyTrash={() => setClearTrashModalOpen(true)}
             onNavigate={navigateTo}
             isSelectionMode={isSelectionMode}
             selectedNoteIds={selectedNoteIds}
             onToggleSelectionMode={handleToggleSelectionMode}
             onSelectNote={handleSelectNote}
             onDeleteSelected={() => setDeleteSelectedModalOpen(true)}
           />
        )}
        {view === 'EDITOR' && (
          <NoteEditor
            note={currentNote}
            categories={categories}
            templates={templates}
            onSave={handleSaveNote}
            onCancel={() => { navigateTo('LIST'); setCurrentNote(null); }}
            theme={theme}
            showToast={showToast}
          />
        )}
        
        <input type="file" ref={importFileInputRef} onChange={handleImportFileChange} className="hidden" accept="application/json" />

        <TemplateManagerModal 
          isOpen={isTemplateModalOpen}
          onClose={() => setTemplateModalOpen(false)}
          templates={templates}
          onSave={handleSaveTemplate}
          onDelete={handleDeleteTemplate}
        />

        <Modal title="Управление категориями" isOpen={isCategoryModalOpen} onClose={() => { setCategoryModalOpen(false); cancelEditCategory(); }}>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Новая категория..."
                className="flex-grow bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
              />
              <button onClick={handleCreateCategory} className="bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white font-bold p-2 rounded-md transition-colors">
                <PlusIcon className="w-5 h-5"/>
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.length > 0 ? categories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center bg-slate-100 dark:bg-slate-700 p-2 rounded-md">
                   {editingCategoryId === cat.id ? (
                      <>
                        <input
                          type="text"
                          value={editedCategoryName}
                          onChange={(e) => setEditedCategoryName(e.target.value)}
                          className="flex-grow bg-white dark:bg-slate-600 text-slate-900 dark:text-white rounded-md px-2 py-1 mr-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateCategory()}
                        />
                        <div className="flex space-x-1">
                          <button onClick={handleUpdateCategory} className="text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300 p-1">
                            <CheckIcon className="w-5 h-5"/>
                          </button>
                          <button onClick={cancelEditCategory} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1">
                            <XMarkIcon className="w-5 h-5"/>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="truncate pr-2">{cat.name}</span>
                        <div className="flex space-x-1 flex-shrink-0">
                          <button onClick={() => startEditCategory(cat)} className="text-slate-500 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 p-1">
                            <PencilIcon className="w-5 h-5"/>
                          </button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 p-1">
                            <TrashIcon className="w-5 h-5"/>
                          </button>
                        </div>
                      </>
                    )}
                </div>
              )) : (
                <p className="text-slate-500 dark:text-slate-400 text-center">Категорий пока нет.</p>
              )}
            </div>
          </div>
        </Modal>
        
         <SettingsModal 
            isOpen={isSettingsModalOpen} 
            onClose={() => setSettingsModalOpen(false)}
            pinHash={pinHash}
            setPinHash={setPinHash}
            hashFn={hashPin}
            showToast={showToast}
            theme={theme}
            setTheme={setTheme}
        />
        
        <Modal title="Переместить в корзину?" isOpen={noteToTrash !== null} onClose={() => setNoteToTrash(null)}>
          <div className="text-slate-600 dark:text-slate-300">
            <p>Вы уверены, что хотите переместить эту заметку в корзину?</p>
            <div className="flex justify-end space-x-4 mt-6">
              <button 
                onClick={() => setNoteToTrash(null)}
                className="px-4 py-2 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={confirmMoveToTrash}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
              >
                Переместить
              </button>
            </div>
          </div>
        </Modal>
        
        <Modal title="Удалить навсегда?" isOpen={noteToDelete !== null} onClose={() => setNoteToDelete(null)}>
          <div className="text-slate-600 dark:text-slate-300">
            <p>Заметка будет удалена навсегда. Это действие нельзя отменить.</p>
            <div className="flex justify-end space-x-4 mt-6">
              <button 
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-2 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeletePermanently}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </Modal>
        
         <Modal title="Подтвердите действие" isOpen={isDeleteSelectedModalOpen} onClose={() => setDeleteSelectedModalOpen(false)}>
            <div className="text-slate-600 dark:text-slate-300">
                <p>Вы уверены, что хотите {view === 'TRASH' ? 'навсегда удалить' : 'переместить в корзину'} {selectedNoteIds.length} {(() => {
                    const count = selectedNoteIds.length;
                    const lastDigit = count % 10;
                    const lastTwoDigits = count % 100;
                    if (lastDigit === 1 && lastTwoDigits !== 11) return 'заметку';
                    if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwoDigits)) return 'заметки';
                    return 'заметок';
                })()}?</p>
                {view === 'TRASH' && <p className="text-sm text-yellow-500 dark:text-yellow-400 mt-2">Это действие необратимо.</p>}
                <div className="flex justify-end space-x-4 mt-6">
                <button 
                    onClick={() => setDeleteSelectedModalOpen(false)}
                    className="px-4 py-2 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold transition-colors"
                >
                    Отмена
                </button>
                <button
                    onClick={confirmDeleteSelected}
                    className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
                >
                    {view === 'TRASH' ? 'Удалить' : 'Переместить'}
                </button>
                </div>
            </div>
        </Modal>

        <Modal title="Переместить все в корзину?" isOpen={isDeleteAllModalOpen} onClose={() => setDeleteAllModalOpen(false)}>
            <div className="text-slate-600 dark:text-slate-300">
                <p className="mb-2">Вы уверены, что хотите переместить <strong className="text-red-500 dark:text-red-400">все активные</strong> заметки в корзину?</p>
                <div className="flex justify-end space-x-4 mt-6">
                <button 
                    onClick={() => setDeleteAllModalOpen(false)}
                    className="px-4 py-2 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold transition-colors"
                >
                    Отмена
                </button>
                <button
                    onClick={confirmDeleteAllActive}
                    className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
                >
                    Переместить все
                </button>
                </div>
            </div>
        </Modal>
        
        <Modal title="Очистить корзину?" isOpen={isClearTrashModalOpen} onClose={() => setClearTrashModalOpen(false)}>
            <div className="text-slate-600 dark:text-slate-300">
                <p className="mb-2">Вы уверены, что хотите <strong className="text-red-500 dark:text-red-400">навсегда удалить все</strong> заметки из корзины?</p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-100/50 dark:bg-yellow-900/50 p-3 rounded-md">Это действие необратимо. Все данные из корзины будут потеряны.</p>
                <div className="flex justify-end space-x-4 mt-6">
                <button 
                    onClick={() => setClearTrashModalOpen(false)}
                    className="px-4 py-2 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold transition-colors"
                >
                    Отмена
                </button>
                <button
                    onClick={handleEmptyTrash}
                    className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
                >
                    Очистить корзину
                </button>
                </div>
            </div>
        </Modal>


         <Modal title="Импорт данных" isOpen={isImportModalOpen} onClose={() => setImportModalOpen(false)}>
            <div className="text-slate-600 dark:text-slate-300">
                <p className="mb-2">Вы уверены, что хотите импортировать данные?</p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-100/50 dark:bg-yellow-900/50 p-3 rounded-md">Внимание: Текущие заметки и категории будут полностью заменены данными из файла.</p>
                <div className="flex justify-end space-x-4 mt-6">
                <button 
                    onClick={() => { setImportModalOpen(false); setDataToImport(null); }}
                    className="px-4 py-2 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold transition-colors"
                >
                    Отмена
                </button>
                <button
                    onClick={confirmImportData}
                    className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors"
                >
                    Импортировать
                </button>
                </div>
            </div>
        </Modal>

        <Toast toast={activeToast} onDismiss={() => setActiveToast(null)} />
        
        {view === 'LIST' && !isSelectionMode && (
           <button onClick={() => openEditor(null)} className="fixed bottom-6 right-6 bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white rounded-full p-4 shadow-lg transform transition-transform hover:scale-110" aria-label="Создать заметку">
             <PlusIcon className="w-8 h-8"/>
           </button>
        )}

        {isSelectionMode && (
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 shadow-lg z-20 animate-fade-in-up">
                <div className="container mx-auto max-w-3xl p-4 flex justify-between items-center">
                    <button onClick={handleToggleSelectionMode} className="flex items-center space-x-2 px-4 py-2 rounded-md bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold transition-colors">
                        <XMarkIcon className="w-5 h-5"/>
                        <span>Отмена</span>
                    </button>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedNoteIds.length} выбрано</span>
                    <button 
                        onClick={() => setDeleteSelectedModalOpen(true)} 
                        disabled={selectedNoteIds.length === 0} 
                        className="flex items-center space-x-2 px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:bg-red-400 dark:disabled:bg-red-800 disabled:cursor-not-allowed"
                    >
                        <TrashIcon className="w-5 h-5"/>
                        <span>{view === 'TRASH' ? 'Удалить' : 'В корзину'}</span>
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

interface ListViewProps {
    notes: Note[];
    categories: Category[];
    activeFilter: Filter;
    favoritesByCategory: { category: Category | null; notes: Note[] }[];
    setActiveFilter: (filter: Filter) => void;
    onEdit: (note: Note) => void;
    onDelete: (id: string) => void;
    onToggleFavorite: (id: string) => void;
    onTogglePin: (id: string) => void;
    onChangeCategory: (noteId: string, categoryId: string | null) => void;
    onOpenCategoryModal: () => void;
    onOpenSettingsModal: () => void;
    onOpenTemplateModal: () => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    sortOrder: SortOrder;
    onSortChange: (order: SortOrder) => void;
    onExport: () => void;
    onImport: () => void;
    isSelectionMode: boolean;
    selectedNoteIds: string[];
    onToggleSelectionMode: () => void;
    onSelectNote: (id: string) => void;
    onDeleteAll: () => void;
    onNavigate: (view: View) => void;
    trashedCount: number;
    onToggleChecklistItem: (noteId: string, itemIndex: number) => void;
}

const ActionsDropdown: React.FC<{
    onOpenCategoryModal: () => void;
    onOpenTemplateModal: () => void;
    onImport: () => void;
    onExport: () => void;
    onDeleteAll: () => void;
}> = ({ onOpenCategoryModal, onOpenTemplateModal, onImport, onExport, onDeleteAll }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    const handleAction = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button ref={buttonRef} onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors" title="Больше действий">
                <EllipsisVerticalIcon className="w-6 h-6" />
            </button>
            {isOpen && (
                <div
                    className="origin-top-right absolute right-0 mt-2 w-52 sm:w-56 rounded-md shadow-lg bg-white dark:bg-slate-700 ring-1 ring-black ring-opacity-5 z-20"
                >
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        <a href="#" onClick={(e) => {e.preventDefault(); handleAction(onOpenTemplateModal);}} className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600" role="menuitem">
                            <DocumentDuplicateIcon className="w-5 h-5" />
                            <span>Шаблоны</span>
                        </a>
                        <a href="#" onClick={(e) => {e.preventDefault(); handleAction(onOpenCategoryModal);}} className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600" role="menuitem">
                            <FolderPlusIcon className="w-5 h-5" />
                            <span>Категории</span>
                        </a>
                        <a href="#" onClick={(e) => {e.preventDefault(); handleAction(onImport);}} className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600" role="menuitem">
                            <ArrowUpTrayIcon className="w-5 h-5" />
                            <span>Импорт</span>
                        </a>
                        <a href="#" onClick={(e) => {e.preventDefault(); handleAction(onExport);}} className="flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600" role="menuitem">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            <span>Экспорт</span>
                        </a>
                        <div className="border-t border-slate-200 dark:border-slate-600 my-1"></div>
                        <a href="#" onClick={(e) => {e.preventDefault(); handleAction(onDeleteAll);}} className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-600" role="menuitem">
                            <ArchiveBoxXMarkIcon className="w-5 h-5" />
                            <span>Переместить все в корзину</span>
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};

const ListView: React.FC<ListViewProps> = ({ notes, categories, activeFilter, favoritesByCategory, setActiveFilter, onEdit, onDelete, onToggleFavorite, onTogglePin, onChangeCategory, onOpenCategoryModal, onOpenSettingsModal, onOpenTemplateModal, searchQuery, onSearchChange, sortOrder, onSortChange, onExport, onImport, isSelectionMode, selectedNoteIds, onToggleSelectionMode, onSelectNote, onDeleteAll, onNavigate, trashedCount, onToggleChecklistItem }) => {
    
    const renderContent = () => {
        const hasNotes = activeFilter === 'ALL' ? notes.length > 0 : favoritesByCategory.some(g => g.notes.length > 0);

        const noteCardProps = {
            categories,
            onEdit,
            onDelete,
            onToggleFavorite,
            onTogglePin,
            onChangeCategory,
            isSelectionMode,
            onSelect: onSelectNote,
            onToggleChecklistItem,
        };

        if (hasNotes) {
            if (activeFilter === 'FAVORITES') {
                return favoritesByCategory.map(({ category, notes: groupNotes }) => (
                    <div key={category?.id || 'uncategorized'} className="mb-8">
                        <h2 className="text-xl font-semibold text-cyan-500 dark:text-cyan-300 mb-3 border-b-2 border-slate-200 dark:border-slate-700 pb-2">{category?.name || 'Без категории'}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groupNotes.map(note => <NoteCard key={note.id} note={note} isSelected={selectedNoteIds.includes(note.id)} {...noteCardProps}/>)}
                        </div>
                    </div>
                ));
            }
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {notes.map(note => <NoteCard key={note.id} note={note} isSelected={selectedNoteIds.includes(note.id)} {...noteCardProps}/>)}
                </div>
            );
        }

        if (searchQuery.trim() !== '') {
            return (
                <div className="text-center py-12">
                    <SearchIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400">Ничего не найдено</h3>
                    <p className="text-slate-500 dark:text-slate-500">Попробуйте изменить поисковый запрос.</p>
                </div>
            );
        }
        
        if (activeFilter === 'FAVORITES') {
            return (
                <div className="text-center py-12">
                    <StarIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400">В избранном пусто</h3>
                    <p className="text-slate-500">Нажмите на звездочку, чтобы добавить заметку сюда.</p>
                </div>
            );
        }

        return (
            <div className="text-center py-12">
                <PencilIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400">Заметок пока нет</h3>
                <p className="text-slate-500">Нажмите на "+", чтобы создать первую заметку.</p>
            </div>
        );
    };

    return (
        <div className={isSelectionMode ? 'pb-24' : ''}>
            <header className="relative flex justify-between items-center py-4 mb-4 border-b border-slate-200 dark:border-slate-700">
                <h1 className="text-2xl sm:text-3xl font-bold text-cyan-600 dark:text-cyan-400 truncate pr-2">Умный Блокнот</h1>
                <div className="flex items-center space-x-1 sm:space-x-2">
                     <button onClick={onOpenSettingsModal} className="p-2 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors" title="Настройки">
                        <Cog6ToothIcon className="w-6 h-6" />
                    </button>
                    <button onClick={() => onNavigate('TRASH')} className="relative p-2 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors" title="Корзина">
                        <TrashIcon className="w-6 h-6" />
                        {trashedCount > 0 && (
                            <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs font-bold ring-2 ring-white dark:ring-slate-900">{trashedCount}</span>
                        )}
                    </button>
                    <button onClick={onToggleSelectionMode} className={`p-2 rounded-md transition-colors ${isSelectionMode ? 'bg-cyan-600 text-white' : 'text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`} title={isSelectionMode ? "Отменить выбор" : "Выбрать заметки"}>
                        <ClipboardDocumentCheckIcon className="w-6 h-6" />
                    </button>
                    <ActionsDropdown
                        onOpenCategoryModal={onOpenCategoryModal}
                        onOpenTemplateModal={onOpenTemplateModal}
                        onImport={onImport}
                        onExport={onExport}
                        onDeleteAll={onDeleteAll}
                    />
                </div>
            </header>
            
            <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400">
                  <SearchIcon className="w-5 h-5" />
                </span>
                <input
                  type="search"
                  placeholder="Поиск по названию или тексту..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-full py-2 pr-4 pl-11 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                />
            </div>

            <div className="relative flex flex-wrap gap-2 justify-between items-center mb-6">
                <div className="flex space-x-2">
                    <button onClick={() => setActiveFilter('ALL')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeFilter === 'ALL' ? 'bg-cyan-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>Все заметки</button>
                    <button onClick={() => setActiveFilter('FAVORITES')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeFilter === 'FAVORITES' ? 'bg-cyan-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>Избранное</button>
                </div>
                 {activeFilter === 'ALL' && <SortDropdown value={sortOrder} onChange={onSortChange} />}
            </div>
            
            <main>
                {renderContent()}
            </main>
        </div>
    );
};

interface TrashViewProps {
    notes: Note[];
    onRestore: (id: string) => void;
    onDelete: (id: string) => void;
    onEmptyTrash: () => void;
    onNavigate: (view: View) => void;
    isSelectionMode: boolean;
    selectedNoteIds: string[];
    onToggleSelectionMode: () => void;
    onSelectNote: (id: string) => void;
    onDeleteSelected: () => void;
}

const TrashView: React.FC<TrashViewProps> = ({ notes, onRestore, onDelete, onEmptyTrash, onNavigate, isSelectionMode, selectedNoteIds, onToggleSelectionMode, onSelectNote, onDeleteSelected }) => {
    return (
        <div className={isSelectionMode ? 'pb-24' : ''}>
            <header className="flex justify-between items-center py-4 mb-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center">
                    <button onClick={() => onNavigate('LIST')} className="p-2 mr-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <h1 className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">Корзина</h1>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={onToggleSelectionMode} className={`p-2 rounded-md transition-colors ${isSelectionMode ? 'bg-cyan-600 text-white' : 'text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`} title={isSelectionMode ? "Отменить выбор" : "Выбрать заметки"}>
                        <ClipboardDocumentCheckIcon className="w-6 h-6" />
                    </button>
                     <button onClick={onEmptyTrash} disabled={notes.length === 0} className="p-2 text-slate-500 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed" title="Очистить корзину">
                        <ArchiveBoxXMarkIcon className="w-6 h-6" />
                    </button>
                </div>
            </header>
            
            <main>
                {notes.length > 0 ? (
                    <div className="space-y-4">
                        {notes.map(note => {
                            const isSelected = selectedNoteIds.includes(note.id);
                            return (
                                <div 
                                    key={note.id} 
                                    className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex justify-between items-center shadow-md transition-all ${isSelectionMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-cyan-500 bg-cyan-50 dark:bg-slate-700' : ''}`}
                                    onClick={() => isSelectionMode && onSelectNote(note.id)}
                                >
                                    <div className="truncate">
                                        <h3 className="font-bold truncate">{note.title}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Удалено: {new Date(note.deletedAt!).toLocaleString()}</p>
                                    </div>
                                    {!isSelectionMode && (
                                        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                                            <button onClick={() => onRestore(note.id)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-green-500 dark:hover:text-green-400 transition-colors" title="Восстановить">
                                                <ArrowUturnLeftIcon className="w-5 h-5"/>
                                            </button>
                                            <button onClick={() => onDelete(note.id)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Удалить навсегда">
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    )}
                                    {isSelectionMode && (
                                        <div className="text-cyan-400 pointer-events-none">
                                            <CheckCircleIcon className="w-6 h-6" filled={isSelected} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <TrashIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400">Корзина пуста</h3>
                        <p className="text-slate-500">Удаленные заметки будут отображаться здесь.</p>
                    </div>
                )}
            </main>
        </div>
    );
};


const SortDropdown: React.FC<{ value: SortOrder, onChange: (order: SortOrder) => void }> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const options: { value: SortOrder, label: string }[] = [
        { value: 'updatedAt_desc', label: 'Сначала новые обновленные' },
        { value: 'updatedAt_asc', label: 'Сначала старые обновленные' },
        { value: 'createdAt_desc', label: 'Сначала новые созданные' },
        { value: 'createdAt_asc', label: 'Сначала старые созданные' },
        { value: 'title_asc', label: 'По названию (А-Я)' },
        { value: 'title_desc', label: 'По названию (Я-А)' },
    ];
    const selectedLabel = options.find(opt => opt.value === value)?.label;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="relative inline-block text-left">
            <div>
                <button
                    type="button"
                    className="inline-flex justify-center w-full rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-cyan-500"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {selectedLabel}
                    <ChevronUpDownIcon className="-mr-1 ml-2 h-5 w-5" />
                </button>
            </div>
            {isOpen && (
                <div
                  className="origin-top-left sm:origin-top-right absolute left-0 sm:left-auto sm:right-0 mt-2 w-52 sm:w-56 rounded-md shadow-lg bg-white dark:bg-slate-700 ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        {options.map(option => (
                             <a
                                key={option.value}
                                href="#"
                                className={`block px-4 py-2 text-sm ${value === option.value ? 'bg-cyan-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                            >
                                {option.label}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


interface NoteCardProps {
    note: Note;
    categories: Category[];
    onEdit: (note: Note) => void;
    onDelete: (id: string) => void;
    onToggleFavorite: (id: string) => void;
    onTogglePin: (id: string) => void;
    onChangeCategory: (noteId: string, categoryId: string | null) => void;
    isSelectionMode: boolean;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onToggleChecklistItem: (noteId: string, itemIndex: number) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, categories, onEdit, onDelete, onToggleFavorite, onTogglePin, onChangeCategory, isSelectionMode, isSelected, onSelect, onToggleChecklistItem }) => {

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;

        // If a checkbox was clicked, handle the toggle and stop further actions.
        if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
            e.preventDefault(); // Take control of the click to prevent race conditions
            const taskListItem = target.closest('li.task-list-item');
            if (taskListItem) {
                const itemIndexStr = taskListItem.getAttribute('data-item-index');
                if (itemIndexStr !== null) {
                    const itemIndex = parseInt(itemIndexStr, 10);
                    onToggleChecklistItem(note.id, itemIndex);
                }
            }
            return;
        }
        
        // Ignore clicks on other interactive elements to prevent opening the editor.
        if (target.closest('button') || target.closest('select')) {
            return;
        }

        // If not an interactive element, proceed with the default card action.
        if (isSelectionMode) {
            onSelect(note.id);
        } else {
            onEdit(note);
        }
    };
    
    const colorClassMap: { [key: string]: string } = {
        red: 'bg-red-500',
        yellow: 'bg-yellow-500',
        green: 'bg-green-500',
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
    };
    
    const colorStripeClass = note.color && colorClassMap[note.color] ? colorClassMap[note.color] : 'bg-transparent';

    return (
        <div 
            className={`bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-none border border-slate-200 dark:border-slate-700 transition-all duration-200 relative overflow-hidden group ${!isSelectionMode ? 'hover:shadow-cyan-400/10 dark:hover:shadow-cyan-500/20 hover:-translate-y-1 cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-cyan-500' : ''}`}
            onClick={handleCardClick}
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorStripeClass}`}></div>
            
            <div className={`pl-5 pr-4 py-4 flex flex-col justify-between h-full ${isSelected ? 'bg-cyan-50 dark:bg-slate-700/50' : ''}`}>
                <div>
                    {isSelectionMode && (
                        <div className="absolute top-3 right-3 text-cyan-500 dark:text-cyan-400 z-10 pointer-events-none">
                            <CheckCircleIcon className="w-6 h-6" filled={isSelected} />
                        </div>
                    )}
                     {note.isPinned && !isSelectionMode && (
                        <div className="absolute top-3 right-3 text-slate-400 dark:text-slate-500 z-10">
                            <PinIcon className="w-5 h-5" filled={true}/>
                        </div>
                    )}
                    <div className={`${isSelectionMode ? 'pointer-events-none' : ''}`}>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate mb-2 pr-8">{note.title}</h3>
                        <div 
                          className="text-slate-600 dark:text-slate-400 text-sm mb-4 break-words markdown-content"
                          dangerouslySetInnerHTML={parseMarkdownWithChecklists(note.content, note.id)}
                        />
                    </div>
                </div>
                <div>
                    {note.reminder?.nextDueDate && (
                       <div className="flex items-center text-xs text-amber-600 dark:text-amber-400 mt-2 mb-2 p-2 bg-amber-100/50 dark:bg-slate-700/50 rounded-md">
                            <BellIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span>{new Date(note.reminder.nextDueDate).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    )}
                    {note.isFavorite && (
                        <select
                            value={note.categoryId || ''}
                            onChange={(e) => onChangeCategory(note.id, e.target.value || null)}
                            className="w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white text-sm rounded-md px-2 py-1 mb-3 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            onClick={(e) => e.stopPropagation()}
                            disabled={isSelectionMode}
                        >
                            <option value="">Без категории</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    )}
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-slate-500">{new Date(note.updatedAt).toLocaleString()}</p>
                        {!isSelectionMode && (
                            <div className="flex items-center space-x-2">
                                <button onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }} className={`p-1 rounded-full transition-colors ${note.isPinned ? 'text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300' : 'text-slate-400 dark:text-slate-500 hover:text-cyan-500 dark:hover:text-cyan-400'}`}>
                                    <PinIcon filled={note.isPinned} className="w-5 h-5"/>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(note.id); }} className={`p-1 rounded-full transition-colors ${note.isFavorite ? 'text-yellow-500 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300' : 'text-slate-400 dark:text-slate-500 hover:text-yellow-500 dark:hover:text-yellow-400'}`}>
                                    <StarIcon filled={note.isFavorite} className="w-5 h-5"/>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onEdit(note); }} className="p-1 rounded-full text-slate-400 dark:text-slate-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
                                    <PencilIcon className="w-5 h-5"/>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className="p-1 rounded-full text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


interface NoteEditorProps {
  note: Note | null;
  categories: Category[];
  templates: Template[];
  onSave: (noteData: { title: string; content: string; isFavorite: boolean; categoryId: string | null, reminder: Reminder | null, journal: JournalEntry[], color: string | null }) => void;
  onCancel: () => void;
  theme: Theme;
  showToast: (message: string, type?: ToastMessage['type']) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, categories, templates, onSave, onCancel, theme, showToast }) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [isFavorite, setIsFavorite] = useState(note?.isFavorite || false);
  const [categoryId, setCategoryId] = useState(note?.categoryId || null);
  const [reminder, setReminder] = useState<Reminder | null>(note?.reminder || null);
  const [journal, setJournal] = useState<JournalEntry[]>(note?.journal || []);
  const [color, setColor] = useState<string | null>(note?.color || null);
  
  const [showPreview, setShowPreview] = useState(false);
  const [isTemplateSelectorOpen, setTemplateSelectorOpen] = useState(false);
  const [isReminderModalOpen, setReminderModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isExportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if(!isFavorite) {
      setCategoryId(null);
    }
  }, [isFavorite])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node) && !exportButtonRef.current?.contains(event.target as Node)) {
            setExportMenuOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSaveClick = () => {
    if(title.trim() === '') {
      showToast('Заголовок не может быть пустым.', 'error');
      return;
    }
    onSave({ title, content, isFavorite, categoryId, reminder, journal, color });
  };
  
  const handleApplyTemplate = (template: Template) => {
    setTitle(template.title);
    setContent(template.content);
    setTemplateSelectorOpen(false);
  };

  const addJournalEntry = () => {
    const newEntry: JournalEntry = {
        id: Date.now().toString(),
        createdAt: Date.now(),
        content: ''
    };
    setJournal([newEntry, ...journal]);
  };

  const updateJournalEntry = (id: string, newContent: string) => {
    setJournal(journal.map(entry => entry.id === id ? {...entry, content: newContent} : entry));
  };

  const deleteJournalEntry = (id: string) => {
    setJournal(journal.filter(entry => entry.id !== id));
  };


  const handleExportNote = async (format: 'md' | 'html' | 'txt' | 'pdf') => {
    const sanitizedTitle = (title.trim() || 'Без названия').replace(/[\\/:"*?<>|]/g, '_');
    
    if (format === 'pdf') {
        showToast('Генерация PDF...', 'info');
        try {
            const { jsPDF } = window.jspdf;
            const filename = `${sanitizedTitle}.pdf`;

            const bodyHtml = window.marked.parse(content, { gfm: true });
            const sanitizedBody = window.DOMPurify.sanitize(bodyHtml);
            const isDark = theme === 'dark';
            
            const colorHexMap: { [key: string]: string } = {
                red: '#ef4444', yellow: '#eab308', green: '#22c55e',
                blue: '#3b82f6', purple: '#8b5cf6',
            };
            const noteBorderColor = color ? colorHexMap[color] : 'transparent';

            const htmlStyles = `
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 0; margin: 0; background-color: ${isDark ? '#0f172a' : '#ffffff'}; color: ${isDark ? '#e2e8f0' : '#1e293b'}; -webkit-font-smoothing: antialiased; }
              .pdf-container { padding: 20px; width: 800px; box-sizing: border-box; }
              .markdown-content { max-width: 100%; }
              .markdown-content h1, .markdown-content h2, .markdown-content h3 { color: ${isDark ? '#e2e8f0' : '#1e293b'}; font-weight: 600; margin-bottom: 0.5em; margin-top: 1em; }
              .markdown-content h1 { font-size: 1.5em; border-bottom: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; padding-bottom: .3em; }
              .markdown-content h2 { font-size: 1.25em; border-bottom: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; padding-bottom: .3em; }
              .markdown-content h3 { font-size: 1.1em; }
              .markdown-content p { margin-bottom: 1em; }
              .markdown-content ul, .markdown-content ol { margin-left: 1.5em; margin-bottom: 1em; padding-left: 1.5em; }
              .markdown-content li { margin-bottom: 0.4em; }
              .markdown-content a { color: ${isDark ? '#22d3ee' : '#0891b2'}; text-decoration: none; }
              .markdown-content a:hover { text-decoration: underline; }
              .markdown-content blockquote { border-left: 4px solid ${isDark ? '#475569' : '#cbd5e1'}; padding-left: 1em; margin-left: 0; font-style: italic; color: ${isDark ? '#94a3b8' : '#475569'}; }
              .markdown-content code { background-color: ${isDark ? '#1e293b' : '#f1f5f9'}; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; }
              .markdown-content pre { background-color: ${isDark ? '#1e293b' : '#f1f5f9'}; padding: 1em; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
              .markdown-content pre code { padding: 0; background-color: transparent; }
              .markdown-content table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
              .markdown-content th, .markdown-content td { border: 1px solid ${isDark ? '#334155' : '#cbd5e1'}; padding: 8px; }
              .markdown-content th { background-color: ${isDark ? '#1e293b' : '#f1f5f9'}; }
              .markdown-content ul li.task-list-item { list-style-type: none; margin-left: -1.5em; }
              .markdown-content li.task-list-item { display: flex; align-items: center; }
              .markdown-content li.task-list-item input[type="checkbox"] { margin-right: 0.75em; }
              .markdown-content li.task-list-item.done { color: ${isDark ? '#64748b' : '#64748b'}; text-decoration: line-through; }
            `;

            const printElement = document.createElement('div');
            printElement.style.position = 'absolute';
            printElement.style.left = '-9999px';
            
            printElement.innerHTML = `
              <style>${htmlStyles}</style>
              <body class="${isDark ? 'dark' : ''}">
                <div class="pdf-container" style="border-left: 5px solid ${noteBorderColor};">
                    <div class="markdown-content">
                      <h1>${title}</h1>
                      ${sanitizedBody}
                    </div>
                </div>
              </body>
            `;
            document.body.appendChild(printElement);
            
            const canvas = await window.html2canvas(printElement.querySelector('.pdf-container'), {
                scale: 2,
                useCORS: true,
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
            });
            
            document.body.removeChild(printElement);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();

            while (heightLeft > 0) {
                position -= pdf.internal.pageSize.getHeight();
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();
            }
            
            pdf.save(filename);
            showToast(`Заметка экспортирована как .pdf`, 'success');
        } catch (error) {
            console.error('PDF Export failed:', error);
            showToast('Ошибка при экспорте в PDF.', 'error');
        }
        setExportMenuOpen(false);
        return;
    }
    
    let contentToExport = '';
    let mimeType = 'text/plain;charset=utf-8;';
    const filename = `${sanitizedTitle}.${format}`;

    switch (format) {
        case 'md':
            contentToExport = content;
            mimeType = 'text/markdown;charset=utf-8;';
            break;
        case 'txt':
            const htmlFromMd = window.marked.parse(content);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = window.DOMPurify.sanitize(htmlFromMd);
            contentToExport = tempDiv.textContent || '';
            break;
        case 'html':
            const bodyHtml = window.marked.parse(content, { gfm: true });
            const sanitizedBody = window.DOMPurify.sanitize(bodyHtml);
            const isDark = theme === 'dark';

            const htmlStyles = `
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 2em; margin: 0; background-color: ${isDark ? '#0f172a' : '#ffffff'}; color: ${isDark ? '#e2e8f0' : '#1e293b'}; }
              .markdown-content { max-width: 720px; margin: 0 auto; }
              .markdown-content h1, .markdown-content h2, .markdown-content h3 { color: ${isDark ? '#e2e8f0' : '#1e293b'}; font-weight: 600; margin-bottom: 0.5em; margin-top: 1em; }
              .markdown-content h1 { font-size: 1.5em; border-bottom: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; padding-bottom: .3em; }
              .markdown-content h2 { font-size: 1.25em; border-bottom: 1px solid ${isDark ? '#334155' : '#e2e8f0'}; padding-bottom: .3em; }
              .markdown-content h3 { font-size: 1.1em; }
              .markdown-content p { margin-bottom: 1em; }
              .markdown-content ul, .markdown-content ol { margin-left: 1.5em; margin-bottom: 1em; padding-left: 1.5em; }
              .markdown-content li { margin-bottom: 0.4em; }
              .markdown-content a { color: ${isDark ? '#22d3ee' : '#0891b2'}; text-decoration: none; }
              .markdown-content a:hover { text-decoration: underline; }
              .markdown-content blockquote { border-left: 4px solid ${isDark ? '#475569' : '#cbd5e1'}; padding-left: 1em; margin-left: 0; font-style: italic; color: ${isDark ? '#94a3b8' : '#475569'}; }
              .markdown-content code { background-color: ${isDark ? '#1e293b' : '#f1f5f9'}; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; }
              .markdown-content pre { background-color: ${isDark ? '#1e293b' : '#f1f5f9'}; padding: 1em; border-radius: 6px; overflow-x: auto; }
              .markdown-content pre code { padding: 0; background-color: transparent; }
              .markdown-content table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
              .markdown-content th, .markdown-content td { border: 1px solid ${isDark ? '#334155' : '#cbd5e1'}; padding: 8px; }
              .markdown-content th { background-color: ${isDark ? '#1e293b' : '#f1f5f9'}; }
              .markdown-content ul li.task-list-item { list-style-type: none; margin-left: -1.5em; }
              .markdown-content li.task-list-item { display: flex; align-items: center; }
              .markdown-content li.task-list-item input[type="checkbox"] { margin-right: 0.75em; }
              .markdown-content li.task-list-item.done { color: ${isDark ? '#64748b' : '#64748b'}; text-decoration: line-through; }
            `;
            
            contentToExport = `<!DOCTYPE html>
              <html lang="ru">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${sanitizedTitle}</title>
                <style>${htmlStyles}</style>
              </head>
              <body class="${isDark ? 'dark' : ''}">
                <div class="markdown-content">
                  <h1>${title}</h1>
                  ${sanitizedBody}
                </div>
              </body>
              </html>
            `;
            mimeType = 'text/html;charset=utf-8;';
            break;
    }

    const blob = new Blob([contentToExport], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportMenuOpen(false);
    showToast(`Заметка экспортирована как .${format}`, 'success');
  };
  
  const handleShareNote = async () => {
    const noteData = {
        title: title.trim(),
        content: content,
        color: color,
    };
    const jsonString = JSON.stringify(noteData);
    const encodedData = btoa(unescape(encodeURIComponent(jsonString)));
    const shareUrl = `${window.location.origin}${window.location.pathname}#/import-note/${encodeURIComponent(encodedData)}`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: `Заметка: ${noteData.title}`,
                text: `Посмотри мою заметку: "${noteData.title}"`,
                url: shareUrl,
            });
            showToast('Заметка отправлена!', 'success');
        } catch (error) {
            console.error('Error sharing:', error);
            // Don't show error toast if user cancels share dialog
        }
    } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('Ссылка на заметку скопирована в буфер обмена!', 'info');
        }, () => {
            showToast('Не удалось скопировать ссылку.', 'error');
        });
    }
  };

  const applyFormat = (type: FormatType, prefix: string, suffix: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);

        let newContent = '';
        let newSelectionStart = start;
        let newSelectionEnd = end;

        if (type === 'WRAP') {
            const before = text.substring(0, start);
            const after = text.substring(end);
            newContent = `${before}${prefix}${selectedText}${suffix}${after}`;
            
            if (selectedText) {
                newSelectionStart = start + prefix.length;
                newSelectionEnd = end + prefix.length;
            } else {
                newSelectionStart = newSelectionEnd = start + prefix.length;
            }

        } else if (type === 'LINE_PREFIX') {
            let lineStart = start;
            while(lineStart > 0 && text[lineStart - 1] !== '\n') {
                lineStart--;
            }
            
            const before = text.substring(0, lineStart);
            const linesToModify = text.substring(lineStart, end);
            const after = text.substring(end);

            const modifiedLines = linesToModify.split('\n').map(line => `${prefix}${line}`).join('\n');
            const prefixCount = linesToModify.split('\n').length;

            newContent = before + modifiedLines + after;
            
            newSelectionStart = start + prefix.length;
            newSelectionEnd = end + (prefix.length * prefixCount);
        }

        setContent(newContent);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newSelectionStart, newSelectionEnd);
        }, 0);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.ctrlKey || e.metaKey) {
            let applied = true;
            switch (e.key) {
                case 'b':
                    applyFormat('WRAP', '**', '**');
                    break;
                case 'i':
                    applyFormat('WRAP', '_', '_');
                    break;
                case 'h':
                     applyFormat('LINE_PREFIX', '## ');
                     break;
                case 'k':
                     applyFormat('WRAP', '[', '](url)');
                     break;
                default:
                    applied = false;
            }
            if (applied) {
                e.preventDefault();
            }
        }
    }


  return (
    <div className="animate-fade-in">
        <header className="relative flex items-center justify-between py-4 mb-6 flex-wrap gap-2">
            <div className='flex items-center'>
                <button onClick={onCancel} className="p-2 mr-2 sm:mr-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ArrowLeftIcon className="w-6 h-6"/>
                </button>
                <h2 className="text-xl sm:text-3xl font-bold text-cyan-600 dark:text-cyan-400 truncate pr-2">
                    {note ? 'Редактировать заметку' : 'Новая заметка'}
                </h2>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
                 <button onClick={() => setShowPreview(!showPreview)} className={`p-2 rounded-md transition-colors ${showPreview ? 'bg-cyan-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`} title={showPreview ? "Редактировать" : "Предпросмотр"}>
                    {showPreview ? <PencilIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                </button>
                <div ref={exportMenuRef} className="relative">
                     <button ref={exportButtonRef} onClick={() => setExportMenuOpen(prev => !prev)} className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Экспорт">
                        <ArrowDownTrayIcon className="w-5 h-5"/>
                    </button>
                     {isExportMenuOpen && (
                        <div className="origin-top-left sm:origin-top-right absolute left-0 sm:left-auto sm:right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-slate-700 ring-1 ring-black ring-opacity-5 z-30">
                            <div className="py-1">
                                <a href="#" onClick={(e) => { e.preventDefault(); handleExportNote('pdf'); }} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">как PDF (.pdf)</a>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleExportNote('md'); }} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">как Markdown (.md)</a>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleExportNote('html'); }} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">как HTML (.html)</a>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleExportNote('txt'); }} className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">как Текст (.txt)</a>
                            </div>
                        </div>
                    )}
                </div>
                <button onClick={handleShareNote} className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Поделиться">
                    <ShareIcon className="w-5 h-5"/>
                </button>
                <button onClick={handleSaveClick} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors flex items-center space-x-2">
                    <CheckIcon className="w-5 h-5"/>
                    <span>Сохранить</span>
                </button>
            </div>
        </header>

      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <input
            type="text"
            placeholder="Заголовок..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-2xl font-bold bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
        </div>
        
        {!showPreview && <EditorToolbar onFormat={applyFormat} />}
        
        <div className="p-4">
          {showPreview ? (
              <div
                className="prose dark:prose-invert max-w-none markdown-content"
                dangerouslySetInnerHTML={parseMarkdownWithChecklists(content, note?.id || 'new-note-preview')}
              />
          ) : (
            <textarea
              ref={textareaRef}
              placeholder="Начните писать..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-96 bg-transparent text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-y"
            />
          )}
        </div>
        <footer className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg flex flex-wrap gap-4 justify-between items-center">
            <div className="flex items-center space-x-2">
                 <button onClick={() => setTemplateSelectorOpen(true)} className="flex items-center space-x-2 text-sm px-3 py-2 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold transition-colors" title="Применить шаблон">
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    <span>Шаблон</span>
                </button>
                <button onClick={() => setReminderModalOpen(true)} className={`flex items-center space-x-2 text-sm px-3 py-2 rounded-md font-semibold transition-colors ${reminder ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'}`} title="Настроить напоминание">
                    <BellIcon className="w-4 h-4" filled={!!reminder} />
                    <span>Напоминание</span>
                </button>
            </div>
            <div className="flex items-center space-x-2">
                 <ColorPicker selectedColor={color} onSelectColor={setColor} />
                 <button onClick={() => setIsFavorite(!isFavorite)} className={`flex items-center space-x-2 px-3 py-2 rounded-md font-semibold text-sm transition-colors ${isFavorite ? 'bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-400/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                    <StarIcon filled={isFavorite} className="w-4 h-4"/>
                    <span>{isFavorite ? 'В избранном' : 'В избранное'}</span>
                </button>
            </div>
        </footer>
        {isFavorite && (
             <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <label htmlFor="category-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Категория</label>
                <select
                    id="category-select"
                    value={categoryId || ''}
                    onChange={(e) => setCategoryId(e.target.value || null)}
                    className="w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                    <option value="">Без категории</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
            </div>
        )}
      </div>

       <div className="mt-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Журнал записей</h3>
          <button onClick={addJournalEntry} className="flex items-center space-x-2 text-sm px-3 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors">
            <PlusIcon className="w-4 h-4" />
            <span>Добавить запись</span>
          </button>
        </div>
         <div className="space-y-4">
            {journal.length > 0 ? journal.map(entry => (
                <div key={entry.id} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{new Date(entry.createdAt).toLocaleString('ru')}</p>
                        <button onClick={() => deleteJournalEntry(entry.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <textarea
                        value={entry.content}
                        onChange={(e) => updateJournalEntry(entry.id, e.target.value)}
                        placeholder="Комментарий..."
                        className="w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y text-sm"
                        rows={2}
                    />
                </div>
            )) : (
                <div className="text-center py-6 bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400">В журнале пока нет записей.</p>
                </div>
            )}
        </div>
       </div>

       <Modal title="Применить шаблон" isOpen={isTemplateSelectorOpen} onClose={() => setTemplateSelectorOpen(false)}>
            <div className="space-y-2 max-h-80 overflow-y-auto">
                {templates.length > 0 ? templates.map(template => (
                    <div 
                        key={template.id}
                        onClick={() => handleApplyTemplate(template)}
                        className="p-3 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 cursor-pointer transition-colors"
                    >
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">{template.title}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{template.content}</p>
                    </div>
                )) : (
                     <p className="text-slate-500 dark:text-slate-400 text-center py-4">Шаблонов пока нет.</p>
                )}
            </div>
       </Modal>
       <ReminderModal
            isOpen={isReminderModalOpen}
            onClose={() => setReminderModalOpen(false)}
            onSave={setReminder}
            initialReminder={reminder}
            showToast={showToast}
       />
    </div>
  );
};

// Fix: Add ReminderModal component definition
interface ReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (reminder: Reminder | null) => void;
    initialReminder: Reminder | null;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose, onSave, initialReminder, showToast }) => {
    const [type, setType] = useState<Reminder['type']>('daily');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [times, setTimes] = useState<string[]>(['09:00']);
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);

    useEffect(() => {
        if (initialReminder) {
            setType(initialReminder.type);
            setStartDate(new Date(initialReminder.startDate).toISOString().split('T')[0]);
            setEndDate(initialReminder.endDate ? new Date(initialReminder.endDate).toISOString().split('T')[0] : '');
            setTimes(initialReminder.times.length > 0 ? initialReminder.times : ['09:00']);
            setDaysOfWeek(initialReminder.daysOfWeek || []);
        } else {
            // Reset to default when no reminder is present or it's cleared
            setType('daily');
            setStartDate(new Date().toISOString().split('T')[0]);
            setEndDate('');
            setTimes(['09:00']);
            setDaysOfWeek([]);
        }
    }, [initialReminder, isOpen]); // Rerun effect when modal opens

    const handleAddTime = () => {
        if (times.length < 5) {
            setTimes([...times, '12:00']);
        } else {
            showToast('Можно добавить не более 5 временных отметок.', 'info');
        }
    };

    const handleRemoveTime = (index: number) => {
        if (times.length > 1) {
            setTimes(times.filter((_, i) => i !== index));
        } else {
            showToast('Должна быть хотя бы одна временная отметка.', 'error');
        }
    };

    const handleTimeChange = (index: number, value: string) => {
        const newTimes = [...times];
        newTimes[index] = value;
        setTimes(newTimes);
    };

    const handleDayToggle = (day: number) => {
        setDaysOfWeek(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSave = () => {
        if (!startDate) {
            showToast('Необходимо указать дату начала.', 'error');
            return;
        }
        if (times.some(t => !t)) {
            showToast('Все временные отметки должны быть заполнены.', 'error');
            return;
        }
        if (type === 'weekly' && daysOfWeek.length === 0) {
            showToast('Для еженедельного напоминания выберите хотя бы один день.', 'error');
            return;
        }

        const startDateTime = new Date(startDate).setHours(0,0,0,0);
        let endDateTime = null;
        if (endDate) {
            endDateTime = new Date(endDate).setHours(23,59,59,999);
        }

        if(endDateTime && endDateTime < startDateTime) {
            showToast('Дата окончания не может быть раньше даты начала.', 'error');
            return;
        }

        const newReminder: Reminder = {
            type,
            startDate: startDateTime,
            endDate: endDateTime,
            times: times.filter(t => t), // filter out empty strings
            daysOfWeek: type === 'weekly' ? daysOfWeek.sort() : undefined,
        };

        onSave(newReminder);
        onClose();
        showToast('Напоминание сохранено!', 'success');
    };

    const handleRemoveReminder = () => {
        onSave(null);
        onClose();
        showToast('Напоминание удалено.', 'info');
    };

    const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

    return (
        <Modal title="Настроить напоминание" isOpen={isOpen} onClose={onClose}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Тип повторения</label>
                    <select value={type} onChange={e => setType(e.target.value as Reminder['type'])} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                        <option value="single">Один раз</option>
                        <option value="daily">Ежедневно</option>
                        <option value="weekly">Еженедельно</option>
                        <option value="monthly">Ежемесячно</option>
                    </select>
                </div>

                <div className="flex space-x-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {type === 'single' ? 'Дата' : 'Дата начала'}
                        </label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    </div>
                    {type !== 'single' && (
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Дата окончания (необязательно)</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        </div>
                    )}
                </div>

                {type === 'weekly' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Дни недели</label>
                        <div className="flex justify-between space-x-1">
                            {weekDays.map((day, index) => (
                                <button
                                    key={day}
                                    onClick={() => handleDayToggle(index)}
                                    className={`w-10 h-10 rounded-full text-sm font-semibold transition-colors ${daysOfWeek.includes(index) ? 'bg-cyan-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Время</label>
                     <div className="space-y-2">
                        {times.map((time, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <input
                                    type="time"
                                    value={time}
                                    onChange={e => handleTimeChange(index, e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                                <button
                                    onClick={() => handleRemoveTime(index)}
                                    className="p-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                    aria-label="Remove time"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                     </div>
                     <button
                        onClick={handleAddTime}
                        className="mt-2 flex items-center space-x-2 text-sm text-cyan-600 dark:text-cyan-400 font-semibold hover:text-cyan-700 dark:hover:text-cyan-300"
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span>Добавить время</span>
                    </button>
                </div>

                <div className="flex justify-between items-center pt-4">
                    <div>
                         {initialReminder && (
                            <button
                                onClick={handleRemoveReminder}
                                className="px-4 py-2 rounded-md bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900 text-red-700 dark:text-red-300 font-semibold transition-colors text-sm"
                            >
                                Удалить напоминание
                            </button>
                        )}
                    </div>
                    <div className="flex space-x-2">
                         <button onClick={onClose} className="px-4 py-2 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold transition-colors">
                            Отмена
                        </button>
                        <button onClick={handleSave} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors">
                            Сохранить
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const ColorPicker: React.FC<{selectedColor: string | null, onSelectColor: (color: string | null) => void}> = ({ selectedColor, onSelectColor}) => {
    const colors = ['red', 'yellow', 'green', 'blue', 'purple'];
    return (
        <div className="flex items-center space-x-2 p-1 bg-slate-200 dark:bg-slate-700 rounded-full">
            <button onClick={() => onSelectColor(null)} className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${!selectedColor ? 'ring-2 ring-cyan-500' : ''}`}>
                <div className="w-5 h-5 rounded-full bg-slate-400 dark:bg-slate-500 border-2 border-white dark:border-slate-700" style={{backgroundImage: `linear-gradient(to top right, #ef4444 49%, transparent 50%), linear-gradient(to top left, #22c55e 49%, transparent 50%)`}}></div>
            </button>
            {colors.map(color => (
                <button
                    key={color}
                    onClick={() => onSelectColor(color)}
                    className={`w-6 h-6 rounded-full bg-${color}-500 transition-all ${selectedColor === color ? 'ring-2 ring-cyan-500' : ''}`}
                    aria-label={`Select ${color} color`}
                />
            ))}
        </div>
    );
};


const LockScreen: React.FC<{pinHash: string, onUnlock: () => void, hashFn: (pin: string) => Promise<string>}> = ({ pinHash, onUnlock, hashFn }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isChecking, setIsChecking] = useState(false);

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPin = e.target.value.replace(/\D/g, ''); // Only allow digits
        setPin(newPin);
        if (error) setError('');
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length < 4 || isChecking) return;

        setIsChecking(true);
        setError('');
        const currentHash = await hashFn(pin);
        if (currentHash === pinHash) {
            onUnlock();
        } else {
            setError('Неверный PIN-код');
            setPin('');
        }
        setIsChecking(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-100 dark:bg-slate-900 flex items-center justify-center z-50">
            <div className="w-full max-w-xs p-8 bg-white dark:bg-slate-800 rounded-lg shadow-2xl text-center">
                <LockClosedIcon className="w-12 h-12 mx-auto text-cyan-500 dark:text-cyan-400 mb-4"/>
                <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-slate-200">Введите PIN-код</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Это приложение защищено.</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        maxLength={4}
                        value={pin}
                        onChange={handlePinChange}
                        className={`w-40 text-center tracking-[1em] text-3xl font-mono bg-slate-100 dark:bg-slate-700 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${error ? 'ring-2 ring-red-500' : ''}`}
                        autoFocus
                    />
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    <button type="submit" disabled={pin.length < 4 || isChecking} className="w-full mt-6 px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors disabled:bg-cyan-400 dark:disabled:bg-cyan-800 disabled:cursor-not-allowed">
                        {isChecking ? 'Проверка...' : 'Разблокировать'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const SettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    pinHash: string | null;
    setPinHash: (hash: string | null) => void;
    hashFn: (pin: string) => Promise<string>;
    showToast: (message: string, type?: ToastMessage['type']) => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
}> = ({ isOpen, onClose, pinHash, setPinHash, hashFn, showToast, theme, setTheme }) => {
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    const resetForm = () => {
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
    };

    const handleSetPin = async () => {
        if (newPin.length < 4) {
            showToast('PIN-код должен содержать 4 цифры', 'error');
            return;
        }
        if (newPin !== confirmPin) {
            showToast('PIN-коды не совпадают', 'error');
            return;
        }
        const newHash = await hashFn(newPin);
        setPinHash(newHash);
        showToast('PIN-код успешно установлен!', 'success');
        resetForm();
    };

    const handleChangePin = async () => {
        const currentHash = await hashFn(currentPin);
        if (currentHash !== pinHash) {
            showToast('Текущий PIN-код неверный', 'error');
            return;
        }
        await handleSetPin();
    };
    
    const handleRemovePin = async () => {
        const currentHash = await hashFn(currentPin);
        if (currentHash !== pinHash) {
            showToast('Текущий PIN-код неверный', 'error');
            return;
        }
        setPinHash(null);
        showToast('PIN-код удален', 'info');
        resetForm();
    };

    const handleModalClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal title="Настройки" isOpen={isOpen} onClose={handleModalClose}>
            <div className="space-y-6">
                 <div>
                    <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">Тема оформления</h3>
                    <div className="flex space-x-2 rounded-lg bg-slate-200 dark:bg-slate-700 p-1">
                        <button onClick={() => setTheme('light')} className={`w-full flex items-center justify-center space-x-2 p-2 rounded-md text-sm font-semibold transition-colors ${theme === 'light' ? 'bg-white text-cyan-600 shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}>
                            <SunIcon className="w-5 h-5" />
                            <span>Светлая</span>
                        </button>
                         <button onClick={() => setTheme('dark')} className={`w-full flex items-center justify-center space-x-2 p-2 rounded-md text-sm font-semibold transition-colors ${theme === 'dark' ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}>
                             <MoonIcon className="w-5 h-5" />
                             <span>Темная</span>
                        </button>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-200">Безопасность</h3>
                    <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-700/50 space-y-3">
                        {pinHash ? (
                            <>
                                <input type="password" placeholder="Текущий PIN (4 цифры)" value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))} maxLength={4} className="w-full bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                <input type="password" placeholder="Новый PIN (4 цифры)" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} maxLength={4} className="w-full bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                <input type="password" placeholder="Подтвердите новый PIN" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} maxLength={4} className="w-full bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                <div className="flex space-x-2 pt-2">
                                     <button onClick={handleChangePin} className="flex-1 px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors text-sm">Изменить PIN</button>
                                     <button onClick={handleRemovePin} className="flex-1 px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors text-sm">Удалить PIN</button>
                                </div>
                            </>
                        ) : (
                            <>
                                 <input type="password" placeholder="Новый PIN (4 цифры)" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} maxLength={4} className="w-full bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                <input type="password" placeholder="Подтвердите новый PIN" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} maxLength={4} className="w-full bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                <button onClick={handleSetPin} className="w-full mt-2 px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors">Установить PIN</button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const TemplateManagerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    templates: Template[];
    onSave: (template: {id?: string, title: string, content: string}) => boolean;
    onDelete: (id: string) => void;
}> = ({ isOpen, onClose, templates, onSave, onDelete }) => {
    
    const [editingTemplate, setEditingTemplate] = useState<Template | {title: string, content: string} | null>(null);

    const handleSave = () => {
        if (editingTemplate) {
            const success = onSave(editingTemplate as Template);
            if (success) {
                setEditingTemplate(null);
            }
        }
    };

    if (!isOpen) return null;

    if (editingTemplate) {
        return (
             <Modal title={ (editingTemplate as Template).id ? "Редактировать шаблон" : "Новый шаблон" } isOpen={isOpen} onClose={() => setEditingTemplate(null)}>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Название шаблона"
                        value={editingTemplate.title}
                        onChange={e => setEditingTemplate({...editingTemplate, title: e.target.value})}
                        className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <textarea
                        placeholder="Содержимое шаблона..."
                        value={editingTemplate.content}
                        onChange={e => setEditingTemplate({...editingTemplate, content: e.target.value})}
                         className="w-full h-40 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 rounded-md px-3 py-2 focus:outline-none resize-y focus:ring-2 focus:ring-cyan-500"
                    />
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold transition-colors">Отмена</button>
                        <button onClick={handleSave} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors">Сохранить</button>
                    </div>
                </div>
            </Modal>
        )
    }

    return (
        <Modal title="Управление шаблонами" isOpen={isOpen} onClose={onClose}>
            <div className="space-y-3">
                <button onClick={() => setEditingTemplate({title: '', content: ''})} className="w-full flex items-center justify-center space-x-2 mb-3 px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors">
                    <PlusIcon className="w-5 h-5" />
                    <span>Создать новый шаблон</span>
                </button>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {templates.length > 0 ? templates.map(template => (
                        <div key={template.id} className="p-3 rounded-md bg-slate-100 dark:bg-slate-700">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">{template.title}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{template.content}</p>
                                </div>
                                <div className="flex space-x-1 flex-shrink-0 ml-2">
                                     <button onClick={() => setEditingTemplate(template)} className="p-1 text-slate-500 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
                                        <PencilIcon className="w-5 h-5"/>
                                    </button>
                                     <button onClick={() => onDelete(template.id)} className="p-1 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                         <p className="text-slate-500 dark:text-slate-400 text-center py-4">Шаблонов пока нет.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};


export default App;
