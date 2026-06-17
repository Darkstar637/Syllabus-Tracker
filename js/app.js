(function () {
  "use strict";

  const storage = window.SyllabusStorage;
  const dashboard = window.SyllabusDashboard;
  const syllabus = window.SyllabusSubjects;
  const state = {
    currentView: "dashboard",
    modalMode: null,
    editIds: null,
    progressChart: null
  };

  const views = {
    dashboard: document.getElementById("dashboardView"),
    subjects: document.getElementById("subjectsView"),
    chapters: document.getElementById("chaptersView"),
    topics: document.getElementById("topicsView"),
    reports: document.getElementById("reportsView"),
    settings: document.getElementById("settingsView")
  };

  const elements = {
    body: document.body,
    sidebar: document.getElementById("sidebar"),
    mobileBackdrop: document.getElementById("mobileBackdrop"),
    menuToggle: document.getElementById("menuToggle"),
    themeToggle: document.getElementById("themeToggle"),
    pageTitle: document.getElementById("pageTitle"),
    navLinks: Array.from(document.querySelectorAll(".nav-link")),
    quickAddButton: document.getElementById("quickAddButton"),
    modal: document.getElementById("entryModal"),
    form: document.getElementById("entryForm"),
    modalTitle: document.getElementById("modalTitle"),
    modalEyebrow: document.getElementById("modalEyebrow"),
    modalFields: document.getElementById("modalFields"),
    modalCloseButton: document.getElementById("modalCloseButton"),
    modalCancelButton: document.getElementById("modalCancelButton"),
    overallProgress: document.getElementById("overallProgress"),
    overallProgressLabel: document.getElementById("overallProgressLabel"),
    totalSubjects: document.getElementById("totalSubjects"),
    totalChapters: document.getElementById("totalChapters"),
    totalTopics: document.getElementById("totalTopics"),
    recentTopicsList: document.getElementById("recentTopicsList"),
    subjectsList: document.getElementById("subjectsList"),
    chaptersList: document.getElementById("chaptersList"),
    topicsList: document.getElementById("topicsList"),
    reportsList: document.getElementById("reportsList"),
    chapterSubjectFilter: document.getElementById("chapterSubjectFilter"),
    topicSubjectFilter: document.getElementById("topicSubjectFilter"),
    topicStatusFilter: document.getElementById("topicStatusFilter"),
    settingsThemeToggle: document.getElementById("settingsThemeToggle"),
    exportJsonButton: document.getElementById("exportJsonButton"),
    importJsonButton: document.getElementById("importJsonButton"),
    importJsonInput: document.getElementById("importJsonInput"),
    importStatus: document.getElementById("importStatus"),
    resetDataButton: document.getElementById("resetDataButton"),
    settingsSummary: document.getElementById("settingsSummary")
  };

  function flattenData(data) {
    const chapters = [];
    const topics = [];

    data.subjects.forEach((subject) => {
      subject.chapters.forEach((chapter) => {
        chapters.push({ ...chapter, subjectName: subject.name, subjectColor: subject.color });
        chapter.topics.forEach((topic) => {
          topics.push({
            ...topic,
            subjectName: subject.name,
            subjectColor: subject.color,
            chapterName: chapter.name
          });
        });
      });
    });

    return { chapters, topics };
  }

  function calculateProgress(topics) {
    return dashboard.calculateProgress(topics);
  }

  function escapeHtml(value) {
    return dashboard.escapeHtml(value);
  }

  function setView(viewName) {
    state.currentView = viewName;
    Object.entries(views).forEach(([name, view]) => {
      view.classList.toggle("active", name === viewName);
    });
    elements.navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.view === viewName);
    });
    elements.pageTitle.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
    elements.quickAddButton.hidden = viewName === "settings";
    closeMobileMenu();
  }

  function openMobileMenu() {
    elements.sidebar.classList.add("open");
    elements.mobileBackdrop.hidden = false;
  }

  function closeMobileMenu() {
    elements.sidebar.classList.remove("open");
    elements.mobileBackdrop.hidden = true;
  }

  function applyTheme(theme) {
    elements.body.classList.toggle("dark-mode", theme === "dark");
    if (elements.settingsThemeToggle) {
      elements.settingsThemeToggle.textContent = theme === "dark" ? "Use Light Mode" : "Use Dark Mode";
    }
  }

  function fieldTemplate(field) {
    if (field.type === "select") {
      return `
        <label for="${field.id}">${field.label}</label>
        <select id="${field.id}" name="${field.name}" ${field.required ? "required" : ""}>
          ${field.options
            .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
            .join("")}
        </select>
      `;
    }

    if (field.type === "textarea") {
      return `
        <label for="${field.id}">${field.label}</label>
        <textarea id="${field.id}" name="${field.name}" rows="3" maxlength="240">${escapeHtml(
          field.value || ""
        )}</textarea>
      `;
    }

    return `
      <label for="${field.id}">${field.label}</label>
      <input
        id="${field.id}"
        name="${field.name}"
        type="${field.type || "text"}"
        value="${escapeHtml(field.value || "")}"
        ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ""}
        ${field.maxlength ? `maxlength="${field.maxlength}"` : ""}
        ${field.required ? "required" : ""}
      />
    `;
  }

  function renderFields(fields) {
    elements.modalFields.innerHTML = fields
      .map((field) => `<div class="form-field">${fieldTemplate(field)}</div>`)
      .join("");

    fields.forEach((field) => {
      if (field.type === "select" && field.value) {
        const input = document.getElementById(field.id);
        input.value = field.value;
      }
    });
  }

  function subjectOptions(data) {
    return syllabus.subjectOptions(data);
  }

  function chapterOptions(data, subjectId) {
    return syllabus.chapterOptions(data, subjectId);
  }

  function openModal(mode, ids) {
    const data = storage.getData();
    const subjects = subjectOptions(data);
    state.modalMode = mode;
    state.editIds = ids || null;
    elements.form.dataset.error = "";

    if ((mode.includes("chapter") || mode.includes("topic")) && !subjects.length) {
      alert("Add a subject first.");
      setView("subjects");
      return;
    }

    const selectedSubjectId = ids?.subjectId || subjects[0]?.value;
    if (mode.includes("topic") && !chapterOptions(data, selectedSubjectId).length) {
      alert("Add a chapter first.");
      setView("chapters");
      return;
    }

    const config = getModalConfig(mode, data, ids);
    elements.modalEyebrow.textContent = config.eyebrow;
    elements.modalTitle.textContent = config.title;
    renderFields(config.fields);

    const subjectSelect = elements.modalFields.querySelector('[name="subjectId"]');
    const chapterSelect = elements.modalFields.querySelector('[name="chapterId"]');

    if (subjectSelect && chapterSelect) {
      subjectSelect.addEventListener("change", () => {
        const options = chapterOptions(storage.getData(), subjectSelect.value);
        chapterSelect.innerHTML = options
          .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
          .join("");
      });
    }

    elements.modal.showModal();
    const firstInput = elements.modalFields.querySelector("input, select, textarea");
    if (firstInput) firstInput.focus();
  }

  function getModalConfig(mode, data, ids) {
    const subject = ids?.subjectId ? data.subjects.find((item) => item.id === ids.subjectId) : null;
    const chapter = subject && ids?.chapterId ? subject.chapters.find((item) => item.id === ids.chapterId) : null;
    const topic = chapter && ids?.topicId ? chapter.topics.find((item) => item.id === ids.topicId) : null;

    if (mode === "add-subject" || mode === "edit-subject") {
      return {
        eyebrow: "Subject",
        title: mode === "add-subject" ? "Add Subject" : "Edit Subject",
        fields: [
          {
            id: "subjectName",
            name: "name",
            label: "Subject name",
            value: subject?.name,
            placeholder: "Physics",
            maxlength: 80,
            required: true
          },
          {
            id: "subjectColor",
            name: "color",
            label: "Accent color",
            type: "color",
            value: subject?.color || "#2563eb",
            required: true
          }
        ]
      };
    }

    if (mode === "add-chapter" || mode === "edit-chapter") {
      return {
        eyebrow: "Chapter",
        title: mode === "add-chapter" ? "Add Chapter" : "Edit Chapter",
        fields: [
          {
            id: "chapterSubject",
            name: "subjectId",
            label: "Subject",
            type: "select",
            options: subjectOptions(data),
            value: subject?.id || data.subjects[0]?.id,
            required: true
          },
          {
            id: "chapterName",
            name: "name",
            label: "Chapter name",
            value: chapter?.name,
            placeholder: "Laws of Motion",
            maxlength: 80,
            required: true
          }
        ]
      };
    }

    const selectedSubjectId = subject?.id || data.subjects[0]?.id;
    return {
      eyebrow: "Topic",
      title: mode === "add-topic" ? "Add Topic" : "Edit Topic",
      fields: [
        {
          id: "topicSubject",
          name: "subjectId",
          label: "Subject",
          type: "select",
          options: subjectOptions(data),
          value: selectedSubjectId,
          required: true
        },
        {
          id: "topicChapter",
          name: "chapterId",
          label: "Chapter",
          type: "select",
          options: chapterOptions(data, selectedSubjectId),
          value: chapter?.id || chapterOptions(data, selectedSubjectId)[0]?.value,
          required: true
        },
        {
          id: "topicName",
          name: "name",
          label: "Topic name",
          value: topic?.name,
          placeholder: "Newton's second law",
          maxlength: 80,
          required: true
        },
        {
          id: "topicNotes",
          name: "notes",
          label: "Notes",
          type: "textarea",
          value: topic?.notes
        }
      ]
    };
  }

  function closeModal() {
    elements.modal.close();
    elements.form.reset();
    state.modalMode = null;
    state.editIds = null;
  }

  function getFormPayload() {
    const formData = new FormData(elements.form);
    return {
      name: String(formData.get("name") || "").trim(),
      color: String(formData.get("color") || "").trim(),
      subjectId: String(formData.get("subjectId") || "").trim(),
      chapterId: String(formData.get("chapterId") || "").trim(),
      notes: String(formData.get("notes") || "").trim()
    };
  }

  function submitModal(event) {
    event.preventDefault();
    const payload = getFormPayload();

    try {
      syllabus.saveEntry(storage, state.modalMode, state.editIds, payload);
      closeModal();
    } catch (error) {
      alert(error.message);
    }
  }

  function renderDashboard(data) {
    const { chapters, topics } = flattenData(data);
    const completed = topics.filter((topic) => topic.complete).length;
    const progress = calculateProgress(topics);

    elements.overallProgress.textContent = `${progress}%`;
    elements.overallProgressLabel.textContent = topics.length
      ? `${completed} of ${topics.length} topics complete`
      : "No topics completed yet";
    elements.totalSubjects.textContent = data.subjects.length;
    elements.totalChapters.textContent = chapters.length;
    elements.totalTopics.textContent = topics.length;

    const recentTopics = topics
      .slice()
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5);

    elements.recentTopicsList.innerHTML = recentTopics.length
      ? recentTopics
          .map(
            (topic) => `
              <li>
                <div>
                  <strong>${escapeHtml(topic.name)}</strong>
                  <div class="item-meta">${escapeHtml(topic.subjectName)} · ${escapeHtml(topic.chapterName)}</div>
                </div>
                <span class="status-pill ${topic.complete ? "complete" : ""}">
                  ${topic.complete ? "Complete" : "Pending"}
                </span>
              </li>
            `
          )
          .join("")
      : '<li class="empty-state">Add topics to see recent activity.</li>';

    renderChart(completed, topics.length - completed);
  }

  function renderChart(completed, pending) {
    const canvas = document.getElementById("progressChart");
    if (!canvas || !window.Chart) return;

    const chartData = {
      labels: ["Complete", "Pending"],
      datasets: [
        {
          data: [completed, pending],
          backgroundColor: ["#0f9f6e", "#d9e1eb"],
          borderWidth: 0
        }
      ]
    };

    if (state.progressChart) {
      state.progressChart.data = chartData;
      state.progressChart.update();
      return;
    }

    state.progressChart = new Chart(canvas, {
      type: "doughnut",
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            position: "bottom"
          }
        }
      }
    });
  }

  function renderFilters(data) {
    const subjectFilterMarkup =
      '<option value="all">All subjects</option>' +
      data.subjects.map((subject) => `<option value="${subject.id}">${escapeHtml(subject.name)}</option>`).join("");

    const previousChapterFilter = elements.chapterSubjectFilter.value || "all";
    const previousTopicSubjectFilter = elements.topicSubjectFilter.value || "all";

    elements.chapterSubjectFilter.innerHTML = subjectFilterMarkup;
    elements.topicSubjectFilter.innerHTML = subjectFilterMarkup;
    elements.chapterSubjectFilter.value = data.subjects.some((subject) => subject.id === previousChapterFilter)
      ? previousChapterFilter
      : "all";
    elements.topicSubjectFilter.value = data.subjects.some((subject) => subject.id === previousTopicSubjectFilter)
      ? previousTopicSubjectFilter
      : "all";
  }

  function renderSubjects(data) {
    elements.subjectsList.innerHTML = data.subjects.length
      ? data.subjects
          .map((subject) => {
            const topics = subject.chapters.flatMap((chapter) => chapter.topics);
            const progress = calculateProgress(topics);
            return `
              <article class="item-card" style="border-top: 4px solid ${escapeHtml(subject.color)}">
                <div>
                  <h3>${escapeHtml(subject.name)}</h3>
                  <div class="item-meta">${subject.chapters.length} chapters · ${topics.length} topics</div>
                </div>
                <div class="progress-track" aria-label="${progress}% complete">
                  <span class="progress-bar" style="width: ${progress}%"></span>
                </div>
                <div class="item-meta">${progress}% complete</div>
                <div class="card-actions">
                  <button class="text-button" type="button" data-action="edit-subject" data-subject-id="${subject.id}">Edit</button>
                  <button class="text-button danger" type="button" data-action="delete-subject" data-subject-id="${subject.id}">Delete</button>
                </div>
              </article>
            `;
          })
          .join("")
      : '<article class="empty-panel"><h3>No subjects yet</h3><p>Create a subject to start organizing chapters and topics.</p></article>';
  }

  function renderChapters(data) {
    const selectedSubjectId = elements.chapterSubjectFilter.value;
    const chapters = data.subjects.flatMap((subject) =>
      subject.chapters.map((chapter) => ({ ...chapter, subjectName: subject.name, subjectColor: subject.color }))
    );
    const filtered = selectedSubjectId === "all" ? chapters : chapters.filter((chapter) => chapter.subjectId === selectedSubjectId);

    elements.chaptersList.innerHTML = filtered.length
      ? filtered
          .map((chapter) => {
            const progress = calculateProgress(chapter.topics);
            return `
              <article class="item-card" style="border-top: 4px solid ${escapeHtml(chapter.subjectColor)}">
                <div>
                  <h3>${escapeHtml(chapter.name)}</h3>
                  <div class="item-meta">${escapeHtml(chapter.subjectName)} · ${chapter.topics.length} topics</div>
                </div>
                <div class="progress-track" aria-label="${progress}% complete">
                  <span class="progress-bar" style="width: ${progress}%"></span>
                </div>
                <div class="item-meta">${progress}% complete</div>
                <div class="card-actions">
                  <button class="text-button" type="button" data-action="edit-chapter" data-subject-id="${chapter.subjectId}" data-chapter-id="${chapter.id}">Edit</button>
                  <button class="text-button danger" type="button" data-action="delete-chapter" data-subject-id="${chapter.subjectId}" data-chapter-id="${chapter.id}">Delete</button>
                </div>
              </article>
            `;
          })
          .join("")
      : '<article class="empty-panel"><h3>No chapters yet</h3><p>Add chapters inside each subject to build your syllabus map.</p></article>';
  }

  function renderTopics(data) {
    const { topics } = flattenData(data);
    const subjectFilter = elements.topicSubjectFilter.value;
    const statusFilter = elements.topicStatusFilter.value;
    const filtered = topics.filter((topic) => {
      const subjectMatches = subjectFilter === "all" || topic.subjectId === subjectFilter;
      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "complete" && topic.complete) ||
        (statusFilter === "pending" && !topic.complete);
      return subjectMatches && statusMatches;
    });

    elements.topicsList.innerHTML = filtered.length
      ? filtered
          .map(
            (topic) => `
              <article class="list-row">
                <div>
                  <strong>${escapeHtml(topic.name)}</strong>
                  <div class="item-meta">${escapeHtml(topic.subjectName)} · ${escapeHtml(topic.chapterName)}</div>
                  ${topic.notes ? `<div class="item-meta">${escapeHtml(topic.notes)}</div>` : ""}
                </div>
                <div class="card-actions">
                  <button class="text-button" type="button" data-action="toggle-topic" data-subject-id="${topic.subjectId}" data-chapter-id="${topic.chapterId}" data-topic-id="${topic.id}">
                    ${topic.complete ? "Mark Pending" : "Mark Complete"}
                  </button>
                  <button class="text-button" type="button" data-action="edit-topic" data-subject-id="${topic.subjectId}" data-chapter-id="${topic.chapterId}" data-topic-id="${topic.id}">Edit</button>
                  <button class="text-button danger" type="button" data-action="delete-topic" data-subject-id="${topic.subjectId}" data-chapter-id="${topic.chapterId}" data-topic-id="${topic.id}">Delete</button>
                </div>
              </article>
            `
          )
          .join("")
      : '<article class="empty-panel"><h3>No topics yet</h3><p>Break chapters into small topics and mark them complete as you study.</p></article>';
  }

  function renderReports(data) {
    elements.reportsList.innerHTML = data.subjects.length
      ? data.subjects
          .map((subject) => {
            const topics = subject.chapters.flatMap((chapter) => chapter.topics);
            const completed = topics.filter((topic) => topic.complete).length;
            const progress = calculateProgress(topics);
            return `
              <article class="list-row">
                <div>
                  <strong>${escapeHtml(subject.name)}</strong>
                  <div class="item-meta">${completed} of ${topics.length} topics complete · ${subject.chapters.length} chapters</div>
                </div>
                <div class="progress-track" style="min-width: 180px" aria-label="${progress}% complete">
                  <span class="progress-bar" style="width: ${progress}%; background: ${escapeHtml(subject.color)}"></span>
                </div>
                <strong>${progress}%</strong>
              </article>
            `;
          })
          .join("")
      : '<article class="empty-panel"><h3>No report data</h3><p>Reports appear once subjects and topics are available.</p></article>';
  }

  function render() {
    const data = storage.getData();
    syllabus.renderFilters(data, elements);
    dashboard.renderDashboard(data, elements);
    syllabus.renderSubjects(data, elements.subjectsList);
    syllabus.renderChapters(data, elements);
    syllabus.renderTopics(data, elements);
    dashboard.renderReports(data, elements.reportsList);
    renderSettings(data);
  }

  function renderSettings(data) {
    if (!elements.settingsSummary) return;

    const { chapters, topics } = dashboard.flattenData(data);
    const completed = topics.filter((topic) => topic.complete).length;

    elements.settingsSummary.innerHTML = `
      <span>Subjects: ${data.subjects.length}</span>
      <span>Chapters: ${chapters.length}</span>
      <span>Topics: ${topics.length}</span>
      <span>Completed: ${completed}</span>
    `;
  }

  function setImportStatus(message) {
    if (elements.importStatus) {
      elements.importStatus.textContent = message;
    }
  }

  function exportJson() {
    const backup = {
      app: "Syllabus Tracker",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: storage.getData()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `syllabus-tracker-backup-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setImportStatus("Export complete. Your JSON backup has been downloaded.");
  }

  function normalizeImportedJson(parsed) {
    if (parsed && parsed.data && Array.isArray(parsed.data.subjects)) {
      return parsed.data;
    }

    if (parsed && Array.isArray(parsed.subjects)) {
      return parsed;
    }

    throw new Error("Import failed. Choose a valid Syllabus Tracker JSON file.");
  }

  function importJsonFile(file) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
      setImportStatus("Import failed. Please choose a JSON file.");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const data = normalizeImportedJson(parsed);
        storage.replaceData(data);
        setImportStatus("Import complete. Your syllabus data has been restored.");
      } catch (error) {
        setImportStatus(error.message);
      } finally {
        elements.importJsonInput.value = "";
      }
    });
    reader.addEventListener("error", () => {
      setImportStatus("Import failed. The selected file could not be read.");
      elements.importJsonInput.value = "";
    });
    reader.readAsText(file);
  }

  function resetData() {
    const confirmed = confirm("Reset all syllabus data saved on this device?");
    if (!confirmed) return;

    storage.clearData();
    setImportStatus("All local syllabus data has been reset.");
    setView("dashboard");
  }

  function handleAction(target) {
    const actionButton = target.closest("[data-action]");
    if (!actionButton) return;

    const { action, subjectId, chapterId, topicId } = actionButton.dataset;

    try {
      if (action.startsWith("add") || action.startsWith("edit")) {
        openModal(action, { subjectId, chapterId, topicId });
        return;
      }

      if (action === "delete-subject" && confirm("Delete this subject and all of its chapters and topics?")) {
        syllabus.deleteEntry(storage, action, { subjectId });
      }
      if (action === "delete-chapter" && confirm("Delete this chapter and all of its topics?")) {
        syllabus.deleteEntry(storage, action, { subjectId, chapterId });
      }
      if (action === "delete-topic" && confirm("Delete this topic?")) {
        syllabus.deleteEntry(storage, action, { subjectId, chapterId, topicId });
      }
      if (action === "toggle-topic") {
        syllabus.toggleTopic(storage, { subjectId, chapterId, topicId });
      }
    } catch (error) {
      alert(error.message);
    }
  }

  function handleQuickAdd() {
    const actions = {
      dashboard: "add-subject",
      subjects: "add-subject",
      chapters: "add-chapter",
      topics: "add-topic",
      reports: "add-topic",
      settings: "add-subject"
    };
    openModal(actions[state.currentView]);
  }

  function bindEvents() {
    elements.navLinks.forEach((link) => {
      link.addEventListener("click", () => setView(link.dataset.view));
    });
    elements.menuToggle.addEventListener("click", openMobileMenu);
    elements.mobileBackdrop.addEventListener("click", closeMobileMenu);
    elements.quickAddButton.addEventListener("click", handleQuickAdd);
    elements.themeToggle.addEventListener("click", () => {
      const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
      applyTheme(storage.setTheme(nextTheme));
      renderChartAgain();
    });
    elements.settingsThemeToggle.addEventListener("click", () => {
      const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
      applyTheme(storage.setTheme(nextTheme));
      renderChartAgain();
    });
    elements.exportJsonButton.addEventListener("click", exportJson);
    elements.importJsonButton.addEventListener("click", () => elements.importJsonInput.click());
    elements.importJsonInput.addEventListener("change", () => importJsonFile(elements.importJsonInput.files[0]));
    elements.resetDataButton.addEventListener("click", resetData);
    elements.form.addEventListener("submit", submitModal);
    elements.modalCloseButton.addEventListener("click", closeModal);
    elements.modalCancelButton.addEventListener("click", closeModal);
    elements.chapterSubjectFilter.addEventListener("change", render);
    elements.topicSubjectFilter.addEventListener("change", render);
    elements.topicStatusFilter.addEventListener("change", render);
    document.addEventListener("click", (event) => handleAction(event.target));
    storage.subscribe(render);
  }

  function renderChartAgain() {
    dashboard.destroyChart();
    dashboard.renderDashboard(storage.getData(), elements);
  }

  function registerOfflineSupport() {
    if (!("serviceWorker" in navigator) || window.location.protocol === "file:") return;

    const register = () => {
      navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {
        // The app still works without service worker support.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }

  function init() {
    if (!storage || !dashboard || !syllabus) {
      console.error("Required syllabus modules are unavailable.");
      return;
    }

    applyTheme(storage.getTheme());
    bindEvents();
    render();
    registerOfflineSupport();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
