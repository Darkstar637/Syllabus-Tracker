(function () {
  "use strict";

  let progressChart = null;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function flattenData(data) {
    const chapters = [];
    const topics = [];

    data.subjects.forEach((subject) => {
      subject.chapters.forEach((chapter) => {
        chapters.push({
          ...chapter,
          subjectName: subject.name,
          subjectColor: subject.color
        });

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
    if (!topics.length) return 0;
    const completed = topics.filter((topic) => topic.complete).length;
    return Math.round((completed / topics.length) * 100);
  }

  function renderSummaryCards(data, elements) {
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

    return { completed, pending: topics.length - completed, topics };
  }

  function renderRecentTopics(topics, listElement) {
    const recentTopics = topics
      .slice()
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5);

    listElement.innerHTML = recentTopics.length
      ? recentTopics
          .map(
            (topic) => `
              <li>
                <div>
                  <strong>${escapeHtml(topic.name)}</strong>
                  <div class="item-meta">${escapeHtml(topic.subjectName)} &middot; ${escapeHtml(topic.chapterName)}</div>
                </div>
                <span class="status-pill ${topic.complete ? "complete" : ""}">
                  ${topic.complete ? "Complete" : "Pending"}
                </span>
              </li>
            `
          )
          .join("")
      : '<li class="empty-state">Add topics to see recent activity.</li>';
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

    if (progressChart) {
      progressChart.data = chartData;
      progressChart.update();
      return;
    }

    progressChart = new Chart(canvas, {
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

  function destroyChart() {
    if (progressChart) {
      progressChart.destroy();
      progressChart = null;
    }
  }

  function renderDashboard(data, elements) {
    const summary = renderSummaryCards(data, elements);
    renderRecentTopics(summary.topics, elements.recentTopicsList);
    renderChart(summary.completed, summary.pending);
  }

  function renderReports(data, reportsList) {
    reportsList.innerHTML = data.subjects.length
      ? data.subjects
          .map((subject) => {
            const topics = subject.chapters.flatMap((chapter) => chapter.topics);
            const completed = topics.filter((topic) => topic.complete).length;
            const progress = calculateProgress(topics);

            return `
              <article class="list-row">
                <div>
                  <strong>${escapeHtml(subject.name)}</strong>
                  <div class="item-meta">${completed} of ${topics.length} topics complete &middot; ${subject.chapters.length} chapters</div>
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

  window.SyllabusDashboard = {
    calculateProgress,
    destroyChart,
    escapeHtml,
    flattenData,
    renderDashboard,
    renderReports
  };
})();
