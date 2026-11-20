
// ==========================================
// TASKTRACK PRO - MAIN JAVASCRIPT
// HTML + CSS + JAVASCRIPT
// ==========================================

const DB_USERS = "ttp_users";
const DB_SESSION = "ttp_session";

let currentUser = null;
let tasks = [];
let timerInterval = null;
let timerSeconds = 1500;
let timerRunning = false;
let timerMode = "Focus";
let calendarDate = new Date();
let selectedDate = new Date().toISOString().slice(0,10);
let charts = {};

// ---------- STORAGE ----------

function getUsers() {
    return JSON.parse(localStorage.getItem(DB_USERS) || "[]");
}

function saveUsers(users) {
    localStorage.setItem(DB_USERS, JSON.stringify(users));
}

function saveData() {
    if (!currentUser) return;
    localStorage.setItem("ttp_tasks_" + currentUser.email, JSON.stringify(tasks));
}

function loadData() {
    tasks = JSON.parse(
        localStorage.getItem("ttp_tasks_" + currentUser.email) || "[]"
    );
}

function userKey(key) {
    return "ttp_" + key + "_" + currentUser.email;
}

// ---------- AUTHENTICATION ----------

function showRegister() {
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("registerForm").classList.remove("hidden");
}

function showLogin() {
    document.getElementById("registerForm").classList.add("hidden");
    document.getElementById("loginForm").classList.remove("hidden");
}

function register(event) {
    event.preventDefault();

    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim().toLowerCase();
    const password = document.getElementById("regPassword").value;
    const confirm = document.getElementById("regConfirm").value;

    if (password !== confirm) {
        return notify("Passwords do not match!");
    }

    const users = getUsers();

    if (users.some(u => u.email === email)) {
        return notify("Account already exists. Please login.");
    }

    // Demo only: password is not securely hashed.
    users.push({ name, email, password });

    saveUsers(users);
    notify("Account created successfully!");
    document.getElementById("loginEmail").value = email;
    showLogin();
}

function login(event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    const user = getUsers().find(
        u => u.email === email && u.password === password
    );

    if (!user) return notify("Invalid email or password!");

    startApp(user);
}

function googleDemo() {
    notify("Google login is not connected. Please use email registration.");
}

function startApp(user) {
    currentUser = user;
    sessionStorage.setItem(DB_SESSION, user.email);

    loadData();

    document.getElementById("authPage").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    const initial = user.name.charAt(0).toUpperCase();

    document.getElementById("sideName").textContent = user.name;
    document.getElementById("sideAvatar").textContent = initial;
    document.getElementById("topAvatar").textContent = initial;
    document.getElementById("profileAvatar").textContent = initial;
    document.getElementById("welcomeTitle").textContent =
        "Hello, " + user.name.split(" ")[0] + "!";
    document.getElementById("profileName").value = user.name;
    document.getElementById("profileEmail").value = user.email;

    const limit = localStorage.getItem(userKey("limit")) || 8;
    document.getElementById("dailyLimit").value = limit;
    document.getElementById("settingsLimit").value = limit;

    const dark = localStorage.getItem(userKey("dark")) === "true";
    document.getElementById("darkToggle").checked = dark;
    toggleDark(dark);

    updateDate();
    renderAll();
    navigate("dashboard");
}

function logout() {
    sessionStorage.removeItem(DB_SESSION);
    currentUser = null;
    tasks = [];

    clearInterval(timerInterval);
    timerRunning = false;

    document.getElementById("app").classList.add("hidden");
    document.getElementById("authPage").classList.remove("hidden");

    document.getElementById("loginPassword").value = "";
    notify("Successfully signed out.");
}

// ---------- PAGE NAVIGATION ----------

function navigate(page) {
    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));

    const target = document.getElementById(page + "Page");

    if (!target) return;

    target.classList.remove("hidden");

    document.querySelectorAll(".nav-link").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.page === page);
    });

    if (page === "dashboard") renderDashboard();
    if (page === "tasks") renderTasks();
    if (page === "calendar") renderCalendar();
    if (page === "focus") updateFocusOptions();
    if (page === "analytics") renderAnalytics();
    if (page === "house") renderHouse();
    if (page === "profile") updateProfile();

    document.querySelector(".sidebar").classList.remove("open");
}

document.querySelectorAll(".nav-link").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.page));
});

