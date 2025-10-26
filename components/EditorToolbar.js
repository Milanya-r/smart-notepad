import React from 'react';
import { BoldIcon, ItalicIcon, HeadingIcon, LinkIcon, CodeBracketIcon, ListBulletIcon, ListOrderedIcon, QuoteIcon, CheckCircleIcon } from './icons.js';

export type FormatType = 'WRAP' | 'LINE_PREFIX';

interface EditorToolbarProps {
    onFormat: (type: FormatType, prefix: string, suffix?: string) => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ onFormat }) => {
    
    const toolbarButtons = [
        { title: 'Жирный (Ctrl+B)', icon: <BoldIcon className="w-5 h-5"/>, action: () => onFormat('WRAP', '**', '**') },
        { title: 'Курсив (Ctrl+I)', icon: <ItalicIcon className="w-5 h-5"/>, action: () => onFormat('WRAP', '_', '_') },
        { title: 'Заголовок (Ctrl+H)', icon: <HeadingIcon className="w-5 h-5"/>, action: () => onFormat('LINE_PREFIX', '## ') },
        { title: 'Ссылка (Ctrl+K)', icon: <LinkIcon className="w-5 h-5"/>, action: () => onFormat('WRAP', '[', '](url)') },
        { title: 'Цитата', icon: <QuoteIcon className="w-5 h-5"/>, action: () => onFormat('LINE_PREFIX', '> ') },
        { title: 'Код', icon: <CodeBracketIcon className="w-5 h-5"/>, action: () => onFormat('WRAP', '`', '`') },
        { title: 'Маркированный список', icon: <ListBulletIcon className="w-5 h-5"/>, action: () => onFormat('LINE_PREFIX', '- ') },
        { title: 'Нумерованный список', icon: <ListOrderedIcon className="w-5 h-5"/>, action: () => onFormat('LINE_PREFIX', '1. ') },
        { title: 'Чек-лист', icon: <CheckCircleIcon className="w-5 h-5"/>, action: () => onFormat('LINE_PREFIX', '- [ ] ') },
    ];
    
    return (
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-2 rounded-t-md border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
            {toolbarButtons.map(({title, icon, action}) => (
                <button
                    key={title}
                    type="button"
                    title={title}
                    onClick={action}
                    className="p-2 rounded flex-shrink-0 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                    {icon}
                </button>
            ))}
        </div>
    );
};

export default EditorToolbar;