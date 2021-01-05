import { Contact } from "./logic/Contact";
import { Person } from "./logic/Person";
import { SimUI } from "./ui/SimUI";
window.onload = () => {
    const ui = new SimUI(new Date("2020-07-07"));
    const a = new Person("A");
    const b = new Person("B");
    ui.eventline.addEvent(new Contact(a, b, { date: new Date("2020-07-8"), intensity: 0.7 }));
    ui.eventline.addEvent(new Contact(a, b, { date: new Date("2020-07-10"), intensity: 0.7 }));
    document.body.appendChild(ui);
}