function toggleSidebar() {
    document.querySelector(".sidebar").classList.toggle("open");
}

// ---------- DATE AND UTILITIES ----------

function updateDate() {
    const now = new Date();

    document.getElementById("topDate").textContent =
        now.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    const hour = now.getHours();

    document.getElementById("heroMessage").textContent =
        hour < 12 ? "A fresh morning is a fresh opportunity." :
        hour < 17 ? "Keep going. You're making progress." :
        "Finish strong and celebrate your progress.";
}

function today() {
    return new Date().toISOString().slice(0,10);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function notify(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(notify.timeout);
    notify.timeout = setTimeout(() => toast.classList.remove("show"), 2800);
}

function getPriorityRank(priority) {
    return { High: 1, Medium: 2, Low: 3 }[priority] || 4;
}

function isOverdue(task) {
    return task.status !== "Completed" &&
           task.deadline < today();
}

// ---------- TASK MODAL ----------

function openTaskModal(id = null) {
    document.getElementById("taskForm").reset();
    document.getElementById("editTaskId").value = "";

    document.getElementById("taskDeadline").value = today();
    document.getElementById("taskDuration").value = 30;
    document.getElementById("modalTitle").textContent = "Create New Task";

    if (id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        document.getElementById("editTaskId").value = id;
        document.getElementById("taskTitle").value = task.title;
        document.getElementById("taskDescription").value = task.description;
        document.getElementById("taskCategory").value = task.category;
        document.getElementById("taskPriority").value = task.priority;
        document.getElementById("taskDeadline").value = task.deadline;
        document.getElementById("taskDuration").value = task.duration;
        document.getElementById("taskStatus").value = task.status;
        document.getElementById("taskSubtasks").value =
            task.subtasks.map(s => s.title).join("\n");

        document.getElementById("modalTitle").textContent = "Edit Task";
    }

    document.getElementById("taskModal").classList.remove("hidden");
}

function closeTaskModal() {
    document.getElementById("taskModal").classList.add("hidden");
}

// ---------- CREATE / UPDATE ----------

function saveTask(event) {
    event.preventDefault();

    const id = document.getElementById("editTaskId").value;
    const title = document.getElementById("taskTitle").value.trim();
    const deadline = document.getElementById("taskDeadline").value;
    const limit = Number(localStorage.getItem(userKey("limit")) || 8);

    const existing = tasks.find(t => t.id === id);

    if (!existing) {
        const scheduledCount = tasks.filter(t =>
            t.deadline === deadline && t.status !== "Completed"
        ).length;

        if (scheduledCount >= limit) {
            return notify("Daily task limit reached! Choose another date.");
        }
    }

    const oldStatus = existing?.status;

    const subtasksText = document.getElementById("taskSubtasks").value;

    const subtaskTitles = subtasksText.split("\n")
        .map(s => s.trim())
        .filter(Boolean);

    const subtasks = subtaskTitles.map((name, index) => {
        const previous = existing?.subtasks.find(s => s.title === name);
        return {
            id: previous?.id || Date.now() + index,
            title: name,
            done: previous?.done || false
        };
    });

    const task = {
        id: existing?.id || Date.now().toString(),
        title,
        description: document.getElementById("taskDescription").value.trim(),
        category: document.getElementById("taskCategory").value,
        priority: document.getElementById("taskPriority").value,
        deadline,
        duration: Number(document.getElementById("taskDuration").value) || 30,
        status: document.getElementById("taskStatus").value,
        subtasks,
        created: existing?.created || new Date().toISOString(),
        completedAt: existing?.completedAt || null,
        trackedMinutes: existing?.trackedMinutes || 0
    };

    if (task.status === "Completed" && oldStatus !== "Completed") {
        task.completedAt = new Date().toISOString();
    }

    if (task.status !== "Completed") task.completedAt = null;

    if (existing) {
        tasks = tasks.map(t => t.id === id ? task : t);
        notify("Task updated successfully!");
    } else {
        tasks.push(task);
        notify("New task created!");
    }

    saveData();
    closeTaskModal();
    renderAll();
}

// ---------- DELETE ----------

function deleteTask(id) {
    if (!confirm("Are you sure you want to delete this task?")) return;

    tasks = tasks.filter(t => t.id !== id);
    saveData();
    renderAll();
    notify("Task deleted.");
}

// ---------- COMPLETE TASK ----------

function completeTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (task.status === "Completed") {
        task.status = "Pending";
        task.completedAt = null;
        notify("Task moved back to Pending.");
    } else {
        task.status = "Completed";
        task.completedAt = new Date().toISOString();
        notify("🎉 Congratulations! Task completed!");
        celebrate();
    }

    saveData();
    renderAll();
}

