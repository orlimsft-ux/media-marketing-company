#!/bin/sh
set -eu

source_name="${1:-}"
source_dir="assets/source-videos"
export_dir="assets/exports"

if [ -z "$source_name" ]; then
  source_name="$(find "$source_dir" -maxdepth 1 -type f \( -iname '*.mp4' -o -iname '*.mov' -o -iname '*.m4v' -o -iname '*.webm' -o -iname '*.mkv' \) -print | sort | tail -n 1 | xargs basename)"
fi

if [ -z "$source_name" ] || [ ! -f "$source_dir/$source_name" ]; then
  echo "No source video found in $source_dir" >&2
  exit 1
fi

mkdir -p "$export_dir"

base_name="$(basename "$source_name")"
base_name="${base_name%.*}"
safe_base="$(printf '%s' "$base_name" | sed 's/[^A-Za-z0-9._-]/-/g; s/^-*//; s/-*$//')"
if [ -z "$safe_base" ]; then
  safe_base="test-video"
fi

make_version() {
  version_id="$1"
  version_name="$2"
  editing_style="$3"
  publish_fit="$4"
  output="$export_dir/$safe_base-$version_id.mp4"

  cp "$source_dir/$source_name" "$output"
  printf '{\n  "source": "%s",\n  "output": "%s",\n  "id": "%s",\n  "name": "%s",\n  "editingStyle": "%s",\n  "publishFit": "%s",\n  "note": "Prototype export: copied source video as a real MP4 placeholder until FFmpeg/CapCut rendering is connected."\n}\n' \
    "$source_dir/$source_name" \
    "$output" \
    "$version_id" \
    "$version_name" \
    "$editing_style" \
    "$publish_fit" > "$output.json"
  echo "$version_id: $output"
}

make_version "v1" "观点口播版" "强开头 + 老板口播 + 评论关键词截图 + 服务场景收束" "视频号首发，适合建立观点和信任"
make_version "v2" "反差快剪版" "热点片段结构参考 + 大字卡反转 + 快节奏 BGM + 三段式包袱" "适合测试完播率和转发"
make_version "v3" "清单教学版" "问题拆解 + 3 条方法 + 结尾引导咨询" "适合沉淀专业感和私信转化"
