import { useState } from 'react'

export default function TodosTab({
  categories,
  todos,
  onAddCategory,
  onDeleteCategory,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
}) {
  const [newCategory, setNewCategory] = useState('')

  return (
    <>
      {categories.map((cat) => (
        <CategoryBlock
          key={cat.id}
          cat={cat}
          items={todos.filter((t) => t.categoryId === cat.id)}
          onDeleteCategory={() => onDeleteCategory(cat)}
          onAddTodo={(text) => onAddTodo(cat.id, text)}
          onToggleTodo={onToggleTodo}
          onDeleteTodo={onDeleteTodo}
        />
      ))}

      <div className="add-category-row">
        <input
          placeholder="New category — e.g. Travel"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newCategory.trim()) {
              onAddCategory(newCategory.trim())
              setNewCategory('')
            }
          }}
        />
        <button
          onClick={() => {
            if (!newCategory.trim()) return
            onAddCategory(newCategory.trim())
            setNewCategory('')
          }}
        >
          Add category
        </button>
      </div>
    </>
  )
}

function CategoryBlock({ cat, items, onDeleteCategory, onAddTodo, onToggleTodo, onDeleteTodo }) {
  const [text, setText] = useState('')
  const pending = items.filter((t) => t.done !== 'true' && t.done !== true)
  const done = items.filter((t) => t.done === 'true' || t.done === true)

  function submit() {
    if (!text.trim()) return
    onAddTodo(text.trim())
    setText('')
  }

  return (
    <div className="category-block">
      <div className="category-head">
        <div className="category-name">{cat.name}</div>
        <button className="icon-btn" onClick={onDeleteCategory}>Remove</button>
      </div>

      {items.length === 0 && <div className="empty-state">Nothing here yet.</div>}

      {pending.map((t) => (
        <TodoRow key={t.id} t={t} onToggle={() => onToggleTodo(t)} onDelete={() => onDeleteTodo(t)} />
      ))}
      {done.map((t) => (
        <TodoRow key={t.id} t={t} onToggle={() => onToggleTodo(t)} onDelete={() => onDeleteTodo(t)} />
      ))}

      <div className="add-todo-row">
        <input
          placeholder="Add item…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button onClick={submit}>Add</button>
      </div>
    </div>
  )
}

function TodoRow({ t, onToggle, onDelete }) {
  const isDone = t.done === 'true' || t.done === true
  return (
    <div className="todo-row">
      <button className={`todo-check ${isDone ? 'done' : ''}`} onClick={onToggle} aria-label="Toggle done">
        {isDone ? '✓' : ''}
      </button>
      <div className={`todo-text ${isDone ? 'done' : ''}`}>{t.text}</div>
      <button className="todo-del" onClick={onDelete} aria-label="Delete item">×</button>
    </div>
  )
}