function celebrate() {
    const emojis = ["🎉","✨","🎊","🌟","💜","🎈"];

    const element = document.createElement("div");
    element.className = "celebration";
    element.textContent = emojis.join(" ");

    Object.assign(element.style, {
        position: "fixed",
        top: "35%",
        left: "50%",
        transform: "translate(-50%,-50%)",
        fontSize: "32px",
        zIndex: "300",
        pointerEvents: "none",
        animation: "celebrate 1.5s ease forwards"
    });

    document.body.appendChild(element);
    setTimeout(() => element.remove(), 1600);
}

// ---------- SUBTASKS ----------

function toggleSubtask(taskId, subId, checked) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const sub = task.subtasks.find(s => String(s.id) === String(subId));
    if (!sub) return;

    sub.done = checked;

    if (task.subtasks.length &&
        task.subtasks.every(s => s.done)) {
        notify("All subtasks completed!");
    }

    saveData();
    renderAll();
}

// ---------- TASK DISPLAY ----------

function taskCardHTML(task) {
    const subtaskHTML = task.subtasks.length
        ? `<div class="subtasks">
            ${task.subtasks.map(s => `
                <label>
                    <input type="checkbox"
                        ${s.done ? "checked" : ""}
                        onchange="toggleSubtask('${task.id}','${s.id}',this.checked)">
                    <span>${escapeHTML(s.title)}</span>
                </label>
            `).join("")}
            </div>`
        : "";

    const statusClass = task.status === "Completed" ? "done" : "";
    const overdue = isOverdue(task);

    return `
    <article class="task-card">
        <div class="task-card-top">
            <span class="pill">${escapeHTML(task.category)}</span>
            <span class="pill ${task.priority.toLowerCase()}">${escapeHTML(task.priority)} Priority</span>
        </div>

        <h3>${escapeHTML(task.title)}</h3>
        <p>${escapeHTML(task.description || "No description added.")}</p>

        <div class="task-meta">
            <span class="pill ${statusClass}">${escapeHTML(task.status)}</span>
            <span class="pill ${overdue ? "high" : ""}">
                ${overdue ? "⚠ Overdue" : "📅 " + escapeHTML(task.deadline)}
            </span>
            <span class="pill">◷ ${task.duration} min</span>
        </div>

        ${subtaskHTML}

        <div class="task-actions">
            <button class="small-btn" onclick="completeTask('${task.id}')">
                ${task.status === "Completed" ? "↶ Reopen" : "✓ Complete"}
            </button>
            <button class="small-btn" onclick="openTaskModal('${task.id}')">✎ Edit</button>
            <button class="small-btn" onclick="deleteTask('${task.id}')">⌫ Delete</button>
            <button class="small-btn" onclick="recoverTask('${task.id}')">↻ Reschedule</button>
        </div>
    </article>`;
}

function renderTasks() {
    const search = document.getElementById("searchInput").value.toLowerCase();
    const status = document.getElementById("filterStatus").value;
    const priority = document.getElementById("filterPriority").value;
    const sort = document.getElementById("sortTasks").value;

    let filtered = tasks.filter(t => {
        const matchesSearch =
            t.title.toLowerCase().includes(search) ||
            t.description.toLowerCase().includes(search);

        return matchesSearch &&
            (status === "all" || t.status === status) &&
            (priority === "all" || t.priority === priority);
    });

    if (sort === "date") filtered.sort((a,b) => a.deadline.localeCompare(b.deadline));
    if (sort === "priority") filtered.sort((a,b) => getPriorityRank(a.priority)-getPriorityRank(b.priority));
    if (sort === "created") filtered.sort((a,b) => b.created.localeCompare(a.created));

    document.getElementById("taskSummary").textContent =
        `${filtered.length} task(s) found · ${tasks.length} total`;

    document.getElementById("taskList").innerHTML =
        filtered.length ? filtered.map(taskCardHTML).join("") :
        `<div class="panel empty-state">✦ No tasks found. Create your first task!</div>`;
}

