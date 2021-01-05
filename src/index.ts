import { Contact } from "./logic/Contact";
import { Person } from "./logic/Person";
import { SimUI } from "./ui/SimUI";
window.onload = () => {
    const ui = new SimUI(new Date());
    document.body.appendChild(ui);
}