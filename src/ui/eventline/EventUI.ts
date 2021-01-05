import { css, customElement, html, LitElement, property } from "lit-element";
import { Contact } from "../../logic/Contact"
@customElement("event-ui")
export class EventUI extends LitElement {
    static get styles() {
        return css`
            :host{
                position:absolute;
                width:100px;
                height:70px;
                background-color:grey;
            }
        `
    }
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