// ---------- MISSED TASK RECOVERY ----------

function recoverTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);

    task.deadline = nextDate.toISOString().slice(0,10);
    if (task.status === "Completed") task.status = "Pending";

    saveData();
    renderAll();
    notify("Task rescheduled for tomorrow!");
}

// ---------- SMART PRIORITIZATION ----------

function getSmartTasks() {
    return [...tasks]
        .filter(t => t.status !== "Completed")
        .sort((a,b) => {
            const priorityDiff = getPriorityRank(a.priority)-getPriorityRank(b.priority);
            if (priorityDiff !== 0) return priorityDiff;
            return a.deadline.localeCompare(b.deadline);
        });
}

// ---------- DASHBOARD ----------

function renderDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "Completed").length;
    const pending = tasks.filter(t => t.status !== "Completed").length;
    const overdue = tasks.filter(isOverdue).length;

    const todayTasks = tasks.filter(t => t.deadline === today());
    const todayCompleted = todayTasks.filter(t => t.status === "Completed").length;

    document.getElementById("totalStat").textContent = total;
    document.getElementById("pendingStat").textContent = pending;
    document.getElementById("completedStat").textContent = completed;
    document.getElementById("overdueStat").textContent = overdue;

    const percent = todayTasks.length
        ? Math.round(todayCompleted / todayTasks.length * 100)
        : 0;

    document.getElementById("progressPercent").textContent = percent + "%";
    document.getElementById("progressBar").style.width = percent + "%";
    document.getElementById("progressText").textContent =
        `${todayCompleted} of ${todayTasks.length} completed`;

    const todayList = tasks
        .filter(t => t.deadline === today())
        .sort((a,b) => getPriorityRank(a.priority)-getPriorityRank(b.priority));

    document.getElementById("todayList").innerHTML =
        todayList.length ? todayList.map(t => `
        <div class="list-task">
            <input type="checkbox" ${t.status === "Completed" ? "checked" : ""}
                onchange="completeTask('${t.id}')">
            <div>
                <strong>${escapeHTML(t.title)}</strong>
                <small>${escapeHTML(t.priority)} · ${escapeHTML(t.status)}</small>
            </div>
        </div>`).join("") :
        `<div class="empty-state">No tasks scheduled for today.</div>`;

    const upcoming = tasks.filter(t =>
        t.status !== "Completed" && t.deadline >= today()
    ).sort((a,b) => a.deadline.localeCompare(b.deadline)).slice(0,6);

    document.getElementById("upcomingList").innerHTML =
        upcoming.length ? upcoming.map(t => `
        <div class="upcoming-item">
            <strong>${escapeHTML(t.title)}</strong>
            <small>📅 ${escapeHTML(t.deadline)}</small>
        </div>`).join("") :
        `<div class="empty-state">No upcoming deadlines.</div>`;

    renderWeeklyChart("weeklyChart");
    checkOverload();
}

function checkOverload() {
    const limit = Number(localStorage.getItem(userKey("limit")) || 8);

    const todayCount = tasks.filter(t =>
        t.deadline === today() && t.status !== "Completed"
    ).length;

    if (todayCount >= limit) {
        document.getElementById("heroMessage").textContent =
            "⚠ Your daily workload is full. Consider rescheduling tasks.";
    }
}

// ---------- WEEKLY CHART ----------

function getLastSevenDays() {
    return Array.from({length:7}, (_,i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6-i));
        return d.toISOString().slice(0,10);
    });
}

function renderWeeklyChart(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return;

    if (charts[id]) charts[id].destroy();

    const dates = getLastSevenDays();

    charts[id] = new Chart(canvas, {
        type:"bar",
        data:{
            labels:dates.map(d => new Date(d + "T12:00:00").toLocaleDateString("en",{weekday:"short"})),
            datasets:[{
                label:"Completed tasks",
                data:dates.map(d => tasks.filter(t =>
                    t.status === "Completed" &&
                    t.completedAt?.slice(0,10) === d
                ).length),
                backgroundColor:"#8978ec",
                borderRadius:6
            }]
        },
        options:{
            responsive:true,
            maintainAspectRatio:false,
            plugins:{legend:{display:false}},
            scales:{y:{beginAtZero:true,ticks:{precision:0}}}
        }
    });
}

