/**
 * Obsidian「文本透明度 / Text fade threshold」：为 0 时随缩放显示标题。
 * 缩小隐藏，放大到阈值后渐显。
 */

/** 完全隐藏标签的缩放上限（k 越小越 zoom out） */
const ZOOM_HIDE_AT = 0.48
/** 完全显示标签的缩放下限（k 越大越 zoom in） */
const ZOOM_SHOW_AT = 0.92

/** 非 0 时阈值随 textFadeMultiplier 平移（与 Obsidian 滑块方向一致） */
function zoomThresholds(textFadeMultiplier: number) {
  const shift = textFadeMultiplier * 0.07
  return {
    hideAt: ZOOM_HIDE_AT + shift,
    showAt: ZOOM_SHOW_AT + shift,
  }
}

/** 根据当前缩放 k 计算标签不透明度 [0, 1] */
export function graphLabelOpacityByZoom(
  zoomK: number,
  textFadeMultiplier: number,
): number {
  if (!Number.isFinite(zoomK) || zoomK <= 0) return 0

  if (textFadeMultiplier <= -3) return 1
  if (textFadeMultiplier >= 3) return 0

  if (textFadeMultiplier === 0) {
    const { hideAt, showAt } = zoomThresholds(0)
    if (zoomK <= hideAt) return 0
    if (zoomK >= showAt) return 1
    return (zoomK - hideAt) / (showAt - hideAt)
  }

  const staticOp = Math.max(0.12, Math.min(1, 0.75 + textFadeMultiplier * 0.08))
  const { hideAt, showAt } = zoomThresholds(textFadeMultiplier)
  let zoomFactor = 1
  if (zoomK <= hideAt) zoomFactor = 0
  else if (zoomK < showAt) zoomFactor = (zoomK - hideAt) / (showAt - hideAt)

  return staticOp * zoomFactor
}

export function graphLabelsShouldShow(
  zoomK: number,
  textFadeMultiplier: number,
): boolean {
  if (textFadeMultiplier <= -3) return true
  if (textFadeMultiplier >= 3) return false
  return graphLabelOpacityByZoom(zoomK, textFadeMultiplier) > 0.04
}
