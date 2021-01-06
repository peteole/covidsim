import { Contact } from "./logic/Contact";
import { Person } from "./logic/Person";
import { SimUI } from "./ui/SimUI";
window.onload = () => {
    if (!localStorage.getItem("introfinished")) {
        alert(`Welcome to the Covid 19 simulation! 
        Begin by adding the persons involved by going to "settings".
        Just enter the contacts you had and the tests you made and explore the effects.
        The graphs show the probability that the person was once infected up to that date.
        The probability of being acutely infected at a given date is therefore represented by the change in infection probability.
        Note that this software is experimental and does not rely on scientific data! Do not use it as a reason for violating the law etc!`);
        localStorage.setItem("introfinished", "true");
    }
    const ui = new SimUI(new Date());
    /*ui.eventline.addEvent(new Contact(new Person("Anni"), new Person("Ole"), {
        date: new Date(ui.simulation.initialDate.getTime() + 20 * 1000 * 60 * 60 * 24),
        intensity: 0.4
    }));*/
    document.body.appendChild(ui);
}