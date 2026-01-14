#!/bin/bash
set -e

# 检查 wasm-pack 是否安装
if ! command -v wasm-pack &> /dev/null; then
    echo "错误: 未检测到 wasm-pack。"
    echo "请运行以下命令安装（需要 root 权限或 Rust 环境支持）："
    echo "curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh"
    echo "或者（如果你有耐心等待编译）："
    echo "cargo install wasm-pack"
    exit 1
fi

echo "正在编译 Rust 核心为 WebAssembly..."
cd rust_core
wasm-pack build --target web --out-dir ../js/pkg

echo "========================================"
echo "编译成功！WASM 文件已生成在 js/pkg/ 目录下。"
echo "========================================"