// ---------- CALENDAR ----------

function changeMonth(change) {
    calendarDate.setMonth(calendarDate.getMonth() + change);
    renderCalendar();
}

function renderCalendar() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(year,month,1).getDay();
    const lastDay = new Date(year,month+1,0).getDate();

    document.getElementById("calendarMonth").textContent =
        calendarDate.toLocaleDateString("en",{month:"long",year:"numeric"});

    let html = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
        .map(d => `<div class="calendar-cell day-name">${d}</div>`).join("");

    for (let i=0;i<firstDay;i++) {
        html += `<div class="calendar-cell" style="visibility:hidden"></div>`;
    }

    for (let day=1;day<=lastDay;day++) {
        const date = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
        const count = tasks.filter(t => t.deadline === date).length;

        html += `
        <button class="calendar-cell
            ${date === today() ? "today" : ""}
            ${date === selectedDate ? "selected" : ""}"
            onclick="selectCalendarDate('${date}')">
            ${day}
            ${count ? `<small>${count} task(s)</small>` : ""}
        </button>`;
    }

    document.getElementById("calendarGrid").innerHTML = html;
    renderCalendarTasks();
}

function selectCalendarDate(date) {
    selectedDate = date;
    renderCalendar();
}

function renderCalendarTasks() {
    document.getElementById("selectedDateTitle").textContent =
        "Tasks – " + selectedDate;

    const list = tasks.filter(t => t.deadline === selectedDate);

    document.getElementById("calendarTasks").innerHTML =
        list.length ? list.map(t => `
        <div class="list-task">
            <div>
                <strong>${escapeHTML(t.title)}</strong>
                <small>${escapeHTML(t.priority)} · ${escapeHTML(t.status)}</small>
            </div>
        </div>`).join("") :
        `<div class="empty-state">No tasks on this date.</div>`;
}

// ---------- FOCUS TIMER ----------

function updateFocusOptions() {
    const select = document.getElementById("focusTask");
    const previous = select.value;

    select.innerHTML = `<option value="">Choose a task</option>` +
        tasks.filter(t => t.status !== "Completed").map(t =>
            `<option value="${t.id}">${escapeHTML(t.title)}</option>`
        ).join("");

    if (tasks.some(t => t.id === previous)) select.value = previous;
}

function setTimer(minutes, mode) {
    clearInterval(timerInterval);
    timerRunning = false;
    timerMode = mode;
    timerSeconds = minutes * 60;

    document.getElementById("timerLabel").textContent =
        mode.toUpperCase() + " SESSION";

    document.getElementById("timerStart").textContent = "Start Focus";

    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active");

    updateTimerDisplay();
}

function updateTimerDisplay() {
    const min = Math.floor(timerSeconds / 60);
    const sec = timerSeconds % 60;

    document.getElementById("timerDisplay").textContent =
        String(min).padStart(2,"0") + ":" + String(sec).padStart(2,"0");
}

function startTimer() {
    if (timerRunning) {
        clearInterval(timerInterval);
        timerRunning = false;
        document.getElementById("timerStart").textContent = "Resume";
        return;
    }

    const selected = document.getElementById("focusTask").value;

    if (timerMode === "Focus" && !selected) {
        return notify("Please select a task first.");
    }

    timerRunning = true;
    document.getElementById("timerStart").textContent = "Pause";

    timerInterval = setInterval(() => {
        timerSeconds--;
        updateTimerDisplay();

        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerRunning = false;

            if (timerMode === "Focus") {
                const task = tasks.find(t => t.id === selected);
                if (task) {
                    task.trackedMinutes = (task.trackedMinutes || 0) + 25;
                    saveData();
                }
            }

            notify(timerMode + " session completed! Take a break.");
            document.getElementById("timerStart").textContent = "Start Again";
            document.getElementById("timerLabel").textContent = "SESSION COMPLETED";
            renderAll();
        }
    },1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    timerMode = "Focus";
    timerSeconds = 1500;
    document.getElementById("timerStart").textContent = "Start Focus";
    document.getElementById("timerLabel").textContent = "READY TO FOCUS";
    updateTimerDisplay();
}

// ---------- ANALYTICS ----------

