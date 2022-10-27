export function bindSwitch(
    id: string,
    callback: (value: boolean) => boolean | void | Promise<boolean | void>
) {
    const element = document.getElementById(id) as HTMLInputElement;
    if (element) {
        element.oninput = async () => {
            await callback(!element.checked);
        };
    }
}

export function bindSlider(id: string, callback: (value: number) => void) {
    const element = document.getElementById(id) as HTMLInputElement;
    if (element) {
        element.oninput = () => callback(parseFloat(element.value));
    }
}

export function bindButtonToLink(id: string, link: string) {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener("click", () => {
            window.open(link, "_blank")?.focus();
        });
    }
}

let notifications: HTMLDivElement;
export function notifyError(message: string) {
    if (!notifications) {
        notifications = document.createElement("div");
        notifications.style.position = "fixed";
        notifications.style.width = "100%";
        notifications.style.zIndex = "100";
        document.body.prepend(notifications);
    }
    notifications.innerHTML = `
    <vwc-banner
      connotation="alert"
      open=""
      dismissible=""
      message="${message}"
      role="status"
      aria-live="polite"
    ></vwc-banner>
    `;
}
