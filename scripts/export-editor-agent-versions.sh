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
ffmpeg_bin="${FFMPEG_BIN:-}"
if [ -z "$ffmpeg_bin" ] && command -v ffmpeg >/dev/null 2>&1; then
  ffmpeg_bin="$(command -v ffmpeg)"
fi
if [ -z "$ffmpeg_bin" ]; then
  ffmpeg_bin="$(PYTHONPATH="${PYTHONPATH:-/tmp/media-ffmpeg}" python3 -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())' 2>/dev/null || true)"
fi
if [ -z "$ffmpeg_bin" ] || [ ! -x "$ffmpeg_bin" ]; then
  echo "FFmpeg not found. Install it, or run: python3 -m pip install --target /tmp/media-ffmpeg imageio-ffmpeg" >&2
  exit 1
fi

base_name="$(basename "$source_name")"
base_name="${base_name%.*}"
safe_base="$(printf '%s' "$base_name" | sed 's/[^A-Za-z0-9._-]/-/g; s/^-*//; s/-*$//')"
if [ -z "$safe_base" ]; then
  safe_base="test-video"
fi
font_file="/System/Library/Fonts/STHeiti\\ Medium.ttc"

make_version() {
  version_id="$1"
  version_name="$2"
  editing_style="$3"
  publish_fit="$4"
  filter="$5"
  duration="$6"
  audio_filter="$7"
  output="$export_dir/$safe_base-$version_id.mp4"

  "$ffmpeg_bin" -y -hide_banner -loglevel error \
    -i "$source_dir/$source_name" \
    -map 0:v:0 -map 0:a? -t "$duration" \
    -vf "$filter" \
    -af "$audio_filter" \
    -c:v libx264 -preset veryfast -crf 24 -pix_fmt yuv420p \
    -c:a aac -b:a 128k -movflags +faststart \
    "$output"

  printf '{\n  "source": "%s",\n  "output": "%s",\n  "id": "%s",\n  "name": "%s",\n  "editingStyle": "%s",\n  "publishFit": "%s",\n  "note": "Prototype FFmpeg render: real MP4 output with version-specific visual treatment; not yet a semantic scene-aware edit."\n}\n' \
    "$source_dir/$source_name" \
    "$output" \
    "$version_id" \
    "$version_name" \
    "$editing_style" \
    "$publish_fit" > "$output.json"
  echo "$version_id: $output"
}

make_version "v1" \
  "亲情情绪版" \
  "竖屏裁切 + 温柔标题 + 结尾情绪钩子" \
  "适合视频号首发，主打共鸣和评论互动" \
  "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=contrast=1.04:saturation=1.08,drawbox=x=0:y=0:w=iw:h=250:color=black@0.58:t=fill,drawbox=x=0:y=1630:w=iw:h=290:color=black@0.58:t=fill,drawtext=fontfile=$font_file:text='孩子学会骑车那一刻':fontcolor=white:fontsize=56:x=64:y=72,drawtext=fontfile=$font_file:text='最难的不是扶住他':fontcolor=white:fontsize=44:x=64:y=1668,drawtext=fontfile=$font_file:text='是敢慢慢放手':fontcolor=white:fontsize=52:x=64:y=1734" \
  "22" \
  "aresample=async=1,volume=1.15"

make_version "v2" \
  "反差快剪版" \
  "加速 + 高对比 + 强冲突大字卡" \
  "适合测试完播率，标题更抓人" \
  "setpts=0.78*PTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=contrast=1.22:saturation=1.28,drawbox=x=42:y=78:w=996:h=190:color=red@0.78:t=fill,drawtext=fontfile=$font_file:text='别急着替孩子用力':fontcolor=white:fontsize=58:x=78:y=130,drawbox=x=42:y=1430:w=996:h=260:color=black@0.60:t=fill,drawtext=fontfile=$font_file:text='他真正需要的':fontcolor=white:fontsize=50:x=78:y=1508,drawtext=fontfile=$font_file:text='可能只是你退后一步':fontcolor=white:fontsize=50:x=78:y=1582" \
  "18" \
  "atempo=1.28,aresample=async=1,volume=1.12"

make_version "v3" \
  "成长方法版" \
  "三段式字幕 + 教学感结构 + 评论引导" \
  "适合做家庭教育/成长类账号沉淀" \
  "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=contrast=1.03:saturation=1.02,drawbox=x=0:y=0:w=iw:h=170:color=blue@0.62:t=fill,drawtext=fontfile=$font_file:text='孩子学骑车的3个瞬间':fontcolor=white:fontsize=50:x=58:y=58,drawbox=x=58:y=420:w=780:h=94:color=black@0.58:t=fill,drawtext=fontfile=$font_file:text='1  先陪跑  给安全感':fontcolor=white:fontsize=40:x=88:y=446,drawbox=x=58:y=810:w=780:h=94:color=black@0.58:t=fill,drawtext=fontfile=$font_file:text='2  再松手  给空间':fontcolor=white:fontsize=40:x=88:y=836,drawbox=x=58:y=1200:w=860:h=94:color=black@0.58:t=fill,drawtext=fontfile=$font_file:text='3  最后看着他自己往前':fontcolor=white:fontsize=40:x=88:y=1226,drawbox=x=0:y=1700:w=iw:h=220:color=black@0.55:t=fill,drawtext=fontfile=$font_file:text='你第一次放手是什么时候？':fontcolor=white:fontsize=46:x=64:y=1780" \
  "22" \
  "aresample=async=1,volume=1.1"
