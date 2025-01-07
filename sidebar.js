let tabs = [];
let activeTabIndex = 0;
let searchTerm = '';
let editingNoteIndex = null;

document.addEventListener('DOMContentLoaded', () => {
  loadTabs();
  setupEventListeners();
});

function setupEventListeners() {
  const newTabBtn = document.getElementById('newTabBtn');
  if (newTabBtn) {
    newTabBtn.addEventListener('click', showNewTabModal);
  }

  const cancelTabBtn = document.getElementById('cancelTab');
  const confirmTabBtn = document.getElementById('confirmTab');
  const tabNameInput = document.getElementById('tabName');

  if (cancelTabBtn) {
    cancelTabBtn.addEventListener('click', hideNewTabModal);
  }
  if (confirmTabBtn) {
    confirmTabBtn.addEventListener('click', createNewTab);
  }
  if (tabNameInput) {
    tabNameInput.addEventListener('input', () => {
      const isDisabled = !tabNameInput.value.trim();
      confirmTabBtn.disabled = isDisabled;
      confirmTabBtn.style.opacity = isDisabled ? 0.5 : 1;
    });
  }

  const cancelNoteBtn = document.getElementById('cancelNote');
  const confirmNoteBtn = document.getElementById('confirmNote');
  const noteTitleInput = document.getElementById('noteTitle');
  const noteContentInput = document.getElementById('noteContent');

  if (cancelNoteBtn) {
    cancelNoteBtn.addEventListener('click', hideNewNoteModal);
  }
  if (confirmNoteBtn) {
    confirmNoteBtn.addEventListener('click', createNewNote);
  }
  if (noteTitleInput && noteContentInput) {
    const updateNoteButtonState = () => {
      const isDisabled = !noteTitleInput.value.trim() || !noteContentInput.value.trim();
      confirmNoteBtn.disabled = isDisabled;
      confirmNoteBtn.style.opacity = isDisabled ? 0.5 : 1;
    };

    noteTitleInput.addEventListener('input', updateNoteButtonState);
    noteContentInput.addEventListener('input', updateNoteButtonState);
  }

  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      searchTerm = searchInput.value.toLowerCase();
      renderNotes();
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchTerm = searchInput.value.toLowerCase();
        renderNotes();
      }
    });
  }

  const addNoteBtn = document.getElementById('addNoteBtn');
  if (addNoteBtn) {
    addNoteBtn.addEventListener('click', showNewNoteModal);
  }

  const newTabModal = document.getElementById('newTabModal');
  const newNoteModal = document.getElementById('newNoteModal');
  const renameTabModal = document.getElementById('renameTabModal');

  window.addEventListener('click', (event) => {
    if (event.target === newTabModal) {
      hideNewTabModal();
    }
    if (event.target === newNoteModal) {
      hideNewNoteModal();
    }
    if (event.target === renameTabModal) {
      renameTabModal.style.display = 'none';
    }
  });
}

function loadTabs() {
  chrome.storage.local.get(['tabs', 'activeTabIndex'], (result) => {
    tabs = result.tabs || [];
    activeTabIndex = result.activeTabIndex || 0;

    if (tabs.length === 0) {
      tabs.push({
        name: 'All',
        color: '#0071e3',
        notes: []
      });
    }

    renderTabs();
    renderNotes();
  });
}

function saveTabs() {
  chrome.storage.local.set({
    tabs: tabs,
    activeTabIndex: activeTabIndex
  });
}

function renderTabs() {
  const tabList = document.getElementById('tabList');
  if (!tabList) return;

  tabList.innerHTML = '';

  tabs.forEach((tab, index) => {
    const tabEl = document.createElement('div');
    tabEl.className = `tab ${index === activeTabIndex ? 'active' : ''}`;
    tabEl.style.backgroundColor = index === activeTabIndex ? tab.color : 'transparent';
    tabEl.style.color = index === activeTabIndex ? 'white' : '#1d1d1f';

    const tabName = document.createElement('span');
    tabName.textContent = tab.name;
    tabEl.appendChild(tabName);

    const actions = document.createElement('div');
    actions.className = 'tab-actions';

    if (tab.name !== 'All') {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'action-btn';
      moreBtn.textContent = '⋮';
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showContextMenu(e, [
          { label: 'Rename', action: () => showRenameTabModal(index) },
          { label: 'Delete', action: () => confirmDeleteTab(index) }
        ]);
      });

      actions.appendChild(moreBtn);
    }

    tabEl.appendChild(actions);
    tabEl.addEventListener('click', () => switchTab(index));
    tabList.appendChild(tabEl);
  });

  const addNoteBtn = document.getElementById('addNoteBtn');
  if (addNoteBtn) {
    addNoteBtn.style.display = tabs[activeTabIndex].name === 'All' ? 'none' : 'block';
  }
}

