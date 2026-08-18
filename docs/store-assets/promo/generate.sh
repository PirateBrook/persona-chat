#!/usr/bin/env bash
# 生成 Chrome Web Store 宣传图块（Promotional Tiles），中英各一套：
#   - 小型宣传图块 440x280   small-440x280-{en,zh}.png
#   - 顶部宣传图块 1400x560  marquee-1400x560-{en,zh}.png
# CWS 规格：JPEG 或 24 位 PNG（无 alpha）。本脚本输出 24 位 PNG（-flatten -alpha off）。
# 依赖：ImageMagick 7（magick）+ macOS 系统字体。用法：bash docs/store-assets/promo/generate.sh（仓库根目录执行）。
set -euo pipefail
cd "$(dirname "$0")/../../.."   # -> repo root
OUT="docs/store-assets/promo"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

FONT="/System/Library/Fonts/Avenir Next.ttc"          # 拉丁 wordmark / 平台名（粗、几何、友好）
FONT_LT="/System/Library/Fonts/HelveticaNeue.ttc"     # 拉丁副标题（常规）
CJK_B="/System/Library/Fonts/STHeiti Medium.ttc"      # 中文大标题（华文黑体，偏粗）
CJK_R="/System/Library/Fonts/Hiragino Sans GB.ttc"    # 中文副标题（冬青黑，常规）
ICON="assets/icon.png"                                # 1024² 熊猫图标（自带紫底 + 暖光）

# 品牌配色（采样自 icon.png）
DARK="#2A0E52"; BRIGHT="#7B34E6"; VIOLET="#C7ABFF"; MUTED="#CBB8F0"
GLOW="srgba(245,166,94,0.55)"; GLOW0="srgba(245,166,94,0)"

round_icon() { local s=$1 r=$2 out=$3
  magick -size ${s}x${s} xc:none -fill white -draw "roundrectangle 0,0,$((s-1)),$((s-1)),$r,$r" "$TMP/m.png"
  magick "$ICON" -resize ${s}x${s}! "$TMP/m.png" -compose CopyOpacity -composite \
    -fill none -stroke 'rgba(255,255,255,0.30)' -strokewidth 2 \
    -draw "roundrectangle 1,1,$((s-2)),$((s-2)),$((r-1)),$((r-1))" "$out"; }
shadow() { magick "$1" \( +clone -background black -shadow "$2" \) +swap -background none -layers merge +repage "$3"; }
wm() { # 双色 wordmark  $1=pointsize $2=out
  magick \( -background none -fill white   -font "$FONT" -pointsize "$1" label:'Persona' \) \
         \( -background none -fill "$VIOLET" -font "$FONT" -pointsize "$1" label:'.chat' \) +append "$2"; }

# ========== 共享底图/图标/wordmark（locale 无关）==========
magick -size 1400x560 -define gradient:angle=145 gradient:$DARK-$BRIGHT "$TMP/base.png"
magick -size 700x700 radial-gradient:"$GLOW"-"$GLOW0" "$TMP/glow.png"
magick "$TMP/base.png" "$TMP/glow.png" -geometry +40-120 -compose screen -composite "$TMP/bg.png"
round_icon 360 64 "$TMP/ic.png"; shadow "$TMP/ic.png" "60x22+0+12" "$TMP/ic_sh.png"; wm 46 "$TMP/wm.png"

magick -size 440x280 -define gradient:angle=145 gradient:$DARK-$BRIGHT "$TMP/base_s.png"
magick -size 340x340 radial-gradient:"$GLOW"-"$GLOW0" "$TMP/glow_s.png"
magick "$TMP/base_s.png" "$TMP/glow_s.png" -geometry -30-70 -compose screen -composite "$TMP/bg_s.png"
round_icon 150 28 "$TMP/ic_s.png"; shadow "$TMP/ic_s.png" "55x12+0+6" "$TMP/ic_s_sh.png"; wm 27 "$TMP/wm_s.png"

# ========== 英文 ==========
magick -background none -fill white -font "$FONT" -pointsize 52 -interline-spacing 10 \
  label:'One-click personas for\nDeepSeek · Claude · ChatGPT' "$TMP/hl.png"
