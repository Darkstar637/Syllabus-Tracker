(function () {
  "use strict";

  const STORAGE_KEY = "syllabus-tracker:data:v1";
  const THEME_KEY = "syllabus-tracker:theme";

  const fallbackColors = ["#2563eb", "#0f9f6e", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];
  const listeners = new Set();

  function createId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}_${window.crypto.randomUUID()}`;
    }

    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function now() {
    return new Date().toISOString();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function emptyData() {
    return {
      subjects: [],
      updatedAt: now()
    };
  }

  function cleanText(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function normalizeData(raw) {
    const data = raw && Array.isArray(raw.subjects) ? raw : emptyData();

    return {
      subjects: data.subjects.map((subject, subjectIndex) => {
        const subjectId = subject.id || createId("subject");
        const chapters = Array.isArray(subject.chapters) ? subject.chapters : [];

        return {
          id: subjectId,
          name: cleanText(subject.name) || `Subject ${subjectIndex + 1}`,
          color: subject.color || fallbackColors[subjectIndex % fallbackColors.length],
          createdAt: subject.createdAt || now(),
          updatedAt: subject.updatedAt || now(),
          chapters: chapters.map((chapter, chapterIndex) => {
            const chapterId = chapter.id || createId("chapter");
            const topics = Array.isArray(chapter.topics) ? chapter.topics : [];

            return {
              id: chapterId,
              subjectId,
              name: cleanText(chapter.name) || `Chapter ${chapterIndex + 1}`,
              createdAt: chapter.createdAt || now(),
              updatedAt: chapter.updatedAt || now(),
              topics: topics.map((topic, topicIndex) => ({
                id: topic.id || createId("topic"),
                subjectId,
                chapterId,
                name: cleanText(topic.name) || `Topic ${topicIndex + 1}`,
                notes: String(topic.notes || "").trim(),
                complete: Boolean(topic.complete),
                createdAt: topic.createdAt || now(),
                updatedAt: topic.updatedAt || now(),
                completedAt: topic.complete ? topic.completedAt || now() : null
              }))
            };
          })
        };
      }),
      updatedAt: data.updatedAt || now()
    };
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return normalizeData(raw ? JSON.parse(raw) : emptyData());
    } catch (error) {
      console.warn("Unable to read saved syllabus data. Starting fresh.", error);
      return emptyData();
    }
  }

  function persist() {
    state.updatedAt = now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    listeners.forEach((listener) => listener(getData()));
  }

  function getData() {
    return clone(state);
  }

  function subscribe(listener) {
    listeners.add(listener);
    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  function findSubject(subjectId) {
    return state.subjects.find((subject) => subject.id === subjectId);
  }

  function findChapter(subjectId, chapterId) {
    const subject = findSubject(subjectId);
    if (!subject) return null;
    return subject.chapters.find((chapter) => chapter.id === chapterId);
  }

  function validateName(value, label) {
    const name = cleanText(value);
    if (!name) {
      throw new Error(`${label} name is required.`);
    }
    if (name.length > 80) {
      throw new Error(`${label} name must be 80 characters or fewer.`);
    }
    return name;
  }

  function ensureSubject(subjectId) {
    const subject = findSubject(subjectId);
    if (!subject) {
      throw new Error("Choose a valid subject.");
    }
    return subject;
  }

  function ensureChapter(subjectId, chapterId) {
    const chapter = findChapter(subjectId, chapterId);
    if (!chapter) {
      throw new Error("Choose a valid chapter.");
    }
    return chapter;
  }

  function assertUniqueSubjectName(name, ignoredId) {
    const exists = state.subjects.some(
      (subject) => subject.id !== ignoredId && subject.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      throw new Error("A subject with this name already exists.");
    }
  }

  function assertUniqueChapterName(subject, name, ignoredId) {
    const exists = subject.chapters.some(
      (chapter) => chapter.id !== ignoredId && chapter.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      throw new Error("This subject already has a chapter with that name.");
    }
  }

  function assertUniqueTopicName(chapter, name, ignoredId) {
    const exists = chapter.topics.some(
      (topic) => topic.id !== ignoredId && topic.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      throw new Error("This chapter already has a topic with that name.");
    }
  }

  function addSubject(payload) {
    const name = validateName(payload.name, "Subject");
    assertUniqueSubjectName(name);

    const subject = {
      id: createId("subject"),
      name,
      color: payload.color || fallbackColors[state.subjects.length % fallbackColors.length],
      createdAt: now(),
      updatedAt: now(),
      chapters: []
    };

    state.subjects.push(subject);
    persist();
    return clone(subject);
  }

  function updateSubject(subjectId, payload) {
    const subject = ensureSubject(subjectId);
    const name = validateName(payload.name, "Subject");
    assertUniqueSubjectName(name, subjectId);

    subject.name = name;
    subject.color = payload.color || subject.color;
    subject.updatedAt = now();
    persist();
    return clone(subject);
  }

  function deleteSubject(subjectId) {
    const before = state.subjects.length;
    state.subjects = state.subjects.filter((subject) => subject.id !== subjectId);
    if (state.subjects.length === before) {
      throw new Error("Subject not found.");
    }
    persist();
  }

  function addChapter(payload) {
    const subject = ensureSubject(payload.subjectId);
    const name = validateName(payload.name, "Chapter");
    assertUniqueChapterName(subject, name);

    const chapter = {
      id: createId("chapter"),
      subjectId: subject.id,
      name,
      createdAt: now(),
      updatedAt: now(),
      topics: []
    };

    subject.chapters.push(chapter);
    subject.updatedAt = now();
    persist();
    return clone(chapter);
  }

  function updateChapter(subjectId, chapterId, payload) {
    const currentSubject = ensureSubject(subjectId);
    const nextSubject = ensureSubject(payload.subjectId || subjectId);
    const chapter = ensureChapter(subjectId, chapterId);
    const name = validateName(payload.name, "Chapter");

    assertUniqueChapterName(nextSubject, name, chapterId);
    chapter.name = name;
    chapter.subjectId = nextSubject.id;
    chapter.updatedAt = now();

    if (currentSubject.id !== nextSubject.id) {
      currentSubject.chapters = currentSubject.chapters.filter((item) => item.id !== chapterId);
      chapter.topics.forEach((topic) => {
        topic.subjectId = nextSubject.id;
        topic.updatedAt = now();
      });
      nextSubject.chapters.push(chapter);
      currentSubject.updatedAt = now();
    }

    nextSubject.updatedAt = now();
    persist();
    return clone(chapter);
  }

  function deleteChapter(subjectId, chapterId) {
    const subject = ensureSubject(subjectId);
    const before = subject.chapters.length;
    subject.chapters = subject.chapters.filter((chapter) => chapter.id !== chapterId);
    if (subject.chapters.length === before) {
      throw new Error("Chapter not found.");
    }
    subject.updatedAt = now();
    persist();
  }

  function addTopic(payload) {
    const subject = ensureSubject(payload.subjectId);
    const chapter = ensureChapter(subject.id, payload.chapterId);
    const name = validateName(payload.name, "Topic");
    assertUniqueTopicName(chapter, name);

    const topic = {
      id: createId("topic"),
      subjectId: subject.id,
      chapterId: chapter.id,
      name,
      notes: String(payload.notes || "").trim(),
      complete: Boolean(payload.complete),
      createdAt: now(),
      updatedAt: now(),
      completedAt: payload.complete ? now() : null
    };

    chapter.topics.push(topic);
    chapter.updatedAt = now();
    subject.updatedAt = now();
    persist();
    return clone(topic);
  }

  function updateTopic(subjectId, chapterId, topicId, payload) {
    const currentChapter = ensureChapter(subjectId, chapterId);
    const nextSubject = ensureSubject(payload.subjectId || subjectId);
    const nextChapter = ensureChapter(nextSubject.id, payload.chapterId || chapterId);
    const topic = currentChapter.topics.find((item) => item.id === topicId);
    const name = validateName(payload.name, "Topic");

    if (!topic) {
      throw new Error("Topic not found.");
    }

    assertUniqueTopicName(nextChapter, name, topicId);
    topic.name = name;
    topic.notes = String(payload.notes || "").trim();
    topic.subjectId = nextSubject.id;
    topic.chapterId = nextChapter.id;
    topic.updatedAt = now();

    if (typeof payload.complete === "boolean" && payload.complete !== topic.complete) {
      topic.complete = payload.complete;
      topic.completedAt = payload.complete ? now() : null;
    }

    if (currentChapter.id !== nextChapter.id) {
      currentChapter.topics = currentChapter.topics.filter((item) => item.id !== topicId);
      nextChapter.topics.push(topic);
      currentChapter.updatedAt = now();
    }

    nextChapter.updatedAt = now();
    nextSubject.updatedAt = now();
    persist();
    return clone(topic);
  }

  function toggleTopic(subjectId, chapterId, topicId) {
    const chapter = ensureChapter(subjectId, chapterId);
    const topic = chapter.topics.find((item) => item.id === topicId);
    const subject = ensureSubject(subjectId);

    if (!topic) {
      throw new Error("Topic not found.");
    }

    topic.complete = !topic.complete;
    topic.completedAt = topic.complete ? now() : null;
    topic.updatedAt = now();
    chapter.updatedAt = now();
    subject.updatedAt = now();
    persist();
    return clone(topic);
  }

  function deleteTopic(subjectId, chapterId, topicId) {
    const chapter = ensureChapter(subjectId, chapterId);
    const subject = ensureSubject(subjectId);
    const before = chapter.topics.length;

    chapter.topics = chapter.topics.filter((topic) => topic.id !== topicId);
    if (chapter.topics.length === before) {
      throw new Error("Topic not found.");
    }

    chapter.updatedAt = now();
    subject.updatedAt = now();
    persist();
  }

  function replaceData(nextData) {
    state = normalizeData(nextData);
    persist();
  }

  function clearData() {
    state = emptyData();
    persist();
  }

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || "light";
  }

  function setTheme(theme) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    localStorage.setItem(THEME_KEY, nextTheme);
    return nextTheme;
  }

  window.SyllabusStorage = {
    getData,
    subscribe,
    addSubject,
    updateSubject,
    deleteSubject,
    addChapter,
    updateChapter,
    deleteChapter,
    addTopic,
    updateTopic,
    toggleTopic,
    deleteTopic,
    replaceData,
    clearData,
    getTheme,
    setTheme
  };
})();
