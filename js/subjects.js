(function () {
  "use strict";

  function escapeHtml(value) {
    if (window.SyllabusDashboard) {
      return window.SyllabusDashboard.escapeHtml(value);
    }

    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function calculateProgress(topics) {
    return window.SyllabusDashboard ? window.SyllabusDashboard.calculateProgress(topics) : 0;
  }

  function flattenData(data) {
    return window.SyllabusDashboard ? window.SyllabusDashboard.flattenData(data) : { chapters: [], topics: [] };
  }

  function subjectOptions(data) {
    return data.subjects.map((subject) => ({
      value: subject.id,
      label: subject.name
    }));
  }

  function chapterOptions(data, subjectId) {
    const subject = data.subjects.find((item) => item.id === subjectId) || data.subjects[0];
    if (!subject) return [];

    return subject.chapters.map((chapter) => ({
      value: chapter.id,
      label: chapter.name
    }));
  }

  function renderFilters(data, elements) {
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

  function renderSubjects(data, subjectsList) {
    subjectsList.innerHTML = data.subjects.length
      ? data.subjects
          .map((subject) => {
            const topics = subject.chapters.flatMap((chapter) => chapter.topics);
            const progress = calculateProgress(topics);

            return `
              <article class="item-card" style="border-top: 4px solid ${escapeHtml(subject.color)}">
                <div>
                  <h3>${escapeHtml(subject.name)}</h3>
                  <div class="item-meta">${subject.chapters.length} chapters &middot; ${topics.length} topics</div>
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

  function renderChapters(data, elements) {
    const selectedSubjectId = elements.chapterSubjectFilter.value;
    const chapters = data.subjects.flatMap((subject) =>
      subject.chapters.map((chapter) => ({
        ...chapter,
        subjectName: subject.name,
        subjectColor: subject.color
      }))
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
                  <div class="item-meta">${escapeHtml(chapter.subjectName)} &middot; ${chapter.topics.length} topics</div>
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

  function renderTopics(data, elements) {
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
                  <div class="item-meta">${escapeHtml(topic.subjectName)} &middot; ${escapeHtml(topic.chapterName)}</div>
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

  function saveEntry(storage, mode, ids, payload) {
    switch (mode) {
      case "add-subject":
        return storage.addSubject(payload);
      case "edit-subject":
        return storage.updateSubject(ids.subjectId, payload);
      case "add-chapter":
        return storage.addChapter(payload);
      case "edit-chapter":
        return storage.updateChapter(ids.subjectId, ids.chapterId, payload);
      case "add-topic":
        return storage.addTopic(payload);
      case "edit-topic":
        return storage.updateTopic(ids.subjectId, ids.chapterId, ids.topicId, payload);
      default:
        throw new Error("Unknown form action.");
    }
  }

  function deleteEntry(storage, action, ids) {
    if (action === "delete-subject") {
      storage.deleteSubject(ids.subjectId);
      return;
    }

    if (action === "delete-chapter") {
      storage.deleteChapter(ids.subjectId, ids.chapterId);
      return;
    }

    if (action === "delete-topic") {
      storage.deleteTopic(ids.subjectId, ids.chapterId, ids.topicId);
    }
  }

  function toggleTopic(storage, ids) {
    return storage.toggleTopic(ids.subjectId, ids.chapterId, ids.topicId);
  }

  window.SyllabusSubjects = {
    chapterOptions,
    deleteEntry,
    renderChapters,
    renderFilters,
    renderSubjects,
    renderTopics,
    saveEntry,
    subjectOptions,
    toggleTopic
  };
})();
