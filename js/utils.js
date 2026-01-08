/**
 * 显示Toast提示消息
 */
function showToast(message, type = "info", duration = 3000) {
    try {
        const existingToast = document.getElementById("inputMethodToast");
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement("div");
        toast.id = "inputMethodToast";
        toast.className = `input-method-toast toast-${type}`;

        const toastContent = document.createElement("div");
        toastContent.className = "toast-content";
        toastContent.textContent = message;

        const toastIcon = document.createElement("span");
        toastIcon.className = "toast-icon";
        const iconMap = {
            success: "✓",
            error: "✗",
            warning: "⚠",
            info: "ℹ",
        };
        toastIcon.textContent = iconMap[type] || iconMap.info;

        toast.appendChild(toastIcon);
        toast.appendChild(toastContent);

        const closeBtn = document.createElement("button");
        closeBtn.className = "toast-close";
        closeBtn.innerHTML = "&times;";
        closeBtn.onclick = () => toast.remove();
        toast.appendChild(closeBtn);

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("show");
        }, 10);

        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.classList.remove("show");
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.remove();
                        }
                    }, 300);
                }
            }, duration);
        }
    } catch (error) {
        console.error("显示Toast失败:", error);
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

/**
 * 显示错误消息
 */
function showErrorMessage(message, error = null) {
    console.error("输入法错误:", message, error);
    showToast(
        `${message}${error ? ": " + error.message : ""}`,
        "error",
        5000,
    );
}

/**
 * 显示加载消息
 */
function showLoadingMessage(message) {
    try {
        const loadingOverlay = document.getElementById("loading-overlay");
        const messageElement = loadingOverlay.querySelector("p");
        if (message) {
            messageElement.textContent = message;
        }
        loadingOverlay.style.display = "flex";
    } catch (error) {
        console.error("显示加载消息失败:", error);
    }
}

/**
 * 隐藏加载消息
 */
function hideLoadingMessage() {
    try {
        const loadingOverlay = document.getElementById("loading-overlay");
        loadingOverlay.style.display = "none";
    } catch (error) {
        console.error("隐藏加载消息失败:", error);
    }
}

/**
 * 转义HTML
 */
function escapeHtml(text = "") {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * 保存设置
 */
function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