function renderAnalytics() {
    const completed = tasks.filter(t => t.status === "Completed").length;
    const total = tasks.length;
    const percent = total ? Math.round(completed/total*100) : 0;

    const tracked = tasks.reduce((sum,t) => sum + (t.trackedMinutes || 0),0);

    const activeDays = new Set(tasks
        .filter(t => t.completedAt)
        .map(t => t.completedAt.slice(0,10))
    ).size;

    const score = Math.min(100,Math.round(activeDays/7*100));

    document.getElementById("completionRate").textContent = percent + "%";
    document.getElementById("totalTime").textContent =
        tracked >= 60 ? `${Math.floor(tracked/60)}h ${tracked%60}m` : tracked + "m";
    document.getElementById("consistency").textContent = score + "%";
    document.getElementById("analyticsCompleted").textContent = completed;

    const counts = ["Pending","In Progress","Completed"].map(s =>
        tasks.filter(t => t.status === s).length
    );

    if (charts.analytics) charts.analytics.destroy();
    if (charts.status) charts.status.destroy();

    charts.analytics = new Chart(document.getElementById("analyticsChart"), {
        type:"line",
        data:{
            labels:getLastSevenDays().map(d =>
                new Date(d+"T12:00:00").toLocaleDateString("en",{weekday:"short"})
            ),
            datasets:[{
                label:"Completed",
                data:getLastSevenDays().map(d => tasks.filter(t =>
                    t.status === "Completed" &&
                    t.completedAt?.slice(0,10) === d
                ).length),
                borderColor:"#7968e5",
                backgroundColor:"#7968e522",
                fill:true,
                tension:.4
            }]
        },
        options:{responsive:true,plugins:{legend:{display:false}}}
    });

    charts.status = new Chart(document.getElementById("statusChart"),{
        type:"doughnut",
        data:{
            labels:["Pending","In Progress","Completed"],
            datasets:[{
                data:counts,
                backgroundColor:["#f0ad5c","#8c7de8","#42bb91"],
                borderWidth:0
            }]
        },
        options:{responsive:true,plugins:{legend:{position:"bottom"}}}
    });

    document.getElementById("insights").innerHTML = `
        <div class="insight">✦ You have completed <b>${completed}</b> tasks out of ${total} total tasks.</div>
        <div class="insight">◷ You have tracked <b>${tracked} minutes</b> of focused work.</div>
        <div class="insight">⚠ You have <b>${tasks.filter(isOverdue).length}</b> overdue tasks to review.</div>
        <div class="insight">✧ Your current consistency score is <b>${score}%</b>.</div>
    `;
}

// ---------- DREAM HOUSE ----------

function renderHouse() {
    const completed = tasks.filter(t => t.status === "Completed").length;

    const milestones = [
        {count:0,title:"Foundation",icon:"🧱"},
        {count:3,title:"First Walls",icon:"🏠"},
        {count:6,title:"Roof Complete",icon:"🏡"},
        {count:10,title:"Garden",icon:"🌳"},
        {count:15,title:"Dream Home",icon:"🏘️"},
        {count:25,title:"Luxury Home",icon:"🏰"}
    ];

    let level = 0;
    milestones.forEach((m,i) => {
        if (completed >= m.count) level = i;
    });

    const next = milestones[Math.min(level+1,milestones.length-1)];
    const current = milestones[level];

    let progress = level === milestones.length-1
        ? 100
        : Math.min(100,Math.round(
            (completed-current.count)/(next.count-current.count)*100
        ));

    document.getElementById("houseTitle").textContent =
        current.title + " Unlocked!";
    document.getElementById("houseDescription").textContent =
        `${completed} tasks completed. Keep progressing to unlock your next home upgrade.`;

    document.getElementById("houseCount").textContent =
        `${completed} completed tasks · Next: ${next.title}`;

    document.getElementById("houseProgress").style.width = progress + "%";

    document.getElementById("houseMilestones").textContent =
        "Next milestone: " + next.count + " completed tasks";

    document.getElementById("houseUnlocks").innerHTML =
        milestones.map(m => `
        <div class="unlock-item">
            <span>${m.icon}</span>
            <b>${m.title}</b>
            <small>${completed >= m.count ? "✓ Unlocked" : `${m.count} tasks required`}</small>
        </div>
    `).join("");

    const house = document.getElementById("dreamHouse");
    house.style.transform = `translateX(-50%) rotateY(${-8-level*2}deg) scale(${1+level*.025})`;
    house.style.filter = completed >= 15 ? "drop-shadow(0 12px 20px #fff6)" : "none";
}

