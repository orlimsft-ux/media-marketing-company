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
font_file="/System/Library/Fonts/Supplemental/Arial.ttf"

make_version() {
  version_id="$1"
  version_name="$2"
  editing_style="$3"
  publish_fit="$4"
  filter="$5"
  duration="$6"
  output="$export_dir/$safe_base-$version_id.mp4"

  "$ffmpeg_bin" -y -hide_banner -loglevel error \
    -i "$source_dir/$source_name" \
    -map 0:v:0 -an -t "$duration" \
    -vf "$filter" \
    -c:v libx264 -preset veryfast -crf 25 -pix_fmt yuv420p -movflags +faststart \
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
  "观点口播版" \
  "竖屏裁切 + 顶部观点条 + 底部行动引导" \
  "视频号首发，适合建立观点和信任" \
  "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=contrast=1.06:saturation=1.08,drawbox=x=0:y=0:w=iw:h=210:color=black@0.62:t=fill,drawbox=x=0:y=1710:w=iw:h=210:color=black@0.62:t=fill,drawtext=fontfile=$font_file:text='V1 POV TALK':fontcolor=white:fontsize=54:x=64:y=72,drawtext=fontfile=$font_file:text='Hook first. Service scene last.':fontcolor=white:fontsize=38:x=64:y=1780" \
  "45"

make_version "v2" \
  "反差快剪版" \
  "短时长 + 轻微加速 + 高对比 + 大字卡" \
  "适合测试完播率和转发" \
  "setpts=0.82*PTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=contrast=1.24:saturation=1.35,drawbox=x=36:y=88:w=1008:h=168:color=red@0.72:t=fill,drawtext=fontfile=$font_file:text='V2 FAST CUT':fontcolor=white:fontsize=64:x=76:y=135,drawbox=x=36:y=1500:w=1008:h=230:color=black@0.58:t=fill,drawtext=fontfile=$font_file:text='Pattern interrupt / quick punchline':fontcolor=white:fontsize=40:x=76:y=1588" \
  "28"

make_version "v3" \
  "清单教学版" \
  "竖屏裁切 + 三段标题 + 教学感结构" \
  "适合沉淀专业感和私信转化" \
  "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=contrast=1.02:saturation=0.96,drawbox=x=0:y=0:w=iw:h=150:color=blue@0.58:t=fill,drawtext=fontfile=$font_file:text='V3 TEACHING':fontcolor=white:fontsize=52:x=58:y=52,drawbox=x=60:y=420:w=520:h=90:color=black@0.56:t=fill,drawtext=fontfile=$font_file:text='1  Problem':fontcolor=white:fontsize=40:x=88:y=445,drawbox=x=60:y=820:w=520:h=90:color=black@0.56:t=fill,drawtext=fontfile=$font_file:text='2  Method':fontcolor=white:fontsize=40:x=88:y=845,drawbox=x=60:y=1220:w=520:h=90:color=black@0.56:t=fill,drawtext=fontfile=$font_file:text='3  Action':fontcolor=white:fontsize=40:x=88:y=1245" \
  "60"
