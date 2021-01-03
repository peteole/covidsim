import { html, LitElement, property } from "lit-element";
import { Contact } from "../../logic/Contact"
export class EventUI extends LitElement {
    event: Contact;
    constructor(event: Contact) {
        super();
        this.event = event;
    }
    render() {
        return html`
            <p>${this.event.a.name} meets ${this.event.b.name}, intensity: ${this.event.intensity}</p>
        `
    }
}