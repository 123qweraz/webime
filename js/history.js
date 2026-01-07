let HISTORY = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");

function saveHistory() {
    const maxHistoryItems = 50;
    if (HISTORY.length > maxHistoryItems) {
        HISTORY = HISTORY.slice(0, maxHistoryItems);
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(HISTORY));
    updateHistoryUI(HISTORY);
}

function updateHistoryUI(historyItems) {
    try {
        const historyList = document.getElementById("historyList");
        if (!historyList) return;

        historyList.innerHTML = "";

        if (!historyItems || historyItems.length === 0) {
            const emptyItem = document.createElement("li");
            emptyItem.className = "history-item empty";
            emptyItem.textContent = "暂无输入历史";
            historyList.appendChild(emptyItem);
            return;
        }

        historyItems.slice(0, 20).forEach((item, index) => {
            const listItem = document.createElement("li");
            listItem.className = "history-item";

            const timeSpan = document.createElement("span");
            timeSpan.className = "history-time";
            if (item.timestamp) {
                const date = new Date(item.timestamp);
                timeSpan.textContent = date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                });
            } else {
                timeSpan.textContent = "刚刚";
            }

            const textSpan = document.createElement("span");
            textSpan.className = "history-text";
            textSpan.textContent = item.text || item;

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "×";
            deleteButton.className = "history-delete-btn";
            deleteButton.onclick = (event) => {
                event.stopPropagation();
                deleteHistoryItem(index);
            };

            listItem.appendChild(timeSpan);
            listItem.appendChild(textSpan);
            listItem.appendChild(deleteButton);

            listItem.addEventListener("click", () => {
                const textToInsert = item.text || item;
                committed += textToInsert;
                update();
            });

            historyList.appendChild(listItem);
        });
    } catch (error) {
        console.error("更新剪切板UI失败:", error);
    }
}

function clearHistory() {
    if (confirm("确定要清空所有输入历史吗？")) {
        HISTORY = [];
        saveHistory();
    }
}

function deleteHistoryItem(index) {
    if (index >= 0 && index < HISTORY.length) {
        HISTORY.splice(index, 1);
        saveHistory();
    }
}

function toggleHistoryPanel() {
    const historyPanel = document.getElementById("historyPanel");
    const isVisible = window.getComputedStyle(historyPanel).display === "flex";
    const newVisibility = !isVisible;
    historyPanel.style.display = newVisibility ? "flex" : "none";

    const histBtn = document.getElementById("l-hist-btn");
    histBtn.classList.toggle("active", newVisibility);

    settings.history = newVisibility;
    saveSettings();
}

function archiveAndCopy() {
    try {
        if (committed.trim()) {
            HISTORY.unshift({
                text: committed,
                timestamp: Date.now(),
            });
            saveHistory();

            navigator.clipboard.writeText(committed)
                .then(() => {
                    committed = "";
                    update();
                    showToast("已归档并复制到剪切板", "success");
                })
                .catch((err) => {
                    console.error("复制失败:", err);
                    showToast("复制失败", "error");
                });
        } else {
            showToast("没有内容可复制", "warning");
        }
    } catch (error) {
        console.error("归档复制失败:", error);
        showToast("操作失败", "error");
    }
}