magick -background none -fill "$MUTED" -font "$FONT_LT" -pointsize 25 \
  label:'Practice interviews, negotiate, research — free, no API key.' -trim +repage "$TMP/sub.png"
magick "$TMP/bg.png" \
  "$TMP/ic_sh.png" -gravity West -geometry +50+0 -composite \
  "$TMP/wm.png"  -gravity NorthWest -geometry +560+118 -composite \
  "$TMP/hl.png"  -gravity NorthWest -geometry +560+192 -composite \
  "$TMP/sub.png" -gravity NorthWest -geometry +562+388 -composite \
  -background "$DARK" -flatten -alpha off -define png:color-type=2 "PNG24:$OUT/marquee-1400x560-en.png"

magick -background none -fill "$MUTED" -font "$FONT_LT" -pointsize 18 -interline-spacing 5 -size 216x \
  caption:'AI personas for DeepSeek, Claude & ChatGPT' "$TMP/sub_s.png"
magick -background none -fill "$VIOLET" -font "$FONT" -pointsize 15 label:'Free · No API key' "$TMP/tr_s.png"
magick "$TMP/bg_s.png" \
  "$TMP/ic_s_sh.png" -gravity West -geometry +14+0 -composite \
  "$TMP/wm_s.png"  -gravity NorthWest -geometry +202+62  -composite \
  "$TMP/sub_s.png" -gravity NorthWest -geometry +202+110 -composite \
  "$TMP/tr_s.png"  -gravity NorthWest -geometry +202+214 -composite \
  -background "$DARK" -flatten -alpha off -define png:color-type=2 "PNG24:$OUT/small-440x280-en.png"

# ========== 中文 ==========
magick -background none -fill white -font "$CJK_B" -pointsize 54 label:'给 AI 聊天一键装上人设' "$TMP/hl1z.png"
magick -background none -fill white -font "$FONT"  -pointsize 50 label:'DeepSeek · Claude · ChatGPT' "$TMP/hl2z.png"
magick -background none -fill "$MUTED" -font "$CJK_R" -pointsize 27 \
  label:'练面试、练谈判、做研究 — 免费，无需 API Key' -trim +repage "$TMP/subz.png"
magick "$TMP/bg.png" \
  "$TMP/ic_sh.png" -gravity West -geometry +50+0 -composite \
  "$TMP/wm.png"   -gravity NorthWest -geometry +560+112 -composite \
  "$TMP/hl1z.png" -gravity NorthWest -geometry +558+188 -composite \
  "$TMP/hl2z.png" -gravity NorthWest -geometry +560+280 -composite \
  "$TMP/subz.png" -gravity NorthWest -geometry +562+392 -composite \
  -background "$DARK" -flatten -alpha off -define png:color-type=2 "PNG24:$OUT/marquee-1400x560-zh.png"

magick -background none -fill "$MUTED" -font "$CJK_R" -pointsize 19 -interline-spacing 8 \
  label:'为 DeepSeek、Claude、\nChatGPT 装上人设' "$TMP/sub_sz.png"
magick -background none -fill "$VIOLET" -font "$CJK_R" -pointsize 16 label:'免费 · 无需 API Key' "$TMP/tr_sz.png"
magick "$TMP/bg_s.png" \
  "$TMP/ic_s_sh.png"  -gravity West -geometry +14+0 -composite \
  "$TMP/wm_s.png"   -gravity NorthWest -geometry +202+62  -composite \
  "$TMP/sub_sz.png" -gravity NorthWest -geometry +202+114 -composite \
  "$TMP/tr_sz.png"  -gravity NorthWest -geometry +202+214 -composite \
  -background "$DARK" -flatten -alpha off -define png:color-type=2 "PNG24:$OUT/small-440x280-zh.png"

echo "✓ 生成完成："
magick identify -format '  %f  %wx%h  %[type]  depth=%[depth]  alpha=%A\n' \
  "$OUT"/marquee-1400x560-en.png "$OUT"/small-440x280-en.png \
  "$OUT"/marquee-1400x560-zh.png "$OUT"/small-440x280-zh.png