function renderNotes() {
  const tabContent = document.getElementById('tabContent');
  const searchContainer = document.getElementById('searchContainer');

  const notesContainer = document.createElement('div');
  notesContainer.id = 'notesContainer';
  tabContent.innerHTML = '';
  tabContent.appendChild(searchContainer);
  tabContent.appendChild(notesContainer);

  let notesToShow = [];
  if (tabs[activeTabIndex].name === 'All') {
    tabs.forEach(tab => {
      notesToShow = notesToShow.concat(tab.notes.map(note => ({ ...note, tabName: tab.name })));
    });
  } else {
    notesToShow = tabs[activeTabIndex].notes;
  }

  if (searchTerm) {
    notesToShow = notesToShow.filter(note =>
      note.title.toLowerCase().includes(searchTerm) ||
      note.content.toLowerCase().includes(searchTerm)
    );
  }

  notesToShow.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  notesToShow.forEach((note, index) => {
    const noteCard = document.createElement('div');
    noteCard.className = 'note-card';

    const noteHeader = document.createElement('div');
    noteHeader.className = 'note-header';

    const title = document.createElement('h3');
    title.textContent = note.title;

    const noteActions = document.createElement('div');
    noteActions.className = 'note-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn';
    copyBtn.innerHTML = '<img src="icons/copy_icon.png" alt="Copy">';
    copyBtn.addEventListener('click', (e) => copyNoteToClipboard(note, e));

    const moreBtn = document.createElement('button');
    moreBtn.className = 'action-btn';
    moreBtn.textContent = '⋮';
    moreBtn.addEventListener('click', (e) => {
      showContextMenu(e, [
        { label: 'Edit', action: () => editNote(index, note.tabName) },
        { label: 'Delete', action: () => confirmDeleteNote(index, note.tabName) }
      ]);
    });

    noteActions.appendChild(copyBtn);
    noteActions.appendChild(moreBtn);

    noteHeader.appendChild(title);
    noteHeader.appendChild(noteActions);

    const content = document.createElement('p');
    content.textContent = note.content;

    noteCard.appendChild(noteHeader);
    noteCard.appendChild(content);
    notesContainer.appendChild(noteCard);
  });
}

function showContextMenu(event, items) {
  event.preventDefault();

  const existingMenu = document.querySelector('.context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.position = 'fixed';
  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;
  menu.style.zIndex = 1000;

  items.forEach(item => {
    const button = document.createElement('button');
    button.textContent = item.label;
    button.addEventListener('click', () => {
      item.action();
      menu.remove();
    });
    menu.appendChild(button);
  });

  document.body.appendChild(menu);

  setTimeout(() => {
    window.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        window.removeEventListener('click', closeMenu);
      }
    });
  }, 0);
}

function copyNoteToClipboard(note, event) {
  navigator.clipboard.writeText(note.content).then(() => {
    const btn = event.target.closest('button');
    if (btn) {
      btn.innerHTML = '<img src="icons/check_icon.png" alt="Copied">';
      setTimeout(() => {
        btn.innerHTML = '<img src="icons/copy_icon.png" alt="Copy">';
      }, 2000);
    }
  }).catch(err => {
    console.error('Failed to copy text:', err);
  });
}

function showNewTabModal() {
  const modal = document.getElementById('newTabModal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('confirmTab').disabled = true;
    document.getElementById('confirmTab').style.opacity = 0.5;
  }
}

function hideNewTabModal() {
  const modal = document.getElementById('newTabModal');
  if (modal) {
    modal.style.display = 'none';
  }
  const nameInput = document.getElementById('tabName');
  const colorInput = document.getElementById('tabColor');
  if (nameInput) nameInput.value = '';
  if (colorInput) colorInput.value = '#0071e3';
}

function createNewTab() {
  const nameInput = document.getElementById('tabName');
  const colorInput = document.getElementById('tabColor');

  if (!nameInput || !colorInput) return;

  const name = nameInput.value.trim();
  const color = colorInput.value;

  if (name) {
    tabs.push({
      name,
      color,
      notes: []
    });

    activeTabIndex = tabs.length - 1;
    saveTabs();
    renderTabs();
    renderNotes();
    hideNewTabModal();
  }
}

