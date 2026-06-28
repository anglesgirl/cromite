#!/bin/bash
# 应用 AO3 Browser 补丁到 Cromite 源码树
# 用法: 在 chromium/src 目录下执行
#   bash /path/to/ao3-browser/apply-ao3-patches.sh

set -e

PATCH_DIR="$(cd "$(dirname "$0")" && pwd)/patches"
EXT_SRC_DIR="$(cd "$(dirname "$0")" && pwd)/extension"

echo "=== AO3 Browser: 应用补丁 ==="

# 1. DoH 补丁
echo "[1/5] 应用 DoH (Cloudflare Gateway) 补丁..."
git am --no-verify "$PATCH_DIR/Add-AO3-DoH-provider.patch" || {
    echo "DoH 补丁应用失败,尝试 patch 命令..."
    patch -p1 < "$PATCH_DIR/Add-AO3-DoH-provider.patch"
}

# 2. ECH 补丁
echo "[2/5] 应用 ECH 强制启用补丁..."
git am --no-verify "$PATCH_DIR/Force-enable-ECH.patch" || {
    echo "ECH 补丁应用失败,尝试 patch 命令..."
    patch -p1 < "$PATCH_DIR/Force-enable-ECH.patch"
}

# 3. 搜索引擎补丁
echo "[3/5] 应用 AO3 搜索引擎补丁..."
git am --no-verify "$PATCH_DIR/Add-AO3-search-engine.patch" || {
    echo "搜索引擎补丁应用失败,尝试 patch 命令..."
    patch -p1 < "$PATCH_DIR/Add-AO3-search-engine.patch"
}

# 4. 品牌+精简UI+内置扩展补丁
echo "[4/5] 应用品牌/精简UI/内置扩展补丁..."
git am --no-verify "$PATCH_DIR/AO3-Browser-branding-and-slim-UI.patch" || {
    echo "品牌补丁应用失败,尝试 patch 命令..."
    patch -p1 < "$PATCH_DIR/AO3-Browser-branding-and-slim-UI.patch"
}

# 5. 复制扩展文件到源码树
echo "[5/5] 复制 AO3 Translator 扩展文件..."
EXT_DEST="chrome/browser/extensions/default_extensions/ao3-translator"
mkdir -p "$EXT_DEST"
cp "$EXT_SRC_DIR/manifest.json" "$EXT_DEST/"
cp "$EXT_SRC_DIR/background.js" "$EXT_DEST/"
cp "$EXT_SRC_DIR/gm-polyfill.js" "$EXT_DEST/"
cp "$EXT_SRC_DIR/zh-cn.js" "$EXT_DEST/"
cp "$EXT_SRC_DIR/ao3-chinese.user.js" "$EXT_DEST/"
mkdir -p "$EXT_DEST/assets"
cp "$EXT_SRC_DIR/assets/"* "$EXT_DEST/assets/"

echo ""
echo "=== 全部补丁应用完成 ==="
echo "下一步: 配置 GN args 并构建"
echo "  gn gen out/Release --args=\$(cat build/cromite.gn_args)"
echo "  autoninja -C out/Release chrome_public_apk"
