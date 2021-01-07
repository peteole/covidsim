import { css, customElement, html, LitElement, property } from "lit-element";
import { Contact } from "../../logic/Contact"
import { Simulation } from "../../logic/Simulation";
import { EventEditor } from "./EventEditor";
import { Eventline } from "./Eventline";
@customElement("event-ui")
export class EventUI extends LitElement {
    static get styles() {
        return css`
            :host{
                position:absolute;
                width:100px;
                height:120px;
                background-color:grey;
                text-align:center;
                padding:3px;
                border-radius:3px;
            }
        `
    }
    event: Contact;
    simulation: Simulation;
    timeline: Eventline;
    constructor(event: Contact, timeline: Eventline) {
        super();
        this.event = event;
        this.simulation = timeline.simulation
        this.timeline = timeline;
    }
    render() {
        return html`
            <p>${this.event.a.name} meets ${this.event.b.name}, intensity: ${this.event.intensity}</p>
            <button @click=${this.edit}>edit</button>
        `
    }
    edit() {
        const editor = new EventEditor(this.timeline, this.event);
        editor.onfinish = () => {
            this.requestUpdate();
            this.timeline.requestUpdate();
            this.timeline.simui.graph.simulate(null);
        }
        document.body.appendChild(editor);
    }
}