function showNewNoteModal() {
  const modal = document.getElementById('newNoteModal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('confirmNote').disabled = true;
    document.getElementById('confirmNote').style.opacity = 0.5;
  }
}

function hideNewNoteModal() {
  const modal = document.getElementById('newNoteModal');
  const modalTitle = document.getElementById('noteModalTitle');
  const titleInput = document.getElementById('noteTitle');
  const contentInput = document.getElementById('noteContent');

  modal.style.display = 'none';
  modalTitle.textContent = 'New Note';
  titleInput.value = '';
  contentInput.value = '';
  editingNoteIndex = null;
}

function createNewNote() {
  const titleInput = document.getElementById('noteTitle');
  const contentInput = document.getElementById('noteContent');
  const modal = document.getElementById('newNoteModal');

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (title && content) {
    const newNote = {
      title,
      content,
      createdAt: new Date().toISOString()
    };

    if (editingNoteIndex !== null) {
      tabs[activeTabIndex].notes[editingNoteIndex] = newNote;
      editingNoteIndex = null;
    } else {
      tabs[activeTabIndex].notes.unshift(newNote);
    }

    saveTabs();
    renderNotes();
    hideNewNoteModal();
  }
}

function switchTab(index) {
  activeTabIndex = index;
  saveTabs();
  renderTabs();
  renderNotes();
}

function confirmDeleteTab(index) {
  if (confirm('Are you sure you want to delete this tab? This action cannot be undone.')) {
    deleteTab(index);
  }
}

function deleteTab(index) {
  if (tabs.length > 1) {
    tabs.splice(index, 1);
    if (activeTabIndex >= index) {
      activeTabIndex = Math.max(0, activeTabIndex - 1);
    }
    saveTabs();
    renderTabs();
    renderNotes();
  }
}

function confirmDeleteNote(index, tabName) {
  if (confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
    deleteNote(index, tabName);
  }
}

function deleteNote(index, tabName) {
  if (tabName) {
    const tabIndex = tabs.findIndex(tab => tab.name === tabName);
    if (tabIndex !== -1) {
      tabs[tabIndex].notes.splice(index, 1);
    }
  } else {
    tabs[activeTabIndex].notes.splice(index, 1);
  }
  saveTabs();
  renderNotes();
}

function editNote(index, tabName) {
  let note;
  if (tabName) {
    const tabIndex = tabs.findIndex(tab => tab.name === tabName);
    if (tabIndex !== -1) {
      note = tabs[tabIndex].notes[index];
    }
  } else {
    note = tabs[activeTabIndex].notes[index];
  }

  if (!note) {
    console.error('Note not found');
    return;
  }

  const modal = document.getElementById('newNoteModal');
  const titleInput = document.getElementById('noteTitle');
  const contentInput = document.getElementById('noteContent');
  const modalTitle = document.getElementById('noteModalTitle');

  modalTitle.textContent = 'Edit Note';
  titleInput.value = note.title;
  contentInput.value = note.content;
  editingNoteIndex = index;

  modal.style.display = 'flex';
}

function showRenameTabModal(index) {
  const tab = tabs[index];
  const modal = document.getElementById('renameTabModal');
  const nameInput = document.getElementById('newTabName');
  const colorInput = document.getElementById('newTabColor');

  nameInput.value = tab.name;
  colorInput.value = tab.color;
  modal.style.display = 'flex';

  document.getElementById('confirmRenameTab').onclick = () => {
    const newName = nameInput.value.trim();
    const newColor = colorInput.value;

    if (newName) {
      tabs[index].name = newName;
      tabs[index].color = newColor;
      saveTabs();
      renderTabs();
      modal.style.display = 'none';
    }
  };

  document.getElementById('cancelRenameTab').onclick = () => {
    modal.style.display = 'none';
  };
}

const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');

if (searchInput && clearSearchBtn) {
  clearSearchBtn.style.display = searchInput.value.trim() ? 'block' : 'none';

  searchInput.addEventListener('input', () => {
    const hasInput = searchInput.value.trim().length > 0;
    clearSearchBtn.style.display = hasInput ? 'block' : 'none';
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchTerm = '';
    clearSearchBtn.style.display = 'none';
    renderNotes();
  });
}