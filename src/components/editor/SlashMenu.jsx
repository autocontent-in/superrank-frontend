import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './lib/utils'
import { DEFAULT_BLOCK_MENU_ITEMS } from './lib/editorBlocks'

export const SlashMenu = ({ onSelect, onClose, position, menuItems: menuItemsProp }) => {
    const menuItems = menuItemsProp && menuItemsProp.length > 0 ? menuItemsProp : DEFAULT_BLOCK_MENU_ITEMS
    const [selectedIndex, setSelectedIndex] = useState(0)
    const menuRef = useRef(null)
    const [menuPlacement, setMenuPlacement] = useState('bottom')

    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect()
            if (position.top + rect.height > window.innerHeight) {
                setMenuPlacement('top')
            } else {
                setMenuPlacement('bottom')
            }
        }
    }, [position])

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex(prev => (prev + 1) % menuItems.length)
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(prev => (prev - 1 + menuItems.length) % menuItems.length)
            } else if (e.key === 'Enter') {
                e.preventDefault()
                onSelect(menuItems[selectedIndex].id)
            } else if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
            }
        }

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('mousedown', handleClickOutside)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('mousedown', handleClickOutside)
        }
    }, [selectedIndex, onSelect, onClose])

    const topOffset = menuPlacement === 'bottom'
        ? position.top + 24
        : position.top - (menuRef.current?.offsetHeight || 200) - 8

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-[10001] bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden w-72"
            style={{
                top: topOffset,
                left: position.left,
            }}
        >
            <div className="p-1">
                {menuItems.map((item, index) => (
                    <button
                        key={item.id}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => onSelect(item.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-left",
                            selectedIndex === index ? "bg-blue-100/50 text-blue-700" : "hover:bg-slate-100 text-slate-900"
                        )}
                    >
                        <div className={cn(
                            "p-2 rounded-md transition-colors border shrink-0",
                            selectedIndex === index ? "bg-white border-blue-500/50 text-blue-700" : "border-slate-200 bg-slate-100 text-slate-500"
                        )}>
                            {item.icon ? <item.icon className="w-4 h-4" /> : <span className="w-4 h-4 block bg-slate-300 rounded" />}
                        </div>
                        <div className="flex flex-col text-left min-w-0">
                            <span className="text-xs font-semibold">{item.label}</span>
                            <span className={cn(
                                "text-xs",
                                selectedIndex === index ? "text-blue-600" : "text-slate-500"
                            )}>
                                {item.description}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>,
        document.body
    )
}
