import { Contact } from "./logic/Contact";
import { Person } from "./logic/Person";
import { SimUI } from "./ui/SimUI";
window.onload = () => {
    const ui = new SimUI(new Date());
    ui.eventline.addEvent(new Contact(new Person("Anni"), new Person("Ole"), {
        date: new Date(ui.simulation.initialDate.getTime() + 20 * 1000 * 60 * 60 * 24),
        intensity: 0.4
    }));
    document.body.appendChild(ui);
}