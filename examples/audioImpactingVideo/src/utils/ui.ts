export function bindSwitch(id: string, callback: (value: boolean) => void) {
    const element = document.getElementById(id) as HTMLInputElement;
    if (element) {
        element.oninput = () => callback(!element.checked);
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
