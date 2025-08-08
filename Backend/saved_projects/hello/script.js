function addTask() {
  const input = document.getElementById('taskInput');
  const taskText = input.value.trim();

  if (taskText === '') {
    alert('Please enter a task!');
    return;
  }

  const li = document.createElement('li');
  li.innerHTML = `
    <span class="task-text">${taskText}</span>
    <div class="actions">
      <button class="done" onclick="markDone(this)">Done</button>
      <button class="delete" onclick="deleteTask(this)">Delete</button>
    </div>
  `;

  document.getElementById('taskList').appendChild(li);
  input.value = '';
}

function markDone(button) {
  const li = button.closest('li');
  li.classList.toggle('completed');
}

function deleteTask(button) {
  const li = button.closest('li');
  li.remove();
}
