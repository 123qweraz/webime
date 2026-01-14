import init, { WebImeEngine } from './pkg/webime_core.js';

let rustEngineInstance = null;

async function initWasm() {
    try {
        console.log("正在加载 Rust WASM 核心...");
        await init();
        rustEngineInstance = new WebImeEngine();
        
        // 将 Rust 引擎挂载到全局对象，供 ime.js 使用
        window.RustEngine = rustEngineInstance;
        window.isRustReady = true;
        
        console.log("🚀 Rust WASM 核心引擎已启动！");
        console.log("测试 Rust 响应:", window.RustEngine.ping());
        
        // 触发自定义事件，通知 dict-manager 等模块可以开始加载数据了
        window.dispatchEvent(new CustomEvent('rust-engine-ready'));
        
    } catch (e) {
        console.error("Rust WASM 初始化失败:", e);
        console.warn("将回退到纯 JS 模式运行。");
    }
}

// 启动加载
initWasm();
