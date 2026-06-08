import type { ElMessageBoxOptions } from "element-plus";

/** 高于 el-drawer（默认 2000），避免遮罩挡住确认框导致需点两次 */
const MESSAGE_BOX_Z_INDEX = 5000;

type ConfirmOptions = Omit<ElMessageBoxOptions, "type"> & {
  type?: ElMessageBoxOptions["type"];
};

function overlayOptions(
  extra?: ConfirmOptions,
): ConfirmOptions {
  const base: ConfirmOptions = {
    appendTo: import.meta.client ? document.body : undefined,
    zIndex: MESSAGE_BOX_Z_INDEX,
    customClass: "app-message-box",
    modalClass: "app-message-box-overlay",
    closeOnClickModal: false,
    ...extra,
  };
  return base;
}

/** 危险操作确认（删除等） */
export function confirmDestructive(
  message: string,
  title: string,
  extra?: ConfirmOptions,
) {
  return ElMessageBox.confirm(message, title, {
    type: "warning",
    confirmButtonText: "删除",
    cancelButtonText: "取消",
    confirmButtonClass: "el-button--danger",
    ...overlayOptions(extra),
  });
}

/** 普通确认 */
export function confirmAction(
  message: string,
  title: string,
  extra?: ConfirmOptions,
) {
  return ElMessageBox.confirm(message, title, {
    type: "warning",
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    ...overlayOptions(extra),
  });
}