// ---------- PROFILE ----------

function updateProfile() {
    document.getElementById("profileName").value = currentUser.name;
    document.getElementById("profileEmail").value = currentUser.email;
}

function saveProfile(event) {
    event.preventDefault();

    const name = document.getElementById("profileName").value.trim();

    if (!name) return notify("Please enter your name.");

    const users = getUsers();
    const user = users.find(u => u.email === currentUser.email);

    if (user) user.name = name;

    currentUser.name = name;
    saveUsers(users);

    document.getElementById("sideName").textContent = name;
    document.getElementById("sideAvatar").textContent = name[0].toUpperCase();
    document.getElementById("topAvatar").textContent = name[0].toUpperCase();
    document.getElementById("profileAvatar").textContent = name[0].toUpperCase();
    document.getElementById("welcomeTitle").textContent =
        "Hello, " + name.split(" ")[0] + "!";

    saveSettings();
    notify("Profile updated successfully!");
}

// ---------- SETTINGS ----------

function toggleDark(enabled) {
    document.body.classList.toggle("dark",enabled);

    if (currentUser) {
        localStorage.setItem(userKey("dark"),enabled);
    }
}

function saveSettings() {
    const limit = Number(document.getElementById("settingsLimit").value);

    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        return notify("Enter a daily limit between 1 and 50.");
    }

    localStorage.setItem(userKey("limit"),limit);
    document.getElementById("dailyLimit").value = limit;
    notify("Settings saved successfully!");
}

function updateProfileLimit() {
    const limit = Number(document.getElementById("dailyLimit").value);

    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        return notify("Choose a number between 1 and 50.");
    }

    document.getElementById("settingsLimit").value = limit;
    localStorage.setItem(userKey("limit"),limit);
}

// ---------- NOTIFICATIONS & REMINDERS ----------

async function enableNotifications() {
    if (!("Notification" in window)) {
        return notify("Notifications are not supported by this browser.");
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
        notify("Browser notifications enabled!");
        checkReminders();
    } else {
        notify("Notification permission was not granted.");
    }
}

function checkReminders() {
    if (!currentUser || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const now = new Date();
    const key = userKey("reminded");

    let reminded = JSON.parse(localStorage.getItem(key) || "[]");

    tasks.forEach(task => {
        if (task.status === "Completed") return;

        const deadline = new Date(task.deadline + "T00:00:00");
        const hours = (deadline - now) / 3600000;
        const reminderKey = task.id + "_" + task.deadline;

        if (hours >= 0 && hours <= 24 && !reminded.includes(reminderKey)) {
            new Notification("TaskTrack Pro – Deadline Reminder", {
                body: task.title + " is due soon!"
            });

            reminded.push(reminderKey);
        }
    });

    localStorage.setItem(key,JSON.stringify(reminded));
}

// ---------- RENDER ALL ----------

function renderAll() {
    if (!currentUser) return;

    renderDashboard();
    renderTasks();
    renderCalendar();
    updateFocusOptions();
    renderHouse();
}

// ---------- DAILY TASK LIMIT PROFILE ----------

document.getElementById("dailyLimit").addEventListener("change", updateProfileLimit);

// ---------- APP STARTUP ----------

window.addEventListener("DOMContentLoaded", () => {
    updateTimerDisplay();

    const email = sessionStorage.getItem(DB_SESSION);

    if (email) {
        const user = getUsers().find(u => u.email === email);

        if (user) startApp(user);
        else sessionStorage.removeItem(DB_SESSION);
    }

    setInterval(() => {
        if (currentUser) checkReminders();
    },60000);
});

// ---------- CELEBRATION ANIMATION ----------

const celebrationStyle = document.createElement("style");
celebrationStyle.textContent = `
@keyframes celebrate {
    0% { opacity:0; transform:translate(-50%,-30%) scale(.3) rotate(-15deg); }
    30% { opacity:1; transform:translate(-50%,-50%) scale(1.3) rotate(8deg); }
    100% { opacity:0; transform:translate(-50%,-130%) scale(.8); }
}`;
document.head.appendChild(celebrationStyle);
